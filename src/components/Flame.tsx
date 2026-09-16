import { dateKey, type Streak } from '../lib/store'
import { Icon, card } from './ui'
import { t, tp } from '../lib/i18n'

const DAYS_TO_RED = 120

export function Flame({
  streak,
  setStreak,
  delay,
}: {
  streak: Streak
  setStreak: (update: (prev: Streak) => Streak) => void
  delay?: number
}) {
  const today = dateKey(new Date())
  const yesterday = dateKey(new Date(Date.now() - 86400000))
  const doneToday = streak.last === today

  const blend = Math.min(1, streak.count / DAYS_TO_RED)
  const color = `color-mix(in oklab, #9ca3af, #ef4444 ${Math.round(blend * 100)}%)`

  return (
    <section
      style={delay !== undefined ? { animationDelay: `${delay}s` } : undefined}
      className={`${card} ${delay !== undefined ? 'animate-[fade-in_0.4s_ease-out_both]' : ''} flex min-h-0 flex-col items-center justify-center gap-1 overflow-hidden p-4`}
    >
      <button
        type="button"
        disabled={doneToday}
        onClick={() =>
          setStreak((prev) => ({ count: prev.last === yesterday ? prev.count + 1 : 1, last: today }))
        }
        aria-label={doneToday ? t('Racha ya marcada hoy') : t('Marcar día')}
        title={
          doneToday
            ? tp('{0}. Ya has marcado hoy.', `${streak.count} ${t(streak.count === 1 ? 'día seguido' : 'días seguidos')}`)
            : t('Marca tu día')
        }
        className={`flex items-center gap-2 transition-transform ${
          doneToday ? 'cursor-default' : 'hover:scale-105 active:scale-95'
        }`}
        style={{ color, opacity: doneToday ? 1 : 0.55 }}
      >
        <Icon name="flame" className="h-6 w-6 shrink-0" />
        <span className="font-mono text-xl font-medium tabular-nums">{streak.count}</span>
      </button>
      <p className="truncate text-[0.55rem] tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
        {t(streak.count === 1 ? 'día seguido' : 'días seguidos')}
      </p>
    </section>
  )
}
