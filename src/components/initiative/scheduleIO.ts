import { DAYS, type Block } from '../../lib/store'

export type ParsedBlock = Pick<Block, 'day' | 'start' | 'end' | 'title' | 'color'>

export type ParseResult = { blocks: ParsedBlock[]; errors: number }

const strip = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const DAY_ALIASES: Record<string, number> = {}
;[
  ['lunes', 'lun', 'l', 'monday', 'mon'],
  ['martes', 'mar', 'martes', 'tuesday', 'tue'],
  ['miercoles', 'mie', 'x', 'wednesday', 'wed'],
  ['jueves', 'jue', 'j', 'thursday', 'thu'],
  ['viernes', 'vie', 'v', 'friday', 'fri'],
  ['sabado', 'sab', 's', 'saturday', 'sat'],
  ['domingo', 'dom', 'd', 'sunday', 'sun'],
].forEach((names, index) => names.forEach((n) => (DAY_ALIASES[n] = index)))
DAY_ALIASES.m = 1

const parseDay = (raw: string): number | null => {
  const key = strip(raw)
  if (/^[1-7]$/.test(key)) return Number(key) - 1
  return key in DAY_ALIASES ? DAY_ALIASES[key] : null
}

const parseTime = (raw: string): string | null => {
  const m = /^(\d{1,2})[:.h](\d{2})$/.exec(raw.trim()) ?? /^(\d{1,2})$/.exec(raw.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = m[2] ? Number(m[2]) : 0
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))

const clean = (b: Record<string, unknown>): ParsedBlock | null => {
  const day = typeof b.day === 'number' && b.day >= 0 && b.day <= 6 ? b.day : parseDay(String(b.day ?? ''))
  const start = parseTime(String(b.start ?? ''))
  const end = parseTime(String(b.end ?? ''))
  const title = String(b.title ?? '').trim().slice(0, 60)
  if (day === null || !start || !end || !title || toMinutes(end) <= toMinutes(start)) return null
  const color = typeof b.color === 'string' && /^#[0-9a-f]{6}$/i.test(b.color.trim()) ? b.color.trim() : undefined
  return { day, start, end, title, color }
}

const splitLine = (line: string) => {
  const sep = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ','
  return line.split(sep).map((cell) => cell.trim().replace(/^"(.*)"$/, '$1'))
}

export function parseSchedule(text: string): ParseResult {
  const source = text.trim()
  if (!source) return { blocks: [], errors: 0 }

  if (source.startsWith('[') || source.startsWith('{')) {
    try {
      const data = JSON.parse(source)
      const list: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.blocks) ? data.blocks : []
      const blocks: ParsedBlock[] = []
      let errors = 0
      for (const item of list) {
        const parsed = item && typeof item === 'object' ? clean(item as Record<string, unknown>) : null
        if (parsed) blocks.push(parsed)
        else errors++
      }
      return { blocks, errors }
    } catch {
      return { blocks: [], errors: 1 }
    }
  }

  const blocks: ParsedBlock[] = []
  let errors = 0
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim()) continue
    const cells = splitLine(line)
    if (cells.length < 4) {
      const loose = /^\s*(\S+)\s+(\d{1,2}[:.h]?\d{0,2})\s*[-–a]\s*(\d{1,2}[:.h]?\d{0,2})\s+(.+)$/.exec(line)
      const parsed = loose ? clean({ day: loose[1], start: loose[2], end: loose[3], title: loose[4] }) : null
      if (parsed) blocks.push(parsed)
      else if (blocks.length > 0 || parseDay(cells[0]) !== null) errors++
      continue
    }
    if (parseDay(cells[0]) === null && blocks.length === 0 && !parseTime(cells[1] ?? '')) continue
    const parsed = clean({ day: cells[0], start: cells[1], end: cells[2], title: cells[3], color: cells[4] })
    if (parsed) blocks.push(parsed)
    else errors++
  }
  return { blocks, errors }
}

const csvCell = (value: string) => (/[",;\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)

export function scheduleToCsv(blocks: Block[]): string {
  const rows = [...blocks]
    .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
    .map((b) => [DAYS[b.day] ?? String(b.day + 1), b.start, b.end, b.title, b.color ?? ''].map(csvCell).join(','))
  return ['dia,inicio,fin,titulo,color', ...rows].join('\n')
}

export function scheduleToJson(blocks: Block[]): string {
  const list = [...blocks]
    .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
    .map((b) => ({ day: b.day, start: b.start, end: b.end, title: b.title, ...(b.color ? { color: b.color } : {}) }))
  return JSON.stringify({ app: 'nivra', kind: 'schedule', blocks: list }, null, 2)
}

export function downloadText(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
