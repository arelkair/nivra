import { useEffect, useState } from 'react'
import { DATA_EVENT } from './dataLifecycle'
import { isUnlocked, lockNow, type LockScope } from './pin'

export function useLockStatus(scope: LockScope) {
  const [unlocked, setUnlocked] = useState(() => isUnlocked(scope))
  useEffect(() => {
    const refresh = () => setUnlocked(isUnlocked(scope))
    const storage = (event: StorageEvent) => { if (event.key?.startsWith('device-nivra-lock')) lockNow() }
    addEventListener('nivra-lock', refresh)
    addEventListener(DATA_EVENT, refresh)
    addEventListener('storage', storage)
    return () => { removeEventListener('nivra-lock', refresh); removeEventListener(DATA_EVENT, refresh); removeEventListener('storage', storage) }
  }, [scope])
  return unlocked
}
