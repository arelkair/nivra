import { useState } from 'react'
import { TYPES, reorder, shortDate, type Grade, type Notepad, type Subject, type Work } from '../lib/store'
import { notifyWithUndo } from '../lib/undo'
import { Empty, Icon, Label, Modal, button, card, input, select } from '../components/ui'

type Props = {
  works: Work[]
  setWorks: (update: (prev: Work[]) => Work[]) => void
  subjects: Subject[]
  notepads: Notepad[]
  setNotepads: (update: (prev: Notepad[]) => Notepad[]) => void
  grades: Grade[]
}

export function Exams({ works, setWorks, subjects, notepads, setNotepads, grades }: Props) {
  const [kind, setKind] = useState<'examen' | 'proyecto'>('examen')
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = works.find((w) => w.id === editingId)

  const patch = (id: string, changes: Partial<Work>) =>
    setWorks((prev) => prev.map((w) => (w.id === id ? { ...w, ...changes } : w)))
  const remove = (id: string) => {
    const before = works
    const title = works.find((w) => w.id === id)?.title ?? ''
    setWorks((prev) => prev.filter((w) => w.id !== id))
    notifyWithUndo(`«${title}» eliminado`, () => setWorks(() => before))
  }

  const exams = works.filter((w) => w.kind === 'examen')
  const projects = works.filter((w) => w.kind === 'proyecto')
  const moveWork = (id: string, step: number) =>
    setWorks((prev) => reorder(prev, prev.findIndex((w) => w.id === id), step))

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 sm:gap-8">
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          const form = ev.currentTarget
          const data = new FormData(form)
          const title = String(data.get('title') ?? '').trim()
          const date = String(data.get('date') ?? '')
          if (!title) return
          if (kind === 'examen' && !date) return
          setWorks((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              kind,
              title,
              date: date || undefined,
              subject: String(data.get('subject') ?? '') || undefined,
              category: kind === 'proyecto' ? 'colegio' : undefined,
            },
          ])
          form.reset()
        }}
        className={`${card} flex flex-col gap-2 p-4 sm:p-5`}
      >
        <div className="flex gap-2">
          {(['examen', 'proyecto'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm transition-colors ${
                kind === k
                  ? 'bg-neutral-900 font-medium text-white dark:bg-neutral-100 dark:text-neutral-900'
                  : 'border border-black/[0.07] text-neutral-500 hover:bg-black/[0.04] dark:border-white/[0.08] dark:text-neutral-400 dark:hover:bg-white/[0.06]'
              }`}
            >
              {TYPES[k].label}
            </button>
          ))}
        </div>
        <input
          name="title"
          maxLength={80}
          required
          placeholder={kind === 'examen' ? 'Nuevo examen' : 'Nuevo proyecto'}
          className={input}
        />
        {subjects.length > 0 && (
          <select name="subject" defaultValue="" aria-label="Asignatura" className={select}>
            <option value="">Sin asignatura</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <input
            name="date"
            type="date"
            required={kind === 'examen'}
            aria-label={kind === 'examen' ? 'Fecha (obligatoria)' : 'Fecha (opcional)'}
            className={input}
          />
          <button type="submit" className={`${button} shrink-0`}>
            Añadir
          </button>
        </div>
        <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
          {kind === 'examen' ? 'Fecha obligatoria. Sale en rojo.' : 'Fecha opcional. Sale en verde.'}
        </p>
      </form>

      <section className={`${card} animate-[fade-in_0.35s_ease-out] p-5 sm:p-6`}>
        <Label>Exámenes · {exams.length}</Label>
        {exams.length === 0 ? (
          <Empty>Sin exámenes.</Empty>
        ) : (
          <ul className="flex flex-col">
            {exams.map((w) => (
              <Row
                key={w.id}
                work={w}
                subjects={subjects}
                grade={grades.find((g) => g.work === w.id)?.value}
                onOpen={setEditingId}
                onRemove={remove}
                onMove={(step) => moveWork(w.id, step)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className={`${card} animate-[fade-in_0.35s_ease-out_0.05s_both] p-5 sm:p-6`}>
        <Label>Proyectos · {projects.length}</Label>
        {projects.length === 0 ? (
          <Empty>Sin proyectos.</Empty>
        ) : (
          <ul className="flex flex-col">
            {projects.map((w) => (
              <Row
                key={w.id}
                work={w}
                subjects={subjects}
                grade={grades.find((g) => g.work === w.id)?.value}
                onOpen={setEditingId}
                onRemove={remove}
                onMove={(step) => moveWork(w.id, step)}
              />
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <WorkDialog
          work={editing}
          subjects={subjects}
          notepads={notepads}
          setNotepads={setNotepads}
          onClose={() => setEditingId(null)}
          onPatch={(changes) => patch(editing.id, changes)}
        />
      )}
    </div>
  )
}

function Row({
  work,
  subjects,
  grade,
  onOpen,
  onRemove,
  onMove,
}: {
  work: Work
  subjects: Subject[]
  grade?: number
  onOpen: (id: string) => void
  onRemove: (id: string) => void
  onMove: (step: number) => void
}) {
  const subject = subjects.find((s) => s.id === work.subject)
  return (
    <li className="flex items-center gap-3 border-b border-black/[0.06] py-3 last:border-0 dark:border-white/[0.08]">
      <span className={`h-2 w-2 shrink-0 rounded-full ${TYPES[work.kind].dot}`} />
      <button type="button" onClick={() => onOpen(work.id)} className="min-w-0 flex-1 text-left" title="Editar">
        <span className="block truncate text-sm">{work.title}</span>
        <span className="mt-0.5 flex gap-2 text-[0.65rem] text-neutral-400 dark:text-neutral-500">
          {work.date ? (
            <span className={`rounded px-1.5 ${TYPES[work.kind].chip}`}>{shortDate(work.date)}</span>
          ) : (
            <span>Sin fecha</span>
          )}
          {subject && (
            <span className="rounded px-1.5 text-white" style={{ background: subject.color }}>
              {subject.name}
            </span>
          )}
          {work.notepad && <span>Con bloc</span>}
          {work.category && <span className="capitalize">{work.category}</span>}
          {work.desc && <span className="truncate">{work.desc}</span>}
        </span>
      </button>
      {grade !== undefined && (
        <span
          title="Nota obtenida"
          className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-sm font-medium tabular-nums ${
            grade >= 5
              ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200'
          }`}
        >
          {grade}
        </span>
      )}

      <span className="flex shrink-0 flex-col">
        <button
          type="button"
          onClick={() => onMove(-1)}
          aria-label={`Subir ${work.title}`}
          className="text-neutral-300 hover:text-neutral-900 dark:text-neutral-600 dark:hover:text-white"
        >
          <Icon name="up" className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          aria-label={`Bajar ${work.title}`}
          className="text-neutral-300 hover:text-neutral-900 dark:text-neutral-600 dark:hover:text-white"
        >
          <Icon name="down" className="h-3 w-3" />
        </button>
      </span>

      <button
        type="button"
        onClick={() => onRemove(work.id)}
        aria-label={`Eliminar ${work.title}`}
        className="shrink-0 text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
      >
        <Icon name="trash" className="h-4 w-4" />
      </button>
    </li>
  )
}

function WorkDialog({
  work,
  subjects,
  notepads,
  setNotepads,
  onClose,
  onPatch,
}: {
  work: Work
  subjects: Subject[]
  notepads: Notepad[]
  setNotepads: (update: (prev: Notepad[]) => Notepad[]) => void
  onClose: () => void
  onPatch: (changes: Partial<Work>) => void
}) {
  const createNotepad = () => {
    const id = crypto.randomUUID()
    setNotepads((prev) => [...prev, { id, title: work.title, pages: [{ id: id + '-1', html: '' }] }])
    onPatch({ notepad: id })
  }

  return (
    <Modal title={TYPES[work.kind].label} onClose={onClose}>
      <div className="flex flex-col gap-2">
        <input
          value={work.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          maxLength={80}
          aria-label="Título"
          className={input}
        />
        <textarea
          value={work.desc ?? ''}
          onChange={(e) => onPatch({ desc: e.target.value })}
          maxLength={300}
          rows={3}
          placeholder="Descripción"
          aria-label="Descripción"
          className={input}
        />
        <input
          type="date"
          value={work.date ?? ''}
          onChange={(e) =>
            onPatch({ date: e.target.value || (work.kind === 'examen' ? work.date : undefined) })
          }
          required={work.kind === 'examen'}
          aria-label="Fecha"
          className={input}
        />

        <select
          value={work.subject ?? ''}
          onChange={(e) => onPatch({ subject: e.target.value || undefined })}
          aria-label="Asignatura"
          className={select}
        >
          <option value="">Sin asignatura</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <select
            value={work.notepad ?? ''}
            onChange={(e) => onPatch({ notepad: e.target.value || undefined })}
            aria-label="Bloc de notas"
            className={select}
          >
            <option value="">Sin bloc de notas</option>
            {notepads.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </select>
          <button type="button" onClick={createNotepad} className={button + ' shrink-0'}>
            Nuevo
          </button>
        </div>

        {work.kind === 'proyecto' && (
          <>
            <select
              value={work.category ?? 'colegio'}
              onChange={(e) => onPatch({ category: e.target.value as 'colegio' | 'casa' })}
              aria-label="Categoría"
              className={select}
            >
              <option value="colegio">Colegio</option>
              <option value="casa">Casa</option>
            </select>
            <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
              La categoría no sale en el calendario.
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}
