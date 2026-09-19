import { useState } from 'react'
import { dateKey, shortDate, type Reminder, type Work } from '../lib/store'
import { notifyWithUndo } from '../lib/undo'
import { Empty, Icon, Label, Modal, button, card, input, select } from '../components/ui'
import { t, tp } from '../lib/i18n'
import { playDrop, playPop } from '../lib/sound'

type Props = {
  reminders: Reminder[]
  setReminders: (update: (prev: Reminder[]) => Reminder[]) => void
  works: Work[]
}

export function Reminders({ reminders, setReminders, works }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const editing = reminders.find((r) => r.id === editingId)
  const sorted = [...reminders].sort((a, b) =>
    `${a.date}T${a.time ?? '00:00'}`.localeCompare(`${b.date}T${b.time ?? '00:00'}`),
  )
  const todayKey = dateKey(new Date())

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <button type="button" onClick={() => setCreating(true)} className={`${button} w-fit`}>
        <span className="flex items-center gap-2">
          <Icon name="plus" className="h-4 w-4" />
          {t('Nuevo recordatorio')}
        </span>
      </button>

      <section className={`${card} animate-[fade-in_0.35s_ease-out] p-5 sm:p-6`}>
        <Label>
          {t('Recordatorios')} · {reminders.length}
        </Label>
        {sorted.length === 0 ? (
          <Empty>{t('Sin recordatorios.')}</Empty>
        ) : (
          <ul className="flex flex-col">
            {sorted.map((r) => {
              const work = works.find((w) => w.id === r.work)
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 border-b border-black/[0.06] py-3 last:border-0 dark:border-white/[0.08]"
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      r.date === todayKey ? 'bg-red-500' : 'bg-neutral-300 dark:bg-neutral-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setEditingId(r.id)}
                    className="min-w-0 flex-1 text-left"
                    title={t('Editar')}
                  >
                    <span className="block truncate text-sm">{r.title}</span>
                    {(r.subtitle || work) && (
                      <span className="block truncate text-[0.7rem] text-neutral-400 dark:text-neutral-500">
                        {[r.subtitle, work?.title].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </button>
                  <span className="shrink-0 whitespace-nowrap font-mono text-[0.7rem] text-neutral-400">
                    {shortDate(r.date)}
                    {r.time ? ` · ${r.time}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      playDrop()
                      const before = reminders
                      setReminders((prev) => prev.filter((x) => x.id !== r.id))
                      notifyWithUndo(tp('«{0}» eliminado', r.title), () => setReminders(() => before))
                    }}
                    aria-label={`Eliminar ${r.title}`}
                    className="shrink-0 text-neutral-500 transition-colors hover:text-red-500 dark:text-neutral-500"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {(creating || editing) && (
        <ReminderDialog
          reminder={editing}
          works={works}
          onClose={() => {
            setCreating(false)
            setEditingId(null)
          }}
          onSave={(r) => {
            if (!editing) playPop()
            setReminders((prev) => (editing ? prev.map((x) => (x.id === r.id ? r : x)) : [...prev, r]))
            setCreating(false)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

function ReminderDialog({
  reminder,
  works,
  onClose,
  onSave,
}: {
  reminder?: Reminder
  works: Work[]
  onClose: () => void
  onSave: (r: Reminder) => void
}) {
  return (
    <Modal title={reminder ? t('Recordatorio') : t('Nuevo recordatorio')} onClose={onClose}>
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          const data = new FormData(ev.currentTarget)
          const title = String(data.get('title') ?? '').trim()
          const date = String(data.get('date') ?? '')
          if (!title || !date) return
          onSave({
            id: reminder?.id ?? crypto.randomUUID(),
            title,
            subtitle: String(data.get('subtitle') ?? '').trim() || undefined,
            date,
            time: String(data.get('time') ?? '') || undefined,
            work: String(data.get('work') ?? '') || undefined,
          })
        }}
        className="flex flex-col gap-2"
      >
        <input
          name="title"
          defaultValue={reminder?.title}
          maxLength={60}
          required
          autoFocus
          placeholder={t('¿Qué hay que recordar?')}
          className={input}
        />
        <input
          name="subtitle"
          defaultValue={reminder?.subtitle}
          maxLength={80}
          placeholder={t('Subtítulo (opcional)')}
          className={input}
        />
        <div className="flex gap-2">
          <input
            name="date"
            type="date"
            defaultValue={reminder?.date ?? dateKey(new Date())}
            required
            aria-label={t('Fecha')}
            className={input}
          />
          <input
            name="time"
            type="time"
            defaultValue={reminder?.time}
            aria-label={t('Hora')}
            className={input}
          />
        </div>
        {works.length > 0 && (
          <select name="work" defaultValue={reminder?.work ?? ''} aria-label={t('Vincular a')} className={select}>
            <option value="">{t('Sin vincular')}</option>
            {works.map((w) => (
              <option key={w.id} value={w.id}>
                {w.kind === 'examen' ? t('Examen') : t('Proyecto')} · {w.title}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className={`${button} mt-2`}>
          {t('Guardar')}
        </button>
      </form>
    </Modal>
  )
}
