import { useState } from 'react'
import { EXPENSE_CATS, INCOME_CATS, MAIN_ACCOUNT, SUBSCRIPTION_CAT, accountBalances, accountOf, dateKey, eur, type BankAccount, type Goal, type Movement } from '../../lib/store'
import { notifyWithUndo } from '../../lib/undo'
import { locale, t } from '../../lib/i18n'
import { playDrop, playPop } from '../../lib/sound'
import { Icon } from '../ui'
import { MoneyGoals } from './MoneyGoals'
import { download, inRange, parseAmount, periodRange, signed, sum, toCsv, type Period } from './moneyCalc'
import { skin, type Skin } from './skin'

type Props = {
  initial: number | null
  setInitial: (update: (prev: number | null) => number | null) => void
  movements: Movement[]
  setMovements: (update: (prev: Movement[]) => Movement[]) => void
  accounts: BankAccount[]
  setAccounts: (update: (prev: BankAccount[]) => BankAccount[]) => void
  goals: Goal[]
  setGoals: (update: (prev: Goal[]) => Goal[]) => void
  dark: boolean
}

type Tab = 'resumen' | 'movimientos' | 'objetivos'
type KindFilter = 'todos' | 'ingreso' | 'gasto'

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'movimientos', label: 'Movimientos' },
  { id: 'objetivos', label: 'Objetivos' },
]

const PERIODS: { id: Period; label: string }[] = [
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'año', label: 'Año' },
]

const allCats = (kind: Movement['kind']) => (kind === 'ingreso' ? INCOME_CATS : [...EXPENSE_CATS, SUBSCRIPTION_CAT])

export function InitiativeMoney({ initial, setInitial, movements, setMovements, accounts, setAccounts, goals, setGoals, dark }: Props) {
  const s = skin(dark)
  const [tab, setTab] = useState<Tab>('resumen')
  const [period, setPeriod] = useState<Period>('mes')
  const [offset, setOffset] = useState(0)
  const [setup, setSetup] = useState('')
  const [acct, setAcct] = useState('all')

  if (initial === null) {
    const value = Number(setup.trim().replace(',', '.'))
    const valid = setup.trim() !== '' && Number.isFinite(value)
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 py-10">
        <p className={`font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`}>{t('Primera vez')}</p>
        <h1 className="font-initiative text-3xl font-medium tracking-tight">{t('¿Cuánto dinero tienes ahora?')}</h1>
        <p className={`text-sm ${s.muted}`}>{t('Sólo se pregunta una vez. Queda en tu navegador.')}</p>
        <form
          onSubmit={(ev) => {
            ev.preventDefault()
            if (valid) setInitial(() => Math.round(value * 100) / 100)
          }}
          className="flex gap-2"
        >
          <input
            value={setup}
            onChange={(e) => setSetup(e.target.value)}
            inputMode="decimal"
            autoFocus
            placeholder="0,00"
            aria-label={t('Dinero actual')}
            className={`${s.field} font-mono text-lg`}
          />
          <button type="submit" disabled={!valid} className={`rounded-lg px-5 text-sm font-medium transition-colors disabled:opacity-30 ${s.primary}`}>
            {t('Guardar')}
          </button>
        </form>
      </div>
    )
  }

  const balances = accountBalances(initial, accounts, movements)
  const balance = Object.values(balances).reduce((a, x) => a + x, 0)
  const selected = acct !== 'all' && (acct === MAIN_ACCOUNT || accounts.some((x) => x.id === acct)) ? acct : 'all'
  const scoped = selected === 'all' ? movements : movements.filter((m) => accountOf(m, accounts) === selected)
  const shownBalance = selected === 'all' ? balance : balances[selected]
  const extra = accounts.find((x) => x.id === selected) ?? null
  const scopedInitial = selected === 'all' ? initial + accounts.reduce((a, x) => a + x.initial, 0) : extra ? extra.initial : initial
  const nameOf = (id: string) => (id === MAIN_ACCOUNT ? t('Principal') : accounts.find((x) => x.id === id)?.name ?? t('Principal'))
  const range = periodRange(period, offset)
  const inPeriod = scoped.filter((m) => inRange(m, range.from, range.to))

  const addAccount = (name: string, start: number) => {
    const id = crypto.randomUUID()
    setAccounts((prev) => [...prev, { id, name, initial: start }])
    setAcct(id)
  }

  const removeAccount = (id: string) => {
    const beforeAccounts = accounts
    const beforeMovements = movements
    setMovements((prev) => prev.filter((m) => accountOf(m, accounts) !== id))
    setAccounts((prev) => prev.filter((x) => x.id !== id))
    setAcct('all')
    notifyWithUndo(t('Cuenta eliminada'), () => {
      setAccounts(() => beforeAccounts)
      setMovements(() => beforeMovements)
    })
  }
  const income = sum(inPeriod, 'ingreso')
  const expense = sum(inPeriod, 'gasto')
  const net = income - expense

  const label = `font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={label}>{selected === 'all' ? (accounts.length > 0 ? t('Dinero total') : t('Dinero actual')) : nameOf(selected)}</p>
          <h1
            className={`font-initiative text-4xl font-medium tracking-tight tabular-nums sm:text-5xl ${shownBalance < 0 ? 'text-red-500' : ''}`}
          >
            {eur(shownBalance)}
          </h1>
        </div>
        <div className={`flex rounded-lg border p-0.5 ${s.line}`}>
          {TABS.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTab(x.id)}
              aria-pressed={tab === x.id}
              className={`rounded-md px-3 py-1 text-xs transition-colors ${tab === x.id ? s.active : `${s.muted} ${s.hoverText}`}`}
            >
              {t(x.label)}
            </button>
          ))}
        </div>
      </div>

      {tab !== 'objetivos' && (
        <AccountBar
          s={s}
          accounts={accounts}
          balances={balances}
          selected={selected}
          onSelect={setAcct}
          onAdd={addAccount}
          mainName={t('Principal')}
        />
      )}

      {tab !== 'objetivos' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setOffset(offset - 1)} aria-label={t('Anterior')} className={s.iconButton}>
              <Icon name="left" className="h-4 w-4" />
            </button>
            <span className="min-w-36 text-center text-sm font-medium first-letter:uppercase">{range.title}</span>
            <button type="button" onClick={() => setOffset(offset + 1)} aria-label={t('Siguiente')} className={s.iconButton}>
              <Icon name="right" className="h-4 w-4" />
            </button>
            {offset !== 0 && (
              <button type="button" onClick={() => setOffset(0)} className={s.ghost}>
                {t('Hoy')}
              </button>
            )}
          </div>
          <div className={`flex rounded-lg border p-0.5 ${s.line}`}>
            {PERIODS.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => {
                  setPeriod(x.id)
                  setOffset(0)
                }}
                aria-pressed={period === x.id}
                className={`rounded-md px-3 py-1 text-xs transition-colors ${period === x.id ? s.active : `${s.muted} ${s.hoverText}`}`}
              >
                {t(x.label)}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'resumen' && (
        <Summary
          s={s}
          dark={dark}
          movements={scoped}
          inPeriod={inPeriod}
          initial={scopedInitial}
          initialField={
            selected === 'all'
              ? null
              : { value: extra ? extra.initial : initial, onChange: (n) => (extra ? setAccounts((prev) => prev.map((x) => (x.id === extra.id ? { ...x, initial: n } : x))) : setInitial(() => n)) }
          }
          account={extra}
          onRename={(name) => extra && setAccounts((prev) => prev.map((x) => (x.id === extra.id ? { ...x, name } : x)))}
          onRemoveAccount={() => extra && removeAccount(extra.id)}
          accountName={accounts.length > 0 ? (m) => nameOf(accountOf(m, accounts)) : undefined}
          period={period}
          offset={offset}
          income={income}
          expense={expense}
          net={net}
        />
      )}

      {tab === 'movimientos' && (
        <Movements s={s} inPeriod={inPeriod} movements={movements} setMovements={setMovements} accounts={accounts} selected={selected} nameOf={nameOf} />
      )}

      {tab === 'objetivos' && <MoneyGoals goals={goals} setGoals={setGoals} balance={balance} movements={movements} dark={dark} />}
    </div>
  )
}

function Summary({
  s,
  dark,
  movements,
  inPeriod,
  initial,
  initialField,
  account,
  onRename,
  onRemoveAccount,
  accountName,
  period,
  offset,
  income,
  expense,
  net,
}: {
  s: Skin
  dark: boolean
  movements: Movement[]
  inPeriod: Movement[]
  initial: number
  initialField: { value: number; onChange: (n: number) => void } | null
  account: BankAccount | null
  onRename: (name: string) => void
  onRemoveAccount: () => void
  accountName?: (m: Movement) => string
  period: Period
  offset: number
  income: number
  expense: number
  net: number
}) {
  const range = periodRange(period, offset)
  const todayKey = dateKey(new Date())
  const label = `font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`
  const card = `rounded-2xl border ${s.line} ${s.panel}`

  const buckets = range.buckets.map((b) => {
    const list = movements.filter((m) => inRange(m, b.from, b.to))
    const upTo = movements.filter((m) => m.date <= b.to)
    return {
      ...b,
      income: sum(list, 'ingreso'),
      expense: sum(list, 'gasto'),
      balance: initial + upTo.reduce((a, m) => a + signed(m), 0),
      isNow: todayKey >= b.from && todayKey <= b.to,
    }
  })
  const maxBar = Math.max(1, ...buckets.map((b) => Math.max(b.income, b.expense)))
  const balances = buckets.map((b) => b.balance)
  const minB = Math.min(...balances)
  const maxB = Math.max(...balances)
  const spanB = Math.max(1, maxB - minB)
  const points = buckets
    .map((b, i) => `${(i / Math.max(1, buckets.length - 1)) * 100},${36 - ((b.balance - minB) / spanB) * 32}`)
    .join(' ')

  const byCategory = (kind: Movement['kind']) => {
    const totals = new Map<string, number>()
    for (const m of inPeriod.filter((x) => x.kind === kind)) totals.set(m.category, (totals.get(m.category) ?? 0) + m.amount)
    return [...totals.entries()].sort((a, b) => b[1] - a[1])
  }
  const expenseCats = byCategory('gasto')
  const incomeCats = byCategory('ingreso')

  const expenses = inPeriod.filter((m) => m.kind === 'gasto')
  const biggest = [...expenses].sort((a, b) => b.amount - a.amount)[0]
  const today = new Date()
  const start = new Date(range.from)
  const elapsedDays =
    period === 'año'
      ? Math.max(1, Math.round((Math.min(today.getTime(), new Date(`${range.to}T23:59:59`).getTime()) - start.getTime()) / 86400000) + 1)
      : Math.max(1, Math.min(range.daysTotal, range.buckets.filter((b) => b.from <= todayKey).length || range.daysTotal))
  const perDay = expense / (offset === 0 ? elapsedDays : range.daysTotal)
  const projection = offset === 0 && period !== 'semana' ? perDay * range.daysTotal : null

  const stats = [
    { title: t('Ingresos'), value: eur(income), tone: 'text-emerald-500' },
    { title: t('Gastos'), value: eur(expense), tone: 'text-red-500' },
    { title: t('Balance del periodo'), value: `${net >= 0 ? '+' : ''}${eur(net)}`, tone: net < 0 ? 'text-red-500' : 'text-emerald-500' },
    { title: t('Gasto medio al día'), value: eur(perDay), tone: '' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className={`grid grid-cols-2 divide-x divide-y overflow-hidden ${card} sm:grid-cols-4 sm:divide-y-0 ${s.divide}`}>
        {stats.map((x) => (
          <div key={x.title} className="flex min-w-0 flex-col gap-1.5 px-4 py-4">
            <span className={`truncate font-mono text-xl font-semibold tabular-nums ${x.tone}`}>{x.value}</span>
            <span className={`text-[0.65rem] tracking-wide uppercase ${s.muted}`}>{x.title}</span>
          </div>
        ))}
      </div>

      <section className={`flex flex-col gap-4 p-4 ${card}`}>
        <div className="flex items-center justify-between">
          <p className={label}>{t('Ingresos y gastos')}</p>
          <span className={`flex items-center gap-3 text-[0.65rem] ${s.muted}`}>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-emerald-500" />
              {t('Ingresos')}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-red-500" />
              {t('Gastos')}
            </span>
          </span>
        </div>
        <div className="flex h-36 items-end gap-px sm:gap-1">
          {buckets.map((b) => (
            <div
              key={b.key}
              title={`${b.label} · +${eur(b.income)} / −${eur(b.expense)}`}
              className={`flex h-full min-w-0 flex-1 items-end justify-center gap-px rounded-sm px-px ${b.isNow ? (dark ? 'bg-white/[0.06]' : 'bg-black/[0.05]') : ''}`}
            >
              <div className="w-full max-w-3 rounded-t-sm bg-emerald-500" style={{ height: `${(b.income / maxBar) * 100}%`, minHeight: b.income > 0 ? 2 : 0 }} />
              <div className="w-full max-w-3 rounded-t-sm bg-red-500" style={{ height: `${(b.expense / maxBar) * 100}%`, minHeight: b.expense > 0 ? 2 : 0 }} />
            </div>
          ))}
        </div>
        <div className={`flex justify-between font-mono text-[0.65rem] ${s.faint}`}>
          <span>{buckets[0].label}</span>
          <span>{buckets[buckets.length - 1].label}</span>
        </div>
        <div className={`border-t pt-4 ${s.line}`}>
          <p className={`mb-2 ${label}`}>{t('Evolución del saldo')}</p>
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-16 w-full" aria-hidden>
            <polyline points={points} fill="none" stroke={dark ? '#fff' : '#171717'} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
          <div className={`flex justify-between font-mono text-[0.65rem] tabular-nums ${s.faint}`}>
            <span>{eur(balances[0])}</span>
            <span>{eur(balances[balances.length - 1])}</span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <CategoryList title={t('Dónde gastas')} rows={expenseCats} total={expense} tone="bg-red-500" s={s} dark={dark} />
        <CategoryList title={t('De dónde viene')} rows={incomeCats} total={income} tone="bg-emerald-500" s={s} dark={dark} />
      </div>

      <section className={`flex flex-col gap-2 p-4 ${card}`}>
        <p className={label}>{t('Datos curiosos')}</p>
        <ul className={`flex flex-col gap-1.5 text-sm ${s.muted}`}>
          {biggest ? (
            <li>
              {t('Mayor gasto')}: <span className={s.strong}>{biggest.note || biggest.category}</span>{' '}
              <span className="font-mono text-red-500">{eur(biggest.amount)}</span>
            </li>
          ) : (
            <li>{t('Sin gastos en este periodo.')}</li>
          )}
          {expenseCats[0] && (
            <li>
              {t('Categoría con más gasto')}: <span className={s.strong}>{expenseCats[0][0]}</span>{' '}
              <span className="font-mono">({Math.round((expenseCats[0][1] / Math.max(1, expense)) * 100)} %)</span>
            </li>
          )}
          {projection !== null && expense > 0 && (
            <li>
              {t('A este ritmo gastarás')} <span className={`font-mono ${s.strong}`}>{eur(projection)}</span>{' '}
              {period === 'mes' ? t('este mes') : t('este año')}
            </li>
          )}
        </ul>
      </section>

      <section className={`flex flex-wrap items-center gap-3 p-4 ${card}`}>
        {account && (
          <label className={`flex items-center gap-2 text-xs ${s.muted}`}>
            {t('Nombre')}
            <input key={account.id} defaultValue={account.name} maxLength={30} onBlur={(e) => e.target.value.trim() && onRename(e.target.value.trim())} className={`${s.field} !w-36 !py-1.5 text-xs`} />
          </label>
        )}
        {initialField && (
          <label className={`flex items-center gap-2 text-xs ${s.muted}`}>
            {t('Dinero inicial')}
            <input
              key={`${account?.id ?? 'main'}-${initialField.value}`}
              defaultValue={initialField.value}
              inputMode="decimal"
              onBlur={(e) => {
                const n = Number(e.target.value.trim().replace(',', '.'))
                if (Number.isFinite(n)) initialField.onChange(Math.round(n * 100) / 100)
              }}
              className={`${s.field} !w-32 !py-1.5 font-mono text-xs`}
            />
          </label>
        )}
        {account && (
          <button type="button" onClick={onRemoveAccount} className={`flex items-center gap-1.5 text-xs ${s.muted} transition-colors hover:text-red-500`}>
            <Icon name="trash" className="h-3.5 w-3.5" />
            {t('Eliminar cuenta')}
          </button>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => download('nivra-movimientos.csv', toCsv(movements, accountName))}
          disabled={movements.length === 0}
          className={`${s.ghost} disabled:opacity-40`}
        >
          {t('Exportar CSV')}
        </button>
      </section>
    </div>
  )
}

function CategoryList({
  title,
  rows,
  total,
  tone,
  s,
  dark,
}: {
  title: string
  rows: [string, number][]
  total: number
  tone: string
  s: Skin
  dark: boolean
}) {
  return (
    <section className={`flex flex-col gap-3 rounded-2xl border p-4 ${s.line} ${s.panel}`}>
      <p className={`font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`}>{title}</p>
      {rows.length === 0 ? (
        <p className={`font-mono text-xs ${s.faint}`}>{t('Sin movimientos.')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(([name, value]) => (
            <li key={name} className="flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <span className={`shrink-0 font-mono text-xs tabular-nums ${s.muted}`}>
                  {eur(value)} · {Math.round((value / Math.max(1, total)) * 100)} %
                </span>
              </span>
              <span className={`h-1 overflow-hidden rounded-full ${dark ? 'bg-white/10' : 'bg-black/[0.07]'}`}>
                <span className={`block h-full rounded-full ${tone}`} style={{ width: `${(value / Math.max(1, total)) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Movements({
  s,
  inPeriod,
  movements,
  setMovements,
  accounts,
  selected,
  nameOf,
}: {
  s: Skin
  inPeriod: Movement[]
  movements: Movement[]
  setMovements: (update: (prev: Movement[]) => Movement[]) => void
  accounts: BankAccount[]
  selected: string
  nameOf: (id: string) => string
}) {
  const [kind, setKind] = useState<Movement['kind']>('gasto')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [category, setCategory] = useState(allCats('gasto')[0])
  const [date, setDate] = useState(dateKey(new Date()))
  const [filter, setFilter] = useState<KindFilter>('todos')
  const [catFilter, setCatFilter] = useState('')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [formAccount, setFormAccount] = useState<string | null>(null)
  const targetAccount = formAccount ?? (selected === 'all' ? MAIN_ACCOUNT : selected)

  const parsed = parseAmount(amount)
  const label = `font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`

  const switchKind = (next: Movement['kind']) => {
    setKind(next)
    setCategory(allCats(next)[0])
  }

  const add = () => {
    if (parsed === null) return
    playPop()
    setMovements((prev) => [
      { id: crypto.randomUUID(), kind, amount: parsed, category, date: date || dateKey(new Date()), note: note.trim() || undefined, account: targetAccount === MAIN_ACCOUNT ? undefined : targetAccount },
      ...prev,
    ])
    setAmount('')
    setNote('')
  }

  const patch = (id: string, changes: Partial<Movement>) =>
    setMovements((prev) => prev.map((m) => (m.id === id ? { ...m, ...changes } : m)))

  const remove = (id: string) => {
    playDrop()
    const before = movements
    setMovements((prev) => prev.filter((m) => m.id !== id))
    setOpenId(null)
    notifyWithUndo(t('Movimiento eliminado'), () => setMovements(() => before))
  }

  const q = query.trim().toLowerCase()
  const visible = inPeriod
    .filter((m) => filter === 'todos' || m.kind === filter)
    .filter((m) => !catFilter || m.category === catFilter)
    .filter((m) => !q || `${m.note ?? ''} ${m.category}`.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date))

  const groups = [...new Set(visible.map((m) => m.date))]
  const usedCats = [...new Set(inPeriod.map((m) => m.category))].sort()
  const total = visible.reduce((a, m) => a + signed(m), 0)

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          add()
        }}
        className={`flex flex-col gap-3 rounded-2xl border p-3 ${s.line} ${s.panel}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex rounded-lg border p-0.5 ${s.line}`}>
            {(['gasto', 'ingreso'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => switchKind(k)}
                aria-pressed={kind === k}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors ${kind === k ? s.active : `${s.muted} ${s.hoverText}`}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${k === 'gasto' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                {k === 'gasto' ? t('Gasto') : t('Ingreso')}
              </button>
            ))}
          </div>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            aria-label={t('Importe')}
            className={`${s.field} !w-32 font-mono`}
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={60}
            placeholder={kind === 'ingreso' ? t('¿De qué? (opcional)') : t('¿En qué? (opcional)')}
            aria-label={t('Concepto')}
            className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-neutral-500 sm:text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t('Categoría')} className={`${s.field} !w-auto !py-1.5 text-xs`}>
            {allCats(kind).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label={t('Fecha')} className={`${s.field} !w-auto !py-1.5 text-xs`} />
          {accounts.length > 0 && (
            <select value={targetAccount} onChange={(e) => setFormAccount(e.target.value)} aria-label={t('Cuenta')} className={`${s.field} !w-auto !py-1.5 text-xs`}>
              <option value={MAIN_ACCOUNT}>{t('Principal')}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
          <span className="flex-1" />
          <button
            type="submit"
            disabled={parsed === null}
            aria-label={t('Añadir')}
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors disabled:opacity-30 ${s.primary}`}
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <div className={`flex rounded-lg border p-0.5 ${s.line}`}>
          {(['todos', 'ingreso', 'gasto'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              aria-pressed={filter === k}
              className={`rounded-md px-3 py-1 text-xs transition-colors ${filter === k ? s.active : `${s.muted} ${s.hoverText}`}`}
            >
              {k === 'todos' ? t('Todos') : k === 'ingreso' ? t('Ingresos') : t('Gastos')}
            </button>
          ))}
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label={t('Categoría')} className={`${s.field} !w-auto !py-1.5 text-xs`}>
          <option value="">{t('Todas las categorías')}</option>
          {usedCats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Buscar')}
          aria-label={t('Buscar')}
          className={`${s.field} min-w-32 flex-1 !py-1.5 text-xs`}
        />
      </div>

      {visible.length === 0 ? (
        <p className={`font-mono text-sm ${s.faint}`}>{t('Sin movimientos.')}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <p className={`font-mono text-xs ${s.muted}`}>
            {visible.length} · {total >= 0 ? '+' : ''}
            {eur(total)}
          </p>
          {groups.map((day) => {
            const [y, mo, d] = day.split('-').map(Number)
            const list = visible.filter((m) => m.date === day)
            return (
              <section key={day} className="flex flex-col gap-2">
                <p className={label}>
                  {new Date(y, mo - 1, d).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <ul className={`flex flex-col divide-y overflow-hidden rounded-2xl border ${s.line} ${s.divide}`}>
                  {list.map((m) => {
                    const open = openId === m.id
                    const pos = m.kind === 'ingreso'
                    return (
                      <li key={m.id} className={open ? s.panel : ''}>
                        <button type="button" onClick={() => setOpenId(open ? null : m.id)} aria-expanded={open} title={t('Editar')} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                          <span className={`w-24 shrink-0 font-mono text-sm tabular-nums ${pos ? 'text-emerald-500' : 'text-red-500'}`}>
                            {pos ? '+' : '−'}
                            {eur(m.amount)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{m.note || m.category}</span>
                            {(m.note || (accounts.length > 0 && selected === 'all')) && (
                              <span className={`block truncate text-[0.7rem] ${s.faint}`}>
                                {[m.note ? m.category : '', accounts.length > 0 && selected === 'all' ? nameOf(accountOf(m, accounts)) : ''].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </span>
                          <Icon name={open ? 'up' : 'down'} className={`h-3.5 w-3.5 shrink-0 ${s.muted}`} />
                        </button>
                        {open && (
                          <div className={`flex flex-col gap-4 border-t px-4 py-4 ${s.line}`}>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="flex flex-col gap-1.5">
                                <span className={label}>{t('Importe')}</span>
                                <input
                                  defaultValue={m.amount}
                                  inputMode="decimal"
                                  onChange={(e) => {
                                    const n = parseAmount(e.target.value)
                                    if (n !== null) patch(m.id, { amount: n })
                                  }}
                                  className={`${s.field} font-mono`}
                                />
                              </label>
                              <label className="flex flex-col gap-1.5">
                                <span className={label}>{t('Fecha')}</span>
                                <input type="date" value={m.date} onChange={(e) => e.target.value && patch(m.id, { date: e.target.value })} className={s.field} />
                              </label>
                              <label className="flex flex-col gap-1.5 sm:col-span-2">
                                <span className={label}>{t('Concepto')}</span>
                                <input value={m.note ?? ''} onChange={(e) => patch(m.id, { note: e.target.value || undefined })} maxLength={60} className={s.field} />
                              </label>
                              <label className="flex flex-col gap-1.5">
                                <span className={label}>{t('Tipo')}</span>
                                <select
                                  value={m.kind}
                                  onChange={(e) => {
                                    const next = e.target.value as Movement['kind']
                                    patch(m.id, { kind: next, category: allCats(next).includes(m.category) ? m.category : allCats(next)[0] })
                                  }}
                                  className={s.field}
                                >
                                  <option value="gasto">{t('Gasto')}</option>
                                  <option value="ingreso">{t('Ingreso')}</option>
                                </select>
                              </label>
                              {accounts.length > 0 && (
                                <label className="flex flex-col gap-1.5">
                                  <span className={label}>{t('Cuenta')}</span>
                                  <select value={accountOf(m, accounts)} onChange={(e) => patch(m.id, { account: e.target.value === MAIN_ACCOUNT ? undefined : e.target.value })} className={s.field}>
                                    <option value={MAIN_ACCOUNT}>{t('Principal')}</option>
                                    {accounts.map((a) => (
                                      <option key={a.id} value={a.id}>
                                        {a.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              )}
                              <label className="flex flex-col gap-1.5">
                                <span className={label}>{t('Categoría')}</span>
                                <select value={m.category} onChange={(e) => patch(m.id, { category: e.target.value })} className={s.field}>
                                  {[...new Set([...allCats(m.kind), m.category])].map((c) => (
                                    <option key={c}>{c}</option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <div className="flex justify-end">
                              <button type="button" onClick={() => remove(m.id)} className={`flex items-center gap-1.5 text-xs ${s.muted} transition-colors hover:text-red-500`}>
                                <Icon name="trash" className="h-3.5 w-3.5" />
                                {t('Eliminar')}
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AccountBar({
  s,
  accounts,
  balances,
  selected,
  onSelect,
  onAdd,
  mainName,
}: {
  s: Skin
  accounts: BankAccount[]
  balances: Record<string, number>
  selected: string
  onSelect: (id: string) => void
  onAdd: (name: string, initial: number) => void
  mainName: string
}) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [start, setStart] = useState('')
  const amount = start.trim() === '' ? 0 : Number(start.trim().replace(',', '.'))
  const valid = name.trim() !== '' && Number.isFinite(amount)

  const chip = (id: string, text: string, value?: number) => (
    <button
      key={id}
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={selected === id}
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors ${s.line} ${selected === id ? s.active : `${s.muted} ${s.hoverText}`}`}
    >
      <span className="max-w-32 truncate">{text}</span>
      {value !== undefined && <span className={`font-mono tabular-nums ${value < 0 ? 'text-red-500' : ''}`}>{eur(value)}</span>}
    </button>
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      {accounts.length > 0 && chip('all', t('Todas'))}
      {accounts.length > 0 && chip(MAIN_ACCOUNT, mainName, balances[MAIN_ACCOUNT])}
      {accounts.map((a) => chip(a.id, a.name, balances[a.id]))}
      {adding ? (
        <form
          onSubmit={(ev) => {
            ev.preventDefault()
            if (!valid) return
            onAdd(name.trim(), Math.round(amount * 100) / 100)
            setName('')
            setStart('')
            setAdding(false)
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoFocus placeholder={t('Nombre de la cuenta')} aria-label={t('Nombre de la cuenta')} className={`${s.field} !w-40 !py-1.5 text-xs`} />
          <input value={start} onChange={(e) => setStart(e.target.value)} inputMode="decimal" placeholder={t('Dinero inicial')} aria-label={t('Dinero inicial')} className={`${s.field} !w-28 !py-1.5 font-mono text-xs`} />
          <button type="submit" disabled={!valid} className={`rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-30 ${s.primary}`}>
            {t('Añadir')}
          </button>
          <button type="button" onClick={() => setAdding(false)} className={s.ghost}>
            {t('Cancelar')}
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={s.ghost}>
          + {t('Añadir cuenta')}
        </button>
      )}
    </div>
  )
}
