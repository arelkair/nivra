import { getSupabase } from '../../../lib/supabase'
import type { Board, BoardSettings, Item } from './boardModel'

export type Role = 'host' | 'edit' | 'view'
export type Peer = { id: string; name: string; color: string; role: Role }
export type Perms = { defaultRole: 'edit' | 'view'; roles: Record<string, 'edit' | 'view'> }
export type RemoteCursor = { x: number; y: number; selection: string[] }

type Meta = { name: string; settings: BoardSettings; perms: Perms }

type Message =
  | { t: 'hello'; from: string }
  | { t: 'snap'; to: string; part: number; total: number; meta: Meta | null; items: Item[] }
  | { t: 'ops'; from: string; upsert: Item[]; remove: string[]; settings?: BoardSettings; name?: string }
  | { t: 'perms'; perms: Perms }
  | { t: 'cursor'; from: string; x: number; y: number; selection: string[] }
  | { t: 'end'; deleted?: boolean }
  | { t: 'media'; id: string; part: number; total: number; d: string }

export type LiveHandlers = {
  onHello: (from: string) => void
  onSnapshot: (board: Pick<Board, 'name' | 'settings' | 'items'>, perms: Perms) => void
  onOps: (from: string, upsert: Item[], remove: string[], settings?: BoardSettings, name?: string) => void
  onPerms: (perms: Perms) => void
  onCursor: (from: string, cursor: RemoteCursor) => void
  onPeers: (peers: Peer[]) => void
  onEnd: (deleted: boolean) => void
  onMedia: (id: string, data: string) => void
  onStatus: (status: 'connecting' | 'live' | 'error') => void
}

export type LiveSession = {
  sendHello: () => Promise<void>
  sendSnapshot: (to: string, board: Board, perms: Perms) => Promise<void>
  sendOps: (upsert: Item[], remove: string[], settings?: BoardSettings, name?: string) => Promise<void>
  sendPerms: (perms: Perms) => Promise<void>
  sendCursor: (x: number, y: number, selection: string[]) => Promise<void>
  sendEnd: (deleted?: boolean) => Promise<void>
  sendMedia: (id: string, data: string) => Promise<void>
  close: () => Promise<void>
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 12
const CHUNK_BYTES = 60_000

export function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  return formatCode(Array.from(bytes, (b) => ALPHABET[b & 31]).join(''))
}

export function formatCode(value: string) {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH)
  return clean.match(/.{1,4}/g)?.join('-') ?? ''
}

export const validCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').length === CODE_LENGTH

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const toBase64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0))

async function deriveSecrets(code: string) {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const idHash = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(`nivra-board:${clean}`)))
  const keyHash = await crypto.subtle.digest('SHA-256', encoder.encode(`nivra-board-key:${clean}`))
  const key = await crypto.subtle.importKey('raw', keyHash, 'AES-GCM', false, ['encrypt', 'decrypt'])
  const channel = `nivra-board-${Array.from(idHash.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('')}`
  return { channel, key }
}

async function seal(key: CryptoKey, value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(value))))
  return { iv: toBase64(iv), d: toBase64(data) }
}

async function open<T>(key: CryptoKey, payload: unknown): Promise<T | null> {
  try {
    const { iv, d } = payload as { iv: string; d: string }
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, key, fromBase64(d))
    return JSON.parse(decoder.decode(plain)) as T
  } catch {
    return null
  }
}

function chunk(items: Item[]) {
  const parts: Item[][] = [[]]
  let size = 0
  for (const item of items) {
    const bytes = JSON.stringify(item).length
    if (size + bytes > CHUNK_BYTES && parts[parts.length - 1].length > 0) {
      parts.push([])
      size = 0
    }
    parts[parts.length - 1].push(item)
    size += bytes
  }
  return parts
}

export async function openLive(code: string, me: Peer, handlers: LiveHandlers): Promise<LiveSession> {
  handlers.onStatus('connecting')
  const sb = await getSupabase()
  const { channel: name, key } = await deriveSecrets(code)
  const channel = sb.channel(name, { config: { broadcast: { self: false }, presence: { key: me.id } } })
  const pending = new Map<number, Item[]>()
  let pendingMeta: Meta | null = null
  const mediaParts = new Map<string, string[]>()

  channel.on('broadcast', { event: 'm' }, async ({ payload }) => {
    const msg = await open<Message>(key, payload)
    if (!msg) return
    if (msg.t === 'hello') handlers.onHello(msg.from)
    else if (msg.t === 'snap') {
      if (msg.to !== me.id) return
      pending.set(msg.part, msg.items)
      if (msg.meta) pendingMeta = msg.meta
      if (pending.size === msg.total && pendingMeta) {
        const items = Array.from({ length: msg.total }, (_, i) => pending.get(i) ?? []).flat()
        handlers.onSnapshot({ name: pendingMeta.name, settings: pendingMeta.settings, items }, pendingMeta.perms)
        pending.clear()
      }
    } else if (msg.t === 'ops') handlers.onOps(msg.from, msg.upsert, msg.remove, msg.settings, msg.name)
    else if (msg.t === 'perms') handlers.onPerms(msg.perms)
    else if (msg.t === 'cursor') handlers.onCursor(msg.from, { x: msg.x, y: msg.y, selection: msg.selection })
    else if (msg.t === 'end') handlers.onEnd(!!msg.deleted)
    else if (msg.t === 'media') {
      const parts = mediaParts.get(msg.id) ?? Array.from({ length: msg.total }, () => '')
      parts[msg.part] = msg.d
      mediaParts.set(msg.id, parts)
      if (parts.every(Boolean)) {
        mediaParts.delete(msg.id)
        handlers.onMedia(msg.id, parts.join(''))
      }
    }
  })

  channel.on('presence', { event: 'sync' }, async () => {
    const state = channel.presenceState<{ p: { iv: string; d: string } }>()
    const peers = await Promise.all(
      Object.values(state)
        .flat()
        .map((entry) => open<Peer>(key, entry.p)),
    )
    handlers.onPeers(peers.filter((p): p is Peer => !!p))
  })

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), 15000)
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timer)
        await channel.track({ p: await seal(key, me) })
        handlers.onStatus('live')
        resolve()
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timer)
        handlers.onStatus('error')
        reject(new Error(status))
      }
    })
  })

  const send = async (msg: Message) => {
    await channel.send({ type: 'broadcast', event: 'm', payload: await seal(key, msg) })
  }

  return {
    sendHello: () => send({ t: 'hello', from: me.id }),
    sendSnapshot: async (to, board, perms) => {
      const parts = chunk(board.items)
      for (let i = 0; i < parts.length; i++) {
        await send({ t: 'snap', to, part: i, total: parts.length, meta: i === 0 ? { name: board.name, settings: board.settings, perms } : null, items: parts[i] })
      }
    },
    sendOps: async (upsert, remove, settings, boardName) => {
      for (const part of chunk(upsert)) await send({ t: 'ops', from: me.id, upsert: part, remove: [], settings, name: boardName })
      if (remove.length) await send({ t: 'ops', from: me.id, upsert: [], remove })
    },
    sendPerms: (perms) => send({ t: 'perms', perms }),
    sendCursor: (x, y, selection) => send({ t: 'cursor', from: me.id, x, y, selection }),
    sendEnd: (deleted = false) => send({ t: 'end', deleted }),
    sendMedia: async (id, data) => {
      const size = 45_000
      const total = Math.ceil(data.length / size)
      for (let i = 0; i < total; i++) await send({ t: 'media', id, part: i, total, d: data.slice(i * size, (i + 1) * size) })
    },
    close: async () => {
      await channel.untrack()
      await sb.removeChannel(channel)
    },
  }
}
