import { useState } from 'react'
import { eur, type Goal, type Movement } from '../../lib/store'
import { notifyWithUndo } from '../../lib/undo'
import { t, tp } from '../../lib/i18n'
import { playDrop, playPop } from '../../lib/sound'
import { Icon } from '../ui'
import { daysLeft } from './dates'
import { daysLeftInPeriod, parseAmount, spentSince } from './moneyCalc'
import { skin, type Skin } from './skin'

type Props = {
  goals: Goal[]
  setGoals: (update: (prev: Goal[]) => Goal[]) => void
  balance: number
  movements: Movement[]
  dark: boolean
}

type Meta = Extract<Goal, { kind: 'meta' }>
type Limit = Extract<Goal, { kind: 'limite' }>
type Idea = Extract<Goal, { kind: 'idea' }>

const KINDS: { id: Goal['kind']; label: string }[] = [
  { id: 'meta', label: 'Meta' },
  { id: 'limite', label: 'Límite' },
  { id: 'idea', label: 'Idea' },
]

function Bar({ pct, tone, dark }: { pct: number; tone: string; dark: boolean }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full ${dark ? 'bg-white/10' : 'bg-black/[0.07]'}`}>
      <div className={`h-full rounded-full transition-[width] ${tone}`} style={{ width: `${Math.min(1, Math.max(0, pct)) * 100}%` }} />
    </div>
  )
}

export function MoneyGoals({ goals, setGoals, balance, movements, dark }: Props) {
  const s = skin(dark)
  const [kind, setKind] = useState<Goal['kind']>('meta')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [period, setPeriod] = useState<'semana' | 'mes'>('semana')
  const [desc, setDesc] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const metas = goals.filter((g): g is Meta => g.kind === 'meta')
  const limits = goals.filter((g): g is Limit => g.kind === 'limite')
  const ideas = goals.filter((g): g is Idea => g.kind === 'idea')
  const label = `font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`

  const parsed = parseAmount(amount)
  const canAdd = title.trim() !== '' && (kind === 'idea' || (parsed !== null && (kind !== 'meta' || date !== '')))

  const add = () => {
    if (!canAdd) return
    playPop()
    const id = crypto.randomUUID()
    const name = title.trim()
    if (kind === 'idea') setGoals((prev) => [...prev, { id, kind: 'idea', title: name, desc: desc.trim() || undefined }])
    else if (kind === 'meta') setGoals((prev) => [...prev, { id, kind: 'meta', title: name, amount: parsed!, date }])
    else setGoals((prev) => [...prev, { id, kind: 'limite', title: name, amount: parsed!, period }])
    setTitle('')
    setAmount('')
    setDesc('')
  }

  const patch = (
    id: string,
    changes: { title?: string; amount?: number; date?: string; period?: 'semana' | 'mes'; desc?: string },
  ) =>
    setGoals((prev) => prev.map((g) => (g.id === id ? ({ ...g, ...changes } as Goal) : g)))

  const remove = (id: string) => {
    const before = goals
    const name = goals.find((g) => g.id === id)?.title ?? ''
    playDrop()
    setGoals((prev) => prev.filter((g) => g.id !== id))
    setOpenId(null)
    notifyWithUndo(tp('«{0}» eliminado', name), () => setGoals(() => before))
  }

  const card = `rounded-2xl border ${s.line} ${s.panel}`

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          add()
        }}
        className={`flex flex-col gap-3 p-3 ${card}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex rounded-lg border p-0.5 ${s.line}`}>
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                aria-pressed={kind === k.id}
                className={`rounded-md px-3 py-1 text-xs transition-colors ${kind === k.id ? s.active : `${s.muted} ${s.hoverText}`}`}
              >
                {t(k.label)}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            placeholder={t('Nombre')}
            aria-label={t('Nombre')}
            className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-neutral-500 sm:text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {kind !== 'idea' && (
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder={kind === 'meta' ? t('¿Cuánto quieres tener?') : t('¿Cuánto puedes gastar?')}
              aria-label={t('Cantidad')}
              className={`${s.field} !w-56 !py-1.5 font-mono text-xs`}
            />
          )}
          {kind === 'meta' && (
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label={t('Para cuándo')} className={`${s.field} !w-auto !py-1.5 text-xs`} />
          )}
          {kind === 'limite' && (
            <select value={period} onChange={(e) => setPeriod(e.target.value as 'semana' | 'mes')} aria-label={t('Periodo')} className={`${s.field} !w-auto !py-1.5 text-xs`}>
              <option value="semana">{t('Por semana')}</option>
              <option value="mes">{t('Por mes')}</option>
            </select>
          )}
          {kind === 'idea' && (
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={200}
              placeholder={t('Detalles')}
              aria-label={t('Detalles')}
              className={`${s.field} min-w-0 flex-1 !py-1.5 text-xs`}
            />
          )}
          <span className="flex-1" />
          <button
            type="submit"
            disabled={!canAdd}
            aria-label={t('Añadir')}
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors disabled:opacity-30 ${s.primary}`}
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>
      </form>

      <section className="flex flex-col gap-3">
        <p className={label}>{t('Metas de dinero')}</p>
        {metas.length === 0 ? (
          <p className={`font-mono text-xs ${s.faint}`}>{t('Sin metas.')}</p>
        ) : (
          <ul className={`flex flex-col divide-y overflow-hidden ${card} ${s.divide}`}>
            {metas.map((g) => {
              const pct = g.amount > 0 ? balance / g.amount : 0
              const done = balance >= g.amount
              const left = daysLeft(g.date)
              const missing = Math.max(0, g.amount - balance)
              const open = openId === g.id
              return (
                <li key={g.id}>
                  <button type="button" onClick={() => setOpenId(open ? null : g.id)} aria-expanded={open} className="flex w-full flex-col gap-2 px-4 py-3 text-left">
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 flex-1 truncate">{g.title}</span>
                      <span className="shrink-0 font-mono text-xs tabular-nums">
                        {eur(Math.max(0, balance))} / {eur(g.amount)}
                      </span>
                    </span>
                    <Bar pct={pct} tone={done ? 'bg-emerald-500' : dark ? 'bg-white' : 'bg-neutral-900'} dark={dark} />
                    <span className={`font-mono text-[0.7rem] ${s.faint}`}>
                      {done
                        ? t('¡Conseguida!')
                        : left < 0
                          ? tp('Te faltan {0} y la fecha ya pasó', eur(missing))
                          : left === 0
                            ? tp('Te faltan {0} · es hoy', eur(missing))
                            : tp('Te faltan {0} · {1} días · {2} por semana', eur(missing), left, eur((missing / left) * 7))}
                    </span>
                  </button>
                  {open && (
                    <GoalEdit s={s} onRemove={() => remove(g.id)}>
                      <Field label={t('Nombre')} s={s}>
                        <input value={g.title} onChange={(e) => patch(g.id, { title: e.target.value })} maxLength={60} className={s.field} />
                      </Field>
                      <Field label={t('Cantidad')} s={s}>
                        <input
                          defaultValue={g.amount}
                          inputMode="decimal"
                          onChange={(e) => {
                            const n = parseAmount(e.target.value)
                            if (n !== null) patch(g.id, { amount: n })
                          }}
                          className={`${s.field} font-mono`}
                        />
                      </Field>
                      <Field label={t('Para cuándo')} s={s}>
                        <input type="date" value={g.date} onChange={(e) => e.target.value && patch(g.id, { date: e.target.value })} className={s.field} />
                      </Field>
                    </GoalEdit>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <p className={label}>{t('Límites de gasto')}</p>
        {limits.length === 0 ? (
          <p className={`font-mono text-xs ${s.faint}`}>{t('Sin límites.')}</p>
        ) : (
          <ul className={`flex flex-col divide-y overflow-hidden ${card} ${s.divide}`}>
            {limits.map((g) => {
              const spent = spentSince(movements, g.period)
              const past = spent > g.amount
              const remaining = Math.max(0, g.amount - spent)
              const days = daysLeftInPeriod(g.period)
              const open = openId === g.id
              return (
                <li key={g.id}>
                  <button type="button" onClick={() => setOpenId(open ? null : g.id)} aria-expanded={open} className="flex w-full flex-col gap-2 px-4 py-3 text-left">
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 flex-1 truncate">{g.title}</span>
                      <span className={`shrink-0 font-mono text-xs tabular-nums ${past ? 'text-red-500' : ''}`}>
                        {eur(spent)} / {eur(g.amount)}
                      </span>
                    </span>
                    <Bar pct={g.amount > 0 ? spent / g.amount : 0} tone={past ? 'bg-red-500' : spent / g.amount > 0.8 ? 'bg-amber-500' : dark ? 'bg-white' : 'bg-neutral-900'} dark={dark} />
                    <span className={`font-mono text-[0.7rem] ${past ? 'text-red-500' : s.faint}`}>
                      {past
                        ? tp('Te has pasado {0}', eur(spent - g.amount))
                        : tp('Quedan {0} · {1} al día durante {2} días', eur(remaining), eur(remaining / Math.max(1, days)), days)}
                    </span>
                  </button>
                  {open && (
                    <GoalEdit s={s} onRemove={() => remove(g.id)}>
                      <Field label={t('Nombre')} s={s}>
                        <input value={g.title} onChange={(e) => patch(g.id, { title: e.target.value })} maxLength={60} className={s.field} />
                      </Field>
                      <Field label={t('Cantidad')} s={s}>
                        <input
                          defaultValue={g.amount}
                          inputMode="decimal"
                          onChange={(e) => {
                            const n = parseAmount(e.target.value)
                            if (n !== null) patch(g.id, { amount: n })
                          }}
                          className={`${s.field} font-mono`}
                        />
                      </Field>
                      <Field label={t('Periodo')} s={s}>
                        <select value={g.period} onChange={(e) => patch(g.id, { period: e.target.value as 'semana' | 'mes' })} className={s.field}>
                          <option value="semana">{t('Por semana')}</option>
                          <option value="mes">{t('Por mes')}</option>
                        </select>
                      </Field>
                    </GoalEdit>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <p className={label}>{t('Ideas para conseguir dinero')}</p>
        {ideas.length === 0 ? (
          <p className={`font-mono text-xs ${s.faint}`}>{t('Sin ideas.')}</p>
        ) : (
          <ul className={`flex flex-col divide-y overflow-hidden ${card} ${s.divide}`}>
            {ideas.map((g) => {
              const open = openId === g.id
              return (
                <li key={g.id}>
                  <button type="button" onClick={() => setOpenId(open ? null : g.id)} aria-expanded={open} className="flex w-full flex-col gap-0.5 px-4 py-3 text-left">
                    <span className="truncate text-sm">{g.title}</span>
                    {g.desc && <span className={`text-xs ${s.faint}`}>{g.desc}</span>}
                  </button>
                  {open && (
                    <GoalEdit s={s} onRemove={() => remove(g.id)}>
                      <Field label={t('Nombre')} s={s}>
                        <input value={g.title} onChange={(e) => patch(g.id, { title: e.target.value })} maxLength={60} className={s.field} />
                      </Field>
                      <Field label={t('Detalles')} s={s}>
                        <input value={g.desc ?? ''} onChange={(e) => patch(g.id, { desc: e.target.value || undefined })} maxLength={200} className={s.field} />
                      </Field>
                    </GoalEdit>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function Field({ label, s, children }: { label: string; s: Skin; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className={`font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`}>{label}</span>
      {children}
    </label>
  )
}

function GoalEdit({ s, onRemove, children }: { s: Skin; onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-4 border-t px-4 py-4 ${s.line}`}>
      <div className="grid gap-3 sm:grid-cols-3">{children}</div>
      <div className="flex justify-end">
        <button type="button" onClick={onRemove} className={`flex items-center gap-1.5 text-xs ${s.muted} transition-colors hover:text-red-500`}>
          <Icon name="trash" className="h-3.5 w-3.5" />
          {t('Eliminar')}
        </button>
      </div>
    </div>
  )
}
