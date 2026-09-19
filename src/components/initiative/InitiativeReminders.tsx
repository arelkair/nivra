import { useState } from 'react'
import { dateKey, shortDate, type Reminder, type Work } from '../../lib/store'
import { notifyWithUndo } from '../../lib/undo'
import { t, tp } from '../../lib/i18n'
import { playDrop, playPop } from '../../lib/sound'
import { Icon } from '../ui'
import { daysLeft, relativeDays } from './dates'
import { skin, type Skin } from './skin'

type Repeat = NonNullable<Reminder['repeat']>

type Props = {
  reminders: Reminder[]
  setReminders: (update: (prev: Reminder[]) => Reminder[]) => void
  works: Work[]
  dark: boolean
}

type Group = 'atrasados' | 'hoy' | 'manana' | 'semana' | 'despues' | 'hechos'

const GROUPS: { id: Group; label: string }[] = [
  { id: 'atrasados', label: 'Atrasados' },
  { id: 'hoy', label: 'Hoy' },
  { id: 'manana', label: 'Mañana' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'despues', label: 'Más adelante' },
  { id: 'hechos', label: 'Hechos' },
]

const REPEATS: { id: Repeat | ''; label: string }[] = [
  { id: '', label: 'No se repite' },
  { id: 'diario', label: 'Cada día' },
  { id: 'semanal', label: 'Cada semana' },
  { id: 'mensual', label: 'Cada mes' },
]

const addDays = (date: string, n: number) => {
  const [y, m, d] = date.split('-').map(Number)
  return dateKey(new Date(y, m - 1, d + n))
}

const addMonth = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  const last = new Date(y, m + 1, 0).getDate()
  return dateKey(new Date(y, m, Math.min(d, last)))
}

const nextDate = (date: string, repeat: Repeat) =>
  repeat === 'diario' ? addDays(date, 1) : repeat === 'semanal' ? addDays(date, 7) : addMonth(date)

const stamp = (r: Reminder) => `${r.date}T${r.time ?? '00:00'}`

export function InitiativeReminders({ reminders, setReminders, works, dark }: Props) {
  const s = skin(dark)
  const now = new Date()
  const todayKey = dateKey(now)
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayKey)
  const [time, setTime] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const groupOf = (r: Reminder): Group => {
    if (r.done) return 'hechos'
    const n = daysLeft(r.date)
    if (n < 0 || (n === 0 && r.time && r.time < nowTime)) return 'atrasados'
    if (n === 0) return 'hoy'
    if (n === 1) return 'manana'
    if (n <= 7) return 'semana'
    return 'despues'
  }

  const byGroup = (g: Group) =>
    reminders
      .filter((r) => groupOf(r) === g)
      .sort((a, b) => (g === 'hechos' ? stamp(b).localeCompare(stamp(a)) : stamp(a).localeCompare(stamp(b))))
  const pending = reminders.filter((r) => !r.done)
  const late = pending.filter((r) => groupOf(r) === 'atrasados').length
  const today = pending.filter((r) => groupOf(r) === 'hoy').length

  const patch = (id: string, changes: Partial<Reminder>) =>
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)))

  const add = () => {
    const clean = title.trim()
    if (!clean || !date) return
    playPop()
    setReminders((prev) => [...prev, { id: crypto.randomUUID(), title: clean, date, time: time || undefined }])
    setTitle('')
    setTime('')
  }

  const complete = (r: Reminder) => {
    playPop()
    if (r.done) {
      patch(r.id, { done: undefined })
      return
    }
    if (r.repeat) {
      const before = reminders
      let next = nextDate(r.date, r.repeat)
      while (next < todayKey) next = nextDate(next, r.repeat)
      patch(r.id, { date: next })
      notifyWithUndo(tp('Siguiente: {0}', shortDate(next)), () => setReminders(() => before))
      return
    }
    patch(r.id, { done: true })
  }

  const snooze = (r: Reminder, kind: 'hora' | 'manana' | 'semana') => {
    playPop()
    if (kind === 'hora') {
      const at = new Date(now.getTime() + 3600000)
      const clock = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
      patch(r.id, { date: dateKey(at), time: clock, done: undefined })
    } else patch(r.id, { date: addDays(todayKey, kind === 'manana' ? 1 : 7), done: undefined })
  }

  const remove = (r: Reminder) => {
    playDrop()
    const before = reminders
    setReminders((prev) => prev.filter((x) => x.id !== r.id))
    setOpenId(null)
    notifyWithUndo(tp('«{0}» eliminado', r.title), () => setReminders(() => before))
  }

  const clearDone = () => {
    const before = reminders
    setReminders((prev) => prev.filter((r) => !r.done))
    notifyWithUndo(t('Hechos eliminados'), () => setReminders(() => before))
  }

  const quick = [
    { label: t('Hoy'), value: todayKey },
    { label: t('Mañana'), value: addDays(todayKey, 1) },
    { label: t('En una semana'), value: addDays(todayKey, 7) },
  ]

  const stats = [
    { label: t('Pendientes'), value: pending.length, alert: false },
    { label: t('Hoy'), value: today, alert: false },
    { label: t('Atrasados'), value: late, alert: late > 0 },
  ]

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-initiative text-3xl font-medium tracking-tight sm:text-4xl">{t('Recordatorios')}</h1>
        <div className="flex items-center gap-4">
          {stats.map((x) => (
            <p key={x.label} className="flex flex-col items-end">
              <span className={`font-mono text-lg font-semibold tabular-nums ${x.alert ? 'text-red-500' : ''}`}>{x.value}</span>
              <span className={`text-[0.6rem] tracking-wide uppercase ${s.muted}`}>{x.label}</span>
            </p>
          ))}
        </div>
      </div>

      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          add()
        }}
        className={`flex flex-col gap-3 rounded-2xl border p-3 ${s.line} ${s.panel}`}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={60}
          placeholder={t('¿Qué hay que recordar?')}
          aria-label={t('¿Qué hay que recordar?')}
          className="min-w-0 bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-neutral-500 sm:text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => setDate(q.value)}
              aria-pressed={date === q.value}
              className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                date === q.value ? `${s.active} border-transparent` : `${s.line} ${s.muted} ${s.hover}`
              }`}
            >
              {q.label}
            </button>
          ))}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label={t('Fecha')} className={`${s.field} !w-auto !py-1.5 text-xs`} />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label={t('Hora')} className={`${s.field} !w-auto !py-1.5 text-xs`} />
          <span className="flex-1" />
          <button
            type="submit"
            disabled={!title.trim() || !date}
            aria-label={t('Añadir')}
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors disabled:opacity-30 ${s.primary}`}
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>
      </form>

      {reminders.length === 0 && <p className={`text-sm ${s.faint}`}>{t('Sin recordatorios.')}</p>}

      {GROUPS.map((g) => {
        const list = byGroup(g.id)
        if (list.length === 0) return null
        return (
          <section key={g.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className={`font-mono text-[0.65rem] tracking-widest uppercase ${g.id === 'atrasados' ? 'text-red-500' : s.faint}`}>
                {t(g.label)} <span className="ml-1 tabular-nums">{list.length}</span>
              </p>
              {g.id === 'hechos' && (
                <button type="button" onClick={clearDone} className={`text-xs ${s.muted} transition-colors hover:text-red-500`}>
                  {t('Vaciar')}
                </button>
              )}
            </div>
            <ul className={`flex flex-col divide-y overflow-hidden rounded-2xl border ${s.line} ${s.divide}`}>
              {list.map((r) => {
                const open = openId === r.id
                const work = works.find((w) => w.id === r.work)
                const repeatLabel = r.repeat ? t(REPEATS.find((x) => x.id === r.repeat)?.label ?? '') : ''
                return (
                  <li key={r.id} className={open ? s.panel : ''}>
                    <div className={`flex items-center gap-3 px-4 py-3 ${r.done ? 'opacity-50' : ''}`}>
                      <button
                        type="button"
                        onClick={() => complete(r)}
                        aria-label={r.done ? t('Reabrir') : t('Hecho')}
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors ${
                          r.done
                            ? dark
                              ? 'border-white bg-white text-neutral-900'
                              : 'border-neutral-900 bg-neutral-900 text-white'
                            : dark
                              ? 'border-white/25 hover:border-white/60'
                              : 'border-black/25 hover:border-black/60'
                        }`}
                      >
                        {r.done && <Icon name="check" className="h-2.5 w-2.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : r.id)}
                        aria-expanded={open}
                        title={t('Editar')}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className={`block truncate text-sm ${r.done ? 'line-through' : ''}`}>{r.title}</span>
                        {(r.subtitle || work || repeatLabel) && (
                          <span className={`block truncate text-[0.7rem] ${s.faint}`}>
                            {[r.subtitle, work?.title, repeatLabel].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </button>
                      <span className={`shrink-0 text-right font-mono text-[0.7rem] whitespace-nowrap ${g.id === 'atrasados' ? 'text-red-500' : s.faint}`}>
                        {r.done ? shortDate(r.date) : relativeDays(r.date)}
                        {r.time ? ` · ${r.time}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : r.id)}
                        aria-label={t('Editar')}
                        className={`${s.muted} ${s.hoverText} shrink-0 transition-colors`}
                      >
                        <Icon name={open ? 'up' : 'down'} className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {open && (
                      <Detail
                        reminder={r}
                        works={works}
                        s={s}
                        onPatch={(c) => patch(r.id, c)}
                        onSnooze={(k) => snooze(r, k)}
                        onRemove={() => remove(r)}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function Detail({
  reminder,
  works,
  s,
  onPatch,
  onSnooze,
  onRemove,
}: {
  reminder: Reminder
  works: Work[]
  s: Skin
  onPatch: (changes: Partial<Reminder>) => void
  onSnooze: (kind: 'hora' | 'manana' | 'semana') => void
  onRemove: () => void
}) {
  const label = `font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`
  return (
    <div className={`flex flex-col gap-4 border-t px-4 py-4 ${s.line}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={label}>{t('Título')}</span>
          <input value={reminder.title} onChange={(e) => onPatch({ title: e.target.value })} maxLength={60} className={s.field} />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={label}>{t('Subtítulo (opcional)')}</span>
          <input
            value={reminder.subtitle ?? ''}
            onChange={(e) => onPatch({ subtitle: e.target.value || undefined })}
            maxLength={80}
            className={s.field}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Fecha')}</span>
          <input type="date" value={reminder.date} onChange={(e) => e.target.value && onPatch({ date: e.target.value })} className={s.field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Hora')}</span>
          <input type="time" value={reminder.time ?? ''} onChange={(e) => onPatch({ time: e.target.value || undefined })} className={s.field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Repetir')}</span>
          <select
            value={reminder.repeat ?? ''}
            onChange={(e) => onPatch({ repeat: (e.target.value || undefined) as Repeat | undefined })}
            className={s.field}
          >
            {REPEATS.map((x) => (
              <option key={x.label} value={x.id}>
                {t(x.label)}
              </option>
            ))}
          </select>
        </label>
        {works.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className={label}>{t('Vincular a')}</span>
            <select value={reminder.work ?? ''} onChange={(e) => onPatch({ work: e.target.value || undefined })} className={s.field}>
              <option value="">{t('Sin vincular')}</option>
              {works.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.kind === 'examen' ? t('Examen') : t('Proyecto')} · {w.title}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xs ${s.muted}`}>{t('Posponer')}</span>
        <button type="button" onClick={() => onSnooze('hora')} className={s.ghost}>
          {t('1 hora')}
        </button>
        <button type="button" onClick={() => onSnooze('manana')} className={s.ghost}>
          {t('Mañana')}
        </button>
        <button type="button" onClick={() => onSnooze('semana')} className={s.ghost}>
          {t('1 semana')}
        </button>
        <span className="flex-1" />
        <button type="button" onClick={onRemove} className={`flex items-center gap-1.5 text-xs ${s.muted} transition-colors hover:text-red-500`}>
          <Icon name="trash" className="h-3.5 w-3.5" />
          {t('Eliminar')}
        </button>
      </div>
    </div>
  )
}
