import { useEffect, useState } from 'react'
import { TYPES, dateKey, shortDate, textOn, type Grade, type Subject, type Work } from '../../lib/store'
import { notifyWithUndo } from '../../lib/undo'
import { t, tp } from '../../lib/i18n'
import { playDrop, playPop } from '../../lib/sound'
import { Icon } from '../ui'
import { DOT, skin, type NoteRef, type Skin } from './skin'
import { daysLeft, relativeDays } from './dates'

type Props = {
  works: Work[]
  setWorks: (update: (prev: Work[]) => Work[]) => void
  subjects: Subject[]
  notes: NoteRef[]
  onCreateNote: (title: string) => string
  onOpenNote: (id: string) => void
  grades: Grade[]
  dark: boolean
}

type Tab = 'proximos' | 'pasados' | 'sin-fecha'
type Kind = 'todos' | 'examen' | 'proyecto'

const TABS: { id: Tab; label: string }[] = [
  { id: 'proximos', label: 'Próximos' },
  { id: 'pasados', label: 'Pasados' },
  { id: 'sin-fecha', label: 'Sin fecha' },
]

export function InitiativeExams({ works, setWorks, subjects, notes, onCreateNote, onOpenNote, grades, dark }: Props) {
  const s = skin(dark)
  const todayKey = dateKey(new Date())
  const [tab, setTab] = useState<Tab>('proximos')
  const [kindFilter, setKindFilter] = useState<Kind>('todos')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [kind, setKind] = useState<'examen' | 'proyecto'>('examen')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [subject, setSubject] = useState('')

  const inTab = (w: Work, tabId: Tab) => {
    if (tabId === 'sin-fecha') return !w.date
    if (!w.date) return false
    return tabId === 'proximos' ? w.date >= todayKey : w.date < todayKey
  }
  const passes = (w: Work) =>
    (kindFilter === 'todos' || w.kind === kindFilter) && (!subjectFilter || w.subject === subjectFilter)

  const counts = Object.fromEntries(
    TABS.map((x) => [x.id, works.filter((w) => inTab(w, x.id) && passes(w)).length]),
  ) as Record<Tab, number>

  const visible = works.filter((w) => inTab(w, tab) && passes(w))
  const ordered =
    tab === 'sin-fecha'
      ? visible
      : [...visible].sort((a, b) =>
          tab === 'proximos' ? (a.date ?? '').localeCompare(b.date ?? '') : (b.date ?? '').localeCompare(a.date ?? ''),
        )

  const patch = (id: string, changes: Partial<Work>) =>
    setWorks((prev) => prev.map((w) => (w.id === id ? { ...w, ...changes } : w)))

  const remove = (id: string) => {
    playDrop()
    const before = works
    const name = works.find((w) => w.id === id)?.title ?? ''
    setWorks((prev) => prev.filter((w) => w.id !== id))
    setOpenId(null)
    notifyWithUndo(tp('«{0}» eliminado', name), () => setWorks(() => before))
  }

  const canAdd = title.trim() !== '' && (kind !== 'examen' || date !== '')

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-initiative text-3xl font-medium tracking-tight sm:text-4xl">
          {t('Exámenes y Proyectos')}
        </h1>
        <p className={`font-mono text-xs ${s.faint}`}>
          {tp('{0} próximos', works.filter((w) => inTab(w, 'proximos')).length)}
        </p>
      </div>

      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          if (!canAdd) return
          playPop()
          setWorks((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              kind,
              title: title.trim(),
              date: date || undefined,
              subject: subject || undefined,
              category: kind === 'proyecto' ? 'colegio' : undefined,
            },
          ])
          setTitle('')
          setDate('')
        }}
        className={`flex flex-col gap-3 rounded-2xl border p-3 ${s.line} ${s.panel}`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className={`flex shrink-0 rounded-lg border p-0.5 ${s.line}`}>
            {(['examen', 'proyecto'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors ${
                  kind === k ? s.active : `${s.muted} ${s.hoverText}`
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${DOT[k]}`} />
                {t(TYPES[k].label)}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder={kind === 'examen' ? t('Nuevo examen') : t('Nuevo proyecto')}
            aria-label={kind === 'examen' ? t('Nuevo examen') : t('Nuevo proyecto')}
            className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-neutral-500 sm:text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label={kind === 'examen' ? t('Fecha (obligatoria)') : t('Fecha (opcional)')}
            className={`${s.field} !w-auto !py-1.5 text-xs`}
          />
          {subjects.length > 0 && (
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
          )}
          <span className={`min-w-0 flex-1 text-[0.7rem] ${s.faint}`}>
            {kind === 'examen' ? t('Fecha obligatoria.') : t('Fecha opcional.')}
          </span>
          <button
            type="submit"
            disabled={!canAdd}
            aria-label={t('Añadir')}
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors disabled:opacity-30 ${s.primary}`}
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`flex flex-wrap rounded-lg border p-0.5 ${s.line}`}>
          {TABS.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTab(x.id)}
              aria-pressed={tab === x.id}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors ${
                tab === x.id ? s.active : `${s.muted} ${s.hoverText}`
              }`}
            >
              {t(x.label)}
              <span className={`font-mono text-[0.65rem] tabular-nums ${s.faint}`}>{counts[x.id]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as Kind)}
            aria-label={t('Tipo')}
            className={`${s.field} !w-auto !py-1.5 text-xs`}
          >
            <option value="todos">{t('Todos')}</option>
            <option value="examen">{t('Exámenes')}</option>
            <option value="proyecto">{t('Proyectos')}</option>
          </select>
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
      </div>

      {ordered.length === 0 ? (
        <p className={`font-mono text-sm ${s.faint}`}>{t('Nada por aquí.')}</p>
      ) : (
        <ul className={`flex flex-col divide-y overflow-hidden rounded-2xl border ${s.line} ${s.divide}`}>
          {ordered.map((w) => {
            const sub = subjects.find((x) => x.id === w.subject)
            const grade = grades.find((g) => g.work === w.id)?.value
            const open = openId === w.id
            const n = w.date ? daysLeft(w.date) : null
            return (
              <li key={w.id} className={open ? s.panel : ''}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[w.kind]}`} />
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : w.id)}
                    aria-expanded={open}
                    title={t('Editar')}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm">{w.title}</span>
                    <span className={`mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.7rem] ${s.faint}`}>
                      {w.date ? <span className="font-mono">{shortDate(w.date)}</span> : <span>{t('Sin fecha')}</span>}
                      {sub && (
                        <span className="rounded px-1.5" style={{ background: sub.color, color: textOn(sub.color) }}>
                          {sub.name}
                        </span>
                      )}
                      {w.notepad && <span>{t('Con bloc')}</span>}
                    </span>
                  </button>
                  {grade !== undefined && (
                    <span
                      title={t('Nota obtenida')}
                      className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-sm font-medium tabular-nums ${
                        grade >= 5 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'
                      }`}
                    >
                      {grade}
                    </span>
                  )}
                  {n !== null && tab !== 'pasados' && <Countdown date={w.date!} s={s} />}
                  {n !== null && tab === 'pasados' && (
                    <span className={`shrink-0 font-mono text-xs ${s.faint}`}>{relativeDays(w.date!)}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : w.id)}
                    aria-label={t('Editar')}
                    className={`${s.muted} ${s.hoverText} shrink-0 transition-colors`}
                  >
                    <Icon name={open ? 'up' : 'down'} className="h-3.5 w-3.5" />
                  </button>
                </div>
                {open && (
                  <WorkDetail
                    work={w}
                    s={s}
                    subjects={subjects}
                    notes={notes}
                    onCreateNote={onCreateNote}
                    onOpenNote={onOpenNote}
                    onPatch={(changes) => patch(w.id, changes)}
                    onRemove={() => remove(w.id)}
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

function Countdown({ date, s }: { date: string; s: Skin }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const n = daysLeft(date, now)
  const [y, m, d] = date.split('-').map(Number)
  const end = new Date(y, m - 1, d, 23, 59, 59).getTime() - now.getTime()
  const pad = (v: number) => String(v).padStart(2, '0')
  const clock =
    n <= 1 && end > 0
      ? `${pad(Math.floor(end / 3600000))}:${pad(Math.floor((end % 3600000) / 60000))}:${pad(Math.floor((end % 60000) / 1000))}`
      : null
  return (
    <span
      title={t('Tiempo restante')}
      className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-xs tabular-nums ${
        n <= 3 ? 'bg-red-500/15 text-red-500' : `${s.dark ? 'bg-white/[0.06]' : 'bg-black/[0.05]'} ${s.muted}`
      }`}
    >
      {n === 0 ? `${t('Hoy')} ${clock ?? ''}`.trim() : n === 1 ? `${t('Mañana')}` : `${n}d`}
    </span>
  )
}

function WorkDetail({
  work,
  s,
  subjects,
  notes,
  onCreateNote,
  onOpenNote,
  onPatch,
  onRemove,
}: {
  work: Work
  s: Skin
  subjects: Subject[]
  notes: NoteRef[]
  onCreateNote: (title: string) => string
  onOpenNote: (id: string) => void
  onPatch: (changes: Partial<Work>) => void
  onRemove: () => void
}) {
  const label = `font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`

  const createNotepad = () => onPatch({ notepad: onCreateNote(work.title) })

  return (
    <div className={`flex flex-col gap-4 border-t px-4 py-4 ${s.line}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={label}>{t('Título')}</span>
          <input
            value={work.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            maxLength={80}
            className={s.field}
          />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={label}>{t('Descripción')}</span>
          <textarea
            value={work.desc ?? ''}
            onChange={(e) => onPatch({ desc: e.target.value })}
            maxLength={300}
            rows={2}
            className={s.field}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Fecha')}</span>
          <input
            type="date"
            value={work.date ?? ''}
            onChange={(e) => onPatch({ date: e.target.value || (work.kind === 'examen' ? work.date : undefined) })}
            className={s.field}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Asignatura')}</span>
          <select
            value={work.subject ?? ''}
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
          <span className={label}>{t('Nota')}</span>
          <span className="flex items-center gap-2">
            <select
              value={work.notepad ?? ''}
              onChange={(e) => onPatch({ notepad: e.target.value || undefined })}
              className={s.field}
            >
              <option value="">{t('Sin nota')}</option>
              {notes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
            <button type="button" onClick={createNotepad} className={`${s.ghost} shrink-0`}>
              {t('Nuevo')}
            </button>
            {work.notepad && (
              <button type="button" onClick={() => onOpenNote(work.notepad!)} className={`${s.ghost} shrink-0`}>
                {t('Abrir')}
              </button>
            )}
          </span>
        </label>
        {work.kind === 'proyecto' && (
          <label className="flex flex-col gap-1.5">
            <span className={label}>{t('Categoría')}</span>
            <select
              value={work.category ?? 'colegio'}
              onChange={(e) => onPatch({ category: e.target.value as 'colegio' | 'casa' })}
              className={s.field}
            >
              <option value="colegio">{t('Colegio')}</option>
              <option value="casa">{t('Casa')}</option>
            </select>
          </label>
        )}
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
