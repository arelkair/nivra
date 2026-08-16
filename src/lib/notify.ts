import {
  dateKey,
  monthDay,
  type Anniversary,
  type CalItem,
  type Countdown,
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

export type Pendiente = { clave: string; texto: string }

/** Qué habría que avisar hoy, sin repetir lo ya avisado. */
export function pendientes(
  hoy: Date,
  datos: {
    countdowns: Countdown[]
    anniversaries: Anniversary[]
    items: CalItem[]
    works: Work[]
  },
): Pendiente[] {
  const clave = dateKey(hoy)
  const mañana = dateKey(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1))
  const ya = new Set(leerEnviadas())
  const out: Pendiente[] = []
  const añadir = (c: string, texto: string) => {
    if (!ya.has(c)) out.push({ clave: c, texto })
  }

  for (const c of datos.countdowns) {
    if (new Date(c.target).getTime() <= hoy.getTime()) {
      añadir(`fin:${c.id}`, `Se ha acabado la cuenta atrás ${c.title}`)
    }
  }

  for (const a of datos.anniversaries) {
    if (a.md === monthDay(clave)) {
      añadir(`aniv:${a.id}:${clave}`, `Hoy es el aniversario de ${a.name || 'algo tuyo'}`)
    }
  }

  const deHoy = datos.items.filter((i) => i.date === clave)
  if (deHoy.length > 0) añadir(`hoy:${clave}`, 'Hoy hay alguna/s actividad/es')

  if (datos.works.some((w) => w.date === mañana)) {
    añadir(`manana:${mañana}`, 'Mañana hay algún examen/proyecto')
  }

  return out
}

export function marcarEnviadas(claves: string[]) {
  const todas = [...new Set([...leerEnviadas(), ...claves])]
  localStorage.setItem(ENVIADAS, JSON.stringify(todas.slice(-200)))
}

export function lanzar(texto: string) {
  if (permiso() !== 'granted') return false
  new Notification('Nivra', { body: texto, icon: '/favicon.svg' })
  return true
}
