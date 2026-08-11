import { useState } from 'react'
import { EXPENSE_CATS, INCOME_CATS, dateKey, eur, weekIndex, type Movement } from '../lib/store'
import { CatChart, Empty, Icon, Label, BarChart, Segmented, button, card, input, line, select } from '../components/ui'

export type BankTab = 'dinero' | 'ingresos' | 'gastos'

type Props = {
  initial: number | null
  setInitial: (update: (prev: number | null) => number | null) => void
  movements: Movement[]
  setMovements: (update: (prev: Movement[]) => Movement[]) => void
  tab: BankTab
  setTab: (tab: BankTab) => void
}

function readAmount(value: FormDataEntryValue | null): number | null {
  const n = Number(String(value ?? '').replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

export function Bank({ initial, setInitial, movements, setMovements, tab, setTab }: Props) {
  const [period, setPeriod] = useState<'semana' | 'mes'>('semana')

  if (initial === null) {
    return (
      <div className="mx-auto w-full max-w-md">
        <form
          onSubmit={(ev) => {
            ev.preventDefault()
            const n = Number(String(new FormData(ev.currentTarget).get('start') ?? '').replace(',', '.'))
            if (!Number.isFinite(n)) return
            setInitial(() => Math.round(n * 100) / 100)
          }}
          className={`${card} animate-[fade-in_0.4s_ease-out] flex flex-col gap-3 p-6`}
        >
          <Label>Primera vez</Label>
          <h2 className="text-xl font-semibold">¿Cuánto dinero tienes ahora?</h2>
          <p className="text-sm text-neutral-400 dark:text-neutral-500">
            Sólo se pregunta una vez. Queda en tu navegador.
          </p>
          <input
            name="start"
            type="number"
            step="0.01"
            required
            autoFocus
            placeholder="0,00"
            aria-label="Dinero actual"
            className={`${input} font-mono`}
          />
          <button type="submit" className={button}>
            Guardar
          </button>
        </form>
      </div>
    )
  }

  const income = movements.filter((m) => m.kind === 'ingreso')
  const expense = movements.filter((m) => m.kind === 'gasto')
  const balance =
    initial + income.reduce((s, m) => s + m.amount, 0) - expense.reduce((s, m) => s + m.amount, 0)

  const today = new Date()
  const periodDays =
    period === 'semana'
      ? Array.from(
          { length: 7 },
          (_, i) =>
            new Date(today.getFullYear(), today.getMonth(), today.getDate() - weekIndex(today) + i),
        )
      : Array.from(
          { length: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() },
          (_, i) => new Date(today.getFullYear(), today.getMonth(), i + 1),
        )

  const netByDay = periodDays.map((d) => {
    const key = dateKey(d)
    return {
      label: `${key.slice(8)}/${key.slice(5, 7)}`,
      value: movements
        .filter((m) => m.date === key)
        .reduce((s, m) => s + (m.kind === 'ingreso' ? m.amount : -m.amount), 0),
    }
  })

  const byCategory = (list: Movement[], cats: string[]) =>
    cats
      .map((label) => ({
        label,
        value: list.filter((m) => m.category === label).reduce((s, m) => s + m.amount, 0),
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value)

  const data = netByDay
  const periodNet = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="md:hidden">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { id: 'dinero', label: 'Dinero' },
            { id: 'ingresos', label: 'Ingresos' },
            { id: 'gastos', label: 'Gastos' },
          ]}
        />
      </div>

      {tab === 'dinero' && (
        <>
          <section className={`${card} animate-[fade-in_0.35s_ease-out] overflow-hidden`}>
            <div className="flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
              <div>
                <Label>Dinero actual</Label>
                <p
                  className={`font-mono text-4xl font-medium tracking-tight tabular-nums sm:text-5xl ${
                    balance < 0 ? 'text-red-500' : ''
                  }`}
                >
                  {eur(balance)}
                </p>
                <p className="mt-2 flex items-center gap-2 text-[0.7rem] text-neutral-400">
                  <span
                    className={`grid h-4 w-4 place-items-center rounded-full ${
                      periodNet < 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-600'
                    }`}
                  >
                    <Icon name="up" className={`h-2.5 w-2.5 ${periodNet < 0 ? 'rotate-180' : ''}`} />
                  </span>
                  <span className={periodNet < 0 ? 'text-red-500' : 'text-green-600'}>
                    {periodNet >= 0 ? '+' : ''}
                    {eur(periodNet)}
                  </span>
                  <span>{period === 'semana' ? 'esta semana' : 'este mes'}</span>
                </p>
              </div>
              <Segmented
                value={period}
                onChange={setPeriod}
                options={[
                  { id: 'semana', label: 'Semana' },
                  { id: 'mes', label: 'Mes' },
                ]}
              />
            </div>
            <div className={`border-t px-5 pt-5 pb-4 sm:px-6 ${line}`}>
              <BarChart data={data} />
              <div className="mt-2 flex justify-between font-mono text-[0.65rem] text-neutral-400">
                <span>{data[0].label}</span>
                <span>{data[data.length - 1].label}</span>
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className={`${card} animate-[fade-in_0.35s_ease-out_0.1s_both] p-5 sm:p-6`}>
              <Label>Dónde gastas</Label>
              <CatChart data={byCategory(expense, EXPENSE_CATS)} tone="bg-red-500" />
            </section>
            <section className={`${card} animate-[fade-in_0.35s_ease-out_0.15s_both] p-5 sm:p-6`}>
              <Label>De dónde viene</Label>
              <CatChart data={byCategory(income, INCOME_CATS)} tone="bg-green-500" />
            </section>
          </div>

          <button
            type="button"
            onClick={() => setInitial(() => null)}
            className="self-start text-[0.7rem] text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
          >
            Cambiar dinero inicial ({eur(initial)})
          </button>
        </>
      )}

      {tab !== 'dinero' && (
        <MovementPanel
          kind={tab === 'ingresos' ? 'ingreso' : 'gasto'}
          cats={tab === 'ingresos' ? INCOME_CATS : EXPENSE_CATS}
          movements={tab === 'ingresos' ? income : expense}
          onAdd={(m) => setMovements((prev) => [m, ...prev])}
          onRemove={(id) => setMovements((prev) => prev.filter((m) => m.id !== id))}
        />
      )}
    </div>
  )
}

function MovementPanel({
  kind,
  cats,
  movements,
  onAdd,
  onRemove,
}: {
  kind: 'ingreso' | 'gasto'
  cats: string[]
  movements: Movement[]
  onAdd: (m: Movement) => void
  onRemove: (id: string) => void
}) {
  const positive = kind === 'ingreso'
  const total = movements.reduce((s, m) => s + m.amount, 0)

  return (
    <>
      <form
        key={kind}
        onSubmit={(ev) => {
          ev.preventDefault()
          const form = ev.currentTarget
          const data = new FormData(form)
          const amount = readAmount(data.get('amount'))
          if (amount === null) return
          onAdd({
            id: crypto.randomUUID(),
            kind,
            amount,
            category: String(data.get('category')),
            date: String(data.get('date')) || dateKey(new Date()),
          })
          form.reset()
        }}
        className={`${card} flex flex-col gap-2 p-4 sm:p-5`}
      >
        <Label>{positive ? 'Nuevo ingreso' : 'Nuevo gasto'}</Label>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="0,00"
          aria-label="Importe"
          className={`${input} font-mono text-lg`}
        />
        <div className="flex gap-2">
          <select name="category" defaultValue={cats[0]} aria-label="Categoría" className={select}>
            {cats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            name="date"
            type="date"
            defaultValue={dateKey(new Date())}
            aria-label="Fecha"
            className={input}
          />
        </div>
        <button type="submit" className={button}>
          {positive ? 'Sumar' : 'Restar'}
        </button>
      </form>

      <section className={`${card} animate-[fade-in_0.35s_ease-out] p-5 sm:p-6`}>
        <Label>
          {positive ? 'Ingresos' : 'Gastos'} · {eur(total)}
        </Label>
        {movements.length === 0 ? (
          <Empty>Sin movimientos.</Empty>
        ) : (
          <ul className="flex flex-col">
            {movements.map((m) => (
              <li
                key={m.id}
                className={`flex items-center gap-3 border-b py-3 text-sm last:border-0 ${line}`}
              >
                <span
                  className={`w-24 shrink-0 font-mono tabular-nums ${positive ? 'text-green-600' : 'text-red-500'}`}
                >
                  {positive ? '+' : '−'}
                  {eur(m.amount)}
                </span>
                <span className="min-w-0 flex-1 truncate">{m.category}</span>
                <span className="shrink-0 font-mono text-[0.7rem] text-neutral-400">
                  {m.date.slice(8)}/{m.date.slice(5, 7)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(m.id)}
                  aria-label="Eliminar movimiento"
                  className="shrink-0 text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
