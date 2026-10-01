import type { SupabaseClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://erfwpsvjbebfoeeexgrr.supabase.co'
export const PUBLIC_KEY = 'sb_publishable_yQ9Uk6CNHcbt4D05JmQVZw_d4Y5P_eh'

// Deliberately not prefixed with "nivra-": everything under that prefix is
// synced and exported, and a session token must never leave this device.
export const AUTH_KEY = 'sb-nivra-auth'

const RETURN_KEY = 'nivra-return-sync'

export const markReturnToSync = () => {
  try {
    sessionStorage.setItem(RETURN_KEY, '1')
  } catch {}
}

let returnHandled = false

// True right after coming back from Google or from an e-mail link, so the UI
// that started the flow can reopen on its sync section.
export const shouldReturnToSync = () => {
  if (returnHandled) return false
  if (callback?.code) return true
  try {
    return sessionStorage.getItem(RETURN_KEY) === '1'
  } catch {
    return false
  }
}

export const clearReturnToSync = () => {
  returnHandled = true
  try {
    sessionStorage.removeItem(RETURN_KEY)
  } catch {}
}

const hasStoredSession = () => {
  try {
    return localStorage.getItem(AUTH_KEY) !== null
  } catch {
    return false
  }
}

// The OAuth redirect lands on "/?code=…". The app rewrites the URL as soon as
// it mounts, so the code is read here, synchronously at import time, and
// exchanged later by hand. Only codes from a flow this browser started (it
// left a PKCE verifier behind) are accepted.
const callback = (() => {
  try {
    const params = new URLSearchParams(location.search)
    const code = params.get('code')
    const error = params.get('error_description') ?? params.get('error')
    if (!code && !error) return null
    if (code && localStorage.getItem(`${AUTH_KEY}-code-verifier`) === null) return null
    history.replaceState(history.state, '', location.pathname + location.hash)
    return { code, error }
  } catch {
    return null
  }
})()

let callbackError: string | null = callback?.error ?? null

let recovering = false

// True while the visit comes from a password-recovery e-mail link, until the
// new password is saved or the session is dropped.
export const isRecovering = () => recovering
export const clearRecovery = () => {
  recovering = false
}

export const takeAuthError = () => {
  const e = callbackError
  callbackError = null
  return e
}

export const authPending = () => hasStoredSession() || !!callback?.code

let client: Promise<SupabaseClient> | null = null
let exchange: Promise<void> | null = null

export function getSupabase() {
  client ??= import('@supabase/supabase-js').then(({ createClient }) => {
    const sb = createClient(SUPABASE_URL, PUBLIC_KEY, {
      auth: {
        storageKey: AUTH_KEY,
        flowType: 'pkce',
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
    sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') recovering = true
    })
    if (callback?.code) {
      exchange = sb.auth
        .exchangeCodeForSession(callback.code)
        .then(({ error }) => {
          if (error) callbackError = error.message
        })
        .catch((e) => {
          callbackError = String(e?.message ?? e)
        })
    }
    return sb
  })
  return client
}

export async function getSession() {
  const sb = await getSupabase()
  await exchange
  const { data } = await sb.auth.getSession()
  return data.session
}
