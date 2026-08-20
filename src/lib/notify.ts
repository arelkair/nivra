import {
  TYPES,
  dateKey,
  itemsDeDia,
  monthDay,
  type Anniversary,
  type CalItem,
  type Countdown,
  type Reminder,
  type Task,
  type Work,
} from './store'

const ENVIADAS = 'nivra-notified'

const leerEnviadas = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(ENVIADAS) ?? '[]') as string[]
  } catch {
    return []
  }
}

export const soportadas = () => typeof Notification !== 'undefined'

export const permiso = () => (soportadas() ? Notification.permission : 'denied')

export async function pedirPermiso() {
  if (!soportadas()) return 'denied'
  return Notification.requestPermission()
}

export type Pendiente = { clave: string; texto: string; sistema: boolean }

export function pendientes(
  hoy: Date,
  datos: {
    countdowns: Countdown[]
    anniversaries: Anniversary[]
    items: CalItem[]
    works: Work[]
    reminders: Reminder[]
    tasks: Task[]
  },
): Pendiente[] {
  const clave = dateKey(hoy)
  const mañana = dateKey(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1))
  const ya = new Set(leerEnviadas())
  const out: Pendiente[] = []
  const añadir = (c: string, texto: string, sistema: boolean) => {
    if (!ya.has(c)) out.push({ clave: c, texto, sistema })
  }

  for (const r of datos.reminders) {
    if (r.date !== clave) continue
    const hora = r.time ? ` a las ${r.time}` : ''
    añadir(`record:${r.id}:${clave}`, `Hoy${hora}: ${r.title}`, true)
  }

  for (const w of datos.works) {
    if (w.date !== mañana) continue
    añadir(`manana:${w.id}:${mañana}`, `Mañana tienes ${TYPES[w.kind].label.toLowerCase()} de ${w.title}`, true)
  }

  for (const c of datos.countdowns) {
    if (new Date(c.target).getTime() <= hoy.getTime()) {
      añadir(`fin:${c.id}`, `Se ha acabado la cuenta atrás de ${c.title}`, true)
    }
  }

  for (const a of datos.anniversaries) {
    if (a.md === monthDay(clave)) {
      añadir(`aniv:${a.id}:${clave}`, `Hoy es el aniversario de ${a.name || 'algo tuyo'}`, true)
    }
  }

  // itemsDeDia rather than i.date === clave so recurring entries are counted.
  for (const i of itemsDeDia(datos.items, clave)) {
    añadir(`hoy:${i.id}:${clave}`, `${TYPES[i.type].label} de hoy: ${i.title}`, false)
  }

  const atrasadas = datos.tasks.filter((t) => !t.done && t.date && t.date < clave)
  if (atrasadas.length === 1) {
    añadir(`tarde:${clave}`, `Tarea atrasada: ${atrasadas[0].title}`, false)
  } else if (atrasadas.length > 1) {
    añadir(`tarde:${clave}`, `Tienes ${atrasadas.length} tareas atrasadas`, false)
  }

  return out
}

export function marcarEnviadas(claves: string[]) {
  const todas = [...new Set([...leerEnviadas(), ...claves])]
  localStorage.setItem(ENVIADAS, JSON.stringify(todas.slice(-200)))
}

export async function lanzar(texto: string) {
  if (permiso() !== 'granted') return false
  // With an active service worker some browsers (Android Chrome) only allow
  // registration.showNotification and reject the `new Notification` constructor.
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
  if (reg) {
    await reg.showNotification('Nivra', { body: texto, icon: '/favicon.svg' })
  } else {
    new Notification('Nivra', { body: texto, icon: '/favicon.svg' })
  }
  return true
}
