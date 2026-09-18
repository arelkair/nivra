export type WidgetType =
  | 'vacio'
  | 'dinero'
  | 'hoy-resumen'
  | 'tareas-resumen'
  | 'porvenir-resumen'
  | 'cuentas-atras'
  | 'hoy-detalle'
  | 'horario'
  | 'examenes'
  | 'proximo'
  | 'pendiente'
  | 'racha'

export type SlotGroup = 'resumen' | 'banda' | 'panel'

export const WIDGET_LABELS: Record<WidgetType, string> = {
  vacio: 'Vacío',
  dinero: 'Dinero',
  'hoy-resumen': 'Calendario (hoy)',
  'tareas-resumen': 'Tareas pendientes',
  'porvenir-resumen': 'Exámenes y proyectos por venir',
  'cuentas-atras': 'Cuentas atrás',
  'hoy-detalle': 'Hoy, en detalle',
  horario: 'Horario',
  examenes: 'Exámenes y proyectos',
  proximo: 'Próximo',
  pendiente: 'Pendiente',
  racha: 'Racha',
}

export const GROUP_TYPES: Record<SlotGroup, WidgetType[]> = {
  resumen: ['dinero', 'hoy-resumen', 'tareas-resumen', 'porvenir-resumen', 'vacio'],
  banda: ['cuentas-atras', 'vacio'],
  panel: ['hoy-detalle', 'horario', 'examenes', 'proximo', 'pendiente', 'racha', 'vacio'],
}

export const SLOT_COUNT = 11

export function groupOfSlot(index: number): SlotGroup {
  if (index < 4) return 'resumen'
  if (index === 4) return 'banda'
  return 'panel'
}

export const DEFAULT_DASHBOARD_SLOTS: WidgetType[] = [
  'dinero',
  'hoy-resumen',
  'tareas-resumen',
  'porvenir-resumen',
  'cuentas-atras',
  'hoy-detalle',
  'horario',
  'examenes',
  'proximo',
  'pendiente',
  'racha',
]

export function normalizeSlots(value: unknown): WidgetType[] {
  if (!Array.isArray(value) || value.length !== SLOT_COUNT) return DEFAULT_DASHBOARD_SLOTS
  return value.map((entry, index) =>
    GROUP_TYPES[groupOfSlot(index)].includes(entry) ? entry : DEFAULT_DASHBOARD_SLOTS[index],
  )
}
