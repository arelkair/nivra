import { useState } from 'react'
import { restoreVersion, VERSIONS_KEY, type NoteVersion } from '../lib/dataLifecycle'
import { useLocalResource } from '../lib/useLocalResource'
import { formatDate, t } from '../lib/i18n'
import { Modal, button, ghost } from './ui'

export function NoteHistory({ noteId, source = 'nivra-vault', onClose }: { noteId: string; source?: string; onClose: () => void }) {
  const all = useLocalResource<NoteVersion[]>(VERSIONS_KEY, [])
  const versions = all.filter(version => version.noteId === noteId && version.source === source)
  const [selected, setSelected] = useState<string | null>(null), [message, setMessage] = useState('')
  const active = versions.find(version => version.id === selected) ?? versions[0]
  const preview = !active ? '' : source === 'nivra-notepads' ? (Array.isArray(active.note.pages) ? active.note.pages.map(page => String((page as { html?: unknown }).html ?? '')).join('\n\n') : String(active.note.html ?? '')).replace(/<[^>]*>/g, '') : String(active.note.body ?? '')
  return <Modal title={t('Historial de versiones')} onClose={onClose} size="wide"><p className="mb-4 text-sm text-(--minimal-muted)">{t('Se conservan hasta 50 versiones por nota, con puntos de guardado cada 30 segundos de edición. Restaurar conserva también la versión actual.')}</p>{!active ? <p className="py-6 text-sm">{t('Todavía no hay versiones anteriores.')}</p> : <div className="grid items-start gap-4 sm:grid-cols-[12rem_1fr]"><div className="flex max-h-80 flex-col gap-1 overflow-y-auto">{versions.map(version => <button type="button" key={version.id} aria-pressed={version.id === active.id} className={`${ghost} text-left ${version.id === active.id ? 'bg-(--sunken)' : ''}`} onClick={() => setSelected(version.id)}>{formatDate(new Date(version.savedAt), { day: 'numeric', month: 'short' })} · {new Date(version.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</button>)}</div><div className="flex min-w-0 flex-col gap-3"><h3 className="break-words text-lg font-medium">{String(active.note.title ?? '')}</h3><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded bg-(--sunken) p-3 text-sm">{preview}</pre><button className={`${button} self-start`} onClick={() => { try { restoreVersion(active); setMessage(t('Versión restaurada.')) } catch (cause) { setMessage(t((cause as Error).message)) } }}>{t('Restaurar esta versión')}</button>{message && <p role="status" className="text-sm">{message}</p>}</div></div>}</Modal>
}
