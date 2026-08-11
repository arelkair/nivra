import {
  EXPENSE_CATS,
  INCOME_CATS,
  dateKey,
  eur,
  type Movement,
} from './store'
import { CatChart, Empty, Icon, Label, NetChart, button, card, input, select } from './ui'

export type BankTab = 'dinero' | 'ingresos' | 'gastos'

type Props = {
  initial: number | null
  setInitial: (update: (prev: number | null) => number | null) => void
  movements: Movement[]
  setMovements: (update: (prev: Movement[]) => Movement[]) => void
  tab: BankTab
  setTab: (tab: BankTab) => void
}

/** Lee un importe de un formulario. Devuelve null si no es un número positivo. */
function readAmount(value: FormDataEntryValue | null): number | null {
  const n = Number(String(value ?? '').replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

export function Bank({ initial, setInitial, movements, setMovements, tab, setTab }: Props) {
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
          <h2 className="text-xl font-semibold">¿Cuánto dinero tienes ahora?</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
            className={input}
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
    initial +
    income.reduce((s, m) => s + m.amount, 0) -
    expense.reduce((s, m) => s + m.amount, 0)

  const netByDay = (days: number) =>
    Array.from({ length: days }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (days - 1 - i))
      const key = dateKey(d)
      const value = movements
        .filter((m) => m.date === key)
        .reduce((s, m) => s + (m.kind === 'ingreso' ? m.amount : -m.amount), 0)
      return { label: key, value }
    })

  const byCategory = (list: Movement[], cats: string[]) =>
    cats
      .map((label) => ({
        label,
        value: list.filter((m) => m.category === label).reduce((s, m) => s + m.amount, 0),
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value)

  const TABS: { id: BankTab; label: string }[] = [
    { id: 'dinero', label: 'Dinero' },
    { id: 'ingresos', label: 'Ingresos' },
    { id: 'gastos', label: 'Gastos' },
  ]

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex gap-1 rounded-2xl border border-neutral-200 p-1 md:hidden dark:border-neutral-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl py-2 text-sm transition-colors ${
              tab === t.id
                ? 'bg-neutral-900 font-medium text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dinero' && (
        <>
          <section className={`${card} animate-[fade-in_0.35s_ease-out] p-6`}>
            <Label>Dinero actual</Label>
            <p
              className={`font-display text-4xl font-semibold tabular-nums sm:text-5xl ${
                balance < 0 ? 'text-red-500' : ''
              }`}
            >
              {eur(balance)}
            </p>
            <button
              type="button"
              onClick={() => setInitial(() => null)}
              className="mt-4 text-xs text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              Cambiar dinero inicial ({eur(initial)})
            </button>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className={`${card} animate-[fade-in_0.35s_ease-out_0.05s_both] p-5 sm:p-6`}>
              <Label>Esta semana</Label>
              <NetChart data={netByDay(7)} />
            </section>
            <section className={`${card} animate-[fade-in_0.35s_ease-out_0.1s_both] p-5 sm:p-6`}>
              <Label>Este mes</Label>
              <NetChart data={netByDay(30)} />
            </section>
            <section className={`${card} animate-[fade-in_0.35s_ease-out_0.15s_both] p-5 sm:p-6`}>
              <Label>Dónde gastas</Label>
              <CatChart data={byCategory(expense, EXPENSE_CATS)} tone="bg-red-500/80" />
            </section>
            <section className={`${card} animate-[fade-in_0.35s_ease-out_0.2s_both] p-5 sm:p-6`}>
              <Label>De dónde viene</Label>
              <CatChart data={byCategory(income, INCOME_CATS)} tone="bg-green-500/80" />
            </section>
          </div>
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
          if (amount === null) return // ponytail: importe no válido, no se toca el saldo
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
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder={positive ? '¿Cuánto has ganado?' : '¿Cuánto has gastado?'}
          aria-label="Importe"
          className={input}
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
                className="flex items-center gap-3 border-b border-neutral-100 py-3 text-sm last:border-0 dark:border-neutral-800"
              >
                <span
                  className={`w-20 shrink-0 tabular-nums ${positive ? 'text-green-600 dark:text-green-500' : 'text-red-500'}`}
                >
                  {positive ? '+' : '−'}
                  {eur(m.amount)}
                </span>
                <span className="min-w-0 flex-1 truncate">{m.category}</span>
                <span className="shrink-0 text-xs text-neutral-400 dark:text-neutral-500">
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
