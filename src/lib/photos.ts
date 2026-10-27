import { useEffect, useState } from 'react'

const DB_NAME = 'nivra-media'
const STORE = 'files'
const memory = new Map<string, string>()
const listeners = new Set<() => void>()

let dbPromise: Promise<IDBDatabase> | null = null

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>) {
  const store = (await db()).transaction(STORE, mode).objectStore(STORE)
  return new Promise<T>((resolve, reject) => {
    const req = fn(store)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

const notifyAll = () => listeners.forEach((fn) => fn())

export function cacheMedia(id: string, data: string) {
  memory.set(id, data)
  notifyAll()
}

export async function putMedia(id: string, data: string) {
  cacheMedia(id, data)
  await run('readwrite', (s) => s.put(data, id))
}

export async function getMedia(id: string) {
  const cached = memory.get(id)
  if (cached) return cached
  const data = await run<string | undefined>('readonly', (s) => s.get(id)).catch(() => undefined)
  if (data) memory.set(id, data)
  return data ?? memory.get(id) ?? null
}

export async function deleteMedia(id: string) {
  memory.delete(id)
  await run('readwrite', (s) => s.delete(id)).catch(() => undefined)
}

export async function compressImage(file: Blob, maxSide: number, quality = 0.82) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const webp = canvas.toDataURL('image/webp', quality)
  const data = webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', quality)
  return { data, width, height }
}

export async function saveImage(file: Blob, maxSide: number) {
  const image = await compressImage(file, maxSide)
  const id = crypto.randomUUID()
  await putMedia(id, image.data)
  return { id, ...image }
}

export function useMedia(id: string | null) {
  const [state, setState] = useState<{ id: string | null; src: string | null; missing: boolean }>({ id: null, src: null, missing: false })
  useEffect(() => {
    if (!id) return
    let alive = true
    let seq = 0
    const load = () => {
      const n = ++seq
      getMedia(id).then((src) => {
        if (alive && n === seq) setState({ id, src, missing: !src })
      })
    }
    load()
    listeners.add(load)
    return () => {
      alive = false
      listeners.delete(load)
    }
  }, [id])
  return state.id === id ? state : { id, src: null, missing: false }
}
