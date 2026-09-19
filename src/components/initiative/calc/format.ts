import { Decimal, type Val } from './engine'

export type Notation = 'norm' | 'fix' | 'sci' | 'eng'
export type View = 'dec' | 'frac' | 'mixed' | 'dms'

export type Fmt = { notation: Notation; digits: number; view: View; full: boolean }

export const DEFAULT_FMT: Fmt = { notation: 'norm', digits: 4, view: 'dec', full: false }

const expText = (d: Decimal, sig: number) => {
  const [mantissa, exponent] = d.toSignificantDigits(sig).toExponential().split('e')
  return `${mantissa}E${Number(exponent)}`
}

const plain = (d: Decimal) => (d.isInteger() ? d.toFixed(0) : d.toFixed())

export function toFraction(d: Decimal): { n: Decimal; d: Decimal } | null {
  if (!d.isFinite() || d.isInteger() || d.abs().gt('1e15')) return null
  const [n, den] = d.toFraction(100000000)
  const back = n.div(den)
  return back.minus(d).abs().lte(d.abs().times('1e-30')) ? { n, d: den } : null
}

export function formatDms(d: Decimal): string {
  const negative = d.isNegative()
  const abs = d.abs()
  const deg = abs.floor()
  const minutesTotal = abs.minus(deg).times(60)
  const min = minutesTotal.floor()
  let sec = minutesTotal.minus(min).times(60).toDecimalPlaces(2)
  let m = min
  let dd = deg
  if (sec.gte(60)) {
    sec = sec.minus(60)
    m = m.plus(1)
  }
  if (m.gte(60)) {
    m = m.minus(60)
    dd = dd.plus(1)
  }
  return `${negative ? '-' : ''}${dd.toFixed(0)}°${m.toFixed(0)}′${sec.toString()}″`
}

export function formatDecimal(d: Decimal, fmt: Fmt): string {
  if (d.isZero()) return '0'
  if (fmt.view === 'frac' || fmt.view === 'mixed') {
    const frac = toFraction(d)
    if (frac) {
      const sign = frac.n.isNegative() ? '-' : ''
      const n = frac.n.abs()
      if (fmt.view === 'mixed' && n.gt(frac.d)) {
        const whole = n.div(frac.d).floor()
        return `${sign}${whole.toFixed(0)} ${n.minus(whole.times(frac.d)).toFixed(0)}/${frac.d.toFixed(0)}`
      }
      return `${sign}${n.toFixed(0)}/${frac.d.toFixed(0)}`
    }
  }
  if (fmt.view === 'dms') return formatDms(d)
  const e = d.e
  if (fmt.notation === 'sci') return expText(d, fmt.digits + 1)
  if (fmt.notation === 'eng') {
    const e3 = Math.floor(e / 3) * 3
    const mantissa = d.div(new Decimal(10).pow(e3)).toSignificantDigits(fmt.full ? 40 : 10)
    return `${mantissa.toFixed()}E${e3}`
  }
  if (fmt.notation === 'fix') return e >= 15 ? expText(d, 15) : d.toFixed(fmt.digits)
  if (fmt.full) return d.isInteger() && e < 20000 ? d.toFixed(0) : e >= 60 || e < -12 ? expText(d, 50) : d.toSignificantDigits(50).toFixed()
  if (e >= 15 || e < -9) return expText(d, 15)
  return plain(d.toSignificantDigits(15))
}

export function formatVal(v: Val, fmt: Fmt): string {
  if (v.im.isZero()) return formatDecimal(v.re, fmt)
  const im = v.im.abs().eq(1) ? '' : formatDecimal(v.im.abs(), fmt)
  if (v.re.isZero()) return `${v.im.isNegative() ? '-' : ''}${im}i`
  return `${formatDecimal(v.re, fmt)}${v.im.isNegative() ? '−' : '+'}${im}i`
}

export const formatForInput = (v: Val): string => {
  if (v.im.isZero()) return v.re.isInteger() && v.re.e < 60 ? v.re.toFixed(0) : expOrPlain(v.re)
  const im = v.im.abs().eq(1) ? '' : expOrPlain(v.im.abs())
  return `${expOrPlain(v.re)}${v.im.isNegative() ? '-' : '+'}${im}i`
}

const expOrPlain = (d: Decimal) => {
  if (d.isZero()) return '0'
  const sig = d.toSignificantDigits(30)
  return sig.e >= 30 || sig.e < -9 ? expText(sig, 30) : sig.toFixed()
}
