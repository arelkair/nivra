import ICAL from 'ical.js'
import type { CalItem } from './store'
import { localDay } from './taskPlanning'

export type CalendarFeed = { id: string; title: string; url: string; enabled: boolean; updatedAt?: string; items: CalItem[]; error?: string }
export const GALICIA_SOURCE = 'https://abertos.xunta.gal/es/catalogo/economia-empresa-emprego/-/dataset/0684/calendario-laboral-2026'
export const GALICIA_2026 = ['01-01|Año Nuevo', '01-06|Reyes', '03-19|San José', '04-02|Jueves Santo', '04-03|Viernes Santo', '05-01|Fiesta del Trabajo', '06-24|San Juan', '07-25|Día Nacional de Galicia', '08-15|Asunción', '10-12|Fiesta Nacional de España', '12-08|Inmaculada Concepción', '12-25|Navidad'].map(row => { const [day, title] = row.split('|'); return { id: `galicia-2026-${day}`, title, date: `2026-${day}`, type: 'festividad', origin: 'evento' } as CalItem })

export function parseCalendar(text: string, feedId: string, now = new Date()): CalItem[] {
  if (text.length > 2_000_000 || !text.includes('BEGIN:VCALENDAR')) throw new Error('El archivo no es un calendario ICS válido o supera 2 MB.')
  const root = new ICAL.Component(ICAL.parse(text))
  const components = root.getAllSubcomponents('vevent')
  const events = components.map(component => new ICAL.Event(component))
  const startWindow = new Date(now.getFullYear() - 1, 0, 1), endWindow = new Date(now.getFullYear() + 2, 0, 1)
  const out: CalItem[] = []
  for (const event of events) {
    if (event.isRecurrenceException() || event.component.getFirstPropertyValue('status') === 'CANCELLED') continue
    for (const exception of events.filter(row => row.isRecurrenceException() && row.uid === event.uid)) event.relateException(exception)
    const add = (start: typeof event.startDate, end: typeof event.endDate, title: string, desc: string) => {
      const js = start.toJSDate(), finish = end.toJSDate()
      if (js >= endWindow || finish < startWindow) return
      const first = new Date(Math.max(new Date(js.getFullYear(), js.getMonth(), js.getDate()).getTime(), startWindow.getTime()))
      const last = start.isDate ? new Date(finish.getTime() - 1) : js
      for (let day = first; day <= last; day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
        if (out.length >= 5000) throw new Error('El calendario supera el límite de 5000 eventos.')
        out.push({ id: `feed:${feedId}:${event.uid}:${localDay(day)}:${start.toString()}`, title: title || 'Evento', date: localDay(day), desc: `${start.isDate ? '' : js.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + ' · '}${desc || ''}`, type: 'evento', origin: 'evento' })
      }
    }
    if (!event.isRecurring()) add(event.startDate, event.endDate, event.summary, event.description)
    else {
      const iterator = event.iterator(); let iteration = 0, occurrence
      while ((occurrence = iterator.next())) {
        if (++iteration > 50000) throw new Error('El calendario tiene demasiadas repeticiones.')
        if (occurrence.toJSDate() >= endWindow) break
        const detail = event.getOccurrenceDetails(occurrence)
        if (detail.item.component.getFirstPropertyValue('status') !== 'CANCELLED') add(detail.startDate, detail.endDate, detail.item.summary, detail.item.description)
      }
    }
  }
  return [...new Map(out.map(item => [item.id, item])).values()]
}
export async function loadFeed(feed: CalendarFeed) {
  const url = new URL(feed.url)
  if (url.protocol !== 'https:') throw new Error('Usa una dirección HTTPS de un calendario ICS.')
  let response: Response
  try {
    const target = import.meta.env.DEV && ['calendar.google.com', 'calendar.googleusercontent.com'].includes(url.hostname) ? `/api/calendar?url=${encodeURIComponent(url.href)}` : url.href
    response = await fetch(target, { credentials: 'omit', signal: AbortSignal.timeout(15000) })
  } catch { throw new Error('No se pudo leer el calendario. Comprueba la dirección o importa su archivo ICS si el servidor bloquea el acceso.') }
  if (!response.ok) throw new Error('No se pudo leer el calendario. Comprueba la dirección o importa su archivo ICS si el servidor bloquea el acceso.')
  const text = await response.text()
  return { ...feed, items: parseCalendar(text, feed.id), updatedAt: new Date().toISOString(), error: undefined }
}
