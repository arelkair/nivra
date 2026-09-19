import { useState } from 'react'
import { UNITS, countdown, progress, type Countdown, type Work } from '../../lib/store'
import { notifyWithUndo } from '../../lib/undo'
import { locale, t, tp } from '../../lib/i18n'
import { playDrop, playPop } from '../../lib/sound'
import { Icon } from '../ui'
import { CountdownForm } from './InitiativeCountdowns'
import { DEFAULT_UNITS, draftToCountdown, freshDraft, timeOf, toDraft, type Draft } from './countdownDraft'
import { skin } from './skin'

type Props = {
  countdowns: Countdown[]
  setCountdowns: (update: (prev: Countdown[]) => Countdown[]) => void
  works: Work[]
  now: Date
  dark: boolean
}

type Filter = 'activas' | 'terminadas'
type Sort = 'proximas' | 'recientes' | 'manual'

const isFinished = (c: Countdown, now: Date) => new Date(c.target).getTime() <= now.getTime()

const since = (target: string, now: Date) => {
  const days = Math.floor((now.getTime() - new Date(target).getTime()) / 86400000)
  if (days <= 0) return t('Hoy')
  return tp('Hace {0} días', days)
}

export function InitiativeCountdownsPage({ countdowns, setCountdowns, works, now, dark }: Props) {
  const s = skin(dark)
  const [filter, setFilter] = useState<Filter>('activas')
  const [sort, setSort] = useState<Sort>('proximas')
  const [draft, setDraft] = useState<Draft | null>(null)

  const active = countdowns.filter((c) => !isFinished(c, now))
  const finished = countdowns.filter((c) => isFinished(c, now))
  const valid = !!draft && draft.title.trim() !== '' && draft.date !== '' && Object.values(draft.units).some(Boolean)

  const principal = countdowns[0] && !isFinished(countdowns[0], now) ? countdowns[0] : [...active].sort((a, b) => a.target.localeCompare(b.target))[0]

  const pool = filter === 'activas' ? active : finished
  const ordered = [...pool].sort((a, b) => {
    if (sort === 'recientes') return b.created.localeCompare(a.created)
    if (sort === 'manual') return countdowns.indexOf(a) - countdowns.indexOf(b)
    return filter === 'activas' ? a.target.localeCompare(b.target) : b.target.localeCompare(a.target)
  })
  const grid = filter === 'activas' && principal ? ordered.filter((c) => c.id !== principal.id) : ordered

  const importable = works
    .filter((w) => w.date && w.date >= now.toISOString().slice(0, 10) && !countdowns.some((c) => c.title === w.title))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    .slice(0, 6)

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

  const pin = (id: string) => {
    playPop()
    setCountdowns((prev) => {
      const item = prev.find((c) => c.id === id)
      return item ? [item, ...prev.filter((c) => c.id !== id)] : prev
    })
  }

  const duplicate = (c: Countdown) => {
    playPop()
    setCountdowns((prev) => [...prev, { ...c, id: crypto.randomUUID(), title: `${c.title} (${t('copia')})`, created: new Date().toISOString() }])
  }

  const fromWork = (w: Work) => {
    playPop()
    setCountdowns((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: w.title, subtitle: w.kind === 'examen' ? t('Examen') : t('Proyecto'), target: `${w.date}T09:00`, created: new Date().toISOString(), units: DEFAULT_UNITS },
    ])
  }

  const digits = (c: Countdown, big: boolean) => {
    const parts = countdown(now, new Date(c.target), c.units)
    return (
      <div className={`flex flex-wrap items-baseline ${big ? 'gap-x-6 gap-y-2' : 'gap-x-4 gap-y-1'}`}>
        {parts.map((p) => (
          <span key={p.unit} className="flex items-baseline gap-1.5">
            <span className={`font-medium tabular-nums ${big ? 'text-5xl sm:text-6xl' : 'text-2xl'}`}>{p.value}</span>
            <span className={`${big ? 'text-sm' : 'text-[0.65rem]'} ${s.faint}`}>{t(UNITS.find((u) => u.id === p.unit)?.[p.value === 1 ? 'one' : 'many'] ?? p.label)}</span>
          </span>
        ))}
      </div>
    )
  }

  const bar = (c: Countdown) => {
    const pct = progress(c.created, c.target, now)
    return (
      <div className="flex items-center gap-2">
        <div className={`h-1 flex-1 overflow-hidden rounded-full ${dark ? 'bg-white/10' : 'bg-black/[0.07]'}`}>
          <div className={`h-full rounded-full transition-[width] duration-1000 ${dark ? 'bg-white' : 'bg-neutral-900'}`} style={{ width: `${pct * 100}%` }} />
        </div>
        <span className={`w-9 text-right font-mono text-[0.65rem] tabular-nums ${s.faint}`}>{Math.round(pct * 100)} %</span>
      </div>
    )
  }

  const when = (c: Countdown) => {
    const target = new Date(c.target)
    return `${target.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${timeOf(target)}`
  }

  const actions = (c: Countdown, isPrincipal: boolean) => (
    <div className="flex shrink-0 items-center gap-1">
      {!isFinished(c, now) && (
        <button
          type="button"
          onClick={() => pin(c.id)}
          aria-pressed={isPrincipal}
          aria-label={isPrincipal ? t('Es la principal') : t('Hacer principal')}
          title={isPrincipal ? t('Es la principal') : t('Hacer principal')}
          className={`grid h-7 w-7 place-items-center rounded-lg transition-colors ${isPrincipal ? 'text-amber-400' : `${s.muted} ${s.hoverText}`}`}
        >
          <Icon name="star" className="h-3.5 w-3.5" />
        </button>
      )}
      <button type="button" onClick={() => duplicate(c)} aria-label={t('Duplicar')} title={t('Duplicar')} className={`grid h-7 w-7 place-items-center rounded-lg transition-colors ${s.muted} ${s.hoverText}`}>
        <Icon name="plus" className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => setDraft(toDraft(c))} aria-label={`${t('Editar')} ${c.title}`} className={`grid h-7 w-7 place-items-center rounded-lg transition-colors ${s.muted} ${s.hoverText}`}>
        <Icon name="pencil" className="h-3.5 w-3.5" />
      </button>
    </div>
  )

  const chip = (on: boolean) => `rounded-lg border px-3 py-1.5 text-xs transition-colors ${on ? `${s.active} border-transparent` : `${s.line} ${s.muted} ${s.hover}`}`

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-initiative text-3xl font-medium tracking-tight sm:text-4xl">{t('Cuentas atrás')}</h1>
        <button
          type="button"
          onClick={() => setDraft(draft && !draft.id ? null : freshDraft())}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${s.primary}`}
        >
          <Icon name={draft && !draft.id ? 'close' : 'plus'} className="h-3.5 w-3.5" />
          {t('Nueva cuenta atrás')}
        </button>
      </div>

      {draft && (
        <section className={`rounded-2xl border px-4 ${s.line} ${s.panel}`}>
          <CountdownForm draft={draft} setDraft={setDraft} s={s} valid={valid} onSave={save} onDelete={draft.id ? () => remove(draft.id!) : undefined} />
        </section>
      )}

      {importable.length > 0 && !draft && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs ${s.muted}`}>{t('Crear desde un examen o proyecto')}:</span>
          {importable.map((w) => (
            <button key={w.id} type="button" onClick={() => fromWork(w)} className={`max-w-56 truncate rounded-lg border px-2.5 py-1 text-xs transition-colors ${s.line} ${s.muted} ${s.hover} ${s.hoverText}`}>
              + {w.title}
            </button>
          ))}
        </div>
      )}

      {filter === 'activas' && principal && (
        <section className={`flex flex-col gap-4 rounded-2xl border p-5 sm:p-6 ${s.line} ${s.panel}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`}>{t('Principal')}</p>
              <p className="truncate text-xl font-medium">{principal.title}</p>
              <p className={`truncate text-xs ${s.faint}`}>
                {principal.subtitle ? `${principal.subtitle} · ` : ''}
                {when(principal)}
              </p>
            </div>
            {actions(principal, true)}
          </div>
          {digits(principal, true)}
          {bar(principal)}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={filter === 'activas'} onClick={() => setFilter('activas')} className={chip(filter === 'activas')}>
          {t('Activas')} <span className="ml-1 tabular-nums">{active.length}</span>
        </button>
        <button type="button" aria-pressed={filter === 'terminadas'} onClick={() => setFilter('terminadas')} className={chip(filter === 'terminadas')}>
          {t('Terminadas')} <span className="ml-1 tabular-nums">{finished.length}</span>
        </button>
        <span className="flex-1" />
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t('Orden')} className={`${s.field} !w-auto !py-1.5 text-xs`}>
          <option value="proximas">{t('Las que acaban antes')}</option>
          <option value="recientes">{t('Creadas hace poco')}</option>
          <option value="manual">{t('Mi orden')}</option>
        </select>
        {filter === 'terminadas' && finished.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const before = countdowns
              setCountdowns((prev) => prev.filter((c) => !isFinished(c, now)))
              notifyWithUndo(t('Terminadas eliminadas'), () => setCountdowns(() => before))
            }}
            className={`text-xs ${s.muted} transition-colors hover:text-red-500`}
          >
            {t('Vaciar')}
          </button>
        )}
      </div>

      {countdowns.length === 0 && !draft && <p className={`text-sm ${s.faint}`}>{t('Sin cuentas atrás.')}</p>}
      {countdowns.length > 0 && pool.length === 0 && <p className={`text-sm ${s.faint}`}>{filter === 'activas' ? t('No hay cuentas activas.') : t('Aún no ha terminado ninguna.')}</p>}

      {grid.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {grid.map((c) => {
            const done = isFinished(c, now)
            return (
              <article key={c.id} className={`flex min-w-0 flex-col gap-3 rounded-2xl border p-4 ${s.line} ${s.panel} ${done ? 'opacity-70' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className={`truncate text-[0.7rem] ${s.faint}`}>
                      {c.subtitle ? `${c.subtitle} · ` : ''}
                      {when(c)}
                    </p>
                  </div>
                  {actions(c, false)}
                </div>
                {done ? (
                  <p className="text-lg font-medium">
                    {t('Se acabó')} <span className={`text-xs font-normal ${s.faint}`}>· {since(c.target, now)}</span>
                  </p>
                ) : (
                  digits(c, false)
                )}
                {bar(c)}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
