import { useState } from 'react'
import {
  DEFAULT_DASHBOARD_LAYOUT,
  GRID_SIZE,
  WIDGET_LABELS,
  WIDGET_TYPES,
  areaFree,
  type DashboardCell,
  type WidgetType,
} from '../lib/dashboardLayout'
import { Icon, Modal, button, ghost, line, select } from './ui'
import { t } from '../lib/i18n'

type Props = {
  layout: DashboardCell[]
  setLayout: (update: (prev: DashboardCell[]) => DashboardCell[]) => void
  onClose: () => void
}

export function DashboardEditor({ layout, setLayout, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  const move = (id: string, dRow: number, dCol: number) => {
    setLayout((prev) => {
      const cell = prev.find((c) => c.id === id)
      if (!cell) return prev
      const row = cell.row + dRow
      const col = cell.col + dCol
      if (!areaFree(prev, id, row, col, cell.rowSpan, cell.colSpan)) return prev
      return prev.map((c) => (c.id === id ? { ...c, row, col } : c))
    })
  }

  const resize = (id: string, dRowSpan: number, dColSpan: number) => {
    setLayout((prev) => {
      const cell = prev.find((c) => c.id === id)
      if (!cell) return prev
      const rowSpan = cell.rowSpan + dRowSpan
      const colSpan = cell.colSpan + dColSpan
      if (rowSpan < 1 || colSpan < 1) return prev
      if (!areaFree(prev, id, cell.row, cell.col, rowSpan, colSpan)) return prev
      return prev.map((c) => (c.id === id ? { ...c, rowSpan, colSpan } : c))
    })
  }

  const changeType = (id: string, widgetType: WidgetType) => {
    setLayout((prev) => prev.map((c) => (c.id === id ? { ...c, type: widgetType } : c)))
  }

  const remove = (id: string) => {
    setLayout((prev) => prev.filter((c) => c.id !== id))
    setSelected(null)
  }

  const addAt = (row: number, col: number, widgetType: WidgetType) => {
    setLayout((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: widgetType, row, col, rowSpan: 1, colSpan: 1 },
    ])
  }

  const cellAt = (row: number, col: number) =>
    layout.find((c) => row >= c.row && row < c.row + c.rowSpan && col >= c.col && col < c.col + c.colSpan)

  const isOrigin = (c: DashboardCell, row: number, col: number) => c.row === row && c.col === col

  return (
    <Modal title={t('Configurar dashboard')} onClose={onClose} size="wide">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t(
            'Pulsa un bloque para moverlo o cambiar su tamaño y su contenido. Pulsa un hueco vacío para añadir uno nuevo.',
          )}
        </p>

        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 4.5rem)` }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
            const row = Math.floor(i / GRID_SIZE)
            const col = i % GRID_SIZE
            const cell = cellAt(row, col)
            if (cell && !isOrigin(cell, row, col)) return null

            if (!cell) {
              return (
                <button
                  key={`empty-${row}-${col}`}
                  type="button"
                  onClick={() => addAt(row, col, WIDGET_TYPES[0])}
                  aria-label={t('Añadir bloque')}
                  style={{ gridColumn: col + 1, gridRow: row + 1 }}
                  className={`grid place-items-center rounded-xl border border-dashed text-neutral-300 transition-colors hover:border-neutral-400 hover:text-neutral-600 dark:text-neutral-700 dark:hover:text-neutral-400 ${line}`}
                >
                  <Icon name="plus" className="h-4 w-4" />
                </button>
              )
            }

            return (
              <button
                key={cell.id}
                type="button"
                onClick={() => setSelected(selected === cell.id ? null : cell.id)}
                style={{
                  gridColumn: `${cell.col + 1} / span ${cell.colSpan}`,
                  gridRow: `${cell.row + 1} / span ${cell.rowSpan}`,
                }}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-1 text-center text-xs transition-colors ${
                  selected === cell.id
                    ? 'border-neutral-900 bg-black/[0.04] font-medium dark:border-white dark:bg-white/[0.06]'
                    : `${line} text-neutral-500 hover:bg-black/[0.03] dark:text-neutral-400 dark:hover:bg-white/[0.05]`
                }`}
              >
                {t(WIDGET_LABELS[cell.type])}
              </button>
            )
          })}
        </div>

        {selected &&
          (() => {
            const cell = layout.find((c) => c.id === selected)
            if (!cell) return null
            return (
              <div className={`flex flex-col gap-3 rounded-2xl border p-4 ${line}`}>
                <div className="flex items-center gap-2">
                  <select
                    value={cell.type}
                    onChange={(e) => changeType(cell.id, e.target.value as WidgetType)}
                    aria-label={t('Contenido')}
                    className={`${select} flex-1`}
                  >
                    {WIDGET_TYPES.map((widgetType) => (
                      <option key={widgetType} value={widgetType}>
                        {t(WIDGET_LABELS[widgetType])}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => remove(cell.id)}
                    aria-label={t('Eliminar bloque')}
                    className="shrink-0 text-neutral-400 transition-colors hover:text-red-500"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-neutral-400">{t('Mover')}</span>
                    <MiniButton onClick={() => move(cell.id, 0, -1)} icon="left" label={t('Mover a la izquierda')} />
                    <MiniButton onClick={() => move(cell.id, 0, 1)} icon="right" label={t('Mover a la derecha')} />
                    <MiniButton onClick={() => move(cell.id, -1, 0)} icon="up" label={t('Mover arriba')} />
                    <MiniButton onClick={() => move(cell.id, 1, 0)} icon="down" label={t('Mover abajo')} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-neutral-400">{t('Ancho')}</span>
                    <MiniButton onClick={() => resize(cell.id, 0, -1)} icon="minus" label={t('Menos ancho')} />
                    <MiniButton onClick={() => resize(cell.id, 0, 1)} icon="plus" label={t('Más ancho')} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-neutral-400">{t('Alto')}</span>
                    <MiniButton onClick={() => resize(cell.id, -1, 0)} icon="minus" label={t('Menos alto')} />
                    <MiniButton onClick={() => resize(cell.id, 1, 0)} icon="plus" label={t('Más alto')} />
                  </div>
                </div>
              </div>
            )
          })()}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setLayout(() => DEFAULT_DASHBOARD_LAYOUT)
              setSelected(null)
            }}
            className={`${ghost} flex-1`}
          >
            {t('Restablecer')}
          </button>
          <button type="button" onClick={onClose} className={`${button} flex-1`}>
            {t('Listo')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function MiniButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void
  icon: string
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid h-7 w-7 place-items-center rounded-lg border text-neutral-500 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-white ${line}`}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
    </button>
  )
}
