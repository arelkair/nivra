import { useDeferredValue, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { t } from '../../../lib/i18n'
import type { Skin } from '../skin'
import { CONSTANTS, CONVERSIONS } from './constants'
import { errorMessage, real, run, type Angle, type Env, type Result, type Val } from './engine'
import { DEFAULT_FMT, formatForInput, formatVal, type Fmt, type Notation, type View } from './format'

type Key = { label: string; insert?: string; action?: 'clear' | 'back' | 'eval' | 'mc' | 'mr' | 'mplus' | 'mminus' | 'ms'; kind: 'digit' | 'op' | 'fn' | 'equals' | 'sci' | 'mem' }

const op = (label: string, insert: string): Key => ({ label, insert, kind: 'op' })
const digit = (label: string): Key => ({ label, insert: label, kind: 'digit' })
const sci = (label: string, insert: string): Key => ({ label, insert, kind: 'sci' })

const BASIC: Key[] = [
  { label: 'AC', action: 'clear', kind: 'fn' },
  { label: '⌫', action: 'back', kind: 'fn' },
  { label: '%', insert: '%', kind: 'fn' },
  op('÷', '÷'),
  digit('7'),
  digit('8'),
  digit('9'),
  op('×', '×'),
  digit('4'),
  digit('5'),
  digit('6'),
  op('−', '−'),
  digit('1'),
  digit('2'),
  digit('3'),
  op('+', '+'),
  digit('0'),
  digit('.'),
  { label: 'Ans', insert: 'ans', kind: 'fn' },
  { label: '=', action: 'eval', kind: 'equals' },
]

const MEMORY: Key[] = [
  { label: 'MC', action: 'mc', kind: 'mem' },
  { label: 'MR', action: 'mr', kind: 'mem' },
  { label: 'M+', action: 'mplus', kind: 'mem' },
  { label: 'M−', action: 'mminus', kind: 'mem' },
  { label: 'STO', insert: '→', kind: 'mem' },
]

const scientificKeys = (second: boolean, hyp: boolean): Key[] => {
  const trig = (name: string) => {
    const full = `${second ? 'a' : ''}${name}${hyp ? 'h' : ''}`
    return sci(full, `${full}(`)
  }
  return [
    sci('(', '('),
    sci(')', ')'),
    second ? sci('x³', '^3') : sci('x²', '^2'),
    sci('xʸ', '^'),
    second ? sci('∛', 'cbrt(') : sci('√', 'sqrt('),
    trig('sin'),
    trig('cos'),
    trig('tan'),
    second ? sci('eˣ', 'exp(') : sci('ln', 'ln('),
    second ? sci('10ˣ', '10^(') : sci('log', 'log('),
    sci('π', 'π'),
    sci('e', 'e'),
    sci('n!', '!'),
    sci('|x|', 'abs('),
    sci('1/x', '1/('),
    sci('nCr', ' nCr '),
    sci('nPr', ' nPr '),
    sci('mod', ' mod '),
    sci('EXP', 'E'),
    sci('x⁻¹', '^(-1)'),
  ]
}

const ADVANCED: Key[] = [
  sci('∫', 'integ('),
  sci('d/dx', 'deriv('),
  sci('Σ', 'sigma('),
  sci('Π', 'prod('),
  sci('SOLVE', 'solve('),
  sci('Pol', 'pol('),
  sci('Rec', 'rec('),
  sci('Ran#', 'ran()'),
  sci('RanInt', 'ranint('),
  sci('Factor', 'factor('),
  sci('GCD', 'gcd('),
  sci('LCM', 'lcm('),
  sci('Floor', 'floor('),
  sci('Ceil', 'ceil('),
  sci('Round', 'round('),
  sci('ⁿ√', 'root('),
  sci('logₐ', 'log('),
  sci(';', ';'),
  sci('→', '→'),
  sci('=', '='),
  sci('i', 'i'),
  sci('conj', 'conj('),
  sci('arg', 'arg('),
  sci('Re', 're('),
  sci('Im', 'im('),
  sci('a b/c', '_'),
  sci('°′″', '°'),
  sci('x', 'x'),
  sci('y', 'y'),
  sci('A', 'a'),
  sci('B', 'b'),
  sci('C', 'c'),
  sci('D', 'd'),
  sci('F', 'f'),
  sci('M', 'm'),
]

const OPERATORS = /^\s*([+\-*/^!%×÷−;→]|mod|nCr|nPr|E|\^)/
const NO_PREVIEW = /integ|deriv|sigma|prod|solve|ran|pol|rec|factor|=|→/i

const MESSAGES: Record<string, string> = {
  zero: 'No se puede dividir entre 0',
  sqrt: 'Raíz de un número negativo (activa ℂ)',
  ln: 'Logaritmo fuera de dominio',
  log: 'Logaritmo fuera de dominio',
  domain: 'Fuera del dominio de la función',
  tan: 'La tangente no existe en ese ángulo',
  factorial: 'Factorial no válido',
  range: 'Resultado fuera de rango',
  solve: 'No se han encontrado soluciones',
  complex: 'Necesita números complejos (activa ℂ)',
  pow: 'Potencia no válida',
  name: 'Función o variable desconocida',
  call: 'Falta el paréntesis de la función',
  args: 'Número de argumentos incorrecto',
  paren: 'Paréntesis mal cerrados',
  factor: 'Solo se pueden factorizar enteros hasta 9·10¹⁵',
  int: 'Necesita números enteros',
  store: 'Solo se puede guardar en A, B, C, D, F, X, Y o M',
}

type Entry = { expr: string; text: string; insert: string | null }

const summarize = (result: Result, fmt: Fmt) =>
  result.kind === 'value'
    ? formatVal(result.value, fmt)
    : result.kind === 'multi'
      ? result.items.map((i) => `${i.label} = ${formatVal(i.value, fmt)}`).join(' ; ')
      : result.text

export function CalcTab({ s }: { s: Skin }) {
  const dark = s.dark
  const input = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)
  const [expr, setExpr] = useState('')
  const [angle, setAngle] = useState<Angle>('deg')
  const [complex, setComplex] = useState(false)
  const [second, setSecond] = useState(false)
  const [hyp, setHyp] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const [panel, setPanel] = useState<'constants' | 'convert' | null>(null)
  const [ans, setAns] = useState<Val>(real(0))
  const [vars, setVars] = useState<Record<string, Val>>({})
  const [justEvaluated, setJustEvaluated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [last, setLast] = useState<Result | null>(null)
  const [fmt, setFmt] = useState<Fmt>(DEFAULT_FMT)
  const [history, setHistory] = useState<Entry[]>([])
  const [filter, setFilter] = useState('')
  const [copied, setCopied] = useState(false)

  const env: Env = useMemo(() => ({ angle, complex, ans, vars }), [angle, complex, ans, vars])
  const memory = vars.m

  useLayoutEffect(() => {
    if (caret.current !== null && input.current) {
      input.current.setSelectionRange(caret.current, caret.current)
      caret.current = null
    }
  })

  const deferred = useDeferredValue(expr)
  const preview = useMemo(() => {
    if (justEvaluated || !deferred.trim() || NO_PREVIEW.test(deferred)) return null
    try {
      const out = run(deferred, env).result
      if (out.kind !== 'value') return null
      const text = formatVal(out.value, fmt)
      return text === deferred.trim() ? null : text
    } catch {
      return null
    }
  }, [deferred, env, fmt, justEvaluated])

  const insert = (text: string) => {
    const el = input.current
    const reuse = justEvaluated && OPERATORS.test(text)
    const base = justEvaluated && !reuse ? '' : expr
    const start = justEvaluated ? base.length : (el?.selectionStart ?? base.length)
    const end = justEvaluated ? base.length : (el?.selectionEnd ?? base.length)
    caret.current = start + text.length - (text.endsWith('()') ? 1 : 0)
    setExpr(base.slice(0, start) + text + base.slice(end))
    setJustEvaluated(false)
    setError(null)
    setLast(null)
    el?.focus()
  }

  const backspace = () => {
    const el = input.current
    if (justEvaluated) {
      setExpr('')
      setJustEvaluated(false)
      setLast(null)
      return
    }
    const start = el?.selectionStart ?? expr.length
    const end = el?.selectionEnd ?? expr.length
    const from = start === end ? Math.max(0, start - 1) : start
    caret.current = from
    setExpr(expr.slice(0, from) + expr.slice(end))
    setError(null)
    el?.focus()
  }

  const clear = () => {
    setExpr('')
    setJustEvaluated(false)
    setError(null)
    setLast(null)
    input.current?.focus()
  }

  const evaluateNow = (source: string) => {
    try {
      return run(source, env)
    } catch (e) {
      setError(t(MESSAGES[errorMessage(e)] ?? 'Operación no válida'))
      return null
    }
  }

  const compute = () => {
    if (!expr.trim()) return
    const out = evaluateNow(expr)
    if (!out) return
    setError(null)
    setLast(out.result)
    setVars(out.vars)
    setHistory((prev) => [{ expr: expr.trim(), text: summarize(out.result, fmt), insert: out.result.kind === 'value' ? formatForInput(out.result.value) : null }, ...prev].slice(0, 40))
    if (out.result.kind === 'value') {
      setAns(out.result.value)
      setExpr(formatForInput(out.result.value))
      setJustEvaluated(true)
    }
  }

  const currentValue = (): Val | null => {
    if (!expr.trim()) return ans
    const out = evaluateNow(expr)
    return out && out.result.kind === 'value' ? out.result.value : null
  }

  const memoryOp = (kind: 'mc' | 'mr' | 'mplus' | 'mminus') => {
    if (kind === 'mc') return setVars((v) => ({ ...v, m: real(0) }))
    if (kind === 'mr') return insert('m')
    const v = currentValue()
    if (!v) return
    const base = vars.m ?? real(0)
    const next = kind === 'mplus' ? { re: base.re.plus(v.re), im: base.im.plus(v.im) } : { re: base.re.minus(v.re), im: base.im.minus(v.im) }
    setVars((prev) => ({ ...prev, m: next }))
  }

  const press = (key: Key) => {
    if (key.insert !== undefined) return insert(key.insert)
    if (key.action === 'clear') return clear()
    if (key.action === 'back') return backspace()
    if (key.action === 'eval') return compute()
    if (key.action === 'mc' || key.action === 'mr' || key.action === 'mplus' || key.action === 'mminus') return memoryOp(key.action)
  }

  const applyConversion = (expression: string) => {
    const base = expr.trim() || formatForInput(ans)
    setExpr(expression.replace(/v/g, `(${base})`))
    setJustEvaluated(false)
    setLast(null)
    setPanel(null)
    input.current?.focus()
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  const keyClass = (kind: Key['kind'], size: 'lg' | 'sm') => {
    const height = size === 'lg' ? 'h-12 text-lg sm:h-14' : 'h-10 text-[0.8rem] sm:h-11'
    const base = `grid place-items-center rounded-xl font-medium transition-colors active:scale-[0.97] ${height}`
    if (kind === 'equals') return `${base} ${s.primary}`
    if (kind === 'op') return `${base} ${dark ? 'bg-white/[0.09] text-white hover:bg-white/15' : 'bg-black/[0.07] text-neutral-900 hover:bg-black/10'}`
    if (kind === 'fn' || kind === 'mem') return `${base} border ${s.line} ${s.muted} ${s.hover} ${s.hoverText}`
    if (kind === 'sci') return `${base} border ${s.line} ${dark ? 'bg-white/[0.04]' : 'bg-black/[0.025]'} ${s.hover}`
    return `${base} border ${s.line} ${s.panel} ${s.hover}`
  }

  const chip = (active: boolean) =>
    `rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${active ? `${s.active} border-transparent` : `${s.line} ${s.muted} ${s.hover}`}`

  const pad = (keys: Key[], size: 'lg' | 'sm', cols: string) => (
    <div className={`grid gap-1.5 ${cols}`}>
      {keys.map((key) => (
        <button
          key={key.label}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => press(key)}
          aria-label={key.action === 'clear' ? t('Borrar todo') : key.action === 'back' ? t('Borrar') : undefined}
          className={keyClass(key.kind, size)}
        >
          {key.label}
        </button>
      ))}
    </div>
  )

  const view = (v: View, label: string) => (
    <button key={v} type="button" aria-pressed={fmt.view === v} onClick={() => setFmt({ ...fmt, view: v })} className={`px-2.5 py-1 transition-colors ${fmt.view === v ? s.active : `${s.muted} ${s.hover}`}`}>
      {label}
    </button>
  )

  const lines: string[] = last
    ? last.kind === 'value'
      ? [formatVal(last.value, fmt)]
      : last.kind === 'multi'
        ? last.items.map((i) => `${i.label} = ${formatVal(i.value, fmt)}`)
        : [last.text]
    : []
  const shown = error ? null : lines.length > 0 ? lines : preview ? [preview] : null
  const fullText = last?.kind === 'value' ? formatVal(last.value, { ...fmt, full: true }) : null
  const constants = CONSTANTS.filter((c) => !filter.trim() || `${c.name} ${c.symbol}`.toLowerCase().includes(filter.trim().toLowerCase()))

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className={`flex flex-col gap-3 rounded-2xl border p-4 ${s.line} ${s.panel}`}>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label={t('Unidad de ángulo')} className={`flex overflow-hidden rounded-lg border text-xs ${s.line}`}>
              {(['deg', 'rad', 'grad'] as Angle[]).map((a) => (
                <button key={a} type="button" aria-pressed={angle === a} onClick={() => setAngle(a)} className={`px-2.5 py-1 font-mono uppercase transition-colors ${angle === a ? s.active : `${s.muted} ${s.hover}`}`}>
                  {a}
                </button>
              ))}
            </div>
            <button type="button" aria-pressed={second} onClick={() => setSecond(!second)} className={chip(second)}>
              2nd
            </button>
            <button type="button" aria-pressed={hyp} onClick={() => setHyp(!hyp)} className={chip(hyp)}>
              hyp
            </button>
            <button type="button" aria-pressed={complex} onClick={() => setComplex(!complex)} title={t('Números complejos')} className={chip(complex)}>
              ℂ
            </button>
            <span className="flex-1" />
            {memory && !memory.re.isZero() && (
              <span className={`font-mono text-xs ${s.muted}`} title={t('Memoria')}>
                M = {formatVal(memory, DEFAULT_FMT)}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1 px-1">
            <input
              ref={input}
              value={expr}
              onChange={(e) => {
                setExpr(e.target.value)
                setJustEvaluated(false)
                setError(null)
                setLast(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  compute()
                } else if (e.key === 'Escape') clear()
              }}
              inputMode="none"
              autoComplete="off"
              spellCheck={false}
              autoFocus
              placeholder="0"
              aria-label={t('Operación')}
              className="w-full bg-transparent py-1 text-right font-mono text-2xl outline-none placeholder:text-neutral-500 sm:text-3xl"
            />
            <div aria-live="polite" className={`nivra-scroll flex max-h-40 min-h-8 flex-col items-end overflow-y-auto text-right font-mono text-xl tabular-nums sm:text-2xl ${error ? 'text-red-500' : shown && lines.length === 0 ? '' : ''}`}>
              {error ? (
                <span className="text-sm">{error}</span>
              ) : shown ? (
                shown.map((line, i) => (
                  <span key={i} className={`max-w-full break-all ${lines.length === 0 ? s.muted : ''} ${line.length > 26 ? 'text-base' : ''}`}>
                    {line}
                  </span>
                ))
              ) : (
                <span className={s.faint}>&nbsp;</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label={t('Formato del resultado')} className={`flex overflow-hidden rounded-lg border text-xs ${s.line}`}>
              {view('dec', t('Decimal'))}
              {view('frac', 'a/b')}
              {view('mixed', 'a b/c')}
              {view('dms', '°′″')}
            </div>
            <select
              value={fmt.notation}
              onChange={(e) => setFmt({ ...fmt, notation: e.target.value as Notation })}
              aria-label={t('Notación')}
              className={`${s.field} !w-auto !py-1 text-xs`}
            >
              <option value="norm">Norm</option>
              <option value="fix">Fix</option>
              <option value="sci">Sci</option>
              <option value="eng">Eng</option>
            </select>
            {(fmt.notation === 'fix' || fmt.notation === 'sci') && (
              <select value={fmt.digits} onChange={(e) => setFmt({ ...fmt, digits: Number(e.target.value) })} aria-label={t('Dígitos')} className={`${s.field} !w-auto !py-1 text-xs`}>
                {Array.from({ length: 10 }, (_, n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            )}
            {fullText && (
              <>
                <button type="button" aria-pressed={fmt.full} onClick={() => setFmt({ ...fmt, full: !fmt.full })} className={chip(fmt.full)}>
                  {t('Todos los dígitos')}
                </button>
                <button type="button" onClick={() => copy(fullText)} className={chip(false)}>
                  {copied ? t('Copiado') : t('Copiar')}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-1.5">
            {pad(MEMORY, 'sm', 'grid-cols-5')}
            {pad(scientificKeys(second, hyp), 'sm', 'grid-cols-5')}
          </div>
          {pad(BASIC, 'lg', 'grid-cols-4')}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-pressed={advanced} onClick={() => setAdvanced(!advanced)} className={chip(advanced)}>
            {t('Funciones avanzadas')}
          </button>
          <button type="button" aria-pressed={panel === 'constants'} onClick={() => setPanel(panel === 'constants' ? null : 'constants')} className={chip(panel === 'constants')}>
            {t('Constantes')}
          </button>
          <button type="button" aria-pressed={panel === 'convert'} onClick={() => setPanel(panel === 'convert' ? null : 'convert')} className={chip(panel === 'convert')}>
            {t('Conversiones')}
          </button>
        </div>

        {advanced && (
          <div className="flex flex-col gap-2">
            {pad(ADVANCED, 'sm', 'grid-cols-5 sm:grid-cols-7')}
            <p className={`text-[0.7rem] leading-relaxed ${s.faint}`}>
              {t('Separa los argumentos con ; — por ejemplo ∫(x^2;0;3), d/dx(x^3;2), Σ(x;1;100), SOLVE(x^2-2;1) o Pol(3;4). Escribe 5→A para guardar en una variable y «x^2-2=0» para resolver una ecuación. En el formato a b/c se escribe 2_1/3.')}
            </p>
          </div>
        )}

        {panel === 'constants' && (
          <div className={`flex flex-col gap-2 rounded-2xl border p-3 ${s.line} ${s.panel}`}>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('Buscar constante')} aria-label={t('Buscar constante')} className={`${s.field} !py-1.5`} />
            <ul className="nivra-scroll grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
              {constants.map((c) => (
                <li key={c.symbol + c.name}>
                  <button
                    type="button"
                    onClick={() => {
                      insert(`(${c.value})`)
                      setPanel(null)
                    }}
                    className={`flex w-full items-baseline justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${s.hover}`}
                  >
                    <span className="truncate">{t(c.name)}</span>
                    <span className={`shrink-0 font-mono ${s.muted}`}>{c.symbol}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {panel === 'convert' && (
          <div className={`flex flex-col gap-2 rounded-2xl border p-3 ${s.line} ${s.panel}`}>
            <p className={`text-[0.7rem] ${s.faint}`}>{t('Convierte el valor actual (o el último resultado).')}</p>
            <div className="nivra-scroll grid max-h-56 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-4">
              {CONVERSIONS.map((c) => (
                <button key={c.label} type="button" onClick={() => applyConversion(c.expr)} className={`rounded-lg border px-2 py-1.5 text-xs transition-colors ${s.line} ${s.hover}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className={`text-xs ${s.faint}`}>
          {t('Escribe con el teclado o usa las teclas. Enter calcula, Esc borra. Los paréntesis abiertos se cierran solos.')}
        </p>
      </div>

      <aside className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className={`font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`}>{t('Historial')}</p>
          {history.length > 0 && (
            <button type="button" onClick={() => setHistory([])} className={`text-xs ${s.muted} transition-colors hover:text-red-500`}>
              {t('Vaciar')}
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className={`text-xs ${s.faint}`}>{t('Aquí aparecerán tus operaciones.')}</p>
        ) : (
          <ul className={`nivra-scroll flex max-h-[32rem] flex-col divide-y overflow-y-auto rounded-2xl border ${s.line} ${s.divide}`}>
            {history.map((entry, i) => (
              <li key={`${entry.expr}-${i}`} className="flex flex-col items-end gap-0.5 px-3 py-2 font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setExpr(entry.expr)
                    setJustEvaluated(false)
                    setLast(null)
                    input.current?.focus()
                  }}
                  className={`max-w-full truncate text-xs ${s.muted} ${s.hoverText}`}
                >
                  {entry.expr}
                </button>
                <button type="button" onClick={() => entry.insert && insert(entry.insert)} className="max-w-full text-sm break-all tabular-nums">
                  = {entry.text.length > 60 ? `${entry.text.slice(0, 60)}…` : entry.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}
