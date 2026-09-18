import { useState } from 'react'
import { Segmented, input, select } from '../ui'
import { t } from '../../lib/i18n'
import { convertBase, formatNumber, gcd, lcm, parseNumbers, simplifyFraction, stats, toNumber } from '../../lib/lab'
import { Field, NumberInput, Result } from './shared'

export function RuleOfThree() {
  const [mode, setMode] = useState<'directa' | 'inversa'>('directa')
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [c, setC] = useState('')
  const na = toNumber(a)
  const nb = toNumber(b)
  const nc = toNumber(c)
  let x: number | null = null
  if (na !== null && nb !== null && nc !== null) {
    if (mode === 'directa' && na !== 0) x = (nb * nc) / na
    if (mode === 'inversa' && nc !== 0) x = (na * nb) / nc
  }
  return (
    <div className="flex flex-col gap-4">
      <Segmented
        options={[
          { id: 'directa', label: t('Directa') },
          { id: 'inversa', label: t('Inversa') },
        ]}
        value={mode}
        onChange={setMode}
      />
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {mode === 'directa' ? t('Si A es a B, entonces C es a X.') : t('Si A corresponde a B, C corresponde a X en proporción inversa.')}
      </p>
      <div className="grid grid-cols-3 gap-3">
        <NumberInput label="A" value={a} onChange={setA} />
        <NumberInput label="B" value={b} onChange={setB} />
        <NumberInput label="C" value={c} onChange={setC} />
      </div>
      <Result label="X">{x === null ? '—' : formatNumber(x)}</Result>
    </div>
  )
}

type PercentMode = 'de' | 'que' | 'aumento' | 'descuento' | 'variacion'

export function Percentages() {
  const [mode, setMode] = useState<PercentMode>('de')
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const na = toNumber(a)
  const nb = toNumber(b)
  const labels: Record<PercentMode, [string, string, string]> = {
    de: ['Porcentaje (%)', 'Cantidad', 'Resultado'],
    que: ['Parte', 'Total', 'Porcentaje'],
    aumento: ['Porcentaje (%)', 'Cantidad', 'Resultado con aumento'],
    descuento: ['Porcentaje (%)', 'Cantidad', 'Resultado con descuento'],
    variacion: ['Valor inicial', 'Valor final', 'Variación'],
  }
  let result = '—'
  if (na !== null && nb !== null) {
    if (mode === 'de') result = formatNumber((na / 100) * nb)
    if (mode === 'que' && nb !== 0) result = `${formatNumber((na / nb) * 100)} %`
    if (mode === 'aumento') result = formatNumber(nb * (1 + na / 100))
    if (mode === 'descuento') result = formatNumber(nb * (1 - na / 100))
    if (mode === 'variacion' && na !== 0) result = `${formatNumber(((nb - na) / Math.abs(na)) * 100)} %`
  }
  return (
    <div className="flex flex-col gap-4">
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as PercentMode)}
        aria-label={t('Cálculo')}
        className={select}
      >
        <option value="de">{t('Calcular el X % de una cantidad')}</option>
        <option value="que">{t('Qué porcentaje es una parte de un total')}</option>
        <option value="aumento">{t('Aplicar un aumento de X %')}</option>
        <option value="descuento">{t('Aplicar un descuento de X %')}</option>
        <option value="variacion">{t('Variación porcentual entre dos valores')}</option>
      </select>
      <div className="grid grid-cols-2 gap-3">
        <NumberInput label={t(labels[mode][0])} value={a} onChange={setA} />
        <NumberInput label={t(labels[mode][1])} value={b} onChange={setB} />
      </div>
      <Result label={t(labels[mode][2])}>{result}</Result>
    </div>
  )
}

type Operator = '+' | '-' | '×' | '÷'

export function Fractions() {
  const [n1, setN1] = useState('')
  const [d1, setD1] = useState('')
  const [n2, setN2] = useState('')
  const [d2, setD2] = useState('')
  const [op, setOp] = useState<Operator>('+')
  const a = toNumber(n1)
  const b = toNumber(d1)
  const c = toNumber(n2)
  const d = toNumber(d2)
  let result: { n: number; d: number } | null = null
  let single = false
  if (a !== null && b !== null && b !== 0) {
    if (c === null && d === null && n2.trim() === '' && d2.trim() === '') {
      result = simplifyFraction(a, b)
      single = true
    } else if (c !== null && d !== null && d !== 0) {
      if (op === '+') result = simplifyFraction(a * d + c * b, b * d)
      if (op === '-') result = simplifyFraction(a * d - c * b, b * d)
      if (op === '×') result = simplifyFraction(a * c, b * d)
      if (op === '÷' && c !== 0) result = simplifyFraction(a * d, b * c)
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {t('Deja la segunda fracción vacía para simplificar solo la primera.')}
      </p>
      <div className="flex items-end gap-3">
        <div className="grid flex-1 grid-cols-1 gap-2">
          <NumberInput label={t('Numerador')} value={n1} onChange={setN1} />
          <NumberInput label={t('Denominador')} value={d1} onChange={setD1} />
        </div>
        <select
          value={op}
          onChange={(e) => setOp(e.target.value as Operator)}
          aria-label={t('Operación')}
          className={`${select} !w-16 text-center`}
        >
          {(['+', '-', '×', '÷'] as Operator[]).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <div className="grid flex-1 grid-cols-1 gap-2">
          <NumberInput label={t('Numerador')} value={n2} onChange={setN2} />
          <NumberInput label={t('Denominador')} value={d2} onChange={setD2} />
        </div>
      </div>
      <Result label={single ? t('Simplificada') : t('Resultado')}>
        {result === null
          ? '—'
          : result.d === 1
            ? String(result.n)
            : `${result.n} / ${result.d}  (${formatNumber(result.n / result.d)})`}
      </Result>
    </div>
  )
}

export function Statistics() {
  const [text, setText] = useState('')
  const s = stats(parseNumbers(text))
  const rows: [string, string][] = s
    ? [
        [t('Cantidad'), String(s.count)],
        [t('Suma'), formatNumber(s.sum)],
        [t('Media'), formatNumber(s.mean)],
        [t('Mediana'), formatNumber(s.median)],
        [t('Moda'), s.mode.length ? s.mode.map((v) => formatNumber(v)).join(', ') : t('No hay')],
        [t('Mínimo'), formatNumber(s.min)],
        [t('Máximo'), formatNumber(s.max)],
        [t('Rango'), formatNumber(s.range)],
        [t('Desviación típica'), formatNumber(s.deviation)],
      ]
    : []
  return (
    <div className="flex flex-col gap-4">
      <Field label={t('Números separados por espacios, comas o saltos de línea')}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="4 8 15 16 23 42"
          className={`${input} font-mono`}
        />
      </Field>
      {s && (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-xl border bg-[var(--sunken)] px-3 py-2 border-black/[0.07] dark:border-white/[0.08]">
              <dt className="text-xs text-neutral-400 dark:text-neutral-500">{label}</dt>
              <dd className="font-mono text-lg tabular-nums break-words">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

export function GcdLcm() {
  const [text, setText] = useState('')
  const values = parseNumbers(text)
    .filter((v) => Number.isInteger(v))
    .map(Math.abs)
  const valid = values.length >= 2
  const g = valid ? values.reduce(gcd) : null
  const l = valid ? values.reduce(lcm) : null
  return (
    <div className="flex flex-col gap-4">
      <Field label={t('Números enteros (al menos dos)')}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="12 18 24"
          className={`${input} font-mono`}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Result label={t('MCD (máximo común divisor)')}>{g === null ? '—' : String(g)}</Result>
        <Result label={t('MCM (mínimo común múltiplo)')}>{l === null ? '—' : String(l)}</Result>
      </div>
    </div>
  )
}

export function BaseConverter() {
  const [text, setText] = useState('')
  const [from, setFrom] = useState(10)
  const [to, setTo] = useState(2)
  const bases = Array.from({ length: 35 }, (_, i) => i + 2)
  const custom = convertBase(text, from, to)
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <Field label={t('Número')}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={`${input} font-mono`}
          />
        </Field>
        <Field label={t('Base de origen')}>
          <select value={from} onChange={(e) => setFrom(Number(e.target.value))} className={select}>
            {bases.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('Base de destino')}>
          <select value={to} onChange={(e) => setTo(Number(e.target.value))} className={select}>
            {bases.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Result label={t('Resultado')}>{custom ?? '—'}</Result>
      <div className="grid grid-cols-3 gap-3">
        {[2, 10, 16].map((b) => (
          <Result key={b} label={`${t('Base')} ${b}`}>
            {convertBase(text, from, b) ?? '—'}
          </Result>
        ))}
      </div>
    </div>
  )
}
