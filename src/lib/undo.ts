type Emisor = (texto: string, deshacer?: () => void) => void

let emisor: Emisor | null = null

export function registrarAvisos(fn: Emisor) {
  emisor = fn
  return () => {
    if (emisor === fn) emisor = null
  }
}

export const avisar = (texto: string) => emisor?.(texto)

/** Avisa de un borrado y ofrece deshacerlo mientras el aviso siga en pantalla. */
export const conDeshacer = (texto: string, deshacer: () => void) => emisor?.(texto, deshacer)
