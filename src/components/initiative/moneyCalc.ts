import { dateKey, weekIndex, type Movement } from '../../lib/store'
import { locale } from '../../lib/i18n'

export type Period = 'semana' | 'mes' | 'año'

export type Bucket = { key: string; label: string; from: string; to: string }

export type Range = { title: string; from: string; to: string; buckets: Bucket[]; daysTotal: number }

const two = (n: number) => String(n).padStart(2, '0')

export function periodRange(period: Period, offset: number, today = new Date()): Range {
  if (period === 'año') {
    const year = today.getFullYear() + offset
    const buckets = Array.from({ length: 12 }, (_, m) => ({
      key: `${year}-${two(m + 1)}`,
      label: new Date(year, m, 1).toLocaleDateString(locale(), { month: 'short' }),
      from: `${year}-${two(m + 1)}-01`,
      to: `${year}-${two(m + 1)}-31`,
    }))
    return { title: String(year), from: `${year}-01-01`, to: `${year}-12-31`, buckets, daysTotal: 365 }
  }
  const first =
    period === 'semana'
      ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - weekIndex(today) + offset * 7)
      : new Date(today.getFullYear(), today.getMonth() + offset, 1)
  const length = period === 'semana' ? 7 : new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const days = Array.from({ length }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i))
  const buckets = days.map((d) => {
    const key = dateKey(d)
    return { key, label: `${two(d.getDate())}/${two(d.getMonth() + 1)}`, from: key, to: key }
  })
  const last = days[days.length - 1]
  const title =
    period === 'semana'
      ? `${first.getDate()} ${first.toLocaleDateString(locale(), { month: 'short' })} – ${last.getDate()} ${last.toLocaleDateString(locale(), { month: 'short', year: 'numeric' })}`
      : first.toLocaleDateString(locale(), { month: 'long', year: 'numeric' })
  return { title, from: buckets[0].from, to: buckets[buckets.length - 1].to, buckets, daysTotal: length }
}

export const inRange = (m: Movement, from: string, to: string) => m.date >= from && m.date <= to

export const sum = (list: Movement[], kind?: Movement['kind']) =>
  list.filter((m) => !kind || m.kind === kind).reduce((a, m) => a + m.amount, 0)

export const signed = (m: Movement) => (m.kind === 'ingreso' ? m.amount : -m.amount)

export function spentSince(movements: Movement[], period: 'semana' | 'mes', today = new Date()) {
  const from =
    period === 'semana'
      ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - weekIndex(today))
      : new Date(today.getFullYear(), today.getMonth(), 1)
  const since = dateKey(from)
  return movements.filter((m) => m.kind === 'gasto' && m.date >= since).reduce((a, m) => a + m.amount, 0)
}

export function daysLeftInPeriod(period: 'semana' | 'mes', today = new Date()) {
  if (period === 'semana') return 7 - weekIndex(today)
  return new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate() + 1
}

export function toCsv(movements: Movement[], accountName?: (m: Movement) => string) {
  const escape = (v: string) => `"${v.split('"').join('""')}"`
  const rows = [...movements]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => [m.date, m.kind, escape(m.category), String(m.amount).replace('.', ','), escape(m.note ?? ''), ...(accountName ? [escape(accountName(m))] : [])].join(';'))
  return [`fecha;tipo;categoria;importe;concepto${accountName ? ';cuenta' : ''}`, ...rows].join('\n')
}

export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export const parseAmount = (text: string) => {
  const n = Number(text.trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
}

export function cleanDecimal(text: string) {
  let out = ''
  let separator = false
  for (const ch of text) {
    if (ch >= '0' && ch <= '9') out += ch
    else if ((ch === '.' || ch === ',') && !separator) {
      out += ch
      separator = true
    }
  }
  return out
}

export function nextRenewal(day: number, today = new Date()) {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const inMonth = (offset: number) => {
    const last = new Date(base.getFullYear(), base.getMonth() + offset + 1, 0).getDate()
    return new Date(base.getFullYear(), base.getMonth() + offset, Math.min(day, last))
  }
  let date = inMonth(0)
  if (date < base) date = inMonth(1)
  return { date, days: Math.round((date.getTime() - base.getTime()) / 86400000) }
}
