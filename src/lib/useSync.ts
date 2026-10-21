import { useEffect, useState } from 'react'
import { backendEnabled } from './backend'
import { connectGoogleAccount, readSyncState, runSync, type SyncState } from './sync'
import { authPending } from './supabase'

const POLL_INTERVAL = 4000

export function useSync() {
  const [status, setStatus] = useState<SyncState | null>(() => readSyncState())
  // Identifies the active connection (code or account) so the poll restarts when it changes.
  const connection = status ? (status.account ? `account:${status.account.userId}` : `code:${status.code}`) : null
  useEffect(() => {
    const changed = () => setStatus(readSyncState())
    addEventListener('nivra-sync-status', changed)
    addEventListener('storage', changed)
    return () => { removeEventListener('nivra-sync-status', changed); removeEventListener('storage', changed) }
  }, [])
  useEffect(() => {
    if (!backendEnabled || status || !authPending()) return
    let alive = true
    void connectGoogleAccount().then(state => { if (alive && state) setStatus(state) }).catch(() => {})
    return () => { alive = false }
  }, [status])

  useEffect(() => {
    if (!connection || !backendEnabled) return
    let alive = true
    let working = false

    const tick = async () => {
      const current = readSyncState()
      if (!current || working) return
      working = true
      try {
        const r = await runSync(current)
        if (alive) setStatus(r.state)
      } catch (cause) { if (alive) setStatus({ ...current, error: (cause as Error).message }) }
      working = false
    }

    tick()
    const id = setInterval(tick, POLL_INTERVAL)
    addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => {
      alive = false
      clearInterval(id)
      removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [connection])

  return [status, setStatus] as const
}
