import { useEffect, useRef, useState } from 'react'
import { Segmented, button, ghost, input, line, select } from '../ui'
import { locale, t, tp } from '../../lib/i18n'
import { playAlarm, type AlarmPattern, toNumber } from '../../lib/lab'
import { Field, NumberInput, Result } from './shared'

function parseDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDay(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const todayValue = () => formatDay(new Date())

export function DateCalculator() {
  const [mode, setMode] = useState<'diferencia' | 'sumar' | 'dia'>('diferencia')
  const [from, setFrom] = useState(todayValue)
  const [to, setTo] = useState(todayValue)
  const [amount, setAmount] = useState('30')
  const [unit, setUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('days')
  const [direction, setDirection] = useState<1 | -1>(1)

  const a = parseDay(from)
  const b = parseDay(to)

  let content: React.ReactNode = null
  if (mode === 'diferencia' && a && b) {
    const [start, end] = a <= b ? [a, b] : [b, a]
    const days = Math.round((end.getTime() - start.getTime()) / 86400000)
    let months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()
    const anchor = new Date(start.getFullYear(), start.getMonth() + months, start.getDate())
    if (anchor > end) months--
    const anchored = new Date(start.getFullYear(), start.getMonth() + months, start.getDate())
    const restDays = Math.round((end.getTime() - anchored.getTime()) / 86400000)
    content = (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Result label={t('Días en total')}>{days}</Result>
        <Result label={t('Semanas')}>{`${Math.floor(days / 7)} ${t('sem.')} ${days % 7} ${t('d.')}`}</Result>
        <Result label={t('Años, meses y días')}>
          {`${Math.floor(months / 12)} ${t('a.')} ${months % 12} ${t('m.')} ${restDays} ${t('d.')}`}
        </Result>
        <Result label={t('Horas')}>{days * 24}</Result>
      </div>
    )
  }
  if (mode === 'sumar' && a) {
    const n = toNumber(amount)
    if (n !== null) {
      const result = new Date(a)
      const signed = n * direction
      if (unit === 'days') result.setDate(result.getDate() + signed)
      if (unit === 'weeks') result.setDate(result.getDate() + signed * 7)
      if (unit === 'months') result.setMonth(result.getMonth() + signed)
      if (unit === 'years') result.setFullYear(result.getFullYear() + signed)
      content = (
        <Result label={t('Fecha resultante')}>
          {result.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Result>
      )
    }
  }
  if (mode === 'dia' && a) {
    const start = new Date(a.getFullYear(), 0, 0)
    const dayOfYear = Math.round((a.getTime() - start.getTime()) / 86400000)
    content = (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Result label={t('Día de la semana')}>
          {a.toLocaleDateString(locale(), { weekday: 'long' })}
        </Result>
        <Result label={t('Día del año')}>{dayOfYear}</Result>
      </div>
    )
  }

  const dateInput = (label: string, value: string, set: (v: string) => void) => (
    <Field label={label}>
      <input type="date" value={value} onChange={(e) => set(e.target.value)} className={input} />
    </Field>
  )

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        options={[
          { id: 'diferencia', label: t('Diferencia') },
          { id: 'sumar', label: t('Sumar o restar') },
          { id: 'dia', label: t('Datos de un día') },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'diferencia' && (
        <div className="grid grid-cols-2 gap-3">
          {dateInput(t('Desde'), from, setFrom)}
          {dateInput(t('Hasta'), to, setTo)}
        </div>
      )}
      {mode === 'sumar' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {dateInput(t('Fecha'), from, setFrom)}
          <Field label={t('Operación')}>
            <select
              value={direction}
              onChange={(e) => setDirection(Number(e.target.value) as 1 | -1)}
              className={select}
            >
              <option value={1}>{t('Sumar')}</option>
              <option value={-1}>{t('Restar')}</option>
            </select>
          </Field>
          <NumberInput label={t('Cantidad')} value={amount} onChange={setAmount} />
          <Field label={t('Unidad')}>
            <select value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)} className={select}>
              <option value="days">{t('Días')}</option>
              <option value="weeks">{t('Semanas')}</option>
              <option value="months">{t('Meses')}</option>
              <option value="years">{t('Años')}</option>
            </select>
          </Field>
        </div>
      )}
      {mode === 'dia' && dateInput(t('Fecha'), from, setFrom)}
      {content}
    </div>
  )
}

function parseDuration(value: string) {
  const parts = value.trim().split(':').map(Number)
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !Number.isFinite(p) || p < 0)) return null
  const [h, m, s = 0] = parts
  return h * 3600 + m * 60 + s
}

function formatDuration(total: number) {
  const sign = total < 0 ? '-' : ''
  const abs = Math.abs(Math.round(total))
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const s = abs % 60
  return `${sign}${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TimeCalculator() {
  const [first, setFirst] = useState('')
  const [second, setSecond] = useState('')
  const [op, setOp] = useState<'+' | '-'>('+')
  const a = parseDuration(first)
  const b = parseDuration(second)
  const result = a !== null && b !== null ? (op === '+' ? a + b : a - b) : null
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {t('Escribe duraciones como horas:minutos o horas:minutos:segundos.')}
      </p>
      <div className="flex items-end gap-3">
        <Field label={t('Primera duración')}>
          <input
            type="text"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            placeholder="1:45"
            className={`${input} font-mono`}
          />
        </Field>
        <select
          value={op}
          onChange={(e) => setOp(e.target.value as '+' | '-')}
          aria-label={t('Operación')}
          className={`${select} !w-16 text-center`}
        >
          <option>+</option>
          <option>-</option>
        </select>
        <Field label={t('Segunda duración')}>
          <input
            type="text"
            value={second}
            onChange={(e) => setSecond(e.target.value)}
            placeholder="0:50:30"
            className={`${input} font-mono`}
          />
        </Field>
      </div>
      <Result label={t('Resultado')}>{result === null ? '—' : formatDuration(result)}</Result>
    </div>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export function CountdownTimer() {
  const [minutes, setMinutes] = useState('5')
  const [seconds, setSeconds] = useState('0')
  const [pattern, setPattern] = useState<AlarmPattern>('campana')
  const [repeats, setRepeats] = useState(3)
  const [volume, setVolume] = useState(60)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const endRef = useRef(0)

  const totalMs = ((toNumber(minutes) ?? 0) * 60 + (toNumber(seconds) ?? 0)) * 1000

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      const left = endRef.current - Date.now()
      if (left <= 0) {
        setRunning(false)
        setRemaining(0)
        setFinished(true)
        playAlarm(pattern, repeats, volume)
      } else setRemaining(left)
    }, 200)
    return () => window.clearInterval(id)
  }, [running, pattern, repeats, volume])

  const start = () => {
    const base = remaining !== null && remaining > 0 ? remaining : totalMs
    if (base <= 0) return
    endRef.current = Date.now() + base
    setRemaining(base)
    setFinished(false)
    setRunning(true)
  }

  const reset = () => {
    setRunning(false)
    setRemaining(null)
    setFinished(false)
  }

  const shown = remaining ?? totalMs
  const progress = totalMs > 0 && remaining !== null ? Math.min(1, 1 - remaining / totalMs) : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <NumberInput label={t('Minutos')} value={minutes} onChange={setMinutes} />
        <NumberInput label={t('Segundos')} value={seconds} onChange={setSeconds} />
      </div>
      <div className={`flex flex-col items-center gap-3 rounded-2xl border bg-[var(--sunken)] px-4 py-6 ${line}`}>
        <p className={`font-mono text-5xl font-medium tracking-tight tabular-nums ${finished ? 'animate-pulse' : ''}`}>
          {clock(shown)}
        </p>
        <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.12]">
          <div className="h-full rounded-full bg-neutral-900 dark:bg-white" style={{ width: `${progress * 100}%` }} />
        </div>
        {finished && <p className="text-sm font-medium">{t('¡Tiempo!')}</p>}
        <div className="flex gap-2">
          {running ? (
            <button type="button" onClick={() => setRunning(false)} className={button}>
              {t('Pausar')}
            </button>
          ) : (
            <button type="button" onClick={start} className={button}>
              {remaining !== null && remaining > 0 ? t('Reanudar') : t('Iniciar')}
            </button>
          )}
          <button type="button" onClick={reset} className={ghost}>
            {t('Reiniciar')}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label={t('Sonido de la alarma')}>
          <select value={pattern} onChange={(e) => setPattern(e.target.value as AlarmPattern)} className={select}>
            <option value="campana">{t('Campana')}</option>
            <option value="pitido">{t('Pitido')}</option>
            <option value="suave">{t('Suave')}</option>
          </select>
        </Field>
        <Field label={tp('Repeticiones: {0}', repeats)}>
          <input
            type="range"
            min={1}
            max={10}
            value={repeats}
            onChange={(e) => setRepeats(Number(e.target.value))}
            className="h-1 mt-3 accent-neutral-800 dark:accent-white"
          />
        </Field>
        <Field label={tp('Volumen: {0} %', volume)}>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-1 mt-3 accent-neutral-800 dark:accent-white"
          />
        </Field>
      </div>
      <button type="button" onClick={() => playAlarm(pattern, 1, volume)} className={`${ghost} self-start`}>
        {t('Probar sonido')}
      </button>
    </div>
  )
}

export function Stopwatch() {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [laps, setLaps] = useState<number[]>([])
  const startRef = useRef(0)
  const baseRef = useRef(0)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setElapsed(baseRef.current + Date.now() - startRef.current), 50)
    return () => window.clearInterval(id)
  }, [running])

  const show = (ms: number) => {
    const total = Math.floor(ms / 10)
    const cs = total % 100
    const s = Math.floor(total / 100) % 60
    const m = Math.floor(total / 6000)
    return `${pad(m)}:${pad(s)}.${pad(cs)}`
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex flex-col items-center gap-4 rounded-2xl border bg-[var(--sunken)] px-4 py-6 ${line}`}>
        <p className="font-mono text-5xl font-medium tracking-tight tabular-nums">{show(elapsed)}</p>
        <div className="flex gap-2">
          {running ? (
            <button
              type="button"
              onClick={() => {
                baseRef.current = elapsed
                setRunning(false)
              }}
              className={button}
            >
              {t('Pausar')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                startRef.current = Date.now()
                setRunning(true)
              }}
              className={button}
            >
              {elapsed > 0 ? t('Reanudar') : t('Iniciar')}
            </button>
          )}
          <button
            type="button"
            disabled={!running}
            onClick={() => setLaps((prev) => [elapsed, ...prev])}
            className={`${ghost} disabled:opacity-40`}
          >
            {t('Vuelta')}
          </button>
          <button
            type="button"
            onClick={() => {
              setRunning(false)
              setElapsed(0)
              baseRef.current = 0
              setLaps([])
            }}
            className={ghost}
          >
            {t('Reiniciar')}
          </button>
        </div>
      </div>
      {laps.length > 0 && (
        <ul className="flex flex-col">
          {laps.map((lap, i) => (
            <li
              key={lap}
              className={`flex items-center justify-between border-b py-2 font-mono text-sm tabular-nums last:border-0 ${line}`}
            >
              <span className="text-neutral-400">#{laps.length - i}</span>
              <span>{show(lap)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
