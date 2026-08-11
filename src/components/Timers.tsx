import { useEffect, useState } from 'react'
import { UNITS, countdown, progress, type Timer, type Unit } from '../lib/store'
import { Icon, Label, Modal, Switch, button, card, input, line } from './ui'

type Props = {
  timers: Timer[]
  setTimers: (update: (prev: Timer[]) => Timer[]) => void
}

const DEFAULT_UNITS: Record<Unit, boolean> = {
  years: false,
  months: false,
  weeks: false,
  days: true,
  hours: true,
  minutes: true,
  seconds: true,
}

export function Timers({ timers, setTimers }: Props) {
  const [now, setNow] = useState(() => new Date())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const editing = timers.find((t) => t.id === editingId)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const [big, ...small] = timers

  return (
    <div className="flex flex-col gap-4">
      {big ? (
        <Card timer={big} now={now} big onEdit={() => setEditingId(big.id)} />
      ) : (
        <Hueco big onClick={() => setCreating(true)} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) =>
          small[i] ? (
            <Card key={small[i].id} timer={small[i]} now={now} onEdit={() => setEditingId(small[i].id)} />
          ) : (
            <Hueco key={i} onClick={() => setCreating(true)} />
          ),
        )}
      </div>

      {(creating || editing) && (
        <TimerDialog
          timer={editing}
          onClose={() => {
            setCreating(false)
            setEditingId(null)
          }}
          onSave={(t) => {
            setTimers((prev) =>
              editing ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t].slice(0, 3),
            )
            setCreating(false)
            setEditingId(null)
          }}
          onDelete={
            editing
              ? () => {
                  setTimers((prev) => prev.filter((x) => x.id !== editing.id))
                  setEditingId(null)
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

function Hueco({ big, onClick }: { big?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl border border-dashed text-sm text-neutral-400 transition-colors hover:border-neutral-400 hover:text-neutral-900 ${line} ${
        big ? 'py-10' : 'py-8'
      } dark:hover:text-white`}
    >
      <Icon name="plus" className="h-4 w-4" />
      Nuevo temporizador
    </button>
  )
}

function Card({
  timer,
  now,
  big,
  onEdit,
}: {
  timer: Timer
  now: Date
  big?: boolean
  onEdit: () => void
}) {
  const target = new Date(timer.target)
  const parts = countdown(now, target, timer.units)
  const pct = progress(timer.created, timer.target, now)
  const acabado = target.getTime() <= now.getTime()

  return (
    <section className={`${card} ${big ? 'p-5 sm:p-6' : 'p-4 sm:p-5'}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`truncate font-semibold ${big ? 'text-xl sm:text-2xl' : 'text-sm'}`}>
            {timer.title}
          </h3>
          {timer.subtitle && (
            <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">{timer.subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${timer.title}`}
          className="shrink-0 text-neutral-300 transition-colors hover:text-neutral-900 dark:text-neutral-600 dark:hover:text-white"
        >
          <Icon name="settings" className="h-4 w-4" />
        </button>
      </div>

      {acabado ? (
        <p className={`font-mono font-medium ${big ? 'text-3xl' : 'text-lg'}`}>Se acabó</p>
      ) : (
        <div className={`flex flex-wrap ${big ? 'gap-4 sm:gap-6' : 'gap-3'}`}>
          {parts.map((p) => (
            <div key={p.unit}>
              <p
                className={`font-mono font-medium tabular-nums ${big ? 'text-3xl sm:text-4xl' : 'text-lg'}`}
              >
                {p.value}
              </p>
              <p className="text-[0.6rem] tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                {p.label}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className={`mt-4 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]`}>
        <div
          className="h-full rounded-full bg-neutral-900 transition-[width] duration-1000 dark:bg-white"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <p className="mt-1.5 flex justify-between font-mono text-[0.6rem] text-neutral-400">
        <span>{Math.round(pct * 100)}%</span>
        <span>
          {target.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}{' '}
          {target.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </p>
    </section>
  )
}

function TimerDialog({
  timer,
  onClose,
  onSave,
  onDelete,
}: {
  timer?: Timer
  onClose: () => void
  onSave: (t: Timer) => void
  onDelete?: () => void
}) {
  const [units, setUnits] = useState<Record<Unit, boolean>>(timer?.units ?? DEFAULT_UNITS)

  return (
    <Modal title={timer ? 'Temporizador' : 'Nuevo temporizador'} onClose={onClose}>
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          const data = new FormData(ev.currentTarget)
          const title = String(data.get('title') ?? '').trim()
          const date = String(data.get('date') ?? '')
          const time = String(data.get('time') ?? '') || '00:00'
          if (!title || !date) return
          onSave({
            id: timer?.id ?? crypto.randomUUID(),
            title,
            subtitle: String(data.get('subtitle') ?? '').trim() || undefined,
            target: `${date}T${time}`,
            created: timer?.created ?? new Date().toISOString(),
            units,
          })
        }}
        className="flex flex-col gap-2"
      >
        <input
          name="title"
          defaultValue={timer?.title}
          maxLength={40}
          required
          placeholder="Título"
          className={input}
        />
        <input
          name="subtitle"
          defaultValue={timer?.subtitle}
          maxLength={60}
          placeholder="Subtítulo"
          className={input}
        />
        <div className="flex gap-2">
          <input
            name="date"
            type="date"
            defaultValue={timer?.target.slice(0, 10)}
            required
            aria-label="Día del final"
            className={input}
          />
          <input
            name="time"
            type="time"
            defaultValue={timer?.target.slice(11, 16) || '00:00'}
            aria-label="Hora del final"
            className={input}
          />
        </div>

        <div className={`mt-2 divide-y ${line}`}>
          <Label>Unidades</Label>
          {UNITS.map((u) => (
            <Switch
              key={u.id}
              checked={units[u.id]}
              onChange={(v) => setUnits((prev) => ({ ...prev, [u.id]: v }))}
              label={u.many[0].toUpperCase() + u.many.slice(1)}
            />
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-xl px-4 py-2.5 text-sm text-neutral-400 transition-colors hover:text-red-500"
            >
              Eliminar
            </button>
          )}
          <button type="submit" className={`${button} ml-auto`}>
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  )
}
