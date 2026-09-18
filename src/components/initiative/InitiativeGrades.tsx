import { useState } from 'react'
import { dateKey, shortDate, textOn, type Grade, type Subject, type Work } from '../../lib/store'
import { notifyWithUndo } from '../../lib/undo'
import { t, tp } from '../../lib/i18n'
import { playDrop, playPop } from '../../lib/sound'
import { Icon } from '../ui'
import { gradeTone, skin, type Skin } from './skin'

type Props = {
  grades: Grade[]
  setGrades: (update: (prev: Grade[]) => Grade[]) => void
  subjects: Subject[]
  works: Work[]
  dark: boolean
}

type Term = 'todos' | '1' | '2' | '3'
type Sort = 'recientes' | 'mayor' | 'menor'

const KINDS: { id: Grade['kind']; label: string }[] = [
  { id: 'examen', label: 'Examen' },
  { id: 'trabajo', label: 'Trabajo' },
  { id: 'otro', label: 'Otro' },
]

const average = (list: Grade[]) => (list.length ? list.reduce((a, g) => a + g.value, 0) / list.length : null)
const show = (v: number | null) => (v === null ? '—' : v.toFixed(2))

export function InitiativeGrades({ grades, setGrades, subjects, works, dark }: Props) {
  const s = skin(dark)
  const [term, setTerm] = useState<Term>('todos')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [sort, setSort] = useState<Sort>('recientes')
  const [openId, setOpenId] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [kind, setKind] = useState<Grade['kind']>('examen')
  const [newTerm, setNewTerm] = useState<'1' | '2' | '3'>('1')
  const [subject, setSubject] = useState('')
  const [work, setWork] = useState('')
  const [weight, setWeight] = useState('')

  const inTerm = (g: Grade, x: Term) => x === 'todos' || String(g.term ?? '') === x
  const byTerm = grades.filter((g) => inTerm(g, term))
  const visible = byTerm.filter((g) => !subjectFilter || g.subject === subjectFilter)

  const ordered = [...visible].sort((a, b) =>
    sort === 'mayor'
      ? b.value - a.value
      : sort === 'menor'
        ? a.value - b.value
        : b.date.localeCompare(a.date),
  )

  const weighted = visible.filter((g) => g.weight)
  const weightedTotal = weighted.reduce((a, g) => a + g.value * ((g.weight ?? 0) / 100), 0)
  const weightCovered = weighted.reduce((a, g) => a + (g.weight ?? 0), 0)

  const sortedValues = [...visible].sort((a, b) => b.value - a.value)
  const best = sortedValues[0]
  const worst = sortedValues[sortedValues.length - 1]

  const numeric = Number(value.replace(',', '.'))
  const validValue = value.trim() !== '' && Number.isFinite(numeric) && numeric >= 1 && numeric <= 10

  const add = () => {
    if (!validValue) return
    const w = Number(weight.replace(',', '.'))
    playPop()
    setGrades((prev) => [
      {
        id: crypto.randomUUID(),
        value: Math.round(numeric * 100) / 100,
        subject: subject || undefined,
        work: work || undefined,
        desc: works.find((x) => x.id === work)?.title ?? subjects.find((x) => x.id === subject)?.name,
        kind,
        date: dateKey(new Date()),
        term: Number(newTerm) as Grade['term'],
        weight: Number.isFinite(w) && w > 0 && w <= 100 ? w : undefined,
      },
      ...prev,
    ])
    setValue('')
    setWeight('')
  }

  const patch = (id: string, changes: Partial<Grade>) =>
    setGrades((prev) => prev.map((g) => (g.id === id ? { ...g, ...changes } : g)))

  const remove = (id: string, v: number) => {
    playDrop()
    const before = grades
    setGrades((prev) => prev.filter((g) => g.id !== id))
    setOpenId(null)
    notifyWithUndo(tp('Nota {0} eliminada', v), () => setGrades(() => before))
  }

  const terms: { id: Term; label: string }[] = [
    { id: 'todos', label: 'Final' },
    { id: '1', label: '1º Trimestre' },
    { id: '2', label: '2º Trimestre' },
    { id: '3', label: '3º Trimestre' },
  ]

  const subjectRows = subjects
    .map((sub) => {
      const list = byTerm.filter((g) => g.subject === sub.id)
      return { sub, list, avg: average(list) }
    })
    .filter((row) => row.list.length > 0)

  const label = `font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-initiative text-3xl font-medium tracking-tight sm:text-4xl">{t('Notas')}</h1>
        <p className={`font-mono text-xs ${s.faint}`}>
          {visible.length} {t(visible.length === 1 ? 'nota' : 'notas')}
        </p>
      </div>

      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          add()
        }}
        className={`flex flex-col gap-3 rounded-2xl border p-3 ${s.line} ${s.panel}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            placeholder={t('Nota (1–10)')}
            aria-label={t('Nota')}
            className={`${s.field} !w-36 font-mono`}
          />
          <div className={`flex rounded-lg border p-0.5 ${s.line}`}>
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                aria-pressed={kind === k.id}
                className={`rounded-md px-3 py-1 text-xs transition-colors ${
                  kind === k.id ? s.active : `${s.muted} ${s.hoverText}`
                }`}
              >
                {t(k.label)}
              </button>
            ))}
          </div>
          <select
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value as '1' | '2' | '3')}
            aria-label={t('Trimestre')}
            className={`${s.field} !w-auto !py-1.5 text-xs`}
          >
            <option value="1">{t('1º Trimestre')}</option>
            <option value="2">{t('2º Trimestre')}</option>
            <option value="3">{t('3º Trimestre')}</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {subjects.length > 0 ? (
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              aria-label={t('Asignatura')}
              className={`${s.field} !w-auto !py-1.5 text-xs`}
            >
              <option value="">{t('Sin asignatura')}</option>
              {subjects.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          ) : (
            <span className={`text-[0.7rem] ${s.faint}`}>
              {t('Crea asignaturas en Ajustes para poder elegir de qué es la nota.')}
            </span>
          )}
          {works.length > 0 && (
            <select
              value={work}
              onChange={(e) => setWork(e.target.value)}
              aria-label={t('Examen o proyecto')}
              className={`${s.field} !w-auto max-w-56 !py-1.5 text-xs`}
            >
              <option value="">{t('Sin examen ni proyecto')}</option>
              {works.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.kind === 'examen' ? t('Examen') : t('Proyecto')} · {w.title}
                </option>
              ))}
            </select>
          )}
          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            inputMode="decimal"
            placeholder={t('% de la nota final')}
            aria-label={t('Porcentaje de la nota final')}
            className={`${s.field} !w-48 !py-1.5 font-mono text-xs`}
          />
          <span className="flex-1" />
          <button
            type="submit"
            disabled={!validValue}
            aria-label={t('Añadir')}
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors disabled:opacity-30 ${s.primary}`}
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`flex flex-wrap rounded-lg border p-0.5 ${s.line}`}>
          {terms.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTerm(x.id)}
              aria-pressed={term === x.id}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors ${
                term === x.id ? s.active : `${s.muted} ${s.hoverText}`
              }`}
            >
              {t(x.label)}
              {grades.some((g) => inTerm(g, x.id)) && (
                <span className={`font-mono text-[0.65rem] tabular-nums ${s.faint}`}>
                  {show(average(grades.filter((g) => inTerm(g, x.id))))}
                </span>
              )}
            </button>
          ))}
        </div>
        {subjects.length > 0 && (
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            aria-label={t('Asignatura')}
            className={`${s.field} !w-auto !py-1.5 text-xs`}
          >
            <option value="">{t('Todas las asignaturas')}</option>
            {subjects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className={`grid grid-cols-2 divide-x divide-y overflow-hidden rounded-2xl border sm:grid-cols-4 sm:divide-y-0 ${s.line} ${s.divide}`}>
        {[
          {
            key: 'media',
            title: subjectFilter ? t('Media') : t('Media'),
            value: show(average(visible)),
            tone: visible.length ? gradeTone(average(visible) ?? 0) : '',
          },
          {
            key: 'ponderada',
            title: subjectFilter ? tp('Ponderada · {0}%', weightCovered) : t('Ponderada'),
            value: subjectFilter && weighted.length > 0 ? weightedTotal.toFixed(2) : '—',
            tone: subjectFilter && weighted.length > 0 ? gradeTone(weightedTotal) : '',
          },
          { key: 'mejor', title: t('Mejor'), value: best ? String(best.value) : '—', tone: best ? gradeTone(best.value) : '' },
          { key: 'peor', title: t('Peor'), value: worst ? String(worst.value) : '—', tone: worst ? gradeTone(worst.value) : '' },
        ].map((cell) => (
          <div key={cell.key} className="flex min-w-0 flex-col gap-1.5 px-4 py-4">
            <span className={`font-mono text-2xl font-semibold tabular-nums ${cell.tone}`}>{cell.value}</span>
            <span className={`text-[0.65rem] tracking-wide uppercase ${s.muted}`}>{cell.title}</span>
          </div>
        ))}
      </div>
      {!subjectFilter && (
        <p className={`-mt-3 text-[0.7rem] ${s.faint}`}>
          {t('La media es simple, sin porcentajes. Elige una asignatura para ver la nota ponderada.')}
        </p>
      )}

      {!subjectFilter && subjectRows.length > 0 && (
        <section className={`flex flex-col rounded-2xl border ${s.line} ${s.panel}`}>
          <p className={`border-b px-4 py-3 ${s.line} ${label}`}>{t('Por asignatura')}</p>
          <ul className={`flex flex-col divide-y px-4 ${s.divide}`}>
            {subjectRows.map(({ sub, list, avg }) => (
              <li key={sub.id}>
                <button
                  type="button"
                  onClick={() => setSubjectFilter(sub.id)}
                  className="flex w-full items-center gap-3 py-3 text-left"
                >
                  <span
                    className="w-24 shrink-0 truncate rounded px-1.5 text-xs sm:w-32"
                    style={{ background: sub.color, color: textOn(sub.color) }}
                  >
                    {sub.name}
                  </span>
                  <span className={`h-1 flex-1 overflow-hidden rounded-full ${dark ? 'bg-white/10' : 'bg-black/10'}`}>
                    <span
                      className={`block h-full rounded-full ${dark ? 'bg-white' : 'bg-neutral-900'}`}
                      style={{ width: `${((avg ?? 0) / 10) * 100}%` }}
                    />
                  </span>
                  <span className={`w-12 shrink-0 text-right font-mono text-sm tabular-nums ${gradeTone(avg ?? 0)}`}>
                    {show(avg)}
                  </span>
                  <span className={`w-6 shrink-0 text-right font-mono text-[0.7rem] ${s.faint}`}>{list.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className={label}>{subjectFilter ? subjects.find((x) => x.id === subjectFilter)?.name : t('Todas')}</p>
        <div className="flex items-center gap-2">
          {subjectFilter && (
            <button type="button" onClick={() => setSubjectFilter('')} className={s.ghost}>
              {t('Ver todas')}
            </button>
          )}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label={t('Orden')}
            className={`${s.field} !w-auto !py-1.5 text-xs`}
          >
            <option value="recientes">{t('Más recientes')}</option>
            <option value="mayor">{t('Mayor nota')}</option>
            <option value="menor">{t('Menor nota')}</option>
          </select>
        </div>
      </div>

      {ordered.length === 0 ? (
        <p className={`font-mono text-sm ${s.faint}`}>{t('Sin notas.')}</p>
      ) : (
        <ul className={`flex flex-col divide-y overflow-hidden rounded-2xl border ${s.line} ${s.divide}`}>
          {ordered.map((g) => {
            const sub = subjects.find((x) => x.id === g.subject)
            const open = openId === g.id
            return (
              <li key={g.id} className={open ? s.panel : ''}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : g.id)}
                  aria-expanded={open}
                  title={t('Editar')}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className={`w-12 shrink-0 font-mono text-lg font-medium tabular-nums ${gradeTone(g.value)}`}>
                    {g.value}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {g.desc || t(KINDS.find((k) => k.id === g.kind)?.label ?? '')}
                    </span>
                    <span className={`mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.7rem] ${s.faint}`}>
                      {sub && (
                        <span className="rounded px-1.5" style={{ background: sub.color, color: textOn(sub.color) }}>
                          {sub.name}
                        </span>
                      )}
                      <span>{t(KINDS.find((k) => k.id === g.kind)?.label ?? '')}</span>
                      {g.term && <span>{tp('{0}º Trim.', g.term)}</span>}
                      <span className="font-mono">{shortDate(g.date)}</span>
                    </span>
                  </span>
                  {g.weight && (
                    <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[0.65rem] ${dark ? 'bg-white/10' : 'bg-black/[0.06]'} ${s.muted}`}>
                      {g.weight}%
                    </span>
                  )}
                  <Icon name={open ? 'up' : 'down'} className={`h-3.5 w-3.5 shrink-0 ${s.muted}`} />
                </button>
                {open && (
                  <GradeDetail
                    grade={g}
                    s={s}
                    subjects={subjects}
                    works={works}
                    onPatch={(changes) => patch(g.id, changes)}
                    onRemove={() => remove(g.id, g.value)}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function GradeDetail({
  grade,
  s,
  subjects,
  works,
  onPatch,
  onRemove,
}: {
  grade: Grade
  s: Skin
  subjects: Subject[]
  works: Work[]
  onPatch: (changes: Partial<Grade>) => void
  onRemove: () => void
}) {
  const label = `font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`
  const [text, setText] = useState(String(grade.value))

  return (
    <div className={`flex flex-col gap-4 border-t px-4 py-4 ${s.line}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Nota')}</span>
          <input
            value={text}
            inputMode="decimal"
            onChange={(e) => {
              setText(e.target.value)
              const n = Number(e.target.value.replace(',', '.'))
              if (Number.isFinite(n) && n >= 1 && n <= 10) onPatch({ value: Math.round(n * 100) / 100 })
            }}
            className={`${s.field} font-mono`}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('% de la nota final')}</span>
          <input
            defaultValue={grade.weight ?? ''}
            inputMode="decimal"
            onChange={(e) => {
              const n = Number(e.target.value.replace(',', '.'))
              onPatch({ weight: Number.isFinite(n) && n > 0 && n <= 100 ? n : undefined })
            }}
            className={`${s.field} font-mono`}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Tipo')}</span>
          <select
            value={grade.kind}
            onChange={(e) => onPatch({ kind: e.target.value as Grade['kind'] })}
            className={s.field}
          >
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {t(k.label)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Trimestre')}</span>
          <select
            value={grade.term ?? 1}
            onChange={(e) => onPatch({ term: Number(e.target.value) as Grade['term'] })}
            className={s.field}
          >
            <option value={1}>{t('1º Trimestre')}</option>
            <option value={2}>{t('2º Trimestre')}</option>
            <option value={3}>{t('3º Trimestre')}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Asignatura')}</span>
          <select
            value={grade.subject ?? ''}
            onChange={(e) => onPatch({ subject: e.target.value || undefined })}
            className={s.field}
          >
            <option value="">{t('Sin asignatura')}</option>
            {subjects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Examen o proyecto')}</span>
          <select
            value={grade.work ?? ''}
            onChange={(e) => {
              const id = e.target.value
              onPatch({ work: id || undefined, desc: works.find((w) => w.id === id)?.title ?? grade.desc })
            }}
            className={s.field}
          >
            <option value="">{t('Sin examen ni proyecto')}</option>
            {works.map((w) => (
              <option key={w.id} value={w.id}>
                {w.kind === 'examen' ? t('Examen') : t('Proyecto')} · {w.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={label}>{t('Descripción')}</span>
          <input
            value={grade.desc ?? ''}
            onChange={(e) => onPatch({ desc: e.target.value || undefined })}
            maxLength={80}
            className={s.field}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Fecha')}</span>
          <input
            type="date"
            value={grade.date}
            onChange={(e) => e.target.value && onPatch({ date: e.target.value })}
            className={s.field}
          />
        </label>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onRemove}
          className={`flex items-center gap-1.5 text-xs ${s.muted} transition-colors hover:text-red-500`}
        >
          <Icon name="trash" className="h-3.5 w-3.5" />
          {t('Eliminar')}
        </button>
      </div>
    </div>
  )
}
