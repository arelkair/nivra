import type { PageId } from './store'

export type Accion =
  | { tipo: 'ir'; page: PageId }
  | { tipo: 'atras' }
  | { tipo: 'adelante' }
  | { tipo: 'buscar' }
  | { tipo: 'ajustes' }
  | { tipo: 'tema' }
  | { tipo: 'nota' }

export type Atajo = { id: string; label: string; tecla: string; accion: Accion }

export const ATAJOS: Atajo[] = [
  { id: 'dashboard', label: 'Ir al dashboard', tecla: 'g d', accion: { tipo: 'ir', page: 'dashboard' } },
  { id: 'calendario', label: 'Ir al calendario', tecla: 'g c', accion: { tipo: 'ir', page: 'calendario' } },
  { id: 'horario', label: 'Ir al horario', tecla: 'g h', accion: { tipo: 'ir', page: 'horario' } },
  { id: 'bloc', label: 'Ir al bloc de notas', tecla: 'g b', accion: { tipo: 'ir', page: 'bloc' } },
  { id: 'tareas', label: 'Ir a tareas', tecla: 'g t', accion: { tipo: 'ir', page: 'tareas' } },
  { id: 'examenes', label: 'Ir a exámenes y proyectos', tecla: 'g e', accion: { tipo: 'ir', page: 'examenes' } },
  { id: 'notas', label: 'Ir a notas', tecla: 'g n', accion: { tipo: 'ir', page: 'notas' } },
  { id: 'banco', label: 'Ir al banco', tecla: 'g m', accion: { tipo: 'ir', page: 'banco' } },
  { id: 'deseos', label: 'Ir a la lista de deseos', tecla: 'g l', accion: { tipo: 'ir', page: 'deseos' } },
  { id: 'suscripciones', label: 'Ir a suscripciones', tecla: 'g s', accion: { tipo: 'ir', page: 'suscripciones' } },
  { id: 'cuentas', label: 'Ir a cuentas atrás', tecla: 'g u', accion: { tipo: 'ir', page: 'cuentas' } },
  { id: 'recordatorios', label: 'Ir a recordatorios', tecla: 'g r', accion: { tipo: 'ir', page: 'recordatorios' } },
  { id: 'buscar', label: 'Buscar', tecla: '/', accion: { tipo: 'buscar' } },
  { id: 'ajustes', label: 'Abrir ajustes', tecla: ',', accion: { tipo: 'ajustes' } },
  { id: 'tema', label: 'Cambiar tema', tecla: 'shift+t', accion: { tipo: 'tema' } },
  { id: 'nota', label: 'Nota flotante', tecla: 'shift+n', accion: { tipo: 'nota' } },
  { id: 'atras', label: 'Volver atrás', tecla: 'alt+arrowleft', accion: { tipo: 'atras' } },
  { id: 'adelante', label: 'Ir adelante', tecla: 'alt+arrowright', accion: { tipo: 'adelante' } },
]

export const teclaDe = (e: KeyboardEvent) => {
  const partes: string[] = []
  if (e.altKey) partes.push('alt')
  if (e.ctrlKey || e.metaKey) partes.push('ctrl')
  if (e.shiftKey && e.key.length > 1) partes.push('shift')
  const base = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase()
  if (e.shiftKey && e.key.length === 1 && /[a-z]/i.test(e.key)) {
    return `shift+${base}`
  }
  partes.push(base)
  return partes.join('+')
}

export const escribiendo = (destino: EventTarget | null) => {
  const el = destino as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}
