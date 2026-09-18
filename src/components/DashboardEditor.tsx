import { useState } from 'react'
import {
  DEFAULT_DASHBOARD_SLOTS,
  GROUP_TYPES,
  WIDGET_LABELS,
  groupOfSlot,
  normalizeSlots,
  type WidgetType,
} from '../lib/dashboardLayout'
import { Modal, button, ghost, line, select } from './ui'
import { t } from '../lib/i18n'

type Props = {
  slots: WidgetType[]
  setSlots: (update: (prev: WidgetType[]) => WidgetType[]) => void
  onClose: () => void
}

export function DashboardEditor({ slots, setSlots, onClose }: Props) {
  const list = normalizeSlots(slots)
  const [selected, setSelected] = useState<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const swap = (from: number, to: number) => {
    if (from === to || groupOfSlot(from) !== groupOfSlot(to)) return
    setSlots((prev) => {
      const next = [...normalizeSlots(prev)]
      ;[next[from], next[to]] = [next[to], next[from]]
      return next
    })
    setSelected(to)
  }

  const change = (index: number, type: WidgetType) => {
    setSlots((prev) => normalizeSlots(prev).map((entry, i) => (i === index ? type : entry)))
  }

  const slot = (index: number, heightClass: string) => {
    const type = list[index]
    const canDrop =
      dragIndex !== null && dragIndex !== index && groupOfSlot(dragIndex) === groupOfSlot(index)
    return (
      <button
        key={index}
        type="button"
        draggable
        onClick={() => setSelected(selected === index ? null : index)}
        onDragStart={(e) => {
          setDragIndex(index)
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', String(index))
        }}
        onDragOver={(e) => {
          if (canDrop) {
            e.preventDefault()
            setOverIndex(index)
          }
        }}
        onDragLeave={() => setOverIndex((prev) => (prev === index ? null : prev))}
        onDrop={(e) => {
          e.preventDefault()
          if (dragIndex !== null) swap(dragIndex, index)
          setDragIndex(null)
          setOverIndex(null)
        }}
        onDragEnd={() => {
          setDragIndex(null)
          setOverIndex(null)
        }}
        className={`${heightClass} flex cursor-grab items-center justify-center rounded-xl border px-2 text-center text-xs transition-colors active:cursor-grabbing ${
          overIndex === index
            ? 'border-neutral-900 bg-black/[0.06] dark:border-white dark:bg-white/[0.1]'
            : selected === index
              ? 'border-neutral-900 bg-black/[0.04] font-medium dark:border-white dark:bg-white/[0.06]'
              : `${line} text-neutral-500 hover:bg-black/[0.03] dark:text-neutral-400 dark:hover:bg-white/[0.05] ${
                  type === 'vacio' ? 'border-dashed' : ''
                }`
        } ${dragIndex === index ? 'opacity-40' : ''}`}
      >
        {t(WIDGET_LABELS[type])}
      </button>
    )
  }

  return (
    <Modal title={t('Configurar dashboard')} onClose={onClose} size="wide">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t(
            'Arrastra un bloque sobre otro para intercambiarlos de sitio. Pulsa un bloque para cambiar su contenido.',
          )}
        </p>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-4 gap-2">{[0, 1, 2, 3].map((i) => slot(i, 'h-14'))}</div>
          <div className="grid grid-cols-1">{slot(4, 'h-14')}</div>
          <div className="grid grid-cols-3 gap-2">{[5, 6, 7, 8, 9, 10].map((i) => slot(i, 'h-20'))}</div>
        </div>

        {selected !== null && (
          <div className={`flex items-center gap-3 rounded-2xl border p-4 ${line}`}>
            <span className="shrink-0 text-xs text-neutral-400">{t('Contenido')}</span>
            <select
              value={list[selected]}
              onChange={(e) => change(selected, e.target.value as WidgetType)}
              aria-label={t('Contenido')}
              className={`${select} flex-1`}
            >
              {GROUP_TYPES[groupOfSlot(selected)].map((type) => (
                <option key={type} value={type}>
                  {t(WIDGET_LABELS[type])}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setSlots(() => DEFAULT_DASHBOARD_SLOTS)
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
