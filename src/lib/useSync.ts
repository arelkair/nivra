import { useEffect, useState } from 'react'
import { leerEstado, sincronizar, type EstadoSync } from './sync'

const CADA = 4000

export function useSync() {
  const [estado, setEstado] = useState<EstadoSync | null>(() => leerEstado())
  const code = estado?.code

  useEffect(() => {
    if (!code) return
    let vivo = true
    let trabajando = false

    const vuelta = async () => {
      const actual = leerEstado()
      if (!actual || trabajando) return
      trabajando = true
      try {
        const r = await sincronizar(actual)
        if (vivo) setEstado(r.estado)
      } catch {
      }
      trabajando = false
    }

    vuelta()
    const id = setInterval(vuelta, CADA)
    addEventListener('focus', vuelta)
    document.addEventListener('visibilitychange', vuelta)
    return () => {
      vivo = false
      clearInterval(id)
      removeEventListener('focus', vuelta)
      document.removeEventListener('visibilitychange', vuelta)
    }
  }, [code])

  return [estado, setEstado] as const
}
