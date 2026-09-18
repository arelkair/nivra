import { useState } from 'react'
import { button, ghost, select } from '../ui'
import { t, tp } from '../../lib/i18n'
import { FALLBACK_RATES, UNIT_CATEGORIES, formatNumber, toNumber } from '../../lib/lab'
import { useStored } from '../../lib/store'
import { Field, NumberInput, Result } from './shared'

export function UnitConverter() {
  const [categoryId, setCategoryId] = useState(UNIT_CATEGORIES[0].id)
  const category = UNIT_CATEGORIES.find((c) => c.id === categoryId) ?? UNIT_CATEGORIES[0]
  const [fromId, setFromId] = useState(category.units[0].id)
  const [toId, setToId] = useState(category.units[1].id)
  const [value, setValue] = useState('1')

  const changeCategory = (id: string) => {
    const next = UNIT_CATEGORIES.find((c) => c.id === id) ?? UNIT_CATEGORIES[0]
    setCategoryId(next.id)
    setFromId(next.units[0].id)
    setToId(next.units[1].id)
  }

  const from = category.units.find((u) => u.id === fromId) ?? category.units[0]
  const to = category.units.find((u) => u.id === toId) ?? category.units[1]
  const n = toNumber(value)
  const result = n === null ? null : to.fromBase(from.toBase(n))

  const swap = () => {
    setFromId(toId)
    setToId(fromId)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {UNIT_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => changeCategory(c.id)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors border-black/[0.07] dark:border-white/[0.08] ${
              c.id === categoryId
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'text-neutral-500 hover:bg-black/[0.03] dark:text-neutral-400 dark:hover:bg-white/[0.05]'
            }`}
          >
            {t(c.label)}
          </button>
        ))}
      </div>
      <NumberInput label={t('Valor')} value={value} onChange={setValue} />
      <div className="flex items-end gap-2">
        <Field label={t('De')}>
          <select value={fromId} onChange={(e) => setFromId(e.target.value)} className={select}>
            {category.units.map((u) => (
              <option key={u.id} value={u.id}>
                {t(u.label)}
              </option>
            ))}
          </select>
        </Field>
        <button type="button" onClick={swap} aria-label={t('Intercambiar')} className={`${ghost} !px-3`}>
          ⇄
        </button>
        <Field label={t('A')}>
          <select value={toId} onChange={(e) => setToId(e.target.value)} className={select}>
            {category.units.map((u) => (
              <option key={u.id} value={u.id}>
                {t(u.label)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Result label={t('Resultado')}>{result === null ? '—' : formatNumber(result, 8)}</Result>
    </div>
  )
}

type RatesCache = { rates: Record<string, number>; date: string; live: boolean }

export function CurrencyConverter() {
  const [cache, setCache] = useStored<RatesCache>('nivra-lab-rates', {
    rates: FALLBACK_RATES,
    date: '',
    live: false,
  })
  const [value, setValue] = useState('100')
  const [from, setFrom] = useState('EUR')
  const [to, setTo] = useState('USD')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const codes = Object.keys(cache.rates).sort()
  const n = toNumber(value)
  const rateFrom = cache.rates[from]
  const rateTo = cache.rates[to]
  const result = n !== null && rateFrom && rateTo ? (n / rateFrom) * rateTo : null

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('https://api.frankfurter.dev/v1/latest?base=EUR')
      if (!response.ok) throw new Error('bad status')
      const data = (await response.json()) as { date: string; rates: Record<string, number> }
      setCache({ rates: { EUR: 1, ...data.rates }, date: data.date, live: true })
    } catch {
      setError(t('No se han podido descargar las tasas. Comprueba tu conexión.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {cache.live
          ? tp('Tasas del Banco Central Europeo, actualizadas el {0}.', cache.date)
          : t('Tasas aproximadas de ejemplo. Pulsa actualizar para descargar las reales (se conecta a frankfurter.dev solo al pulsar).')}
      </p>
      <NumberInput label={t('Cantidad')} value={value} onChange={setValue} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('De')}>
          <select value={from} onChange={(e) => setFrom(e.target.value)} className={select}>
            {codes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label={t('A')}>
          <select value={to} onChange={(e) => setTo(e.target.value)} className={select}>
            {codes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <Result label={t('Resultado')}>{result === null ? '—' : `${formatNumber(result, 4)} ${to}`}</Result>
      <button type="button" onClick={refresh} disabled={loading} className={`${button} self-start disabled:opacity-40`}>
        {loading ? t('Descargando…') : t('Actualizar tasas')}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
