import { useRef, useState } from 'react'
import { Segmented, button, ghost, input, line } from '../ui'
import { Icon } from '../ui'
import { t, tp } from '../../lib/i18n'
import { formatNumber, random, randomInt, toNumber } from '../../lib/lab'
import { useStored } from '../../lib/store'
import { playPop } from '../../lib/sound'
import { Field, NumberInput, Result } from './shared'

type Slice = { id: string; label: string; weight: number }

const DEFAULT_SLICES: Slice[] = [
  { id: 'a', label: 'Opción 1', weight: 1 },
  { id: 'b', label: 'Opción 2', weight: 1 },
  { id: 'c', label: 'Opción 3', weight: 1 },
]

const hue = (i: number, total: number) => `hsl(${Math.round((i / Math.max(total, 1)) * 360)} 55% 58%)`

export function Roulette() {
  const [slices, setSlices] = useStored<Slice[]>('nivra-lab-roulette', DEFAULT_SLICES)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState<Slice | null>(null)
  const pendingRef = useRef<Slice | null>(null)

  const valid = slices.filter((s) => s.weight > 0 && s.label.trim() !== '')
  const total = valid.reduce((acc, s) => acc + s.weight, 0)

  let acc = 0
  const stops = valid.map((s, i) => {
    const start = (acc / total) * 360
    acc += s.weight
    const end = (acc / total) * 360
    return { slice: s, start, end, color: hue(i, valid.length) }
  })
  const gradient =
    stops.length > 0
      ? `conic-gradient(${stops.map((s) => `${s.color} ${s.start}deg ${s.end}deg`).join(', ')})`
      : 'var(--sunken)'

  const spin = () => {
    if (spinning || valid.length < 2) return
    let pick = random() * total
    let chosen = stops[stops.length - 1]
    for (const stop of stops) {
      pick -= stop.slice.weight
      if (pick < 0) {
        chosen = stop
        break
      }
    }
    const target = chosen.start + (chosen.end - chosen.start) * (0.1 + random() * 0.8)
    const current = rotation % 360
    const delta = ((360 - target - current) % 360 + 360) % 360
    pendingRef.current = chosen.slice
    setWinner(null)
    setSpinning(true)
    setRotation(rotation + 360 * 5 + delta)
    window.setTimeout(() => {
      setSpinning(false)
      setWinner(pendingRef.current)
      playPop()
    }, 4100)
  }

  const update = (id: string, patch: Partial<Slice>) =>
    setSlices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div
            aria-hidden
            className="absolute -top-2 left-1/2 z-10 h-0 w-0 -translate-x-1/2 border-x-[10px] border-t-[16px] border-x-transparent border-t-neutral-900 dark:border-t-white"
          />
          <div
            className="h-56 w-56 rounded-full border-4 border-[var(--surface)] shadow-md sm:h-64 sm:w-64"
            style={{
              background: gradient,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 4s cubic-bezier(0.15, 0.7, 0.1, 1)' : 'none',
            }}
          />
        </div>
        <button type="button" onClick={spin} disabled={spinning || valid.length < 2} className={`${button} disabled:opacity-40`}>
          {t('Girar')}
        </button>
        {winner && <Result label={t('Ha salido')}>{winner.label}</Result>}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          {t('Cada peso determina la probabilidad: un peso el doble de grande sale el doble de veces.')}
        </p>
        {slices.map((s, i) => {
          const chance = s.weight > 0 && s.label.trim() !== '' && total > 0 ? (s.weight / total) * 100 : 0
          return (
            <div key={s.id} className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: chance > 0 ? hue(valid.findIndex((v) => v.id === s.id), valid.length) : 'transparent' }}
              />
              <input
                type="text"
                value={s.label}
                onChange={(e) => update(s.id, { label: e.target.value })}
                aria-label={tp('Nombre de la opción {0}', i + 1)}
                className={`${input} flex-1`}
              />
              <input
                type="number"
                min={0}
                step="any"
                value={s.weight}
                onChange={(e) => update(s.id, { weight: Math.max(0, Number(e.target.value) || 0) })}
                aria-label={t('Peso')}
                className={`${input} !w-20 font-mono`}
              />
              <span className="w-14 shrink-0 text-right font-mono text-xs text-neutral-400 tabular-nums">
                {formatNumber(chance, 1)} %
              </span>
              <button
                type="button"
                onClick={() => setSlices((prev) => prev.filter((x) => x.id !== s.id))}
                aria-label={t('Eliminar')}
                className="shrink-0 text-neutral-400 transition-colors hover:text-red-500"
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </div>
          )
        })}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              setSlices((prev) => [
                ...prev,
                { id: crypto.randomUUID(), label: tp('Opción {0}', prev.length + 1), weight: 1 },
              ])
            }
            className={ghost}
          >
            {t('Añadir opción')}
          </button>
          <button type="button" onClick={() => setSlices(DEFAULT_SLICES)} className={ghost}>
            {t('Restablecer')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Dice() {
  const [faces, setFaces] = useState('6')
  const [count, setCount] = useState('2')
  const [rolls, setRolls] = useState<number[]>([])
  const [history, setHistory] = useState<{ id: number; faces: number; values: number[] }[]>([])
  const idRef = useRef(0)

  const roll = () => {
    const f = Math.floor(toNumber(faces) ?? 0)
    const n = Math.floor(toNumber(count) ?? 0)
    if (f < 2 || f > 1000 || n < 1 || n > 30) return
    const values = Array.from({ length: n }, () => randomInt(1, f))
    setRolls(values)
    setHistory((prev) => [{ id: idRef.current++, faces: f, values }, ...prev].slice(0, 10))
    playPop()
  }

  const presets = [4, 6, 8, 10, 12, 20, 100]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setFaces(String(p))}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${line} ${
              faces === String(p)
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'text-neutral-500 hover:bg-black/[0.03] dark:text-neutral-400 dark:hover:bg-white/[0.05]'
            }`}
          >
            d{p}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberInput label={t('Caras del dado (2–1000)')} value={faces} onChange={setFaces} />
        <NumberInput label={t('Número de dados (1–30)')} value={count} onChange={setCount} />
      </div>
      <button type="button" onClick={roll} className={`${button} self-start`}>
        {t('Tirar')}
      </button>
      {rolls.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {rolls.map((v, i) => (
              <span
                key={i}
                className={`grid h-12 min-w-12 place-items-center rounded-xl border bg-[var(--sunken)] px-2 font-mono text-xl tabular-nums ${line}`}
              >
                {v}
              </span>
            ))}
          </div>
          <Result label={t('Suma')}>{rolls.reduce((a, b) => a + b, 0)}</Result>
        </>
      )}
      {history.length > 1 && (
        <ul className="flex flex-col text-xs text-neutral-400">
          {history.slice(1).map((h) => (
            <li key={h.id} className={`flex justify-between border-b py-1.5 last:border-0 ${line}`}>
              <span>
                {h.values.length}d{h.faces}
              </span>
              <span className="font-mono">{h.values.join(', ')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Coin() {
  const [side, setSide] = useState<'cara' | 'cruz' | null>(null)
  const [flipping, setFlipping] = useState(false)
  const [counts, setCounts] = useState({ cara: 0, cruz: 0 })

  const flip = () => {
    if (flipping) return
    setFlipping(true)
    window.setTimeout(() => {
      const result = random() < 0.5 ? 'cara' : 'cruz'
      setSide(result)
      setCounts((prev) => ({ ...prev, [result]: prev[result] + 1 }))
      setFlipping(false)
      playPop()
    }, 700)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={`grid h-32 w-32 place-items-center rounded-full border-4 bg-[var(--sunken)] text-lg font-medium ${line} ${
          flipping ? 'animate-spin' : ''
        }`}
      >
        {flipping ? '' : side ? t(side === 'cara' ? 'Cara' : 'Cruz') : '?'}
      </div>
      <button type="button" onClick={flip} disabled={flipping} className={`${button} disabled:opacity-40`}>
        {t('Lanzar moneda')}
      </button>
      <p className="font-mono text-sm text-neutral-400 tabular-nums">
        {t('Cara')}: {counts.cara} · {t('Cruz')}: {counts.cruz}
      </p>
    </div>
  )
}

export function RandomNumber() {
  const [min, setMin] = useState('1')
  const [max, setMax] = useState('100')
  const [count, setCount] = useState('1')
  const [unique, setUnique] = useState(false)
  const [mode, setMode] = useState<'enteros' | 'decimales'>('enteros')
  const [values, setValues] = useState<number[]>([])
  const [error, setError] = useState('')

  const generate = () => {
    const lo = toNumber(min)
    const hi = toNumber(max)
    const n = Math.floor(toNumber(count) ?? 0)
    setError('')
    if (lo === null || hi === null || lo > hi || n < 1 || n > 500) {
      setError(t('Revisa el rango y la cantidad (1–500).'))
      return
    }
    if (mode === 'decimales') {
      setValues(Array.from({ length: n }, () => Number((lo + random() * (hi - lo)).toFixed(4))))
      return
    }
    const a = Math.ceil(lo)
    const b = Math.floor(hi)
    if (unique && n > b - a + 1) {
      setError(t('No hay suficientes valores distintos en ese rango.'))
      return
    }
    if (unique) {
      const pool = new Set<number>()
      while (pool.size < n) pool.add(randomInt(a, b))
      setValues([...pool])
    } else setValues(Array.from({ length: n }, () => randomInt(a, b)))
    playPop()
  }

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        options={[
          { id: 'enteros', label: t('Enteros') },
          { id: 'decimales', label: t('Decimales') },
        ]}
        value={mode}
        onChange={setMode}
      />
      <div className="grid grid-cols-3 gap-3">
        <NumberInput label={t('Mínimo')} value={min} onChange={setMin} />
        <NumberInput label={t('Máximo')} value={max} onChange={setMax} />
        <NumberInput label={t('Cantidad')} value={count} onChange={setCount} />
      </div>
      {mode === 'enteros' && (
        <label className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
          <input
            type="checkbox"
            checked={unique}
            onChange={(e) => setUnique(e.target.checked)}
            className="accent-neutral-800 dark:accent-white"
          />
          {t('Sin repetir')}
        </label>
      )}
      <button type="button" onClick={generate} className={`${button} self-start`}>
        {t('Generar')}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {values.length > 0 && (
        <Field label={t('Resultado')}>
          <div className={`rounded-2xl border bg-[var(--sunken)] px-4 py-3 font-mono text-lg tabular-nums break-words ${line}`}>
            {values.join(', ')}
          </div>
        </Field>
      )}
    </div>
  )
}
