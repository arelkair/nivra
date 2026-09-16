const DB_NAME = 'nivra-files'
const STORE = 'background'
const KEY = 'image'

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
}

export const SHAPES: { id: string; label: string; css: string }[] = [
  { id: 'ninguno', label: 'Ninguno', css: '' },
  {
    id: 'puntos',
    label: 'Puntos',
    css: 'radial-gradient(currentColor 1px, transparent 1px)',
  },
  {
    id: 'rejilla',
    label: 'Rejilla',
    css: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
  },
  {
    id: 'diagonales',
    label: 'Diagonales',
    css: 'repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 16px)',
  },
  {
    id: 'olas',
    label: 'Olas',
    css: 'radial-gradient(circle at 50% 100%, currentColor 0, transparent 60%)',
  },
]

export const SHAPE_SIZE: Record<string, string> = {
  puntos: '18px 18px',
  rejilla: '24px 24px',
  diagonales: 'auto',
  olas: '100% 200px',
}
