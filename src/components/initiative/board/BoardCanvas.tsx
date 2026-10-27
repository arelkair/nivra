import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { t } from '../../../lib/i18n'
import { useMedia } from '../../../lib/photos'
import { Icon } from '../../ui'
import {
  arrowHead,
  bounds,
  center,
  fontCss,
  itemFromStyle,
  lineEnds,
  rotate,
  shapePoints,
  strokePath,
  type Board,
  type ImageItem,
  type Item,
  type LineItem,
  type ShapeKind,
  type Style,
  type TextItem,
  type Tool,
} from './boardModel'

export type View = { x: number; y: number; zoom: number }
export type PeerView = { id: string; name: string; color: string; x: number; y: number; selection: string[] }

type Props = {
  board: Board
  editable: boolean
  dark: boolean
  tool: Tool
  setTool: (tool: Tool) => void
  style: Style
  selection: string[]
  setSelection: (ids: string[]) => void
  commit: (next: Item[]) => void
  live: (upsert: Item[], remove: string[]) => void
  peers: PeerView[]
  onPointer: (x: number, y: number) => void
  onOpenLink: (item: Item) => void
  onPlaceLink: (at: { x: number; y: number }) => void
  onFiles: (files: File[], at: { x: number; y: number } | null) => void
  viewCenter: { current: { x: number; y: number } }
  focusId: string | null
  onFocused: () => void
  undo: () => void
  redo: () => void
}

type Drag =
  | { mode: 'pan'; sx: number; sy: number; view: View }
  | { mode: 'draw'; item: Item; raw: number[] }
  | { mode: 'create'; item: Item; sx: number; sy: number }
  | { mode: 'move'; sx: number; sy: number; origin: Item[] }
  | { mode: 'resize'; origin: Item; dx: number; dy: number }
  | { mode: 'rotate'; origin: Item }
  | { mode: 'marquee'; sx: number; sy: number; x: number; y: number }
  | { mode: 'erase' }

const HANDLES: [number, number][] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
]
const MIN_ZOOM = 0.1
const MAX_ZOOM = 6

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
const round = (n: number) => Math.round(n * 10000) / 10000

function normalizeStroke(item: Item, raw: number[]): Item {
  if (item.kind !== 'stroke') return item
  let x1 = Infinity
  let y1 = Infinity
  let x2 = -Infinity
  let y2 = -Infinity
  for (let i = 0; i < raw.length; i += 2) {
    x1 = Math.min(x1, raw[i])
    y1 = Math.min(y1, raw[i + 1])
    x2 = Math.max(x2, raw[i])
    y2 = Math.max(y2, raw[i + 1])
  }
  const pad = item.width / 2
  x1 -= pad
  y1 -= pad
  x2 += pad
  y2 += pad
  const w = Math.max(1, x2 - x1)
  const h = Math.max(1, y2 - y1)
  const points = raw.map((v, i) => round(i % 2 === 0 ? (v - x1) / w : (v - y1) / h))
  return { ...item, x: x1, y: y1, w, h, points }
}

function BoardImage({ it }: { it: ImageItem }) {
  const { src, missing } = useMedia(it.media)
  if (src) return <image href={src} width={it.w} height={it.h} preserveAspectRatio="none" />
  return (
    <>
      <rect width={it.w} height={it.h} rx={8} fill="var(--sunken)" stroke="var(--minimal-line)" strokeDasharray="6 4" />
      {missing && (
        <text x={it.w / 2} y={it.h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={Math.max(10, Math.min(16, it.w / 14))} fill="var(--minimal-muted)">
          {t('Imagen en otro dispositivo')}
        </text>
      )}
    </>
  )
}

function ItemShape({ it, dark }: { it: Item; dark: boolean }) {
  if (it.kind === 'image') return <BoardImage it={it} />
  const dash = (on: boolean, width: number) => (on ? `${width * 2.5} ${width * 2}` : undefined)
  if (it.kind === 'stroke') {
    const width = it.brush === 'marker' ? it.width * 2.2 : it.brush === 'highlighter' ? it.width * 4 : it.width
    return (
      <>
        {it.color2 && (
          <defs>
            <linearGradient id={`g-${it.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={it.color} />
              <stop offset="1" stopColor={it.color2} />
            </linearGradient>
          </defs>
        )}
        <path
          d={strokePath(it.points, it.w, it.h)}
          fill="none"
          stroke={it.color2 ? `url(#g-${it.id})` : it.color}
          strokeWidth={width}
          strokeOpacity={it.brush === 'highlighter' ? 0.4 : 1}
          strokeLinecap={it.brush === 'highlighter' ? 'square' : 'round'}
          strokeLinejoin="round"
          strokeDasharray={it.brush === 'dashed' ? dash(true, it.width) : undefined}
        />
        <path d={strokePath(it.points, it.w, it.h)} fill="none" stroke="transparent" strokeWidth={Math.max(14, width + 8)} />
      </>
    )
  }
  if (it.kind === 'shape') {
    const fill = it.fill ? (it.color2 ? `url(#g-${it.id})` : it.fill) : 'transparent'
    const common = { fill, stroke: it.stroke, strokeWidth: it.strokeWidth, strokeDasharray: dash(it.dashed, it.strokeWidth), strokeLinejoin: 'round' as const }
    return (
      <>
        {it.fill && it.color2 && (
          <defs>
            <linearGradient id={`g-${it.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={it.fill} />
              <stop offset="1" stopColor={it.color2} />
            </linearGradient>
          </defs>
        )}
        {it.shape === 'rect' ? (
          <rect width={it.w} height={it.h} rx={Math.min(8, it.w / 6, it.h / 6)} {...common} />
        ) : it.shape === 'ellipse' ? (
          <ellipse cx={it.w / 2} cy={it.h / 2} rx={it.w / 2} ry={it.h / 2} {...common} />
        ) : (
          <polygon points={shapePoints(it.shape, it.w, it.h)} {...common} />
        )}
      </>
    )
  }
  if (it.kind === 'line') {
    const { start, end } = lineEnds(it)
    const head = Math.max(10, it.width * 3.5)
    return (
      <>
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={it.color} strokeWidth={it.width} strokeLinecap="round" strokeDasharray={dash(it.dashed, it.width)} />
        {it.arrowEnd && <polygon points={arrowHead(start, end, head)} fill={it.color} />}
        {it.arrowStart && <polygon points={arrowHead(end, start, head)} fill={it.color} />}
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="transparent" strokeWidth={Math.max(14, it.width + 10)} />
      </>
    )
  }
  if (it.kind === 'text') {
    return (
      <foreignObject width={Math.max(1, it.w)} height={Math.max(1, it.h)} overflow="visible">
        <div
          style={{
            color: it.color,
            fontFamily: fontCss(it.font),
            fontSize: it.size,
            fontWeight: it.bold ? 700 : 400,
            fontStyle: it.italic ? 'italic' : 'normal',
            textDecoration: it.underline ? 'underline' : 'none',
            textAlign: it.align,
            lineHeight: 1.25,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            width: '100%',
          }}
        >
          {it.text || ' '}
        </div>
      </foreignObject>
    )
  }
  return (
    <foreignObject width={Math.max(1, it.w)} height={Math.max(1, it.h)} overflow="visible">
      <div
        style={{ borderColor: it.color, background: dark ? '#26262b' : '#ffffff', color: dark ? '#ececec' : '#1f1f1f' }}
        className="flex h-full w-full items-center gap-2 overflow-hidden rounded-lg border-l-4 px-3 text-sm shadow-sm"
      >
        <span style={{ color: it.color }} className="shrink-0">
          <Icon name={it.target.type === 'note' ? 'graph' : 'board'} className="h-4 w-4" />
        </span>
        <span className="truncate font-medium">{it.label || t('Enlace')}</span>
      </div>
    </foreignObject>
  )
}

export function BoardCanvas({
  board,
  editable,
  dark,
  tool,
  setTool,
  style,
  selection,
  setSelection,
  commit,
  live,
  peers,
  onPointer,
  onOpenLink,
  onPlaceLink,
  onFiles,
  viewCenter,
  focusId,
  onFocused,
  undo,
  redo,
}: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 })
  const [drag, setDrag] = useState<Drag | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Item>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [space, setSpace] = useState(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; view: View; mid: { x: number; y: number } } | null>(null)
  const lastLive = useRef(0)
  const viewRef = useRef(view)
  viewRef.current = view

  useEffect(() => {
    const el = svg.current
    if (!el) return
    viewCenter.current = { x: (el.clientWidth / 2 - view.x) / view.zoom, y: (el.clientHeight / 2 - view.y) / view.zoom }
  }, [view, viewCenter])

  const items = useMemo(() => board.items.map((it) => drafts[it.id] ?? it), [board.items, drafts])
  const creating = drag && (drag.mode === 'draw' || drag.mode === 'create') ? drag.item : null
  const selected = items.filter((it) => selection.includes(it.id))

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const rect = svg.current?.getBoundingClientRect()
    const v = viewRef.current
    return { x: (clientX - (rect?.left ?? 0) - v.x) / v.zoom, y: (clientY - (rect?.top ?? 0) - v.y) / v.zoom }
  }, [])

  const zoomAt = useCallback((factor: number, sx: number, sy: number) => {
    setView((v) => {
      const zoom = clampZoom(v.zoom * factor)
      const k = zoom / v.zoom
      return { zoom, x: sx - (sx - v.x) * k, y: sy - (sy - v.y) * k }
    })
  }, [])

  const fit = useCallback(() => {
    const el = svg.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (board.items.length === 0) {
      setView({ x: rect.width / 2, y: rect.height / 2, zoom: 1 })
      return
    }
    const b = bounds(board.items)
    const zoom = clampZoom(Math.min((rect.width - 120) / Math.max(1, b.w), (rect.height - 120) / Math.max(1, b.h), 1.5))
    setView({ zoom, x: rect.width / 2 - (b.x + b.w / 2) * zoom, y: rect.height / 2 - (b.y + b.h / 2) * zoom })
  }, [board.items])

  const fitRef = useRef(fit)
  fitRef.current = fit
  const ready = board.id !== 'live' || board.items.length > 0

  useLayoutEffect(() => {
    fitRef.current()
  }, [board.id, ready])

  useEffect(() => {
    if (!focusId) return
    const it = board.items.find((x) => x.id === focusId)
    const el = svg.current
    if (it && el) {
      const rect = el.getBoundingClientRect()
      const c = center(it)
      setView((v) => ({ ...v, x: rect.width / 2 - c.x * v.zoom, y: rect.height / 2 - c.y * v.zoom }))
      setSelection([it.id])
    }
    onFocused()
  }, [focusId, board.items, onFocused, setSelection])

  useEffect(() => {
    const el = svg.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top)
      else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const pushLive = (upsert: Item[], force = false) => {
    const now = performance.now()
    if (!force && now - lastLive.current < 60) return
    lastLive.current = now
    live(upsert, [])
  }

  const eraseAt = (clientX: number, clientY: number) => {
    const ids = new Set<string>()
    for (const el of document.elementsFromPoint(clientX, clientY)) {
      const id = (el as Element).closest?.('[data-item]')?.getAttribute('data-item')
      if (id) ids.add(id)
    }
    if (ids.size === 0) return
    commit(board.items.filter((it) => !ids.has(it.id)))
  }

  const onDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    wrap.current?.focus({ preventScroll: true })
    if (editingId) return
    svg.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const rect = svg.current!.getBoundingClientRect()
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), view, mid: { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top } }
      setDrag(null)
      setDrafts({})
      return
    }
    const p = toWorld(e.clientX, e.clientY)
    const target = e.target as Element
    if (tool === 'hand' || e.button === 1 || space || (!editable && tool !== 'select')) {
      setDrag({ mode: 'pan', sx: e.clientX, sy: e.clientY, view })
      return
    }
    if (!editable) {
      const id = target.closest('[data-item]')?.getAttribute('data-item')
      setSelection(id ? [id] : [])
      if (!id) setDrag({ mode: 'pan', sx: e.clientX, sy: e.clientY, view })
      return
    }
    if (tool === 'pen') {
      const item = itemFromStyle('stroke', style, { x: p.x, y: p.y, w: 1, h: 1 })
      setDrag({ mode: 'draw', item, raw: [p.x, p.y] })
      return
    }
    if (tool === 'eraser') {
      setDrag({ mode: 'erase' })
      eraseAt(e.clientX, e.clientY)
      return
    }
    if (tool === 'text' || tool === 'link') return
    if (tool !== 'select') {
      const kind = tool === 'line' || tool === 'arrow' ? 'line' : 'shape'
      let item = itemFromStyle(kind, style, { x: p.x, y: p.y, w: 1, h: 1 })
      if (item.kind === 'shape') item = { ...item, shape: tool as ShapeKind }
      if (item.kind === 'line') item = { ...item, arrowEnd: tool === 'arrow', arrowStart: tool === 'arrow' && style.arrowStart }
      setDrag({ mode: 'create', item, sx: p.x, sy: p.y })
      return
    }
    const handle = target.closest('[data-handle]')?.getAttribute('data-handle')
    if (handle && selected.length === 1) {
      if (handle === 'rotate') setDrag({ mode: 'rotate', origin: selected[0] })
      else {
        const [dx, dy] = handle.split(',').map(Number)
        setDrag({ mode: 'resize', origin: selected[0], dx, dy })
      }
      return
    }
    const id = target.closest('[data-item]')?.getAttribute('data-item')
    if (id) {
      const next = e.shiftKey ? (selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id]) : selection.includes(id) ? selection : [id]
      setSelection(next)
      setDrag({ mode: 'move', sx: p.x, sy: p.y, origin: items.filter((it) => next.includes(it.id)) })
      return
    }
    if (!e.shiftKey) setSelection([])
    setDrag({ mode: 'marquee', sx: p.x, sy: p.y, x: p.x, y: p.y })
  }

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const p = toWorld(e.clientX, e.clientY)
    onPointer(p.x, p.y)
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const rect = svg.current!.getBoundingClientRect()
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const mid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top }
      const start = pinch.current
      const zoom = clampZoom(start.view.zoom * (dist / start.dist))
      const k = zoom / start.view.zoom
      setView({ zoom, x: mid.x - (start.mid.x - start.view.x) * k, y: mid.y - (start.mid.y - start.view.y) * k })
      return
    }
    if (!drag) return
    if (drag.mode === 'pan') {
      setView({ ...drag.view, x: drag.view.x + e.clientX - drag.sx, y: drag.view.y + e.clientY - drag.sy })
    } else if (drag.mode === 'draw') {
      const last = drag.raw.length - 2
      if (Math.hypot(p.x - drag.raw[last], p.y - drag.raw[last + 1]) < 1.5 / view.zoom) return
      setDrag({ ...drag, raw: [...drag.raw, p.x, p.y] })
    } else if (drag.mode === 'erase') {
      eraseAt(e.clientX, e.clientY)
    } else if (drag.mode === 'create') {
      let w = p.x - drag.sx
      let h = p.y - drag.sy
      if (e.shiftKey && drag.item.kind === 'shape') {
        const side = Math.max(Math.abs(w), Math.abs(h))
        w = Math.sign(w || 1) * side
        h = Math.sign(h || 1) * side
      }
      const box = { x: Math.min(drag.sx, drag.sx + w), y: Math.min(drag.sy, drag.sy + h), w: Math.max(1, Math.abs(w)), h: Math.max(1, Math.abs(h)) }
      const item = drag.item.kind === 'line' ? { ...drag.item, ...box, flipX: w < 0, flipY: h < 0 } : { ...drag.item, ...box }
      setDrag({ ...drag, item })
    } else if (drag.mode === 'move') {
      const dx = p.x - drag.sx
      const dy = p.y - drag.sy
      const moved = drag.origin.map((it) => ({ ...it, x: it.x + dx, y: it.y + dy }))
      setDrafts(Object.fromEntries(moved.map((it) => [it.id, it])))
      pushLive(moved)
    } else if (drag.mode === 'resize') {
      const o = drag.origin
      const c = center(o)
      const local = rotate(p.x - c.x, p.y - c.y, -o.rotation)
      const fixed = { x: (-drag.dx * o.w) / 2, y: (-drag.dy * o.h) / 2 }
      const moving = { x: drag.dx === 0 ? o.w / 2 : local.x, y: drag.dy === 0 ? o.h / 2 : local.y }
      const left = drag.dx === 0 ? -o.w / 2 : Math.min(fixed.x, moving.x)
      const right = drag.dx === 0 ? o.w / 2 : Math.max(fixed.x, moving.x)
      const top = drag.dy === 0 ? -o.h / 2 : Math.min(fixed.y, moving.y)
      const bottom = drag.dy === 0 ? o.h / 2 : Math.max(fixed.y, moving.y)
      let w = Math.max(4, right - left)
      let h = Math.max(4, bottom - top)
      let mx = (left + right) / 2
      let my = (top + bottom) / 2
      if (o.kind === 'image' && drag.dx !== 0 && drag.dy !== 0) {
        const ratio = o.w / o.h
        if (w / h > ratio) w = h * ratio
        else h = w / ratio
        mx = fixed.x + (drag.dx * w) / 2
        my = fixed.y + (drag.dy * h) / 2
      }
      const mid = rotate(mx, my, o.rotation)
      let next: Item = { ...o, w, h, x: c.x + mid.x - w / 2, y: c.y + mid.y - h / 2 }
      if (next.kind === 'line' && o.kind === 'line') next = { ...next, flipX: drag.dx !== 0 && moving.x < fixed.x !== (drag.dx < 0) ? !o.flipX : o.flipX, flipY: drag.dy !== 0 && moving.y < fixed.y !== (drag.dy < 0) ? !o.flipY : o.flipY } as LineItem
      if (next.kind === 'text' && o.kind === 'text' && drag.dy !== 0) next = { ...next, size: Math.max(6, Math.round(o.size * (h / o.h))) } as TextItem
      setDrafts({ [o.id]: next })
      pushLive([next])
    } else if (drag.mode === 'rotate') {
      const c = center(drag.origin)
      let angle = (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI + 90
      if (e.shiftKey) angle = Math.round(angle / 15) * 15
      const next = { ...drag.origin, rotation: Math.round(angle * 10) / 10 }
      setDrafts({ [next.id]: next })
      pushLive([next])
    } else if (drag.mode === 'marquee') {
      setDrag({ ...drag, x: p.x, y: p.y })
    }
  }

  const onUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    const p = toWorld(e.clientX, e.clientY)
    if (!drag) {
      if (editable && tool === 'text' && e.button === 0) {
        const item = itemFromStyle('text', style, { x: p.x, y: p.y - style.size * 0.6, w: 260, h: Math.round(style.size * 1.6) })
        commit([...board.items, item])
        setSelection([item.id])
        setEditingId(item.id)
        setTool('select')
      } else if (editable && tool === 'link' && e.button === 0) onPlaceLink(p)
      return
    }
    if (drag.mode === 'draw') {
      const item = normalizeStroke(drag.item, drag.raw)
      commit([...board.items, item])
    } else if (drag.mode === 'create') {
      let item = drag.item
      if (item.w < 4 && item.h < 4) item = { ...item, w: item.kind === 'line' ? 160 : 140, h: item.kind === 'line' ? 0.01 : 100, x: drag.sx - (item.kind === 'line' ? 0 : 70), y: drag.sy - (item.kind === 'line' ? 0 : 50) }
      if (item.kind === 'line' && item.h < 1) item = { ...item, h: 1 }
      commit([...board.items, item])
      setSelection([item.id])
    } else if (drag.mode === 'move' || drag.mode === 'resize' || drag.mode === 'rotate') {
      const changed = Object.values(drafts)
      if (changed.length) commit(board.items.map((it) => drafts[it.id] ?? it))
    } else if (drag.mode === 'marquee') {
      const box = { x: Math.min(drag.sx, drag.x), y: Math.min(drag.sy, drag.y), w: Math.abs(drag.x - drag.sx), h: Math.abs(drag.y - drag.sy) }
      if (box.w > 2 || box.h > 2) {
        const hit = items.filter((it) => {
          const b = bounds([it])
          return b.x >= box.x && b.y >= box.y && b.x + b.w <= box.x + box.w && b.y + b.h <= box.y + box.h
        })
        setSelection(e.shiftKey ? [...new Set([...selection, ...hit.map((it) => it.id)])] : hit.map((it) => it.id))
      }
    }
    setDrag(null)
    setDrafts({})
  }

  const onDouble = (e: React.MouseEvent<SVGSVGElement>) => {
    const id = document
      .elementsFromPoint(e.clientX, e.clientY)
      .map((el) => el.closest('[data-item]')?.getAttribute('data-item'))
      .find(Boolean)
    const it = id ? board.items.find((x) => x.id === id) : undefined
    if (!it) return
    if (it.kind === 'link') onOpenLink(it)
    else if (it.kind === 'text' && editable) {
      setSelection([it.id])
      setEditingId(it.id)
    }
  }

  const removeSelected = () => {
    if (!selection.length) return
    commit(board.items.filter((it) => !selection.includes(it.id)))
    setSelection([])
  }

  const duplicate = () => {
    const copies = selected.map((it) => ({ ...it, id: crypto.randomUUID(), x: it.x + 24, y: it.y + 24 }))
    if (!copies.length) return
    commit([...board.items, ...copies])
    setSelection(copies.map((it) => it.id))
  }

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (editingId || (e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return
    const mod = e.ctrlKey || e.metaKey
    const k = e.key.toLowerCase()
    if (e.key === ' ') {
      e.preventDefault()
      setSpace(true)
      return
    }
    if (mod && k === 'z') {
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
      return
    }
    if (mod && k === 'y') {
      e.preventDefault()
      redo()
      return
    }
    if (mod && k === 'a') {
      e.preventDefault()
      setSelection(board.items.map((it) => it.id))
      return
    }
    if (mod && k === 'd' && editable) {
      e.preventDefault()
      duplicate()
      return
    }
    if (mod) return
    if ((e.key === 'Delete' || e.key === 'Backspace') && editable) {
      e.preventDefault()
      removeSelected()
      return
    }
    if (e.key === 'Escape') {
      setSelection([])
      setTool('select')
      return
    }
    if (e.key === 'Enter' && selected.length === 1 && selected[0].kind === 'text' && editable) {
      e.preventDefault()
      setEditingId(selected[0].id)
      return
    }
    const map: Record<string, Tool> = { v: 'select', h: 'hand', p: 'pen', e: 'eraser', t: 'text', r: 'rect', o: 'ellipse', l: 'line', a: 'arrow' }
    if (map[k] && (editable || map[k] === 'select' || map[k] === 'hand')) setTool(map[k])
    if (k === '+' || k === '=') zoomAt(1.2, (svg.current?.clientWidth ?? 0) / 2, (svg.current?.clientHeight ?? 0) / 2)
    if (k === '-') zoomAt(1 / 1.2, (svg.current?.clientWidth ?? 0) / 2, (svg.current?.clientHeight ?? 0) / 2)
    if (k === '0') fit()
  }

  const editing = editingId ? (board.items.find((it) => it.id === editingId) as TextItem | undefined) : undefined

  const finishEditing = (value: string) => {
    if (!editing) return
    if (!value.trim()) commit(board.items.filter((it) => it.id !== editing.id))
    else {
      const lines = value.split('\n').length
      const h = Math.max(editing.h, Math.round(editing.size * 1.3 * lines + 8))
      commit(board.items.map((it) => (it.id === editing.id ? { ...editing, text: value, h } : it)))
    }
    setEditingId(null)
  }

  const transformOf = (it: Item) => {
    const c = center(it)
    return `translate(${it.x} ${it.y}) rotate(${it.rotation} ${c.x - it.x} ${c.y - it.y})`
  }

  const marquee = drag?.mode === 'marquee' ? { x: Math.min(drag.sx, drag.x), y: Math.min(drag.sy, drag.y), w: Math.abs(drag.x - drag.sx), h: Math.abs(drag.y - drag.sy) } : null
  const background = board.settings.background ?? 'var(--paper)'
  const gridColor = dark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.13)'
  const handleSize = 9 / view.zoom
  const accent = 'var(--minimal-accent)'
  const cursor =
    tool === 'hand' || space || drag?.mode === 'pan' ? (drag?.mode === 'pan' ? 'grabbing' : 'grab') : tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair'

  return (
    <div
      ref={wrap}
      tabIndex={0}
      onKeyDown={onKey}
      onKeyUp={(e) => e.key === ' ' && setSpace(false)}
      onDragOver={(e) => {
        if (editable && e.dataTransfer.types.includes('Files')) e.preventDefault()
      }}
      onDrop={(e) => {
        const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'))
        if (!editable || !files.length) return
        e.preventDefault()
        onFiles(files, toWorld(e.clientX, e.clientY))
      }}
      onPaste={(e) => {
        const files = [...e.clipboardData.files].filter((f) => f.type.startsWith('image/'))
        if (!editable || !files.length || editingId) return
        e.preventDefault()
        onFiles(files, null)
      }}
      className="relative h-full w-full overflow-hidden outline-none"
      style={{ background, touchAction: 'none' }}
      aria-label={t('Lienzo de la pizarra')}
      role="application"
    >
      <svg
        ref={svg}
        className="absolute inset-0 h-full w-full select-none"
        style={{ cursor, fontFamily: fontCss(board.settings.font) }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={onDouble}
      >
        {board.settings.grid && (
          <>
            <defs>
              <pattern id="nv-grid" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
                <circle cx="1" cy="1" r={1 / Math.max(0.6, view.zoom)} fill={gridColor} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#nv-grid)" pointerEvents="none" />
          </>
        )}
        <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
          {items.map((it) => (
            <g key={it.id} data-item={it.id} transform={transformOf(it)} opacity={it.opacity} style={{ cursor: tool === 'select' && editable ? 'move' : undefined }}>
              {it.id === editingId ? null : <ItemShape it={it} dark={dark} />}
            </g>
          ))}
          {creating && (
            <g transform={transformOf(creating.kind === 'stroke' && drag?.mode === 'draw' ? normalizeStroke(creating, drag.raw) : creating)} opacity={creating.opacity} pointerEvents="none">
              <ItemShape it={creating.kind === 'stroke' && drag?.mode === 'draw' ? normalizeStroke(creating, drag.raw) : creating} dark={dark} />
            </g>
          )}
          {peers.map((peer) =>
            items
              .filter((it) => peer.selection.includes(it.id))
              .map((it) => (
                <g key={`${peer.id}-${it.id}`} transform={transformOf(it)} pointerEvents="none">
                  <rect x={-4 / view.zoom} y={-4 / view.zoom} width={it.w + 8 / view.zoom} height={it.h + 8 / view.zoom} fill="none" stroke={peer.color} strokeWidth={1.5 / view.zoom} strokeDasharray={`${4 / view.zoom} ${3 / view.zoom}`} />
                </g>
              )),
          )}
          {selected.length === 1 && !editingId && (
            <g transform={transformOf(selected[0])}>
              <rect x={-4 / view.zoom} y={-4 / view.zoom} width={selected[0].w + 8 / view.zoom} height={selected[0].h + 8 / view.zoom} fill="none" stroke={accent} strokeWidth={1.5 / view.zoom} pointerEvents="none" />
              {editable && (
                <>
                  <line x1={selected[0].w / 2} y1={-4 / view.zoom} x2={selected[0].w / 2} y2={-26 / view.zoom} stroke={accent} strokeWidth={1.5 / view.zoom} pointerEvents="none" />
                  <circle data-handle="rotate" cx={selected[0].w / 2} cy={-30 / view.zoom} r={handleSize / 1.6} fill="#ffffff" stroke={accent} strokeWidth={1.5 / view.zoom} style={{ cursor: 'grab' }} />
                  {HANDLES.map(([dx, dy]) => (
                    <rect
                      key={`${dx},${dy}`}
                      data-handle={`${dx},${dy}`}
                      x={((dx + 1) / 2) * selected[0].w - handleSize / 2 + (dx * 4) / view.zoom}
                      y={((dy + 1) / 2) * selected[0].h - handleSize / 2 + (dy * 4) / view.zoom}
                      width={handleSize}
                      height={handleSize}
                      rx={2 / view.zoom}
                      fill="#ffffff"
                      stroke={accent}
                      strokeWidth={1.5 / view.zoom}
                      style={{ cursor: dx === 0 ? 'ns-resize' : dy === 0 ? 'ew-resize' : dx === dy ? 'nwse-resize' : 'nesw-resize' }}
                    />
                  ))}
                </>
              )}
            </g>
          )}
          {selected.length > 1 &&
            (() => {
              const b = bounds(selected)
              return <rect x={b.x - 6 / view.zoom} y={b.y - 6 / view.zoom} width={b.w + 12 / view.zoom} height={b.h + 12 / view.zoom} fill="none" stroke={accent} strokeWidth={1.5 / view.zoom} strokeDasharray={`${5 / view.zoom} ${4 / view.zoom}`} pointerEvents="none" />
            })()}
          {marquee && <rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="color-mix(in srgb, var(--minimal-accent) 10%, transparent)" stroke={accent} strokeWidth={1 / view.zoom} pointerEvents="none" />}
        </g>
      </svg>

      {peers.map((peer) => (
        <div
          key={peer.id}
          className="pointer-events-none absolute top-0 left-0 z-10 transition-transform duration-75 ease-linear"
          style={{ transform: `translate(${peer.x * view.zoom + view.x}px, ${peer.y * view.zoom + view.y}px)` }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M2 2l13 6-5.5 1.7L7.6 15 2 2z" fill={peer.color} stroke="#ffffff" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
          <span className="ml-3 rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium whitespace-nowrap text-white shadow" style={{ background: peer.color }}>
            {peer.name}
          </span>
        </div>
      ))}

      {editing && (
        <textarea
          autoFocus
          defaultValue={editing.text}
          onBlur={(e) => finishEditing(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
              e.preventDefault()
              ;(e.target as HTMLTextAreaElement).blur()
            }
          }}
          aria-label={t('Texto')}
          className="absolute z-20 resize-none border-0 bg-transparent p-0 outline-2 outline-(--minimal-accent)"
          style={
            {
              left: editing.x * view.zoom + view.x,
              top: editing.y * view.zoom + view.y,
              width: Math.max(80, editing.w * view.zoom),
              height: Math.max(editing.h * view.zoom, editing.size * view.zoom * 1.4),
              transform: `rotate(${editing.rotation}deg)`,
              transformOrigin: 'center',
              color: editing.color,
              fontFamily: fontCss(editing.font),
              fontSize: editing.size * view.zoom,
              fontWeight: editing.bold ? 700 : 400,
              fontStyle: editing.italic ? 'italic' : 'normal',
              textDecoration: editing.underline ? 'underline' : 'none',
              textAlign: editing.align,
              lineHeight: 1.25,
            } as CSSProperties
          }
        />
      )}

      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-lg border border-(--minimal-line) bg-(--surface) p-1 text-xs shadow-sm">
        <button type="button" onClick={() => zoomAt(1 / 1.2, (svg.current?.clientWidth ?? 0) / 2, (svg.current?.clientHeight ?? 0) / 2)} aria-label={t('Alejar')} className="grid h-7 w-7 place-items-center rounded-md hover:bg-(--sunken)">
          <Icon name="minus" className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={fit} title={t('Ajustar a la vista')} className="min-w-12 rounded-md px-1.5 py-1 font-mono tabular-nums hover:bg-(--sunken)">
          {Math.round(view.zoom * 100)}%
        </button>
        <button type="button" onClick={() => zoomAt(1.2, (svg.current?.clientWidth ?? 0) / 2, (svg.current?.clientHeight ?? 0) / 2)} aria-label={t('Acercar')} className="grid h-7 w-7 place-items-center rounded-md hover:bg-(--sunken)">
          <Icon name="plus" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
