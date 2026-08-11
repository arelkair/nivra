import { useState } from 'react'
import { shortDate, type SubTask, type Task } from '../lib/store'
import { Empty, Icon, Label, Modal, button, card, input } from '../components/ui'

type Props = {
  tasks: Task[]
  setTasks: (update: (prev: Task[]) => Task[]) => void
}

export function Tasks({ tasks, setTasks }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const pending = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)
  const editing = tasks.find((t) => t.id === editingId)

  const patch = (id: string, changes: Partial<Task>) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)))
  const remove = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id))

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 sm:gap-8">
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          const form = ev.currentTarget
          const title = String(new FormData(form).get('title') ?? '').trim()
          if (!title) return
          setTasks((prev) => [
            { id: crypto.randomUUID(), title, done: false, subtasks: [] },
            ...prev,
          ])
          form.reset()
        }}
        className="flex gap-2"
      >
        <input name="title" maxLength={80} required placeholder="Nueva tarea" className={input} />
        <button type="submit" aria-label="Añadir tarea" className={`${button} shrink-0 px-4`}>
          <Icon name="plus" className="h-5 w-5" />
        </button>
      </form>

      <section className={`${card} animate-[fade-in_0.35s_ease-out] p-5 sm:p-6`}>
        <Label>Pendiente · {pending.length}</Label>
        {pending.length === 0 ? (
          <Empty>Sin tareas.</Empty>
        ) : (
          <ul className="flex flex-col">
            {pending.map((t) => (
              <Row key={t.id} task={t} onPatch={patch} onRemove={remove} onOpen={setEditingId} />
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section className={`${card} animate-[fade-in_0.35s_ease-out_0.05s_both] p-5 sm:p-6`}>
          <Label>Hecho · {done.length}</Label>
          <ul className="flex flex-col">
            {done.map((t) => (
              <Row key={t.id} task={t} onPatch={patch} onRemove={remove} onOpen={setEditingId} />
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setTasks((prev) => prev.filter((t) => !t.done))}
            className="mt-4 text-xs text-neutral-400 transition-colors hover:text-red-500"
          >
            Vaciar
          </button>
        </section>
      )}

      {editing && (
        <TaskDialog
          task={editing}
          onClose={() => setEditingId(null)}
          onPatch={(changes) => patch(editing.id, changes)}
        />
      )}
    </div>
  )
}

function Row({
  task,
  onPatch,
  onRemove,
  onOpen,
}: {
  task: Task
  onPatch: (id: string, changes: Partial<Task>) => void
  onRemove: (id: string) => void
  onOpen: (id: string) => void
}) {
  const subDone = task.subtasks.filter((s) => s.done).length
  return (
    <li className="flex items-center gap-3 border-b border-black/[0.06] py-3 last:border-0 dark:border-white/[0.08]">
      <button
        type="button"
        onClick={() => onPatch(task.id, { done: !task.done })}
        aria-pressed={task.done}
        aria-label={task.title}
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
          task.done
            ? 'border-neutral-900 bg-neutral-900 text-white dark:border-black/[0.06] dark:bg-neutral-100 dark:text-neutral-900'
            : 'border-neutral-300 hover:border-neutral-500 dark:border-neutral-600'
        }`}
      >
        {task.done && <Icon name="tasks" className="h-3.5 w-3.5" />}
      </button>

      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="min-w-0 flex-1 text-left"
        title="Editar"
      >
        <span
          className={`block truncate text-sm ${
            task.done ? 'text-neutral-400 line-through dark:text-neutral-600' : ''
          }`}
        >
          {task.title}
        </span>
        <span className="mt-0.5 flex gap-2 text-[0.65rem] text-neutral-400 dark:text-neutral-500">
          {task.date && (
            <span className="rounded bg-blue-100 px-1.5 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200">
              {shortDate(task.date)}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span>
              {subDone}/{task.subtasks.length} subtareas
            </span>
          )}
          {task.desc && <span className="truncate">{task.desc}</span>}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onRemove(task.id)}
        aria-label={`Eliminar ${task.title}`}
        className="shrink-0 text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
      >
        <Icon name="trash" className="h-4 w-4" />
      </button>
    </li>
  )
}

function TaskDialog({
  task,
  onClose,
  onPatch,
}: {
  task: Task
  onClose: () => void
  onPatch: (changes: Partial<Task>) => void
}) {
  const setSubs = (subtasks: SubTask[]) => onPatch({ subtasks })

  return (
    <Modal title="Tarea" onClose={onClose}>
      <div className="flex flex-col gap-2">
        <input
          value={task.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          maxLength={80}
          aria-label="Título"
          className={input}
        />
        <textarea
          value={task.desc ?? ''}
          onChange={(e) => onPatch({ desc: e.target.value })}
          maxLength={300}
          rows={3}
          placeholder="Descripción"
          aria-label="Descripción"
          className={input}
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={task.date ?? ''}
            onChange={(e) => onPatch({ date: e.target.value || undefined })}
            aria-label="Fecha"
            className={input}
          />
          {task.date && (
            <button
              type="button"
              onClick={() => onPatch({ date: undefined })}
              className="shrink-0 text-xs text-neutral-400 transition-colors hover:text-red-500"
            >
              Quitar
            </button>
          )}
        </div>
        <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
          Con fecha aparece en el calendario como Tarea, en azul.
        </p>
      </div>

      <div className="mt-6">
        <Label>Subtareas</Label>
        {task.subtasks.length > 0 && (
          <ul className="mb-3 flex flex-col">
            {task.subtasks.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 border-b border-black/[0.06] py-2 last:border-0 dark:border-white/[0.08]"
              >
                <button
                  type="button"
                  onClick={() =>
                    setSubs(task.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))
                  }
                  aria-pressed={s.done}
                  aria-label={s.title}
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${
                    s.done
                      ? 'border-neutral-900 bg-neutral-900 text-white dark:border-black/[0.06] dark:bg-neutral-100 dark:text-neutral-900'
                      : 'border-neutral-300 dark:border-neutral-600'
                  }`}
                >
                  {s.done && <Icon name="tasks" className="h-3 w-3" />}
                </button>
                <span
                  className={`min-w-0 flex-1 truncate text-sm ${
                    s.done ? 'text-neutral-400 line-through dark:text-neutral-600' : ''
                  }`}
                >
                  {s.title}
                </span>
                <button
                  type="button"
                  onClick={() => setSubs(task.subtasks.filter((x) => x.id !== s.id))}
                  aria-label={`Eliminar ${s.title}`}
                  className="shrink-0 text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
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
            const form = ev.currentTarget
            const title = String(new FormData(form).get('sub') ?? '').trim()
            if (!title) return
            setSubs([...task.subtasks, { id: crypto.randomUUID(), title, done: false }])
            form.reset()
          }}
          className="flex gap-2"
        >
          <input name="sub" maxLength={80} required placeholder="Nueva subtarea" className={input} />
          <button type="submit" aria-label="Añadir subtarea" className={`${button} shrink-0 px-4`}>
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </form>
      </div>
    </Modal>
  )
}
