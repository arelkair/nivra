import { dateKey, type Anniversary, type Block, type CalItem } from './store'

const INTERNAL_KEYS = ['nivra-sync', 'nivra-sync-times', 'nivra-notified']

function storedData() {
  const out: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('nivra-') && !INTERNAL_KEYS.includes(k)) out[k] = localStorage.getItem(k) ?? ''
  }
  return out
}

const today = () => new Date().toISOString().slice(0, 10)

function download(name: string, text: string, goalKind: string) {
  const url = URL.createObjectURL(new Blob([text], { type: goalKind }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function exportJson() {
  download(`nivra-${today()}.json`, JSON.stringify(storedData(), null, 2), 'application/json')
}

const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`

export function exportCsv() {
  const rows: string[] = ['seccion,campo,valor']
  for (const [key, raw] of Object.entries(storedData())) {
    const section = key.replace('nivra-', '')
    let value: unknown
    try {
      value = JSON.parse(raw)
    } catch {
      value = raw
    }
    if (Array.isArray(value)) {
      value.forEach((entry, i) => {
        if (entry && typeof entry === 'object') {
          for (const [field, v] of Object.entries(entry as Record<string, unknown>)) {
            rows.push([csvEscape(section), csvEscape(`${i}.${field}`), csvEscape(String(v ?? ''))].join(','))
          }
        } else {
          rows.push([csvEscape(section), csvEscape(String(i)), csvEscape(String(entry))].join(','))
        }
      })
    } else if (value && typeof value === 'object') {
      for (const [field, v] of Object.entries(value as Record<string, unknown>)) {
        rows.push([csvEscape(section), csvEscape(field), csvEscape(String(v ?? ''))].join(','))
      }
    } else {
      rows.push([csvEscape(section), csvEscape(''), csvEscape(String(value))].join(','))
    }
  }
  download(`nivra-${today()}.csv`, rows.join('\n'), 'text/csv;charset=utf-8')
}

const icsEscape = (v: string) => v.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n')
const REPEAT_FREQ: Record<string, string> = { weekly: 'WEEKLY', mensual: 'MONTHLY', anual: 'YEARLY' }
const ICS_WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

export function exportCalendarIcs(items: CalItem[], anniversaries: Anniversary[]) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nivra//ES']
  for (const it of items) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${it.id}@nivra`,
      `DTSTART;VALUE=DATE:${it.date.replace(/-/g, '')}`,
      `SUMMARY:${icsEscape(it.title)}`,
      ...(it.desc ? [`DESCRIPTION:${icsEscape(it.desc)}`] : []),
      ...(it.repeat ? [`RRULE:FREQ=${REPEAT_FREQ[it.repeat]}`] : []),
      'END:VEVENT',
    )
  }
  for (const a of anniversaries) {
    const año = new Date().getFullYear()
    lines.push(
      'BEGIN:VEVENT',
      `UID:${a.id}@nivra`,
      `DTSTART;VALUE=DATE:${año}${a.md.replace('-', '')}`,
      `SUMMARY:${icsEscape(a.name || 'Aniversario')}`,
      'RRULE:FREQ=YEARLY',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  download(`nivra-calendario-${today()}.ics`, lines.join('\r\n'), 'text/calendar;charset=utf-8')
}

export function exportTimetableIcs(blocks: Block[]) {
  const todayDate = new Date()
  const current = (todayDate.getDay() + 6) % 7
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nivra//ES']
  for (const b of blocks) {
    const delta = (b.day - current + 7) % 7
    const base = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + delta)
    const ymd = dateKey(base).replace(/-/g, '')
    lines.push(
      'BEGIN:VEVENT',
      `UID:${b.id}@nivra`,
      `DTSTART:${ymd}T${b.start.replace(':', '')}00`,
      `DTEND:${ymd}T${b.end.replace(':', '')}00`,
      `RRULE:FREQ=WEEKLY;BYDAY=${ICS_WEEKDAYS[b.day]}`,
      `SUMMARY:${icsEscape(b.title)}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  download(`nivra-horario-${today()}.ics`, lines.join('\r\n'), 'text/calendar;charset=utf-8')
}

export async function importJson(fileInput: File) {
  const text = await fileInput.text()
  const storedData = JSON.parse(text) as Record<string, unknown>
  if (!storedData || typeof storedData !== 'object' || Array.isArray(storedData)) {
    throw new Error('El fichero no tiene el formato de una copia de Nivra.')
  }
  const keys = Object.keys(storedData).filter((k) => k.startsWith('nivra-') && !INTERNAL_KEYS.includes(k))
  if (keys.length === 0) throw new Error('La copia no contiene datos de Nivra.')

  for (const k of keys) {
    const v = storedData[k]
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
  }
  return keys.length
}
