import { markChanged } from './sync'

export const DATA_EVENT = 'nivra-data-change'
export const TRASH_KEY = 'nivra-trash'
export const VERSIONS_KEY = 'nivra-note-versions'
export const RETENTION = 30 * 86400000
type Entity = Record<string, unknown> & { id: string }
export type TrashEntry = { id: string; source: string; item: Entity; deletedAt: number }
export type NoteVersion = { id: string; source: string; noteId: string; note: Entity; savedAt: number }

export function readLocal<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback }
}
export function writeLocal(key: string, value: unknown, sync = true) {
  localStorage.setItem(key, JSON.stringify(value))
  if (sync && key.startsWith('nivra-')) markChanged(key, false)
  window.dispatchEvent(new CustomEvent(DATA_EVENT, { detail: key }))
}
const entities = (value: unknown): Entity[] => Array.isArray(value) ? value.filter((item): item is Entity => item && typeof item === 'object' && typeof item.id === 'string') : []
const sameContent = (a: Entity, b: Entity) => JSON.stringify([a.title, a.body, a.html, a.pages]) === JSON.stringify([b.title, b.body, b.html, b.pages])
export function liveTrash(entries: TrashEntry[], now = Date.now()) { return entries.filter(entry => entry.deletedAt + RETENTION > now) }
export function readTrash() { return liveTrash(readLocal<TrashEntry[]>(TRASH_KEY, [])) }
export function purgeExpiredTrash() {
  const stored = readLocal<TrashEntry[]>(TRASH_KEY, [])
  const live = liveTrash(stored)
  if (stored.length !== live.length) writeLocal(TRASH_KEY, live)
}
export function saveVersion(source: string, note: Entity, force = false) {
  const all = readLocal<NoteVersion[]>(VERSIONS_KEY, [])
  const own = all.filter(v => v.source === source && v.noteId === note.id)
  const last = own[0]
  if (last && sameContent(last.note, note)) return
  if (!force && last && Date.now() - last.savedAt < 30000) return
  const entry: NoteVersion = { id: crypto.randomUUID(), source, noteId: note.id, note, savedAt: Date.now() }
  const kept = all.filter(v => !(v.source === source && v.noteId === note.id && own.indexOf(v) >= 49))
  const next = [entry, ...kept]
  // Bound history storage so checkpoints cannot grow without limit.
  while (next.length > 1 && JSON.stringify(next).length * 2 > 1500000) next.pop()
  writeLocal(VERSIONS_KEY, next)
}
// Called before the common localStorage writer. Settings and internal resources
// are excluded; every collection of identifiable records shares the same trash.
export function recordStorageChange(key: string, previous: string | null, next: string) {
  if (!previous || !key.startsWith('nivra-') || [TRASH_KEY, VERSIONS_KEY, 'nivra-public-links', 'nivra-achievements'].includes(key)) return
  let before: Entity[], after: Entity[]
  try { before = entities(JSON.parse(previous)); after = entities(JSON.parse(next)) } catch { return }
  if (!before.length && !after.length) return
  const byId = new Map(after.map(item => [item.id, item]))
  const added = after.filter(item => !before.some(old => old.id === item.id))
  if (added.length) {
    const trash = readTrash()
    const remaining = trash.filter(entry => entry.source !== key || !added.some(item => item.id === entry.item.id))
    if (remaining.length !== trash.length) writeLocal(TRASH_KEY, remaining)
  }
  const removed = before.filter(item => !byId.has(item.id))
  if (removed.length) {
    const trash = readTrash()
    // Undo followed by delete keeps one recoverable copy of the latest record.
    const existing = trash.filter(entry => !(entry.source === key && removed.some(item => item.id === entry.item.id)))
    writeLocal(TRASH_KEY, [...removed.map(item => ({ id: crypto.randomUUID(), source: key, item, deletedAt: Date.now() })), ...existing])
  }
  if (key === 'nivra-vault' || key === 'nivra-notepads') for (const note of before) {
    const current = byId.get(note.id)
    if (!current || !sameContent(current, note)) saveVersion(key, note)
  }
}
export function restoreTrash(id: string) {
  const entry = readTrash().find(item => item.id === id)
  if (!entry) throw new Error('El elemento ha caducado o ya se ha restaurado.')
  if (!/^nivra-[a-z0-9-]+$/.test(entry.source) || ['nivra-sync', 'nivra-sync-times', TRASH_KEY, VERSIONS_KEY, 'nivra-public-links'].includes(entry.source)) throw new Error('El elemento no se puede restaurar.')
  const current = entities(readLocal(entry.source, []))
  if (current.some(item => item.id === entry.item.id)) throw new Error('Ya existe un elemento con ese identificador. Se conserva la copia en la papelera.')
  const item = { ...entry.item }
  if (entry.source === 'nivra-vault' && item.folder && !entities(readLocal('nivra-vault-folders', [])).some(folder => folder.id === item.folder)) delete item.folder
  if (entry.source === 'nivra-vault-folders' && item.parent && !entities(readLocal('nivra-vault-folders', [])).some(folder => folder.id === item.parent)) delete item.parent
  writeLocal(entry.source, [...current, item])
  writeLocal(TRASH_KEY, readTrash().filter(value => value.id !== id))
}
export function restoreVersion(version: NoteVersion) {
  if (!['nivra-vault', 'nivra-notepads'].includes(version.source)) throw new Error('La versión no es válida.')
  const notes = entities(readLocal(version.source, []))
  const current = notes.find(note => note.id === version.noteId)
  if (!current) throw new Error('Restaura primero la nota desde la papelera.')
  saveVersion(version.source, current, true)
  writeLocal(version.source, notes.map(note => note.id === current.id ? { ...note, title: version.note.title, ...(version.source === 'nivra-notepads' ? { html: version.note.html, pages: version.note.pages } : { body: version.note.body }), updated: Date.now() } : note))
}
export function privacyInventory() {
  const rows: { key: string; bytes: number; count: number | null }[] = []
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)
    if (!key || !/^(nivra-|sb-nivra-|device-nivra-)/.test(key)) continue
    const raw = localStorage.getItem(key) ?? ''
    const value: unknown = readLocal(key, null)
    rows.push({ key, bytes: (key.length + raw.length) * 2, count: Array.isArray(value) ? value.length : null })
  }
  return rows.sort((a, b) => b.bytes - a.bytes)
}
