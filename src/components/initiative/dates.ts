import { t, tp } from '../../lib/i18n'

export function daysLeft(date: string, now = new Date()) {
  const [y, m, d] = date.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export function relativeDays(date: string) {
  const n = daysLeft(date)
  if (n === 0) return t('Hoy')
  if (n === 1) return t('Mañana')
  if (n === -1) return t('Ayer')
  return n > 0 ? tp('En {0} días', n) : tp('Hace {0} días', -n)
}
