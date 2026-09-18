export type WidgetType =
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

export type DashboardCell = {
  id: string
  type: WidgetType
  row: number
  col: number
  rowSpan: number
  colSpan: number
}

export const GRID_SIZE = 4

export const WIDGET_LABELS: Record<WidgetType, string> = {
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

export const WIDGET_TYPES = Object.keys(WIDGET_LABELS) as WidgetType[]

export const DEFAULT_DASHBOARD_LAYOUT: DashboardCell[] = [
  { id: 'dinero', type: 'dinero', row: 0, col: 0, rowSpan: 1, colSpan: 1 },
  { id: 'hoy-resumen', type: 'hoy-resumen', row: 0, col: 1, rowSpan: 1, colSpan: 1 },
  { id: 'tareas-resumen', type: 'tareas-resumen', row: 0, col: 2, rowSpan: 1, colSpan: 1 },
  { id: 'porvenir-resumen', type: 'porvenir-resumen', row: 0, col: 3, rowSpan: 1, colSpan: 1 },
  { id: 'cuentas-atras', type: 'cuentas-atras', row: 1, col: 0, rowSpan: 1, colSpan: 4 },
  { id: 'hoy-detalle', type: 'hoy-detalle', row: 2, col: 0, rowSpan: 1, colSpan: 2 },
  { id: 'horario', type: 'horario', row: 2, col: 2, rowSpan: 1, colSpan: 2 },
  { id: 'examenes', type: 'examenes', row: 3, col: 0, rowSpan: 1, colSpan: 1 },
  { id: 'proximo', type: 'proximo', row: 3, col: 1, rowSpan: 1, colSpan: 1 },
  { id: 'pendiente', type: 'pendiente', row: 3, col: 2, rowSpan: 1, colSpan: 1 },
  { id: 'racha', type: 'racha', row: 3, col: 3, rowSpan: 1, colSpan: 1 },
]

export function buildOccupancy(cells: DashboardCell[], ignoreId?: string) {
  const grid: (string | null)[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null),
  )
  for (const cell of cells) {
    if (cell.id === ignoreId) continue
    for (let r = cell.row; r < cell.row + cell.rowSpan; r++) {
      for (let c = cell.col; c < cell.col + cell.colSpan; c++) {
        if (r < GRID_SIZE && c < GRID_SIZE) grid[r][c] = cell.id
      }
    }
  }
  return grid
}

export function areaFree(
  cells: DashboardCell[],
  ignoreId: string | undefined,
  row: number,
  col: number,
  rowSpan: number,
  colSpan: number,
) {
  if (row < 0 || col < 0 || row + rowSpan > GRID_SIZE || col + colSpan > GRID_SIZE) return false
  const grid = buildOccupancy(cells, ignoreId)
  for (let r = row; r < row + rowSpan; r++) {
    for (let c = col; c < col + colSpan; c++) {
      if (grid[r][c] !== null) return false
    }
  }
  return true
}

export function firstFreeCell(cells: DashboardCell[]): { row: number; col: number } | null {
  const grid = buildOccupancy(cells)
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === null) return { row: r, col: c }
    }
  }
  return null
}
