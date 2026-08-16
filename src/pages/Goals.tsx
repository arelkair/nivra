import { useState } from 'react'
import { dateKey, eur, shortDate, weekIndex, type Goal, type Movement } from '../lib/store'
import { conDeshacer } from '../lib/undo'
import { Empty, Icon, Label, Modal, Segmented, button, card, input, line } from '../components/ui'

type Props = {
  goals: Goal[]
  setGoals: (update: (prev: Goal[]) => Goal[]) => void
  balance: number
  movements: Movement[]
}

const TIPOS = [
  { id: 'meta' as const, label: 'Meta' },
  { id: 'limite' as const, label: 'Límite' },
  { id: 'idea' as const, label: 'Idea' },
]

function gastadoEn(movements: Movement[], period: 'semana' | 'mes') {
  const hoy = new Date()
  const desde =
    period === 'semana'
      ? new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - weekIndex(hoy))
      : new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const clave = dateKey(desde)
  return movements
    .filter((m) => m.kind === 'gasto' && m.date >= clave)
    .reduce((s, m) => s + m.amount, 0)
}

export function Goals({ goals, setGoals, balance, movements }: Props) {
  const [tipo, setTipo] = useState<Goal['kind']>('meta')
  const [creando, setCreando] = useState(false)

  const metas = goals.filter((g) => g.kind === 'meta')
  const limites = goals.filter((g) => g.kind === 'limite')
  const ideas = goals.filter((g) => g.kind === 'idea')

  const borrar = (id: string) => {
    const antes = goals
    const titulo = goals.find((g) => g.id === id)?.title ?? ''
    setGoals((prev) => prev.filter((g) => g.id !== id))
    conDeshacer(`«${titulo}» eliminado`, () => setGoals(() => antes))
  }

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={() => setCreando(true)} className={`${button} w-fit`}>
        <span className="flex items-center gap-2">
          <Icon name="plus" className="h-4 w-4" />
          Nuevo objetivo
        </span>
      </button>

      <section className={`${card} p-5 sm:p-6`}>
        <Label>Metas de dinero</Label>
        {metas.length === 0 ? (
          <Empty>Sin metas.</Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {metas.map((g) => {
              const meta = g as Extract<Goal, { kind: 'meta' }>
              const pct = Math.min(1, Math.max(0, balance / meta.amount))
              return (
                <li key={g.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate">{meta.title}</span>
                    <span className="shrink-0 font-mono tabular-nums">
                      {eur(Math.max(0, balance))} / {eur(meta.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => borrar(g.id)}
                      aria-label={`Eliminar ${meta.title}`}
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
                    {Math.round(pct * 100)}% · para el {shortDate(meta.date)}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className={`${card} p-5 sm:p-6`}>
        <Label>Límites de gasto</Label>
        {limites.length === 0 ? (
          <Empty>Sin límites.</Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {limites.map((g) => {
              const lim = g as Extract<Goal, { kind: 'limite' }>
              const gastado = gastadoEn(movements, lim.period)
              const pct = Math.min(1, gastado / lim.amount)
              const pasado = gastado > lim.amount
              return (
                <li key={g.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate">{lim.title}</span>
                    <span
                      className={`shrink-0 font-mono tabular-nums ${pasado ? 'text-red-500' : ''}`}
                    >
                      {eur(gastado)} / {eur(lim.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => borrar(g.id)}
                      aria-label={`Eliminar ${lim.title}`}
                      className="shrink-0 text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                    <div
                      className={`h-full rounded-full ${pasado ? 'bg-red-500' : 'bg-neutral-900 dark:bg-white'}`}
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-[0.65rem] text-neutral-400">
                    esta {lim.period === 'semana' ? 'semana' : 'mes'} · queda{' '}
                    {eur(Math.max(0, lim.amount - gastado))}
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
                    onClick={() => borrar(g.id)}
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

      {creando && (
        <Modal title="Nuevo objetivo" onClose={() => setCreando(false)}>
          <div className="mb-4 flex justify-center">
            <Segmented value={tipo} onChange={setTipo} options={TIPOS} />
          </div>
          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              const data = new FormData(ev.currentTarget)
              const title = String(data.get('title') ?? '').trim()
              if (!title) return
              const id = crypto.randomUUID()

              if (tipo === 'idea') {
                setGoals((prev) => [
                  ...prev,
                  { id, kind: 'idea', title, desc: String(data.get('desc') ?? '').trim() || undefined },
                ])
              } else {
                const amount = Number(String(data.get('amount') ?? '').replace(',', '.'))
                if (!Number.isFinite(amount) || amount <= 0) return
                if (tipo === 'meta') {
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
              setCreando(false)
            }}
            className="flex flex-col gap-2"
          >
            <input name="title" maxLength={60} required placeholder="Nombre" className={input} />

            {tipo === 'idea' && (
              <textarea name="desc" maxLength={200} rows={3} placeholder="Detalles" className={input} />
            )}

            {tipo !== 'idea' && (
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder={tipo === 'meta' ? '¿Cuánto quieres tener?' : '¿Cuánto puedes gastar?'}
                aria-label="Cantidad"
                className={`${input} font-mono`}
              />
            )}

            {tipo === 'meta' && (
              <input name="date" type="date" required aria-label="Para cuándo" className={input} />
            )}

            {tipo === 'limite' && (
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
