// Opt in only after resuming Supabase and reviewing/applying local migrations.
export const backendEnabled = import.meta.env.VITE_SUPABASE_ENABLED === 'true'
export const authEnabled = backendEnabled || import.meta.env.VITE_SUPABASE_AUTH_ENABLED === 'true'
export function requireAuth() {
  if (!authEnabled) throw new Error('El acceso a la cuenta está desactivado en este entorno.')
}
export function requireBackend() {
  if (!backendEnabled) throw new Error('Supabase está en pausa. Esta función online estará disponible cuando se reactive el servicio.')
}
