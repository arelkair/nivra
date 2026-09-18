import { useEffect, useState } from 'react'
import { onSyncApplied, markChanged } from './sync'
import { locale } from './i18n'

export type PageId =
  | 'dashboard'
  | 'calendario'
  | 'horario'
  | 'tareas'
  | 'examenes'
  | 'notas'
  | 'bloc'
  | 'banco'
  | 'deseos'
  | 'suscripciones'
  | 'cuentas'
  | 'recordatorios'

export type Unit = 'years' | 'months' | 'days' | 'hours' | 'minutes' | 'seconds'

export const UNITS: { id: Unit; one: string; many: string }[] = [
  { id: 'years', one: 'año', many: 'años' },
  { id: 'months', one: 'mes', many: 'meses' },
  { id: 'days', one: 'día', many: 'días' },
  { id: 'hours', one: 'hora', many: 'horas' },
  { id: 'minutes', one: 'minuto', many: 'minutos' },
  { id: 'seconds', one: 'segundo', many: 'segundos' },
]

export type Countdown = {
  id: string
  title: string
  subtitle?: string
  target: string
  created: string
  units: Record<Unit, boolean>
}

export type Profile = { id: string; name: string; mode?: 'libre' | 'tabla' }

export type Subject = { id: string; name: string; color: string }

export const INK = '#111111'
export const PAPER = '#ffffff'

const luminancia = (hex: string) => {
  const canal = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4)
}

const contraste = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

export function textOn(background: string): string {
  const hex = background.trim().replace('#', '')
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
  if (!/^[0-9a-f]{6}$/i.test(full)) return PAPER
  const fondo = luminancia(full)
  return contraste(fondo, luminancia('111111')) >= contraste(fondo, luminancia('ffffff'))
    ? INK
    : PAPER
}

export type Subscription = {
  id: string
  title: string
  url?: string
  price: number
  day: number
  lastCharged?: string
}

export type Goal =
  | { id: string; kind: 'meta'; title: string; amount: number; date: string }
  | { id: string; kind: 'limite'; title: string; amount: number; period: 'semana' | 'mes' }
  | { id: string; kind: 'idea'; title: string; desc?: string }

export const SUBSCRIPTION_CAT = 'Suscripción'

export function duePayments(subs: Subscription[], today: Date) {
  const pendingNotices: { sub: Subscription; date: string }[] = []
  for (const sub of subs) {
    let año = today.getFullYear()
    let month = today.getMonth()
    for (let i = 0; i < 12; i++) {
      const lastDay = new Date(año, month + 1, 0).getDate()
      const date = dateKey(new Date(año, month, Math.min(sub.day, lastDay)))
      if (date > dateKey(today)) {
        month--
        if (month < 0) {
          month = 11
          año--
        }
        continue
      }
      if (sub.lastCharged && date <= sub.lastCharged) break
      pendingNotices.push({ sub, date: date })
      if (!sub.lastCharged) break
      month--
      if (month < 0) {
        month = 11
        año--
      }
    }
  }
  return pendingNotices
}

export const DEFAULT_PROFILE = 'principal'

export type Wish = {
  id: string
  title: string
  desc?: string
  price?: number
  url?: string
}

export type Grade = {
  id: string
  value: number
  desc?: string
  subject?: string
  work?: string
  kind: 'examen' | 'trabajo' | 'otro'
  date: string
  term?: 1 | 2 | 3
  weight?: number
}

export type Streak = { count: number; last: string }

export type PageBookmark = { id: string; title: string; color: string }

export type NotepadPage = { id: string; html: string; bookmarks?: PageBookmark[] }

export type Notepad = { id: string; title: string; html?: string; pages?: NotepadPage[] }

export const pagesOf = (n: Notepad): NotepadPage[] =>
  n.pages?.length ? n.pages : [{ id: `${n.id}-1`, html: n.html ?? '' }]

const FORBIDDEN_TAGS = /^(script|style|iframe|object|embed|link|savingGoal|form)$/i

export function sanitize(html: string) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  for (const element of Array.from(doc.body.querySelectorAll('*'))) {
    if (FORBIDDEN_TAGS.test(element.tagName)) {
      element.remove()
      continue
    }
    for (const attr of Array.from(element.attributes)) {
      const attrName = attr.name.toLowerCase()
      const value = attr.value.replace(/\s/g, '').toLowerCase()
      if (attrName.startsWith('on') || value.startsWith('javascript:')) element.removeAttribute(attr.name)
    }
  }
  return doc.body.firstElementChild?.innerHTML ?? ''
}

export const ACCENTS: { id: string; label: string; swatch: string }[] = [
  { id: 'basico', label: 'Básico', swatch: '#9ca3af' },
  { id: 'rojo', label: 'Rojo', swatch: '#ef4444' },
  { id: 'naranja', label: 'Naranja', swatch: '#f97316' },
  { id: 'amarillo', label: 'Amarillo', swatch: '#eab308' },
  { id: 'verde', label: 'Verde', swatch: '#22c55e' },
  { id: 'cielo', label: 'Azul cielo', swatch: '#38bdf8' },
  { id: 'marino', label: 'Azul marino', swatch: '#1e40af' },
  { id: 'purpura', label: 'Púrpura', swatch: '#a855f7' },
  { id: 'rosa', label: 'Rosa', swatch: '#ec4899' },
  { id: 'beige', label: 'Beige', swatch: '#d6c3a5' },
]

const STEP_MS: Record<string, number> = {
  days: 86400000,
  hours: 3600000,
  minutes: 60000,
  seconds: 1000,
}

const addUnit = (d: Date, unit: 'years' | 'months', n: number) =>
  new Date(
    d.getFullYear() + (unit === 'years' ? n : 0),
    d.getMonth() + (unit === 'months' ? n : 0),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
  )

export function countdown(from: Date, to: Date, enabled: Record<Unit, boolean>) {
  const out: { unit: Unit; value: number; label: string }[] = []
  if (to.getTime() <= from.getTime()) {
    return UNITS.filter((u) => enabled[u.id]).map((u) => ({ unit: u.id, value: 0, label: u.many }))
  }
  let cursor = from
  for (const u of UNITS) {
    if (!enabled[u.id]) continue
    let value = 0
    if (u.id === 'years' || u.id === 'months') {
      while (addUnit(cursor, u.id, 1) <= to) {
        cursor = addUnit(cursor, u.id, 1)
        value++
      }
    } else {
      const size = STEP_MS[u.id]
      value = Math.floor((to.getTime() - cursor.getTime()) / size)
      cursor = new Date(cursor.getTime() + value * size)
    }
    out.push({ unit: u.id, value, label: value === 1 ? u.one : u.many })
  }
  return out
}

export function progress(created: string, target: string, now: Date) {
  const start = new Date(created).getTime()
  const end = new Date(target).getTime()
  if (end <= start) return 1
  return Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)))
}

export type ItemType = 'festividad' | 'tarea' | 'examen' | 'proyecto'

export type Repeat = 'semanal' | 'mensual' | 'anual'

export const REPEATS: { id: Repeat; label: string }[] = [
  { id: 'semanal', label: 'Cada semana' },
  { id: 'mensual', label: 'Cada mes' },
  { id: 'anual', label: 'Cada año' },
]

export type NivraEvent = {
  id: string
  date: string
  title: string
  desc?: string
  type: ItemType
  repeat?: Repeat
}

export type SubTask = { id: string; title: string; done: boolean }

export type Task = {
  id: string
  title: string
  desc?: string
  date?: string
  done: boolean
  subtasks: SubTask[]
  subject?: string
  notepad?: string
  url?: string
}

export type Work = {
  id: string
  kind: 'examen' | 'proyecto'
  title: string
  desc?: string
  date?: string
  category?: 'colegio' | 'casa'
  subject?: string
  notepad?: string
}

export type Reminder = {
  id: string
  title: string
  subtitle?: string
  date: string
  time?: string
  work?: string
}

export type Movement = {
  id: string
  kind: 'ingreso' | 'gasto'
  amount: number
  category: string
  date: string
  note?: string
}

export type Anniversary = { id: string; md: string; name: string }

export type Block = {
  id: string
  day: number
  start: string
  end: string
  title: string
  profile?: string
  lateNight?: boolean
  color?: string
  textColor?: string
  textBg?: string
}

export const blockProfile = (b: Block) => b.profile ?? DEFAULT_PROFILE

export const TYPES: Record<ItemType, { label: string; dot: string; chip: string }> = {
  festividad: {
    label: 'Festividad',
    dot: 'bg-purple-500',
    chip: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200',
  },
  tarea: {
    label: 'Tarea',
    dot: 'bg-blue-500',
    chip: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200',
  },
  examen: {
    label: 'Examen',
    dot: 'bg-red-500',
    chip: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
  },
  proyecto: {
    label: 'Proyecto',
    dot: 'bg-green-600',
    chip: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200',
  },
}

export function reorder<T>(list: T[], index: number, step: number): T[] {
  const destino = index + step
  if (destino < 0 || destino >= list.length) return list
  const copy = [...list]
  const [item] = copy.splice(index, 1)
  copy.splice(destino, 0, item)
  return copy
}

export function moveById<T extends { id: string }>(list: T[], fromId: string, toId: string): T[] {
  if (fromId === toId) return list
  const fromIndex = list.findIndex((x) => x.id === fromId)
  const toIndex = list.findIndex((x) => x.id === toId)
  if (fromIndex === -1 || toIndex === -1) return list
  const copy = [...list]
  const [item] = copy.splice(fromIndex, 1)
  copy.splice(toIndex, 0, item)
  return copy
}

export const INCOME_CATS = ['Regalo', 'Deuda', 'Venta', 'Otros']
export const EXPENSE_CATS = ['Regalo', 'Deuda', 'Alimentación', 'Juegos', 'Aparatos', 'Otros']

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

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const weekIndex = (d: Date) => (d.getDay() + 6) % 7

export const monthDay = (date: string) => date.slice(5)

export const shortDate = (date: string) => {
  const [, m, d] = date.split('-').map(Number)
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`
}

export function monthGrid(year: number, month: number): (number | null)[] {
  const offset = weekIndex(new Date(year, month, 1))
  const days = new Date(year, month + 1, 0).getDate()
  return [...Array<null>(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
}

const FIXED_HOLIDAYS = [
  '01-01',
  '01-06',
  '05-01',
  '05-17',
  '07-25',
  '08-15',
  '10-12',
  '11-01',
  '12-06',
  '12-08',
  '12-25',
]

function easter(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

const shift = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)

export function isOfficialHoliday(date: string): boolean {
  if (FIXED_HOLIDAYS.includes(monthDay(date))) return true
  const year = Number(date.slice(0, 4))
  const sunday = easter(year)
  return date === dateKey(shift(sunday, -3)) || date === dateKey(shift(sunday, -2))
}

export const isWeekend = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  return weekIndex(new Date(y, m - 1, d)) >= 5
}

export const isFreeDay = (date: string, manual: string[]) =>
  isWeekend(date) || isOfficialHoliday(date) || manual.includes(date)

export type CalItem = {
  id: string
  date: string
  title: string
  desc?: string
  type: ItemType
  origin: 'evento' | 'tarea' | 'examen' | 'proyecto'
  repeat?: Repeat
  subject?: string
}

const dayOfMonth = (date: string) => Number(date.slice(8))

function occursOn(item: CalItem, date: string) {
  if (item.date === date) return true
  if (!item.repeat || date < item.date) return false

  const [y, m, d] = date.split('-').map(Number)
  if (item.repeat === 'anual') return monthDay(item.date) === monthDay(date)
  if (item.repeat === 'mensual') {
    const lastDay = new Date(y, m, 0).getDate()
    return dayOfMonth(item.date) === d || (dayOfMonth(item.date) > lastDay && d === lastDay)
  }
  const [y2, m2, d2] = item.date.split('-').map(Number)
  return weekIndex(new Date(y, m - 1, d)) === weekIndex(new Date(y2, m2 - 1, d2))
}

export const itemsOfDay = (items: CalItem[], date: string) =>
  items.filter((i) => occursOn(i, date))

export function upcomingItems(items: CalItem[], from: Date, dias: number) {
  const out: { date: string; item: CalItem }[] = []
  for (let i = 1; i <= dias; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i)
    const date = dateKey(d)
    for (const item of itemsOfDay(items, date)) out.push({ date: date, item })
  }
  return out
}

export function calendarItems(events: NivraEvent[], tasks: Task[], works: Work[]): CalItem[] {
  return [
    ...events.map((e) => ({
      id: e.id,
      date: e.date,
      title: e.title,
      desc: e.desc,
      type: e.type ?? 'festividad',
      origin: 'evento' as const,
      repeat: e.repeat,
    })),
    ...tasks
      .filter((t) => t.date)
      .map((t) => ({
        id: t.id,
        date: t.date!,
        title: t.title,
        desc: t.desc,
        type: 'tarea' as const,
        origin: 'tarea' as const,
      })),
    ...works
      .filter((w) => w.date)
      .map((w) => ({
        id: w.id,
        date: w.date!,
        title: w.title,
        desc: w.desc,
        type: w.kind,
        origin: w.kind,
        subject: w.subject,
      })),
  ]
}

export const eur = (n: number) =>
  new Intl.NumberFormat(locale(), { style: 'currency', currency: 'EUR' }).format(n)

export function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    const raw = JSON.stringify(value)
    const previous = localStorage.getItem(key)
    if (previous === raw) return
    localStorage.setItem(key, raw)
    markChanged(key, previous === null)
  }, [key, value])

  useEffect(
    () =>
      onSyncApplied(() => {
        const raw = localStorage.getItem(key)
        if (raw === null || raw === JSON.stringify(value)) return
        try {
          setValue(JSON.parse(raw) as T)
        } catch {
        }
      }),
    [key, value],
  )

  return [value, setValue] as const
}

if (import.meta.env.DEV) {
  console.assert(textOn('#eab308') === INK, 'el amarillo pide tinta oscura')
  console.assert(textOn('#1e40af') === PAPER, 'el azul marino pide tinta clara')
  console.assert(textOn('#ffffff') === INK && textOn('#000000') === PAPER, 'blanco y negro')
  console.assert(textOn('#fff') === INK, 'admite hex de tres cifras')
  console.assert(textOn('rojo') === PAPER, 'un color ilegible cae en tinta clara')
  console.assert(dateKey(new Date(2026, 7, 5)) === '2026-08-05', 'dateKey debe rellenar con ceros')
  console.assert(monthGrid(2026, 7).length === 5 + 31, 'agosto 2026 empieza en sábado')
  console.assert(monthGrid(2026, 7)[5] === 1, 'el día 1 va tras 5 huecos')
  console.assert(weekIndex(new Date(2026, 7, 10)) === 0, 'lunes es el índice 0')
  console.assert(dateKey(easter(2026)) === '2026-04-05', 'Pascua 2026 = 5 de abril')
  console.assert(dateKey(easter(2025)) === '2025-04-20', 'Pascua 2025 = 20 de abril')
  console.assert(isOfficialHoliday('2026-04-03'), 'Viernes Santo 2026 = 3 de abril')
  console.assert(isOfficialHoliday('2026-07-25'), 'Santiago Apóstol es festivo en Galicia')
  console.assert(!isOfficialHoliday('2026-08-11'), '11 de agosto de 2026 es laborable')

  const all = Object.fromEntries(UNITS.map((u) => [u.id, true])) as Record<Unit, boolean>
  const c = countdown(new Date(2026, 0, 1, 0, 0, 0), new Date(2027, 2, 10, 3, 4, 5), all)
  console.assert(c[0].value === 1 && c[1].value === 2, 'un año y dos meses hasta el 10/03/2027')
  console.assert(c[2].value === 9 && c[3].value === 3, 'y nueve días y tres horas')
  const withoutYears = countdown(new Date(2026, 0, 1), new Date(2027, 0, 1), {
    ...all,
    years: false,
  })
  console.assert(withoutYears[0].value === 12, 'sin años, el año pasa a contar como 12 meses')

  console.assert(
    sanitize('<b>hola</b><script>alert(1)</script>') === '<b>hola</b>',
    'el bloc de notas no guarda scripts',
  )
  console.assert(
    sanitize('<a href="javascript:alert(1)" onclick="x()">v</a>') === '<a>v</a>',
    'ni enlaces ni atributos ejecutables',
  )

  const weekly: CalItem = {
    id: 'x',
    date: '2026-08-04',
    title: 'x',
    type: 'festividad',
    origin: 'evento',
    repeat: 'semanal',
  }
  console.assert(occursOn(weekly, '2026-08-11'), 'lo semanal cae el martes siguiente')
  console.assert(!occursOn(weekly, '2026-08-12'), 'pero no el miércoles')
  console.assert(!occursOn(weekly, '2026-07-28'), 'ni antes de empezar')
  console.assert(
    occursOn({ ...weekly, repeat: 'mensual' }, '2026-09-04'),
    'lo mensual cae el mismo día del mes',
  )
  console.assert(
    occursOn({ ...weekly, date: '2026-01-31', repeat: 'mensual' }, '2026-02-28'),
    'y el 31 cae en el último día de febrero',
  )
}
