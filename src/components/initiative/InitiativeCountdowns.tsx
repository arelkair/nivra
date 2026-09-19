import { useEffect, useState } from 'react'
import { UNITS, countdown, progress, type Countdown } from '../../lib/store'
import { dateOf, draftToCountdown, freshDraft, timeOf, toDraft, type Draft } from './countdownDraft'
import { notifyWithUndo } from '../../lib/undo'
import { locale, t, tp } from '../../lib/i18n'
import { playDrop, playPop } from '../../lib/sound'
import { Icon } from '../ui'
import { Panel } from './panel'
import { skin, type Skin } from './skin'

type Props = {
  countdowns: Countdown[]
  setCountdowns: (update: (prev: Countdown[]) => Countdown[]) => void
  now: Date
  dark: boolean
  delay: number
}

export function InitiativeCountdowns({ countdowns, setCountdowns, now, dark, delay }: Props) {
  const s = skin(dark)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const valid = !!draft && draft.title.trim() !== '' && draft.date !== '' && Object.values(draft.units).some(Boolean)

  const save = () => {
    if (!draft || !valid) return
    const item = draftToCountdown(draft)
    playPop()
    setCountdowns((prev) => (draft.id ? prev.map((x) => (x.id === item.id ? item : x)) : [...prev, item]))
    setDraft(null)
  }

  const remove = (id: string) => {
    const before = countdowns
    const name = countdowns.find((c) => c.id === id)?.title ?? ''
    playDrop()
    setCountdowns((prev) => prev.filter((c) => c.id !== id))
    setDraft(null)
    notifyWithUndo(tp('«{0}» eliminada', name), () => setCountdowns(() => before))
  }

  const sorted = [...countdowns].sort((a, b) => {
    const fa = new Date(a.target).getTime() <= now.getTime()
    const fb = new Date(b.target).getTime() <= now.getTime()
    if (fa !== fb) return fa ? 1 : -1
    return new Date(a.target).getTime() - new Date(b.target).getTime()
  })

  const rotating = sorted.length > 1
  const current = rotating ? index % sorted.length : 0

  useEffect(() => {
    if (!rotating || paused || draft) return
    const id = setInterval(() => setIndex((i) => i + 1), 8000)
    return () => clearInterval(id)
  }, [rotating, paused, draft, index])

  return (
    <Panel
      title={t('Cuentas atrás')}
      count={countdowns.length}
      dark={dark}
      delay={delay}
      action={
        <button
          type="button"
          onClick={() => setDraft(draft ? null : freshDraft())}
          aria-label={t('Nueva cuenta atrás')}
          aria-pressed={!!draft && !draft.id}
          className={`grid h-7 w-7 place-items-center rounded-lg border transition-colors ${s.line} ${s.muted} ${s.hover} ${s.hoverText}`}
        >
          <Icon name={draft ? 'close' : 'plus'} className="h-3.5 w-3.5" />
        </button>
      }
    >
      {draft && <CountdownForm draft={draft} setDraft={setDraft} s={s} valid={valid} onSave={save} onDelete={draft.id ? () => remove(draft.id!) : undefined} />}

      {countdowns.length === 0 && !draft && <p className={`py-3 text-xs ${s.faint}`}>{t('Sin cuentas atrás.')}</p>}

      {(rotating ? [sorted[current]] : sorted).map((c) => {
        const target = new Date(c.target)
        const finished = target.getTime() <= now.getTime()
        const parts = countdown(now, target, c.units)
        const pct = progress(c.created, c.target, now)
        return (
          <div
            key={c.id}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className={`flex animate-[fade-in_0.4s_ease-out_both] flex-col gap-2 border-b py-3 last:border-0 ${s.line}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.title}</p>
                <p className={`truncate text-[0.7rem] ${s.faint}`}>
                  {c.subtitle ? `${c.subtitle} · ` : ''}
                  {target.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })} {timeOf(target)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraft(toDraft(c))}
                aria-label={`${t('Editar')} ${c.title}`}
                className={`shrink-0 ${s.muted} ${s.hoverText} transition-colors`}
              >
                <Icon name="pencil" className="h-3.5 w-3.5" />
              </button>
            </div>
            {finished ? (
              <p className="text-lg font-medium">{t('Se acabó')}</p>
            ) : (
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                {parts.map((p) => (
                  <span key={p.unit} className="flex items-baseline gap-1">
                    <span className="text-xl font-medium tabular-nums">{p.value}</span>
                    <span className={`text-[0.65rem] ${s.faint}`}>{t(p.label)}</span>
                  </span>
                ))}
              </div>
            )}
            <div className={`h-1 overflow-hidden rounded-full ${dark ? 'bg-white/10' : 'bg-black/[0.07]'}`}>
              <div className={`h-full rounded-full transition-[width] duration-1000 ${dark ? 'bg-white' : 'bg-neutral-900'}`} style={{ width: `${pct * 100}%` }} />
            </div>
          </div>
        )
      })}

      {rotating && (
        <div className="flex items-center justify-center gap-1.5 pt-1 pb-2" role="tablist" aria-label={t('Cuentas atrás')}>
          {sorted.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={c.title}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === current ? `w-4 ${dark ? 'bg-white' : 'bg-neutral-900'}` : `w-1.5 ${dark ? 'bg-white/25' : 'bg-black/20'}`}`}
            />
          ))}
        </div>
      )}
    </Panel>
  )
}

export function CountdownForm({
  draft,
  setDraft,
  s,
  valid,
  onSave,
  onDelete,
}: {
  draft: Draft
  setDraft: (d: Draft | null) => void
  s: Skin
  valid: boolean
  onSave: () => void
  onDelete?: () => void
}) {
  const label = `text-[0.65rem] tracking-widest uppercase ${s.faint}`
  const set = (changes: Partial<Draft>) => setDraft({ ...draft, ...changes })
  const quick = [
    { label: t('Mañana'), days: 1 },
    { label: tp('En {0} días', 7), days: 7 },
    { label: tp('En {0} días', 30), days: 30 },
  ]

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault()
        onSave()
      }}
      className={`flex flex-col gap-3 border-b py-3 ${s.line}`}
    >
      <input
        value={draft.title}
        onChange={(e) => set({ title: e.target.value })}
        maxLength={40}
        required
        autoFocus
        placeholder={t('Título')}
        aria-label={t('Título')}
        className={s.field}
      />
      <input
        value={draft.subtitle}
        onChange={(e) => set({ subtitle: e.target.value })}
        maxLength={60}
        placeholder={t('Subtítulo')}
        aria-label={t('Subtítulo')}
        className={s.field}
      />
      <div className="flex flex-col gap-1.5">
        <span className={label}>{t('Acaba')}</span>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} required aria-label={t('Día del final')} className={s.field} />
          <input type="time" value={draft.time} onChange={(e) => set({ time: e.target.value })} aria-label={t('Hora del final')} className={s.field} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <button
              key={q.days}
              type="button"
              onClick={() => set({ date: dateOf(new Date(Date.now() + q.days * 86400000)) })}
              className={`rounded-md border px-2 py-1 text-[0.7rem] transition-colors ${s.line} ${s.muted} ${s.hover}`}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={label}>{t('Unidades')}</span>
        <div className="flex flex-wrap gap-1.5">
          {UNITS.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => set({ units: { ...draft.units, [u.id]: !draft.units[u.id] } })}
              aria-pressed={draft.units[u.id]}
              className={`rounded-md border px-2.5 py-1 text-xs capitalize transition-colors ${
                draft.units[u.id] ? `${s.active} border-transparent` : `${s.line} ${s.muted} ${s.hover}`
              }`}
            >
              {t(u.many)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={!valid} className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors disabled:opacity-30 ${s.primary}`}>
          {draft.id ? t('Guardar') : t('Crear')}
        </button>
        <button type="button" onClick={() => setDraft(null)} className={s.ghost}>
          {t('Cancelar')}
        </button>
        <span className="flex-1" />
        {onDelete && (
          <button type="button" onClick={onDelete} className={`flex items-center gap-1.5 text-xs ${s.muted} transition-colors hover:text-red-500`}>
            <Icon name="trash" className="h-3.5 w-3.5" />
            {t('Eliminar')}
          </button>
        )}
      </div>
    </form>
  )
}
