export function random() {
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return buffer[0] / 4294967296
}

export function randomInt(min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min
}

export function toNumber(text: string) {
  const value = Number(text.trim().replace(',', '.'))
  return text.trim() === '' || !Number.isFinite(value) ? null : value
}

export function parseNumbers(text: string) {
  return text
    .split(/[\s;]+/)
    .flatMap((part) => (/^-?\d+,\d+$/.test(part) ? [part.replace(',', '.')] : part.split(',')))
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .map(Number)
    .filter((n) => Number.isFinite(n))
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) [a, b] = [b, a % b]
  return a
}

export function lcm(a: number, b: number) {
  if (a === 0 || b === 0) return 0
  return Math.abs(a * b) / gcd(a, b)
}

export function simplifyFraction(n: number, d: number) {
  if (d === 0) return null
  const g = gcd(n, d) || 1
  const sign = d < 0 ? -1 : 1
  return { n: (sign * n) / g, d: (sign * d) / g }
}

export function formatNumber(n: number, digits = 6) {
  if (!Number.isFinite(n)) return '—'
  return String(Number(n.toFixed(digits)))
}

export function stats(values: number[]) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const sum = sorted.reduce((acc, v) => acc + v, 0)
  const mean = sum / sorted.length
  const middle = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
  const counts = new Map<number, number>()
  for (const v of sorted) counts.set(v, (counts.get(v) ?? 0) + 1)
  const top = Math.max(...counts.values())
  const mode = top === 1 ? [] : [...counts.entries()].filter(([, c]) => c === top).map(([v]) => v)
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / sorted.length
  return {
    count: sorted.length,
    sum,
    mean,
    median,
    mode,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    range: sorted[sorted.length - 1] - sorted[0],
    deviation: Math.sqrt(variance),
  }
}

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'

export function convertBase(text: string, from: number, to: number) {
  const clean = text.trim().toLowerCase()
  if (!clean) return null
  const negative = clean.startsWith('-')
  const body = negative ? clean.slice(1) : clean
  if (!body) return null
  let value = 0n
  const base = BigInt(from)
  for (const ch of body) {
    const digit = DIGITS.indexOf(ch)
    if (digit < 0 || digit >= from) return null
    value = value * base + BigInt(digit)
  }
  return (negative ? '-' : '') + value.toString(to).toUpperCase()
}

export type Unit = {
  id: string
  label: string
  toBase: (v: number) => number
  fromBase: (v: number) => number
}

const linear = (id: string, label: string, factor: number): Unit => ({
  id,
  label,
  toBase: (v) => v * factor,
  fromBase: (v) => v / factor,
})

export const UNIT_CATEGORIES: { id: string; label: string; units: Unit[] }[] = [
  {
    id: 'longitud',
    label: 'Longitud',
    units: [
      linear('mm', 'Milímetro (mm)', 0.001),
      linear('cm', 'Centímetro (cm)', 0.01),
      linear('m', 'Metro (m)', 1),
      linear('km', 'Kilómetro (km)', 1000),
      linear('in', 'Pulgada (in)', 0.0254),
      linear('ft', 'Pie (ft)', 0.3048),
      linear('yd', 'Yarda (yd)', 0.9144),
      linear('mi', 'Milla (mi)', 1609.344),
    ],
  },
  {
    id: 'masa',
    label: 'Masa',
    units: [
      linear('mg', 'Miligramo (mg)', 0.000001),
      linear('g', 'Gramo (g)', 0.001),
      linear('kg', 'Kilogramo (kg)', 1),
      linear('t', 'Tonelada (t)', 1000),
      linear('oz', 'Onza (oz)', 0.028349523125),
      linear('lb', 'Libra (lb)', 0.45359237),
    ],
  },
  {
    id: 'volumen',
    label: 'Volumen',
    units: [
      linear('ml', 'Mililitro (ml)', 0.001),
      linear('l', 'Litro (l)', 1),
      linear('m3', 'Metro cúbico (m³)', 1000),
      linear('tsp', 'Cucharadita', 0.00492892),
      linear('cup', 'Taza (EE. UU.)', 0.2365882),
      linear('gal', 'Galón (EE. UU.)', 3.785411784),
    ],
  },
  {
    id: 'temperatura',
    label: 'Temperatura',
    units: [
      { id: 'c', label: 'Celsius (°C)', toBase: (v) => v, fromBase: (v) => v },
      {
        id: 'f',
        label: 'Fahrenheit (°F)',
        toBase: (v) => ((v - 32) * 5) / 9,
        fromBase: (v) => (v * 9) / 5 + 32,
      },
      { id: 'k', label: 'Kelvin (K)', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  {
    id: 'tiempo',
    label: 'Tiempo',
    units: [
      linear('s', 'Segundo', 1),
      linear('min', 'Minuto', 60),
      linear('h', 'Hora', 3600),
      linear('d', 'Día', 86400),
      linear('w', 'Semana', 604800),
      linear('y', 'Año (365 días)', 31536000),
    ],
  },
  {
    id: 'velocidad',
    label: 'Velocidad',
    units: [
      linear('ms', 'Metros/segundo', 1),
      linear('kmh', 'Kilómetros/hora', 1 / 3.6),
      linear('mph', 'Millas/hora', 0.44704),
      linear('kn', 'Nudo', 0.514444),
    ],
  },
  {
    id: 'area',
    label: 'Área',
    units: [
      linear('cm2', 'Centímetro² (cm²)', 0.0001),
      linear('m2', 'Metro² (m²)', 1),
      linear('ha', 'Hectárea (ha)', 10000),
      linear('km2', 'Kilómetro² (km²)', 1000000),
      linear('ft2', 'Pie² (ft²)', 0.09290304),
      linear('ac', 'Acre', 4046.8564224),
    ],
  },
  {
    id: 'datos',
    label: 'Datos',
    units: [
      linear('b', 'Byte (B)', 1),
      linear('kb', 'Kilobyte (KB)', 1024),
      linear('mb', 'Megabyte (MB)', 1048576),
      linear('gb', 'Gigabyte (GB)', 1073741824),
      linear('tb', 'Terabyte (TB)', 1099511627776),
    ],
  },
]

export const FALLBACK_RATES: Record<string, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.85,
  JPY: 162,
  CHF: 0.96,
  CAD: 1.47,
  AUD: 1.65,
  MXN: 19.5,
  CNY: 7.8,
  BRL: 5.5,
}

export type AlarmPattern = 'campana' | 'pitido' | 'suave'

export function playAlarm(pattern: AlarmPattern, repeats: number, volume: number) {
  try {
    const context = new AudioContext()
    const settings = {
      campana: { type: 'sine' as OscillatorType, freq: 880, length: 0.5, gap: 0.9 },
      pitido: { type: 'square' as OscillatorType, freq: 1200, length: 0.15, gap: 0.3 },
      suave: { type: 'triangle' as OscillatorType, freq: 520, length: 0.7, gap: 1.2 },
    }[pattern]
    const peak = Math.max(0.02, Math.min(1, volume / 100)) * 0.4
    for (let i = 0; i < repeats; i++) {
      const start = context.currentTime + i * settings.gap
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.type = settings.type
      osc.frequency.value = settings.freq
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(peak, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + settings.length)
      osc.connect(gain).connect(context.destination)
      osc.start(start)
      osc.stop(start + settings.length + 0.05)
    }
    window.setTimeout(() => context.close(), (repeats * settings.gap + 1) * 1000)
  } catch {}
}
