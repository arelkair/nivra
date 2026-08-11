import { useEffect, useState } from 'react'
import { UNITS, countdown, progress, type Countdown, type Unit } from '../lib/store'
import { Empty, Icon, Label, Modal, Switch, button, card, input, line } from './ui'

type Props = {
  countdowns: Countdown[]
  setCountdowns: (update: (prev: Countdown[]) => Countdown[]) => void
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

export function Countdowns({ countdowns, setCountdowns }: Props) {
  const [now, setNow] = useState(() => new Date())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const editing = countdowns.find((c) => c.id === editingId)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <section className={`${card} p-5 sm:p-6`}>
      <div className="flex items-center justify-between gap-2">
        <Label>Cuentas atrás</Label>
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label="Nueva cuenta atrás"
          className={`-mt-3 grid h-7 w-7 place-items-center rounded-lg border text-neutral-400 transition-colors hover:text-neutral-900 ${line} dark:hover:text-white`}
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
        </button>
      </div>

      {countdowns.length === 0 ? (
        <Empty>Sin cuentas atrás.</Empty>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {countdowns.map((c) => (
            <Card key={c.id} item={c} now={now} onEdit={() => setEditingId(c.id)} />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <CountdownDialog
          item={editing}
          onClose={() => {
            setCreating(false)
            setEditingId(null)
          }}
          onSave={(c) => {
            setCountdowns((prev) => (editing ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c]))
            setCreating(false)
            setEditingId(null)
          }}
          onDelete={
            editing
              ? () => {
                  setCountdowns((prev) => prev.filter((x) => x.id !== editing.id))
                  setEditingId(null)
                }
              : undefined
          }
        />
      )}
    </section>
  )
}

function Card({ item, now, onEdit }: { item: Countdown; now: Date; onEdit: () => void }) {
  const target = new Date(item.target)
  const parts = countdown(now, target, item.units)
  const pct = progress(item.created, item.target, now)
  const acabado = target.getTime() <= now.getTime()

  return (
    <div className={`shrink-0 rounded-xl border p-3 ${line}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.title}</p>
          {item.subtitle && (
            <p className="truncate text-[0.7rem] text-neutral-400 dark:text-neutral-500">
              {item.subtitle}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${item.title}`}
          className="shrink-0 text-neutral-300 transition-colors hover:text-neutral-900 dark:text-neutral-600 dark:hover:text-white"
        >
          <Icon name="settings" className="h-3.5 w-3.5" />
        </button>
      </div>

      {acabado ? (
        <p className="mt-1 font-mono text-lg font-medium">Se acabó</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {parts.map((p) => (
            <div key={p.unit} className="flex items-baseline gap-1">
              <span className="font-mono text-lg font-medium tabular-nums">{p.value}</span>
              <span className="text-[0.6rem] text-neutral-400 dark:text-neutral-500">{p.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-neutral-900 transition-[width] duration-1000 dark:bg-white"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  )
}

function CountdownDialog({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item?: Countdown
  onClose: () => void
  onSave: (c: Countdown) => void
  onDelete?: () => void
}) {
  const [units, setUnits] = useState<Record<Unit, boolean>>(item?.units ?? DEFAULT_UNITS)

  return (
    <Modal title={item ? 'Cuenta atrás' : 'Nueva cuenta atrás'} onClose={onClose}>
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          const data = new FormData(ev.currentTarget)
          const title = String(data.get('title') ?? '').trim()
          const date = String(data.get('date') ?? '')
          const time = String(data.get('time') ?? '') || '00:00'
          if (!title || !date) return
          onSave({
            id: item?.id ?? crypto.randomUUID(),
            title,
            subtitle: String(data.get('subtitle') ?? '').trim() || undefined,
            target: `${date}T${time}`,
            created: item?.created ?? new Date().toISOString(),
            units,
          })
        }}
        className="flex flex-col gap-2"
      >
        <input
          name="title"
          defaultValue={item?.title}
          maxLength={40}
          required
          placeholder="Título"
          className={input}
        />
        <input
          name="subtitle"
          defaultValue={item?.subtitle}
          maxLength={60}
          placeholder="Subtítulo"
          className={input}
        />
        <div className="flex gap-2">
          <input
            name="date"
            type="date"
            defaultValue={item?.target.slice(0, 10)}
            required
            aria-label="Día del final"
            className={input}
          />
          <input
            name="time"
            type="time"
            defaultValue={item?.target.slice(11, 16) || '00:00'}
            aria-label="Hora del final"
            className={input}
          />
        </div>

        <div className="mt-2">
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
