import { useState } from 'react'
import { dateKey, reorder, shortDate, textOn, type Subject, type Task } from '../../lib/store'
import { notifyWithUndo } from '../../lib/undo'
import { t, tp } from '../../lib/i18n'
import { playDrop, playPop } from '../../lib/sound'
import { Icon } from '../ui'
import { skin, type NoteRef, type Skin } from './skin'

type Props = {
  tasks: Task[]
  setTasks: (update: (prev: Task[]) => Task[]) => void
  subjects: Subject[]
  notes: NoteRef[]
  onCreateNote: (title: string) => string
  onOpenNote: (id: string) => void
  dark: boolean
}

type Filter = 'pendientes' | 'hoy' | 'proximas' | 'sin-fecha' | 'hechas'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'hoy', label: 'Hoy' },
  { id: 'proximas', label: 'Próximas' },
  { id: 'sin-fecha', label: 'Sin fecha' },
  { id: 'hechas', label: 'Hechas' },
]

export function InitiativeTasks({ tasks, setTasks, subjects, notes, onCreateNote, onOpenNote, dark }: Props) {
  const s = skin(dark)
  const todayKey = dateKey(new Date())
  const [filter, setFilter] = useState<Filter>('pendientes')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newSubject, setNewSubject] = useState('')

  const matches = (task: Task, f: Filter) => {
    if (f === 'hechas') return task.done
    if (task.done) return false
    if (f === 'pendientes') return true
    if (f === 'hoy') return !!task.date && task.date <= todayKey
    if (f === 'proximas') return !!task.date && task.date > todayKey
    return !task.date
  }

  const inSubject = (task: Task) => !subjectFilter || task.subject === subjectFilter
  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.id, tasks.filter((task) => matches(task, f.id) && inSubject(task)).length]),
  ) as Record<Filter, number>

  const visible = tasks.filter((task) => matches(task, filter) && inSubject(task))
  const ordered =
    filter === 'hoy' || filter === 'proximas'
      ? [...visible].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
      : visible

  const patch = (id: string, changes: Partial<Task>) =>
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...changes } : task)))

  const remove = (id: string) => {
    const before = tasks
    const name = tasks.find((task) => task.id === id)?.title ?? ''
    playDrop()
    setTasks((prev) => prev.filter((task) => task.id !== id))
    setOpenId(null)
    notifyWithUndo(tp('«{0}» eliminada', name), () => setTasks(() => before))
  }

  const move = (id: string, step: number) => {
    const neighbor = ordered[ordered.findIndex((task) => task.id === id) + step]
    if (!neighbor) return
    setTasks((prev) => {
      const a = prev.findIndex((task) => task.id === id)
      const b = prev.findIndex((task) => task.id === neighbor.id)
      if (a < 0 || b < 0) return prev
      const next = [...prev]
      ;[next[a], next[b]] = [next[b], next[a]]
      return next
    })
  }

  const overdue = (task: Task) => !task.done && !!task.date && task.date < todayKey

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-initiative text-3xl font-medium tracking-tight sm:text-4xl">{t('Tareas')}</h1>
        <p className={`font-mono text-xs ${s.faint}`}>
          {tp('{0} pendientes', tasks.filter((task) => !task.done).length)}
        </p>
      </div>

      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          const clean = title.trim()
          if (!clean) return
          playPop()
          setTasks((prev) => [
            {
              id: crypto.randomUUID(),
              title: clean,
              done: false,
              subtasks: [],
              date: newDate || undefined,
              subject: newSubject || undefined,
            },
            ...prev,
          ])
          setTitle('')
          setNewDate('')
        }}
        className={`flex flex-col gap-2 rounded-2xl border p-3 sm:flex-row sm:items-center ${s.line} ${s.panel}`}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder={t('Nueva tarea')}
          aria-label={t('Nueva tarea')}
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-neutral-500"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            aria-label={t('Fecha')}
            className={`${s.field} !w-auto !py-1.5 text-xs`}
          />
          {subjects.length > 0 && (
            <select
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              aria-label={t('Asignatura')}
              className={`${s.field} !w-auto !py-1.5 text-xs`}
            >
              <option value="">{t('Sin asignatura')}</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            aria-label={t('Añadir tarea')}
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors ${s.primary}`}
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`flex flex-wrap rounded-lg border p-0.5 ${s.line}`}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors ${
                filter === f.id ? s.active : `${s.muted} ${s.hoverText}`
              }`}
            >
              {t(f.label)}
              <span className={`font-mono text-[0.65rem] tabular-nums ${s.faint}`}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        {subjects.length > 0 && (
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            aria-label={t('Asignatura')}
            className={`${s.field} !w-auto !py-1.5 text-xs`}
          >
            <option value="">{t('Todas las asignaturas')}</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {ordered.length === 0 ? (
        <p className={`font-mono text-sm ${s.faint}`}>{t('Sin tareas.')}</p>
      ) : (
        <ul className={`flex flex-col divide-y overflow-hidden rounded-2xl border ${s.line} ${s.divide}`}>
          {ordered.map((task) => {
            const subject = subjects.find((x) => x.id === task.subject)
            const subDone = task.subtasks.filter((x) => x.done).length
            const open = openId === task.id
            return (
              <li key={task.id} className={open ? s.panel : ''}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!task.done) playPop()
                      patch(task.id, { done: !task.done })
                    }}
                    aria-pressed={task.done}
                    aria-label={task.title}
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
                      task.done
                        ? dark
                          ? 'border-white bg-white text-neutral-900'
                          : 'border-neutral-900 bg-neutral-900 text-white'
                        : dark
                          ? 'border-white/25 hover:border-white/60'
                          : 'border-black/25 hover:border-black/60'
                    }`}
                  >
                    {task.done && <Icon name="tasks" className="h-3 w-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : task.id)}
                    aria-expanded={open}
                    title={t('Editar')}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className={`block truncate text-sm ${task.done ? `${s.faint} line-through` : ''}`}>
                      {task.title}
                    </span>
                    {(subject || task.date || task.subtasks.length > 0 || task.notepad || task.url) && (
                      <span className={`mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.7rem] ${s.faint}`}>
                        {subject && (
                          <span
                            className="rounded px-1.5"
                            style={{ background: subject.color, color: textOn(subject.color) }}
                          >
                            {subject.name}
                          </span>
                        )}
                        {task.date && (
                          <span
                            className={`font-mono ${
                              overdue(task) ? 'text-red-500' : task.date === todayKey ? s.strong : ''
                            }`}
                          >
                            {task.date === todayKey ? t('Hoy') : shortDate(task.date)}
                            {overdue(task) && ` · ${t('vencida')}`}
                          </span>
                        )}
                        {task.subtasks.length > 0 && (
                          <span className="font-mono">
                            {subDone}/{task.subtasks.length}
                          </span>
                        )}
                        {task.notepad && <span>{t('Con bloc')}</span>}
                        {task.url && <Icon name="link" className="h-3 w-3" />}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : task.id)}
                    aria-label={t('Editar')}
                    className={`${s.muted} ${s.hoverText} shrink-0 transition-colors`}
                  >
                    <Icon name={open ? 'up' : 'down'} className="h-3.5 w-3.5" />
                  </button>
                </div>

                {open && (
                  <TaskDetail
                    task={task}
                    s={s}
                    subjects={subjects}
                    notes={notes}
                    onCreateNote={onCreateNote}
                    onOpenNote={onOpenNote}
                    onPatch={(changes) => patch(task.id, changes)}
                    onRemove={() => remove(task.id)}
                    onMove={(step) => move(task.id, step)}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}

      {filter === 'hechas' && ordered.length > 0 && (
        <button
          type="button"
          onClick={() => {
            const before = tasks
            const count = tasks.filter((task) => task.done).length
            setTasks((prev) => prev.filter((task) => !task.done))
            notifyWithUndo(tp('{0} tareas hechas eliminadas', count), () => setTasks(() => before))
          }}
          className={`self-start text-xs ${s.faint} transition-colors hover:text-red-500`}
        >
          {t('Vaciar')}
        </button>
      )}
    </div>
  )
}

function TaskDetail({
  task,
  s,
  subjects,
  notes,
  onCreateNote,
  onOpenNote,
  onPatch,
  onRemove,
  onMove,
}: {
  task: Task
  s: Skin
  subjects: Subject[]
  notes: NoteRef[]
  onCreateNote: (title: string) => string
  onOpenNote: (id: string) => void
  onPatch: (changes: Partial<Task>) => void
  onRemove: () => void
  onMove: (step: number) => void
}) {
  const [sub, setSub] = useState('')

  const createNotepad = () => onPatch({ notepad: onCreateNote(task.title) })

  const setSubs = (subtasks: Task['subtasks']) => onPatch({ subtasks })
  const label = `font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`

  return (
    <div className={`flex flex-col gap-4 border-t px-4 py-4 ${s.line}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={label}>{t('Título')}</span>
          <input
            value={task.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            maxLength={80}
            className={s.field}
          />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={label}>{t('Descripción')}</span>
          <textarea
            value={task.desc ?? ''}
            onChange={(e) => onPatch({ desc: e.target.value })}
            maxLength={300}
            rows={2}
            className={s.field}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Fecha')}</span>
          <span className="flex items-center gap-2">
            <input
              type="date"
              value={task.date ?? ''}
              onChange={(e) => onPatch({ date: e.target.value || undefined })}
              className={s.field}
            />
            {task.date && (
              <button
                type="button"
                onClick={() => onPatch({ date: undefined })}
                className={`shrink-0 text-xs ${s.faint} transition-colors hover:text-red-500`}
              >
                {t('Quitar')}
              </button>
            )}
          </span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Asignatura')}</span>
          <select
            value={task.subject ?? ''}
            onChange={(e) => onPatch({ subject: e.target.value || undefined })}
            className={s.field}
          >
            <option value="">{t('Sin asignatura')}</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Enlace')}</span>
          <input
            type="url"
            value={task.url ?? ''}
            onChange={(e) => onPatch({ url: e.target.value })}
            placeholder="https://…"
            className={s.field}
          />
          {task.url && /^https?:\/\//i.test(task.url) && (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs ${s.muted} underline ${s.hoverText}`}
            >
              {t('Abrir enlace')}
            </a>
          )}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Nota')}</span>
          <span className="flex items-center gap-2">
            <select
              value={task.notepad ?? ''}
              onChange={(e) => onPatch({ notepad: e.target.value || undefined })}
              className={s.field}
            >
              <option value="">{t('Sin nota')}</option>
              {notes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
            <button type="button" onClick={createNotepad} className={`${s.ghost} shrink-0`}>
              {t('Nuevo')}
            </button>
            {task.notepad && (
              <button type="button" onClick={() => onOpenNote(task.notepad!)} className={`${s.ghost} shrink-0`}>
                {t('Abrir')}
              </button>
            )}
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>{t('Subtareas')}</span>
        {task.subtasks.length > 0 && (
          <ul className={`flex flex-col divide-y ${s.divide}`}>
            {task.subtasks.map((x) => (
              <li key={x.id} className="flex items-center gap-3 py-2">
                <button
                  type="button"
                  onClick={() => setSubs(task.subtasks.map((y) => (y.id === x.id ? { ...y, done: !y.done } : y)))}
                  aria-pressed={x.done}
                  aria-label={x.title}
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors ${
                    x.done
                      ? s.dark
                        ? 'border-white bg-white text-neutral-900'
                        : 'border-neutral-900 bg-neutral-900 text-white'
                      : s.dark
                        ? 'border-white/25'
                        : 'border-black/25'
                  }`}
                >
                  {x.done && <Icon name="tasks" className="h-2.5 w-2.5" />}
                </button>
                <span className={`min-w-0 flex-1 truncate text-sm ${x.done ? `${s.faint} line-through` : ''}`}>
                  {x.title}
                </span>
                <button
                  type="button"
                  onClick={() => setSubs(reorder(task.subtasks, task.subtasks.findIndex((y) => y.id === x.id), -1))}
                  aria-label={`Subir ${x.title}`}
                  className={`${s.muted} ${s.hoverText}`}
                >
                  <Icon name="up" className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setSubs(reorder(task.subtasks, task.subtasks.findIndex((y) => y.id === x.id), 1))}
                  aria-label={`Bajar ${x.title}`}
                  className={`${s.muted} ${s.hoverText}`}
                >
                  <Icon name="down" className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setSubs(task.subtasks.filter((y) => y.id !== x.id))}
                  aria-label={`Eliminar ${x.title}`}
                  className={`${s.muted} hover:text-red-500`}
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          onSubmit={(ev) => {
            ev.preventDefault()
            const clean = sub.trim()
            if (!clean) return
            setSubs([...task.subtasks, { id: crypto.randomUUID(), title: clean, done: false }])
            setSub('')
          }}
          className="flex gap-2"
        >
          <input
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            maxLength={80}
            placeholder={t('Nueva subtarea')}
            aria-label={t('Nueva subtarea')}
            className={s.field}
          />
          <button type="submit" aria-label={t('Añadir subtarea')} className={s.iconButton}>
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between">
        <span className="flex gap-2">
          <button type="button" onClick={() => onMove(-1)} aria-label={`Subir ${task.title}`} className={s.iconButton}>
            <Icon name="up" className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => onMove(1)} aria-label={`Bajar ${task.title}`} className={s.iconButton}>
            <Icon name="down" className="h-3.5 w-3.5" />
          </button>
        </span>
        <button
          type="button"
          onClick={onRemove}
          className={`flex items-center gap-1.5 text-xs ${s.muted} transition-colors hover:text-red-500`}
        >
          <Icon name="trash" className="h-3.5 w-3.5" />
          {t('Eliminar')}
        </button>
      </div>
    </div>
  )
}
