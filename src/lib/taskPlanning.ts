import type { Task } from './store'

export function localDay(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
export function nextRepeat(day: string, repeat: NonNullable<Task['repeat']>) {
  const [y, m, d] = day.split('-').map(Number)
  const next = new Date(y, m - 1, d)
  if (repeat === 'monthly') { next.setDate(1); next.setMonth(next.getMonth() + 1); next.setDate(Math.min(d, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate())) }
  else next.setDate(next.getDate() + (repeat === 'weekly' ? 7 : 1))
  return localDay(next)
}
export function reconcileTasks(before: Task[], after: Task[], now = new Date()): Task[] {
  const generated: Task[] = []
  const normalized = after.map(task => {
    const old = before.find(row => row.id === task.id)
    if (!task.done) return task.completedAt ? { ...task, completedAt: undefined } : task
    if (old?.done || task.completedAt) return task
    if (task.repeat && (task.date || task.due)) {
      const next = nextRepeat(task.date || task.due!, task.repeat)
      const series = task.series || task.id
      const id = `${series}:${next}`
      if (!after.some(row => row.id === id)) generated.push({ ...task, id, series, date: task.date ? next : undefined, due: task.due ? nextRepeat(task.due, task.repeat) : undefined, done: false, completedAt: undefined, status: 'todo', subtasks: task.subtasks.map(row => ({ ...row, done: false })) })
    }
    return { ...task, status: 'done' as const, completedAt: now.toISOString() }
  })
  return [...normalized, ...generated]
}
