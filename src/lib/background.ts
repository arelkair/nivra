const DB_NAME = 'nivra-files'
const STORE = 'background'
const KEY = 'image'
const EVENT_NAME = 'nivra-bg-image'

export const onBackgroundImageChange = (fn: () => void) => {
  addEventListener(EVENT_NAME, fn)
  return () => removeEventListener(EVENT_NAME, fn)
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveBackgroundImage(blob: Blob): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  dispatchEvent(new Event(EVENT_NAME))
}

export async function loadBackgroundImage(): Promise<Blob | null> {
  const db = await openDb()
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(KEY)
    req.onsuccess = () => resolve((req.result as Blob) ?? null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return blob
}

export async function clearBackgroundImage(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  dispatchEvent(new Event(EVENT_NAME))
}

export const SHAPES: { id: string; label: string; css: string }[] = [
  { id: 'ninguno', label: 'Ninguno', css: '' },
  {
    id: 'puntos',
    label: 'Puntos',
    css: 'radial-gradient(currentColor 1.8px, transparent 1.8px)',
  },
  {
    id: 'rejilla',
    label: 'Rejilla',
    css: 'linear-gradient(currentColor 1.5px, transparent 1.5px), linear-gradient(90deg, currentColor 1.5px, transparent 1.5px)',
  },
  {
    id: 'diagonales',
    label: 'Diagonales',
    css: 'repeating-linear-gradient(45deg, currentColor 0 2px, transparent 2px 16px)',
  },
  {
    id: 'olas',
    label: 'Olas',
    css: 'repeating-radial-gradient(circle at 50% 50%, currentColor 0, currentColor 2px, transparent 2px, transparent 8px)',
  },
]

export const SHAPE_SIZE: Record<string, string> = {
  puntos: '16px 16px',
  rejilla: '24px 24px',
  diagonales: 'auto',
  olas: '30px 30px',
}

export const GRADIENTS: { id: string; label: string; css: string }[] = [
  { id: 'atardecer', label: 'Atardecer', css: 'linear-gradient(135deg,#f97316,#ec4899)' },
  { id: 'oceano', label: 'Océano', css: 'linear-gradient(135deg,#0ea5e9,#1e40af)' },
  { id: 'aurora', label: 'Aurora', css: 'linear-gradient(135deg,#22c55e,#a855f7)' },
  { id: 'bosque', label: 'Bosque', css: 'linear-gradient(135deg,#166534,#84cc16)' },
  { id: 'noche', label: 'Noche', css: 'linear-gradient(135deg,#0f172a,#312e81)' },
  { id: 'algodon', label: 'Algodón', css: 'linear-gradient(135deg,#fda4af,#c4b5fd)' },
]
