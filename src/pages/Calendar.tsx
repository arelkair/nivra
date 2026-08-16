import { useState } from 'react'
import {
  MONTHS,
  TYPES,
  WEEKDAYS,
  dateKey,
  isFreeDay,
  isOfficialHoliday,
  isWeekend,
  monthDay,
  monthGrid,
  type Anniversary,
  type CalItem,
  type ItemType,
  type NivraEvent,
} from '../lib/store'
import { Empty, Icon, Modal, button, input, select } from '../components/ui'

type Props = {
  items: CalItem[]
  specialDays: string[]
  setSpecialDays: (update: (prev: string[]) => string[]) => void
  autoSpecial: string[]
  subDays: number[]
  setEvents: (update: (prev: NivraEvent[]) => NivraEvent[]) => void
  freeDays: string[]
  setFreeDays: (update: (prev: string[]) => string[]) => void
  anniversaries: Anniversary[]
  setAnniversaries: (update: (prev: Anniversary[]) => Anniversary[]) => void
}

export function Calendar({
  items,
  setEvents,
  freeDays,
  setFreeDays,
  specialDays,
  setSpecialDays,
  autoSpecial,
  subDays,
  anniversaries,
  setAnniversaries,
}: Props) {
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
    'grid h-10 w-10 place-items-center rounded-xl border border-black/[0.07] text-neutral-500 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 dark:border-white/[0.08] dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-neutral-100'

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight first-letter:uppercase sm:text-3xl">
          {MONTHS[cursor.m]} <span className="text-neutral-300 dark:text-neutral-600">{cursor.y}</span>
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCursor({ y: today.getFullYear(), m: today.getMonth() })}
            className="rounded-xl border border-black/[0.07] px-4 text-sm text-neutral-500 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 dark:border-white/[0.08] dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-neutral-100"
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
          <span key={i} className={i >= 5 ? 'text-red-300 dark:text-red-500/60' : ''}>
            {d}
          </span>
        ))}
      </div>

      <div
        key={`${cursor.y}-${cursor.m}`}
        className="animate-[fade-in_0.3s_ease-out] grid grid-cols-7 gap-1 sm:gap-2"
      >
        {cells.map((day, i) => {
          if (day === null) return <span key={`empty-${i}`} />
          const key = dateKey(new Date(cursor.y, cursor.m, day))
          const dayItems = items.filter((e) => e.date === key)
          const anniversary = anniversaries.find((a) => a.md === monthDay(key))
          const free = isFreeDay(key, freeDays)
          const especial = specialDays.includes(key) || autoSpecial.includes(key)
          const haySub = subDays.includes(day)
          const isToday = key === todayKey

          const numberClass = isToday
            ? `font-semibold text-white ${
                free
                  ? 'bg-red-500'
                  : anniversary
                    ? 'bg-yellow-500'
                    : 'bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900'
              }`
            : free
              ? 'text-red-500'
              : especial
                ? 'bg-gradient-to-br from-fuchsia-500 via-amber-500 to-cyan-500 bg-clip-text text-transparent'
                : anniversary
                  ? 'text-yellow-600 dark:text-yellow-500'
                  : ''

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              aria-label={`${day} de ${MONTHS[cursor.m]}`}
              className="relative flex aspect-square flex-col items-center gap-1 rounded-xl border border-transparent p-1 transition-colors hover:border-black/[0.07] hover:bg-white sm:aspect-auto sm:min-h-24 sm:rounded-2xl sm:p-2 dark:hover:border-white/[0.08] dark:hover:bg-white/[0.04]"
            >
              {haySub && (
                <span
                  title="Ese día se renueva una suscripción"
                  className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-neutral-400 ring-2 ring-[var(--paper)] dark:bg-neutral-500"
                />
              )}
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-sm tabular-nums sm:h-8 sm:w-8 ${numberClass}`}
              >
                {day}
              </span>

              <span className="flex gap-0.5 sm:hidden">
                {anniversary && <span className="h-1 w-1 rounded-full bg-yellow-500" />}
                {dayItems.slice(0, 3).map((e) => (
                  <span key={e.id} className={`h-1 w-1 rounded-full ${TYPES[e.type].dot}`} />
                ))}
              </span>

              <span className="hidden w-full min-w-0 flex-col gap-1 sm:flex">
                {anniversary && (
                  <span className="truncate rounded-md bg-yellow-100 px-1.5 py-0.5 text-left text-[0.65rem] leading-4 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-200">
                    {anniversary.name || 'Aniversario'}
                  </span>
                )}
                {dayItems.slice(0, 2).map((e) => (
                  <span
                    key={e.id}
                    className={`truncate rounded-md px-1.5 py-0.5 text-left text-[0.65rem] leading-4 ${TYPES[e.type].chip}`}
                  >
                    {e.title}
                  </span>
                ))}
                {dayItems.length > 2 && (
                  <span className="px-1.5 text-left text-[0.6rem] text-neutral-400">
                    +{dayItems.length - 2}
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
          items={items.filter((e) => e.date === selected)}
          anniversary={anniversaries.find((a) => a.md === monthDay(selected))}
          free={isFreeDay(selected, freeDays)}
          locked={isWeekend(selected) || isOfficialHoliday(selected)}
          especial={specialDays.includes(selected) || autoSpecial.includes(selected)}
          onToggleEspecial={() =>
            setSpecialDays((prev) =>
              prev.includes(selected) ? prev.filter((d) => d !== selected) : [...prev, selected],
            )
          }
          onClose={() => setSelected(null)}
          onToggleFree={() =>
            setFreeDays((prev) =>
              prev.includes(selected) ? prev.filter((d) => d !== selected) : [...prev, selected],
            )
          }
          onToggleAnniversary={() =>
            setAnniversaries((prev) =>
              prev.some((a) => a.md === monthDay(selected))
                ? prev.filter((a) => a.md !== monthDay(selected))
                : [...prev, { id: crypto.randomUUID(), md: monthDay(selected), name: '' }],
            )
          }
          onRenameAnniversary={(name) =>
            setAnniversaries((prev) =>
              prev.map((a) => (a.md === monthDay(selected) ? { ...a, name } : a)),
            )
          }
          onAdd={(title, type, desc) =>
            setEvents((prev) => [
              ...prev,
              { id: crypto.randomUUID(), date: selected, title, type, desc: desc || undefined },
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
  items: CalItem[]
  anniversary?: Anniversary
  free: boolean
  locked: boolean
  especial: boolean
  onToggleEspecial: () => void
  onClose: () => void
  onToggleFree: () => void
  onToggleAnniversary: () => void
  onRenameAnniversary: (name: string) => void
  onAdd: (title: string, type: ItemType, desc: string) => void
  onDelete: (id: string) => void
}

function DayDialog({
  date,
  items,
  anniversary,
  free,
  locked,
  especial,
  onToggleEspecial,
  onClose,
  onToggleFree,
  onToggleAnniversary,
  onRenameAnniversary,
  onAdd,
  onDelete,
}: DialogProps) {
  const [y, m, d] = date.split('-').map(Number)
  const label = new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const square = 'grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors'

  return (
    <Modal
      title={label}
      onClose={onClose}
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggleFree}
            disabled={locked}
            aria-pressed={free}
            title={locked ? 'Festivo oficial o fin de semana' : 'Marcar como día sin trabajo'}
            aria-label="Día sin trabajo"
            className={`${square} ${
              free
                ? 'border-red-500 bg-red-500'
                : 'border-black/[0.07] hover:border-red-400 dark:border-neutral-700'
            } ${locked ? 'cursor-default opacity-70' : ''}`}
          />
          <button
            type="button"
            onClick={onToggleEspecial}
            aria-pressed={especial}
            title="Marcar como día especial"
            aria-label="Día especial"
            className={`${square} ${
              especial
                ? 'border-transparent bg-gradient-to-br from-fuchsia-500 via-amber-500 to-cyan-500 text-white'
                : 'border-black/[0.07] text-neutral-300 hover:border-fuchsia-400 dark:border-white/[0.08] dark:text-neutral-600'
            }`}
          >
            <Icon name="special" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleAnniversary}
            aria-pressed={!!anniversary}
            title="Marcar como aniversario (cada año)"
            aria-label="Aniversario"
            className={`${square} ${
              anniversary
                ? 'border-yellow-500 bg-yellow-500 text-white'
                : 'border-black/[0.07] text-neutral-300 hover:border-yellow-400 dark:border-neutral-700 dark:text-neutral-600'
            }`}
          >
            <Icon name="star" className="h-4 w-4" />
          </button>
        </div>
      }
    >
      {anniversary && (
        <input
          defaultValue={anniversary.name}
          onChange={(e) => onRenameAnniversary(e.target.value)}
          maxLength={40}
          placeholder="¿De qué o de quién es el aniversario?"
          className={`${input} mb-4 border-yellow-300 bg-yellow-50 dark:border-yellow-500/40 dark:bg-yellow-500/10`}
        />
      )}

      {items.length === 0 ? (
        <div className="mb-5">
          <Empty>Sin actividades.</Empty>
        </div>
      ) : (
        <ul className="mb-5 flex flex-col gap-2">
          {items.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-3 rounded-xl border border-black/[0.07] px-4 py-3 dark:border-white/[0.08]"
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TYPES[e.type].dot}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{e.title}</p>
                {e.desc && (
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{e.desc}</p>
                )}
                <p className="mt-1 text-[0.65rem] text-neutral-400 dark:text-neutral-500">
                  {TYPES[e.type].label}
                  {e.origin !== 'evento' && ' · desde su apartado'}
                </p>
              </div>
              {e.origin === 'evento' && (
                <button
                  type="button"
                  onClick={() => onDelete(e.id)}
                  aria-label={`Eliminar ${e.title}`}
                  className="shrink-0 text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              )}
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
          onAdd(title, String(data.get('type')) as ItemType, String(data.get('desc') ?? '').trim())
          form.reset()
        }}
        className="flex flex-col gap-2"
      >
        <input name="title" maxLength={60} required placeholder="Nueva actividad" className={input} />
        <textarea name="desc" maxLength={200} rows={2} placeholder="Descripción" className={input} />
        <div className="flex gap-2">
          <select name="type" defaultValue="festividad" className={select} aria-label="Tipo">
            {Object.entries(TYPES).map(([value, t]) => (
              <option key={value} value={value}>
                {t.label}
              </option>
            ))}
          </select>
          <button type="submit" className={`${button} shrink-0`}>
            Añadir
          </button>
        </div>
      </form>
    </Modal>
  )
}
