import { useMemo, useState, type ReactNode } from 'react'
import { t } from '../../../lib/i18n'
import type { Skin } from '../skin'
import { Decimal, real, run, type Env } from './engine'
import { DEFAULT_FMT, formatDecimal, formatVal, type View } from './format'

const ENV: Env = { angle: 'rad', complex: false, ans: real(0), vars: {} }

const evalReal = (text: string, env: Env = ENV): Decimal | null => {
  if (!text.trim()) return null
  try {
    const out = run(text, env).result
    return out.kind === 'value' && out.value.im.isZero() ? out.value.re : null
  } catch {
    return null
  }
}

const show = (d: Decimal, view: View = 'dec') => formatDecimal(d, { ...DEFAULT_FMT, view })
const num = (n: number) => show(new Decimal(Number.isFinite(n) ? n : 0).toSignificantDigits(12))

function Box({ s, title, children }: { s: Skin; title?: string; children: ReactNode }) {
  return (
    <section className={`flex flex-col gap-3 rounded-2xl border p-4 ${s.line} ${s.panel}`}>
      {title && <p className={`font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`}>{title}</p>}
      {children}
    </section>
  )
}

function Row({ s, label, value }: { s: Skin; label: string; value: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 border-b py-1.5 last:border-0 ${s.line}`}>
      <span className={`text-xs ${s.muted}`}>{label}</span>
      <span className="min-w-0 font-mono text-sm break-all tabular-nums">{value}</span>
    </div>
  )
}

function Cell({ s, value, onChange, label }: { s: Skin; value: string; onChange: (v: string) => void; label: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} inputMode="text" className={`${s.field} min-w-0 !px-2 !py-1.5 text-center font-mono`} />
}

function ViewToggle({ s, view, onChange }: { s: Skin; view: View; onChange: (v: View) => void }) {
  return (
    <div role="group" className={`flex w-fit overflow-hidden rounded-lg border text-xs ${s.line}`}>
      {(['dec', 'frac'] as View[]).map((v) => (
        <button key={v} type="button" aria-pressed={view === v} onClick={() => onChange(v)} className={`px-2.5 py-1 transition-colors ${view === v ? s.active : `${s.muted} ${s.hover}`}`}>
          {v === 'dec' ? t('Decimal') : t('Fracción')}
        </button>
      ))}
    </div>
  )
}

const parseRows = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.split(/[\s;\t]+/).filter(Boolean).map((x) => Number(x.replace(',', '.'))))
    .filter((row) => row.length > 0 && row.every((x) => Number.isFinite(x)))

const quantile = (sorted: number[], p: number) => {
  const pos = (sorted.length - 1) * p
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

function solveLinear(matrix: Decimal[][], rhs: Decimal[]): Decimal[] | null {
  const n = matrix.length
  const m = matrix.map((row, i) => [...row, rhs[i]])
  for (let c = 0; c < n; c++) {
    let pivot = c
    for (let r = c + 1; r < n; r++) if (m[r][c].abs().gt(m[pivot][c].abs())) pivot = r
    if (m[pivot][c].abs().lt('1e-40')) return null
    ;[m[c], m[pivot]] = [m[pivot], m[c]]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const factor = m[r][c].div(m[c][c])
      for (let k = c; k <= n; k++) m[r][k] = m[r][k].minus(factor.times(m[c][k]))
    }
  }
  return m.map((row, i) => row[n].div(row[i]))
}

const REGRESSIONS = [
  { id: 'lin', label: 'Lineal  y = a + b·x' },
  { id: 'quad', label: 'Cuadrática  y = a + b·x + c·x²' },
  { id: 'log', label: 'Logarítmica  y = a + b·ln x' },
  { id: 'exp', label: 'Exponencial  y = a·e^(b·x)' },
  { id: 'pwr', label: 'Potencia  y = a·x^b' },
  { id: 'inv', label: 'Inversa  y = a + b/x' },
] as const

export function StatsMode({ s }: { s: Skin }) {
  const [kind, setKind] = useState<'one' | (typeof REGRESSIONS)[number]['id']>('one')
  const [text, setText] = useState('')
  const [probe, setProbe] = useState('')
  const rows = useMemo(() => parseRows(text), [text])

  const one = useMemo(() => {
    const data: number[] = []
    for (const row of rows) {
      const freq = row.length > 1 ? Math.max(0, Math.round(row[1])) : 1
      for (let i = 0; i < Math.min(freq, 100000); i++) data.push(row[0])
    }
    if (data.length === 0) return null
    const n = data.length
    const sum = data.reduce((a, b) => a + b, 0)
    const sum2 = data.reduce((a, b) => a + b * b, 0)
    const mean = sum / n
    const varP = Math.max(0, sum2 / n - mean * mean)
    const sorted = [...data].sort((a, b) => a - b)
    return {
      n,
      sum,
      sum2,
      mean,
      sigma: Math.sqrt(varP),
      sx: n > 1 ? Math.sqrt((varP * n) / (n - 1)) : NaN,
      min: sorted[0],
      q1: quantile(sorted, 0.25),
      median: quantile(sorted, 0.5),
      q3: quantile(sorted, 0.75),
      max: sorted[n - 1],
    }
  }, [rows])

  const reg = useMemo(() => {
    if (kind === 'one') return null
    const pts = rows.filter((r) => r.length >= 2).map((r) => [r[0], r[1]] as const)
    const tx = (x: number) => (kind === 'log' || kind === 'pwr' ? Math.log(x) : kind === 'inv' ? 1 / x : x)
    const ty = (y: number) => (kind === 'exp' || kind === 'pwr' ? Math.log(y) : y)
    const data = pts.map(([x, y]) => [tx(x), ty(y)]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
    if (data.length < (kind === 'quad' ? 3 : 2)) return null
    const n = data.length
    const D = (v: number) => new Decimal(v)
    const sumOf = (f: (p: number[]) => number) => data.reduce((a, p) => a.plus(D(f(p))), D(0))
    let coeffs: Decimal[] | null
    if (kind === 'quad') {
      const [sx, sx2, sx3, sx4] = [1, 2, 3, 4].map((k) => sumOf((p) => Math.pow(p[0], k)))
      const sy = sumOf((p) => p[1])
      const sxy = sumOf((p) => p[0] * p[1])
      const sx2y = sumOf((p) => p[0] * p[0] * p[1])
      coeffs = solveLinear([[D(n), sx, sx2], [sx, sx2, sx3], [sx2, sx3, sx4]], [sy, sxy, sx2y])
    } else {
      const sx = sumOf((p) => p[0])
      const sy = sumOf((p) => p[1])
      const sxy = sumOf((p) => p[0] * p[1])
      const sx2 = sumOf((p) => p[0] * p[0])
      const det = D(n).times(sx2).minus(sx.times(sx))
      if (det.isZero()) return null
      const b = D(n).times(sxy).minus(sx.times(sy)).div(det)
      const a = sy.minus(b.times(sx)).div(n)
      coeffs = [a, b]
    }
    if (!coeffs) return null
    const predictT = (x: number) => coeffs[0].toNumber() + coeffs[1].toNumber() * x + (coeffs[2] ? coeffs[2].toNumber() * x * x : 0)
    const meanY = data.reduce((a, p) => a + p[1], 0) / n
    const ssTot = data.reduce((a, p) => a + (p[1] - meanY) ** 2, 0)
    const ssRes = data.reduce((a, p) => a + (p[1] - predictT(p[0])) ** 2, 0)
    const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot
    const meanX = data.reduce((a, p) => a + p[0], 0) / n
    const cov = data.reduce((a, p) => a + (p[0] - meanX) * (p[1] - meanY), 0)
    const sdx = Math.sqrt(data.reduce((a, p) => a + (p[0] - meanX) ** 2, 0))
    const r = sdx === 0 || ssTot === 0 ? NaN : cov / (sdx * Math.sqrt(ssTot))
    const a = kind === 'exp' || kind === 'pwr' ? coeffs[0].exp() : coeffs[0]
    const b = coeffs[1]
    const c = coeffs[2]
    const predict = (x: number) => {
      const z = tx(x)
      const y = predictT(z)
      return kind === 'exp' || kind === 'pwr' ? Math.exp(y) : y
    }
    const invert = (y: number) => {
      const yt = ty(y)
      const bb = coeffs[1].toNumber()
      const aa = coeffs[0].toNumber()
      if (kind === 'quad' || bb === 0) return NaN
      const z = (yt - aa) / bb
      return kind === 'log' || kind === 'pwr' ? Math.exp(z) : kind === 'inv' ? 1 / z : z
    }
    return { n, a, b, c, r, r2, predict, invert }
  }, [kind, rows])

  const probeNumber = Number(probe.replace(',', '.'))
  const hasProbe = probe.trim() !== '' && Number.isFinite(probeNumber)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Box s={s} title={t('Datos')}>
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label={t('Tipo')} className={s.field}>
          <option value="one">{t('Una variable (x  o  x frecuencia)')}</option>
          {REGRESSIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {t('Regresión')} · {r.label}
            </option>
          ))}
        </select>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={kind === 'one' ? '12\n15 3\n18' : '1 2.1\n2 3.9\n3 6.2'}
          aria-label={t('Datos')}
          className={`${s.field} font-mono text-xs`}
        />
        <p className={`text-[0.7rem] ${s.faint}`}>
          {kind === 'one' ? t('Un dato por línea; con una segunda columna es la frecuencia.') : t('Una pareja «x y» por línea.')}
        </p>
      </Box>
      <Box s={s} title={t('Resultados')}>
        {kind === 'one' ? (
          one ? (
            <div>
              <Row s={s} label="n" value={String(one.n)} />
              <Row s={s} label="Σx" value={num(one.sum)} />
              <Row s={s} label="Σx²" value={num(one.sum2)} />
              <Row s={s} label="x̄" value={num(one.mean)} />
              <Row s={s} label={t('σx (poblacional)')} value={num(one.sigma)} />
              <Row s={s} label={t('sx (muestral)')} value={Number.isNaN(one.sx) ? '—' : num(one.sx)} />
              <Row s={s} label="Min" value={num(one.min)} />
              <Row s={s} label="Q1" value={num(one.q1)} />
              <Row s={s} label={t('Mediana')} value={num(one.median)} />
              <Row s={s} label="Q3" value={num(one.q3)} />
              <Row s={s} label="Max" value={num(one.max)} />
            </div>
          ) : (
            <p className={`text-sm ${s.faint}`}>{t('Escribe datos para ver los resultados.')}</p>
          )
        ) : reg ? (
          <div className="flex flex-col gap-3">
            <div>
              <Row s={s} label="n" value={String(reg.n)} />
              <Row s={s} label="a" value={show(reg.a.toSignificantDigits(12))} />
              <Row s={s} label="b" value={show(reg.b.toSignificantDigits(12))} />
              {reg.c && <Row s={s} label="c" value={show(reg.c.toSignificantDigits(12))} />}
              <Row s={s} label="r" value={num(reg.r)} />
              <Row s={s} label="R²" value={num(reg.r2)} />
            </div>
            <label className="flex flex-col gap-1.5">
              <span className={`text-xs ${s.muted}`}>{t('Valor para estimar')}</span>
              <input value={probe} onChange={(e) => setProbe(e.target.value)} inputMode="decimal" className={s.field} />
            </label>
            {hasProbe && (
              <div>
                <Row s={s} label="ŷ (x → y)" value={num(reg.predict(probeNumber))} />
                <Row s={s} label="x̂ (y → x)" value={Number.isNaN(reg.invert(probeNumber)) ? '—' : num(reg.invert(probeNumber))} />
              </div>
            )}
          </div>
        ) : (
          <p className={`text-sm ${s.faint}`}>{t('Necesitas al menos dos parejas válidas.')}</p>
        )}
      </Box>
    </div>
  )
}

type Poly = 'quad' | 'cubic' | 'quartic'

function polyRoots(coeffs: number[]): { re: number; im: number }[] {
  const lead = coeffs[0]
  const c = coeffs.map((x) => x / lead)
  const n = c.length - 1
  let roots = Array.from({ length: n }, (_, k) => {
    const angle = (2 * Math.PI * k) / n + 0.4
    return { re: 0.9 * Math.cos(angle) * (1 + Math.abs(c[n]) ** (1 / n)), im: 0.9 * Math.sin(angle) * (1 + Math.abs(c[n]) ** (1 / n)) }
  })
  const mul = (a: { re: number; im: number }, b: { re: number; im: number }) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re })
  const sub = (a: { re: number; im: number }, b: { re: number; im: number }) => ({ re: a.re - b.re, im: a.im - b.im })
  const div = (a: { re: number; im: number }, b: { re: number; im: number }) => {
    const d = b.re * b.re + b.im * b.im
    return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
  }
  for (let iter = 0; iter < 500; iter++) {
    roots = roots.map((z, i) => {
      let p = { re: 1, im: 0 }
      for (let k = 1; k <= n; k++) p = { re: mul(p, z).re + c[k], im: mul(p, z).im }
      let q = { re: 1, im: 0 }
      roots.forEach((w, j) => {
        if (j !== i) q = mul(q, sub(z, w))
      })
      return sub(z, div(p, q))
    })
  }
  return roots.map((z) => ({ re: Math.abs(z.re) < 1e-10 ? 0 : z.re, im: Math.abs(z.im) < 1e-10 ? 0 : z.im }))
}

export function EquationsMode({ s }: { s: Skin }) {
  const [kind, setKind] = useState<'sys2' | 'sys3' | Poly>('sys2')
  const [view, setView] = useState<View>('dec')
  const [cells, setCells] = useState<Record<string, string>>({})
  const set = (key: string) => (v: string) => setCells((prev) => ({ ...prev, [key]: v }))
  const get = (key: string) => cells[`${kind}:${key}`] ?? ''
  const put = (key: string) => set(`${kind}:${key}`)

  const size = kind === 'sys2' ? 2 : kind === 'sys3' ? 3 : 0
  const degree = kind === 'quad' ? 2 : kind === 'cubic' ? 3 : kind === 'quartic' ? 4 : 0

  const out = useMemo(() => {
    if (size) {
      const matrix: Decimal[][] = []
      const rhs: Decimal[] = []
      for (let r = 0; r < size; r++) {
        const row: Decimal[] = []
        for (let c = 0; c < size; c++) {
          const v = evalReal(cells[`${kind}:${r}${c}`] ?? '')
          if (!v) return { error: null as string | null, lines: [] as { label: string; value: string }[] }
          row.push(v)
        }
        const b = evalReal(cells[`${kind}:${r}r`] ?? '')
        if (!b) return { error: null, lines: [] }
        matrix.push(row)
        rhs.push(b)
      }
      const solution = solveLinear(matrix, rhs)
      if (!solution) return { error: t('El sistema no tiene solución única.'), lines: [] }
      return { error: null, lines: solution.map((v, i) => ({ label: ['x', 'y', 'z'][i], value: show(v.toSignificantDigits(30), view) })) }
    }
    const cs = Array.from({ length: degree + 1 }, (_, i) => evalReal(cells[`${kind}:c${i}`] ?? ''))
    if (cs.some((v) => !v)) return { error: null, lines: [] }
    const numeric = cs.map((v) => (v as Decimal).toNumber())
    if (numeric[0] === 0) return { error: t('El primer coeficiente no puede ser 0.'), lines: [] }
    if (degree === 2) {
      const [a, b, c] = cs as Decimal[]
      const disc = b.times(b).minus(a.times(c).times(4))
      const twoA = a.times(2)
      if (disc.gte(0)) {
        const sq = disc.sqrt()
        return {
          error: null,
          lines: [
            { label: 'x₁', value: show(b.neg().plus(sq).div(twoA).toSignificantDigits(30), view) },
            { label: 'x₂', value: show(b.neg().minus(sq).div(twoA).toSignificantDigits(30), view) },
            { label: 'Δ', value: show(disc, view) },
          ],
        }
      }
      const sq = disc.neg().sqrt()
      const re = show(b.neg().div(twoA).toSignificantDigits(15), view)
      const im = show(sq.div(twoA.abs()).toSignificantDigits(15), view)
      return {
        error: null,
        lines: [
          { label: 'x₁', value: `${re} + ${im}i` },
          { label: 'x₂', value: `${re} − ${im}i` },
          { label: 'Δ', value: show(disc, view) },
        ],
      }
    }
    const roots = polyRoots(numeric)
    return {
      error: null,
      lines: roots.map((z, i) => ({
        label: `x${i + 1}`,
        value: z.im === 0 ? num(z.re) : `${num(z.re)} ${z.im < 0 ? '−' : '+'} ${num(Math.abs(z.im))}i`,
      })),
    }
  }, [cells, kind, size, degree, view])

  const letters = ['x', 'y', 'z']

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Box s={s} title={t('Ecuación')}>
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label={t('Tipo')} className={s.field}>
          <option value="sys2">{t('Sistema de 2 incógnitas')}</option>
          <option value="sys3">{t('Sistema de 3 incógnitas')}</option>
          <option value="quad">{t('Polinomio de grado 2')}</option>
          <option value="cubic">{t('Polinomio de grado 3')}</option>
          <option value="quartic">{t('Polinomio de grado 4')}</option>
        </select>
        {size > 0 ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: size }, (_, r) => (
              <div key={r} className="flex items-center gap-1.5">
                {Array.from({ length: size }, (_, c) => (
                  <div key={c} className="flex min-w-0 flex-1 items-center gap-1">
                    <Cell s={s} value={get(`${r}${c}`)} onChange={put(`${r}${c}`)} label={`${r + 1}${letters[c]}`} />
                    <span className={`text-xs ${s.muted}`}>{letters[c]}</span>
                  </div>
                ))}
                <span className={s.muted}>=</span>
                <div className="w-16 shrink-0">
                  <Cell s={s} value={get(`${r}r`)} onChange={put(`${r}r`)} label={t('Resultado')} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from({ length: degree + 1 }, (_, i) => (
              <div key={i} className="flex w-20 items-center gap-1">
                <Cell s={s} value={get(`c${i}`)} onChange={put(`c${i}`)} label={`c${i}`} />
                <span className={`text-xs whitespace-nowrap ${s.muted}`}>{degree - i > 1 ? `x${'²³⁴'[degree - i - 2]}` : degree - i === 1 ? 'x' : ''}</span>
              </div>
            ))}
            <span className={s.muted}>= 0</span>
          </div>
        )}
        <p className={`text-[0.7rem] ${s.faint}`}>{t('Puedes escribir fracciones y operaciones, como 1/3 o sqrt(2).')}</p>
      </Box>
      <Box s={s} title={t('Soluciones')}>
        <ViewToggle s={s} view={view} onChange={setView} />
        {out.error && <p className="text-sm text-red-500">{out.error}</p>}
        {out.lines.length === 0 && !out.error && <p className={`text-sm ${s.faint}`}>{t('Rellena todos los coeficientes.')}</p>}
        <div>
          {out.lines.map((line) => (
            <Row key={line.label} s={s} label={line.label} value={line.value} />
          ))}
        </div>
      </Box>
    </div>
  )
}

const BASES = [
  { id: 10, label: 'DEC' },
  { id: 16, label: 'HEX' },
  { id: 2, label: 'BIN' },
  { id: 8, label: 'OCT' },
] as const

const OPS = ['and', 'or', 'xor', 'xnor', '+', '−', '×', '÷', 'shl', 'shr', 'not', 'neg'] as const
type BaseOp = (typeof OPS)[number]

function parseBase(text: string, base: number): bigint | null {
  const clean = text.trim().replace(/\s|_/g, '').toLowerCase()
  if (!clean) return null
  const negative = clean.startsWith('-')
  const digits = negative ? clean.slice(1) : clean
  if (!digits) return null
  let value = 0n
  const b = BigInt(base)
  for (const ch of digits) {
    const d = parseInt(ch, 36)
    if (Number.isNaN(d) || d >= base) return null
    value = value * b + BigInt(d)
  }
  return negative ? -value : value
}

export function BaseMode({ s }: { s: Skin }) {
  const [base, setBase] = useState<number>(10)
  const [bits, setBits] = useState(32)
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [op, setOp] = useState<BaseOp>('+')
  const x = parseBase(a, base)
  const y = parseBase(b, base)
  const unary = op === 'not' || op === 'neg'

  const result = useMemo(() => {
    if (x === null || (!unary && y === null)) return null
    const mask = bits > 0 ? (1n << BigInt(bits)) - 1n : null
    const u = (v: bigint) => (mask !== null ? BigInt.asUintN(bits, v) : v)
    const yy = y ?? 0n
    switch (op) {
      case 'and':
        return u(x) & u(yy)
      case 'or':
        return u(x) | u(yy)
      case 'xor':
        return u(x) ^ u(yy)
      case 'xnor':
        return mask !== null ? ~(u(x) ^ u(yy)) & mask : ~(x ^ yy)
      case '+':
        return x + yy
      case '−':
        return x - yy
      case '×':
        return x * yy
      case '÷':
        return yy === 0n ? null : x / yy
      case 'shl':
        return yy < 0n || yy > 100000n ? null : x << yy
      case 'shr':
        return yy < 0n || yy > 100000n ? null : x >> yy
      case 'not':
        return mask !== null ? ~u(x) & mask : ~x
      case 'neg':
        return -x
    }
  }, [x, y, op, bits, unary])

  const signed = (v: bigint) => (bits > 0 && v >= 1n << BigInt(bits - 1) && (op === 'not' || op === 'and' || op === 'or' || op === 'xor' || op === 'xnor') ? BigInt.asIntN(bits, v) : v)
  const render = (v: bigint, radix: number) => {
    const shown = radix !== 10 && v < 0n && bits > 0 ? BigInt.asUintN(bits, v) : v
    return shown.toString(radix).toUpperCase()
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Box s={s} title={t('Operandos')}>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" className={`flex overflow-hidden rounded-lg border text-xs ${s.line}`}>
            {BASES.map((x) => (
              <button key={x.id} type="button" aria-pressed={base === x.id} onClick={() => setBase(x.id)} className={`px-2.5 py-1 font-mono transition-colors ${base === x.id ? s.active : `${s.muted} ${s.hover}`}`}>
                {x.label}
              </button>
            ))}
          </div>
          <select value={bits} onChange={(e) => setBits(Number(e.target.value))} aria-label={t('Bits')} className={`${s.field} !w-auto !py-1 text-xs`}>
            {[8, 16, 32, 64, 128, 0].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? t('Sin límite') : `${n} bits`}
              </option>
            ))}
          </select>
        </div>
        <input value={a} onChange={(e) => setA(e.target.value)} placeholder="A" aria-label="A" spellCheck={false} className={`${s.field} font-mono`} />
        <select value={op} onChange={(e) => setOp(e.target.value as BaseOp)} aria-label={t('Operación')} className={s.field}>
          {OPS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {!unary && <input value={b} onChange={(e) => setB(e.target.value)} placeholder="B" aria-label="B" spellCheck={false} className={`${s.field} font-mono`} />}
        {((a.trim() && x === null) || (!unary && b.trim() && y === null)) && <p className="text-sm text-red-500">{t('Hay dígitos que no pertenecen a esa base.')}</p>}
      </Box>
      <Box s={s} title={t('Resultado')}>
        {result === null ? (
          <p className={`text-sm ${s.faint}`}>{t('Escribe los operandos.')}</p>
        ) : (
          <div>
            {BASES.map((x) => (
              <Row key={x.id} s={s} label={x.label} value={x.id === 10 ? signed(result).toString() : render(result, x.id)} />
            ))}
          </div>
        )}
      </Box>
    </div>
  )
}

export function MatrixMode({ s }: { s: Skin }) {
  const [rows, setRows] = useState(2)
  const [cols, setCols] = useState(2)
  const [colsB, setColsB] = useState(2)
  const [a, setA] = useState<Record<string, string>>({})
  const [b, setB] = useState<Record<string, string>>({})
  const [op, setOp] = useState<'add' | 'sub' | 'mul' | 'det' | 'inv' | 'trans' | 'rank' | 'trace' | 'pow2'>('mul')
  const [view, setView] = useState<View>('dec')

  const read = (source: Record<string, string>, r: number, c: number): Decimal[][] | null => {
    const out: Decimal[][] = []
    for (let i = 0; i < r; i++) {
      const row: Decimal[] = []
      for (let j = 0; j < c; j++) {
        const v = evalReal(source[`${i}${j}`] ?? '')
        if (!v) return null
        row.push(v)
      }
      out.push(row)
    }
    return out
  }

  const det = (m: Decimal[][]): Decimal => {
    const n = m.length
    const w = m.map((row) => [...row])
    let d = new Decimal(1)
    for (let c = 0; c < n; c++) {
      let p = c
      for (let r = c + 1; r < n; r++) if (w[r][c].abs().gt(w[p][c].abs())) p = r
      if (w[p][c].isZero()) return new Decimal(0)
      if (p !== c) {
        ;[w[p], w[c]] = [w[c], w[p]]
        d = d.neg()
      }
      d = d.times(w[c][c])
      for (let r = c + 1; r < n; r++) {
        const f = w[r][c].div(w[c][c])
        for (let k = c; k < n; k++) w[r][k] = w[r][k].minus(f.times(w[c][k]))
      }
    }
    return d
  }

  const rank = (m: Decimal[][]) => {
    const w = m.map((row) => [...row])
    let r = 0
    for (let c = 0; c < w[0].length && r < w.length; c++) {
      let p = r
      for (let i = r + 1; i < w.length; i++) if (w[i][c].abs().gt(w[p][c].abs())) p = i
      if (w[p][c].abs().lt('1e-40')) continue
      ;[w[p], w[r]] = [w[r], w[p]]
      for (let i = r + 1; i < w.length; i++) {
        const f = w[i][c].div(w[r][c])
        for (let k = c; k < w[0].length; k++) w[i][k] = w[i][k].minus(f.times(w[r][k]))
      }
      r++
    }
    return r
  }

  const inverse = (m: Decimal[][]): Decimal[][] | null => {
    const n = m.length
    const w = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => new Decimal(i === j ? 1 : 0))])
    for (let c = 0; c < n; c++) {
      let p = c
      for (let r = c + 1; r < n; r++) if (w[r][c].abs().gt(w[p][c].abs())) p = r
      if (w[p][c].abs().lt('1e-40')) return null
      ;[w[c], w[p]] = [w[p], w[c]]
      const pivot = w[c][c]
      for (let k = 0; k < 2 * n; k++) w[c][k] = w[c][k].div(pivot)
      for (let r = 0; r < n; r++) {
        if (r === c) continue
        const f = w[r][c]
        for (let k = 0; k < 2 * n; k++) w[r][k] = w[r][k].minus(f.times(w[c][k]))
      }
    }
    return w.map((row) => row.slice(n))
  }

  const multiply = (x: Decimal[][], y: Decimal[][]) =>
    x.map((row) => y[0].map((_, j) => row.reduce((acc, v, k) => acc.plus(v.times(y[k][j])), new Decimal(0))))

  const outcome = useMemo((): { matrix?: Decimal[][]; scalar?: Decimal; error?: string } | null => {
    const A = read(a, rows, cols)
    if (!A) return null
    const needsB = op === 'add' || op === 'sub' || op === 'mul'
    const bRows = op === 'mul' ? cols : rows
    const bCols = op === 'mul' ? colsB : cols
    const B = needsB ? read(b, bRows, bCols) : null
    if (needsB && !B) return null
    switch (op) {
      case 'add':
        return { matrix: A.map((row, i) => row.map((v, j) => v.plus((B as Decimal[][])[i][j]))) }
      case 'sub':
        return { matrix: A.map((row, i) => row.map((v, j) => v.minus((B as Decimal[][])[i][j]))) }
      case 'mul':
        return { matrix: multiply(A, B as Decimal[][]) }
      case 'trans':
        return { matrix: A[0].map((_, j) => A.map((row) => row[j])) }
      case 'rank':
        return { scalar: new Decimal(rank(A)) }
      case 'det':
      case 'inv':
      case 'trace':
      case 'pow2':
        if (rows !== cols) return { error: t('La matriz debe ser cuadrada.') }
        if (op === 'det') return { scalar: det(A).toSignificantDigits(30) }
        if (op === 'trace') return { scalar: A.reduce((acc, row, i) => acc.plus(row[i]), new Decimal(0)) }
        if (op === 'pow2') return { matrix: multiply(A, A) }
        return inverse(A) ? { matrix: inverse(A) as Decimal[][] } : { error: t('La matriz no tiene inversa.') }
    }
  }, [a, b, rows, cols, colsB, op])

  const grid = (label: string, source: Record<string, string>, set: (v: Record<string, string>) => void, r: number, c: number) => (
    <div className="flex flex-col gap-1.5">
      <span className={`font-mono text-xs ${s.muted}`}>{label}</span>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${c}, minmax(0, 1fr))` }}>
        {Array.from({ length: r * c }, (_, i) => {
          const key = `${Math.floor(i / c)}${i % c}`
          return <Cell key={key} s={s} value={source[key] ?? ''} onChange={(v) => set({ ...source, [key]: v })} label={`${label}${key}`} />
        })}
      </div>
    </div>
  )

  const size = (value: number, set: (n: number) => void, label: string) => (
    <label className={`flex items-center gap-1.5 text-xs ${s.muted}`}>
      {label}
      <select value={value} onChange={(e) => set(Number(e.target.value))} className={`${s.field} !w-16 !py-1 text-xs`}>
        {[1, 2, 3, 4].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  )

  const needsB = op === 'add' || op === 'sub' || op === 'mul'

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Box s={s} title={t('Matrices')}>
        <div className="flex flex-wrap items-center gap-3">
          {size(rows, setRows, t('Filas'))}
          {size(cols, setCols, t('Columnas'))}
          {op === 'mul' && size(colsB, setColsB, t('Columnas de B'))}
        </div>
        <select value={op} onChange={(e) => setOp(e.target.value as typeof op)} aria-label={t('Operación')} className={s.field}>
          <option value="mul">A × B</option>
          <option value="add">A + B</option>
          <option value="sub">A − B</option>
          <option value="det">det(A)</option>
          <option value="inv">A⁻¹</option>
          <option value="trans">Aᵀ</option>
          <option value="pow2">A²</option>
          <option value="trace">{t('Traza')}(A)</option>
          <option value="rank">{t('Rango')}(A)</option>
        </select>
        {grid('A', a, setA, rows, cols)}
        {needsB && grid('B', b, setB, op === 'mul' ? cols : rows, op === 'mul' ? colsB : cols)}
      </Box>
      <Box s={s} title={t('Resultado')}>
        <ViewToggle s={s} view={view} onChange={setView} />
        {!outcome && <p className={`text-sm ${s.faint}`}>{t('Rellena todas las casillas.')}</p>}
        {outcome?.error && <p className="text-sm text-red-500">{outcome.error}</p>}
        {outcome?.scalar && <p className="font-mono text-2xl break-all">{show(outcome.scalar, view)}</p>}
        {outcome?.matrix && (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${outcome.matrix[0].length}, minmax(0, 1fr))` }}>
            {outcome.matrix.flat().map((v, i) => (
              <span key={i} className={`rounded-lg border px-2 py-1.5 text-center font-mono text-sm break-all ${s.line}`}>
                {show(v.toSignificantDigits(12), view)}
              </span>
            ))}
          </div>
        )}
      </Box>
    </div>
  )
}

export function TableMode({ s }: { s: Skin }) {
  const [fx, setFx] = useState('')
  const [start, setStart] = useState('0')
  const [end, setEnd] = useState('10')
  const [step, setStep] = useState('1')
  const [angle, setAngle] = useState<'deg' | 'rad'>('rad')

  const table = useMemo(() => {
    const lo = evalReal(start)
    const hi = evalReal(end)
    const st = evalReal(step)
    if (!fx.trim() || !lo || !hi || !st || st.isZero() || (hi.minus(lo).isNegative() !== st.isNegative() && !hi.eq(lo))) return null
    const env: Env = { ...ENV, angle }
    const out: { x: Decimal; y: string }[] = []
    let x = lo
    for (let i = 0; i < 200 && (st.isPositive() ? x.lte(hi) : x.gte(hi)); i++) {
      let y = '—'
      try {
        const r = run(fx, { ...env, vars: { x: real(x) } }).result
        if (r.kind === 'value') y = formatVal(r.value, DEFAULT_FMT)
      } catch {
        y = '—'
      }
      out.push({ x, y })
      x = x.plus(st)
    }
    return out
  }, [fx, start, end, step, angle])

  return (
    <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
      <Box s={s} title="f(x)">
        <input value={fx} onChange={(e) => setFx(e.target.value)} placeholder="x^2 - 3x + 2" aria-label="f(x)" spellCheck={false} className={`${s.field} font-mono`} />
        <div className="grid grid-cols-3 gap-2">
          {[
            [t('Inicio'), start, setStart],
            [t('Fin'), end, setEnd],
            [t('Paso'), step, setStep],
          ].map(([label, value, set]) => (
            <label key={label as string} className="flex flex-col gap-1">
              <span className={`text-xs ${s.muted}`}>{label as string}</span>
              <input value={value as string} onChange={(e) => (set as (v: string) => void)(e.target.value)} className={`${s.field} !px-2 font-mono`} />
            </label>
          ))}
        </div>
        <div role="group" className={`flex w-fit overflow-hidden rounded-lg border text-xs ${s.line}`}>
          {(['rad', 'deg'] as const).map((a) => (
            <button key={a} type="button" aria-pressed={angle === a} onClick={() => setAngle(a)} className={`px-2.5 py-1 font-mono uppercase transition-colors ${angle === a ? s.active : `${s.muted} ${s.hover}`}`}>
              {a}
            </button>
          ))}
        </div>
      </Box>
      <Box s={s} title={t('Tabla')}>
        {!table ? (
          <p className={`text-sm ${s.faint}`}>{t('Escribe la función y el rango.')}</p>
        ) : (
          <div className={`nivra-scroll max-h-[26rem] overflow-y-auto rounded-xl border ${s.line}`}>
            <table className="w-full font-mono text-sm">
              <thead className={`sticky top-0 ${s.dark ? 'bg-neutral-900' : 'bg-white'}`}>
                <tr className={`border-b ${s.line}`}>
                  <th className={`px-3 py-1.5 text-left text-xs font-medium ${s.muted}`}>x</th>
                  <th className={`px-3 py-1.5 text-right text-xs font-medium ${s.muted}`}>f(x)</th>
                </tr>
              </thead>
              <tbody>
                {table.map((row, i) => (
                  <tr key={i} className={`border-b last:border-0 ${s.line}`}>
                    <td className="px-3 py-1.5">{show(row.x.toSignificantDigits(12))}</td>
                    <td className="px-3 py-1.5 text-right">{row.y}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Box>
    </div>
  )
}
