import { useState } from 'react'
import { MONTHS, WEEKDAYS, dateKey, monthGrid, type NivraEvent } from './store'
import { Empty, Icon, Modal, button, input } from './ui'

type Props = {
  events: NivraEvent[]
  setEvents: (update: (prev: NivraEvent[]) => NivraEvent[]) => void
}

export function Calendar({ events, setEvents }: Props) {
  const today = new Date()
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [selected, setSelected] = useState<string | null>(null)

  const cells = monthGrid(cursor.y, cursor.m)
  const todayKey = dateKey(today)
  const move = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  const navButton =
    'grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight first-letter:uppercase sm:text-3xl">
          {MONTHS[cursor.m]}{' '}
          <span className="text-neutral-300 dark:text-neutral-600">{cursor.y}</span>
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCursor({ y: today.getFullYear(), m: today.getMonth() })}
            className="rounded-xl border border-neutral-200 px-4 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            Hoy
          </button>
          <button type="button" onClick={() => move(-1)} aria-label="Mes anterior" className={navButton}>
            <Icon name="left" className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => move(1)} aria-label="Mes siguiente" className={navButton}>
            <Icon name="right" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 text-center text-[0.7rem] font-semibold tracking-wider text-neutral-300 dark:text-neutral-600">
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div
        key={`${cursor.y}-${cursor.m}`}
        className="animate-[fade-in_0.3s_ease-out] grid grid-cols-7 gap-1 sm:gap-2"
      >
        {cells.map((day, i) => {
          if (day === null) return <span key={`empty-${i}`} />
          const key = dateKey(new Date(cursor.y, cursor.m, day))
          const dayEvents = events.filter((e) => e.date === key)
          const isToday = key === todayKey
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              aria-label={`${day} de ${MONTHS[cursor.m]}`}
              className="flex aspect-square flex-col items-center gap-1 rounded-xl border border-transparent p-1 transition-colors hover:border-neutral-200 hover:bg-white sm:aspect-auto sm:min-h-24 sm:rounded-2xl sm:p-2 dark:hover:border-neutral-800 dark:hover:bg-neutral-900"
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm tabular-nums transition-colors sm:h-8 sm:w-8 ${
                  isToday
                    ? 'bg-neutral-900 font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900'
                    : ''
                }`}
              >
                {day}
              </span>

              <span className="flex gap-0.5 sm:hidden">
                {dayEvents.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className="h-1 w-1 rounded-full bg-neutral-400 dark:bg-neutral-500"
                  />
                ))}
              </span>

              <span className="hidden w-full min-w-0 flex-col gap-1 sm:flex">
                {dayEvents.slice(0, 2).map((e) => (
                  <span
                    key={e.id}
                    className="truncate rounded-md bg-stone-100 px-1.5 py-0.5 text-left text-[0.65rem] leading-4 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {e.title}
                  </span>
                ))}
                {dayEvents.length > 2 && (
                  <span className="px-1.5 text-left text-[0.6rem] text-neutral-400">
                    +{dayEvents.length - 2}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {selected && (
        <DayDialog
          key={selected}
          date={selected}
          events={events.filter((e) => e.date === selected)}
          onClose={() => setSelected(null)}
          onAdd={(title, time) =>
            setEvents((prev) => [
              ...prev,
              { id: crypto.randomUUID(), date: selected, title, time: time || undefined },
            ])
          }
          onDelete={(id) => setEvents((prev) => prev.filter((e) => e.id !== id))}
        />
      )}
    </div>
  )
}

type DialogProps = {
  date: string
  events: NivraEvent[]
  onClose: () => void
  onAdd: (title: string, time: string) => void
  onDelete: (id: string) => void
}

function DayDialog({ date, events, onClose, onAdd, onDelete }: DialogProps) {
  const [y, m, d] = date.split('-').map(Number)
  const label = new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <Modal title={label} onClose={onClose}>
      {events.length === 0 ? (
        <div className="mb-5">
          <Empty>Sin eventos.</Empty>
        </div>
      ) : (
        <ul className="mb-5 flex flex-col gap-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800"
            >
              <span className="w-11 shrink-0 text-sm tabular-nums text-neutral-400 dark:text-neutral-500">
                {e.time ?? '—'}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{e.title}</span>
              <button
                type="button"
                onClick={() => onDelete(e.id)}
                aria-label={`Eliminar ${e.title}`}
                className="shrink-0 text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          const form = ev.currentTarget
          const data = new FormData(form)
          const title = String(data.get('title') ?? '').trim()
          if (!title) return
          onAdd(title, String(data.get('time') ?? ''))
          form.reset()
        }}
        className="flex flex-col gap-2"
      >
        <input name="title" maxLength={60} required placeholder="Nuevo evento" className={input} />
        <div className="flex gap-2">
          <input name="time" type="time" aria-label="Hora" className={`${input} w-auto flex-1`} />
          <button type="submit" className={button}>
            Añadir
          </button>
        </div>
      </form>
    </Modal>
  )
}
