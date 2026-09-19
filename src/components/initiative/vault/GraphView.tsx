import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStored } from '../../../lib/store'
import { t } from '../../../lib/i18n'
import { Icon } from '../../ui'
import { skin } from '../skin'
import { buildGraph, centralFolder, neighborhood, norm, radialLayout, snippetOf, type VaultFolder, type VaultNote } from './vaultModel'
import { useForceGraph, type Layout } from './useForceGraph'

type Props = {
  notes: VaultNote[]
  folders: VaultFolder[]
  onOpenFolder: (id: string) => void
  activeId: string | null
  onOpen: (id: string) => void
  onCreate: (title: string) => void
  dark: boolean
}

const FOLDER = '#facc15'

type Prefs = {
  ghosts: boolean
  folders: boolean
  labels: boolean
  repulsion: number
  link: number
  positions: Record<string, { x: number; y: number }>
  view: { x: number; y: number; k: number } | null
}

const DEFAULT_PREFS: Prefs = { ghosts: true, folders: true, labels: true, repulsion: 1400, link: 130, positions: {}, view: null }
const CENTER = '#a78bfa'

type Shape = 'circle' | 'square' | 'diamond' | 'hexagon' | 'triangle' | 'star'

const SHAPES: { id: Shape; label: string }[] = [
  { id: 'circle', label: 'Círculo' },
  { id: 'square', label: 'Cuadrado' },
  { id: 'diamond', label: 'Rombo' },
  { id: 'hexagon', label: 'Hexágono' },
  { id: 'triangle', label: 'Triángulo' },
  { id: 'star', label: 'Estrella' },
]

const polygon = (points: number, radius: number, rotation: number, inner?: number) =>
  Array.from({ length: inner ? points * 2 : points }, (_, i) => {
    const angle = rotation + (i * Math.PI * 2) / (inner ? points * 2 : points)
    const rad = inner && i % 2 === 1 ? inner : radius
    return `${(Math.cos(angle) * rad).toFixed(2)},${(Math.sin(angle) * rad).toFixed(2)}`
  }).join(' ')

const shapePoints = (shape: Shape, r: number) => {
  if (shape === 'diamond') return polygon(4, r * 1.25, -Math.PI / 2)
  if (shape === 'hexagon') return polygon(6, r * 1.1, 0)
  if (shape === 'triangle') return polygon(3, r * 1.3, -Math.PI / 2)
  if (shape === 'star') return polygon(5, r * 1.35, -Math.PI / 2, r * 0.6)
  return ''
}

export function GraphView({ notes, folders, onOpenFolder, activeId, onOpen, onCreate, dark }: Props) {
  const s = skin(dark)
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 800, h: 520 })
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const [prefs, setPrefs] = useStored<Prefs>('nivra-vault-graph', DEFAULT_PREFS)
  const { ghosts, folders: showFolders, labels, repulsion, link } = prefs
  const patch = (changes: Partial<Prefs>) => setPrefs((prev) => ({ ...prev, ...changes }))
  const setGhosts = (value: boolean) => patch({ ghosts: value })
  const setShowFolders = (value: boolean) => patch({ folders: value })
  const setLabels = (value: boolean) => patch({ labels: value })
  const setRepulsion = (value: number) => patch({ repulsion: value })
  const setLink = (value: number) => patch({ link: value })
  const positions = useRef(prefs.positions)
  positions.current = prefs.positions
  const restored = useRef(prefs.view)
  const [version, setVersion] = useState(0)
  const [local, setLocal] = useState(false)
  const [depth, setDepth] = useState(1)
  const [query, setQuery] = useState('')
  const [centerShape, setCenterShape] = useStored<Shape>('nivra-vault-center-shape', 'circle')
  const [hover, setHover] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const drag = useRef<{ kind: 'node' | 'pan'; id?: string; x: number; y: number; moved: boolean } | null>(null)
  const hoverFrame = useRef(0)
  const scheduleHover = (id: string | null) => {
    cancelAnimationFrame(hoverFrame.current)
    hoverFrame.current = requestAnimationFrame(() => setHover(id))
  }
  useEffect(() => () => cancelAnimationFrame(hoverFrame.current), [])
  const viewRef = useRef(view)
  viewRef.current = view

  const graph = useMemo(() => buildGraph(notes, folders, { ghosts, folders: showFolders }), [notes, folders, ghosts, showFolders])
  const visibleIds = useMemo(() => {
    if (!local || !activeId) return null
    return neighborhood(graph.edges, activeId, depth)
  }, [graph, local, activeId, depth])

  const nodes = useMemo(() => (visibleIds ? graph.nodes.filter((n) => visibleIds.has(n.id)) : graph.nodes), [graph, visibleIds])
  const edges = useMemo(() => (visibleIds ? graph.edges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to)) : graph.edges), [graph, visibleIds])
  const options = useMemo(() => ({ repulsion, link }), [repulsion, link])
  const central = useMemo(() => (showFolders ? centralFolder(notes, folders) : null), [notes, folders, showFolders])
  const centralNode = central ? `folder:${central}` : null
  const layout = useMemo<Layout>(() => {
    const home = radialLayout(nodes, edges, central && nodes.some((n) => n.id === `folder:${central}`) ? central : null)
    const saved = version >= 0 ? positions.current : {}
    for (const [id, point] of Object.entries(saved)) if (home.has(id)) home.set(id, point)
    const radius = new Map<string, number>()
    for (const n of nodes) {
      radius.set(n.id, n.id === centralNode ? 22 : n.folder ? 9 + Math.sqrt(n.degree) * 1.6 : 4.5 + Math.sqrt(n.degree) * 2)
    }
    const pinned = new Set<string>(centralNode && home.has(centralNode) && nodes.some((n) => n.id === centralNode) ? [centralNode] : [])
    return { home, pinned, radius }
  }, [nodes, edges, central, centralNode, version])
  const { bodies, pin, release, reset } = useForceGraph(nodes, edges, options, layout)

  const fit = useCallback(() => {
    const points = [...layout.home.values()]
    if (points.length === 0) return { x: 0, y: 0, k: 1 }
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const minX = Math.min(...xs) - 40
    const maxX = Math.max(...xs) + 40
    const minY = Math.min(...ys) - 40
    const maxY = Math.max(...ys) + 40
    const k = Math.min(1.6, Math.max(0.2, Math.min(size.w / (maxX - minX), size.h / (maxY - minY))))
    return { x: -((minX + maxX) / 2) * k, y: -((minY + maxY) / 2) * k, k }
  }, [layout, size.w, size.h])

  useEffect(() => {
    if (restored.current) {
      setView(restored.current)
      restored.current = null
    } else setView(fit())
  }, [fit])

  useEffect(() => {
    const id = setTimeout(() => setPrefs((prev) => ({ ...prev, view })), 400)
    return () => clearTimeout(id)
  }, [view, setPrefs])

  useEffect(() => {
    if (version > 0) reset()
  }, [version, reset])

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const observer = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    observer.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = svg.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const px = e.clientX - rect.left - rect.width / 2
      const py = e.clientY - rect.top - rect.height / 2
      setView((v) => {
        const k = Math.min(3, Math.max(0.25, v.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)))
        const ratio = k / v.k
        return { k, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const toGraph = (clientX: number, clientY: number) => {
    const rect = svg.current!.getBoundingClientRect()
    const v = viewRef.current
    return { x: (clientX - rect.left - rect.width / 2 - v.x) / v.k, y: (clientY - rect.top - rect.height / 2 - v.y) / v.k }
  }

  const onPointerDown = (e: React.PointerEvent, id?: string) => {
    e.stopPropagation()
    svg.current?.setPointerCapture(e.pointerId)
    drag.current = { kind: id ? 'node' : 'pan', id, x: e.clientX, y: e.clientY, moved: false }
    if (id) {
      const p = toGraph(e.clientX, e.clientY)
      pin(id, p.x, p.y)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) d.moved = true
    if (d.kind === 'node' && d.id) {
      const p = toGraph(e.clientX, e.clientY)
      pin(d.id, p.x, p.y)
    } else if (d.kind === 'pan') {
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      d.x = e.clientX
      d.y = e.clientY
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
    }
  }

  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.kind === 'node' && d.id) {
      release(d.id)
      const body = bodies.get(d.id)
      if (d.moved && body) setPrefs((prev) => ({ ...prev, positions: { ...prev.positions, [d.id!]: { x: Math.round(body.x), y: Math.round(body.y) } } }))
      if (!d.moved) setSelected(d.id)
    } else if (!d.moved) setSelected(null)
  }

  const q = norm(query)
  const focus = hover ?? selected
  const adjacent = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const e of edges) {
      if (!map.has(e.from)) map.set(e.from, new Set())
      if (!map.has(e.to)) map.set(e.to, new Set())
      map.get(e.from)!.add(e.to)
      map.get(e.to)!.add(e.from)
    }
    return map
  }, [edges])

  const dim = (id: string) => {
    if (q) {
      const node = nodes.find((n) => n.id === id)
      return !(node && norm(node.label).includes(q))
    }
    if (focus) return id !== focus && !adjacent.get(focus)?.has(id)
    return false
  }

  const info = selected ? nodes.find((n) => n.id === selected) : null
  const infoNote = info && !info.ghost ? notes.find((n) => n.id === info.id) : null
  const ink = dark ? '#e5e5e5' : '#262626'
  const muted = dark ? '#737373' : '#a3a3a3'
  const halo = dark ? '#0f0f11' : '#ffffff'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Buscar en el grafo')}
          aria-label={t('Buscar en el grafo')}
          className={`${s.field} !w-48 !py-1.5 text-xs`}
        />
        <Toggle on={local} onClick={() => setLocal(!local)} label={t('Solo cerca de la nota')} disabled={!activeId} s={s} />
        {local && (
          <select value={depth} onChange={(e) => setDepth(Number(e.target.value))} aria-label={t('Profundidad')} className={`${s.field} !w-auto !py-1.5 text-xs`}>
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {t('Profundidad')} {n}
              </option>
            ))}
          </select>
        )}
        <Toggle on={ghosts} onClick={() => setGhosts(!ghosts)} label={t('Notas por crear')} s={s} />
        <Toggle on={showFolders} onClick={() => setShowFolders(!showFolders)} label={t('Carpetas')} s={s} />
        <Toggle on={labels} onClick={() => setLabels(!labels)} label={t('Nombres')} s={s} />
        {central && (
          <label className={`flex items-center gap-2 text-xs ${s.muted}`}>
            {t('Forma del centro')}
            <select value={centerShape} onChange={(e) => setCenterShape(e.target.value as Shape)} aria-label={t('Forma del centro')} className={`${s.field} !w-auto !py-1.5 text-xs`}>
              {SHAPES.map((x) => (
                <option key={x.id} value={x.id}>
                  {t(x.label)}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="flex-1" />
        <label className={`flex items-center gap-2 text-[0.7rem] ${s.muted}`}>
          {t('Repulsión')}
          <input type="range" min={400} max={5000} step={100} value={repulsion} onChange={(e) => setRepulsion(Number(e.target.value))} className="w-20 accent-neutral-500" />
        </label>
        <label className={`flex items-center gap-2 text-[0.7rem] ${s.muted}`}>
          {t('Enlaces')}
          <input type="range" min={30} max={200} step={5} value={link} onChange={(e) => setLink(Number(e.target.value))} className="w-20 accent-neutral-500" />
        </label>
      </div>

      <div ref={wrap} className={`relative min-h-[22rem] flex-1 overflow-hidden rounded-2xl border ${s.line} ${s.panel}`}>
        <svg
          ref={svg}
          width={size.w}
          height={size.h}
          viewBox={`${-size.w / 2} ${-size.h / 2} ${size.w} ${size.h}`}
          onPointerDown={(e) => onPointerDown(e)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="block touch-none select-none"
          role="img"
          aria-label={t('Grafo de notas')}
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {edges.map((e) => {
              const a = bodies.get(e.from)
              const b = bodies.get(e.to)
              if (!a || !b) return null
              const lit = focus !== null && (e.from === focus || e.to === focus)
              const faded = (q || focus) && !lit
              return (
                <line
                  className="transition-opacity duration-150"
                  key={`${e.from}>${e.to}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={lit ? ink : e.folder ? FOLDER : muted}
                  strokeWidth={(lit ? 1.8 : e.folder ? 1.2 : 1) / view.k}
                                    opacity={faded ? 0.08 : lit ? 0.95 : e.folder ? 0.45 : 0.28}
                />
              )
            })}
            {nodes.map((n) => {
              const p = bodies.get(n.id)
              if (!p) return null
              const r = layout.radius.get(n.id) ?? 6
              const isCentral = n.id === centralNode
                          const fill = isCentral ? CENTER : n.folder ? FOLDER : n.ghost ? 'transparent' : dark ? '#9ca3af' : '#6b7280'
              const isActive = n.id === activeId
              const faded = dim(n.id)
              const near = focus !== null && (n.id === focus || adjacent.get(focus)?.has(n.id))
              const showLabel = labels && (isCentral || n.folder || near || isActive || nodes.length <= 24 || view.k >= 1.3)
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x} ${p.y})`}
                  opacity={faded ? 0.2 : 1}
                  className="cursor-pointer transition-opacity duration-150"
                  onPointerDown={(e) => onPointerDown(e, n.id)}
                  onPointerEnter={() => scheduleHover(n.id)}
                  onPointerLeave={() => scheduleHover(null)}
                  onDoubleClick={() => (n.folder ? onOpenFolder(n.id.slice(7)) : n.ghost ? onCreate(n.label) : onOpen(n.id))}
                >
                  {isActive && <circle r={r + 5} fill="none" stroke={ink} strokeWidth={1.5} opacity={0.6} />}
                  {isCentral && centerShape === 'square' ? (
                    <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={r * 0.25} fill={fill} stroke={ink} strokeWidth={n.id === selected ? 2 : 0} />
                  ) : isCentral && centerShape !== 'circle' ? (
                    <polygon points={shapePoints(centerShape, r)} fill={fill} stroke={ink} strokeWidth={n.id === selected ? 2 : 0} strokeLinejoin="round" />
                  ) : (
                    <circle r={r} fill={fill} stroke={n.ghost ? muted : ink} strokeWidth={n.ghost ? 1.4 : n.id === selected ? 2 : 0} strokeDasharray={n.ghost ? '3 3' : undefined} />
                  )}
                  {showLabel && (
                    <text
                      y={r + 13}
                      textAnchor="middle"
                      fontSize={(isCentral ? 13 : 11) / Math.max(view.k, 0.7)}
                      fontWeight={isCentral || n.folder ? 600 : 400}
                      fill={n.ghost ? muted : isCentral ? CENTER : ink}
                      stroke={halo}
                      strokeWidth={3 / Math.max(view.k, 0.7)}
                      paintOrder="stroke"
                      strokeLinejoin="round"
                      className="pointer-events-none"
                    >
                      {n.label.length > 24 ? `${n.label.slice(0, 23)}…` : n.label}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {nodes.length === 0 && (
          <p className={`absolute inset-0 grid place-items-center px-6 text-center text-sm ${s.faint}`}>
            {t('Aún no hay notas. Crea algunas y enlázalas con [[Título]].')}
          </p>
        )}

        <div className="absolute right-3 bottom-3 flex flex-col gap-1.5">
          <button type="button" onClick={() => setView((v) => ({ ...v, k: Math.min(3, v.k * 1.2) }))} aria-label={t('Acercar')} className={s.iconButton}>
            +
          </button>
          <button type="button" onClick={() => setView((v) => ({ ...v, k: Math.max(0.25, v.k / 1.2) }))} aria-label={t('Alejar')} className={s.iconButton}>
            −
          </button>
          <button
            type="button"
            onClick={() => {
              positions.current = {}
              restored.current = null
              patch({ positions: {}, view: null })
              setVersion((v) => v + 1)
            }}
            aria-label={t('Ordenar y centrar')}
            title={t('Ordenar y centrar')}
            className={s.iconButton}
          >
            <Icon name="graph" className="h-4 w-4" />
          </button>
        </div>

        {info && (
          <div className={`absolute bottom-3 left-3 flex max-w-xs flex-col gap-2 rounded-xl border p-3 shadow-lg ${s.line} ${dark ? 'bg-neutral-900' : 'bg-white'}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium break-words">{info.label}</p>
              <button type="button" onClick={() => setSelected(null)} aria-label={t('Cerrar')} className={`${s.muted} ${s.hoverText}`}>
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className={`text-[0.7rem] ${s.faint}`}>
              {info.id === centralNode ? t('Carpeta central') : info.folder ? t('Carpeta') : info.ghost ? t('Nota por crear') : snippetOf(infoNote?.body ?? '', 110) || t('Vacío.')}
            </p>
            <p className={`text-[0.7rem] ${s.muted}`}>
              {info.degree} {t(info.degree === 1 ? 'conexión' : 'conexiones')}
              {info.tags.length > 0 && ` · ${info.tags.map((x) => `#${x}`).join(' ')}`}
            </p>
            <button
              type="button"
              onClick={() => (info.folder ? onOpenFolder(info.id.slice(7)) : info.ghost ? onCreate(info.label) : onOpen(info.id))}
              className={`self-start rounded-lg px-3 py-1.5 text-xs font-medium ${s.primary}`}
            >
              {info.folder ? t('Ver carpeta') : info.ghost ? t('Crear nota') : t('Abrir nota')}
            </button>
          </div>
        )}
      </div>
      <p className={`text-[0.7rem] ${s.faint}`}>
        {t('Arrastra los nodos para moverlos, arrastra el fondo para desplazarte y usa la rueda para acercar. Doble clic para abrir.')}
      </p>
    </div>
  )
}

function Toggle({ on, onClick, label, s, disabled }: { on: boolean; onClick: () => void; label: string; s: ReturnType<typeof skin>; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={`rounded-lg border px-3 py-1.5 text-xs transition-colors disabled:opacity-40 ${on ? `${s.active} border-transparent` : `${s.line} ${s.muted} ${s.hover}`}`}
    >
      {label}
    </button>
  )
}
