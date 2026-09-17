const RPC = 'https://erfwpsvjbebfoeeexgrr.supabase.co/rest/v1/rpc'
const PUBLIC_KEY = 'sb_publishable_yQ9Uk6CNHcbt4D05JmQVZw_d4Y5P_eh'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const STATE_KEY = 'nivra-sync'
const TIMES_KEY = 'nivra-sync-times'
const EVENT_NAME = 'nivra-sync'
export const SYNC_VISUAL_KEY = 'nivra-sync-visual'

const VISUAL_KEYS = new Set([
  'nivra-accent',
  'nivra-theme',
  'nivra-theme-style',
  'nivra-theme-pack',
  'nivra-bg-mode',
  'nivra-bg-shape',
  'nivra-ui-sounds',
  'nivra-ui-volume',
  'nivra-ambient',
  'nivra-ambient-preset',
  'nivra-ambient-volume',
  'nivra-custom-sound-url',
  'nivra-embed-consent',
  'nivra-carousel',
  'nivra-carousel-seconds',
  'nivra-clock',
  'nivra-hour12',
  'nivra-nav-buttons',
  'nivra-search',
  'nivra-animations',
  'nivra-auto-theme',
  'nivra-intro',
  'nivra-shortcuts',
  'nivra-shortcut-keys',
  'nivra-shortcut-custom',
  'nivra-toasts',
  'nivra-notifs',
  'nivra-lang',
])

export type SyncState = {
  code: string
  lastSeen: string | null
  error?: string
}

type StoredEntry = { v: string; t: number }
type Payload = { v: 2; keys: Record<string, StoredEntry> }

export function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const text = Array.from(bytes, (b) => ALPHABET[b & 31]).join('')
  return text.match(/.{4}/g)!.join('-')
}

export const normalizeCode = (code: string) =>
  code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)

export const withDashes = (code: string) => normalizeCode(code).match(/.{1,4}/g)?.join('-') ?? ''

const readJson = <T,>(storageKey: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export const readSyncState = () => readJson<SyncState | null>(STATE_KEY, null)

export function saveSyncState(state: SyncState | null) {
  if (state) localStorage.setItem(STATE_KEY, JSON.stringify(state))
  else localStorage.removeItem(STATE_KEY)
}

const readTimes = () => readJson<Record<string, number>>(TIMES_KEY, {})
const saveTimes = (t: Record<string, number>) =>
  localStorage.setItem(TIMES_KEY, JSON.stringify(t))

const internal = (k: string) => k === STATE_KEY || k === TIMES_KEY || k === SYNC_VISUAL_KEY

const syncsVisual = () => readJson<boolean>(SYNC_VISUAL_KEY, true) !== false

function localValues() {
  const includeVisual = syncsVisual()
  const out: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k || !k.startsWith('nivra-') || internal(k)) continue
    if (!includeVisual && VISUAL_KEYS.has(k)) continue
    out[k] = localStorage.getItem(k) ?? ''
  }
  return out
}

function localPayload(): Payload {
  const values = localValues()
  const times = readTimes()
  const keys: Record<string, StoredEntry> = {}
  for (const k of Object.keys(values).sort()) keys[k] = { v: values[k], t: times[k] ?? 0 }
  return { v: 2, keys }
}

const bytesToHex = (b: ArrayBuffer) =>
  Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('')

async function hex(text: string) {
  return bytesToHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
}

const identifier = (code: string) => hex(`nivra-id-v1:${code}`)

async function storageKey(code: string) {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(code),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('nivra-key-v1'),
      iterations: 200000,
      hash: 'SHA-256',
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0))

async function encrypt(text: string, k: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    k,
    new TextEncoder().encode(text),
  )
  const joined = new Uint8Array(iv.length + encrypted.byteLength)
  joined.set(iv)
  joined.set(new Uint8Array(encrypted), iv.length)
  return toBase64(joined)
}

async function decrypt(text: string, k: CryptoKey) {
  const joined = fromBase64(text)
  const flat = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: joined.slice(0, 12) },
    k,
    joined.slice(12),
  )
  return new TextDecoder().decode(flat)
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function assertSecureContext() {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error(
      'El cifrado del navegador no está disponible aquí. Si has abierto Nivra desde otro dispositivo usando una dirección IP local (no https), el navegador lo bloquea; abre la web con https:// o usa la app instalada.',
    )
  }
}

async function rpc(fn: string, body: Record<string, unknown>, retriesLeft = 2): Promise<unknown> {
  let r: Response
  try {
    r = await fetch(`${RPC}/${fn}`, {
      method: 'POST',
      headers: { apikey: PUBLIC_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    if (retriesLeft > 0) {
      await sleep(1200)
      return rpc(fn, body, retriesLeft - 1)
    }
    throw new Error('No se pudo conectar con el servidor de sincronización. Comprueba tu conexión a internet.')
  }
  if (!r.ok) {
    if (r.status >= 500 && retriesLeft > 0) {
      await sleep(1200)
      return rpc(fn, body, retriesLeft - 1)
    }
    throw new Error(`${r.status} ${await r.text()}`)
  }
  return r.json()
}

function toPayload(json: string): Payload {
  const raw = JSON.parse(json) as Payload | Record<string, string>
  if ((raw as Payload).v === 2) return raw as Payload
  const keys: Record<string, StoredEntry> = {}
  for (const [k, v] of Object.entries(raw as Record<string, string>)) keys[k] = { v, t: 0 }
  return { v: 2, keys }
}

function mergeVaults(local: Payload, remote: Payload) {
  const keys: Record<string, StoredEntry> = {}
  let localChanged = false
  let remoteChanged = false

  for (const k of [...new Set([...Object.keys(local.keys), ...Object.keys(remote.keys)])].sort()) {
    const a = local.keys[k]
    const b = remote.keys[k]
    if (a && b) {
      const wins = b.t > a.t ? b : a
      keys[k] = wins
      if (wins.v !== a.v) localChanged = true
      if (wins.v !== b.v) remoteChanged = true
    } else if (b) {
      keys[k] = b
      localChanged = true
    } else {
      keys[k] = a
      remoteChanged = true
    }
  }
  return { merged: { v: 2, keys } as Payload, localChanged, remoteChanged }
}

function apply(paquete: Payload) {
  const includeVisual = syncsVisual()
  const times = readTimes()
  let touched = false
  for (const [k, e] of Object.entries(paquete.keys)) {
    if (!includeVisual && VISUAL_KEYS.has(k)) continue
    if (localStorage.getItem(k) !== e.v) {
      localStorage.setItem(k, e.v)
      touched = true
    }
    times[k] = e.t
  }
  saveTimes(times)
  if (touched) dispatchEvent(new Event(EVENT_NAME))
  return touched
}

const text = (p: Payload) => JSON.stringify(p)

export async function pushChanges(state: SyncState, paquete = localPayload()) {
  assertSecureContext()
  const code = normalizeCode(state.code)
  const ts = await rpc('vault_put', {
    vault_id: await identifier(code),
    vault_payload: await encrypt(text(paquete), await storageKey(code)),
  })
  const nextState = { ...state, lastSeen: ts as string, error: undefined }
  saveSyncState(nextState)
  return nextState
}

async function readRemote(code: string) {
  const rows = (await rpc('vault_get', { vault_id: await identifier(code) })) as {
    payload: string
    updated_at: string
  }[]
  if (!rows[0]) return null
  return {
    paquete: toPayload(await decrypt(rows[0].payload, await storageKey(code))),
    updated_at: rows[0].updated_at,
  }
}

export async function runSync(state: SyncState) {
  const code = normalizeCode(state.code)
  const remote = await readRemote(code)
  const local = localPayload()

  if (!remote) {
    const nextState = await pushChanges(state, local)
    return { state: nextState, change: false }
  }

  const { merged, localChanged, remoteChanged } = mergeVaults(local, remote.paquete)
  const change = localChanged ? apply(merged) : false

  let next = { ...state, lastSeen: remote.updated_at, error: undefined }
  if (remoteChanged) next = await pushChanges(next, merged)
  else saveSyncState(next)

  return { state: next, change }
}

export async function connect(code: string) {
  assertSecureContext()
  const clean = normalizeCode(code)
  if (clean.length !== 16) throw new Error('El código debe tener 16 caracteres.')
  const inicial: SyncState = { code: clean, lastSeen: null }

  const remote = await readRemote(clean)
  if (!remote) {
    saveSyncState(await pushChanges(inicial))
    return { created: true, change: false }
  }

  const change = apply(remote.paquete)
  saveSyncState({ ...inicial, lastSeen: remote.updated_at })
  return { created: false, change }
}

let pendiente: ReturnType<typeof setTimeout> | null = null

export function markChanged(storageKey: string, inicial = false) {
  const times = readTimes()
  times[storageKey] = inicial ? 0 : Date.now()
  saveTimes(times)

  const state = readSyncState()
  if (!state) return
  if (pendiente) clearTimeout(pendiente)
  pendiente = setTimeout(() => {
    runSync(readSyncState() ?? state).catch((e) =>
      saveSyncState({ ...(readSyncState() ?? state), error: String(e.message ?? e) }),
    )
  }, 1200)
}

export const onSyncApplied = (fn: () => void) => {
  addEventListener(EVENT_NAME, fn)
  return () => removeEventListener(EVENT_NAME, fn)
}
