import { useState } from 'react'
import { DAYS, weekIndex, type Block } from './store'
import { Empty, Icon, Modal, button, card, input } from './ui'

type Props = {
  blocks: Block[]
  setBlocks: (update: (prev: Block[]) => Block[]) => void
}

export function Schedule({ blocks, setBlocks }: Props) {
  const [adding, setAdding] = useState<number | null>(null)
  const todayIndex = weekIndex(new Date())

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {DAYS.map((day, i) => {
          const dayBlocks = blocks
            .filter((b) => b.day === i)
            .sort((a, b) => a.start.localeCompare(b.start))
          return (
            <section
              key={day}
              style={{ animationDelay: `${i * 0.04}s` }}
              className={`${card} animate-[fade-in_0.35s_ease-out_both] flex flex-col p-4`}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3
                  className={`text-sm font-semibold ${
                    i === todayIndex ? '' : 'text-neutral-400 dark:text-neutral-500'
                  }`}
                >
                  {day}
                </h3>
                {i === todayIndex && (
                  <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[0.6rem] font-medium text-white dark:bg-neutral-100 dark:text-neutral-900">
                    hoy
                  </span>
                )}
              </div>

              <ul className="flex flex-1 flex-col gap-2">
                {dayBlocks.length === 0 ? (
                  <Empty>Vacío.</Empty>
                ) : (
                  dayBlocks.map((b) => (
                    <li
                      key={b.id}
                      className="group rounded-xl bg-stone-100 px-3 py-2.5 dark:bg-neutral-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[0.7rem] tabular-nums text-neutral-500 dark:text-neutral-400">
                          {b.start}–{b.end}
                        </span>
                        <button
                          type="button"
                          onClick={() => setBlocks((prev) => prev.filter((x) => x.id !== b.id))}
                          aria-label={`Eliminar ${b.title}`}
                          className="text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
                        >
                          <Icon name="trash" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-0.5 truncate text-sm">{b.title}</p>
                    </li>
                  ))
                )}
              </ul>

              <button
                type="button"
                onClick={() => setAdding(i)}
                aria-label={`Añadir bloque el ${day}`}
                className="mt-3 flex items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-200 py-2 text-xs text-neutral-400 transition-colors hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:hover:border-neutral-500 dark:hover:text-neutral-100"
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
              </button>
            </section>
          )
        })}
      </div>

      {adding !== null && (
        <Modal title={DAYS[adding]} onClose={() => setAdding(null)}>
          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              const form = ev.currentTarget
              const data = new FormData(form)
              const title = String(data.get('title') ?? '').trim()
              const a = String(data.get('start') ?? '')
              const b = String(data.get('end') ?? '')
              if (!title || !a || !b) return
              // ponytail: si el usuario los invierte, se ordenan solos en vez de fallar
              const [start, end] = a <= b ? [a, b] : [b, a]
              setBlocks((prev) => [...prev, { id: crypto.randomUUID(), day: adding, start, end, title }])
              setAdding(null)
            }}
            className="flex flex-col gap-2"
          >
            <input name="title" maxLength={60} required placeholder="Asignatura o bloque" className={input} />
            <div className="flex gap-2">
              <input name="start" type="time" required aria-label="Inicio" className={input} />
              <input name="end" type="time" required aria-label="Fin" className={input} />
            </div>
            <button type="submit" className={`${button} mt-2`}>
              Añadir
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
