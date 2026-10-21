export type Badge = { id: string; title: string; description: string; earned: boolean }
export function achievements(tasks: { done: boolean }[], notes: unknown[], streak: { count: number; last: string }, today: string): Badge[] {
  const completed = tasks.filter(task => task.done).length
  const yesterday = new Date(`${today}T12:00:00`); yesterday.setDate(yesterday.getDate() - 1)
  const previous = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
  const activeStreak = streak.last === today || streak.last === previous
  return [
    { id: 'first-task', title: 'Primer paso', description: 'Completa tu primera tarea.', earned: completed >= 1 },
    { id: 'ten-tasks', title: 'En marcha', description: 'Completa 10 tareas.', earned: completed >= 10 },
    { id: 'three-notes', title: 'Ideas conectadas', description: 'Crea 3 notas en tu bóveda.', earned: notes.length >= 3 },
    { id: 'week-streak', title: 'Una semana contigo', description: 'Mantén una racha de 7 días.', earned: activeStreak && streak.count >= 7 },
  ]
}
