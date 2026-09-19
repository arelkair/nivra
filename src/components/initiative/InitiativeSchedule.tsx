import { useEffect, useRef, useState } from 'react'
import { DAYS, DEFAULT_PROFILE, blockProfile, useStored, weekIndex, type Block, type Profile, type Subject } from '../../lib/store'
import { notifyWithUndo } from '../../lib/undo'
import { t, tp } from '../../lib/i18n'
import { playDrop, playPop } from '../../lib/sound'
import { Icon } from '../ui'
import { ScheduleTransfer } from './ScheduleTransfer'
import { ScheduleEditor, type Draft } from './ScheduleEditor'
import { DAY_END, MIN_BLOCK, formatSpan, fromMin, layoutDay, overlaps, snap, toMin } from './scheduleLayout'
import { skin } from './skin'

type Props = {
  blocks: Block[]
  setBlocks: (update: (prev: Block[]) => Block[]) => void
  profiles: Profile[]
  setProfiles: (update: (prev: Profile[]) => Profile[]) => void
  active: string
  setActive: (id: string) => void
  subjects: Subject[]
  dark: boolean
}

type Interaction =
  | { kind: 'create'; day: number; anchor: number; current: number }
  | { kind: 'move'; id: string; day: number; start: number; duration: number; grab: number; x: number; y: number; moved: boolean }
  | { kind: 'resize'; id: string; edge: 'top' | 'bottom'; day: number; start: number; end: number; moved: boolean }

const PX = 60
const BREAK = /^(recreo|descanso|pausa|break|comida|almuerzo)(\s|$)/i
const BASE_START = 8 * 60
const BASE_END = 15 * 60

function useWide() {
  const query = '(min-width: 768px)'
  const [wide, setWide] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const listener = () => setWide(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])
  return wide
}

export function InitiativeSchedule({
  blocks,
  setBlocks,
  profiles,
  setProfiles,
  active,
  setActive,
  subjects,
  dark,
}: Props) {
  const s = skin(dark)
  const wide = useWide()
  const now = new Date()
  const todayIndex = weekIndex(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [daySel, setDaySel] = useState(todayIndex)
  const [showWeekend, setShowWeekend] = useStored('nivra-initiative-schedule-weekend', false)
  const [fullDay, setFullDay] = useStored('nivra-initiative-schedule-24h', false)
  const [ix, setIx] = useState<Interaction | null>(null)
  const [profileEdit, setProfileEdit] = useState<{ id: string | null; name: string } | null>(null)
  const [copyFrom, setCopyFrom] = useState(todayIndex)
  const [copyTo, setCopyTo] = useState((todayIndex + 1) % 7)

  const ixRef = useRef<Interaction | null>(null)
  const colRefs = useRef<(HTMLDivElement | null)[]>([])
  const pointerType = useRef('mouse')
  const handlers = useRef({
    move: (_e: PointerEvent) => {},
    up: () => {},
    key: (_e: KeyboardEvent) => {},
  })
  const ctx = useRef({
    from: 8 * 60 + 45,
    days: [0, 1, 2, 3, 4],
    commit: (_: Interaction) => {},
  })

  const visible = blocks.filter((b) => blockProfile(b) === active)
  const weekendUsed = visible.some((b) => b.day >= 5)
  const days = wide ? (showWeekend || weekendUsed ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4]) : [daySel]

  const starts = visible.map((b) => toMin(b.start))
  const ends = visible.map((b) => toMin(b.end))
  const rangeStart = fullDay ? 0 : Math.min(BASE_START, ...starts)
  const rangeEnd = fullDay ? 24 * 60 : Math.max(BASE_END, ...ends)
  const height = ((rangeEnd - rangeStart) / 60) * PX

  const dayNames = DAYS.map((d) => t(d))
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - todayIndex)

  const setIxBoth = (next: Interaction | null) => {
    ixRef.current = next
    setIx(next)
  }

  const minutesAt = (clientY: number) => {
    const el = colRefs.current.find((c) => c)
    if (!el) return ctx.current.from
    const rect = el.getBoundingClientRect()
    const value = ctx.current.from + ((clientY - rect.top) / PX) * 60
    return Math.max(ctx.current.from, Math.min(rangeEnd, value))
  }

  const dayAt = (clientX: number, fallback: number) => {
    const cols = colRefs.current
    for (let i = 0; i < ctx.current.days.length; i++) {
      const el = cols[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (clientX >= rect.left && clientX < rect.right) return ctx.current.days[i]
    }
    const first = cols[0]?.getBoundingClientRect()
    const lastIndex = ctx.current.days.length - 1
    const last = cols[lastIndex]?.getBoundingClientRect()
    if (first && clientX < first.left) return ctx.current.days[0]
    if (last && clientX >= last.right) return ctx.current.days[lastIndex]
    return fallback
  }

  const openEditor = (b: Block) =>
    setDraft({
      id: b.id,
      day: b.day,
      start: b.start,
      end: b.end,
      title: b.title,
      color: b.color,
      textColor: b.textColor,
      textBg: b.textBg,
      alsoDays: [],
    })

  const openNew = (day: number, startMin: number, endMin: number) =>
    setDraft({
      id: null,
      day,
      start: fromMin(startMin),
      end: fromMin(Math.min(DAY_END, endMin)),
      title: '',
      alsoDays: [],
    })

  const commit = (interaction: Interaction) => {
    if (interaction.kind === 'create') {
      const a = snap(Math.min(interaction.anchor, interaction.current), 'floor')
      const b = snap(Math.max(interaction.anchor, interaction.current))
      const end = b - a >= MIN_BLOCK ? b : a + 60
      openNew(interaction.day, a, end)
      return
    }
    const block = blocks.find((b) => b.id === interaction.id)
    if (!block) return
    if (!interaction.moved) {
      openEditor(block)
      return
    }
    const before = blocks
    if (interaction.kind === 'move') {
      const start = interaction.start
      const end = Math.min(DAY_END, start + interaction.duration)
      setBlocks((prev) =>
        prev.map((b) => (b.id === block.id ? { ...b, day: interaction.day, start: fromMin(start), end: fromMin(end) } : b)),
      )
    } else {
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === block.id ? { ...b, start: fromMin(interaction.start), end: fromMin(Math.min(DAY_END, interaction.end)) } : b,
        ),
      )
    }
    playDrop()
    notifyWithUndo(tp('«{0}» modificado', block.title), () => setBlocks(() => before))
  }

  ctx.current = { from: rangeStart, days, commit }

  const onMove = (e: PointerEvent) => {
    const cur = ixRef.current
    if (!cur) return
    const minute = minutesAt(e.clientY)
    if (cur.kind === 'create') {
      setIxBoth({ ...cur, current: minute })
    } else if (cur.kind === 'move') {
      const moved = cur.moved || Math.hypot(e.clientX - cur.x, e.clientY - cur.y) > 4
      const start = Math.max(0, Math.min(DAY_END - cur.duration, snap(minute - cur.grab)))
      setIxBoth({ ...cur, moved, start, day: dayAt(e.clientX, cur.day) })
    } else if (cur.edge === 'bottom') {
      const end = Math.max(cur.start + MIN_BLOCK, Math.min(DAY_END, snap(minute)))
      setIxBoth({ ...cur, moved: true, end })
    } else {
      const start = Math.min(cur.end - MIN_BLOCK, Math.max(0, snap(minute)))
      setIxBoth({ ...cur, moved: true, start })
    }
  }

  const onUp = () => {
    const cur = ixRef.current
    setIxBoth(null)
    if (cur) ctx.current.commit(cur)
  }

  const remove = (id: string) => {
    const b = blocks.find((x) => x.id === id)
    if (!b) return
    playDrop()
    const before = blocks
    setBlocks((prev) => prev.filter((x) => x.id !== id))
    setDraft(null)
    notifyWithUndo(tp('«{0}» eliminado', b.title), () => setBlocks(() => before))
  }

  const onKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName
    if (e.key === 'Escape') setDraft(null)
    if (e.key === 'Delete' && draft?.id && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') remove(draft.id)
  }

  handlers.current = { move: onMove, up: onUp, key: onKey }
  const dragging = ix !== null

  useEffect(() => {
    if (!dragging) return
    const move = (e: PointerEvent) => handlers.current.move(e)
    const up = () => handlers.current.up()
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [dragging])

  useEffect(() => {
    const key = (e: KeyboardEvent) => handlers.current.key(e)
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  const save = () => {
    if (!draft) return
    const title = draft.title.trim()
    if (!title || !draft.start || !draft.end) return
    const [start, end] = draft.start <= draft.end ? [draft.start, draft.end] : [draft.end, draft.start]
    const values = { title, start, end, color: draft.color, textColor: draft.textColor, textBg: draft.textBg }
    const copies = draft.alsoDays.filter((d) => d !== draft.day)
    playPop()
    setBlocks((prev) => {
      const base = draft.id
        ? prev.map((x) => (x.id === draft.id ? { ...x, ...values, day: draft.day } : x))
        : [...prev, { id: crypto.randomUUID(), profile: active, day: draft.day, ...values }]
      return [...base, ...copies.map((day) => ({ id: crypto.randomUUID(), profile: active, day, ...values }))]
    })
    setDraft(null)
  }

  const duplicateDraft = () => {
    if (!draft?.id) return
    const b = blocks.find((x) => x.id === draft.id)
    if (!b) return
    playPop()
    setBlocks((prev) => [...prev, { ...b, id: crypto.randomUUID() }])
    setDraft(null)
  }

  const copyDay = () => {
    if (copyFrom === copyTo) return
    const source = visible.filter((b) => b.day === copyFrom)
    if (source.length === 0) return
    const before = blocks
    const existing = visible.filter((b) => b.day === copyTo)
    const fresh = source
      .filter((b) => !existing.some((e) => e.title === b.title && e.start === b.start && e.end === b.end))
      .map((b) => ({ ...b, id: crypto.randomUUID(), day: copyTo }))
    if (fresh.length === 0) return
    playPop()
    setBlocks((prev) => [...prev, ...fresh])
    notifyWithUndo(tp('{0} bloques copiados', fresh.length), () => setBlocks(() => before))
  }

  const removeProfile = (id: string) => {
    const beforeBlocks = blocks
    const beforeProfiles = profiles
    const name = profiles.find((p) => p.id === id)?.name ?? ''
    const rest = profiles.filter((p) => p.id !== id)
    setBlocks((prev) => prev.filter((b) => blockProfile(b) !== id))
    setProfiles(() => rest)
    setActive(rest[0]?.id ?? DEFAULT_PROFILE)
    setProfileEdit(null)
    notifyWithUndo(tp('«{0}» eliminado', name), () => {
      setBlocks(() => beforeBlocks)
      setProfiles(() => beforeProfiles)
      setActive(id)
    })
  }

  const preview = (b: Block) => {
    if (ix && (ix.kind === 'move' || ix.kind === 'resize') && ix.id === b.id && ix.moved) {
      return ix.kind === 'move'
        ? { day: ix.day, start: ix.start, end: Math.min(DAY_END, ix.start + ix.duration) }
        : { day: b.day, start: ix.start, end: ix.end }
    }
    return { day: b.day, start: toMin(b.start), end: toMin(b.end) }
  }

  const shown = visible.map((b) => ({ block: b, ...preview(b) }))

  const draftConflicts = draft
    ? visible
        .filter(
          (b) =>
            b.id !== draft.id &&
            b.day === draft.day &&
            draft.start &&
            draft.end &&
            overlaps(
              { start: Math.min(toMin(draft.start), toMin(draft.end)), end: Math.max(toMin(draft.start), toMin(draft.end)) },
              { start: toMin(b.start), end: toMin(b.end) },
            ),
        )
        .map((b) => b.title)
    : []

  const todayBlocks = visible
    .filter((b) => b.day === todayIndex)
    .sort((a, b) => a.start.localeCompare(b.start))
  const current = todayBlocks.find((b) => toMin(b.start) <= nowMin && nowMin < toMin(b.end))
  const next = todayBlocks.find((b) => toMin(b.start) > nowMin)

  const perTitle = new Map<string, { minutes: number; color?: string }>()
  const perDay = Array.from({ length: 7 }, () => 0)
  for (const b of visible) {
    const minutes = Math.max(0, toMin(b.end) - toMin(b.start))
    perDay[b.day] += minutes
    const entry = perTitle.get(b.title) ?? { minutes: 0, color: b.color }
    entry.minutes += minutes
    perTitle.set(b.title, entry)
  }
  const totalMinutes = perDay.reduce((a, b) => a + b, 0)
  const topTitles = [...perTitle.entries()].sort((a, b) => b[1].minutes - a[1].minutes).slice(0, 6)
  const maxDay = Math.max(1, ...perDay)

  const hourMarks: number[] = []
  for (let h = Math.ceil(rangeStart / 60); h * 60 < rangeEnd; h++) if (h * 60 > rangeStart) hourMarks.push(h)
  const firstMark = (hourMarks[0] ?? Math.ceil(rangeStart / 60)) * 60
  const lastMark = (hourMarks[hourMarks.length - 1] ?? Math.floor(rangeEnd / 60)) * 60
  const hourOffset = (((60 - (rangeStart % 60)) % 60) / 60) * PX
  const halfOffset = (((30 - (rangeStart % 30)) % 30) / 60) * PX

  const lineBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(30,30,20,0.10)'
  const halfBg = dark ? 'rgba(255,255,255,0.035)' : 'rgba(30,30,20,0.045)'
  const gridStyle = { gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))` }
  const label = `font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`

  const startCreate = (e: React.PointerEvent, day: number) => {
    pointerType.current = e.pointerType
    if (e.pointerType === 'touch' || e.button !== 0) return
    e.preventDefault()
    const m = minutesAt(e.clientY)
    setIxBoth({ kind: 'create', day, anchor: m, current: m })
  }

  const tapCreate = (e: React.MouseEvent, day: number) => {
    if (pointerType.current !== 'touch') return
    const m = snap(minutesAt(e.clientY), 'floor')
    openNew(day, m, m + 60)
  }

  const startMove = (e: React.PointerEvent, b: Block) => {
    pointerType.current = e.pointerType
    if (e.pointerType === 'touch' || e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const m = minutesAt(e.clientY)
    const start = toMin(b.start)
    setIxBoth({
      kind: 'move',
      id: b.id,
      day: b.day,
      start,
      duration: Math.max(MIN_BLOCK, toMin(b.end) - start),
      grab: m - start,
      x: e.clientX,
      y: e.clientY,
      moved: false,
    })
  }

  const startResize = (e: React.PointerEvent, b: Block, edge: 'top' | 'bottom') => {
    pointerType.current = e.pointerType
    if (e.pointerType === 'touch' || e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    setIxBoth({ kind: 'resize', id: b.id, edge, day: b.day, start: toMin(b.start), end: toMin(b.end), moved: false })
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-initiative text-3xl font-medium tracking-tight sm:text-4xl">{t('Horario')}</h1>
        <button
          type="button"
          onClick={() => {
            const start = snap(Math.max(rangeStart, Math.min(nowMin, rangeEnd - 60)), 'floor')
            openNew(wide ? todayIndex : daySel, start, start + 60)
          }}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${s.primary}`}
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          {t('Nuevo bloque')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => (p.id === active ? setProfileEdit({ id: p.id, name: p.name }) : setActive(p.id))}
            title={p.id === active ? t('Renombrar o eliminar') : t('Cambiar a este horario')}
            className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
              p.id === active ? `${s.active} border-transparent font-medium` : `${s.line} ${s.muted} ${s.hover} ${s.hoverText}`
            }`}
          >
            {p.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setProfileEdit({ id: null, name: '' })}
          aria-label={t('Nuevo horario')}
          className={`grid h-7 w-7 place-items-center rounded-lg border border-dashed ${s.line} ${s.muted} ${s.hoverText}`}
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
        </button>
      </div>

      {profileEdit && (
        <form
          onSubmit={(ev) => {
            ev.preventDefault()
            const name = profileEdit.name.trim()
            if (!name) return
            if (profileEdit.id) {
              setProfiles((prev) => prev.map((p) => (p.id === profileEdit.id ? { ...p, name } : p)))
            } else {
              const id = crypto.randomUUID()
              setProfiles((prev) => [...prev, { id, name }])
              setActive(id)
            }
            setProfileEdit(null)
          }}
          className={`flex flex-wrap items-center gap-2 rounded-2xl border p-3 ${s.line} ${s.panel}`}
        >
          <input
            value={profileEdit.name}
            onChange={(e) => setProfileEdit({ ...profileEdit, name: e.target.value })}
            maxLength={30}
            autoFocus
            required
            placeholder={t('Nombre del horario')}
            aria-label={t('Nombre del horario')}
            className={`${s.field} min-w-0 flex-1`}
          />
          <button type="submit" className={`rounded-lg px-4 py-2 text-sm font-medium ${s.primary}`}>
            {t('Guardar')}
          </button>
          <button type="button" onClick={() => setProfileEdit(null)} className={s.ghost}>
            {t('Cancelar')}
          </button>
          {profileEdit.id && profiles.length > 1 && (
            <button
              type="button"
              onClick={() => removeProfile(profileEdit.id!)}
              className={`flex items-center gap-1.5 text-xs ${s.muted} transition-colors hover:text-red-500`}
            >
              <Icon name="trash" className="h-3.5 w-3.5" />
              {t('Eliminar')}
            </button>
          )}
          {profileEdit.id && profiles.length > 1 && (
            <p className={`w-full text-[0.7rem] ${s.faint}`}>{t('Al eliminarlo se borran también sus bloques.')}</p>
          )}
        </form>
      )}

      {!wide && (
        <div className="flex gap-1">
          {dayNames.map((name, i) => (
            <button
              key={name}
              type="button"
              onClick={() => setDaySel(i)}
              aria-pressed={daySel === i}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg border py-2 text-xs transition-colors ${
                daySel === i ? `${s.active} border-transparent` : `${s.line} ${s.muted}`
              }`}
            >
              <span className="font-mono">{name.slice(0, 1)}</span>
              {i === todayIndex && <span className="h-1 w-1 rounded-full bg-emerald-500" />}
            </button>
          ))}
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className={`overflow-hidden rounded-2xl border select-none ${s.line} ${dark ? 'bg-white/[0.02]' : 'bg-white shadow-[0_1px_3px_rgba(20,20,10,0.06)]'}`}>
          <div className={`grid border-b ${s.line} ${dark ? 'bg-white/[0.03]' : 'bg-[#faf9f6]'}`} style={gridStyle}>
            <span />
            {days.map((d) => {
              const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + d)
              const isToday = d === todayIndex
              return (
                <div key={d} className={`flex flex-col items-center gap-0.5 border-l py-2 ${s.line}`}>
                  <span className={`font-mono text-[0.65rem] tracking-widest uppercase ${isToday ? s.strong : s.faint}`}>
                    {dayNames[d].slice(0, 3)}
                  </span>
                  <span
                    className={`grid h-6 min-w-6 place-items-center rounded-full font-mono text-xs tabular-nums ${
                      isToday ? (dark ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white') : s.muted
                    }`}
                  >
                    {date.getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="grid" style={gridStyle}>
            <div className="relative" style={{ height }}>
              {hourMarks.map((h) => (
                <span
                  key={h}
                  className={`absolute right-1.5 -translate-y-1/2 font-mono text-[0.6rem] tabular-nums ${s.faint}`}
                  style={{ top: ((h * 60 - rangeStart) / 60) * PX }}
                >
                  {String(h).padStart(2, '0')}:00
                </span>
              ))}
              {rangeStart % 60 !== 0 && firstMark - rangeStart >= 20 && (
                <span className={`absolute top-0 right-1.5 font-mono text-[0.6rem] tabular-nums ${s.faint}`}>{fromMin(rangeStart)}</span>
              )}
              {rangeEnd % 60 !== 0 && rangeEnd - lastMark >= 20 && (
                <span className={`absolute right-1.5 bottom-0 font-mono text-[0.6rem] tabular-nums ${s.faint}`}>{fromMin(rangeEnd)}</span>
              )}
            </div>

            {days.map((d, colIndex) => {
              const columnBlocks = shown.filter((x) => x.day === d)
              const lanes = layoutDay(columnBlocks.map((x) => ({ id: x.block.id, start: x.start, end: x.end })))
              const isToday = d === todayIndex
              const ghost = ix?.kind === 'create' && ix.day === d ? ix : null
              const ghostStart = ghost ? snap(Math.min(ghost.anchor, ghost.current), 'floor') : 0
              const ghostEnd = ghost ? Math.max(snap(Math.max(ghost.anchor, ghost.current)), ghostStart + MIN_BLOCK) : 0
              return (
                <div
                  key={d}
                  ref={(el) => {
                    colRefs.current[colIndex] = el
                  }}
                  onPointerDown={(e) => startCreate(e, d)}
                  onClick={(e) => tapCreate(e, d)}
                  data-day={d}
                  className={`relative cursor-crosshair border-l ${s.line} ${isToday ? (dark ? 'bg-white/[0.03]' : 'bg-amber-50/60') : ''}`}
                  style={{
                    height,
                    backgroundImage: `linear-gradient(to bottom, ${lineBg} 1px, transparent 1px), linear-gradient(to bottom, ${halfBg} 1px, transparent 1px)`,
                    backgroundSize: `100% ${PX}px, 100% ${PX / 2}px`,
                    backgroundPosition: `0 ${hourOffset}px, 0 ${halfOffset}px`,
                  }}
                >
                  {isToday && nowMin >= rangeStart && nowMin <= rangeEnd && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute right-0 left-0 z-20 h-px bg-red-500"
                      style={{ top: ((nowMin - rangeStart) / 60) * PX }}
                    >
                      <span className="absolute -top-[3px] -left-1 h-[7px] w-[7px] rounded-full bg-red-500" />
                    </div>
                  )}

                  {ghost && (
                    <div
                      className={`pointer-events-none absolute right-0.5 left-0.5 z-10 rounded-lg border-2 border-dashed ${
                        dark ? 'border-white/50 bg-white/10' : 'border-black/40 bg-black/[0.06]'
                      }`}
                      style={{
                        top: ((ghostStart - rangeStart) / 60) * PX,
                        height: ((ghostEnd - ghostStart) / 60) * PX,
                      }}
                    >
                      <span className={`p-1 font-mono text-[0.65rem] ${s.muted}`}>
                        {fromMin(ghostStart)}–{fromMin(ghostEnd)}
                      </span>
                    </div>
                  )}

                  {columnBlocks.map(({ block: b, start, end }) => {
                    const lane = lanes.get(b.id) ?? { lane: 0, lanes: 1 }
                    const h = Math.max(((end - start) / 60) * PX, 18)
                    const isCurrent = isToday && start <= nowMin && nowMin < end
                    const moving = ix && (ix.kind === 'move' || ix.kind === 'resize') && ix.id === b.id && ix.moved
                    const isBreak = BREAK.test(b.title.trim())
                    const compact = h < 40
                    const showTime = h >= 52 && !isBreak
                    const titleLines = Math.max(1, Math.floor((h - 14 - (showTime ? 16 : 0)) / 17))
                    const accent = b.color ?? (dark ? '#737373' : '#a3a3a3')
                    const wash = dark ? '#17171b' : '#ffffff'
                    const fill = `color-mix(in oklab, ${accent} ${isBreak ? 10 : dark ? 22 : 16}%, ${wash})`
                    const full = isBreak
                    return (
                      <div
                        key={b.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${b.title} ${fromMin(start)}-${fromMin(end)}`}
                        onPointerDown={(e) => startMove(e, b)}
                        onClick={() => pointerType.current === 'touch' && openEditor(b)}
                        onKeyDown={(e) => e.key === 'Enter' && openEditor(b)}
                        style={{
                          top: ((start - rangeStart) / 60) * PX,
                          height: full ? Math.max(h, 18) : h - 2,
                          left: full ? 0 : `calc(${(lane.lane / lane.lanes) * 100}% + 3px)`,
                          width: full ? '100%' : `calc(${100 / lane.lanes}% - 6px)`,
                          background: fill,
                          borderLeftColor: full ? undefined : accent,
                          marginTop: full ? 0 : 1,
                        }}
                        className={`group absolute z-10 flex cursor-grab flex-col justify-center overflow-hidden text-left transition-[box-shadow,filter] active:cursor-grabbing hover:brightness-110 ${
                          full
                            ? `border-y ${dark ? 'border-white/[0.07]' : 'border-black/[0.07]'} px-2`
                            : `rounded-md border border-l-[3px] ${dark ? 'border-white/[0.07]' : 'border-black/[0.08]'} ${compact ? 'px-2 py-0' : 'px-2 py-1.5'} ${
                                dark ? 'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]' : 'shadow-[0_1px_1px_rgba(20,20,10,0.05)]'
                              }`
                        } ${isCurrent ? 'ring-2 ring-emerald-500/70' : ''} ${moving ? 'z-30 opacity-90 shadow-xl' : ''} ${
                          draft?.id === b.id ? (dark ? 'outline-2 outline-white' : 'outline-2 outline-neutral-900') : ''
                        } ${lane.lanes > 1 && !full ? 'outline-1 outline-red-500/40' : ''}`}
                      >
                        <span
                          onPointerDown={(e) => startResize(e, b, 'top')}
                          className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize"
                        />
                        <span
                          style={{
                            color: b.textColor ?? undefined,
                            background: b.textBg ?? undefined,
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: full || compact ? 1 : titleLines,
                            overflow: 'hidden',
                          }}
                          className={`leading-tight font-semibold break-words ${
                            full ? `text-center text-[0.65rem] tracking-[0.16em] uppercase ${dark ? 'text-neutral-400' : 'text-neutral-500'}` : compact ? 'text-xs' : 'text-sm'
                          } ${b.textBg ? 'rounded px-1' : ''} ${!b.textColor && !full ? (dark ? 'text-neutral-50' : 'text-neutral-900') : ''}`}
                        >
                          {b.title}
                        </span>
                        {showTime && (
                          <span className={`block truncate font-mono text-[0.65rem] tabular-nums ${dark ? 'text-neutral-50/60' : 'text-neutral-900/60'}`}>
                            {fromMin(start)}–{fromMin(end)}
                            {h >= 72 && ` · ${formatSpan(end - start)}`}
                          </span>
                        )}
                        <span
                          onPointerDown={(e) => startResize(e, b, 'bottom')}
                          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {draft ? (
            <ScheduleEditor
              draft={draft}
              setDraft={setDraft}
              subjects={subjects}
              dark={dark}
              conflicts={draftConflicts}
              onSave={save}
              onDelete={draft.id ? () => remove(draft.id!) : undefined}
              onDuplicate={draft.id ? duplicateDraft : undefined}
            />
          ) : (
            <>
              <section className={`rounded-2xl border p-4 ${s.line} ${s.panel}`}>
                <p className={`mb-3 ${label}`}>{t('Ahora')}</p>
                {current ? (
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium">{current.title}</p>
                    <p className={`font-mono text-xs ${s.muted}`}>
                      {current.start}–{current.end} · {tp('quedan {0}', formatSpan(toMin(current.end) - nowMin))}
                    </p>
                  </div>
                ) : (
                  <p className={`font-mono text-xs ${s.faint}`}>{t('Ahora no tienes nada.')}</p>
                )}
                {next && (
                  <p className={`mt-3 border-t pt-3 text-xs ${s.line} ${s.muted}`}>
                    {t('Siguiente')}: <span className={s.strong}>{next.title}</span>{' '}
                    <span className="font-mono">
                      {next.start} · {tp('en {0}', formatSpan(toMin(next.start) - nowMin))}
                    </span>
                  </p>
                )}
              </section>

              <section className={`rounded-2xl border p-4 ${s.line} ${s.panel}`}>
                <div className="mb-3 flex items-baseline justify-between">
                  <p className={label}>{t('Esta semana')}</p>
                  <p className="font-mono text-sm tabular-nums">{formatSpan(totalMinutes)}</p>
                </div>
                {totalMinutes === 0 ? (
                  <p className={`font-mono text-xs ${s.faint}`}>{t('Vacío.')}</p>
                ) : (
                  <>
                    <div className="flex h-14 items-end gap-1.5">
                      {perDay.map((m, i) => (
                        <div key={i} className="flex flex-1 flex-col items-center gap-1">
                          <div
                            className={`w-full rounded-sm ${i === todayIndex ? (dark ? 'bg-white' : 'bg-neutral-900') : dark ? 'bg-white/25' : 'bg-black/20'}`}
                            style={{ height: `${Math.max(m > 0 ? 4 : 0, (m / maxDay) * 40)}px` }}
                          />
                          <span className={`font-mono text-[0.6rem] ${s.faint}`}>{dayNames[i].slice(0, 1)}</span>
                        </div>
                      ))}
                    </div>
                    <ul className="mt-4 flex flex-col gap-2">
                      {topTitles.map(([name, info]) => (
                        <li key={name} className="flex items-center gap-2 text-xs">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: info.color ?? (dark ? '#737373' : '#a3a3a3') }} />
                          <span className="min-w-0 flex-1 truncate">{name}</span>
                          <span className={`shrink-0 font-mono ${s.muted}`}>{formatSpan(info.minutes)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>

              <section className={`flex flex-col gap-3 rounded-2xl border p-4 ${s.line} ${s.panel}`}>
                <p className={label}>{t('Herramientas')}</p>
                <label className={`flex items-center justify-between gap-3 text-xs ${s.muted}`}>
                  {t('Mostrar fin de semana')}
                  <input
                    type="checkbox"
                    checked={showWeekend || weekendUsed}
                    disabled={weekendUsed}
                    onChange={(e) => setShowWeekend(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                </label>
                <label className={`flex items-center justify-between gap-3 text-xs ${s.muted}`}>
                  {t('Ver las 24 horas')}
                  <input type="checkbox" checked={fullDay} onChange={(e) => setFullDay(e.target.checked)} className="h-4 w-4 rounded" />
                </label>
                <div className={`flex flex-col gap-2 border-t pt-3 ${s.line}`}>
                  <span className={`text-xs ${s.muted}`}>{t('Copiar un día a otro')}</span>
                  <div className="flex items-center gap-2">
                    <select value={copyFrom} onChange={(e) => setCopyFrom(Number(e.target.value))} aria-label={t('Copiar desde')} className={`${s.field} !py-1.5 text-xs`}>
                      {dayNames.map((name, i) => (
                        <option key={name} value={i}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <Icon name="right" className={`h-3.5 w-3.5 shrink-0 ${s.muted}`} />
                    <select value={copyTo} onChange={(e) => setCopyTo(Number(e.target.value))} aria-label={t('Copiar a')} className={`${s.field} !py-1.5 text-xs`}>
                      {dayNames.map((name, i) => (
                        <option key={name} value={i}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="button" onClick={copyDay} disabled={copyFrom === copyTo} className={`${s.ghost} self-start disabled:opacity-40`}>
                    {t('Copiar')}
                  </button>
                </div>
                <ScheduleTransfer
                  blocks={blocks}
                  setBlocks={setBlocks}
                  profile={active}
                  profileName={profiles.find((p) => p.id === active)?.name ?? ''}
                  s={s}
                />
                <p className={`text-[0.7rem] ${s.faint}`}>
                  {t('Arrastra en un hueco para crear un bloque, arrastra un bloque para moverlo y tira de su borde para cambiar la duración.')}
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
