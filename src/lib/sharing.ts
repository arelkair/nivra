import { getSupabase } from './supabase'
import { accountSession } from './feedback'
import { requireBackend } from './backend'
import { readLocal, writeLocal } from './dataLifecycle'

export type SharedDocument = { version: 1; kind: 'note' | 'badge'; title: string; body: string }
export type PublicLink = { id: string; noteId: string; token: string; title: string; expires: string }
export const PUBLIC_LINKS = 'nivra-public-links'
export function portableLink(document: SharedDocument, origin = location.origin) {
  const raw = new TextEncoder().encode(JSON.stringify(document))
  if (raw.length > 24000) throw new Error('Esta nota es demasiado larga para un enlace sin servidor. Usa la publicación online.')
  const encoded = btoa(Array.from(raw, byte => String.fromCharCode(byte)).join('')).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
  return `${origin}/shared#${encoded}`
}
export function readPortable(fragment: string): SharedDocument {
  if (fragment.length > 34000) throw new Error('El enlace no es válido.')
  const encoded = fragment.replace(/^#/, '').replaceAll('-', '+').replaceAll('_', '/')
  const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0))
  const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  if (!value || typeof value !== 'object') throw new Error('El enlace no es válido.')
  const doc = value as SharedDocument
  if (doc.version !== 1 || !['note', 'badge'].includes(doc.kind) || typeof doc.title !== 'string' || doc.title.length > 200 || typeof doc.body !== 'string' || doc.body.length > 24000) throw new Error('El enlace no es válido.')
  return { version: 1, kind: doc.kind, title: doc.title, body: doc.body }
}
async function tokenHash(token: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), byte => byte.toString(16).padStart(2, '0')).join('')
}
export async function publishNote(noteId: string, title: string, body: string) {
  const { sb, user } = await accountSession()
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')
  const hash = await tokenHash(token)
  const expires = new Date(Date.now() + 30 * 86400000).toISOString()
  const { error } = await sb.from('public_notes').insert({ token_hash: hash, owner_id: user.id, note_id: noteId, title, body, expires_at: expires })
  if (error) throw new Error(error.message)
  const link: PublicLink = { id: hash, token, noteId, title, expires }
  writeLocal(PUBLIC_LINKS, [link, ...readLocal<PublicLink[]>(PUBLIC_LINKS, [])])
  return `${location.origin}/shared/${token}`
}
export async function revokePublicLink(link: PublicLink) {
  const { sb, user } = await accountSession()
  const { data, error } = await sb.from('public_notes').delete().eq('token_hash', link.id).eq('owner_id', user.id).select('token_hash')
  if (error) throw new Error(error.message)
  if (!data?.length) throw new Error('No se puede revocar este enlace con la cuenta actual.')
  writeLocal(PUBLIC_LINKS, readLocal<PublicLink[]>(PUBLIC_LINKS, []).filter(item => item.id !== link.id))
}
export async function readPublicNote(token: string): Promise<SharedDocument> {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('El enlace no es válido.')
  requireBackend()
  const { data, error } = await (await getSupabase()).rpc('read_public_note', { p_token_hash: await tokenHash(token) })
  if (error) throw new Error(error.message)
  if (!data?.[0]) throw new Error('Esta nota ha caducado o su enlace se ha revocado.')
  return { version: 1, kind: 'note', title: data[0].title, body: data[0].body }
}
