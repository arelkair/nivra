import { useMemo, useState } from 'react'
import { dateKey, useStored } from '../../lib/store'
import { locale, t, tp } from '../../lib/i18n'
import { Icon } from '../ui'
import { skin } from './skin'

export const JOURNAL_KEY = 'nivra-journal'
const MAX_LINES = 5
const MAX_CHARS = 400

type Journal = Record<string, string>

const fromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const shift = (key: string, days: number) => {
  const d = fromKey(key)
  d.setDate(d.getDate() + days)
  return dateKey(d)
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

const clampLines = (value: string) => value.split('\n').slice(0, MAX_LINES).join('\n').slice(0, MAX_CHARS)

export function InitiativeJournal({ dark }: { dark: boolean }) {
  const s = skin(dark)
  const [journal, setJournal] = useStored<Journal>(JOURNAL_KEY, {})
  const today = dateKey(new Date())
  const [day, setDay] = useState(today)
  const text = journal[day] ?? ''
  const lines = text ? text.split('\n').length : 0
  const year = Number(day.slice(0, 4))
  const monthDay = day.slice(5)

  const past = useMemo(() => {
    const days = new Set([monthDay])
    if (monthDay === '02-28' && !isLeap(year)) days.add('02-29')
    return Object.entries(journal)
      .filter(([k, v]) => v.trim() && Number(k.slice(0, 4)) < year && days.has(k.slice(5)))
      .sort(([a], [b]) => b.localeCompare(a))
  }, [journal, monthDay, year])

  const written = useMemo(() => Object.values(journal).filter((v) => v.trim()).length, [journal])

  const write = (value: string) => {
    const next = clampLines(value)
    setJournal((prev) => {
      const copy = { ...prev }
      if (next.trim()) copy[day] = next
      else delete copy[day]
      return copy
    })
  }

  const title = fromKey(day).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const short = fromKey(day).toLocaleDateString(locale(), { day: 'numeric', month: 'long' })

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-initiative text-3xl font-medium tracking-tight sm:text-4xl">{t('Diario')}</h1>
        <p className={`text-sm ${s.muted}`}>{tp('{0} días escritos', written)}</p>
      </header>

      <section className={`flex flex-col gap-4 rounded-2xl border p-5 ${s.line} ${s.panel}`}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setDay(shift(day, -1))} aria-label={t('Día anterior')} className={s.iconButton}>
            <Icon name="left" className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-base font-medium first-letter:uppercase">{title}</p>
            {day !== today && (
              <button type="button" onClick={() => setDay(today)} className={`text-xs ${s.muted} underline-offset-4 hover:underline`}>
                {t('Volver a hoy')}
              </button>
            )}
          </div>
          <button type="button" onClick={() => setDay(shift(day, 1))} disabled={day >= today} aria-label={t('Día siguiente')} className={`${s.iconButton} disabled:opacity-35`}>
            <Icon name="right" className="h-4 w-4" />
          </button>
        </div>

        <label className="flex flex-col gap-2">
          <span className="sr-only">{tp('Qué pasó el {0}', short)}</span>
          <textarea
            key={day}
            value={text}
            onChange={(e) => write(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && lines >= MAX_LINES) e.preventDefault()
            }}
            rows={MAX_LINES}
            maxLength={MAX_CHARS}
            placeholder={day === today ? t('¿Qué ha pasado hoy?') : t('¿Qué pasó este día?')}
            className={`${s.field} resize-none leading-relaxed`}
          />
          <span className={`flex justify-between font-mono text-[0.7rem] tabular-nums ${s.faint}`}>
            <span>{tp('{0}/{1} líneas', lines, MAX_LINES)}</span>
            <span>
              {text.length}/{MAX_CHARS}
            </span>
          </span>
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="nv-group-label">{tp('El {0} en otros años', short)}</h2>
        {past.length === 0 ? (
          <p className={`rounded-2xl border border-dashed px-5 py-6 text-center text-sm ${s.line} ${s.muted}`}>
            {t('Cuando vuelva este día el año que viene, aquí verás lo que escribiste.')}
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {past.map(([key, value], i) => {
              const ago = year - Number(key.slice(0, 4))
              return (
                <li
                  key={key}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={`animate-[fade-in_0.4s_cubic-bezier(.16,1,.3,1)_both] rounded-2xl border px-5 py-4 ${s.line} ${s.panel}`}
                >
                  <p className="mb-2 flex items-baseline justify-between gap-3">
                    <span className="font-mono text-sm font-semibold tabular-nums">{key.slice(0, 4)}</span>
                    <span className={`text-xs ${s.muted}`}>{ago === 1 ? t('Hace 1 año') : tp('Hace {0} años', ago)}</span>
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{value}</p>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
