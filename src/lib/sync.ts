const RPC = 'https://erfwpsvjbebfoeeexgrr.supabase.co/rest/v1/rpc'
const PUBLIC_KEY = 'sb_publishable_yQ9Uk6CNHcbt4D05JmQVZw_d4Y5P_eh'

const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ESTADO = 'nivra-sync'

export type EstadoSync = {
  code: string
  lastSeen: string | null
  lastHash: string | null
  error?: string
}

export function nuevoCodigo() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const texto = Array.from(bytes, (b) => ALFA[b & 31]).join('')
  return texto.match(/.{4}/g)!.join('-')
}

export const normaliza = (codigo: string) =>
  codigo.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)

export const conGuiones = (codigo: string) => normaliza(codigo).match(/.{1,4}/g)?.join('-') ?? ''

export function leerEstado(): EstadoSync | null {
  try {
    const raw = localStorage.getItem(ESTADO)
    return raw ? (JSON.parse(raw) as EstadoSync) : null
  } catch {
    return null
  }
}

export function guardarEstado(estado: EstadoSync | null) {
  if (estado) localStorage.setItem(ESTADO, JSON.stringify(estado))
  else localStorage.removeItem(ESTADO)
}

const bytesAHex = (b: ArrayBuffer) =>
  Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('')

async function hex(texto: string) {
  return bytesAHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)))
}

async function identificador(codigo: string) {
  return hex(`nivra-id-v1:${codigo}`)
}

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

/** JSON con las claves ordenadas: dos dispositivos con los mismos datos dan el mismo texto. */
function copiaLocal() {
  const claves: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('nivra-') && k !== ESTADO) claves.push(k)
  }
  claves.sort()
  return JSON.stringify(Object.fromEntries(claves.map((k) => [k, localStorage.getItem(k) ?? ''])))
}

function aplicar(datos: Record<string, string>) {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i)
    if (k && k.startsWith('nivra-') && k !== ESTADO && !(k in datos)) localStorage.removeItem(k)
  }
  for (const [k, v] of Object.entries(datos)) localStorage.setItem(k, v)
}

export async function subir(estado: EstadoSync, forzar = false) {
  const json = copiaLocal()
  const huella = await hex(json)
  if (!forzar && huella === estado.lastHash) return estado

  const codigo = normaliza(estado.code)
  const cifrado = await cifrar(json, await clave(codigo))
  const ts = await rpc('vault_put', {
    vault_id: await identificador(codigo),
    vault_payload: cifrado,
  })
  const nuevo = { ...estado, lastSeen: ts as string, lastHash: huella, error: undefined }
  guardarEstado(nuevo)
  return nuevo
}

/** Devuelve true si ha traído datos nuevos y conviene recargar. */
export async function bajar(estado: EstadoSync) {
  const codigo = normaliza(estado.code)
  const filas = (await rpc('vault_get', { vault_id: await identificador(codigo) })) as {
    payload: string
    updated_at: string
  }[]
  const fila = filas[0]
  if (!fila) return { estado, hayDatos: false, cambio: false }
  if (fila.updated_at === estado.lastSeen) return { estado, hayDatos: true, cambio: false }

  const json = await descifrar(fila.payload, await clave(codigo))
  const huella = await hex(json)
  if (huella === estado.lastHash) {
    const igual = { ...estado, lastSeen: fila.updated_at }
    guardarEstado(igual)
    return { estado: igual, hayDatos: true, cambio: false }
  }

  aplicar(JSON.parse(json) as Record<string, string>)
  const nuevo = { ...estado, lastSeen: fila.updated_at, lastHash: huella, error: undefined }
  guardarEstado(nuevo)
  return { estado: nuevo, hayDatos: true, cambio: true }
}

export async function conectar(codigo: string) {
  const limpio = normaliza(codigo)
  if (limpio.length !== 16) throw new Error('El código debe tener 16 caracteres.')
  const inicial: EstadoSync = { code: limpio, lastSeen: null, lastHash: null }
  const { estado, hayDatos, cambio } = await bajar(inicial)
  if (!hayDatos) {
    guardarEstado(await subir(inicial, true))
    return { creado: true, cambio: false }
  }
  guardarEstado(estado)
  return { creado: false, cambio }
}

let pendiente: ReturnType<typeof setTimeout> | null = null

export function avisarCambio() {
  const estado = leerEstado()
  if (!estado) return
  if (pendiente) clearTimeout(pendiente)
  pendiente = setTimeout(() => {
    subir(estado).catch((e) => guardarEstado({ ...estado, error: String(e.message ?? e) }))
  }, 2000)
}
