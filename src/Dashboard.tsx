import { MONTHS, dateKey, weekIndex, type Block, type NivraEvent, type Task } from './store'
import { Empty, Icon, Label, card } from './ui'

// ponytail: las claves YYYY-MM-DD ordenan cronológicamente como texto, no hace falta parsear
const byDate = (a: NivraEvent, b: NivraEvent) =>
  `${a.date}${a.time ?? '99:99'}`.localeCompare(`${b.date}${b.time ?? '99:99'}`)

type Props = {
  events: NivraEvent[]
  tasks: Task[]
  blocks: Block[]
  onGo: (page: 'calendario' | 'horario' | 'tareas') => void
}

export function Dashboard({ events, tasks, blocks, onGo }: Props) {
  const today = new Date()
  const todayKey = dateKey(today)
  const todayEvents = events.filter((e) => e.date === todayKey).sort(byDate)
  const upcoming = events
    .filter((e) => e.date > todayKey)
    .sort(byDate)
    .slice(0, 5)
  const pending = tasks.filter((t) => !t.done)
  const todayBlocks = blocks
    .filter((b) => b.day === weekIndex(today))
    .sort((a, b) => a.start.localeCompare(b.start))

  const stats = [
    { n: todayEvents.length, label: 'eventos hoy', page: 'calendario' as const },
    { n: pending.length, label: 'tareas abiertas', page: 'tareas' as const },
    { n: todayBlocks.length, label: 'bloques hoy', page: 'horario' as const },
  ]

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 sm:gap-8">
      <header className="animate-[fade-in_0.4s_ease-out]">
        <p className="text-sm text-neutral-400 first-letter:uppercase dark:text-neutral-500">
          {today.toLocaleDateString('es-ES', { weekday: 'long' })}
        </p>
        <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {today.getDate()} de {MONTHS[today.getMonth()]}
        </h2>
      </header>

      <div className="animate-[fade-in_0.4s_ease-out_0.05s_both] grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onGo(s.page)}
            className={`${card} px-3 py-4 text-left transition-colors hover:border-neutral-300 sm:px-5 sm:py-6 dark:hover:border-neutral-700`}
          >
            <p className="text-2xl font-semibold tabular-nums sm:text-4xl">{s.n}</p>
            <p className="mt-1 text-[0.7rem] text-neutral-400 sm:text-xs dark:text-neutral-500">
              {s.label}
            </p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <section className={`${card} animate-[fade-in_0.4s_ease-out_0.1s_both] p-5 sm:p-6`}>
          <Label>Hoy</Label>
          {todayEvents.length === 0 ? (
            <Empty>Sin eventos.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {todayEvents.map((e) => (
                <li key={e.id} className="flex items-baseline gap-3 text-sm">
                  <span className="w-11 shrink-0 tabular-nums text-neutral-400 dark:text-neutral-500">
                    {e.time ?? '—'}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{e.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} animate-[fade-in_0.4s_ease-out_0.15s_both] p-5 sm:p-6`}>
          <Label>Horario</Label>
          {todayBlocks.length === 0 ? (
            <Empty>Sin bloques.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {todayBlocks.map((b) => (
                <li key={b.id} className="flex items-baseline gap-3 text-sm">
                  <span className="w-24 shrink-0 tabular-nums text-neutral-400 dark:text-neutral-500">
                    {b.start}–{b.end}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{b.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} animate-[fade-in_0.4s_ease-out_0.2s_both] p-5 sm:p-6`}>
          <Label>Próximo</Label>
          {upcoming.length === 0 ? (
            <Empty>Sin eventos.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {upcoming.map((e) => {
                const [, m, d] = e.date.split('-').map(Number)
                return (
                  <li key={e.id} className="flex items-baseline gap-3 text-sm">
                    <span className="w-11 shrink-0 tabular-nums text-neutral-400 dark:text-neutral-500">
                      {d} {MONTHS[m - 1].slice(0, 3)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{e.title}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className={`${card} animate-[fade-in_0.4s_ease-out_0.25s_both] p-5 sm:p-6`}>
          <Label>Pendiente</Label>
          {pending.length === 0 ? (
            <Empty>Sin tareas.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {pending.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center gap-3 text-sm">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                </li>
              ))}
            </ul>
          )}
          {pending.length > 5 && (
            <button
              type="button"
              onClick={() => onGo('tareas')}
              className="mt-4 flex items-center gap-1 text-xs text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              {pending.length - 5} más <Icon name="right" className="h-3 w-3" />
            </button>
          )}
        </section>
      </div>
    </div>
  )
}
