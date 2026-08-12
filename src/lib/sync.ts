const RPC = 'https://erfwpsvjbebfoeeexgrr.supabase.co/rest/v1/rpc'
const PUBLIC_KEY = 'sb_publishable_yQ9Uk6CNHcbt4D05JmQVZw_d4Y5P_eh'

const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ESTADO = 'nivra-sync'
const TIEMPOS = 'nivra-sync-times'
const EVENTO = 'nivra-sync'

export type EstadoSync = {
  code: string
  lastSeen: string | null
  error?: string
}

type Entrada = { v: string; t: number }
type Paquete = { v: 2; keys: Record<string, Entrada> }

export function nuevoCodigo() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const texto = Array.from(bytes, (b) => ALFA[b & 31]).join('')
  return texto.match(/.{4}/g)!.join('-')
}

export const normaliza = (codigo: string) =>
  codigo.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)

export const conGuiones = (codigo: string) => normaliza(codigo).match(/.{1,4}/g)?.join('-') ?? ''

const leerJson = <T,>(clave: string, porDefecto: T): T => {
  try {
    const raw = localStorage.getItem(clave)
    return raw ? (JSON.parse(raw) as T) : porDefecto
  } catch {
    return porDefecto
  }
}

export const leerEstado = () => leerJson<EstadoSync | null>(ESTADO, null)

export function guardarEstado(estado: EstadoSync | null) {
  if (estado) localStorage.setItem(ESTADO, JSON.stringify(estado))
  else localStorage.removeItem(ESTADO)
}

const leerTiempos = () => leerJson<Record<string, number>>(TIEMPOS, {})
const guardarTiempos = (t: Record<string, number>) =>
  localStorage.setItem(TIEMPOS, JSON.stringify(t))

const interna = (k: string) => k === ESTADO || k === TIEMPOS

function valoresLocales() {
  const out: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('nivra-') && !interna(k)) out[k] = localStorage.getItem(k) ?? ''
  }
  return out
}

function paqueteLocal(): Paquete {
  const valores = valoresLocales()
  const tiempos = leerTiempos()
  const keys: Record<string, Entrada> = {}
  for (const k of Object.keys(valores).sort()) keys[k] = { v: valores[k], t: tiempos[k] ?? 0 }
  return { v: 2, keys }
}

const bytesAHex = (b: ArrayBuffer) =>
  Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('')

async function hex(texto: string) {
  return bytesAHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)))
}

const identificador = (codigo: string) => hex(`nivra-id-v1:${codigo}`)

async function clave(codigo: string) {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(codigo),
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

const aBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const deBase64 = (texto: string) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0))

async function cifrar(texto: string, k: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cifrado = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    k,
    new TextEncoder().encode(texto),
  )
  const junto = new Uint8Array(iv.length + cifrado.byteLength)
  junto.set(iv)
  junto.set(new Uint8Array(cifrado), iv.length)
  return aBase64(junto)
}

async function descifrar(texto: string, k: CryptoKey) {
  const junto = deBase64(texto)
  const plano = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: junto.slice(0, 12) },
    k,
    junto.slice(12),
  )
  return new TextDecoder().decode(plano)
}

async function rpc(fn: string, body: Record<string, unknown>) {
  const r = await fetch(`${RPC}/${fn}`, {
    method: 'POST',
    headers: { apikey: PUBLIC_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return r.json()
}

function comoPaquete(json: string): Paquete {
  const crudo = JSON.parse(json) as Paquete | Record<string, string>
  if ((crudo as Paquete).v === 2) return crudo as Paquete
  const keys: Record<string, Entrada> = {}
  for (const [k, v] of Object.entries(crudo as Record<string, string>)) keys[k] = { v, t: 0 }
  return { v: 2, keys }
}

/** Gana la versión más reciente de cada clave, no el último dispositivo en escribir. */
function mezclar(local: Paquete, remoto: Paquete) {
  const keys: Record<string, Entrada> = {}
  let cambiaLocal = false
  let cambiaRemoto = false

  for (const k of [...new Set([...Object.keys(local.keys), ...Object.keys(remoto.keys)])].sort()) {
    const a = local.keys[k]
    const b = remoto.keys[k]
    if (a && b) {
      const gana = b.t > a.t ? b : a
      keys[k] = gana
      if (gana.v !== a.v) cambiaLocal = true
      if (gana.v !== b.v) cambiaRemoto = true
    } else if (b) {
      keys[k] = b
      cambiaLocal = true
    } else {
      keys[k] = a
      cambiaRemoto = true
    }
  }
  return { fusion: { v: 2, keys } as Paquete, cambiaLocal, cambiaRemoto }
}

function aplicar(paquete: Paquete) {
  const tiempos = leerTiempos()
  let tocado = false
  for (const [k, e] of Object.entries(paquete.keys)) {
    if (localStorage.getItem(k) !== e.v) {
      localStorage.setItem(k, e.v)
      tocado = true
    }
    tiempos[k] = e.t
  }
  guardarTiempos(tiempos)
  if (tocado) dispatchEvent(new Event(EVENTO))
  return tocado
}

const texto = (p: Paquete) => JSON.stringify(p)

export async function subir(estado: EstadoSync, paquete = paqueteLocal()) {
  const codigo = normaliza(estado.code)
  const ts = await rpc('vault_put', {
    vault_id: await identificador(codigo),
    vault_payload: await cifrar(texto(paquete), await clave(codigo)),
  })
  const nuevo = { ...estado, lastSeen: ts as string, error: undefined }
  guardarEstado(nuevo)
  return nuevo
}

async function leerRemoto(codigo: string) {
  const filas = (await rpc('vault_get', { vault_id: await identificador(codigo) })) as {
    payload: string
    updated_at: string
  }[]
  if (!filas[0]) return null
  return {
    paquete: comoPaquete(await descifrar(filas[0].payload, await clave(codigo))),
    updated_at: filas[0].updated_at,
  }
}

/** Trae lo del servidor, lo mezcla con lo de aquí y devuelve lo que haya cambiado. */
export async function sincronizar(estado: EstadoSync) {
  const codigo = normaliza(estado.code)
  const remoto = await leerRemoto(codigo)
  const local = paqueteLocal()

  if (!remoto) {
    const nuevo = await subir(estado, local)
    return { estado: nuevo, cambio: false }
  }

  const { fusion, cambiaLocal, cambiaRemoto } = mezclar(local, remoto.paquete)
  const cambio = cambiaLocal ? aplicar(fusion) : false

  let siguiente = { ...estado, lastSeen: remoto.updated_at, error: undefined }
  if (cambiaRemoto) siguiente = await subir(siguiente, fusion)
  else guardarEstado(siguiente)

  return { estado: siguiente, cambio }
}

export async function conectar(codigo: string) {
  const limpio = normaliza(codigo)
  if (limpio.length !== 16) throw new Error('El código debe tener 16 caracteres.')
  const inicial: EstadoSync = { code: limpio, lastSeen: null }

  const remoto = await leerRemoto(limpio)
  if (!remoto) {
    guardarEstado(await subir(inicial))
    return { creado: true, cambio: false }
  }

  const cambio = aplicar(remoto.paquete)
  guardarEstado({ ...inicial, lastSeen: remoto.updated_at })
  return { creado: false, cambio }
}

let pendiente: ReturnType<typeof setTimeout> | null = null

/** `inicial` marca los valores por defecto que crea la app al abrirse: no deben
 *  ganarle a lo que ya haya en el otro dispositivo, así que van con tiempo cero. */
export function avisarCambio(clave: string, inicial = false) {
  const tiempos = leerTiempos()
  tiempos[clave] = inicial ? 0 : Date.now()
  guardarTiempos(tiempos)

  const estado = leerEstado()
  if (!estado) return
  if (pendiente) clearTimeout(pendiente)
  pendiente = setTimeout(() => {
    sincronizar(leerEstado() ?? estado).catch((e) =>
      guardarEstado({ ...(leerEstado() ?? estado), error: String(e.message ?? e) }),
    )
  }, 1200)
}

export const alSincronizar = (fn: () => void) => {
  addEventListener(EVENTO, fn)
  return () => removeEventListener(EVENTO, fn)
}
