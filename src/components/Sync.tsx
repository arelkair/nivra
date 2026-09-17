import {
  withDashes,
  connect,
  saveSyncState,
  readSyncState,
  normalizeCode,
  newCode,
  pushChanges,
  SYNC_VISUAL_KEY,
  type SyncState,
} from '../lib/sync'
import { useStored } from '../lib/store'
import { Icon, Label, Switch, button, input, line } from './ui'
import { locale, t, tp } from '../lib/i18n'
import { useState } from 'react'

export function SyncPanel({
  status,
  setStatus,
}: {
  status: SyncState | null
  setStatus: (e: SyncState | null) => void
}) {
  const [visible, setVisible] = useState(false)
  const [working, setWorking] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [syncVisual, setSyncVisual] = useStored(SYNC_VISUAL_KEY, true)

  const create = async () => {
    setWorking(true)
    setToast(null)
    try {
      const generated = await pushChanges({ code: normalizeCode(newCode()), lastSeen: null })
      setStatus(generated)
      setVisible(true)
      setToast('Listo. Copia el código y pégalo en el otro dispositivo.')
    } catch (e) {
      setToast(`No se pudo activar: ${(e as Error).message}`)
    }
    setWorking(false)
  }

  const linkDevice = async (code: string) => {
    setWorking(true)
    setToast(null)
    try {
      const r = await connect(code)
      setStatus(readSyncState())
      setToast(
        r.created
          ? 'Código nuevo: se han subido tus datos.'
          : r.change
            ? 'Conectado. Datos del otro dispositivo descargados.'
            : 'Conectado. Ya estabais igual.',
      )
    } catch (e) {
      setToast(`No se pudo conectar: ${(e as Error).message}`)
    }
    setWorking(false)
  }

  return (
    <div>
      <Label>{t('Sincronización')}</Label>

      {status ? (
        <div className="flex flex-col gap-2">
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${line}`}>
            <span className="min-w-0 flex-1 truncate font-mono text-sm tracking-wider">
              {visible ? withDashes(status.code) : '••••-••••-••••-••••'}
            </span>
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              className="shrink-0 text-xs text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
            >
              {visible ? t('Ocultar') : t('Ver')}
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(withDashes(status.code))
                setToast('Código copiado.')
              }}
              aria-label={t('Copiar código')}
              className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
            >
              <Icon name="link" className="h-4 w-4" />
            </button>
          </div>

          <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
            {status.error
              ? tp('Último intento fallido: {0}', status.error)
              : status.lastSeen
                ? `Al día · ${new Date(status.lastSeen).toLocaleTimeString(locale())} · se comprueba cada 4 s`
                : 'Sin sincronizar todavía.'}
          </p>

          <Switch
            checked={!syncVisual}
            onChange={(v) => setSyncVisual(!v)}
            label={t('Mantener el aspecto propio de este dispositivo')}
            hint={t(
              'Colores, fondo, sonidos y temas no se sincronizan; el resto de tus datos (asignaturas, tareas, notas…) sí.',
            )}
          />

          <button
            type="button"
            onClick={() => {
              saveSyncState(null)
              setStatus(null)
              setToast('Este dispositivo ya no se sincroniza. Tus datos siguen aquí.')
            }}
            className="w-fit text-xs text-neutral-400 transition-colors hover:text-red-500"
          >
            {t('Desconectar este dispositivo')}
          </button>
        </div>
      ) : (
        <button type="button" onClick={create} disabled={working} className={`${button} w-full`}>
          {working ? t('Activando…') : t('Crear mi código')}
        </button>
      )}

      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          const form = ev.currentTarget
          const code = String(new FormData(form).get('codigo') ?? '')
          if (normalizeCode(code).length !== 16) {
            setToast('El código tiene 16 caracteres.')
            return
          }
          linkDevice(code)
          form.reset()
        }}
        className="mt-3 flex gap-2"
      >
        <input
          name="codigo"
          placeholder={t('Código de otro dispositivo')}
          aria-label={t('Código de otro dispositivo')}
          className={`${input} font-mono tracking-wider`}
        />
        <button type="submit" disabled={working} className={`${button} shrink-0`}>
          {t('Unir')}
        </button>
      </form>

      {toast && <p className="mt-2 text-[0.7rem] text-neutral-500 dark:text-neutral-400">{toast}</p>}

      <p className="mt-2 text-[0.7rem] text-neutral-400 dark:text-neutral-500">
        {t('Los datos se cifran en tu navegador con el código antes de salir. El servidor guarda algo que no puede leer, y sin el código no hay forma de recuperarlo.')}
      </p>
    </div>
  )
}
