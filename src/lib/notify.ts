import {
  TYPES,
  dateKey,
  itemsOfDay,
  monthDay,
  type Anniversary,
  type CalItem,
  type Countdown,
  type Reminder,
  type Task,
  type Work,
} from './store'
import { t, tp } from './i18n'

const SENT_KEY = 'nivra-notified'

const readSent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

export const notificationsSupported = () => typeof Notification !== 'undefined'

export const notificationPermission = () => (notificationsSupported() ? Notification.permission : 'denied')

export async function askNotificationPermission() {
  if (!notificationsSupported()) return 'denied'
  return Notification.requestPermission()
}

export type PendingNotice = { key: string; text: string; isSystem: boolean }

export function pendingNotices(
  today: Date,
  datos: {
    countdowns: Countdown[]
    anniversaries: Anniversary[]
    items: CalItem[]
    works: Work[]
    reminders: Reminder[]
    tasks: Task[]
  },
): PendingNotice[] {
  const key = dateKey(today)
  const mañana = dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1))
  const alreadySent = new Set(readSent())
  const out: PendingNotice[] = []
  const añadir = (c: string, text: string, isSystem: boolean) => {
    if (!alreadySent.has(c)) out.push({ key: c, text, isSystem })
  }

  for (const r of datos.reminders) {
    if (r.date !== key) continue
    const time = r.time ? tp(' a las {0}', r.time) : ''
    añadir(`record:${r.id}:${key}`, tp('Hoy{0}: {1}', time, r.title), true)
  }

  for (const w of datos.works) {
    if (w.date !== mañana) continue
    añadir(
      `manana:${w.id}:${mañana}`,
      tp('Mañana tienes {0} de {1}', t(TYPES[w.kind].label).toLowerCase(), w.title),
      true,
    )
  }

  for (const c of datos.countdowns) {
    if (new Date(c.target).getTime() <= today.getTime()) {
      añadir(`fin:${c.id}`, tp('Se ha acabado la cuenta atrás de {0}', c.title), true)
    }
  }

  for (const a of datos.anniversaries) {
    if (a.md === monthDay(key)) {
      añadir(`aniv:${a.id}:${key}`, tp('Hoy es el aniversario de {0}', a.name || t('algo tuyo')), true)
    }
  }

  for (const i of itemsOfDay(datos.items, key)) {
    añadir(`hoy:${i.id}:${key}`, tp('{0} de hoy: {1}', t(TYPES[i.type].label), i.title), false)
  }

  const overdue = datos.tasks.filter((t) => !t.done && t.date && t.date < key)
  if (overdue.length === 1) {
    añadir(`tarde:${key}`, tp('Tarea atrasada: {0}', overdue[0].title), false)
  } else if (overdue.length > 1) {
    añadir(`tarde:${key}`, tp('Tienes {0} tareas atrasadas', overdue.length), false)
  }

  return out
}

export function markNoticesSent(keys: string[]) {
  const all = [...new Set([...readSent(), ...keys])]
  localStorage.setItem(SENT_KEY, JSON.stringify(all.slice(-200)))
}

export async function showSystemNotice(text: string) {
  if (notificationPermission() !== 'granted') return false
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
  if (reg) {
    await reg.showNotification('Nivra', { body: text, icon: '/favicon.svg' })
  } else {
    new Notification('Nivra', { body: text, icon: '/favicon.svg' })
  }
  return true
}
