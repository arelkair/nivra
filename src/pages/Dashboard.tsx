import {
  MONTHS,
  TYPES,
  dateKey,
  eur,
  shortDate,
  weekIndex,
  type Block,
  type CalItem,
  type PageId,
  type Task,
  type Work,
} from '../lib/store'
import { Empty, Label, card, line } from '../components/ui'

type Props = {
  items: CalItem[]
  tasks: Task[]
  blocks: Block[]
  works: Work[]
  balance: number | null
  onGo: (page: PageId) => void
}

export function Dashboard({ items, tasks, blocks, works, balance, onGo }: Props) {
  const today = new Date()
  const todayKey = dateKey(today)
  const todayItems = items.filter((e) => e.date === todayKey)
  const upcoming = items
    .filter((e) => e.date > todayKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
  const pending = tasks.filter((t) => !t.done)
  const todayBlocks = blocks
    .filter((b) => b.day === weekIndex(today))
    .sort((a, b) => a.start.localeCompare(b.start))
  const nextWorks = works
    .filter((w) => w.date && w.date >= todayKey)
    .sort((a, b) => a.date!.localeCompare(b.date!))
    .slice(0, 5)

  const stats = [
    { value: balance === null ? '—' : eur(balance), label: 'dinero', page: 'banco' as PageId },
    { value: todayItems.length, label: 'hoy', page: 'calendario' as PageId },
    { value: pending.length, label: 'tareas', page: 'tareas' as PageId },
    { value: nextWorks.length, label: 'por venir', page: 'examenes' as PageId },
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

      <div className="animate-[fade-in_0.4s_ease-out_0.05s_both] grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onGo(s.page)}
            className={`${card} px-4 py-4 text-left transition-colors hover:border-black/15 sm:px-5 sm:py-6 dark:hover:border-white/20`}
          >
            <p className="truncate font-mono text-xl font-medium tracking-tight tabular-nums sm:text-3xl">
              {s.value}
            </p>
            <p className="mt-1 text-[0.7rem] text-neutral-400 sm:text-xs dark:text-neutral-500">
              {s.label}
            </p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Panel title="Hoy" delay={0.1}>
          {todayItems.length === 0 ? (
            <Empty>Sin actividades.</Empty>
          ) : (
            <ul className="flex flex-col">
              {todayItems.map((e) => (
                <Row key={e.id}>
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPES[e.type].dot}`} />
                  <span className="min-w-0 flex-1 truncate">{e.title}</span>
                  <span className="shrink-0 text-[0.7rem] text-neutral-400">{TYPES[e.type].label}</span>
                </Row>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Horario" delay={0.15}>
          {todayBlocks.length === 0 ? (
            <Empty>Sin bloques.</Empty>
          ) : (
            <ul className="flex flex-col">
              {todayBlocks.map((b) => (
                <Row key={b.id}>
                  <span className="w-24 shrink-0 font-mono text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
                    {b.start}–{b.end}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{b.title}</span>
                </Row>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Exámenes y proyectos" delay={0.2}>
          {nextWorks.length === 0 ? (
            <Empty>Nada por venir.</Empty>
          ) : (
            <ul className="flex flex-col">
              {nextWorks.map((w) => (
                <Row key={w.id}>
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPES[w.kind].dot}`} />
                  <span className="min-w-0 flex-1 truncate">{w.title}</span>
                  <span className="shrink-0 font-mono text-[0.7rem] text-neutral-400">
                    {shortDate(w.date!)}
                  </span>
                </Row>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Próximo" delay={0.25}>
          {upcoming.length === 0 ? (
            <Empty>Sin actividades.</Empty>
          ) : (
            <ul className="flex flex-col">
              {upcoming.map((e) => (
                <Row key={e.id}>
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPES[e.type].dot}`} />
                  <span className="min-w-0 flex-1 truncate">{e.title}</span>
                  <span className="shrink-0 font-mono text-[0.7rem] text-neutral-400">
                    {shortDate(e.date)}
                  </span>
                </Row>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Pendiente" delay={0.3}>
          {pending.length === 0 ? (
            <Empty>Sin tareas.</Empty>
          ) : (
            <ul className="flex flex-col">
              {pending.slice(0, 5).map((t) => (
                <Row key={t.id}>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  {t.date && (
                    <span className="shrink-0 font-mono text-[0.7rem] text-neutral-400">
                      {shortDate(t.date)}
                    </span>
                  )}
                </Row>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-3 border-b py-2.5 text-sm last:border-0 ${line}`}>
      {children}
    </li>
  )
}

function Panel({
  title,
  delay,
  children,
}: {
  title: string
  delay: number
  children: React.ReactNode
}) {
  return (
    <section
      style={{ animationDelay: `${delay}s` }}
      className={`${card} animate-[fade-in_0.4s_ease-out_both] p-5 sm:p-6`}
    >
      <Label>{title}</Label>
      {children}
    </section>
  )
}
