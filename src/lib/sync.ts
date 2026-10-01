import { PUBLIC_KEY, SUPABASE_URL, getSession, getSupabase } from './supabase'

const RPC = `${SUPABASE_URL}/rest/v1/rpc`

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
  'nivra-initiative-theme',
  'nivra-initiative-note-frame',
  'nivra-initiative-note-active',
  'nivra-initiative-note-open',
  'nivra-vault-center-shape',
  'nivra-vault-graph',
  'nivra-bg-mode',
  'nivra-bg-shape',
  'nivra-bg-gradient',
  'nivra-menu-opacity',
  'nivra-menu-blur',
  'nivra-dashboard-slots',
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
  'nivra-initiative',
  'nivra-shortcuts',
  'nivra-shortcut-keys',
  'nivra-shortcut-custom',
  'nivra-toasts',
  'nivra-notifs',
  'nivra-lang',
])

export type SyncState = {
  // Code mode: the 16-character code is the only secret.
  code?: string
  // Account mode: a Google account identifies the vault; the AES key is
  // derived on the device from a passphrase and kept here, like the code.
  account?: { key: string; email: string; userId: string }
  lastSeen: string | null
  // Local edits not yet confirmed on the server.
  dirty?: boolean
  error?: string
}

type Remote = { payload: string; updated_at: string }

type Transport = {
  stamp: () => Promise<string | null>
  get: () => Promise<Remote | null>
  put: (payload: string) => Promise<string>
  key: () => Promise<CryptoKey>
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

const keyCache = new Map<string, Promise<CryptoKey>>()

function cachedKey(id: string, make: () => Promise<CryptoKey>) {
  let key = keyCache.get(id)
  if (!key) {
    key = make()
    keyCache.set(id, key)
    key.catch(() => keyCache.delete(id))
  }
  return key
}

function codeTransport(code: string): Transport {
  return {
    stamp: async () =>
      (await rpc('vault_stamp', { vault_id: await identifier(code) })) as string | null,
    get: async () => {
      const rows = (await rpc('vault_get', { vault_id: await identifier(code) })) as Remote[]
      return rows[0] ?? null
    },
    put: async (payload) =>
      (await rpc('vault_put', {
        vault_id: await identifier(code),
        vault_payload: payload,
      })) as string,
    key: () => cachedKey(`code:${code}`, () => storageKey(code)),
  }
}

const SESSION_ERROR = 'La sesión de Google ha caducado. Vuelve a iniciar sesión.'

function accountTransport(account: NonNullable<SyncState['account']>): Transport {
  const client = async () => {
    const session = await getSession()
    if (!session) throw new Error(SESSION_ERROR)
    if (session.user.id !== account.userId)
      throw new Error('La sesión de Google es de otra cuenta. Cierra sesión y entra con la correcta.')
    return getSupabase()
  }
  const fail = (e: { message: string }): never => {
    throw new Error(e.message)
  }
  return {
    stamp: async () => {
      const { data, error } = await (await client())
        .from('account_vaults')
        .select('updated_at')
        .maybeSingle()
      if (error) fail(error)
      return (data?.updated_at as string | undefined) ?? null
    },
    get: async () => {
      const { data, error } = await (await client())
        .from('account_vaults')
        .select('payload, updated_at')
        .maybeSingle()
      if (error) fail(error)
      return (data as Remote | null) ?? null
    },
    put: async (payload) => {
      const { data, error } = await (await client())
        .from('account_vaults')
        .update({ payload })
        .eq('user_id', account.userId)
        .select('updated_at')
        .maybeSingle()
      if (error) fail(error)
      if (!data)
        throw new Error(
          'Los datos de la nube ya no existen. Desconecta este dispositivo y vuelve a conectarlo para subirlos de nuevo.',
        )
      return data.updated_at as string
    },
    key: () => cachedKey(`account:${account.key}`, () => importAccountKey(account.key)),
  }
}

const transportFor = (state: SyncState): Transport =>
  state.account ? accountTransport(state.account) : codeTransport(normalizeCode(state.code ?? ''))

let changes = 0

async function pushWith(transport: Transport, state: SyncState, paquete: Payload) {
  const ts = await transport.put(await encrypt(text(paquete), await transport.key()))
  const nextState = { ...state, lastSeen: ts, error: undefined }
  saveSyncState(nextState)
  return nextState
}

export async function pushChanges(state: SyncState, paquete = localPayload()) {
  assertSecureContext()
  return pushWith(transportFor(state), state, paquete)
}

async function readRemote(transport: Transport) {
  const row = await transport.get()
  if (!row) return null
  return {
    paquete: toPayload(await decrypt(row.payload, await transport.key())),
    updated_at: row.updated_at,
  }
}

export async function runSync(state: SyncState) {
  const transport = transportFor(state)
  const started = changes
  const settle = (next: SyncState) => {
    const done = { ...next, dirty: changes !== started }
    saveSyncState(done)
    return done
  }

  // Nothing to upload and the server timestamp is unchanged: skip the download.
  if (state.lastSeen && !(readSyncState()?.dirty ?? state.dirty)) {
    try {
      if ((await transport.stamp()) === state.lastSeen) {
        return { state: state.error ? settle({ ...state, error: undefined }) : state, change: false }
      }
    } catch {
      // The full sync below reports the real error.
    }
  }

  const remote = await readRemote(transport)
  const local = localPayload()

  if (!remote) {
    const nextState = settle(await pushWith(transport, state, local))
    return { state: nextState, change: false }
  }

  const { merged, localChanged, remoteChanged } = mergeVaults(local, remote.paquete)
  const change = localChanged ? apply(merged) : false

  let next = { ...state, lastSeen: remote.updated_at, error: undefined }
  if (remoteChanged) next = await pushWith(transport, next, merged)

  return { state: settle(next), change }
}

async function connectWith(initial: SyncState) {
  assertSecureContext()
  const transport = transportFor(initial)

  const remote = await readRemote(transport)
  if (!remote) {
    saveSyncState(await pushWith(transport, initial, localPayload()))
    return { created: true, change: false }
  }

  const change = apply(remote.paquete)
  // dirty: the next sync must merge fully so data that only exists here is uploaded.
  saveSyncState({ ...initial, lastSeen: remote.updated_at, dirty: true })
  return { created: false, change }
}

export async function connect(code: string) {
  assertSecureContext()
  const clean = normalizeCode(code)
  if (clean.length !== 16) throw new Error('El código debe tener 16 caracteres.')
  return connectWith({ code: clean, lastSeen: null })
}

const PASSPHRASE_ITERATIONS = 600000
export const MIN_PASSPHRASE = 12

const importAccountKey = (raw: string) =>
  crypto.subtle.importKey('raw', fromBase64(raw), 'AES-GCM', false, ['encrypt', 'decrypt'])

async function deriveAccountKey(passphrase: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PASSPHRASE_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
  return toBase64(new Uint8Array(await crypto.subtle.exportKey('raw', key)))
}

export async function accountVaultExists() {
  const session = await getSession()
  if (!session) throw new Error(SESSION_ERROR)
  const { data, error } = await (await getSupabase())
    .from('account_vaults')
    .select('salt')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return !!data
}

// Creates this account's vault the first time, or joins the existing one by
// checking the passphrase against it.
export async function connectAccount(passphrase: string, options: { migrate?: boolean } = {}) {
  assertSecureContext()
  const session = await getSession()
  if (!session) throw new Error(SESSION_ERROR)

  // Moving from a code: pull the latest from the code first, so what gets
  // uploaded to the account is up to date. The code's data is left untouched.
  const previous = readSyncState()
  if (options.migrate && previous?.code) {
    try {
      await runSync(previous)
    } catch {
      throw new Error('No se pudo sincronizar con el código antes de migrar. Inténtalo de nuevo.')
    }
  }
  const sb = await getSupabase()
  const user = { userId: session.user.id, email: session.user.email ?? '' }

  const { data: row, error } = await sb.from('account_vaults').select('salt').maybeSingle()
  if (error) throw new Error(error.message)

  if (row) {
    const key = await deriveAccountKey(passphrase, fromBase64(row.salt as string))
    const state: SyncState = { account: { key, ...user }, lastSeen: null }
    try {
      if (options.migrate) {
        // The account already has data: merge both sides by timestamp rather
        // than letting either overwrite the other.
        const r = await runSync({ ...state, dirty: true })
        return { created: false, change: r.change }
      }
      return await connectWith(state)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'OperationError')
        throw new Error('La frase de paso no es correcta.')
      throw e
    }
  }

  if (passphrase.length < MIN_PASSPHRASE)
    throw new Error('La frase de paso debe tener al menos 12 caracteres.')

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveAccountKey(passphrase, salt)
  const payload = await encrypt(text(localPayload()), await importAccountKey(key))
  const { data, error: insertError } = await sb
    .from('account_vaults')
    .insert({ user_id: user.userId, salt: toBase64(salt), payload })
    .select('updated_at')
    .single()
  if (insertError) {
    if (insertError.code === '23505')
      throw new Error('Esta cuenta ya tiene datos en la nube. Introduce su frase de paso.')
    throw new Error(insertError.message)
  }
  saveSyncState({ account: { key, ...user }, lastSeen: data.updated_at as string })
  return { created: true, change: false }
}

const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Confirma tu correo antes de entrar: revisa tu bandeja de entrada.',
  over_email_send_rate_limit: 'Se han enviado demasiados correos. Espera un rato e inténtalo de nuevo.',
  email_address_not_authorized: 'El servidor aún no puede enviar correos a esa dirección.',
  weak_password: 'La contraseña es demasiado débil.',
  user_already_exists: 'Ya existe una cuenta con ese correo.',
  signup_disabled: 'El registro con correo no está activado.',
  email_provider_disabled: 'El acceso con correo y contraseña no está activado.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento.',
  same_password: 'La nueva contraseña debe ser distinta de la anterior.',
}

const authError = (e: { code?: string; message: string }) =>
  new Error(AUTH_ERRORS[e.code ?? ''] ?? e.message)

export const MIN_PASSWORD = 8

export async function signUpWithEmail(email: string, password: string) {
  const sb = await getSupabase()
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${location.origin}/` },
  })
  if (error) throw authError(error)
  // Without a session, the e-mail still has to be confirmed.
  return { confirmed: !!data.session }
}

export async function signInWithEmail(email: string, password: string) {
  const sb = await getSupabase()
  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw authError(error)
}

export async function sendPasswordReset(email: string) {
  const sb = await getSupabase()
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/` })
  if (error) throw authError(error)
}

export async function setNewPassword(password: string) {
  const sb = await getSupabase()
  const { error } = await sb.auth.updateUser({ password })
  if (error) throw authError(error)
}

export async function signInWithGoogle() {
  const sb = await getSupabase()
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}/` },
  })
  if (error) throw new Error(error.message)
}

// Ends sync on this device and drops the local session only; other devices
// keep theirs.
export async function disconnectAccount(options: { keepState?: boolean } = {}) {
  if (!options.keepState) saveSyncState(null)
  const sb = await getSupabase()
  await sb.auth.signOut({ scope: 'local' })
}

export async function deleteCloudData(state: SyncState) {
  if (!state.account) return
  const { error } = await (await getSupabase())
    .from('account_vaults')
    .delete()
    .eq('user_id', state.account.userId)
  if (error) throw new Error(error.message)
  await disconnectAccount()
}

let pendiente: ReturnType<typeof setTimeout> | null = null

export function markChanged(storageKey: string, inicial = false) {
  const times = readTimes()
  times[storageKey] = inicial ? 0 : Date.now()
  saveTimes(times)

  const state = readSyncState()
  if (!state) return
  changes++
  saveSyncState({ ...state, dirty: true })
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
