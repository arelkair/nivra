import { dateKey, type Anniversary, type Block, type CalItem } from './store'

const INTERNAS = ['nivra-sync', 'nivra-sync-times', 'nivra-notified']

function datos() {
  const out: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('nivra-') && !INTERNAS.includes(k)) out[k] = localStorage.getItem(k) ?? ''
  }
  return out
}

const hoy = () => new Date().toISOString().slice(0, 10)

function descargar(nombre: string, texto: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

export function exportarJson() {
  descargar(`nivra-${hoy()}.json`, JSON.stringify(datos(), null, 2), 'application/json')
}

const escapa = (v: string) => `"${v.replace(/"/g, '""')}"`

/** Una fila por elemento de cada lista, con sus campos aplanados. */
export function exportarCsv() {
  const filas: string[] = ['seccion,campo,valor']
  for (const [clave, crudo] of Object.entries(datos())) {
    const seccion = clave.replace('nivra-', '')
    let valor: unknown
    try {
      valor = JSON.parse(crudo)
    } catch {
      valor = crudo
    }
    if (Array.isArray(valor)) {
      valor.forEach((item, i) => {
        if (item && typeof item === 'object') {
          for (const [campo, v] of Object.entries(item as Record<string, unknown>)) {
            filas.push([escapa(seccion), escapa(`${i}.${campo}`), escapa(String(v ?? ''))].join(','))
          }
        } else {
          filas.push([escapa(seccion), escapa(String(i)), escapa(String(item))].join(','))
        }
      })
    } else if (valor && typeof valor === 'object') {
      for (const [campo, v] of Object.entries(valor as Record<string, unknown>)) {
        filas.push([escapa(seccion), escapa(campo), escapa(String(v ?? ''))].join(','))
      }
    } else {
      filas.push([escapa(seccion), escapa(''), escapa(String(valor))].join(','))
    }
  }
  descargar(`nivra-${hoy()}.csv`, filas.join('\n'), 'text/csv;charset=utf-8')
}

const icsEscapa = (v: string) => v.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n')
const REPEAT_FREQ: Record<string, string> = { semanal: 'WEEKLY', mensual: 'MONTHLY', anual: 'YEARLY' }
const DIAS_ICS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

export function exportarIcsCalendario(items: CalItem[], anniversaries: Anniversary[]) {
  const lineas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nivra//ES']
  for (const it of items) {
    lineas.push(
      'BEGIN:VEVENT',
      `UID:${it.id}@nivra`,
      `DTSTART;VALUE=DATE:${it.date.replace(/-/g, '')}`,
      `SUMMARY:${icsEscapa(it.title)}`,
      ...(it.desc ? [`DESCRIPTION:${icsEscapa(it.desc)}`] : []),
      ...(it.repeat ? [`RRULE:FREQ=${REPEAT_FREQ[it.repeat]}`] : []),
      'END:VEVENT',
    )
  }
  for (const a of anniversaries) {
    const año = new Date().getFullYear()
    lineas.push(
      'BEGIN:VEVENT',
      `UID:${a.id}@nivra`,
      `DTSTART;VALUE=DATE:${año}${a.md.replace('-', '')}`,
      `SUMMARY:${icsEscapa(a.name || 'Aniversario')}`,
      'RRULE:FREQ=YEARLY',
      'END:VEVENT',
    )
  }
  lineas.push('END:VCALENDAR')
  descargar(`nivra-calendario-${hoy()}.ics`, lineas.join('\r\n'), 'text/calendar;charset=utf-8')
}

export function exportarIcsHorario(blocks: Block[]) {
  const hoyDate = new Date()
  const actual = (hoyDate.getDay() + 6) % 7
  const lineas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nivra//ES']
  for (const b of blocks) {
    const delta = (b.day - actual + 7) % 7
    const base = new Date(hoyDate.getFullYear(), hoyDate.getMonth(), hoyDate.getDate() + delta)
    const ymd = dateKey(base).replace(/-/g, '')
    lineas.push(
      'BEGIN:VEVENT',
      `UID:${b.id}@nivra`,
      `DTSTART:${ymd}T${b.start.replace(':', '')}00`,
      `DTEND:${ymd}T${b.end.replace(':', '')}00`,
      `RRULE:FREQ=WEEKLY;BYDAY=${DIAS_ICS[b.day]}`,
      `SUMMARY:${icsEscapa(b.title)}`,
      'END:VEVENT',
    )
  }
  lineas.push('END:VCALENDAR')
  descargar(`nivra-horario-${hoy()}.ics`, lineas.join('\r\n'), 'text/calendar;charset=utf-8')
}

/** Sólo acepta JSON: el CSV es para leerlo fuera, no para volver a entrar. */
export async function importarJson(fichero: File) {
  const texto = await fichero.text()
  const datos = JSON.parse(texto) as Record<string, unknown>
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new Error('El fichero no tiene el formato de una copia de Nivra.')
  }
  const claves = Object.keys(datos).filter((k) => k.startsWith('nivra-') && !INTERNAS.includes(k))
  if (claves.length === 0) throw new Error('La copia no contiene datos de Nivra.')

  for (const k of claves) {
    const v = datos[k]
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
  }
  return claves.length
}
