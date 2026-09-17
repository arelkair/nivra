import { useEffect, useRef, useState } from 'react'
import { Editor } from '../pages/Notepads'
import type { Notepad, NotepadPage } from '../lib/store'
import { Icon, card, line, select } from './ui'
import { t } from '../lib/i18n'

type Props = {
  notepads: Notepad[]
  setNotepads: (update: (prev: Notepad[]) => Notepad[]) => void
  onClose: () => void
}

const WIDTH = 400
const HEIGHT = 440

export function FloatingNote({ notepads, setNotepads, onClose }: Props) {
  const [pos, setPos] = useState(() => ({
    x: Math.max(12, innerWidth - WIDTH - 24),
    y: Math.max(12, innerHeight - HEIGHT - 24),
  }))
  const [activeId, setActiveId] = useState<string | null>(notepads[0]?.id ?? null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  const active = notepads.find((n) => n.id === activeId) ?? notepads[0]

  useEffect(() => {
    const reorder = (e: PointerEvent) => {
      if (!drag.current) return
      setPos({
        x: Math.min(Math.max(0, e.clientX - drag.current.dx), innerWidth - 120),
        y: Math.min(Math.max(0, e.clientY - drag.current.dy), innerHeight - 60),
      })
    }
    const drop = () => {
      drag.current = null
    }
    addEventListener('pointermove', reorder)
    addEventListener('pointerup', drop)
    return () => {
      removeEventListener('pointermove', reorder)
      removeEventListener('pointerup', drop)
    }
  }, [])

  const create = () => {
    const id = crypto.randomUUID()
    setNotepads((prev) => [...prev, { id, title: t('Nota rápida'), pages: [{ id: id + '-1', html: '' }] }])
    setActiveId(id)
  }

  return (
    <section
      role="dialog"
      aria-label={t('Nota flotante')}
      style={{ left: pos.x, top: pos.y, width: WIDTH, height: HEIGHT }}
      className={`${card} fixed z-30 flex flex-col overflow-hidden shadow-2xl`}
    >
      <header
        onPointerDown={(e) => {
          drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
        }}
        className={`flex shrink-0 cursor-grab flex-col gap-2 border-b px-3 py-2 active:cursor-grabbing ${line}`}
      >
        <div className="flex items-center gap-2">
          <Icon name="drag" className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-600" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium" title={active?.title}>
            {active?.title ?? t('Sin blocs todavía')}
          </span>
          <button
            type="button"
            onClick={create}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={t('Nuevo bloc')}
            className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={t('Cerrar nota flotante')}
            className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        {notepads.length > 1 && (
          <select
            value={active?.id}
            onChange={(e) => setActiveId(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={t('Bloc de notas')}
            className={`${select} h-8 w-full px-2 py-0 text-xs`}
          >
            {notepads.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </select>
        )}
      </header>

      {active ? (
        <Editor
          key={active.id}
          notepad={active}
          compacto
          onPages={(pages: NotepadPage[]) =>
            setNotepads((prev) =>
              prev.map((n) => (n.id === active.id ? { ...n, pages, html: undefined } : n)),
            )
          }
        />
      ) : (
        <button
          type="button"
          onClick={create}
          className="flex flex-1 items-center justify-center gap-2 text-sm text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
        >
          <Icon name="plus" className="h-4 w-4" />
          {t('Crear un bloc para escribir')}
        </button>
      )}
    </section>
  )
}
