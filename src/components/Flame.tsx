import { dateKey, type Streak } from '../lib/store'
import { Icon, card } from './ui'

const DIAS_HASTA_ROJO = 120

export function Flame({
  streak,
  setStreak,
}: {
  streak: Streak
  setStreak: (update: (prev: Streak) => Streak) => void
}) {
  const hoy = dateKey(new Date())
  const ayer = dateKey(new Date(Date.now() - 86400000))
  const yaHoy = streak.last === hoy

  const mezcla = Math.min(1, streak.count / DIAS_HASTA_ROJO)
  const color = `color-mix(in oklab, #9ca3af, #ef4444 ${Math.round(mezcla * 100)}%)`

  return (
    <section className={`${card} flex flex-col items-center justify-center gap-2 p-5 sm:p-6`}>
      <button
        type="button"
        disabled={yaHoy}
        onClick={() =>
          setStreak((prev) => ({ count: prev.last === ayer ? prev.count + 1 : 1, last: hoy }))
        }
        aria-label={yaHoy ? 'Racha ya marcada hoy' : 'Marcar día'}
        title={yaHoy ? 'Ya has marcado hoy' : 'Marca tu día'}
        className={`transition-transform ${yaHoy ? 'cursor-default' : 'hover:scale-110 active:scale-95'}`}
        style={{ color, opacity: yaHoy ? 1 : 0.55 }}
      >
        <Icon name="flame" className="h-10 w-10" />
      </button>
      <p className="font-mono text-2xl font-medium tabular-nums" style={{ color }}>
        {streak.count}
      </p>
      <p className="text-[0.65rem] tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
        {streak.count === 1 ? 'día seguido' : 'días seguidos'}
      </p>
    </section>
  )
}
