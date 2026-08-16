import { useEffect, useRef, useState } from 'react'
import { Editor } from '../pages/Notepads'
import type { Notepad, NotepadPage } from '../lib/store'
import { Icon, card, line, select } from './ui'

type Props = {
  notepads: Notepad[]
  setNotepads: (update: (prev: Notepad[]) => Notepad[]) => void
  onCerrar: () => void
}

const ANCHO = 380
const ALTO = 440

export function FloatingNote({ notepads, setNotepads, onCerrar }: Props) {
  const [pos, setPos] = useState(() => ({
    x: Math.max(12, innerWidth - ANCHO - 24),
    y: Math.max(12, innerHeight - ALTO - 24),
  }))
  const [activaId, setActivaId] = useState<string | null>(notepads[0]?.id ?? null)
  const arrastre = useRef<{ dx: number; dy: number } | null>(null)

  const activa = notepads.find((n) => n.id === activaId) ?? notepads[0]

  useEffect(() => {
    const mover = (e: PointerEvent) => {
      if (!arrastre.current) return
      setPos({
        x: Math.min(Math.max(0, e.clientX - arrastre.current.dx), innerWidth - 120),
        y: Math.min(Math.max(0, e.clientY - arrastre.current.dy), innerHeight - 60),
      })
    }
    const soltar = () => {
      arrastre.current = null
    }
    addEventListener('pointermove', mover)
    addEventListener('pointerup', soltar)
    return () => {
      removeEventListener('pointermove', mover)
      removeEventListener('pointerup', soltar)
    }
  }, [])

  const crear = () => {
    const id = crypto.randomUUID()
    setNotepads((prev) => [...prev, { id, title: 'Nota rápida', pages: [{ id: id + '-1', html: '' }] }])
    setActivaId(id)
  }

  return (
    <section
      role="dialog"
      aria-label="Nota flotante"
      style={{ left: pos.x, top: pos.y, width: ANCHO, height: ALTO }}
      className={`${card} fixed z-30 flex flex-col overflow-hidden shadow-2xl`}
    >
      <header
        onPointerDown={(e) => {
          arrastre.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
        }}
        className={`flex shrink-0 cursor-grab items-center gap-2 border-b px-3 py-2 active:cursor-grabbing ${line}`}
      >
        <Icon name="drag" className="h-4 w-4 shrink-0 text-neutral-300 dark:text-neutral-600" />

        {notepads.length > 0 ? (
          <select
            value={activa?.id}
            onChange={(e) => setActivaId(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Bloc de notas"
            className={`${select} h-8 min-w-0 flex-1 truncate px-2 py-0 text-xs`}
          >
            {notepads.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </select>
        ) : (
          <span className="min-w-0 flex-1 truncate text-xs text-neutral-400">Sin blocs todavía</span>
        )}

        <button
          type="button"
          onClick={crear}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Nuevo bloc"
          className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onCerrar}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Cerrar nota flotante"
          className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </header>

      {activa ? (
        <Editor
          key={activa.id}
          notepad={activa}
          compacto
          onPaginas={(pages: NotepadPage[]) =>
            setNotepads((prev) =>
              prev.map((n) => (n.id === activa.id ? { ...n, pages, html: undefined } : n)),
            )
          }
        />
      ) : (
        <button
          type="button"
          onClick={crear}
          className="flex flex-1 items-center justify-center gap-2 text-sm text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
        >
          <Icon name="plus" className="h-4 w-4" />
          Crear un bloc para escribir
        </button>
      )}
    </section>
  )
}
