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
import { Icon, Label } from './ui'
import { locale, t, tp } from '../lib/i18n'
import { useState } from 'react'
import { AccountConnected, GoogleAccount } from './Account'
import { classicUi, type SyncUi } from './syncUi'

export function SyncPanel({
  status,
  setStatus,
  ui = classicUi,
  showTitle = true,
}: {
  status: SyncState | null
  setStatus: (e: SyncState | null) => void
  ui?: SyncUi
  showTitle?: boolean
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

  if (status?.account)
    return (
      <div>
        {showTitle && <Label>{t('Sincronización')}</Label>}
        <AccountConnected status={status} setStatus={setStatus} onMessage={setToast} ui={ui} />
        {toast && <p className={`mt-2 text-[0.7rem] ${ui.muted}`}>{toast}</p>}
        <p className={`mt-2 text-[0.7rem] ${ui.faint}`}>
          {t('Los datos se cifran en tu navegador con tu frase de paso antes de salir. El servidor guarda algo que no puede leer, y sin la frase no hay forma de recuperarlo.')}
        </p>
      </div>
    )

  return (
    <div>
      {showTitle && <Label>{t('Sincronización')}</Label>}

      {!status && (
        <>
          <GoogleAccount setStatus={setStatus} onMessage={setToast} ui={ui} />
          <p className={`my-3 text-center text-[0.7rem] ${ui.faint}`}>
            {t('o con un código, sin cuenta')}
          </p>
        </>
      )}

      {status ? (
        <div className="flex flex-col gap-2">
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${ui.line}`}>
            <span className="min-w-0 flex-1 truncate font-mono text-sm tracking-wider">
              {visible ? withDashes(status.code ?? '') : '••••-••••-••••-••••'}
            </span>
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              className={`shrink-0 text-xs ${ui.faint} transition-colors ${ui.hoverText}`}
            >
              {visible ? t('Ocultar') : t('Ver')}
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(withDashes(status.code ?? ''))
                setToast('Código copiado.')
              }}
              aria-label={t('Copiar código')}
              className={`shrink-0 ${ui.faint} transition-colors ${ui.hoverText}`}
            >
              <Icon name="link" className="h-4 w-4" />
            </button>
          </div>

          <p className={`text-[0.7rem] ${ui.faint}`}>
            {status.error
              ? tp('Último intento fallido: {0}', status.error)
              : status.lastSeen
                ? `Al día · ${new Date(status.lastSeen).toLocaleTimeString(locale())} · se comprueba cada 4 s`
                : 'Sin sincronizar todavía.'}
          </p>

          <ui.Switch
            checked={!syncVisual}
            onChange={(v) => setSyncVisual(!v)}
            label={t('Mantener el aspecto propio de este dispositivo')}
            hint={t(
              'Colores, fondo, sonidos, temas e Initiative no se sincronizan; el resto de tus datos (asignaturas, tareas, notas…) sí.',
            )}
          />

          <button
            type="button"
            onClick={() => {
              saveSyncState(null)
              setStatus(null)
              setToast('Este dispositivo ya no se sincroniza. Tus datos siguen aquí.')
            }}
            className={`w-fit text-xs ${ui.faint} transition-colors hover:text-red-500`}
          >
            {t('Desconectar este dispositivo')}
          </button>
        </div>
      ) : (
        <button type="button" onClick={create} disabled={working} className={`${ui.button} w-full`}>
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
          className={`${ui.input} font-mono tracking-wider`}
        />
        <button type="submit" disabled={working} className={`${ui.button} shrink-0`}>
          {t('Unir')}
        </button>
      </form>

      {toast && <p className={`mt-2 text-[0.7rem] ${ui.muted}`}>{toast}</p>}

      <p className={`mt-2 text-[0.7rem] ${ui.faint}`}>
        {t('Los datos se cifran en tu navegador con el código antes de salir. El servidor guarda algo que no puede leer, y sin el código no hay forma de recuperarlo.')}
      </p>
    </div>
  )
}
