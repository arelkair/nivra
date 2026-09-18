import { useEffect, useState } from 'react'
import { Icon } from './ui'
import { InitiativeSettings } from './InitiativeSettings'
import { t } from '../lib/i18n'
import { useStored, dateKey, type CalItem, type Countdown, type Streak, type Task, type Work } from '../lib/store'

type Props = {
  tasks: Task[]
  items: CalItem[]
  countdowns: Countdown[]
  works: Work[]
  streak: Streak
  onDisable: () => void
}

function daysUntil(target: string) {
  const ms = new Date(target).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86400000))
}

function capitalizeFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

type Section = 'inicio' | 'calendario' | 'tareas'

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Inicio', icon: 'dashboard' },
  { id: 'calendario', label: 'Calendario', icon: 'calendar' },
  { id: 'tareas', label: 'Tareas', icon: 'tasks' },
]

export function InitiativeDashboard({ tasks, items, countdowns, works, streak, onDisable }: Props) {
  const [now, setNow] = useState(() => new Date())
  const [theme, setTheme] = useStored<'light' | 'dark'>('nivra-initiative-theme', 'light')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [section, setSection] = useState<Section>('inicio')

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const todayKey = dateKey(now)
  const pendingTasks = tasks.filter((task) => !task.done).length
  const todayItems = items.filter((item) => item.date === todayKey).length
  const nextCountdown = [...countdowns].sort(
    (a, b) => new Date(a.target).getTime() - new Date(b.target).getTime(),
  )[0]
  const nextWork = [...works]
    .filter((w) => w.date && w.date >= todayKey)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))[0]

  const stats = [
    { label: t('Tareas pendientes'), value: String(pendingTasks) },
    { label: t('Hoy'), value: String(todayItems) },
    { label: t('Racha'), value: `${streak.count}d` },
    {
      label: t('Próxima cuenta atrás'),
      value: nextCountdown ? `${daysUntil(nextCountdown.target)}d` : '—',
      hint: nextCountdown?.title,
    },
  ]

  const dark = theme === 'dark'
  const dateLabel = capitalizeFirst(
    now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  )

  return (
    <div
      className={`relative z-10 flex h-svh flex-col overflow-hidden transition-colors ${
        dark ? 'bg-neutral-950 text-neutral-100' : 'bg-stone-50 text-neutral-900'
      }`}
    >
      <aside
        className={`fixed inset-y-0 left-0 z-10 flex w-56 flex-col gap-1 border-r px-3 py-4 ${
          dark ? 'border-white/10' : 'border-black/[0.07]'
        }`}
      >
        <span className="font-initiative mb-6 px-2 text-lg font-medium tracking-tight">Initiative</span>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            aria-current={section === s.id}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
              section === s.id
                ? dark
                  ? 'bg-white/10 font-medium text-white'
                  : 'bg-black/[0.06] font-medium text-neutral-900'
                : dark
                  ? 'text-neutral-500 hover:bg-white/5 hover:text-neutral-200'
                  : 'text-neutral-500 hover:bg-black/[0.03] hover:text-neutral-900'
            }`}
          >
            <Icon name={s.icon} className="h-[17px] w-[17px] shrink-0" />
            {t(s.label)}
          </button>
        ))}
      </aside>

      <header className="relative z-10 flex shrink-0 items-center justify-end gap-2 py-4 pr-5 pl-56 sm:pr-8">
        <button
          type="button"
          onClick={() => setTheme(dark ? 'light' : 'dark')}
          aria-label={dark ? t('Tema claro') : t('Tema oscuro')}
          className={`grid h-10 w-10 place-items-center rounded-xl border transition-colors ${
            dark
              ? 'border-white/10 text-neutral-400 hover:bg-white/5 hover:text-white'
              : 'border-black/[0.07] text-neutral-500 hover:bg-black/[0.03] hover:text-neutral-900'
          }`}
        >
          <Icon name={dark ? 'sun' : 'moon'} className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label={t('Ajustes')}
          className={`grid h-10 w-10 place-items-center rounded-xl border transition-colors ${
            dark
              ? 'border-white/10 text-neutral-400 hover:bg-white/5 hover:text-white'
              : 'border-black/[0.07] text-neutral-500 hover:bg-black/[0.03] hover:text-neutral-900'
          }`}
        >
          <Icon name="settings" className="h-[18px] w-[18px]" />
        </button>
      </header>

      {section === 'calendario' && (
        <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto py-6 pr-5 pl-56 sm:pr-8">
          <InitiativeCalendar items={items} dark={dark} />
        </main>
      )}

      {section === 'tareas' && (
        <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto py-6 pr-5 pl-56 sm:pr-8">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-2 py-20 text-center">
            <p className="font-mono text-sm text-neutral-400">{t('Próximamente en Initiative.')}</p>
          </div>
        </main>
      )}

      {section === 'inicio' && (
      <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto py-6 pr-5 pl-56 sm:pr-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
          <div className="animate-[fade-in_0.7s_cubic-bezier(.16,1,.3,1)_both] flex flex-col gap-1">
            <p className="font-initiative text-[clamp(2.7rem,10vw,5rem)] leading-none font-medium tabular-nums">
              {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className={`font-mono text-sm ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>{dateLabel}</p>
          </div>

          <div
            className={`animate-[fade-in_0.6s_cubic-bezier(.16,1,.3,1)_0.15s_both] flex flex-wrap divide-x overflow-hidden rounded-2xl border ${
              dark ? 'divide-white/10 border-white/10' : 'divide-black/[0.07] border-black/[0.07]'
            }`}
          >
            {stats.map((s) => (
              <div key={s.label} className="flex min-w-[7.5rem] flex-1 flex-col gap-1.5 px-4 py-4">
                <span className="font-mono text-2xl font-semibold tabular-nums">{s.value}</span>
                <span className={`text-[0.65rem] tracking-wide uppercase ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  {s.label}
                </span>
                {s.hint && (
                  <span className={`truncate text-xs ${dark ? 'text-neutral-600' : 'text-neutral-400'}`}>{s.hint}</span>
                )}
              </div>
            ))}
          </div>

          <div
            style={{ animationDelay: '0.3s' }}
            className={`animate-[fade-in_0.6s_cubic-bezier(.16,1,.3,1)_both] rounded-2xl border border-dashed p-6 text-center ${
              dark ? 'border-white/15' : 'border-neutral-300'
            }`}
          >
            <p className={`font-mono text-sm ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {t(
                'Más funciones de Initiative llegarán pronto, pues sigue en fase temprana de desarrollo.',
              )}
            </p>
            {nextWork && (
              <p className={`mt-2 font-mono text-xs ${dark ? 'text-neutral-600' : 'text-neutral-400'}`}>
                {t('Próximo')}: {nextWork.title}
              </p>
            )}
          </div>
        </div>
      </main>
      )}

      {settingsOpen && <InitiativeSettings onClose={() => setSettingsOpen(false)} onDisable={onDisable} />}
    </div>
  )
}

function InitiativeCalendar({ items, dark }: { items: CalItem[]; dark: boolean }) {
  const todayKey = dateKey(new Date())
  const upcoming = [...items].filter((i) => i.date >= todayKey).sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="font-initiative text-2xl font-medium">{t('Calendario')}</h1>
      {upcoming.length === 0 ? (
        <p className="font-mono text-sm text-neutral-400">{t('Nada por venir.')}</p>
      ) : (
        <ul className={`flex flex-col divide-y overflow-hidden rounded-2xl border ${dark ? 'divide-white/10 border-white/10' : 'divide-black/[0.07] border-black/[0.07]'}`}>
          {upcoming.slice(0, 30).map((i) => (
            <li key={i.id} className="flex items-center gap-4 px-4 py-3">
              <span className="w-20 shrink-0 font-mono text-xs tabular-nums text-neutral-400">
                {new Date(i.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{i.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
