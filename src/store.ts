import { useEffect, useState } from 'react'

export type NivraEvent = {
  id: string
  date: string // YYYY-MM-DD
  time?: string // HH:MM
  title: string
}

export type Task = {
  id: string
  title: string
  done: boolean
}

export type Block = {
  id: string
  day: number // 0 = lunes
  start: string // HH:MM
  end: string // HH:MM
  title: string
}

export const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** Clave local del día, sin pasar por UTC (evita desfases de un día). */
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Índice de día con la semana empezando en lunes. */
export const weekIndex = (d: Date) => (d.getDay() + 6) % 7

/** Celdas del mes, empezando en lunes. null = hueco antes del día 1. */
export function monthGrid(year: number, month: number): (number | null)[] {
  const offset = weekIndex(new Date(year, month, 1))
  const days = new Date(year, month + 1, 0).getDate()
  return [...Array<null>(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
}

export function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial // ponytail: datos corruptos = empezar de cero, no romper la app
    }
  })
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])
  return [value, setValue] as const
}

// ponytail: comprobación mínima en dev de la única lógica con aristas (padding y hueco inicial)
if (import.meta.env.DEV) {
  console.assert(dateKey(new Date(2026, 7, 5)) === '2026-08-05', 'dateKey debe rellenar con ceros')
  console.assert(monthGrid(2026, 7).length === 5 + 31, 'agosto 2026 empieza en sábado')
  console.assert(monthGrid(2026, 7)[5] === 1, 'el día 1 va tras 5 huecos')
  console.assert(weekIndex(new Date(2026, 7, 10)) === 0, 'lunes es el índice 0')
}
