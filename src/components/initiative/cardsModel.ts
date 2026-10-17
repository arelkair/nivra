import { dateKey } from '../../lib/store'
import { t } from '../../lib/i18n'

export type Card = {
  id: string
  front: string
  back: string
  due: string
  interval: number
  ease: number
  reps: number
  lapses: number
}

export type Deck = { id: string; name: string; cards: Card[] }

export type Grade = 0 | 1 | 2 | 3

export const NEW_PER_SESSION = 20

export const addDays = (key: string, days: number) => {
  const [y, m, d] = key.split('-').map(Number)
  return dateKey(new Date(y, m - 1, d + days))
}

export const createCard = (front: string, back: string, today: string): Card => ({
  id: crypto.randomUUID(),
  front,
  back,
  due: today,
  interval: 0,
  ease: 2.5,
  reps: 0,
  lapses: 0,
})

export const isNew = (card: Card) => card.reps === 0 && card.lapses === 0

export function schedule(card: Card, grade: Grade, today: string): Card {
  if (grade === 0) {
    return { ...card, reps: 0, lapses: card.lapses + 1, ease: Math.max(1.3, card.ease - 0.2), interval: 0, due: today }
  }
  const ease = Math.min(3.2, Math.max(1.3, card.ease + (grade === 1 ? -0.15 : grade === 3 ? 0.15 : 0)))
  const base = Math.max(1, card.interval)
  let interval: number
  if (card.reps === 0) interval = grade === 3 ? 4 : 1
  else if (card.reps === 1) interval = grade === 1 ? 2 : grade === 2 ? 3 : 6
  else if (grade === 1) interval = Math.max(base + 1, Math.round(base * 1.2))
  else if (grade === 2) interval = Math.max(base + 1, Math.round(base * ease))
  else interval = Math.max(base + 2, Math.round(base * ease * 1.3))
  return { ...card, reps: card.reps + 1, ease, interval, due: addDays(today, interval) }
}

export const previewDays = (card: Card, grade: Grade) => (grade === 0 ? 0 : schedule(card, grade, '2000-01-01').interval)

export function labelDays(days: number) {
  if (days <= 0) return t('hoy')
  if (days < 30) return `${days} d`
  if (days < 365) return `${Math.round(days / 30)} m`
  return `${(days / 365).toFixed(1)} a`
}

export const dueCards = (deck: Deck, today: string) => deck.cards.filter((c) => c.due <= today)

export function buildQueue(deck: Deck, today: string) {
  const due = dueCards(deck, today)
  const reviews = due.filter((c) => !isNew(c)).sort((a, b) => a.due.localeCompare(b.due))
  const fresh = due.filter(isNew).slice(0, NEW_PER_SESSION)
  return [...reviews, ...fresh].map((c) => c.id)
}

export function parseBulk(text: string, today: string) {
  const cards: Card[] = []
  for (const line of text.split('\n')) {
    const at = line.indexOf('::')
    if (at < 0) continue
    const front = line.slice(0, at).trim()
    const back = line.slice(at + 2).trim()
    if (front && back) cards.push(createCard(front, back, today))
  }
  return cards
}
