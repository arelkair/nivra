import { useState } from 'react'
import { dateKey, eur, shortDate, weekIndex, type Goal, type Movement } from '../lib/store'
import { notifyWithUndo } from '../lib/undo'
import { Empty, Icon, Label, Modal, Segmented, button, card, input, line } from '../components/ui'

type Props = {
  goals: Goal[]
  setGoals: (update: (prev: Goal[]) => Goal[]) => void
  balance: number
  movements: Movement[]
}

const GOAL_KINDS = [
  { id: 'meta' as const, label: 'Meta' },
  { id: 'limite' as const, label: 'Límite' },
  { id: 'idea' as const, label: 'Idea' },
]

function spentOn(movements: Movement[], period: 'semana' | 'mes') {
  const today = new Date()
  const from =
    period === 'semana'
      ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - weekIndex(today))
      : new Date(today.getFullYear(), today.getMonth(), 1)
  const since = dateKey(from)
  return movements
    .filter((m) => m.kind === 'gasto' && m.date >= since)
    .reduce((s, m) => s + m.amount, 0)
}

export function Goals({ goals, setGoals, balance, movements }: Props) {
  const [goalKind, setGoalKind] = useState<Goal['kind']>('meta')
  const [creating, setCreating] = useState(false)

  const savingGoals = goals.filter((g) => g.kind === 'meta')
  const limits = goals.filter((g) => g.kind === 'limite')
  const ideas = goals.filter((g) => g.kind === 'idea')

  const remove = (id: string) => {
    const before = goals
    const title = goals.find((g) => g.id === id)?.title ?? ''
    setGoals((prev) => prev.filter((g) => g.id !== id))
    notifyWithUndo(`«${title}» eliminado`, () => setGoals(() => before))
  }

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={() => setCreating(true)} className={`${button} w-fit`}>
        <span className="flex items-center gap-2">
          <Icon name="plus" className="h-4 w-4" />
          Nuevo objetivo
        </span>
      </button>

      <section className={`${card} p-5 sm:p-6`}>
        <Label>Metas de dinero</Label>
        {savingGoals.length === 0 ? (
          <Empty>Sin metas.</Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {savingGoals.map((g) => {
              const savingGoal = g as Extract<Goal, { kind: 'meta' }>
              const pct = Math.min(1, Math.max(0, balance / savingGoal.amount))
              return (
                <li key={g.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate">{savingGoal.title}</span>
                    <span className="shrink-0 font-mono tabular-nums">
                      {eur(Math.max(0, balance))} / {eur(savingGoal.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(g.id)}
                      aria-label={`Eliminar ${savingGoal.title}`}
                      className="shrink-0 text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                    <div
                      className={`h-full rounded-full ${pct >= 1 ? 'bg-green-500' : 'bg-neutral-900 dark:bg-white'}`}
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-[0.65rem] text-neutral-400">
                    {Math.round(pct * 100)}% · para element {shortDate(savingGoal.date)}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className={`${card} p-5 sm:p-6`}>
        <Label>Límites de gasto</Label>
        {limits.length === 0 ? (
          <Empty>Sin límites.</Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {limits.map((g) => {
              const limit = g as Extract<Goal, { kind: 'limite' }>
              const spent = spentOn(movements, limit.period)
              const pct = Math.min(1, spent / limit.amount)
              const past = spent > limit.amount
              return (
                <li key={g.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate">{limit.title}</span>
                    <span
                      className={`shrink-0 font-mono tabular-nums ${past ? 'text-red-500' : ''}`}
                    >
                      {eur(spent)} / {eur(limit.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(g.id)}
                      aria-label={`Eliminar ${limit.title}`}
                      className="shrink-0 text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                    <div
                      className={`h-full rounded-full ${past ? 'bg-red-500' : 'bg-neutral-900 dark:bg-white'}`}
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-[0.65rem] text-neutral-400">
                    esta {limit.period === 'semana' ? 'semana' : 'mes'} · queda{' '}
                    {eur(Math.max(0, limit.amount - spent))}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className={`${card} p-5 sm:p-6`}>
        <Label>Ideas para conseguir dinero</Label>
        {ideas.length === 0 ? (
          <Empty>Sin ideas.</Empty>
        ) : (
          <ul className="flex flex-col">
            {ideas.map((g) => {
              const idea = g as Extract<Goal, { kind: 'idea' }>
              return (
                <li key={g.id} className={`flex items-start gap-3 border-b py-3 last:border-0 ${line}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{idea.title}</p>
                    {idea.desc && (
                      <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
                        {idea.desc}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(g.id)}
                    aria-label={`Eliminar ${idea.title}`}
                    className="shrink-0 text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {creating && (
        <Modal title="Nuevo objetivo" onClose={() => setCreating(false)}>
          <div className="mb-4 flex justify-center">
            <Segmented value={goalKind} onChange={setGoalKind} options={GOAL_KINDS} />
          </div>
          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              const data = new FormData(ev.currentTarget)
              const title = String(data.get('title') ?? '').trim()
              if (!title) return
              const id = crypto.randomUUID()

              if (goalKind === 'idea') {
                setGoals((prev) => [
                  ...prev,
                  { id, kind: 'idea', title, desc: String(data.get('desc') ?? '').trim() || undefined },
                ])
              } else {
                const amount = Number(String(data.get('amount') ?? '').replace(',', '.'))
                if (!Number.isFinite(amount) || amount <= 0) return
                if (goalKind === 'meta') {
                  const date = String(data.get('date') ?? '')
                  if (!date) return
                  setGoals((prev) => [
                    ...prev,
                    { id, kind: 'meta', title, amount: Math.round(amount * 100) / 100, date },
                  ])
                } else {
                  setGoals((prev) => [
                    ...prev,
                    {
                      id,
                      kind: 'limite',
                      title,
                      amount: Math.round(amount * 100) / 100,
                      period: String(data.get('period')) === 'mes' ? 'mes' : 'semana',
                    },
                  ])
                }
              }
              setCreating(false)
            }}
            className="flex flex-col gap-2"
          >
            <input name="title" maxLength={60} required placeholder="Nombre" className={input} />

            {goalKind === 'idea' && (
              <textarea name="desc" maxLength={200} rows={3} placeholder="Detalles" className={input} />
            )}

            {goalKind !== 'idea' && (
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder={goalKind === 'meta' ? '¿Cuánto quieres tener?' : '¿Cuánto puedes gastar?'}
                aria-label="Cantidad"
                className={`${input} font-mono`}
              />
            )}

            {goalKind === 'meta' && (
              <input name="date" type="date" required aria-label="Para cuándo" className={input} />
            )}

            {goalKind === 'limite' && (
              <select name="period" defaultValue="semana" aria-label="Periodo" className={input}>
                <option value="semana">Por semana</option>
                <option value="mes">Por mes</option>
              </select>
            )}

            <button type="submit" className={`${button} mt-2`}>
              Guardar
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
