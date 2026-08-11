import type { Task } from './store'
import { Empty, Icon, Label, button, card, input } from './ui'

type Props = {
  tasks: Task[]
  setTasks: (update: (prev: Task[]) => Task[]) => void
}

export function Tasks({ tasks, setTasks }: Props) {
  const pending = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  const toggle = (id: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const remove = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id))

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 sm:gap-8">
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          const form = ev.currentTarget
          const title = String(new FormData(form).get('title') ?? '').trim()
          if (!title) return
          setTasks((prev) => [{ id: crypto.randomUUID(), title, done: false }, ...prev])
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
              <Row key={t.id} task={t} onToggle={toggle} onRemove={remove} />
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section className={`${card} animate-[fade-in_0.35s_ease-out_0.05s_both] p-5 sm:p-6`}>
          <Label>Hecho · {done.length}</Label>
          <ul className="flex flex-col">
            {done.map((t) => (
              <Row key={t.id} task={t} onToggle={toggle} onRemove={remove} />
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
    </div>
  )
}

function Row({
  task,
  onToggle,
  onRemove,
}: {
  task: Task
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <li className="group flex items-center gap-3 border-b border-neutral-100 py-3 last:border-0 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => onToggle(task.id)}
        aria-pressed={task.done}
        aria-label={task.title}
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
          task.done
            ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
            : 'border-neutral-300 hover:border-neutral-500 dark:border-neutral-600'
        }`}
      >
        {task.done && <Icon name="tasks" className="h-3.5 w-3.5" />}
      </button>
      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          task.done ? 'text-neutral-400 line-through dark:text-neutral-600' : ''
        }`}
      >
        {task.title}
      </span>
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
