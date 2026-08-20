import { useState } from 'react'
import { dateKey, shortDate, type Grade, type Subject, type Work } from '../lib/store'
import { notifyWithUndo } from '../lib/undo'
import { Empty, Icon, Label, Segmented, button, card, input, select } from '../components/ui'
import { t } from '../lib/i18n'

type Props = {
  grades: Grade[]
  setGrades: (update: (prev: Grade[]) => Grade[]) => void
  subjects: Subject[]
  works: Work[]
}

const KINDS: { id: Grade['kind']; label: string }[] = [
  { id: 'examen', label: 'Examen' },
  { id: 'trabajo', label: 'Trabajo' },
  { id: 'otro', label: 'Otro' },
]

const tone = (v: number) =>
  v >= 9
    ? 'text-green-600 dark:text-green-500'
    : v >= 5
      ? 'text-neutral-900 dark:text-white'
      : 'text-red-500'

export function Grades({ grades, setGrades, subjects, works }: Props) {
  const [filter, setFilter] = useState<'todos' | '1' | '2' | '3'>('todos')
  const visible =
    filter === 'todos' ? grades : grades.filter((g) => String(g.term ?? '') === filter)
  const average = visible.length
    ? visible.reduce((s, g) => s + g.value, 0) / visible.length
    : null
  const sorted = [...visible].sort((a, b) => b.value - a.value)
  const best = sorted.slice(0, 3)
  const worst = sorted.slice(Math.max(3, sorted.length - 3)).reverse()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          const form = ev.currentTarget
          const data = new FormData(form)
          const value = Number(String(data.get('value') ?? '').replace(',', '.'))
          if (!Number.isFinite(value) || value < 1 || value > 10) return
          setGrades((prev) => [
            {
              id: crypto.randomUUID(),
              value: Math.round(value * 100) / 100,
              subject: String(data.get('subject') ?? '') || undefined,
              work: String(data.get('work') ?? '') || undefined,
              desc:
                works.find((w) => w.id === String(data.get('work')))?.title ??
                subjects.find((x) => x.id === String(data.get('subject')))?.name,
              kind: String(data.get('kind')) as Grade['kind'],
              date: dateKey(new Date()),
              term: Number(data.get('term')) as Grade['term'],
            },
            ...prev,
          ])
          form.reset()
        }}
        className={`${card} flex flex-col gap-2 p-4 sm:p-5`}
      >
        <Label>{t('Nueva nota')}</Label>
        <div className="flex gap-2">
          <input
            name="value"
            type="number"
            step="0.01"
            min="1"
            max="10"
            required
            placeholder={t('Del 1 al 10')}
            aria-label={t('Nota')}
            className={`${input} font-mono`}
          />
          <select name="kind" defaultValue="examen" aria-label={t('Tipo')} className={select}>
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {t(k.label)}
              </option>
            ))}
          </select>
          <select name="term" defaultValue="1" aria-label={t('Trimestre')} className={select}>
            <option value="1">{t('1º Trimestre')}</option>
            <option value="2">{t('2º Trimestre')}</option>
            <option value="3">{t('3º Trimestre')}</option>
          </select>
        </div>
        {subjects.length === 0 ? (
          <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
            {t('Crea asignaturas en Ajustes para poder elegir de qué es la nota.')}
          </p>
        ) : (
          <select name="subject" defaultValue={subjects[0].id} aria-label={t('Asignatura')} className={select}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        {works.length > 0 && (
          <select name="work" defaultValue="" aria-label={t('Examen o proyecto')} className={select}>
            <option value="">Sin examen ni proyecto</option>
            {works.map((w) => (
              <option key={w.id} value={w.id}>
                {w.kind === 'examen' ? 'Examen' : 'Proyecto'} · {w.title}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className={button}>
          {t('Añadir')}
        </button>
      </form>

      <div className="flex justify-center">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { id: '1', label: '1º Trimestre' },
            { id: '2', label: '2º Trimestre' },
            { id: '3', label: '3º Trimestre' },
            { id: 'todos', label: 'Final' },
          ]}
        />
      </div>

      {average !== null && (
        <section className={`${card} animate-[fade-in_0.35s_ease-out] p-5 sm:p-6`}>
          <Label>
            {t('Media')} · {visible.length} {t(visible.length === 1 ? 'nota' : 'notas')}
          </Label>
          <p className={`font-mono text-4xl font-medium tabular-nums ${tone(average)}`}>
            {average.toFixed(2)}
          </p>
        </section>
      )}

      {visible.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Top title={t('Mejores')} items={best} />
          {worst.length > 0 && <Top title={t('Peores')} items={worst} />}
        </div>
      )}

      <section className={`${card} animate-[fade-in_0.35s_ease-out_0.05s_both] p-5 sm:p-6`}>
        <Label>{t('Todas')}</Label>
        {visible.length === 0 ? (
          <Empty>{t('Sin notas.')}</Empty>
        ) : (
          <ul className="flex flex-col">
            {visible.map((g) => (
              <li
                key={g.id}
                className="flex items-center gap-3 border-b border-black/[0.06] py-3 text-sm last:border-0 dark:border-white/[0.08]"
              >
                <span className={`w-12 shrink-0 font-mono font-medium tabular-nums ${tone(g.value)}`}>
                  {g.value}
                </span>
                <span className="min-w-0 flex-1 truncate">{g.desc || KINDS.find((k) => k.id === g.kind)?.label}</span>
                <span className="shrink-0 text-[0.7rem] text-neutral-400 dark:text-neutral-500">
                  {t(KINDS.find((k) => k.id === g.kind)?.label ?? '')}
                  {g.term ? ` · ${g.term}º Trim.` : ''} · {shortDate(g.date)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const before = grades
                    setGrades((prev) => prev.filter((x) => x.id !== g.id))
                    notifyWithUndo(`Nota ${g.value} eliminada`, () => setGrades(() => before))
                  }}
                  aria-label={`Eliminar nota ${g.value}`}
                  className="shrink-0 text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Top({ title, items }: { title: string; items: Grade[] }) {
  return (
    <section className={`${card} p-5 sm:p-6`}>
      <Label>{title}</Label>
      <ul className="flex flex-col gap-2">
        {items.map((g) => (
          <li key={g.id} className="flex items-center gap-3 text-sm">
            <span className={`w-10 shrink-0 font-mono font-medium tabular-nums ${tone(g.value)}`}>
              {g.value}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {g.desc || KINDS.find((k) => k.id === g.kind)?.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
