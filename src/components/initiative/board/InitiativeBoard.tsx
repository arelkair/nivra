import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { t, tp } from '../../../lib/i18n'
import { notify, notifyWithUndo } from '../../../lib/undo'
import { cacheMedia, getMedia, putMedia, saveImage } from '../../../lib/photos'
import { Icon, Modal } from '../../ui'
import { skin } from '../skin'
import { BoardCanvas, type PeerView } from './BoardCanvas'
import { formatCode, newCode, openLive, validCode, type LiveSession, type Peer, type Perms, type RemoteCursor, type Role } from './boardLive'
import {
  BACKGROUNDS,
  DEFAULT_STYLE,
  FONTS,
  SWATCHES,
  itemFromStyle,
  newBoard,
  type Board,
  type BoardSettings,
  type Brush,
  type Item,
  type Style,
  type Tool,
} from './boardModel'

type NoteRef = { id: string; title: string }

type Session = { code: string; role: Role; live: LiveSession; boardId: string }

type Props = {
  dark: boolean
  userName: string
  boards: Board[]
  setBoards: (fn: (prev: Board[]) => Board[]) => void
  notes: NoteRef[]
  onOpenNote: (id: string) => void
  focus: string | null
  onFocusHandled: () => void
  joinCode: string | null
  onJoinHandled: () => void
}

const TOOLS: { id: Tool; icon: string; label: string; key: string }[] = [
  { id: 'select', icon: 'pointer', label: 'Seleccionar', key: 'V' },
  { id: 'hand', icon: 'hand', label: 'Mover lienzo', key: 'H' },
  { id: 'pen', icon: 'pen', label: 'Pincel', key: 'P' },
  { id: 'eraser', icon: 'eraser', label: 'Borrador', key: 'E' },
  { id: 'text', icon: 'text', label: 'Texto', key: 'T' },
  { id: 'rect', icon: 'square', label: 'Rectángulo', key: 'R' },
  { id: 'ellipse', icon: 'circle', label: 'Círculo', key: 'O' },
  { id: 'triangle', icon: 'triangle', label: 'Triángulo', key: '' },
  { id: 'diamond', icon: 'diamond', label: 'Rombo', key: '' },
  { id: 'star', icon: 'star', label: 'Estrella', key: '' },
  { id: 'hexagon', icon: 'hexagon', label: 'Hexágono', key: '' },
  { id: 'line', icon: 'line', label: 'Línea', key: 'L' },
  { id: 'arrow', icon: 'arrow', label: 'Flecha', key: 'A' },
  { id: 'link', icon: 'link', label: 'Enlace', key: '' },
]

const BRUSHES: { id: Brush; label: string }[] = [
  { id: 'pen', label: 'Bolígrafo' },
  { id: 'marker', label: 'Rotulador' },
  { id: 'highlighter', label: 'Subrayador' },
  { id: 'dashed', label: 'Discontinuo' },
]

const SHAPE_TOOLS: Tool[] = ['rect', 'ellipse', 'triangle', 'diamond', 'star', 'hexagon']
const HISTORY_LIMIT = 100

function applyPatch(it: Item, p: Partial<Style>): Item {
  let next: Item = p.opacity !== undefined ? { ...it, opacity: p.opacity } : it
  if (next.kind === 'stroke')
    next = { ...next, color: p.color ?? next.color, color2: p.color2 !== undefined ? p.color2 : next.color2, width: p.width ?? next.width, brush: p.brush ?? next.brush }
  else if (next.kind === 'shape')
    next = {
      ...next,
      stroke: p.color ?? next.stroke,
      fill: p.fill !== undefined ? p.fill : next.fill,
      color2: p.color2 !== undefined ? p.color2 : next.color2,
      strokeWidth: p.width ?? next.strokeWidth,
      dashed: p.dashed ?? next.dashed,
    }
  else if (next.kind === 'line')
    next = { ...next, color: p.color ?? next.color, width: p.width ?? next.width, dashed: p.dashed ?? next.dashed, arrowStart: p.arrowStart ?? next.arrowStart }
  else if (next.kind === 'text')
    next = {
      ...next,
      color: p.color ?? next.color,
      font: p.font ?? next.font,
      size: p.size ?? next.size,
      bold: p.bold ?? next.bold,
      italic: p.italic ?? next.italic,
      underline: p.underline ?? next.underline,
      align: p.align ?? next.align,
    }
  else if (next.kind === 'link') next = { ...next, color: p.color ?? next.color }
  return next
}

function diff(prev: Item[], next: Item[]) {
  const before = new Map(prev.map((it) => [it.id, it]))
  const ids = new Set(next.map((it) => it.id))
  return {
    upsert: next.filter((it) => before.get(it.id) !== it),
    remove: prev.filter((it) => !ids.has(it.id)).map((it) => it.id),
  }
}

function mergeOps(items: Item[], upsert: Item[], remove: string[]) {
  const gone = new Set(remove)
  const map = new Map(upsert.map((it) => [it.id, it]))
  const out = items.filter((it) => !gone.has(it.id)).map((it) => map.get(it.id) ?? it)
  const known = new Set(out.map((it) => it.id))
  for (const it of upsert) if (!known.has(it.id) && !gone.has(it.id)) out.push(it)
  return out
}

function ToolButton({ active, label, onClick, children, disabled }: { active?: boolean; label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors disabled:opacity-35 pointer-coarse:h-10 pointer-coarse:w-10 ${
        active ? 'bg-(--minimal-accent) text-(--minimal-primary-ink)' : 'text-(--minimal-muted) hover:bg-(--sunken) hover:text-(--minimal-text)'
      }`}
    >
      {children}
    </button>
  )
}

function Swatches({ value, onChange, allowNone, label }: { value: string | null; onChange: (c: string | null) => void; allowNone?: boolean; label: string }) {
  return (
    <fieldset className="flex flex-wrap items-center gap-1.5">
      <legend className="mb-1.5 text-xs text-(--minimal-muted)">{label}</legend>
      {allowNone && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={t('Sin color')}
          aria-pressed={value === null}
          className={`relative h-6 w-6 overflow-hidden rounded-full border border-(--minimal-line) ${value === null ? 'ring-2 ring-(--minimal-accent) ring-offset-1 ring-offset-(--surface)' : ''}`}
        >
          <span className="absolute top-1/2 left-1/2 h-px w-7 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-red-500" />
        </button>
      )}
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={c}
          aria-pressed={value === c}
          style={{ background: c }}
          className={`h-6 w-6 rounded-full border border-(--minimal-line) transition-transform active:scale-90 ${value === c ? 'ring-2 ring-(--minimal-accent) ring-offset-1 ring-offset-(--surface)' : ''}`}
        />
      ))}
      <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-(--minimal-line)" style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}>
        <span className="sr-only">{t('Color personalizado')}</span>
        <input type="color" value={value ?? '#000000'} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
    </fieldset>
  )
}

function Range({ label, value, min, max, step, onChange, suffix = '' }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-xs text-(--minimal-muted)">
        {label}
        <span className="font-mono tabular-nums">
          {value}
          {suffix}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-(--minimal-accent)" />
    </label>
  )
}

function Toggle({ on, label, onClick, children }: { on: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={`grid h-8 min-w-8 place-items-center rounded-md border px-2 text-sm transition-colors ${
        on ? 'border-(--minimal-accent) bg-(--minimal-accent) text-(--minimal-primary-ink)' : 'border-(--minimal-line) text-(--minimal-muted) hover:text-(--minimal-text)'
      }`}
    >
      {children}
    </button>
  )
}

export function InitiativeBoard({ dark, userName, boards, setBoards, notes, onOpenNote, focus, onFocusHandled, joinCode, onJoinHandled }: Props) {
  const s = skin(dark)
  const [activeId, setActiveId] = useState<string | null>(() => boards[0]?.id ?? null)
  const [tool, setTool] = useState<Tool>('pen')
  const [style, setStyle] = useState<Style>(DEFAULT_STYLE)
  const [selection, setSelection] = useState<string[]>([])
  const [listOpen, setListOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [linkAt, setLinkAt] = useState<{ x: number; y: number } | null>(null)
  const [linkQuery, setLinkQuery] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [itemFocus, setItemFocus] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<'connecting' | 'live' | 'error' | null>(null)
  const [guest, setGuest] = useState<Board | null>(null)
  const [perms, setPerms] = useState<Perms>({ defaultRole: 'edit', roles: {} })
  const [peers, setPeers] = useState<Peer[]>([])
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({})
  const [joinInput, setJoinInput] = useState('')
  const history = useRef<Record<string, { past: Item[][]; future: Item[][] }>>({})
  const me = useRef<Peer>({ id: crypto.randomUUID(), name: '', color: '', role: 'host' })
  const lastCursor = useRef(0)
  const viewCenter = useRef({ x: 0, y: 0 })
  const imageInput = useRef<HTMLInputElement>(null)
  const snapshotReady = useRef(false)
  const stateRef = useRef({ boards, guest, perms, session, peers })
  stateRef.current = { boards, guest, perms, session, peers }

  const isGuest = !!guest
  const inGuestSession = !!session && session.role !== 'host'
  const board = isGuest ? guest : (boards.find((b) => b.id === activeId) ?? null)
  const myRole: Role = !session ? (guest ? 'view' : 'host') : session.role === 'host' ? 'host' : (perms.roles[me.current.id] ?? perms.defaultRole)
  const editable = !!board && myRole !== 'view'

  const roleOf = useCallback((id: string): Role => {
    const { peers: list, perms: p } = stateRef.current
    if (list.find((x) => x.id === id)?.role === 'host') return 'host'
    return p.roles[id] ?? p.defaultRole
  }, [])

  const tops = useMemo(() => boards.filter((b) => !b.parent).sort((a, b) => a.created - b.created), [boards])
  const childrenOf = (id: string) => boards.filter((b) => b.parent === id).sort((a, b) => a.created - b.created)

  useEffect(() => {
    if (!activeId && boards.length) setActiveId(boards[0].id)
    if (activeId && !boards.some((b) => b.id === activeId) && !isGuest) setActiveId(boards[0]?.id ?? null)
  }, [boards, activeId, isGuest])

  useEffect(() => {
    if (!focus) return
    const [boardId, itemId] = focus.split('#')
    if (boards.some((b) => b.id === boardId)) {
      setActiveId(boardId)
      setItemFocus(itemId ?? null)
    }
    onFocusHandled()
  }, [focus, boards, onFocusHandled])

  const writeItems = useCallback(
    (boardId: string, fn: (items: Item[]) => Item[]) => {
      if (stateRef.current.session && stateRef.current.session.role !== 'host') {
        setGuest((g) => (g ? { ...g, items: fn(g.items) } : g))
        return
      }
      setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, items: fn(b.items), updated: Date.now() } : b)))
    },
    [setBoards],
  )

  const broadcast = useCallback((upsert: Item[], remove: string[], settings?: BoardSettings, name?: string) => {
    const sess = stateRef.current.session
    if (!sess || (!upsert.length && !remove.length && !settings && !name)) return
    sess.live.sendOps(upsert, remove, settings, name).catch(() => undefined)
  }, [])

  const commit = useCallback(
    (next: Item[]) => {
      if (!board) return
      const h = (history.current[board.id] ??= { past: [], future: [] })
      h.past = [...h.past.slice(-HISTORY_LIMIT + 1), board.items]
      h.future = []
      const { upsert, remove } = diff(board.items, next)
      writeItems(board.id, () => next)
      broadcast(upsert, remove)
    },
    [board, writeItems, broadcast],
  )

  const step = (dir: 'undo' | 'redo') => {
    if (!board || !editable) return
    const h = history.current[board.id]
    const from = dir === 'undo' ? h?.past : h?.future
    if (!h || !from?.length) return
    const target = from[from.length - 1]
    if (dir === 'undo') {
      h.past = h.past.slice(0, -1)
      h.future = [...h.future, board.items]
    } else {
      h.future = h.future.slice(0, -1)
      h.past = [...h.past, board.items]
    }
    const { upsert, remove } = diff(board.items, target)
    writeItems(board.id, () => target)
    broadcast(upsert, remove)
    setSelection((sel) => sel.filter((id) => target.some((it) => it.id === id)))
  }

  const liveDraft = useCallback((upsert: Item[], remove: string[]) => broadcast(upsert, remove), [broadcast])

  const changeStyle = (patch: Partial<Style>) => {
    setStyle((prev) => ({ ...prev, ...patch }))
    if (!board || !editable || !selection.length) return
    commit(board.items.map((it) => (selection.includes(it.id) ? applyPatch(it, patch) : it)))
  }

  const updateSettings = (patch: Partial<BoardSettings>) => {
    if (!board) return
    const settings = { ...board.settings, ...patch }
    if (isGuest) setGuest((g) => (g ? { ...g, settings } : g))
    else setBoards((prev) => prev.map((b) => (b.id === board.id ? { ...b, settings, updated: Date.now() } : b)))
    broadcast([], [], settings)
  }

  const rename = (id: string, name: string) => {
    const clean = name.trim()
    setRenaming(null)
    if (!clean) return
    if (isGuest) setGuest((g) => (g ? { ...g, name: clean } : g))
    else setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, name: clean, updated: Date.now() } : b)))
    if (session && board?.id === id) broadcast([], [], undefined, clean)
  }

  const create = (parent: string | null) => {
    const siblings = boards.filter((b) => b.parent === parent).length
    const base = parent ? t('Subpizarra') : t('Pizarra')
    const b = newBoard(`${base} ${siblings + 1}`, parent)
    setBoards((prev) => [...prev, b])
    setGuest(null)
    setActiveId(b.id)
    setRenaming(b.id)
    setListOpen(false)
  }

  const remove = (id: string) => {
    const target = boards.find((b) => b.id === id)
    if (!target) return
    const snapshot = boards
    setBoards((prev) => prev.filter((b) => b.id !== id && b.parent !== id))
    if (activeId === id || boards.find((b) => b.id === activeId)?.parent === id) setActiveId(null)
    notifyWithUndo(tp('«{0}» eliminada', target.name), () => setBoards(() => snapshot))
  }

  const addImages = async (files: File[], at: { x: number; y: number } | null) => {
    if (!board || !editable) return
    const origin = at ?? viewCenter.current
    try {
      const saved = await Promise.all(files.slice(0, 10).map((f) => saveImage(f, 1600)))
      const items: Item[] = saved.map((img, i) => {
        const scale = Math.min(1, 480 / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        return { id: crypto.randomUUID(), kind: 'image', media: img.id, x: origin.x - w / 2 + i * 24, y: origin.y - h / 2 + i * 24, w, h, rotation: 0, opacity: 1 }
      })
      const sess = stateRef.current.session
      if (sess) for (const img of saved) await sess.live.sendMedia(img.id, img.data).catch(() => undefined)
      commit([...board.items, ...items])
      setSelection(items.map((it) => it.id))
      setTool('select')
    } catch {
      notify(t('No se pudo añadir la imagen.'))
    }
  }

  const saveCopy = () => {
    if (!guest) return
    const copy = { ...newBoard(tp('{0} (copia)', guest.name), null), items: guest.items, settings: guest.settings }
    setBoards((prev) => [...prev, copy])
    for (const it of guest.items) if (it.kind === 'image') getMedia(it.media).then((data) => (data ? putMedia(it.media, data) : undefined))
    notify(t('Copia guardada en tus pizarras.'))
  }

  const accentColor = () => getComputedStyle(document.documentElement).getPropertyValue('--minimal-accent').trim() || '#8b5cf6'

  const handlers = useCallback(
    (onError: () => void) => ({
      onHello: (from: string) => {
        const { session: sess, boards: list, perms: p } = stateRef.current
        if (!sess || sess.role !== 'host') return
        const b = list.find((x) => x.id === sess.boardId)
        if (!b) return
        sess.live
          .sendSnapshot(from, b, p)
          .then(async () => {
            for (const it of b.items) {
              if (it.kind !== 'image') continue
              const data = await getMedia(it.media)
              if (data) await sess.live.sendMedia(it.media, data)
            }
          })
          .catch(() => undefined)
      },
      onSnapshot: (snap: Pick<Board, 'name' | 'settings' | 'items'>, p: Perms) => {
        snapshotReady.current = true
        setGuest({ id: 'live', parent: null, created: Date.now(), updated: Date.now(), ...snap })
        setPerms(p)
      },
      onOps: (from: string, upsert: Item[], removed: string[], settings?: BoardSettings, name?: string) => {
        if (roleOf(from) === 'view') return
        const sess = stateRef.current.session
        if (!sess) return
        const apply = (b: Board): Board => ({ ...b, items: mergeOps(b.items, upsert, removed), settings: settings ?? b.settings, name: name ?? b.name, updated: Date.now() })
        if (sess.role === 'host') setBoards((prev) => prev.map((b) => (b.id === sess.boardId ? apply(b) : b)))
        else setGuest((g) => (g ? apply(g) : g))
      },
      onPerms: (p: Perms) => setPerms(p),
      onCursor: (from: string, c: RemoteCursor) => setCursors((prev) => ({ ...prev, [from]: c })),
      onMedia: (id: string, data: string) => {
        if (stateRef.current.session?.role === 'host') putMedia(id, data).catch(() => undefined)
        else cacheMedia(id, data)
      },
      onPeers: (list: Peer[]) => {
        setPeers(list)
        setCursors((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => list.some((x) => x.id === id))))
      },
      onEnd: (deleted: boolean) => {
        notify(deleted ? t('La pizarra compartida se ha eliminado.') : t('La sesión compartida ha terminado.'))
        onError()
        if (deleted) setGuest(null)
      },
      onStatus: (st: 'connecting' | 'live' | 'error') => setStatus(st),
    }),
    [roleOf, setBoards],
  )

  const leave = useCallback(async (keepGuest: boolean) => {
    const sess = stateRef.current.session
    setSession(null)
    setPeers([])
    setCursors({})
    setStatus(null)
    if (!keepGuest) setGuest(null)
    if (sess) await sess.live.close().catch(() => undefined)
  }, [])

  const endedAsGuest = useCallback(() => {
    const sess = stateRef.current.session
    setSession(null)
    setPeers([])
    setCursors({})
    setStatus(null)
    sess?.live.close().catch(() => undefined)
  }, [])

  const startSharing = async () => {
    if (!board || session) return
    const code = newCode()
    me.current = { id: me.current.id, name: userName || t('Anfitrión'), color: accentColor(), role: 'host' }
    try {
      const live = await openLive(code, me.current, handlers(endedAsGuest))
      setPerms({ defaultRole: 'edit', roles: {} })
      setSession({ code, role: 'host', live, boardId: board.id })
    } catch {
      setStatus('error')
      notify(t('No se pudo iniciar la sesión compartida.'))
    }
  }

  const join = useCallback(
    async (raw: string) => {
      if (!validCode(raw)) {
        notify(t('El código no es válido.'))
        return
      }
      const code = formatCode(raw)
      await leave(false)
      me.current = { id: me.current.id, name: userName || t('Invitado'), color: accentColor(), role: 'edit' }
      try {
        const live = await openLive(code, me.current, handlers(endedAsGuest))
        snapshotReady.current = false
        setSession({ code, role: 'edit', live, boardId: 'live' })
        setGuest({ ...newBoard(t('Conectando…'), null), id: 'live' })
        setShareOpen(false)
        await live.sendHello()
        const waiting = () => stateRef.current.session?.code === code && !snapshotReady.current
        setTimeout(() => {
          if (waiting()) stateRef.current.session?.live.sendHello().catch(() => undefined)
        }, 2500)
        setTimeout(() => {
          if (!waiting()) return
          notify(t('Esta pizarra ya no está disponible.'))
          leave(false)
        }, 8000)
      } catch {
        setStatus('error')
        notify(t('No se pudo conectar. Revisa el código.'))
      }
    },
    [handlers, leave, userName, endedAsGuest],
  )

  useEffect(() => {
    if (!joinCode) return
    onJoinHandled()
    join(joinCode)
  }, [joinCode, join, onJoinHandled])

  useEffect(() => () => void stateRef.current.session?.live.close().catch(() => undefined), [])

  const endSession = async () => {
    const sess = session
    if (!sess) return
    if (sess.role === 'host') await sess.live.sendEnd().catch(() => undefined)
    await leave(sess.role !== 'host')
  }

  useEffect(() => {
    if (session?.role !== 'host' || boards.some((b) => b.id === session.boardId)) return
    session.live.sendEnd(true).catch(() => undefined)
    leave(false)
    setShareOpen(false)
  }, [session, boards, leave])

  const setRole = (id: string, role: 'edit' | 'view') => {
    const next = { ...perms, roles: { ...perms.roles, [id]: role } }
    setPerms(next)
    session?.live.sendPerms(next).catch(() => undefined)
  }

  const setDefaultRole = (role: 'edit' | 'view') => {
    const next = { defaultRole: role, roles: {} }
    setPerms(next)
    session?.live.sendPerms(next).catch(() => undefined)
  }

  const onPointer = (x: number, y: number) => {
    if (!session) return
    const now = performance.now()
    if (now - lastCursor.current < 50) return
    lastCursor.current = now
    session.live.sendCursor(Math.round(x), Math.round(y), selection).catch(() => undefined)
  }

  const peerViews: PeerView[] = peers
    .filter((p) => p.id !== me.current.id && cursors[p.id])
    .map((p) => ({ id: p.id, name: p.name, color: p.color, x: cursors[p.id].x, y: cursors[p.id].y, selection: cursors[p.id].selection }))

  const openLink = (it: Item) => {
    if (it.kind !== 'link') return
    if (it.target.type === 'note') {
      if (notes.some((n) => n.id === it.target.id)) onOpenNote(it.target.id)
      else notify(t('La nota enlazada ya no existe.'))
    } else if (boards.some((b) => b.id === it.target.id) && !isGuest) setActiveId(it.target.id)
    else notify(t('La pizarra enlazada ya no existe.'))
  }

  const placeLink = (type: 'note' | 'board', id: string, label: string) => {
    if (!board || !linkAt) return
    const base = itemFromStyle('link', style, { x: linkAt.x - 110, y: linkAt.y - 22, w: 220, h: 44 })
    if (base.kind !== 'link') return
    const item = { ...base, target: { type, id }, label }
    commit([...board.items, item])
    setSelection([item.id])
    setLinkAt(null)
    setLinkQuery('')
    setTool('select')
  }

  const selected = board?.items.filter((it) => selection.includes(it.id)) ?? []
  const focusKind = selected[0]?.kind
  const showText = tool === 'text' || focusKind === 'text'
  const showFill = SHAPE_TOOLS.includes(tool) || focusKind === 'shape'
  const showBrush = tool === 'pen' || focusKind === 'stroke'
  const showLine = tool === 'line' || tool === 'arrow' || focusKind === 'line'
  const showWidth = showBrush || showFill || showLine
  const showStyle = editable && (tool !== 'select' && tool !== 'hand' && tool !== 'eraser' ? true : selected.length > 0)
  const shareLink = session ? `${location.origin}/whiteboard#join=${session.code.replace(/-/g, '')}` : ''

  const q = linkQuery.trim().toLowerCase()
  const linkNotes = notes.filter((n) => n.title.toLowerCase().includes(q)).slice(0, 30)
  const linkBoards = boards.filter((b) => b.id !== board?.id && b.name.toLowerCase().includes(q)).slice(0, 30)

  const row = (b: Board, child: boolean) => (
    <li key={b.id} className="group relative">
      {renaming === b.id ? (
        <input
          autoFocus
          defaultValue={b.name}
          aria-label={t('Nombre de la pizarra')}
          onBlur={(e) => rename(b.id, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') setRenaming(null)
          }}
          className={`${s.field} py-1.5 ${child ? 'ml-4 w-[calc(100%-1rem)]' : ''}`}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            if (inGuestSession) return
            setGuest(null)
            setActiveId(b.id)
            setSelection([])
            setListOpen(false)
          }}
          onDoubleClick={() => setRenaming(b.id)}
          aria-current={!isGuest && activeId === b.id ? 'page' : undefined}
          className={`flex w-full items-center gap-2 rounded-lg py-1.5 pr-16 text-left text-sm transition-colors ${child ? 'pl-7' : 'pl-2'} ${
            !isGuest && activeId === b.id ? 'bg-(--sunken) font-medium text-(--minimal-text)' : `${s.muted} hover:bg-(--sunken) hover:text-(--minimal-text)`
          }`}
        >
          <Icon name="board" className={`shrink-0 opacity-70 ${child ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
          <span className="truncate">{b.name}</span>
        </button>
      )}
      {renaming !== b.id && (
        <div className="absolute top-1/2 right-1 flex -translate-y-1/2 gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
          {!child && (
            <button type="button" onClick={() => create(b.id)} aria-label={tp('Nueva subpizarra en {0}', b.name)} title={t('Nueva subpizarra')} className="grid h-6 w-6 place-items-center rounded text-(--minimal-muted) hover:bg-(--surface) hover:text-(--minimal-text)">
              <Icon name="plus" className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" onClick={() => setRenaming(b.id)} aria-label={tp('Renombrar {0}', b.name)} title={t('Renombrar')} className="grid h-6 w-6 place-items-center rounded text-(--minimal-muted) hover:bg-(--surface) hover:text-(--minimal-text)">
            <Icon name="pencil" className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => remove(b.id)} aria-label={tp('Eliminar {0}', b.name)} title={t('Eliminar')} className="grid h-6 w-6 place-items-center rounded text-(--minimal-muted) hover:bg-(--surface) hover:text-red-500">
            <Icon name="trash" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </li>
  )

  const list = (
    <nav aria-label={t('Pizarras')} className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="nv-group-label px-1">{t('Pizarras')}</p>
        <button type="button" onClick={() => create(null)} className={s.ghost} disabled={inGuestSession}>
          {t('Nueva')}
        </button>
      </div>
      {tops.length === 0 ? (
        <p className={`px-1 text-sm ${s.muted}`}>{t('Aún no tienes pizarras.')}</p>
      ) : (
        <ul className="nivra-scroll -mx-1 min-h-0 flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto px-1">
          {tops.flatMap((b) => [row(b, false), ...childrenOf(b.id).map((c) => row(c, true))])}
        </ul>
      )}
    </nav>
  )

  return (
    <div className="flex h-full min-h-0 gap-4">
      <div className="hidden w-52 shrink-0 xl:block">{list}</div>

      <section className="flex min-w-0 flex-1 flex-col gap-3">
        <header className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setListOpen(true)} className={`${s.iconButton} xl:hidden`} aria-label={t('Ver pizarras')}>
            <Icon name="menu" className="h-4 w-4" />
          </button>
          <div className="mr-auto min-w-0">
            {board && board.parent && !isGuest && (
              <button type="button" onClick={() => setActiveId(board.parent)} className={`block truncate text-xs ${s.muted} hover:text-(--minimal-text)`}>
                {boards.find((b) => b.id === board.parent)?.name}
              </button>
            )}
            <h1 className="truncate text-xl font-semibold">{board ? board.name : t('Pizarra')}</h1>
          </div>
          {session && (
            <div className="flex items-center -space-x-1.5" aria-label={tp('{0} personas conectadas', peers.length)}>
              {peers.slice(0, 5).map((p) => (
                <span key={p.id} title={p.name} style={{ background: p.color }} className="grid h-7 w-7 place-items-center rounded-full border-2 border-(--paper) text-[0.7rem] font-semibold text-white">
                  {p.name.slice(0, 1).toUpperCase()}
                </span>
              ))}
            </div>
          )}
          {isGuest && (
            <button type="button" onClick={saveCopy} className={s.ghost}>
              {t('Guardar copia')}
            </button>
          )}
          <button type="button" onClick={() => setShareOpen(true)} className={`${s.ghost} flex items-center gap-1.5`}>
            <Icon name="share" className="h-3.5 w-3.5" />
            {session ? (status === 'live' ? t('En directo') : t('Conectando…')) : t('Compartir')}
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)} disabled={!board || !editable} className={s.iconButton} aria-label={t('Ajustes de la pizarra')} title={t('Ajustes de la pizarra')}>
            <Icon name="settings" className="h-4 w-4" />
          </button>
        </header>

        {!board ? (
          <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-(--minimal-line) p-8 text-center">
            <div className="max-w-sm space-y-3">
              <Icon name="board" className={`mx-auto h-8 w-8 ${s.muted}`} />
              <p className="text-base font-medium">{t('Crea tu primera pizarra')}</p>
              <p className={`text-sm ${s.muted}`}>{t('Dibuja, escribe y añade formas libremente. Puedes enlazarla con tus notas de la Bóveda.')}</p>
              <div className="flex justify-center gap-2">
                <button type="button" onClick={() => create(null)} className={`${s.primary} rounded-lg px-4 py-2 text-sm`}>
                  {t('Nueva pizarra')}
                </button>
                <button type="button" onClick={() => setShareOpen(true)} className={s.ghost}>
                  {t('Unirse con código')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div role="toolbar" aria-label={t('Herramientas')} className="nivra-scroll flex items-center gap-0.5 rounded-xl max-sm:overflow-x-auto sm:flex-wrap border border-(--minimal-line) bg-(--surface) p-1">
              {TOOLS.filter((x) => editable || x.id === 'select' || x.id === 'hand').map((x, i) => (
                <span key={x.id} className="contents">
                  {(i === 2 || i === 4 || i === 5 || i === 11 || i === 13) && <span className="mx-1 h-5 w-px shrink-0 bg-(--minimal-line)" aria-hidden="true" />}
                  <ToolButton active={tool === x.id} label={x.key ? `${t(x.label)} (${x.key})` : t(x.label)} onClick={() => setTool(x.id)}>
                    <Icon name={x.icon} className="h-4 w-4" />
                  </ToolButton>
                </span>
              ))}
              {editable && (
                <>
                  <span className="mx-1 h-5 w-px shrink-0 bg-(--minimal-line)" aria-hidden="true" />
                  <ToolButton label={t('Añadir imagen')} onClick={() => imageInput.current?.click()}>
                    <Icon name="image" className="h-4 w-4" />
                  </ToolButton>
                  <input
                    ref={imageInput}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => {
                      addImages([...(e.target.files ?? [])], null)
                      e.target.value = ''
                    }}
                  />
                  <span className="mx-1 h-5 w-px shrink-0 bg-(--minimal-line)" aria-hidden="true" />
                  <ToolButton label={`${t('Deshacer')} (Ctrl Z)`} onClick={() => step('undo')} disabled={!history.current[board.id]?.past.length}>
                    <Icon name="undo" className="h-4 w-4" />
                  </ToolButton>
                  <ToolButton label={`${t('Rehacer')} (Ctrl ⇧ Z)`} onClick={() => step('redo')} disabled={!history.current[board.id]?.future.length}>
                    <Icon name="redo" className="h-4 w-4" />
                  </ToolButton>
                </>
              )}
              {!editable && <span className={`ml-2 text-xs ${s.muted}`}>{t('Solo lectura')}</span>}
            </div>

            <div className="relative min-h-[24rem] flex-1 overflow-hidden rounded-xl border border-(--minimal-line)">
              <BoardCanvas
                board={board}
                editable={editable}
                dark={dark}
                tool={tool}
                setTool={setTool}
                style={style}
                selection={selection}
                setSelection={setSelection}
                commit={commit}
                live={liveDraft}
                peers={peerViews}
                onPointer={onPointer}
                onOpenLink={openLink}
                onPlaceLink={setLinkAt}
                onFiles={addImages}
                viewCenter={viewCenter}
                focusId={itemFocus}
                onFocused={() => setItemFocus(null)}
                undo={() => step('undo')}
                redo={() => step('redo')}
              />

              {showStyle && (
                <div className="nivra-scroll absolute top-3 right-3 z-10 max-h-[calc(100%-1.5rem)] w-60 space-y-4 overflow-y-auto rounded-xl border border-(--minimal-line) bg-(--surface) p-3 shadow-sm max-sm:top-auto max-sm:right-2 max-sm:bottom-14 max-sm:left-2 max-sm:max-h-[38%] max-sm:w-auto">
                  {focusKind !== 'image' && <Swatches label={showFill ? t('Borde') : t('Color')} value={style.color} onChange={(c) => c && changeStyle({ color: c })} />}
                  {showFill && <Swatches label={t('Relleno')} value={style.fill} allowNone onChange={(c) => changeStyle({ fill: c })} />}
                  {(showBrush || showFill) && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-(--minimal-muted)">{t('Degradado')}</span>
                      <div className="flex items-center gap-2">
                        {style.color2 && (
                          <label className="relative h-6 w-6 overflow-hidden rounded-full border border-(--minimal-line)" style={{ background: style.color2 }}>
                            <span className="sr-only">{t('Segundo color')}</span>
                            <input type="color" value={style.color2} onChange={(e) => changeStyle({ color2: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
                          </label>
                        )}
                        <Toggle on={!!style.color2} label={t('Degradado')} onClick={() => changeStyle({ color2: style.color2 ? null : '#3b82f6' })}>
                          <span className="h-3 w-5 rounded-sm" style={{ background: `linear-gradient(90deg, ${style.color}, ${style.color2 ?? '#3b82f6'})` }} />
                        </Toggle>
                      </div>
                    </div>
                  )}
                  {showBrush && (
                    <label className="block">
                      <span className="mb-1 block text-xs text-(--minimal-muted)">{t('Tipo de pincel')}</span>
                      <select value={style.brush} onChange={(e) => changeStyle({ brush: e.target.value as Brush })} className={`${s.field} py-1.5`}>
                        {BRUSHES.map((b) => (
                          <option key={b.id} value={b.id}>
                            {t(b.label)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {showWidth && <Range label={t('Grosor')} value={style.width} min={1} max={40} step={1} onChange={(n) => changeStyle({ width: n })} suffix=" px" />}
                  <Range label={t('Opacidad')} value={Math.round(style.opacity * 100)} min={5} max={100} step={5} onChange={(n) => changeStyle({ opacity: n / 100 })} suffix="%" />
                  {(showFill || showLine) && (
                    <div className="flex flex-wrap gap-1.5">
                      <Toggle on={style.dashed} label={t('Discontinuo')} onClick={() => changeStyle({ dashed: !style.dashed })}>
                        <span className="h-0 w-5 border-t-2 border-dashed border-current" />
                      </Toggle>
                      {showLine && (
                        <Toggle on={style.arrowStart} label={t('Flecha en ambos extremos')} onClick={() => changeStyle({ arrowStart: !style.arrowStart })}>
                          ↔
                        </Toggle>
                      )}
                    </div>
                  )}
                  {showText && (
                    <>
                      <label className="block">
                        <span className="mb-1 block text-xs text-(--minimal-muted)">{t('Fuente')}</span>
                        <select value={style.font} onChange={(e) => changeStyle({ font: e.target.value })} className={`${s.field} py-1.5`}>
                          {FONTS.map((f) => (
                            <option key={f.id} value={f.id}>
                              {t(f.label)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Range label={t('Tamaño')} value={style.size} min={10} max={120} step={2} onChange={(n) => changeStyle({ size: n })} suffix=" px" />
                      <div className="flex flex-wrap gap-1.5">
                        <Toggle on={style.bold} label={t('Negrita')} onClick={() => changeStyle({ bold: !style.bold })}>
                          <b>B</b>
                        </Toggle>
                        <Toggle on={style.italic} label={t('Cursiva')} onClick={() => changeStyle({ italic: !style.italic })}>
                          <i className="font-serif">I</i>
                        </Toggle>
                        <Toggle on={style.underline} label={t('Subrayado')} onClick={() => changeStyle({ underline: !style.underline })}>
                          <u>U</u>
                        </Toggle>
                        {(['left', 'center', 'right'] as const).map((a) => (
                          <Toggle key={a} on={style.align === a} label={t(a === 'left' ? 'Alinear a la izquierda' : a === 'center' ? 'Centrar' : 'Alinear a la derecha')} onClick={() => changeStyle({ align: a })}>
                            <span className={`flex w-4 flex-col gap-0.5 ${a === 'left' ? 'items-start' : a === 'center' ? 'items-center' : 'items-end'}`}>
                              <span className="h-px w-4 bg-current" />
                              <span className="h-px w-2.5 bg-current" />
                              <span className="h-px w-3.5 bg-current" />
                            </span>
                          </Toggle>
                        ))}
                      </div>
                    </>
                  )}
                  {selected.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 border-t border-(--minimal-line) pt-3">
                      {selected.length === 1 && selected[0].kind === 'link' && (
                        <button type="button" className={`${s.primary} w-full rounded-lg px-3 py-1.5 text-xs`} onClick={() => openLink(selected[0])}>
                          {t('Abrir enlace')}
                        </button>
                      )}
                      <button type="button" className={s.ghost} onClick={() => commit([...board.items.filter((it) => !selection.includes(it.id)), ...selected])}>
                        {t('Traer al frente')}
                      </button>
                      <button type="button" className={s.ghost} onClick={() => commit([...selected, ...board.items.filter((it) => !selection.includes(it.id))])}>
                        {t('Enviar al fondo')}
                      </button>
                      <button
                        type="button"
                        className={`${s.ghost} text-red-600 dark:text-red-400`}
                        onClick={() => {
                          commit(board.items.filter((it) => !selection.includes(it.id)))
                          setSelection([])
                        }}
                      >
                        {t('Eliminar')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {listOpen && (
        <Modal title={t('Pizarras')} onClose={() => setListOpen(false)}>
          <div className="h-[60vh]">{list}</div>
        </Modal>
      )}

      {settingsOpen && board && (
        <Modal title={t('Ajustes de la pizarra')} onClose={() => setSettingsOpen(false)}>
          <div className="space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">{t('Nombre')}</span>
              <input defaultValue={board.name} onBlur={(e) => rename(board.id, e.target.value)} className={s.field} />
            </label>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t('Fondo')}</legend>
              <div className="flex flex-wrap gap-2 p-1">
                {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg ?? 'theme'}
                    type="button"
                    onClick={() => updateSettings({ background: bg })}
                    aria-pressed={board.settings.background === bg}
                    aria-label={bg ?? t('Según el tema')}
                    title={bg ?? t('Según el tema')}
                    style={{ background: bg ?? 'var(--paper)' }}
                    className={`grid h-9 w-9 place-items-center rounded-lg border border-(--minimal-line) text-[0.6rem] ${board.settings.background === bg ? 'ring-2 ring-(--minimal-accent) ring-offset-2 ring-offset-(--surface)' : ''}`}
                  >
                    {bg === null && 'A'}
                  </button>
                ))}
                <label className="relative grid h-9 w-9 cursor-pointer place-items-center overflow-hidden rounded-lg border border-(--minimal-line)" style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}>
                  <span className="sr-only">{t('Color personalizado')}</span>
                  <input type="color" value={board.settings.background ?? '#ffffff'} onChange={(e) => updateSettings({ background: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
                </label>
              </div>
            </fieldset>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{t('Mostrar cuadrícula')}</span>
              <input type="checkbox" checked={board.settings.grid} onChange={(e) => updateSettings({ grid: e.target.checked })} className="h-4 w-4 accent-(--minimal-accent)" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">{t('Fuente principal')}</span>
              <select
                value={board.settings.font}
                onChange={(e) => {
                  updateSettings({ font: e.target.value })
                  setStyle((st) => ({ ...st, font: e.target.value }))
                }}
                className={s.field}
              >
                {FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {t(f.label)}
                  </option>
                ))}
              </select>
            </label>
            <p className={`text-xs ${s.muted}`}>{tp('{0} elementos', board.items.length)}</p>
          </div>
        </Modal>
      )}

      {shareOpen && (
        <Modal title={t('Compartir pizarra')} onClose={() => setShareOpen(false)}>
          <div className="space-y-5">
            {session ? (
              <>
                <div>
                  <p className="mb-1.5 text-sm font-medium">{t('Código de la sesión')}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-(--sunken) px-3 py-2 font-mono text-base tracking-wider">{session.code}</code>
                    <button
                      type="button"
                      className={s.iconButton}
                      aria-label={t('Copiar enlace')}
                      title={t('Copiar enlace')}
                      onClick={() => navigator.clipboard.writeText(shareLink).then(() => notify(t('Enlace copiado.')))}
                    >
                      <Icon name="copy" className="h-4 w-4" />
                    </button>
                  </div>
                  <p className={`mt-1.5 text-xs ${s.muted}`}>{t('Quien tenga el código o el enlace puede entrar mientras la sesión esté abierta. Todo viaja cifrado.')}</p>
                </div>
                {session.role === 'host' && (
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium">{t('Permiso para quien entre')}</legend>
                    <div className="flex gap-2">
                      {(['edit', 'view'] as const).map((r) => (
                        <Toggle key={r} on={perms.defaultRole === r} label={r === 'edit' ? t('Puede editar') : t('Solo ver')} onClick={() => setDefaultRole(r)}>
                          {r === 'edit' ? t('Puede editar') : t('Solo ver')}
                        </Toggle>
                      ))}
                    </div>
                  </fieldset>
                )}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                    <Icon name="users" className="h-4 w-4" />
                    {tp('Conectados ({0})', peers.length)}
                  </p>
                  <ul className="space-y-1.5">
                    {peers.map((p) => {
                      const role = p.role === 'host' ? 'host' : (perms.roles[p.id] ?? perms.defaultRole)
                      return (
                        <li key={p.id} className="flex items-center gap-2 text-sm">
                          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.color }} />
                          <span className="min-w-0 flex-1 truncate">
                            {p.name}
                            {p.id === me.current.id && <span className={s.muted}> · {t('tú')}</span>}
                          </span>
                          {role === 'host' ? (
                            <span className={`text-xs ${s.muted}`}>{t('Anfitrión')}</span>
                          ) : session.role === 'host' ? (
                            <select value={role} onChange={(e) => setRole(p.id, e.target.value as 'edit' | 'view')} className={`${s.field} w-auto py-1 text-xs`} aria-label={tp('Permiso de {0}', p.name)}>
                              <option value="edit">{t('Puede editar')}</option>
                              <option value="view">{t('Solo ver')}</option>
                            </select>
                          ) : (
                            <span className={`text-xs ${s.muted}`}>{role === 'edit' ? t('Puede editar') : t('Solo ver')}</span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
                <button type="button" onClick={endSession} className={`${s.ghost} text-red-600 dark:text-red-400`}>
                  {session.role === 'host' ? t('Terminar sesión') : t('Salir de la sesión')}
                </button>
              </>
            ) : (
              <>
                {board && !isGuest && (
                  <div>
                    <p className="mb-1.5 text-sm font-medium">{tp('Compartir «{0}» en directo', board.name)}</p>
                    <p className={`mb-3 text-sm ${s.muted}`}>{t('Se crea un código. Quien lo use verá tus cambios al instante, tu cursor y tu selección.')}</p>
                    <button type="button" onClick={startSharing} disabled={status === 'connecting'} className={`${s.primary} rounded-lg px-4 py-2 text-sm disabled:opacity-50`}>
                      {status === 'connecting' ? t('Conectando…') : t('Empezar a compartir')}
                    </button>
                  </div>
                )}
                <form
                  className="border-t border-(--minimal-line) pt-5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    join(joinInput)
                  }}
                >
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">{t('Unirse con código')}</span>
                    <div className="flex gap-2">
                      <input
                        value={joinInput}
                        onChange={(e) => setJoinInput(formatCode(e.target.value))}
                        placeholder="XXXX-XXXX-XXXX"
                        autoComplete="off"
                        spellCheck={false}
                        className={`${s.field} font-mono tracking-wider uppercase`}
                      />
                      <button type="submit" disabled={!validCode(joinInput)} className={`${s.primary} shrink-0 rounded-lg px-4 py-2 text-sm disabled:opacity-50`}>
                        {t('Entrar')}
                      </button>
                    </div>
                  </label>
                </form>
                {status === 'error' && <p className="text-sm text-red-600 dark:text-red-400">{t('No se pudo conectar. Inténtalo de nuevo.')}</p>}
              </>
            )}
          </div>
        </Modal>
      )}

      {linkAt && (
        <Modal
          title={t('Añadir enlace')}
          onClose={() => {
            setLinkAt(null)
            setLinkQuery('')
          }}
        >
          <input autoFocus value={linkQuery} onChange={(e) => setLinkQuery(e.target.value)} placeholder={t('Buscar notas y pizarras')} aria-label={t('Buscar notas y pizarras')} className={`${s.field} mb-4`} />
          <div className="space-y-4">
            <div>
              <p className="nv-group-label mb-1.5">{t('Notas de la Bóveda')}</p>
              {linkNotes.length === 0 ? (
                <p className={`text-sm ${s.muted}`}>{t('Sin resultados')}</p>
              ) : (
                <ul className="space-y-0.5">
                  {linkNotes.map((n) => (
                    <li key={n.id}>
                      <button type="button" onClick={() => placeLink('note', n.id, n.title)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-(--sunken)">
                        <Icon name="graph" className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{n.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {!isGuest && (
              <div>
                <p className="nv-group-label mb-1.5">{t('Pizarras')}</p>
                {linkBoards.length === 0 ? (
                  <p className={`text-sm ${s.muted}`}>{t('Sin resultados')}</p>
                ) : (
                  <ul className="space-y-0.5">
                    {linkBoards.map((b) => (
                      <li key={b.id}>
                        <button type="button" onClick={() => placeLink('board', b.id, b.name)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-(--sunken)">
                          <Icon name="board" className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          <span className="truncate">{b.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
