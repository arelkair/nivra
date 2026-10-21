import { requireBackend } from './backend'
import { getSession, getSupabase } from './supabase'
export async function accountSession() {
  requireBackend()
  const user = (await getSession())?.user
  if (!user) throw new Error('Inicia sesión para enviar un comentario.')
  return { sb: await getSupabase(), user }
}
export async function sendFeedback(update: string, body: string) {
  const { sb, user } = await accountSession()
  const { error } = await sb.from('app_feedback').insert({ user_id: user.id, update_id: update, body: body.trim() })
  if (error) throw new Error(error.message)
}
