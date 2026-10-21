import { useEffect } from 'react'
import { readLocal, writeLocal } from './dataLifecycle'
import { isQuietHours, type FocusSession, type QuietHours } from './study'
export type FocusClock = { id: string; end: number | null; remaining: number; minutes: number; subject: string; phase: 'focus' | 'break' }
export function settleFocus(now = Date.now()) {
  const clock = readLocal<FocusClock | null>('device-nivra-focus-clock', null)
  if (!clock?.end || clock.end > now) return
  if (clock.phase === 'focus') {
    const rows = readLocal<FocusSession[]>('nivra-focus-sessions', [])
    if (!rows.some(row => row.id === clock.id)) writeLocal('nivra-focus-sessions', [...rows, { id: clock.id, subject: clock.subject, minutes: clock.minutes, completedAt: new Date(clock.end).toISOString() }])
  }
  writeLocal('device-nivra-focus-clock', { ...clock, id: crypto.randomUUID(), end: null, phase: clock.phase === 'focus' ? 'break' : 'focus', remaining: clock.phase === 'focus' ? 300 : clock.minutes * 60 }, false)
}
export function useFocusEngine() {
  useEffect(() => { settleFocus(); const timer = setInterval(() => settleFocus(), 500); const wake = () => settleFocus(); addEventListener('focus', wake); return () => { clearInterval(timer); removeEventListener('focus', wake) } }, [])
}
export function noticesSilenced(now = new Date()) {
  const quiet = readLocal<QuietHours>('nivra-quiet-hours', { enabled: false, start: '22:00', end: '08:00' })
  const focus = readLocal<FocusClock | null>('device-nivra-focus-clock', null)
  return isQuietHours(quiet, now) || !!(focus?.end && focus.end > now.getTime() && focus.phase === 'focus')
}
