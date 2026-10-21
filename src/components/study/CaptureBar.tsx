import { useState } from 'react'
import { t } from '../../lib/i18n'
import { parseCapture } from '../../lib/study'
import type { Subject, Task, Work } from '../../lib/store'
import { button, input } from '../ui'

export function CaptureBar({ subjects, setTasks, setWorks, autoFocus = false }: { subjects: Subject[]; setTasks: (fn: (tasks: Task[]) => Task[]) => void; setWorks: (fn: (works: Work[]) => Work[]) => void; autoFocus?: boolean }) {
  const [text, setText] = useState(''), [message, setMessage] = useState('')
  const preview = parseCapture(text, subjects)
  return <form className="nv-panel flex flex-col gap-2 border p-3" onSubmit={event => {
    event.preventDefault()
    if (!text.trim()) return
    if (preview.kind === 'tarea') setTasks(rows => [...rows, { id: crypto.randomUUID(), title: preview.title, date: preview.date || undefined, subject: preview.subject || undefined, done: false, subtasks: [] }])
    else setWorks(rows => [...rows, { id: crypto.randomUUID(), kind: preview.kind as 'examen' | 'proyecto', title: preview.title, date: preview.date || undefined, subject: preview.subject || undefined }])
    setText(''); setMessage(t('Captura guardada.'))
  }}><label htmlFor="study-capture" className="text-xs text-(--minimal-muted)">{t('Captura rápida')}</label><div className="flex gap-2"><input autoFocus={autoFocus} id="study-capture" value={text} onChange={e => { setText(e.target.value); setMessage('') }} maxLength={300} placeholder={t('examen mates viernes')} className={`${input} min-w-0 flex-1`} /><button className={button}>{t('Añadir')}</button></div>{text && <p className="text-xs text-(--minimal-muted)">{t(preview.kind === 'tarea' ? 'Tarea' : preview.kind === 'examen' ? 'Examen' : 'Proyecto')} · {preview.title} · {preview.date || t('Sin fecha')}{preview.subject && ` · ${subjects.find(s => s.id === preview.subject)?.name}`}</p>}{message && <p role="status" className="text-xs">{message}</p>}</form>
}
