import assert from 'node:assert/strict'
import { runtime } from './testRuntime.mjs'
const env = runtime(), study = env.read('src/lib/study.ts'), planning = env.read('src/lib/taskPlanning.ts')
const monday = new Date(2026, 9, 19, 12)
const subjects = [{ id: 'math', name: 'Matemáticas', color: '#9277bf' }]
assert.deepEqual(JSON.parse(JSON.stringify(study.parseCapture('examen mates viernes', subjects, monday))), { kind: 'examen', title: 'mates', date: '2026-10-23', subject: 'math' })
assert.equal(study.parseCapture('maths exam friday', subjects, monday).kind, 'examen')
assert.equal(study.parseCapture('tarea mañana', subjects, monday).date, '2026-10-20')
assert.equal(study.parseCapture('exame mates venres', subjects, monday).date, '2026-10-23')
assert.equal(study.parseCapture('leer 2026-11-02', subjects, monday).date, '2026-11-02')
assert.equal(planning.nextRepeat('2026-01-31', 'monthly'), '2026-02-28')
assert.equal(planning.nextRepeat('2028-01-31', 'monthly'), '2028-02-29')
assert.equal(planning.nextRepeat('2026-12-31', 'daily'), '2027-01-01')
const task = { id: 'repeat', title: 'Maths', date: '2026-10-19', done: false, repeat: 'weekly', subtasks: [] }
const done = planning.reconcileTasks([task], [{ ...task, done: true }], monday)
assert.equal(done.length, 2); assert.equal(done[1].date, '2026-10-26'); assert.ok(done[0].completedAt)
assert.equal(planning.reconcileTasks(done, done, monday).length, 2)
assert.equal(study.habitStreak(['2026-10-17', '2026-10-18', '2026-10-18'], monday), 2)
assert.equal(study.habitStreak(['2026-10-17', '2026-10-19'], monday), 1)
assert.equal(study.isQuietHours({ enabled: true, start: '22:00', end: '08:00' }, new Date(2026, 9, 19, 23)), true)
assert.equal(study.isQuietHours({ enabled: true, start: '22:00', end: '08:00' }, monday), false)
assert.equal(study.courseProgress('2026-09-01', '2027-06-30', new Date(2026, 7, 1)), 0)
assert.equal(study.courseProgress('2026-09-01', '2027-06-30', new Date(2027, 7, 1)), 100)
const focus = env.read('src/lib/focusEngine.ts')
env.values.set('device-nivra-focus-clock', JSON.stringify({ id: 'one', end: monday.getTime(), minutes: 25, remaining: 0, subject: 'math', phase: 'focus' }))
focus.settleFocus(monday.getTime() + 1000); focus.settleFocus(monday.getTime() + 2000)
assert.equal(JSON.parse(env.values.get('nivra-focus-sessions')).length, 1)
assert.equal(JSON.parse(env.values.get('device-nivra-focus-clock')).phase, 'break')
const feeds = env.read('src/lib/calendarFeeds.ts')
const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:weekly\r\nDTSTART;VALUE=DATE:20261019\r\nDTEND;VALUE=DATE:20261020\r\nRRULE:FREQ=WEEKLY;COUNT=3\r\nEXDATE;VALUE=DATE:20261026\r\nSUMMARY:Clase\\, mates\r\nEND:VEVENT\r\nEND:VCALENDAR`
const parsed = feeds.parseCalendar(ics, 'test', monday)
assert.equal(parsed.length, 2); assert.equal(parsed[1].date, '2026-11-02'); assert.equal(parsed[0].title, 'Clase, mates')
assert.equal(feeds.GALICIA_2026.length, 12)
assert.throws(() => feeds.parseCalendar('<html>Not a calendar</html>', 'test', monday))
const { PDFDocument } = await import('pdf-lib')
const pdfBytes = await env.read('src/lib/weeklyPdf.ts').buildWeeklyPdf([task], [], [], Array.from({ length: 70 }, (_, index) => ({ ...subjects[0], id: String(index), name: `Matemáticas ${index}` })), 'Álex')
assert.ok((await PDFDocument.load(new Uint8Array(pdfBytes))).getPageCount() > 1, 'The PDF report must paginate instead of clipping a long course')

// Two independent browsers, one mocked private cloud. No remote API calls.
const cloud = new Map(); let currentUser = 'user-a', tick = 0
const sb = { from(table) {
  let operation = 'select', values, filters = []
  const query = { select() { return query }, insert(row) { operation = 'insert'; values = row; return query }, update(row) { operation = 'update'; values = row; return query }, eq(key, value) { filters.push([key, value]); return query }, async maybeSingle() { return execute() }, async single() { return execute() } }
  function execute() {
    if (table === 'account_vaults') return { data: null, error: null }
    const stored = cloud.get(currentUser)
    if (operation === 'select') return { data: stored || null, error: null }
    if (operation === 'insert' && stored) return { data: null, error: { code: '23505', message: 'Duplicate' } }
    if (operation === 'update' && filters.some(([key, value]) => stored?.[key] !== value)) return { data: null, error: null }
    const data = { ...(stored || {}), ...values, updated_at: new Date(monday.getTime() + ++tick * 1000).toISOString() }
    cloud.set(currentUser, JSON.parse(JSON.stringify(data))); return { data, error: null }
  }
  return query
} }
const backend = { getSession: async () => ({ user: { id: currentUser, email: `${currentUser}@example.invalid` } }), getSupabase: async () => sb }
const first = runtime({ backend: true, supabase: backend }), second = runtime({ backend: true, supabase: backend })
first.values.set('nivra-tasks', JSON.stringify([{ id: 'local-a', title: 'First', done: false, subtasks: [] }]))
const firstSync = first.read('src/lib/sync.ts')
await firstSync.connectGoogleAccount()
second.values.set('nivra-tasks', JSON.stringify([{ id: 'local-b', title: 'Second', done: false, subtasks: [] }]))
const secondSync = second.read('src/lib/sync.ts')
const secondState = await secondSync.connectGoogleAccount()
assert.equal(JSON.parse(second.values.get('nivra-tasks')).length, 2, 'New device must restore cloud and retain local tasks')
await firstSync.runSync({ ...firstSync.readSyncState(), dirty: true })
assert.equal(JSON.parse(first.values.get('nivra-tasks')).length, 2, 'Changes must propagate to the other browser')
assert.equal(cloud.get('user-a').payload.keys['device-nivra-lock'], undefined)
currentUser = 'user-b'
await assert.rejects(secondSync.runSync({ ...secondState, dirty: true }), /otra cuenta|caducado/)
await secondSync.connectGoogleAccount()
assert.equal(JSON.parse(cloud.get('user-b').payload.keys['nivra-tasks']?.v || '[]').length, 0, 'Signing into another account must not upload the previous account data')
console.log('Study checks passed: natural capture, recurrence, streaks, quiet hours, course progress, persistent Pomodoro, ICS recurrence/exclusions, and two-device automatic account restore.')
