import { useState } from 'react'
import {
  EXPENSE_CATS,
  INCOME_CATS,
  SUBSCRIPTION_CAT,
  dateKey,
  eur,
  weekIndex,
  type Goal,
  type Movement,
} from '../lib/store'
import { notifyWithUndo } from '../lib/undo'
import { Goals } from './Goals'
import {
  CatChart,
  Empty,
  Icon,
  Label,
  BarChart,
  Modal,
  Segmented,
  button,
  card,
  input,
  line,
  select,
} from '../components/ui'
import { t } from '../lib/i18n'
import { playDrop, playPop } from '../lib/sound'

export type BankTab = 'dinero' | 'ingresos' | 'gastos' | 'objetivos'

type Props = {
  initial: number | null
  setInitial: (update: (prev: number | null) => number | null) => void
  movements: Movement[]
  setMovements: (update: (prev: Movement[]) => Movement[]) => void
  tab: BankTab
  setTab: (tab: BankTab) => void
  goals: Goal[]
  setGoals: (update: (prev: Goal[]) => Goal[]) => void
}

function readAmount(value: FormDataEntryValue | null): number | null {
  const n = Number(String(value ?? '').replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

export function Bank({ initial, setInitial, movements, setMovements, tab, setTab, goals, setGoals }: Props) {
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
          <Label>{t('Primera vez')}</Label>
          <h2 className="text-xl font-semibold">{t('¿Cuánto dinero tienes ahora?')}</h2>
          <p className="text-sm text-neutral-400 dark:text-neutral-500">
            {t('Sólo se pregunta una vez. Queda en tu navegador.')}
          </p>
          <input
            name="start"
            type="number"
            step="0.01"
            required
            autoFocus
            placeholder="0,00"
            aria-label={t('Dinero actual')}
            className={`${input} font-mono`}
          />
          <button type="submit" className={button}>
            {t('Guardar')}
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

  const todayKey = dateKey(today)
  const todayIndex = periodDays.findIndex((d) => dateKey(d) === todayKey)

  const byDay = periodDays.map((d) => {
    const key = dateKey(d)
    const dayMoves = movements.filter((m) => m.date === key)
    const sum = (kind: Movement['kind']) =>
      dayMoves.filter((m) => m.kind === kind).reduce((s, m) => s + m.amount, 0)
    return {
      label: `${key.slice(8)}/${key.slice(5, 7)}`,
      income: sum('ingreso'),
      expense: sum('gasto'),
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

  const data = byDay
  const periodNet = data.reduce((s, d) => s + d.income - d.expense, 0)

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
            { id: 'objetivos', label: 'Objetivos' },
          ]}
        />
      </div>

      {tab === 'dinero' && (
        <>
          <section className={`${card} animate-[fade-in_0.35s_ease-out] overflow-hidden`}>
            <div className="flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
              <div>
                <Label>{t('Dinero actual')}</Label>
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
                  <span>{period === 'semana' ? t('esta semana') : t('este mes')}</span>
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
              <BarChart data={data} todayIndex={todayIndex} />
              <div className="mt-2 flex justify-between font-mono text-[0.65rem] text-neutral-400">
                <span>{data[0].label}</span>
                <span>{data[data.length - 1].label}</span>
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className={`${card} animate-[fade-in_0.35s_ease-out_0.1s_both] p-5 sm:p-6`}>
              <Label>{t('Dónde gastas')}</Label>
              <CatChart data={byCategory(expense, [...EXPENSE_CATS, SUBSCRIPTION_CAT])} tone="bg-red-500" />
            </section>
            <section className={`${card} animate-[fade-in_0.35s_ease-out_0.15s_both] p-5 sm:p-6`}>
              <Label>{t('De dónde viene')}</Label>
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

      {tab === 'objetivos' && (
        <Goals goals={goals} setGoals={setGoals} balance={balance} movements={movements} />
      )}

      {(tab === 'ingresos' || tab === 'gastos') && (
        <MovementPanel
          kind={tab === 'ingresos' ? 'ingreso' : 'gasto'}
          cats={tab === 'ingresos' ? INCOME_CATS : EXPENSE_CATS}
          movements={tab === 'ingresos' ? income : expense}
          onAdd={(m) => setMovements((prev) => [m, ...prev])}
          onEdit={(m) => setMovements((prev) => prev.map((x) => (x.id === m.id ? m : x)))}
          onRemove={(id) => {
            playDrop()
            const before = movements
            setMovements((prev) => prev.filter((m) => m.id !== id))
            notifyWithUndo(t('Movimiento eliminado'), () => setMovements(() => before))
          }}
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
  onEdit,
  onRemove,
}: {
  kind: 'ingreso' | 'gasto'
  cats: string[]
  movements: Movement[]
  onAdd: (m: Movement) => void
  onEdit: (m: Movement) => void
  onRemove: (id: string) => void
}) {
  const positive = kind === 'ingreso'
  const total = movements.reduce((s, m) => s + m.amount, 0)
  const [editingItem, setEditingItem] = useState<Movement | null>(null)

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
          playPop()
          onAdd({
            id: crypto.randomUUID(),
            kind,
            amount,
            category: String(data.get('category')),
            date: String(data.get('date')) || dateKey(new Date()),
            note: String(data.get('note') ?? '').trim() || undefined,
          })
          form.reset()
        }}
        className={`${card} flex flex-col gap-2 p-4 sm:p-5`}
      >
        <Label>{t(positive ? t('Nuevo ingreso') : t('Nuevo gasto'))}</Label>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="0,00"
          aria-label={t('Importe')}
          className={`${input} font-mono text-lg`}
        />
        <input
          name="note"
          maxLength={60}
          placeholder={positive ? t('¿De qué? (opcional)') : t('¿En qué? (opcional)')}
          aria-label={t('Concepto')}
          className={input}
        />
        <div className="flex gap-2">
          <select name="category" defaultValue={cats[0]} aria-label={t('Categoría')} className={select}>
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
            aria-label={t('Fecha')}
            className={input}
          />
        </div>
        <button type="submit" className={button}>
          {positive ? t('Sumar') : t('Restar')}
        </button>
      </form>

      <section className={`${card} animate-[fade-in_0.35s_ease-out] p-5 sm:p-6`}>
        <Label>
          {t(positive ? t('Ingresos') : t('Gastos'))} · {eur(total)}
        </Label>
        {movements.length === 0 ? (
          <Empty>{t('Sin movimientos.')}</Empty>
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
                <button
                  type="button"
                  onClick={() => setEditingItem(m)}
                  className="min-w-0 flex-1 text-left"
                  title={t('Editar')}
                >
                  <span className="block truncate">{m.note || m.category}</span>
                  {m.note && (
                    <span className="block truncate text-[0.7rem] text-neutral-400 dark:text-neutral-500">
                      {m.category}
                    </span>
                  )}
                </button>
                <span className="shrink-0 font-mono text-[0.7rem] text-neutral-400">
                  {m.date.slice(8)}/{m.date.slice(5, 7)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(m.id)}
                  aria-label={t('Eliminar movimiento')}
                  className="shrink-0 text-neutral-500 transition-colors hover:text-red-500 dark:text-neutral-500"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editingItem && (
        <Modal title={positive ? t('Ingreso') : t('Gasto')} onClose={() => setEditingItem(null)}>
          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              const data = new FormData(ev.currentTarget)
              const amount = readAmount(data.get('amount'))
              if (amount === null) return
              onEdit({
                ...editingItem,
                amount,
                category: String(data.get('category')),
                date: String(data.get('date')) || editingItem.date,
                note: String(data.get('note') ?? '').trim() || undefined,
              })
              setEditingItem(null)
            }}
            className="flex flex-col gap-2"
          >
            <input
              name="note"
              defaultValue={editingItem.note}
              maxLength={60}
              placeholder={t('Concepto')}
              aria-label={t('Concepto')}
              className={input}
            />
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={editingItem.amount}
              required
              aria-label={t('Importe')}
              className={`${input} font-mono`}
            />
            <div className="flex gap-2">
              <select
                name="category"
                defaultValue={editingItem.category}
                aria-label={t('Categoría')}
                className={select}
              >
                {[...new Set([...cats, editingItem.category])].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                name="date"
                type="date"
                defaultValue={editingItem.date}
                aria-label={t('Fecha')}
                className={input}
              />
            </div>
            <button type="submit" className={`${button} mt-2`}>
              {t('Guardar')}
            </button>
          </form>
        </Modal>
      )}
    </>
  )
}
