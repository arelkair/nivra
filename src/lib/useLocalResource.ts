import { useEffect, useRef, useState } from 'react'
import { DATA_EVENT, readLocal } from './dataLifecycle'

export function useLocalResource<T>(key: string, initial: T) {
  const fallback = useRef(initial)
  const [value, setValue] = useState(() => readLocal(key, fallback.current))
  useEffect(() => {
    const refresh = () => setValue(readLocal(key, fallback.current))
    addEventListener(DATA_EVENT, refresh)
    addEventListener('storage', refresh)
    return () => { removeEventListener(DATA_EVENT, refresh); removeEventListener('storage', refresh) }
  }, [key]) // The initial value is a fallback, not a subscription identity.
  return value
}
