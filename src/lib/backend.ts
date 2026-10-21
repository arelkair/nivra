export const backendEnabled = import.meta.env.VITE_SUPABASE_ENABLED !== 'false'
export const authEnabled = backendEnabled || import.meta.env.VITE_SUPABASE_AUTH_ENABLED !== 'false'
export function requireAuth() {
  if (!authEnabled) throw new Error('El acceso a la cuenta está desactivado en este entorno.')
}
export function requireBackend() {
  if (!backendEnabled) throw new Error('Supabase está en pausa. Esta función online estará disponible cuando se reactive el servicio.')
}
