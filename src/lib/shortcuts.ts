import type { PageId } from './store'

type Action =
  | { kind: 'ir'; page: PageId }
  | { kind: 'atras' }
  | { kind: 'adelante' }
  | { kind: 'buscar' }
  | { kind: 'ajustes' }
  | { kind: 'tema' }
  | { kind: 'nota' }

type Shortcut = { id: string; label: string; key: string; action: Action }

export const SHORTCUTS: Shortcut[] = [
  { id: 'dashboard', label: 'Ir al dashboard', key: 'g d', action: { kind: 'ir', page: 'dashboard' } },
  { id: 'calendario', label: 'Ir al calendario', key: 'g c', action: { kind: 'ir', page: 'calendario' } },
  { id: 'horario', label: 'Ir al horario', key: 'g h', action: { kind: 'ir', page: 'horario' } },
  { id: 'bloc', label: 'Ir al bloc de notas', key: 'g b', action: { kind: 'ir', page: 'bloc' } },
  { id: 'tareas', label: 'Ir a tareas', key: 'g t', action: { kind: 'ir', page: 'tareas' } },
  { id: 'examenes', label: 'Ir a exámenes y proyectos', key: 'g e', action: { kind: 'ir', page: 'examenes' } },
  { id: 'notas', label: 'Ir a notas', key: 'g n', action: { kind: 'ir', page: 'notas' } },
  { id: 'banco', label: 'Ir al banco', key: 'g m', action: { kind: 'ir', page: 'banco' } },
  { id: 'deseos', label: 'Ir a la lista de deseos', key: 'g l', action: { kind: 'ir', page: 'deseos' } },
  { id: 'suscripciones', label: 'Ir a suscripciones', key: 'g s', action: { kind: 'ir', page: 'suscripciones' } },
  { id: 'cuentas', label: 'Ir a cuentas atrás', key: 'g u', action: { kind: 'ir', page: 'cuentas' } },
  { id: 'recordatorios', label: 'Ir a recordatorios', key: 'g r', action: { kind: 'ir', page: 'recordatorios' } },
  { id: 'buscar', label: 'Buscar', key: '/', action: { kind: 'buscar' } },
  { id: 'ajustes', label: 'Abrir ajustes', key: ',', action: { kind: 'ajustes' } },
  { id: 'tema', label: 'Cambiar tema', key: 'shift+t', action: { kind: 'tema' } },
  { id: 'nota', label: 'Nota flotante', key: 'shift+n', action: { kind: 'nota' } },
  { id: 'atras', label: 'Volver atrás', key: 'alt+arrowleft', action: { kind: 'atras' } },
  { id: 'adelante', label: 'Ir adelante', key: 'alt+arrowright', action: { kind: 'adelante' } },
]

export const keyOf = (e: KeyboardEvent) => {
  const parts: string[] = []
  if (e.altKey) parts.push('alt')
  if (e.ctrlKey || e.metaKey) parts.push('ctrl')
  if (e.shiftKey && e.key.length > 1) parts.push('shift')
  const base = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase()
  if (e.shiftKey && e.key.length === 1 && /[a-z]/i.test(e.key)) {
    return `shift+${base}`
  }
  parts.push(base)
  return parts.join('+')
}

export const isTyping = (destino: EventTarget | null) => {
  const element = destino as HTMLElement | null
  if (!element) return false
  const tag = element.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable
}
