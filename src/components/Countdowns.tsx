import { useEffect, useState } from 'react'
import { UNITS, countdown, progress, type Countdown, type Unit } from '../lib/store'
import { Empty, Icon, Label, Modal, Switch, button, card, input, line } from './ui'
import { locale, t } from '../lib/i18n'

type Props = {
  countdowns: Countdown[]
  setCountdowns: (update: (prev: Countdown[]) => Countdown[]) => void
}

const pad2 = (n: number) => String(n).padStart(2, '0')

const dateOf = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const timeOf = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date()
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

const shortDateTime = (iso: string) =>
  `${new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })} ${timeOf(iso)}`

const DEFAULT_UNITS: Record<Unit, boolean> = {
  years: false,
  months: false,
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
        <Label>{t('Cuenta atrás')}</Label>
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label={t('Nueva cuenta atrás')}
          className={`-mt-3 grid h-7 w-7 place-items-center rounded-lg border text-neutral-400 transition-colors hover:text-neutral-900 ${line} dark:hover:text-white`}
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
        </button>
      </div>

      {countdowns.length === 0 ? (
        <Empty>{t('Sin cuenta atrás.')}</Empty>
      ) : (
        <div className="flex flex-col gap-2">
          <Card item={countdowns[0]} now={now} big onEdit={() => setEditingId(countdowns[0].id)} />
          {countdowns.length > 1 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {countdowns.slice(1).map((c) => (
                <Card key={c.id} item={c} now={now} onEdit={() => setEditingId(c.id)} />
              ))}
            </div>
          )}
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

function Card({
  item,
  now,
  big,
  onEdit,
}: {
  item: Countdown
  now: Date
  big?: boolean
  onEdit: () => void
}) {
  const target = new Date(item.target)
  const parts = countdown(now, target, item.units)
  const pct = progress(item.created, item.target, now)
  const finished = target.getTime() <= now.getTime()

  return (
    <div className={`shrink-0 rounded-xl border ${big ? 'p-4' : 'p-3'} ${line}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`truncate font-medium ${big ? 'text-base' : 'text-sm'}`}>{item.title}</p>
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

      {finished ? (
        <p className={`mt-1 font-mono font-medium ${big ? 'text-2xl' : 'text-lg'}`}>{t('Se acabó')}</p>
      ) : (
        <div className={`mt-1.5 flex flex-wrap gap-y-1 ${big ? 'gap-x-5' : 'gap-x-3'}`}>
          {parts.map((p) => (
            <div key={p.unit} className="flex items-baseline gap-1">
              <span
                className={`font-mono font-medium tabular-nums ${big ? 'text-2xl sm:text-3xl' : 'text-lg'}`}
              >
                {p.value}
              </span>
              <span className="text-[0.6rem] text-neutral-400 dark:text-neutral-500">{t(p.label)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-neutral-700 transition-[width] duration-1000 dark:bg-white"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <p className="mt-1 flex justify-between gap-2 font-mono text-[0.6rem] text-neutral-400">
        <span>{Math.round(pct * 100)}%</span>
        <span className="truncate">
          {shortDateTime(item.created)} → {shortDateTime(item.target)}
        </span>
      </p>
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
          const from = `${data.get('startDate')}T${String(data.get('startTime') || '00:00')}`
          const to = `${data.get('date')}T${String(data.get('time') || '00:00')}`
          if (!title || !data.get('startDate') || !data.get('date')) return
          const [created, target] = from <= to ? [from, to] : [to, from]
          onSave({
            id: item?.id ?? crypto.randomUUID(),
            title,
            subtitle: String(data.get('subtitle') ?? '').trim() || undefined,
            target,
            created,
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
          placeholder={t('Título')}
          className={input}
        />
        <input
          name="subtitle"
          defaultValue={item?.subtitle}
          maxLength={60}
          placeholder={t('Subtítulo')}
          className={input}
        />
        <div className="mt-2">
          <Label>{t('Empieza')}</Label>
          <div className="flex gap-2">
            <input
              name="startDate"
              type="date"
              defaultValue={dateOf(item?.created)}
              required
              aria-label={t('Día de inicio')}
              className={input}
            />
            <input
              name="startTime"
              type="time"
              defaultValue={timeOf(item?.created)}
              aria-label={t('Hora de inicio')}
              className={input}
            />
          </div>
        </div>

        <div className="mt-2">
          <Label>{t('Acaba')}</Label>
          <div className="flex gap-2">
            <input
              name="date"
              type="date"
              defaultValue={dateOf(item?.target)}
              required
              aria-label={t('Día del final')}
              className={input}
            />
            <input
              name="time"
              type="time"
              defaultValue={timeOf(item?.target)}
              aria-label={t('Hora del final')}
              className={input}
            />
          </div>
        </div>

        <div className="mt-2">
          <Label>{t('Unidades')}</Label>
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
              {t('Eliminar')}
            </button>
          )}
          <button type="submit" className={`${button} ml-auto`}>
            {t('Guardar')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
