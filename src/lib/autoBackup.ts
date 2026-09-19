import { restoreData, storedData } from './backup'

export type Snapshot = { date: string; savedAt: number; data: Record<string, string> }

const DB = 'nivra-backups'
const STORE = 'snapshots'
const KEEP = 14

const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'date' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const run = async <T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>) => {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    const request = work(db.transaction(STORE, mode).objectStore(STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }).finally(() => db.close())
}

export const listSnapshots = async () => {
  const all = await run<Snapshot[]>('readonly', (store) => store.getAll())
  return all.sort((a, b) => b.date.localeCompare(a.date))
}

export async function snapshotNow(force = false) {
  const data = storedData()
  if (Object.keys(data).length === 0) return false
  const date = new Date().toISOString().slice(0, 10)
  if (!force) {
    const existing = await run<Snapshot | undefined>('readonly', (store) => store.get(date))
    if (existing) return false
  }
  await run('readwrite', (store) => store.put({ date, savedAt: Date.now(), data } satisfies Snapshot))
  const all = await listSnapshots()
  for (const old of all.slice(KEEP)) await run('readwrite', (store) => store.delete(old.date))
  return true
}

export async function restoreSnapshot(date: string) {
  const snapshot = await run<Snapshot | undefined>('readonly', (store) => store.get(date))
  if (!snapshot) throw new Error('No existe esa copia.')
  return restoreData(snapshot.data)
}

export async function deleteSnapshot(date: string) {
  await run('readwrite', (store) => store.delete(date))
}
