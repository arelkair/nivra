import Decimal from 'decimal.js'

Decimal.set({ precision: 60, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -9e15, toExpPos: 9e15, minE: -9e15, maxE: 9e15 })

export { Decimal }

export type Angle = 'deg' | 'rad' | 'grad'

export type Val = { re: Decimal; im: Decimal }

export type Result =
  | { kind: 'value'; value: Val }
  | { kind: 'multi'; items: { label: string; value: Val }[] }
  | { kind: 'text'; text: string }

export type Env = { angle: Angle; complex: boolean; ans: Val; vars: Record<string, Val> }

export class CalcError extends Error {}

const ZERO = new Decimal(0)
const ONE = new Decimal(1)
const TEN = new Decimal(10)
const LIMIT = 20000
const TINY = new Decimal('1e-45')
export const VARIABLES = ['a', 'b', 'c', 'd', 'f', 'x', 'y', 'm']

export const real = (d: Decimal.Value): Val => ({ re: new Decimal(d), im: ZERO })
export const isReal = (v: Val) => v.im.isZero()

const fail = (message: string): never => {
  throw new CalcError(message)
}

const asBig = (d: Decimal): bigint | null => (d.isFinite() && d.isInteger() && d.e < LIMIT ? BigInt(d.toFixed(0)) : null)
const fromBig = (b: bigint) => new Decimal(b.toString())

const addD = (a: Decimal, b: Decimal) => {
  const x = asBig(a)
  const y = asBig(b)
  return x !== null && y !== null ? fromBig(x + y) : a.plus(b)
}
const subD = (a: Decimal, b: Decimal) => {
  const x = asBig(a)
  const y = asBig(b)
  return x !== null && y !== null ? fromBig(x - y) : a.minus(b)
}
const mulD = (a: Decimal, b: Decimal) => {
  const x = asBig(a)
  const y = asBig(b)
  return x !== null && y !== null ? fromBig(x * y) : a.times(b)
}
const divD = (a: Decimal, b: Decimal) => {
  if (b.isZero()) return fail('zero')
  const x = asBig(a)
  const y = asBig(b)
  if (x !== null && y !== null && x % y === 0n) return fromBig(x / y)
  return a.div(b)
}
const powD = (a: Decimal, b: Decimal): Decimal => {
  const x = asBig(a)
  if (x !== null && b.isInteger() && b.gte(0) && b.lte(LIMIT)) {
    const digits = (a.e + 1) * b.toNumber()
    if (digits <= LIMIT) return fromBig(x ** BigInt(b.toFixed(0)))
  }
  if (b.isInteger() && b.isNegative() && !a.isZero()) return divD(ONE, powD(a, b.neg()))
  const out = a.pow(b)
  return out.isNaN() ? fail('pow') : out
}

const PI = () => Decimal.acos(-1)

const toRad = (x: Decimal, angle: Angle) =>
  angle === 'deg' ? x.times(PI()).div(180) : angle === 'grad' ? x.times(PI()).div(200) : x
const fromRad = (x: Decimal, angle: Angle) =>
  angle === 'deg' ? x.times(180).div(PI()) : angle === 'grad' ? x.times(200).div(PI()) : x
const fromDeg = (x: Decimal, angle: Angle) => (angle === 'deg' ? x : angle === 'grad' ? x.times(10).div(9) : x.times(PI()).div(180))

const tidy = (d: Decimal) => (d.abs().lt(TINY) ? ZERO : d)

const factorialBig = (n: number) => {
  let out = 1n
  for (let i = 2n; i <= BigInt(n); i++) out *= i
  return out
}

const lnGammaStirling = (x: Decimal) => {
  const inv = ONE.div(x)
  const inv2 = inv.times(inv)
  const series = inv
    .div(12)
    .minus(inv.times(inv2).div(360))
    .plus(inv.times(inv2).times(inv2).div(1260))
    .minus(inv.times(inv2).times(inv2).times(inv2).div(1680))
  return x
    .minus(0.5)
    .times(x.ln())
    .minus(x)
    .plus(PI().times(2).ln().div(2))
    .plus(series)
}

const gammaNumber = (x: number): number => {
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gammaNumber(1 - x))
  const g = 7
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]
  const y = x - 1
  let sum = c[0]
  for (let i = 1; i < g + 2; i++) sum += c[i] / (y + i)
  const t = y + g + 0.5
  return Math.sqrt(2 * Math.PI) * Math.pow(t, y + 0.5) * Math.exp(-t) * sum
}

export function factorial(x: Decimal): Decimal {
  if (x.isNegative() && x.isInteger()) return fail('factorial')
  if (!x.isInteger()) {
    if (x.abs().gt(170)) return fail('factorial')
    const g = gammaNumber(x.toNumber() + 1)
    return Number.isFinite(g) ? new Decimal(g) : fail('factorial')
  }
  if (x.lte(LIMIT)) return fromBig(factorialBig(x.toNumber()))
  if (x.gt(1e13)) return fail('factorial')
  return lnGammaStirling(x.plus(1)).exp()
}

const nPrBig = (n: Decimal, r: Decimal) => {
  if (!n.isInteger() || !r.isInteger() || n.isNegative() || r.isNegative() || r.gt(n) || n.gt(LIMIT)) return fail('npr')
  let out = 1n
  const nn = BigInt(n.toFixed(0))
  for (let i = 0n; i < BigInt(r.toFixed(0)); i++) out *= nn - i
  return out
}

const nCrBig = (n: Decimal, r: Decimal) => {
  if (!n.isInteger() || !r.isInteger() || n.isNegative() || r.isNegative() || r.gt(n) || n.gt(LIMIT)) return fail('ncr')
  const nn = BigInt(n.toFixed(0))
  let k = BigInt(r.toFixed(0))
  if (nn - k < k) k = nn - k
  let out = 1n
  for (let i = 1n; i <= k; i++) out = (out * (nn - k + i)) / i
  return out
}

const gcdBig = (a: bigint, b: bigint): bigint => {
  let x = a < 0n ? -a : a
  let y = b < 0n ? -b : b
  while (y) [x, y] = [y, x % y]
  return x
}

const intArg = (d: Decimal) => {
  const b = asBig(d)
  return b === null ? fail('int') : b
}

export const factorInteger = (n: Decimal): string => {
  if (!n.isInteger() || n.lt(2) || n.gt(9e15)) return fail('factor')
  let rest = n.toNumber()
  const parts: string[] = []
  const push = (p: number, count: number) => parts.push(count > 1 ? `${p}^${count}` : String(p))
  for (let p = 2; p * p <= rest; p += p === 2 ? 1 : 2) {
    let count = 0
    while (rest % p === 0) {
      rest /= p
      count++
    }
    if (count) push(p, count)
  }
  if (rest > 1) push(rest, 1)
  return parts.join(' × ')
}

const mulV = (a: Val, b: Val): Val =>
  isReal(a) && isReal(b)
    ? { re: mulD(a.re, b.re), im: ZERO }
    : { re: a.re.times(b.re).minus(a.im.times(b.im)), im: a.re.times(b.im).plus(a.im.times(b.re)) }

const divV = (a: Val, b: Val): Val => {
  if (isReal(a) && isReal(b)) return { re: divD(a.re, b.re), im: ZERO }
  const den = b.re.times(b.re).plus(b.im.times(b.im))
  if (den.isZero()) return fail('zero')
  return { re: a.re.times(b.re).plus(a.im.times(b.im)).div(den), im: a.im.times(b.re).minus(a.re.times(b.im)).div(den) }
}

const absV = (v: Val) => (isReal(v) ? v.re.abs() : Decimal.hypot(v.re, v.im))
const argV = (v: Val) => Decimal.atan2(v.im, v.re)

const expV = (v: Val): Val => {
  if (isReal(v)) return { re: v.re.exp(), im: ZERO }
  const m = v.re.exp()
  return { re: m.times(Decimal.cos(v.im)), im: m.times(Decimal.sin(v.im)) }
}

const lnV = (v: Val, complex: boolean): Val => {
  if (isReal(v) && v.re.gt(0)) return { re: v.re.ln(), im: ZERO }
  if (!complex || (v.re.isZero() && v.im.isZero())) return fail('ln')
  return { re: absV(v).ln(), im: argV(v) }
}

const sqrtV = (v: Val, complex: boolean): Val => {
  if (isReal(v)) {
    if (v.re.gte(0)) return { re: v.re.sqrt(), im: ZERO }
    if (!complex) return fail('sqrt')
    return { re: ZERO, im: v.re.neg().sqrt() }
  }
  const r = absV(v).sqrt()
  const half = argV(v).div(2)
  return { re: r.times(Decimal.cos(half)), im: r.times(Decimal.sin(half)) }
}

const powV = (a: Val, b: Val, complex: boolean): Val => {
  if (isReal(a) && isReal(b)) {
    if (a.re.isNegative() && !b.re.isInteger()) {
      if (!complex) return fail('pow')
    } else {
      if (a.re.isZero() && b.re.lte(0)) return fail('zero')
      return { re: powD(a.re, b.re), im: ZERO }
    }
  }
  if (!complex) return fail('complex')
  if (a.re.isZero() && a.im.isZero()) return b.re.gt(0) ? { re: ZERO, im: ZERO } : fail('zero')
  return expV(mulV(b, lnV(a, true)))
}

const cleanV = (v: Val): Val => ({ re: tidy(v.re), im: tidy(v.im) })

type Node =
  | { t: 'num'; v: Val }
  | { t: 'var'; n: string }
  | { t: 'const'; n: string }
  | { t: 'bin'; op: string; l: Node; r: Node }
  | { t: 'neg'; x: Node }
  | { t: 'fact'; x: Node }
  | { t: 'pct'; x: Node }
  | { t: 'dms'; d: Decimal }
  | { t: 'call'; n: string; a: Node[] }

type Token = { k: 'num'; v: Decimal } | { k: 'dms'; v: Decimal } | { k: 'id'; v: string } | { k: 'op'; v: string }

const INFIX = new Set(['mod', 'ncr', 'npr'])
const LAZY = new Set(['integ', 'deriv', 'sigma', 'prod', 'solve'])
const KNOWN = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'ln', 'log', 'exp', 'sqrt', 'cbrt', 'abs', 'fact',
  'floor', 'ceil', 'int', 'frac', 'sign', 'root', 'round', 'gcd', 'lcm', 'ran', 'ranint', 'pol', 'rec', 'factor', 're', 'im', 'conj', 'arg', 'mod',
  'ncr', 'npr', 'integ', 'deriv', 'sigma', 'prod', 'solve',
])
const CONSTANTS = new Set(['pi', 'e', 'i', 'ans'])

function tokenize(source: string): Token[] {
  const text = source
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–]/g, '-')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt')
    .replace(/∛/g, 'cbrt')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/->/g, '→')
    .replace(/,/g, '.')
    .replace(/\s+/g, '')
  const out: Token[] = []
  let i = 0
  while (i < text.length) {
    const rest = text.slice(i)
    const dms = /^(\d+(?:\.\d+)?)°(?:(\d+(?:\.\d+)?)['′])?(?:(\d+(?:\.\d+)?)["″])?/.exec(rest)
    if (dms) {
      const d = new Decimal(dms[1]).plus(dms[2] ? new Decimal(dms[2]).div(60) : 0).plus(dms[3] ? new Decimal(dms[3]).div(3600) : 0)
      out.push({ k: 'dms', v: d })
      i += dms[0].length
      continue
    }
    const mixed = /^(\d+)_(\d+)\/(\d+)/.exec(rest)
    if (mixed) {
      out.push({ k: 'num', v: new Decimal(mixed[1]).plus(new Decimal(mixed[2]).div(mixed[3])) })
      i += mixed[0].length
      continue
    }
    const num = /^(\d+\.?\d*|\.\d+)(E[+-]?\d+)?/.exec(rest)
    if (num) {
      out.push({ k: 'num', v: new Decimal(num[0]) })
      i += num[0].length
      continue
    }
    const id = /^[a-zA-Z]+/.exec(rest)
    if (id) {
      const word = id[0].toLowerCase()
      if (KNOWN.has(word) || CONSTANTS.has(word)) out.push({ k: 'id', v: word })
      else if ([...word].every((c) => VARIABLES.includes(c) || c === 'e' || c === 'i')) {
        for (const c of word) out.push({ k: 'id', v: c })
      } else fail('name')
      i += id[0].length
      continue
    }
    if ('+-*/^()!%;→'.includes(text[i])) {
      out.push({ k: 'op', v: text[i] })
      i++
      continue
    }
    fail('char')
  }
  return out
}

function parse(source: string): { node: Node; store: string | null } {
  const tokens = tokenize(source)
  if (tokens.length === 0) fail('empty')
  let pos = 0
  const peek = () => tokens[pos] as Token | undefined
  const isOp = (v: string) => {
    const t = peek()
    return !!t && t.k === 'op' && t.v === v
  }

  const startsOperand = () => {
    const t = peek()
    if (!t) return false
    if (t.k === 'num' || t.k === 'dms') return true
    if (t.k === 'id') return !INFIX.has(t.v)
    return t.v === '('
  }

  const expression = (): Node => {
    let left = term()
    while (isOp('+') || isOp('-')) {
      const op = (peek() as Token).v as string
      pos++
      left = { t: 'bin', op, l: left, r: term() }
    }
    return left
  }

  const term = (): Node => {
    let left = unary()
    for (;;) {
      const t = peek()
      if (t && t.k === 'op' && (t.v === '*' || t.v === '/')) {
        pos++
        left = { t: 'bin', op: t.v, l: left, r: unary() }
      } else if (t && t.k === 'id' && INFIX.has(t.v)) {
        pos++
        left = { t: 'bin', op: t.v, l: left, r: unary() }
      } else if (startsOperand()) left = { t: 'bin', op: '*', l: left, r: unary() }
      else return left
    }
  }

  const unary = (): Node => {
    if (isOp('-')) {
      pos++
      return { t: 'neg', x: unary() }
    }
    if (isOp('+')) {
      pos++
      return unary()
    }
    return power()
  }

  const power = (): Node => {
    const base = postfix()
    if (isOp('^')) {
      pos++
      return { t: 'bin', op: '^', l: base, r: unary() }
    }
    return base
  }

  const postfix = (): Node => {
    let node = primary()
    for (;;) {
      if (isOp('!')) {
        pos++
        node = { t: 'fact', x: node }
      } else if (isOp('%')) {
        pos++
        node = { t: 'pct', x: node }
      } else return node
    }
  }

  const args = (): Node[] => {
    const list: Node[] = []
    if (isOp(')')) {
      pos++
      return list
    }
    for (;;) {
      if (!peek()) return list
      list.push(expression())
      if (isOp(';')) {
        pos++
        continue
      }
      if (isOp(')')) pos++
      else if (peek()) fail('paren')
      return list
    }
  }

  const primary = (): Node => {
    const t = peek()
    if (!t) return fail('end')
    pos++
    if (t.k === 'num') return { t: 'num', v: real(t.v) }
    if (t.k === 'dms') return { t: 'dms', d: t.v }
    if (t.k === 'op' && t.v === '(') {
      const inner = expression()
      if (isOp(')')) pos++
      else if (peek()) fail('paren')
      return inner
    }
    if (t.k === 'id') {
      if (CONSTANTS.has(t.v)) return { t: 'const', n: t.v }
      if (VARIABLES.includes(t.v)) return { t: 'var', n: t.v }
      if (!isOp('(')) return fail('call')
      pos++
      return { t: 'call', n: t.v, a: args() }
    }
    return fail('syntax')
  }

  const node = expression()
  let store: string | null = null
  if (isOp('→')) {
    pos++
    const target = peek()
    if (!target || target.k !== 'id' || !VARIABLES.includes(target.v)) fail('store')
    store = (target as { v: string }).v
    pos++
  }
  if (pos < tokens.length) fail('syntax')
  return { node, store }
}

const need = (args: Val[], min: number, max = min) => {
  if (args.length < min || args.length > max) fail('args')
}

const realArg = (v: Val) => (isReal(v) ? v.re : fail('complex'))

function callFunction(name: string, args: Val[], env: Env): Val {
  const complex = env.complex
  const a0 = args[0]
  switch (name) {
    case 'sin':
    case 'cos': {
      need(args, 1)
      if (!isReal(a0)) {
        const x = a0.re
        const y = a0.im
        if (name === 'sin') return { re: Decimal.sin(x).times(Decimal.cosh(y)), im: Decimal.cos(x).times(Decimal.sinh(y)) }
        return { re: Decimal.cos(x).times(Decimal.cosh(y)), im: Decimal.sin(x).times(Decimal.sinh(y)).neg() }
      }
      const r = toRad(a0.re, env.angle)
      return real(tidy(name === 'sin' ? Decimal.sin(r) : Decimal.cos(r)))
    }
    case 'tan': {
      need(args, 1)
      const r = toRad(realArg(a0), env.angle)
      if (Decimal.cos(r).abs().lt(TINY)) return fail('tan')
      return real(tidy(Decimal.tan(r)))
    }
    case 'asin':
    case 'acos':
    case 'atan': {
      need(args, 1)
      const x = realArg(a0)
      const out = name === 'asin' ? Decimal.asin(x) : name === 'acos' ? Decimal.acos(x) : Decimal.atan(x)
      return out.isNaN() ? fail('domain') : real(tidy(fromRad(out, env.angle)))
    }
    case 'sinh':
    case 'cosh':
    case 'tanh':
    case 'asinh':
    case 'acosh':
    case 'atanh': {
      need(args, 1)
      const x = realArg(a0)
      const out = Decimal[name](x)
      return out.isNaN() ? fail('domain') : real(tidy(out))
    }
    case 'ln':
      need(args, 1)
      return lnV(a0, complex)
    case 'log': {
      need(args, 1, 2)
      const x = realArg(a0)
      const base = args[1] ? realArg(args[1]) : TEN
      if (x.lte(0) || base.lte(0) || base.eq(1)) return fail('log')
      return real(x.ln().div(base.ln()))
    }
    case 'exp':
      need(args, 1)
      return expV(a0)
    case 'sqrt':
      need(args, 1)
      return sqrtV(a0, complex)
    case 'cbrt':
      need(args, 1)
      return real(realArg(a0).cbrt())
    case 'root': {
      need(args, 2)
      const x = realArg(a0)
      const n = realArg(args[1])
      if (n.isZero()) return fail('root')
      if (x.isNegative()) return n.isInteger() && n.mod(2).eq(1) ? real(powD(x.neg(), ONE.div(n)).neg()) : fail('root')
      return real(powD(x, ONE.div(n)))
    }
    case 'abs':
      need(args, 1)
      return real(absV(a0))
    case 'arg':
      need(args, 1)
      return real(fromRad(argV(a0), env.angle))
    case 're':
      need(args, 1)
      return real(a0.re)
    case 'im':
      need(args, 1)
      return real(a0.im)
    case 'conj':
      need(args, 1)
      return { re: a0.re, im: a0.im.neg() }
    case 'fact':
      need(args, 1)
      return real(factorial(realArg(a0)))
    case 'floor':
      need(args, 1)
      return real(realArg(a0).floor())
    case 'ceil':
      need(args, 1)
      return real(realArg(a0).ceil())
    case 'int':
      need(args, 1)
      return real(realArg(a0).trunc())
    case 'frac':
      need(args, 1)
      return real(realArg(a0).minus(realArg(a0).trunc()))
    case 'sign':
      need(args, 1)
      return real(realArg(a0).isZero() ? 0 : realArg(a0).isNegative() ? -1 : 1)
    case 'round': {
      need(args, 1, 2)
      return real(realArg(a0).toDecimalPlaces(args[1] ? realArg(args[1]).toNumber() : 0))
    }
    case 'mod':
    case 'ncr':
    case 'npr':
      need(args, 2)
      return binary(name, a0, args[1], env)
    case 'gcd':
    case 'lcm': {
      need(args, 2)
      const x = intArg(realArg(a0))
      const y = intArg(realArg(args[1]))
      const g = gcdBig(x, y)
      if (name === 'gcd') return real(fromBig(g))
      return real(g === 0n ? 0 : fromBig(((x < 0n ? -x : x) / g) * (y < 0n ? -y : y)))
    }
    case 'ran':
      need(args, 0)
      return real(Decimal.random(15))
    case 'ranint': {
      need(args, 2)
      const lo = realArg(a0).ceil()
      const hi = realArg(args[1]).floor()
      if (hi.lt(lo)) return fail('range')
      return real(lo.plus(Decimal.random(30).times(hi.minus(lo).plus(1)).floor()))
    }
    default:
      return fail('name')
  }
}

function binary(op: string, a: Val, b: Val, env: Env): Val {
  switch (op) {
    case '+':
      return isReal(a) && isReal(b) ? { re: addD(a.re, b.re), im: ZERO } : { re: a.re.plus(b.re), im: a.im.plus(b.im) }
    case '-':
      return isReal(a) && isReal(b) ? { re: subD(a.re, b.re), im: ZERO } : { re: a.re.minus(b.re), im: a.im.minus(b.im) }
    case '*':
      return mulV(a, b)
    case '/':
      return divV(a, b)
    case '^':
      return powV(a, b, env.complex)
    case 'mod': {
      const x = realArg(a)
      const y = realArg(b)
      if (y.isZero()) return fail('zero')
      const r = x.mod(y)
      return real(r.isZero() || r.isNegative() === y.isNegative() ? r : r.plus(y))
    }
    case 'ncr':
      return real(fromBig(nCrBig(realArg(a), realArg(b))))
    case 'npr':
      return real(fromBig(nPrBig(realArg(a), realArg(b))))
    default:
      return fail('op')
  }
}

const numberOf = (v: Val) => realArg(v).toNumber()

function gaussKronrod(f: (x: number) => number, a: number, b: number): number {
  const xgk = [0.991455371120813, 0.949107912342759, 0.864864423359769, 0.741531185599394, 0.586087235467691, 0.405845151377397, 0.207784955007898, 0]
  const wgk = [0.022935322010529, 0.063092092629979, 0.104790010322250, 0.140653259715525, 0.169004726639267, 0.190350578064785, 0.204432940075298, 0.209482141084728]
  const wg = [0.129484966168870, 0.279705391489277, 0.381830050505119, 0.417959183673469]
  const segment = (lo: number, hi: number, depth: number): number => {
    const c = (lo + hi) / 2
    const h = (hi - lo) / 2
    let k = wgk[7] * f(c)
    let g = wg[3] * f(c)
    for (let i = 0; i < 7; i++) {
      const dx = h * xgk[i]
      const s = f(c - dx) + f(c + dx)
      k += wgk[i] * s
      if (i % 2 === 1) g += wg[(i - 1) / 2] * s
    }
    k *= h
    g *= h
    if (depth >= 14 || Math.abs(k - g) <= 1e-11 * Math.max(1, Math.abs(k))) return k
    return segment(lo, c, depth + 1) + segment(c, hi, depth + 1)
  }
  return segment(a, b, 0)
}

function evalNode(node: Node, env: Env): Val {
  switch (node.t) {
    case 'num':
      return node.v
    case 'dms':
      return real(fromDeg(node.d, env.angle))
    case 'var':
      return env.vars[node.n] ?? real(0)
    case 'const':
      if (node.n === 'pi') return real(PI())
      if (node.n === 'e') return real(ONE.exp())
      if (node.n === 'ans') return env.ans
      return env.complex ? { re: ZERO, im: ONE } : fail('complex')
    case 'neg': {
      const v = evalNode(node.x, env)
      return { re: v.re.neg(), im: v.im.isZero() ? ZERO : v.im.neg() }
    }
    case 'fact':
      return real(factorial(realArg(evalNode(node.x, env))))
    case 'pct':
      return real(realArg(evalNode(node.x, env)).div(100))
    case 'bin': {
      const l = evalNode(node.l, env)
      if ((node.op === '+' || node.op === '-') && node.r.t === 'pct') {
        const pct = realArg(evalNode(node.r.x, env)).div(100)
        const amount = real(realArg(l).times(pct))
        return binary(node.op, l, amount, env)
      }
      return binary(node.op, l, evalNode(node.r, env), env)
    }
    case 'call':
      return LAZY.has(node.n) ? lazyCall(node, env) : callFunction(node.n, node.a.map((x) => evalNode(x, env)), env)
  }
}

const withX = (env: Env, x: Val): Env => ({ ...env, vars: { ...env.vars, x } })

function solveEquation(node: Node, env: Env, guess: Decimal): Val[] {
  const f = (x: Decimal) => realArg(evalNode(node, withX(env, real(x))))
  const h = new Decimal('1e-25')
  const roots: Decimal[] = []
  const starts = [guess, ...[1, -1, 2, -2, 0.5, -0.5, 0.1, -0.1, 3, -3, 5, -5, 7, -7, 10, -10, 30, -30, 100, -100, 1000, -1000].map((n) => new Decimal(n))]
  for (const start of starts) {
    let x = start
    let ok = false
    try {
      for (let i = 0; i < 80; i++) {
        const fx = f(x)
        if (fx.abs().lt('1e-40')) {
          ok = true
          break
        }
        const slope = f(x.plus(h)).minus(f(x.minus(h))).div(h.times(2))
        if (slope.isZero() || !slope.isFinite()) break
        const next = x.minus(fx.div(slope))
        if (!next.isFinite()) break
        x = next
      }
      if (!ok && f(x).abs().lt('1e-25')) ok = true
    } catch {
      ok = false
    }
    if (ok && !roots.some((r) => r.minus(x).abs().lt('1e-12'))) roots.push(x.toSignificantDigits(40))
    if (roots.length >= 6) break
  }
  if (roots.length === 0) fail('solve')
  return roots.sort((p, q) => p.cmp(q)).map((r) => real(r))
}

function lazyCall(node: Extract<Node, { t: 'call' }>, env: Env): Val {
  const [body, ...rest] = node.a
  if (!body) return fail('args')
  const values = rest.map((x) => evalNode(x, env))
  if (node.n === 'integ') {
    need(values, 2)
    const a = numberOf(values[0])
    const b = numberOf(values[1])
    const f = (x: number) => numberOf(evalNode(body, withX(env, real(x))))
    const total = gaussKronrod(f, a, b)
    return Number.isFinite(total) ? real(new Decimal(total).toSignificantDigits(13)) : fail('range')
  }
  if (node.n === 'deriv') {
    need(values, 1)
    const x0 = realArg(values[0])
    const h = new Decimal('1e-20')
    const f = (x: Decimal) => realArg(evalNode(body, withX(env, real(x))))
    return real(f(x0.plus(h)).minus(f(x0.minus(h))).div(h.times(2)).toSignificantDigits(25))
  }
  if (node.n === 'sigma' || node.n === 'prod') {
    need(values, 2)
    const lo = realArg(values[0]).ceil()
    const hi = realArg(values[1]).floor()
    if (hi.minus(lo).gt(100000)) return fail('range')
    let acc = node.n === 'sigma' ? real(0) : real(1)
    for (let k = lo; k.lte(hi); k = k.plus(1)) {
      const term = evalNode(body, withX(env, real(k)))
      acc = binary(node.n === 'sigma' ? '+' : '*', acc, term, env)
    }
    return acc
  }
  return fail('name')
}

export type Evaluation = { result: Result; vars: Record<string, Val> }

export function run(source: string, env: Env): Evaluation {
  const eq = source.split('=')
  if (eq.length === 2 && eq[0].trim() && eq[1].trim()) {
    const left = parse(eq[0]).node
    const right = parse(eq[1]).node
    const diff: Node = { t: 'bin', op: '-', l: left, r: right }
    const roots = solveEquation(diff, env, realArg(env.vars.x ?? real(1)))
    return {
      result: { kind: 'multi', items: roots.map((v, i) => ({ label: roots.length > 1 ? `x${i + 1}` : 'x', value: v })) },
      vars: env.vars,
    }
  }
  if (eq.length > 2) fail('syntax')
  const { node, store } = parse(source)

  if (node.t === 'call' && (node.n === 'pol' || node.n === 'rec' || node.n === 'factor' || node.n === 'solve')) {
    const args = node.n === 'solve' ? [] : node.a.map((x) => evalNode(x, env))
    if (node.n === 'pol') {
      need(args, 2)
      const x = realArg(args[0])
      const y = realArg(args[1])
      return { result: { kind: 'multi', items: [{ label: 'r', value: real(Decimal.hypot(x, y)) }, { label: 'θ', value: real(tidy(fromRad(Decimal.atan2(y, x), env.angle))) }] }, vars: env.vars }
    }
    if (node.n === 'rec') {
      need(args, 2)
      const r = realArg(args[0])
      const th = toRad(realArg(args[1]), env.angle)
      return { result: { kind: 'multi', items: [{ label: 'x', value: real(tidy(r.times(Decimal.cos(th)))) }, { label: 'y', value: real(tidy(r.times(Decimal.sin(th)))) }] }, vars: env.vars }
    }
    if (node.n === 'factor') {
      need(args, 1)
      return { result: { kind: 'text', text: factorInteger(realArg(args[0])) }, vars: env.vars }
    }
    const [body, guess] = node.a
    const roots = solveEquation(body, env, guess ? realArg(evalNode(guess, env)) : ONE)
    return { result: { kind: 'multi', items: roots.map((v, i) => ({ label: roots.length > 1 ? `x${i + 1}` : 'x', value: v })) }, vars: env.vars }
  }

  const value = cleanV(evalNode(node, env))
  if (!value.re.isFinite() || !value.im.isFinite()) fail('range')
  const vars = store ? { ...env.vars, [store]: value } : env.vars
  return { result: { kind: 'value', value }, vars }
}

export const errorMessage = (e: unknown) => (e instanceof CalcError ? e.message : 'error')
