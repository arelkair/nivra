import { useEffect, useState } from 'react'
import { bajar, leerEstado, type EstadoSync } from './sync'

export function useSync() {
  const [estado, setEstado] = useState<EstadoSync | null>(() => leerEstado())
  const code = estado?.code

  useEffect(() => {
    if (!code) return
    let vivo = true

    const traer = async () => {
      const actual = leerEstado()
      if (!actual) return
      try {
        const r = await bajar(actual)
        if (!vivo) return
        if (r.cambio) location.reload()
        else setEstado(r.estado)
      } catch {
        /* sin conexión: se reintenta en la siguiente vuelta */
      }
    }

    traer()
    const id = setInterval(traer, 20000)
    addEventListener('focus', traer)
    return () => {
      vivo = false
      clearInterval(id)
      removeEventListener('focus', traer)
    }
  }, [code])

  return [estado, setEstado] as const
}
