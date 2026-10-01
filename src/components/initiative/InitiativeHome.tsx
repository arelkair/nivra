import { useState } from 'react'
import {
  blockProfile,
  dateKey,
  eur,
  itemsOfDay,
  monthDay,
  shortDate,
  textOn,
  weekIndex,
  type Anniversary,
  type Block,
  type CalItem,
  type Countdown,
  type Grade,
  type Movement,
  type Streak,
  type Subject,
  type Subscription,
  type Task,
  type Work,
  taskWhen,
} from '../../lib/store'
import { locale, t, tp } from '../../lib/i18n'
import { playPop } from '../../lib/sound'
import { Icon } from '../ui'
import { daysLeft, relativeDays } from './dates'
import { nextRenewal } from './moneyCalc'
import { formatSpan, toMin } from './scheduleLayout'
import { InitiativeCountdowns } from './InitiativeCountdowns'
import { Panel } from './panel'
import { DOT, gradeTone, skin } from './skin'

export type HomeSection = 'inicio' | 'calendario' | 'horario' | 'tareas' | 'examenes' | 'notas' | 'banco' | 'suscripciones'

type Props = {
  now: Date
  dark: boolean
  items: CalItem[]
  tasks: Task[]
  setTasks: (update: (prev: Task[]) => Task[]) => void
  works: Work[]
  countdowns: Countdown[]
  setCountdowns: (update: (prev: Countdown[]) => Countdown[]) => void
  userName: string
  streak: Streak
  setStreak: (update: (prev: Streak) => Streak) => void
  subjects: Subject[]
  grades: Grade[]
  blocks: Block[]
  anniversaries: Anniversary[]
  profile: string
  subs: Subscription[]
  bank: { balance: number; movements: Movement[] } | null
  onOpen: (section: HomeSection) => void
}

const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1)

export function InitiativeHome({
  now,
  dark,
  items,
  tasks,
  setTasks,
  works,
  countdowns,
  setCountdowns,
  userName,
  streak,
  setStreak,
  subjects,
  grades,
  blocks,
  anniversaries,
  profile,
  subs,
  bank,
  onOpen,
}: Props) {
  const s = skin(dark)
  const [quick, setQuick] = useState('')
  const todayKey = dateKey(now)
  const yesterdayKey = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const hour = now.getHours()
  const greeting = hour < 6 ? t('Buenas noches') : hour < 13 ? t('Buenos días') : hour < 21 ? t('Buenas tardes') : t('Buenas noches')

  const todayItems = itemsOfDay(items, todayKey).filter((e) => e.origin !== 'tarea')
  const todayAnniversaries = anniversaries.filter((a) => a.md === monthDay(todayKey))
  const pending = tasks.filter((task) => !task.done)
  const overdue = pending.filter((task) => taskWhen(task) && taskWhen(task)! < todayKey)
  const dueToday = pending.filter((task) => taskWhen(task) === todayKey)
  const dayTasks = [...overdue, ...dueToday]
  const focus = pending
    .filter((task) => !dayTasks.includes(task))
    .sort((a, b) => (taskWhen(a) ?? '9999').localeCompare(taskWhen(b) ?? '9999'))

  const todayBlocks = blocks
    .filter((b) => b.day === weekIndex(now) && blockProfile(b) === profile)
    .sort((a, b) => a.start.localeCompare(b.start))
  const currentBlock = todayBlocks.find((b) => toMin(b.start) <= nowMin && nowMin < toMin(b.end))
  const nextBlock = todayBlocks.find((b) => toMin(b.start) > nowMin)

  const upcomingWorks = works
    .filter((w) => w.date && w.date >= todayKey)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  const nextWork = upcomingWorks[0]

  const streakAlive = streak.last === todayKey || streak.last === yesterdayKey
  const streakCount = streakAlive ? streak.count : 0
  const streakDone = streak.last === todayKey

  const gradeAvg = grades.length ? grades.reduce((a, g) => a + g.value, 0) / grades.length : null
  const bySubject = subjects
    .map((sub) => {
      const list = grades.filter((g) => g.subject === sub.id)
      return { sub, count: list.length, avg: list.length ? list.reduce((a, g) => a + g.value, 0) / list.length : 0 }
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)

  const renewals = subs
    .filter((x) => !x.paused)
    .map((x) => ({ sub: x, next: nextRenewal(x.day, now) }))
    .sort((a, b) => a.next.days - b.next.days)

  const monthKey = todayKey.slice(0, 7)
  const monthNet = bank
    ? bank.movements.filter((m) => m.date.startsWith(monthKey)).reduce((a, m) => a + (m.kind === 'ingreso' ? m.amount : -m.amount), 0)
    : 0

  const empty = (text: string) => <p className={`py-3 font-mono text-xs ${s.faint}`}>{text}</p>
  const row = `flex items-center gap-3 border-b py-2.5 text-sm last:border-0 ${s.line}`

  const complete = (id: string) => {
    playPop()
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, done: true } : x)))
  }

  const taskRow = (task: Task) => {
    const subject = subjects.find((x) => x.id === task.subject)
    const late = !!taskWhen(task) && taskWhen(task)! < todayKey
    return (
      <div key={task.id} className={row}>
        <button
          type="button"
          onClick={() => complete(task.id)}
          aria-label={task.title}
          className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors ${
            dark ? 'border-white/25 hover:border-white/60' : 'border-black/25 hover:border-black/60'
          }`}
        />
        <span className="min-w-0 flex-1 truncate">{task.title}</span>
        {subject && (
          <span className="hidden shrink-0 rounded px-1.5 text-[0.65rem] sm:inline" style={{ background: subject.color, color: textOn(subject.color) }}>
            {subject.name}
          </span>
        )}
        {task.due && (
          <span className={`shrink-0 rounded border px-1.5 font-mono text-[0.65rem] ${task.due < todayKey ? 'border-red-500/50 text-red-500' : 'border-amber-500/50 text-amber-500'}`}>
            {t('Entrega')} · {task.due === todayKey ? t('Hoy') : shortDate(task.due)}
          </span>
        )}
        {!task.due && task.date && (
          <span className={`shrink-0 font-mono text-[0.7rem] ${late ? 'text-red-500' : s.faint}`}>
            {task.date === todayKey ? t('Hoy') : shortDate(task.date)}
          </span>
        )}
      </div>
    )
  }

  const chips: { label: string; value: string; go: HomeSection; alert?: boolean }[] = [
    { label: t('Pendientes'), value: String(pending.length), go: 'tareas' },
  ]
  if (overdue.length > 0) chips.push({ label: t('Atrasadas'), value: String(overdue.length), go: 'tareas', alert: true })
  if (nextWork)
    chips.push({
      label: nextWork.kind === 'examen' ? t('Próximo examen') : t('Próximo proyecto'),
      value: relativeDays(nextWork.date!),
      go: 'examenes',
      alert: daysLeft(nextWork.date!) <= 3,
    })

  const progress = currentBlock
    ? (nowMin - toMin(currentBlock.start)) / Math.max(1, toMin(currentBlock.end) - toMin(currentBlock.start))
    : 0
  const dayCount = todayAnniversaries.length + todayItems.length + dayTasks.length

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 lg:h-full lg:gap-4">
      <div className="animate-[fade-in_0.7s_cubic-bezier(.16,1,.3,1)_both] flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex flex-col gap-1">
          <p className={`text-sm ${s.muted}`}>{userName.trim() ? `${greeting}, ${userName.trim()}.` : `${greeting}.`}</p>
          <p className="font-initiative text-[clamp(2.4rem,7vw,3.6rem)] leading-none font-medium tabular-nums">
            {now.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className={`font-mono text-sm ${s.muted}`}>
            {capitalize(now.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => onOpen(c.go)}
              className={`flex flex-col items-start rounded-xl border px-4 py-2.5 text-left transition-colors ${s.line} ${s.hover}`}
            >
              <span className={`font-mono text-lg font-semibold tabular-nums ${c.alert ? 'text-red-500' : ''}`}>{c.value}</span>
              <span className={`text-[0.65rem] tracking-wide uppercase ${s.muted}`}>{c.label}</span>
            </button>
          ))}
          <button
            type="button"
            disabled={streakDone}
            onClick={() => {
              playPop()
              setStreak((prev) => ({ count: prev.last === yesterdayKey ? prev.count + 1 : 1, last: todayKey }))
            }}
            title={streakDone ? tp('{0}. Ya has marcado hoy.', `${streakCount} ${t(streakCount === 1 ? 'día seguido' : 'días seguidos')}`) : t('Marca tu día')}
            className={`flex flex-col items-start rounded-xl border px-4 py-2.5 text-left transition-colors ${s.line} ${streakDone ? '' : s.hover}`}
          >
            <span className="flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums">
              <Icon name="flame" className={`h-4 w-4 ${streakCount > 0 ? 'text-orange-500' : s.muted}`} />
              {streakCount}d
            </span>
            <span className={`text-[0.65rem] tracking-wide uppercase ${s.muted}`}>{streakDone ? t('Racha') : t('Marcar hoy')}</span>
          </button>
        </div>
      </div>

      <section
        style={{ animationDelay: '0.08s' }}
        className={`animate-[fade-in_0.6s_cubic-bezier(.16,1,.3,1)_both] flex flex-col gap-3 rounded-2xl border p-4 lg:shrink-0 lg:p-4 ${s.line} ${s.panel}`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className={`font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`}>{t('Ahora')}</p>
          <button type="button" onClick={() => onOpen('horario')} className={`text-xs ${s.muted} ${s.hoverText}`}>
            {t('Ver horario')}
          </button>
        </div>
        {currentBlock ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-lg font-medium">{currentBlock.title}</p>
              <p className={`font-mono text-xs ${s.muted}`}>
                {currentBlock.start}–{currentBlock.end} · {tp('quedan {0}', formatSpan(toMin(currentBlock.end) - nowMin))}
              </p>
            </div>
            <div className={`h-1.5 overflow-hidden rounded-full ${dark ? 'bg-white/10' : 'bg-black/[0.07]'}`}>
              <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        ) : (
          <p className={`text-xs ${s.faint}`}>
            {todayBlocks.length === 0 ? t('Hoy no tienes bloques en el horario.') : nextBlock ? t('Ahora no tienes nada.') : t('Has terminado por hoy.')}
          </p>
        )}
        {nextBlock && (
          <p className={`border-t pt-3 text-sm ${s.line} ${s.muted}`}>
            {t('Siguiente')}: <span className={s.strong}>{nextBlock.title}</span>{' '}
            <span className="font-mono text-xs">
              {nextBlock.start} · {tp('en {0}', formatSpan(toMin(nextBlock.start) - nowMin))}
            </span>
          </p>
        )}
      </section>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
        <div className="flex flex-col gap-4 lg:min-h-0">
          <Panel grow={2} title={t('Tu día')} count={dayCount} dark={dark} delay={0.12} onOpen={() => onOpen('calendario')}>
            {dayCount === 0 && empty(t('Hoy no hay nada planeado.'))}
            {todayAnniversaries.map((a) => (
              <div key={a.id} className={row}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500" />
                <span className="min-w-0 flex-1 truncate">{a.name || t('Aniversario')}</span>
                <span className={`shrink-0 font-mono text-[0.7rem] ${s.faint}`}>{t('Todo el día')}</span>
              </div>
            ))}
            {todayItems.map((e) => (
              <div key={e.id + e.date} className={row}>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[e.type]}`} />
                <span className="min-w-0 flex-1 truncate">{e.title}</span>
                <span className={`shrink-0 font-mono text-[0.7rem] ${s.faint}`}>{t('Todo el día')}</span>
              </div>
            ))}
            {dayTasks.map((task) => taskRow(task))}
          </Panel>

          <Panel grow={2} title={t('Tareas')} count={pending.length} dark={dark} delay={0.16} onOpen={() => onOpen('tareas')}>
            <form
              onSubmit={(ev) => {
                ev.preventDefault()
                const title = quick.trim()
                if (!title) return
                playPop()
                setTasks((prev) => [{ id: crypto.randomUUID(), title, done: false, subtasks: [] }, ...prev])
                setQuick('')
              }}
              className={`flex items-center gap-2 border-b py-2 ${s.line}`}
            >
              <Icon name="plus" className={`h-3.5 w-3.5 shrink-0 ${s.muted}`} />
              <input
                value={quick}
                onChange={(e) => setQuick(e.target.value)}
                maxLength={80}
                placeholder={t('Nueva tarea')}
                aria-label={t('Nueva tarea')}
                enterKeyHint="done"
                className="min-w-0 flex-1 bg-transparent py-1 text-base outline-none placeholder:text-neutral-500 sm:text-sm"
              />
            </form>
            {focus.length === 0 && dayTasks.length === 0 ? empty(t('Sin tareas.')) : focus.slice(0, 5).map((task) => taskRow(task))}
            {focus.length > 5 && <p className={`pb-2 font-mono text-[0.7rem] ${s.faint}`}>+{focus.length - 5}</p>}
          </Panel>

          <InitiativeCountdowns countdowns={countdowns} setCountdowns={setCountdowns} now={now} dark={dark} delay={0.2} />
        </div>

        <div className="flex flex-col gap-4 lg:min-h-0">
          <Panel grow={1} title={t('Exámenes y Proyectos')} count={upcomingWorks.length} dark={dark} delay={0.2} onOpen={() => onOpen('examenes')}>
            {upcomingWorks.length === 0
              ? empty(t('Nada por venir.'))
              : upcomingWorks.slice(0, 5).map((w) => {
                  const n = daysLeft(w.date!)
                  const sub = subjects.find((x) => x.id === w.subject)
                  return (
                    <div key={w.id} className={row}>
                      <span className={`h-2 w-2 shrink-0 ${w.kind === 'proyecto' ? 'rounded-[2px]' : 'rounded-full'} ${sub ? '' : DOT[w.kind]}`} style={sub ? { background: sub.color } : undefined} />
                      <span className="min-w-0 flex-1 truncate">{w.title}</span>
                      <span className={`shrink-0 font-mono text-[0.7rem] ${n <= 3 ? 'text-red-500' : s.faint}`}>{relativeDays(w.date!)}</span>
                    </div>
                  )
                })}
          </Panel>

          <Panel grow={1} title={t('Notas')} count={grades.length} dark={dark} delay={0.24} onOpen={() => onOpen('notas')}>
            {grades.length === 0 ? (
              empty(t('Sin notas.'))
            ) : (
              <div className="flex flex-col gap-3 py-3">
                <div className="flex items-baseline gap-3">
                  <span className={`font-mono text-3xl font-semibold tabular-nums ${gradeTone(gradeAvg ?? 0)}`}>{(gradeAvg ?? 0).toFixed(2)}</span>
                  <span className={`text-[0.65rem] tracking-wide uppercase ${s.muted}`}>{t('Media')}</span>
                </div>
                {bySubject.map(({ sub, avg }) => (
                  <div key={sub.id} className="flex items-center gap-3 text-xs">
                    <span className="w-20 shrink-0 truncate rounded px-1.5" style={{ background: sub.color, color: textOn(sub.color) }}>
                      {sub.name}
                    </span>
                    <span className={`h-1 flex-1 overflow-hidden rounded-full ${dark ? 'bg-white/10' : 'bg-black/[0.07]'}`}>
                      <span className={`block h-full rounded-full ${dark ? 'bg-white' : 'bg-neutral-900'}`} style={{ width: `${(avg / 10) * 100}%` }} />
                    </span>
                    <span className={`w-10 shrink-0 text-right font-mono tabular-nums ${gradeTone(avg)}`}>{avg.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={t('Suscripciones')} count={renewals.length} dark={dark} delay={0.32} onOpen={() => onOpen('suscripciones')}>
            {renewals.length === 0
              ? empty(t('Sin suscripciones.'))
              : renewals.slice(0, 3).map(({ sub, next }) => (
                  <div key={sub.id} className={row}>
                    <span className="min-w-0 flex-1 truncate">{sub.title}</span>
                    <span className={`shrink-0 text-[0.7rem] ${next.days <= 3 ? 'text-amber-500' : s.faint}`}>
                      {next.days === 0 ? t('Hoy') : tp('En {0} días', next.days)}
                    </span>
                    <span className="shrink-0 text-[0.7rem] tabular-nums text-red-500">−{eur(sub.price)}</span>
                  </div>
                ))}
          </Panel>

          {bank && (
            <Panel title={t('Dinero')} dark={dark} delay={0.28} onOpen={() => onOpen('banco')}>
              <div className="flex flex-col gap-1 py-3">
                <span className={`font-mono text-3xl font-semibold tabular-nums ${bank.balance < 0 ? 'text-red-500' : ''}`}>{eur(bank.balance)}</span>
                <span className={`font-mono text-xs ${monthNet < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {monthNet >= 0 ? '+' : ''}
                  {eur(monthNet)} <span className={s.muted}>{t('este mes')}</span>
                </span>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
