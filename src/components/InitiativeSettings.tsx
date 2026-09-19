import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from './ui'
import { t } from '../lib/i18n'
import { skin } from './initiative/skin'
import { deleteSnapshot, listSnapshots, restoreSnapshot, snapshotNow, type Snapshot } from '../lib/autoBackup'
import { exportJson, importJson } from '../lib/backup'
import { notify } from '../lib/undo'
import { SUBJECT_COLORS, hasSubject, reorder, subjectId, type Subject } from '../lib/store'

export function InitiativeSettings({
  dark,
  subjects,
  detected,
  setSubjects,
  onClose,
  onDisable,
  name,
  onName,
}: {
  dark: boolean
  subjects: Subject[]
  detected: Subject[]
  setSubjects: (update: (prev: Subject[]) => Subject[]) => void
  onClose: () => void
  onDisable: () => void
  name: string
  onName: (name: string) => void
}) {
  const s = skin(dark)
  const ref = useRef<HTMLDialogElement>(null)
  const [newName, setNewName] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [confirm, setConfirm] = useState<string | null>(null)
  const refresh = useCallback(() => {
    listSnapshots().then(setSnapshots, () => setSnapshots([]))
  }, [])
  useEffect(refresh, [refresh])
  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto max-h-[90svh] w-[min(100%-1.5rem,28rem)] overflow-y-auto rounded-3xl border p-6 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm ${s.line} ${
        dark ? 'bg-[#131316] text-neutral-100 [color-scheme:dark]' : 'bg-white text-neutral-900'
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <h3 className="mr-auto text-lg font-semibold">{t('Ajustes de Initiative')}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('Cerrar')}
          className={`transition-colors ${s.faint} ${s.hoverText}`}
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

      <label className="mb-4 flex flex-col gap-1.5">
        <span className={`text-xs ${s.muted}`}>{t('¿Cuál es tu nombre?')}</span>
        <input value={name} onChange={(e) => onName(e.target.value)} maxLength={30} className={s.field} />
      </label>

      <div className={`mb-4 flex flex-col gap-2 border-t pt-4 ${s.line}`}>
        <span className={`text-xs ${s.muted}`}>{t('Asignaturas')}</span>
        <form
          onSubmit={(ev) => {
            ev.preventDefault()
            const name = newName.trim()
            if (!name) return
            setSubjects((prev) =>
              hasSubject(prev, name)
                ? prev
                : [...prev, { id: subjectId(name), name, color: SUBJECT_COLORS[prev.length % SUBJECT_COLORS.length] }],
            )
            setNewName('')
          }}
          className="flex gap-2"
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={40}
            placeholder={t('Nueva asignatura')}
            aria-label={t('Nueva asignatura')}
            className={s.field}
          />
          <button type="submit" aria-label={t('Añadir asignatura')} className={`shrink-0 rounded-lg px-3 ${s.primary}`}>
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </form>
        {subjects.length === 0 && <p className={`text-xs ${s.faint}`}>{t('Sin asignaturas.')}</p>}
        <ul className="flex flex-col">
          {subjects.map((sub, i) => (
            <li key={sub.id} className={`flex items-center gap-3 border-b py-2 last:border-0 ${s.line}`}>
              <input
                type="color"
                value={sub.color}
                onChange={(e) => setSubjects((prev) => prev.map((x) => (x.id === sub.id ? { ...x, color: e.target.value } : x)))}
                aria-label={`Color de ${sub.name}`}
                className="h-6 w-6 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0"
              />
              <span className="min-w-0 flex-1 truncate text-sm">{sub.name}</span>
              <button
                type="button"
                onClick={() => setSubjects((prev) => reorder(prev, i, -1))}
                aria-label={`Subir ${sub.name}`}
                className={`shrink-0 ${s.muted} ${s.hoverText}`}
              >
                <Icon name="up" className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setSubjects((prev) => prev.filter((x) => x.id !== sub.id))}
                aria-label={`Eliminar ${sub.name}`}
                className={`shrink-0 ${s.muted} transition-colors hover:text-red-500`}
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        {detected.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className={`text-[0.7rem] ${s.faint}`}>{t('Detectadas en el horario')}</span>
            <div className="flex flex-wrap gap-1.5">
              {detected.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSubjects((prev) => (hasSubject(prev, sub.name) ? prev : [...prev, sub]))}
                  title={t('Guardar en mis asignaturas')}
                  className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition-colors ${s.line} ${s.muted} ${s.hover}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: sub.color }} />
                  {sub.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={`mb-4 flex flex-col gap-2 border-t pt-4 ${s.line}`}>
        <span className={`text-xs ${s.muted}`}>{t('Copias de seguridad')}</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportJson} className={s.ghost}>
            {t('Descargar copia')}
          </button>
          <button type="button" onClick={() => file.current?.click()} className={s.ghost}>
            {t('Importar copia')}
          </button>
          <button
            type="button"
            onClick={() => snapshotNow(true).then(refresh, () => notify(t('No se pudo guardar la copia.')))}
            className={s.ghost}
          >
            {t('Guardar copia ahora')}
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              try {
                await importJson(f)
                location.reload()
              } catch (err) {
                notify((err as Error).message)
              }
            }}
          />
        </div>
        <p className={`text-[0.7rem] ${s.faint}`}>
          {t('Cada día se guarda una copia automática en este navegador (se conservan las últimas 14).')}
        </p>
        {snapshots.length > 0 && (
          <ul className="flex flex-col">
            {snapshots.map((snap) => (
              <li key={snap.date} className={`flex items-center gap-3 border-b py-2 text-sm last:border-0 ${s.line}`}>
                <span className="flex-1 font-mono text-xs">{snap.date}</span>
                <span className={`text-[0.7rem] ${s.faint}`}>{Object.keys(snap.data).length} {t('apartados')}</span>
                {confirm === snap.date ? (
                  <button
                    type="button"
                    onClick={() => restoreSnapshot(snap.date).then(() => location.reload(), (err: Error) => notify(err.message))}
                    className="text-xs text-red-500"
                  >
                    {t('Confirmar')}
                  </button>
                ) : (
                  <button type="button" onClick={() => setConfirm(snap.date)} className={`text-xs ${s.muted} ${s.hoverText}`}>
                    {t('Restaurar')}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={t('Eliminar')}
                  onClick={() => deleteSnapshot(snap.date).then(refresh)}
                  className={`${s.muted} transition-colors hover:text-red-500`}
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className={`mb-4 text-sm ${s.muted}`}>
        {t('Initiative sigue en fase beta. Por ahora, esto es todo lo que puedes ajustar aquí.')}
      </p>

      <button
        type="button"
        onClick={onDisable}
        className={`w-full rounded-2xl px-6 py-3 text-sm font-medium transition-opacity hover:opacity-80 ${s.primary}`}
      >
        {t('Desactivar Initiative (beta)')}
      </button>
    </dialog>
  )
}
