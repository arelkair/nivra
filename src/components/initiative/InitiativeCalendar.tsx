import { useMemo, useState } from 'react'
import {
  DAYS,
  MONTHS,
  REPEATS,
  TYPES,
  dateKey,
  isFreeDay,
  isOfficialHoliday,
  isWeekend,
  itemsOfDay,
  monthDay,
  monthGrid,
  textOn,
  weekIndex,
  type Anniversary,
  type CalItem,
  type ItemType,
  type NivraEvent,
  type Repeat,
  type Subject,
} from '../../lib/store'
import { notifyWithUndo } from '../../lib/undo'
import { locale, t, tp, weekdayLetters } from '../../lib/i18n'
import { playDrop, playPop } from '../../lib/sound'
import { Icon } from '../ui'
import { DOT, SPECIAL_GRADIENT, skin } from './skin'

type Props = {
  items: CalItem[]
  subjects: Subject[]
  setEvents: (update: (prev: NivraEvent[]) => NivraEvent[]) => void
  freeDays: string[]
  setFreeDays: (update: (prev: string[]) => string[]) => void
  specialDays: string[]
  setSpecialDays: (update: (prev: string[]) => string[]) => void
  autoSpecial: string[]
  subDays: number[]
  anniversaries: Anniversary[]
  setAnniversaries: (update: (prev: Anniversary[]) => Anniversary[]) => void
  dark: boolean
}

type View = 'mes' | 'semana' | 'agenda'

const mondayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - weekIndex(d))
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const parseKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function InitiativeCalendar({
  items,
  subjects,
  setEvents,
  freeDays,
  setFreeDays,
  specialDays,
  setSpecialDays,
  autoSpecial,
  subDays,
  anniversaries,
  setAnniversaries,
  dark,
}: Props) {
  const s = skin(dark)
  const today = new Date()
  const todayKey = dateKey(today)
  const [view, setView] = useState<View>('mes')
  const [selected, setSelected] = useState(todayKey)
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [monday, setMonday] = useState(() => mondayOf(today))

  const anniversaryOf = (key: string) => anniversaries.find((a) => a.md === monthDay(key))
  const isSpecial = (key: string) => specialDays.includes(key) || autoSpecial.includes(key)

  const select = (key: string) => {
    setSelected(key)
    const d = parseKey(key)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
    setMonday(mondayOf(d))
  }

  const step = (delta: number) => {
    if (view === 'semana') {
      const next = addDays(monday, delta * 7)
      setMonday(next)
      setSelected(dateKey(next))
      setCursor({ y: next.getFullYear(), m: next.getMonth() })
      return
    }
    const d = new Date(cursor.y, cursor.m + delta, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
    setMonday(mondayOf(d))
    setSelected(dateKey(d))
  }

  const goToday = () => {
    setCursor({ y: today.getFullYear(), m: today.getMonth() })
    setMonday(mondayOf(today))
    setSelected(todayKey)
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

  const title =
    view === 'semana'
      ? `${weekDays[0].getDate()} ${t(MONTHS[weekDays[0].getMonth()]).slice(0, 3)} — ${weekDays[6].getDate()} ${t(MONTHS[weekDays[6].getMonth()]).slice(0, 3)}`
      : view === 'agenda'
        ? t('Agenda')
        : `${t(MONTHS[cursor.m])} ${cursor.y}`

  const dayNumber = (key: string, day: number, isToday: boolean) => {
    const free = isFreeDay(key, freeDays)
    const special = isSpecial(key)
    const anniversary = anniversaryOf(key)
    const tone = isToday
      ? free
        ? 'bg-red-500 text-white'
        : dark
          ? 'bg-white text-neutral-900'
          : 'bg-neutral-900 text-white'
      : free
        ? 'text-red-500'
        : special
          ? `${SPECIAL_GRADIENT} bg-clip-text text-transparent`
          : anniversary
            ? 'text-yellow-500'
            : ''
    return (
      <span
        className={`grid h-6 min-w-6 shrink-0 place-items-center rounded-full px-1 font-mono text-xs tabular-nums ${tone}`}
      >
        {day}
      </span>
    )
  }

  const weekday = weekdayLetters()

  const monthView = (
    <div className={`overflow-hidden rounded-2xl border ${s.line}`}>
      <div className={`grid grid-cols-7 border-b ${s.line}`}>
        {weekday.map((d, i) => (
          <span
            key={i}
            className={`py-2 text-center font-mono text-[0.65rem] tracking-widest uppercase ${
              i >= 5 ? 'text-red-400/80' : s.faint
            }`}
          >
            {d}
          </span>
        ))}
      </div>
      <div key={`${cursor.y}-${cursor.m}`} className="animate-[fade-in_0.3s_ease-out] grid grid-cols-7">
        {monthGrid(cursor.y, cursor.m).map((day, i) => {
          if (day === null)
            return <span key={`e-${i}`} className={`min-h-16 border-r border-b sm:min-h-24 ${s.line} opacity-40`} />
          const key = dateKey(new Date(cursor.y, cursor.m, day))
          const dayItems = itemsOfDay(items, key)
          const anniversary = anniversaryOf(key)
          const isToday = key === todayKey
          return (
            <button
              key={key}
              type="button"
              onClick={() => select(key)}
              aria-label={`${day} ${t(MONTHS[cursor.m])}`}
              aria-current={key === selected}
              className={`relative flex min-h-16 min-w-0 flex-col items-start gap-1 border-r border-b p-1.5 text-left transition-colors sm:min-h-24 sm:p-2 ${s.line} ${
                key === selected ? s.selectedCell : s.hover
              }`}
            >
              <span className="flex w-full items-center justify-between">
                {dayNumber(key, day, isToday)}
                {subDays.includes(day) && (
                  <span title={t('Ese día se renueva una suscripción')} className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
                )}
              </span>
              <span className="flex flex-wrap gap-0.5 sm:hidden">
                {anniversary && <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />}
                {dayItems.slice(0, 4).map((e) => (
                  <span key={e.id + e.date} className={`h-1.5 w-1.5 rounded-full ${DOT[e.type]}`} />
                ))}
              </span>
              <span className="hidden w-full min-w-0 flex-col gap-0.5 sm:flex">
                {anniversary && (
                  <span className="flex items-center gap-1 truncate text-[0.65rem] text-yellow-500">
                    <Icon name="star" className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{anniversary.name || t('Aniversario')}</span>
                  </span>
                )}
                {dayItems.slice(0, 2).map((e) => (
                  <span key={e.id + e.date} className={`flex items-center gap-1 truncate text-[0.65rem] ${s.muted}`}>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[e.type]}`} />
                    <span className="truncate">{e.title}</span>
                  </span>
                ))}
                {dayItems.length > 2 && <span className={`text-[0.6rem] ${s.faint}`}>+{dayItems.length - 2}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  const weekView = (
    <div className={`grid grid-cols-1 overflow-hidden rounded-2xl border sm:grid-cols-7 ${s.line}`}>
      {weekDays.map((d, i) => {
        const key = dateKey(d)
        const dayItems = itemsOfDay(items, key)
        const anniversary = anniversaryOf(key)
        return (
          <button
            key={key}
            type="button"
            onClick={() => select(key)}
            aria-current={key === selected}
            className={`flex min-h-24 min-w-0 flex-col gap-2 border-b p-3 text-left transition-colors sm:min-h-72 sm:border-r sm:border-b-0 sm:last:border-r-0 ${s.line} ${
              key === selected ? s.selectedCell : s.hover
            }`}
          >
            <span className="flex items-center justify-between">
              <span className={`font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`}>
                {t(DAYS[i]).slice(0, 3)}
              </span>
              {dayNumber(key, d.getDate(), key === todayKey)}
            </span>
            {anniversary && (
              <span className="flex items-center gap-1 truncate text-[0.7rem] text-yellow-500">
                <Icon name="star" className="h-3 w-3 shrink-0" />
                <span className="truncate">{anniversary.name || t('Aniversario')}</span>
              </span>
            )}
            {dayItems.map((e) => (
              <span key={e.id + e.date} className={`flex items-start gap-1.5 text-xs ${s.muted}`}>
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${DOT[e.type]}`} />
                <span className="min-w-0 break-words">{e.title}</span>
              </span>
            ))}
          </button>
        )
      })}
    </div>
  )

  const agenda = useMemo(() => {
    const out: { key: string; list: CalItem[] }[] = []
    for (let i = 0; i < 90; i++) {
      const key = dateKey(addDays(new Date(), i))
      const list = itemsOfDay(items, key)
      if (list.length > 0 || anniversaries.some((a) => a.md === monthDay(key))) out.push({ key, list })
    }
    return out
  }, [items, anniversaries])

  const agendaView =
    agenda.length === 0 ? (
      <p className={`font-mono text-sm ${s.faint}`}>{t('Nada por venir.')}</p>
    ) : (
      <ul className={`flex flex-col divide-y overflow-hidden rounded-2xl border ${s.line} ${s.divide}`}>
        {agenda.map(({ key, list }) => {
          const d = parseKey(key)
          const anniversary = anniversaryOf(key)
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => select(key)}
                className={`flex w-full items-start gap-4 px-4 py-3 text-left transition-colors ${
                  key === selected ? s.selectedCell : s.hover
                }`}
              >
                <span className="w-16 shrink-0">
                  <span className="block font-mono text-lg tabular-nums">{d.getDate()}</span>
                  <span className={`block font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`}>
                    {t(MONTHS[d.getMonth()]).slice(0, 3)} · {t(DAYS[weekIndex(d)]).slice(0, 3)}
                  </span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  {anniversary && (
                    <span className="flex items-center gap-1.5 text-sm text-yellow-500">
                      <Icon name="star" className="h-3 w-3" />
                      {anniversary.name || t('Aniversario')}
                    </span>
                  )}
                  {list.map((e) => (
                    <span key={e.id + e.date} className="flex items-center gap-2 text-sm">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[e.type]}`} />
                      <span className="min-w-0 truncate">{e.title}</span>
                    </span>
                  ))}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-initiative text-3xl font-medium tracking-tight first-letter:uppercase sm:text-4xl">
          {title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex rounded-lg border p-0.5 ${s.line}`}>
            {(['mes', 'semana', 'agenda'] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`rounded-md px-3 py-1 text-xs capitalize transition-colors ${
                  view === v ? s.active : `${s.muted} ${s.hoverText}`
                }`}
              >
                {t(v === 'mes' ? 'Mes' : v === 'semana' ? 'Semana' : 'Agenda')}
              </button>
            ))}
          </div>
          <button type="button" onClick={goToday} className={s.ghost}>
            {t('Hoy')}
          </button>
          {view !== 'agenda' && (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label={view === 'semana' ? t('Semana anterior') : t('Mes anterior')}
                className={s.iconButton}
              >
                <Icon name="left" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label={view === 'semana' ? t('Semana siguiente') : t('Mes siguiente')}
                className={s.iconButton}
              >
                <Icon name="right" className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div>{view === 'mes' ? monthView : view === 'semana' ? weekView : agendaView}</div>

        <DayPanel
          key={selected}
          date={selected}
          dark={dark}
          items={itemsOfDay(items, selected)}
          subjects={subjects}
          anniversary={anniversaryOf(selected)}
          free={isFreeDay(selected, freeDays)}
          locked={isWeekend(selected) || isOfficialHoliday(selected)}
          special={isSpecial(selected)}
          onToggleFree={() =>
            setFreeDays((prev) => (prev.includes(selected) ? prev.filter((d) => d !== selected) : [...prev, selected]))
          }
          onToggleSpecial={() =>
            setSpecialDays((prev) =>
              prev.includes(selected) ? prev.filter((d) => d !== selected) : [...prev, selected],
            )
          }
          onToggleAnniversary={() =>
            setAnniversaries((prev) =>
              prev.some((a) => a.md === monthDay(selected))
                ? prev.filter((a) => a.md !== monthDay(selected))
                : [...prev, { id: crypto.randomUUID(), md: monthDay(selected), name: '' }],
            )
          }
          onRenameAnniversary={(name) =>
            setAnniversaries((prev) => prev.map((a) => (a.md === monthDay(selected) ? { ...a, name } : a)))
          }
          onSave={(id, values) => {
            playPop()
            if (id) {
              setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...values } : e)))
            } else {
              setEvents((prev) => [...prev, { id: crypto.randomUUID(), date: selected, ...values }])
            }
          }}
          onDelete={(id, name) => {
            playDrop()
            setEvents((prev) => {
              const before = prev
              notifyWithUndo(tp('«{0}» eliminada', name), () => setEvents(() => before))
              return prev.filter((e) => e.id !== id)
            })
          }}
        />
      </div>
    </div>
  )
}

type EventValues = { title: string; type: ItemType; desc?: string; repeat?: Repeat; date?: string }

function DayPanel({
  date,
  dark,
  items,
  subjects,
  anniversary,
  free,
  locked,
  special,
  onToggleFree,
  onToggleSpecial,
  onToggleAnniversary,
  onRenameAnniversary,
  onSave,
  onDelete,
}: {
  date: string
  dark: boolean
  items: CalItem[]
  subjects: Subject[]
  anniversary?: Anniversary
  free: boolean
  locked: boolean
  special: boolean
  onToggleFree: () => void
  onToggleSpecial: () => void
  onToggleAnniversary: () => void
  onRenameAnniversary: (name: string) => void
  onSave: (id: string | null, values: EventValues) => void
  onDelete: (id: string, title: string) => void
}) {
  const s = skin(dark)
  const [editingId, setEditingId] = useState<string | null>(null)
  const d = parseKey(date)
  const editing = items.find((e) => e.id === editingId && e.origin === 'evento')

  const chip = (active: boolean, activeClass: string) =>
    `flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
      active ? activeClass : `${s.line} ${s.muted} ${s.hover} ${s.hoverText}`
    }`

  return (
    <aside className={`flex flex-col gap-4 rounded-2xl border p-5 lg:sticky lg:top-0 ${s.line} ${s.panel}`}>
      <div>
        <p className={`font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`}>
          {d.toLocaleDateString(locale(), { weekday: 'long' })}
        </p>
        <h2 className="font-initiative text-2xl font-medium tracking-tight">
          {d.toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })}
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggleFree}
          disabled={locked}
          aria-pressed={free}
          title={locked ? t('Festivo oficial o fin de semana') : t('Marcar como día sin trabajo')}
          className={`${chip(free, 'border-red-500 bg-red-500 text-white')} ${locked ? 'cursor-default opacity-60' : ''}`}
        >
          <Icon name="pin" className="h-3.5 w-3.5" />
          {t('Día sin trabajo')}
        </button>
        <button
          type="button"
          onClick={onToggleSpecial}
          aria-pressed={special}
          title={t('Marcar como día especial')}
          className={chip(special, `border-transparent ${SPECIAL_GRADIENT} text-white`)}
        >
          <Icon name="special" className="h-3.5 w-3.5" />
          {t('Día especial')}
        </button>
        <button
          type="button"
          onClick={onToggleAnniversary}
          aria-pressed={!!anniversary}
          title={t('Marcar como aniversario (cada año)')}
          className={chip(!!anniversary, 'border-yellow-500 bg-yellow-500 text-neutral-900')}
        >
          <Icon name="star" className="h-3.5 w-3.5" />
          {t('Aniversario')}
        </button>
      </div>

      {anniversary && (
        <input
          defaultValue={anniversary.name}
          onChange={(e) => onRenameAnniversary(e.target.value)}
          maxLength={40}
          placeholder={t('¿De qué o de quién es el aniversario?')}
          className={s.field}
        />
      )}

      {items.length === 0 ? (
        <p className={`font-mono text-xs ${s.faint}`}>{t('Sin actividades.')}</p>
      ) : (
        <ul className={`flex flex-col divide-y ${s.divide}`}>
          {items.map((e) => {
            const subject = subjects.find((x) => x.id === e.subject)
            const own = e.origin === 'evento'
            return (
              <li key={e.id + e.date} className="flex items-start gap-3 py-2.5">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[e.type]}`} />
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-1.5 text-sm">
                    <span className="truncate">{e.title}</span>
                    {subject && (
                      <span
                        className="shrink-0 rounded px-1.5 text-[0.65rem]"
                        style={{ background: subject.color, color: textOn(subject.color) }}
                      >
                        {subject.name}
                      </span>
                    )}
                  </p>
                  {e.desc && <p className={`mt-0.5 text-xs ${s.muted}`}>{e.desc}</p>}
                  <p className={`mt-1 font-mono text-[0.65rem] ${s.faint}`}>
                    {t(TYPES[e.type].label)}
                    {e.repeat && ` · ${t(REPEATS.find((r) => r.id === e.repeat)?.label ?? '').toLowerCase()}`}
                    {!own && t(' · desde su apartado')}
                  </p>
                </div>
                {own && (
                  <span className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(editingId === e.id ? null : e.id)}
                      aria-label={`${t('Editar')} ${e.title}`}
                      className={`${s.muted} ${s.hoverText} transition-colors`}
                    >
                      <Icon name="pencil" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(e.id, e.title)}
                      aria-label={`Eliminar ${e.title}`}
                      className={`${s.muted} transition-colors hover:text-red-500`}
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <EventForm
        key={editing ? editing.id : 'new'}
        dark={dark}
        initial={editing}
        onCancel={editing ? () => setEditingId(null) : undefined}
        onSubmit={(values) => {
          onSave(editing ? editing.id : null, values)
          setEditingId(null)
        }}
      />
    </aside>
  )
}

function EventForm({
  dark,
  initial,
  onSubmit,
  onCancel,
}: {
  dark: boolean
  initial?: CalItem
  onSubmit: (values: EventValues) => void
  onCancel?: () => void
}) {
  const s = skin(dark)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [desc, setDesc] = useState(initial?.desc ?? '')
  const [type, setType] = useState<ItemType>(initial?.type ?? 'festividad')
  const [repeat, setRepeat] = useState<Repeat | ''>(initial?.repeat ?? '')
  const [date, setDate] = useState(initial?.date ?? '')

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault()
        const clean = title.trim()
        if (!clean) return
        onSubmit({
          title: clean,
          type,
          desc: desc.trim() || undefined,
          repeat: repeat || undefined,
          ...(initial && date ? { date } : {}),
        })
        if (!initial) {
          setTitle('')
          setDesc('')
          setRepeat('')
        }
      }}
      className={`flex flex-col gap-2 border-t pt-4 ${s.line}`}
    >
      <p className={`font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`}>
        {initial ? t('Editar actividad') : t('Nueva actividad')}
      </p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={60}
        required
        placeholder={t('Título')}
        aria-label={t('Título')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !initial) {
            e.preventDefault()
            e.currentTarget.form?.requestSubmit()
          }
        }}
        enterKeyHint="done"
        className={s.field}
      />
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        maxLength={200}
        rows={2}
        placeholder={t('Descripción')}
        aria-label={t('Descripción')}
        className={s.field}
      />
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(TYPES) as ItemType[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setType(k)}
            aria-pressed={type === k}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
              type === k ? `${s.active} border-transparent` : `${s.line} ${s.muted} ${s.hover}`
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${DOT[k]}`} />
            {t(TYPES[k].label)}
          </button>
        ))}
      </div>
      <select
        value={repeat}
        onChange={(e) => setRepeat(e.target.value as Repeat | '')}
        aria-label={t('Repetición')}
        className={s.field}
      >
        <option value="">{t('No se repite')}</option>
        {REPEATS.map((r) => (
          <option key={r.id} value={r.id}>
            {t(r.label)}
          </option>
        ))}
      </select>
      {initial && (
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label={t('Fecha')}
          className={s.field}
        />
      )}
      {initial ? (
        <div className="flex gap-2">
          <button
            type="submit"
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${s.primary}`}
          >
            {t('Guardar')}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className={s.ghost}>
              {t('Cancelar')}
            </button>
          )}
        </div>
      ) : (
        <p className={`text-[0.7rem] ${s.faint}`}>{t('Escribe el título y pulsa Enter para añadirla.')}</p>
      )}
    </form>
  )
}
