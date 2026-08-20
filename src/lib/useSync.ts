import { useEffect, useState } from 'react'
import { readSyncState, runSync, type SyncState } from './sync'

const POLL_INTERVAL = 4000

export function useSync() {
  const [status, setStatus] = useState<SyncState | null>(() => readSyncState())
  const code = status?.code

  useEffect(() => {
    if (!code) return
    let alive = true
    let working = false

    const tick = async () => {
      const current = readSyncState()
      if (!current || working) return
      working = true
      try {
        const r = await runSync(current)
        if (alive) setStatus(r.state)
      } catch {
      }
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
  }, [code])

  return [status, setStatus] as const
}
