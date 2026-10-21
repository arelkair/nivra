import type { Subject, Task } from './store'
import { localDay } from './taskPlanning'

export type FocusSession = { id: string; subject: string; minutes: number; completedAt: string }
export type Habit = { id: string; title: string; days: string[] }
export type Reading = { id: string; title: string; author: string; pages: number; total: number }
export type JournalEntry = { id: string; date: string; mood: number; body: string }
const fold = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
export function parseCapture(text: string, subjects: Subject[], now = new Date()) {
  let title = text.trim()
  const normalized = fold(title)
  const kind = /\b(examen|exam|exame)\b/.test(normalized) ? 'examen' : /\b(proyecto|project|proxecto)\b/.test(normalized) ? 'proyecto' : 'tarea'
  let date = ''
  const explicit = title.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (explicit && localDay(new Date(`${explicit[1]}T12:00:00`)) === explicit[1]) { date = explicit[1]; title = title.replace(explicit[0], '') }
  else {
    const weekdays = ['domingo|sunday', 'lunes|luns|monday', 'martes|tuesday', 'miercoles|mercores|wednesday', 'jueves|xoves|thursday', 'viernes|venres|friday', 'sabado|saturday']
    let offset: number | undefined
    const relative = normalized.match(/\b(hoy|today|hoxe|manana|tomorrow|mana)\b/)
    if (relative) { offset = ['hoy', 'today', 'hoxe'].includes(relative[0]) ? 0 : 1; title = title.replace(new RegExp(relative[0].split('').map(c => c === 'n' ? '[nñ]' : c === 'a' ? '[aá]' : c).join(''), 'i'), '') }
    else weekdays.forEach((pattern, day) => { const found = normalized.match(new RegExp(`\\b(${pattern})\\b`)); if (found) { offset = (day - now.getDay() + 7) % 7 || 7; const start = found.index!; title = title.slice(0, start) + title.slice(start + found[0].length) } })
    if (offset !== undefined) { const day = new Date(now); day.setDate(day.getDate() + offset); date = localDay(day) }
  }
  const aliases: Record<string, string[]> = { matematicas: ['mates', 'math', 'maths'], 'lingua galega': ['galego', 'gallego'], ingles: ['english'], 'lengua castellana': ['lengua', 'castellano'], 'fisica y quimica': ['fyq', 'fisica', 'quimica'] }
  const subject = subjects.find(s => [fold(s.name), ...(aliases[fold(s.name)] || [])].some(name => new RegExp(`(?:^|\\s)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\s)`).test(` ${normalized} `)))
  title = title.replace(/\b(examen|exam|exame|proyecto|project|proxecto|tarea|task|tarefa)\b/i, '').replace(/\s+/g, ' ').trim()
  return { kind, title: title || text.trim(), date, subject: subject?.id ?? '' }
}
export function habitStreak(days: string[], now = new Date()) {
  const unique = new Set(days)
  const day = new Date(now)
  if (!unique.has(localDay(day))) day.setDate(day.getDate() - 1)
  let streak = 0
  while (unique.has(localDay(day))) { streak++; day.setDate(day.getDate() - 1) }
  return streak
}
export function weeklySummary(tasks: Task[], sessions: FocusSession[], now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
  return { start: localDay(start), end: localDay(now), tasks: tasks.filter(task => task.done && task.completedAt && new Date(task.completedAt) >= start && new Date(task.completedAt) <= now).length, minutes: sessions.filter(s => new Date(s.completedAt) >= start && new Date(s.completedAt) <= now).reduce((sum, s) => sum + s.minutes, 0) }
}
export function courseProgress(start: string, end: string, now = new Date()) {
  const a = new Date(`${start}T00:00:00`).getTime(), b = new Date(`${end}T23:59:59`).getTime()
  return Number.isFinite(a) && Number.isFinite(b) && b > a ? Math.max(0, Math.min(100, Math.round((now.getTime() - a) / (b - a) * 100))) : 0
}
export type QuietHours = { enabled: boolean; start: string; end: string }
export function isQuietHours(settings: QuietHours, now = new Date()) {
  if (!settings.enabled) return false
  const minute = now.getHours() * 60 + now.getMinutes(), toMinute = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
  const start = toMinute(settings.start), end = toMinute(settings.end)
  return start === end || (start < end ? minute >= start && minute < end : minute >= start || minute < end)
}
export const ESO_KIT = ['Matemáticas', 'Lengua Castellana', 'Lingua Galega', 'Inglés', 'Geografía e Historia', 'Educación Física', 'Física y Química', 'Biología y Geología']
