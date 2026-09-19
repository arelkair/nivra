import type { Countdown, Unit } from '../../lib/store'

export const DEFAULT_UNITS: Record<Unit, boolean> = {
  years: false,
  months: false,
  days: true,
  hours: true,
  minutes: true,
  seconds: true,
}

export const pad = (n: number) => String(n).padStart(2, '0')
export const dateOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const timeOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

export type Draft = { id: string | null; title: string; subtitle: string; date: string; time: string; units: Record<Unit, boolean>; created: string }

export const freshDraft = (): Draft => ({
  id: null,
  title: '',
  subtitle: '',
  date: '',
  time: '00:00',
  units: DEFAULT_UNITS,
  created: new Date().toISOString(),
})

export const draftToCountdown = (draft: Draft): Countdown => ({
  id: draft.id ?? crypto.randomUUID(),
  title: draft.title.trim(),
  subtitle: draft.subtitle.trim() || undefined,
  target: `${draft.date}T${draft.time || '00:00'}`,
  created: draft.id ? draft.created : new Date().toISOString(),
  units: draft.units,
})

export const toDraft = (c: Countdown): Draft => {
  const target = new Date(c.target)
  return {
    id: c.id,
    title: c.title,
    subtitle: c.subtitle ?? '',
    date: dateOf(target),
    time: timeOf(target),
    units: c.units,
    created: c.created,
  }
}
