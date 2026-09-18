import { Fragment } from 'react'
import {
  TYPES,
  blockProfile,
  dateKey,
  eur,
  itemsOfDay,
  upcomingItems,
  shortDate,
  weekIndex,
  type Block,
  type CalItem,
  type Countdown,
  type PageId,
  type Reminder,
  type Streak,
  type Task,
  type Work,
} from '../lib/store'
import { Countdowns } from '../components/Countdowns'
import { Flame } from '../components/Flame'
import { Empty, Icon, Label, card, line } from '../components/ui'
import { locale, t } from '../lib/i18n'
import { normalizeSlots, type WidgetType } from '../lib/dashboardLayout'

type Props = {
  items: CalItem[]
  tasks: Task[]
  blocks: Block[]
  works: Work[]
  balance: number | null
  bankEnabled: boolean
  countdowns: Countdown[]
  setCountdowns: (update: (prev: Countdown[]) => Countdown[]) => void
  remindersHoy: Reminder[]
  streak: Streak
  setStreak: (update: (prev: Streak) => Streak) => void
  profile: string
  onGo: (page: PageId) => void
  slots: WidgetType[]
}

export function Dashboard({
  items,
  tasks,
  blocks,
  works,
  balance,
  bankEnabled,
  countdowns,
  setCountdowns,
  remindersHoy,
  streak,
  setStreak,
  profile,
  onGo,
  slots,
}: Props) {
  const today = new Date()
  const todayKey = dateKey(today)
  const todayItems = itemsOfDay(items, todayKey)
  const upcoming = upcomingItems(items, today, 60).slice(0, 5)
  const pending = tasks.filter((t) => !t.done)
  const todayBlocks = blocks
    .filter((b) => b.day === weekIndex(today) && blockProfile(b) === profile)
    .sort((a, b) => a.start.localeCompare(b.start))
  const nextWorks = works
    .filter((w) => w.date && w.date >= todayKey)
    .sort((a, b) => a.date!.localeCompare(b.date!))
    .slice(0, 5)

  const list = normalizeSlots(slots)

  const widgetContent = (widgetType: WidgetType, delay: number) => {
    switch (widgetType) {
      case 'dinero':
        return (
          <StatTile
            value={bankEnabled ? (balance === null ? '—' : eur(balance)) : '—'}
            label={t('dinero')}
            onClick={() => onGo('banco')}
            delay={delay}
          />
        )
      case 'hoy-resumen':
        return (
          <StatTile value={todayItems.length} label={t('hoy')} onClick={() => onGo('calendario')} delay={delay} />
        )
      case 'tareas-resumen':
        return (
          <StatTile value={pending.length} label={t('tareas')} onClick={() => onGo('tareas')} delay={delay} />
        )
      case 'porvenir-resumen':
        return (
          <StatTile
            value={nextWorks.length}
            label={t('por venir')}
            onClick={() => onGo('examenes')}
            delay={delay}
          />
        )
      case 'cuentas-atras':
        return (
          <Countdowns countdowns={countdowns} setCountdowns={setCountdowns} />
        )
      case 'hoy-detalle':
        return (
          <Panel title={t('Hoy')} delay={delay}>
            {todayItems.length === 0 ? (
              <Empty>{t('Sin actividades.')}</Empty>
            ) : (
              <ul className="flex flex-col">
                {todayItems.map((e) => (
                  <Row key={e.id}>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPES[e.type].dot}`} />
                    <span className="min-w-0 flex-1 truncate">{e.title}</span>
                    <span className="shrink-0 text-[0.7rem] text-neutral-400">{t(TYPES[e.type].label)}</span>
                  </Row>
                ))}
              </ul>
            )}
          </Panel>
        )
      case 'horario':
        return (
          <Panel title={t('Horario')} delay={delay}>
            {todayBlocks.length === 0 ? (
              <Empty>{t('Sin bloques.')}</Empty>
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
        )
      case 'examenes':
        return (
          <Panel title={t('Exámenes y proyectos')} delay={delay}>
            {nextWorks.length === 0 ? (
              <Empty>{t('Nada por venir.')}</Empty>
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
        )
      case 'proximo':
        return (
          <Panel title={t('Próximo')} delay={delay}>
            {upcoming.length === 0 ? (
              <Empty>{t('Sin actividades.')}</Empty>
            ) : (
              <ul className="flex flex-col">
                {upcoming.map(({ date, item }) => (
                  <Row key={item.id + date}>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPES[item.type].dot}`} />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    <span className="shrink-0 font-mono text-[0.7rem] text-neutral-400">{shortDate(date)}</span>
                  </Row>
                ))}
              </ul>
            )}
          </Panel>
        )
      case 'pendiente':
        return (
          <Panel title={t('Pendiente')} delay={delay}>
            {pending.length === 0 ? (
              <Empty>{t('Sin tareas.')}</Empty>
            ) : (
              <ul className="flex flex-col">
                {pending.slice(0, 5).map((task) => (
                  <Row key={task.id}>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                    <span className="min-w-0 flex-1 truncate">{task.title}</span>
                    {task.date && (
                      <span className="shrink-0 font-mono text-[0.7rem] text-neutral-400">
                        {shortDate(task.date)}
                      </span>
                    )}
                  </Row>
                ))}
              </ul>
            )}
          </Panel>
        )
      case 'racha':
        return <Flame streak={streak} setStreak={setStreak} delay={delay} />
      default:
        return <div />
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 lg:h-full lg:min-h-0">
      {remindersHoy.length > 0 && (
        <div className="animate-[fade-in_0.4s_ease-out] flex shrink-0 flex-col gap-2">
          {remindersHoy.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onGo('recordatorios')}
              className={`${card} flex w-full items-start gap-3 border-l-4 !border-l-neutral-900 p-4 text-left dark:!border-l-white`}
            >
              <Icon name="bell" className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.title}</p>
                {r.subtitle && (
                  <p className="truncate text-[0.7rem] text-neutral-400 dark:text-neutral-500">
                    {r.subtitle}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <header className="animate-[fade-in_0.4s_ease-out] shrink-0">
        <p className="text-sm text-neutral-400 first-letter:uppercase dark:text-neutral-500">
          {today.toLocaleDateString(locale(), { weekday: 'long' })}
        </p>
        <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {today.toLocaleDateString(locale(), { day: 'numeric', month: 'long' })}
        </h2>
      </header>

      <div className="animate-[fade-in_0.4s_ease-out_0.05s_both] grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {list.slice(0, 4).map((type, i) => (
          <Fragment key={i}>{widgetContent(type, 0.05 + i * 0.04)}</Fragment>
        ))}
      </div>

      {list[4] !== 'vacio' && (
        <div className="animate-[fade-in_0.4s_ease-out_0.08s_both] lg:max-h-[30%] lg:shrink-0 lg:overflow-y-auto lg:overscroll-contain">
          {widgetContent(list[4], 0)}
        </div>
      )}

      <div className="grid gap-4 sm:gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-3 xl:grid-cols-3 xl:grid-rows-2">
        {list.slice(5).map((type, i) => (
          <Fragment key={i}>{widgetContent(type, 0.1 + i * 0.05)}</Fragment>
        ))}
      </div>
    </div>
  )
}

function StatTile({
  value,
  label,
  onClick,
  delay,
}: {
  value: string | number
  label: string
  onClick: () => void
  delay: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${delay}s` }}
      className={`${card} px-4 py-4 text-left transition-colors hover:border-black/15 sm:px-5 sm:py-6 dark:hover:border-white/20`}
    >
      <p className="truncate font-mono text-xl font-medium tracking-tight tabular-nums sm:text-3xl">{value}</p>
      <p className="mt-1 text-[0.7rem] text-neutral-400 sm:text-xs dark:text-neutral-500">{label}</p>
    </button>
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
      className={`${card} animate-[fade-in_0.4s_ease-out_both] flex min-h-0 flex-col p-5 sm:p-6`}
    >
      <Label>{title}</Label>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </section>
  )
}
