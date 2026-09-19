import type { PageId } from '../../lib/store'

export type Section =
  | 'inicio'
  | 'calendario'
  | 'horario'
  | 'tareas'
  | 'examenes'
  | 'notas'
  | 'banco'
  | 'deseos'
  | 'suscripciones'
  | 'recordatorios'
  | 'cuentas'
  | 'lab'
  | 'ajustes'
  | 'boveda'

export type SectionInfo = { id: Section; group: string; label: string; short: string; icon: string }

export const SECTIONS: SectionInfo[] = [
  { id: 'inicio', group: 'Principal', label: 'Inicio', short: 'Inicio', icon: 'dashboard' },
  { id: 'calendario', group: 'Principal', label: 'Calendario', short: 'Calend.', icon: 'calendar' },
  { id: 'horario', group: 'Principal', label: 'Horario', short: 'Horario', icon: 'schedule' },
  { id: 'tareas', group: 'Estudio', label: 'Tareas', short: 'Tareas', icon: 'tasks' },
  { id: 'examenes', group: 'Estudio', label: 'Exámenes y Proyectos', short: 'Exám.', icon: 'exams' },
  { id: 'notas', group: 'Estudio', label: 'Notas', short: 'Notas', icon: 'grades' },
  { id: 'banco', group: 'Dinero', label: 'Dinero', short: 'Dinero', icon: 'bank' },
  { id: 'deseos', group: 'Dinero', label: 'Lista de Deseos', short: 'Deseos', icon: 'wish' },
  { id: 'suscripciones', group: 'Dinero', label: 'Suscripciones', short: 'Subs', icon: 'subs' },
  { id: 'recordatorios', group: 'Utilidades', label: 'Recordatorios', short: 'Avisos', icon: 'bell' },
  { id: 'cuentas', group: 'Utilidades', label: 'Cuentas atrás', short: 'Cuentas', icon: 'timer' },
  { id: 'lab', group: 'Utilidades', label: 'Laboratorio', short: 'Lab', icon: 'lab' },
  { id: 'boveda', group: 'Conocimiento', label: 'Bóveda', short: 'Bóveda', icon: 'graph' },
]

export const PAGE_TO_SECTION: Partial<Record<PageId, Section>> = {
  dashboard: 'inicio',
  calendario: 'calendario',
  horario: 'horario',
  bloc: 'boveda',
  tareas: 'tareas',
  examenes: 'examenes',
  notas: 'notas',
  banco: 'banco',
  deseos: 'deseos',
  suscripciones: 'suscripciones',
  cuentas: 'cuentas',
  recordatorios: 'recordatorios',
  lab: 'lab',
}
