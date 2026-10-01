import { useCallback, useEffect, useState } from 'react'
import {
  MIN_PASSPHRASE,
  accountVaultExists,
  connectAccount,
  deleteCloudData,
  disconnectAccount,
  readSyncState,
  signInWithGoogle,
  SYNC_VISUAL_KEY,
  type SyncState,
} from '../lib/sync'
import { authPending, getSession, markReturnToSync, takeAuthError } from '../lib/supabase'
import { useStored } from '../lib/store'
import { locale, t, tp } from '../lib/i18n'
import { Switch, button, ghost, input, line } from './ui'

type Props = {
  status: SyncState | null
  setStatus: (e: SyncState | null) => void
  onMessage: (text: string | null) => void
}

type Phase = 'loading' | 'out' | { email: string }

const message = (e: unknown) => t((e as Error).message ?? String(e))

export function GoogleAccount({ setStatus, onMessage }: Omit<Props, 'status'>) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [exists, setExists] = useState<boolean | null>(null)
  const [working, setWorking] = useState(false)

  const refresh = useCallback(async () => {
    if (!authPending()) {
      setPhase('out')
      return
    }
    try {
      const session = await getSession()
      const failed = takeAuthError()
      if (failed) onMessage(`${t('No se pudo iniciar sesión')}: ${failed}`)
      if (!session) {
        setPhase('out')
        return
      }
      setPhase({ email: session.user.email ?? '' })
      setExists(await accountVaultExists())
    } catch (e) {
      onMessage(message(e))
      setPhase('out')
    }
  }, [onMessage])

  useEffect(() => {
    refresh()
  }, [refresh])

  const start = async () => {
    setWorking(true)
    onMessage(null)
    try {
      markReturnToSync()
      await signInWithGoogle()
    } catch (e) {
      onMessage(message(e))
      setWorking(false)
    }
  }

  const leave = async () => {
    await disconnectAccount()
    setPhase('out')
    setExists(null)
  }

  const submit = async (form: HTMLFormElement) => {
    const data = new FormData(form)
    const passphrase = String(data.get('frase') ?? '')
    const repeat = String(data.get('repetir') ?? '')
    if (!exists && passphrase !== repeat) {
      onMessage(t('Las dos frases de paso no coinciden.'))
      return
    }
    setWorking(true)
    onMessage(null)
    try {
      const r = await connectAccount(passphrase)
      setStatus(readSyncState())
      onMessage(
        r.created
          ? t('Cuenta conectada: se han subido tus datos, cifrados.')
          : r.change
            ? t('Cuenta conectada. Datos de tu cuenta descargados.')
            : t('Cuenta conectada. Ya estabais igual.'),
      )
      form.reset()
    } catch (e) {
      onMessage(message(e))
    }
    setWorking(false)
  }

  if (phase === 'loading') return null

  if (phase === 'out') {
    return (
      <div className="flex flex-col gap-2">
        <button type="button" onClick={start} disabled={working} className={`${button} w-full`}>
          {working ? t('Abriendo Google…') : t('Continuar con Google')}
        </button>
        <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
          {t('Crea tu cuenta o entra con ella en cualquier dispositivo. Google solo te identifica: tus datos se cifran con una frase de paso que no sale de tu dispositivo.')}
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault()
        submit(ev.currentTarget)
      }}
      className="flex flex-col gap-2"
    >
      <p className="text-sm">
        {tp('Sesión iniciada como {0}', phase.email)}
      </p>
      {exists === null ? null : (
        <>
          <input
            name="frase"
            type="password"
            required
            autoComplete={exists ? 'current-password' : 'new-password'}
            placeholder={exists ? t('Frase de paso') : t('Elige una frase de paso')}
            aria-label={t('Frase de paso')}
            className={input}
          />
          {!exists && (
            <input
              name="repetir"
              type="password"
              required
              minLength={MIN_PASSPHRASE}
              autoComplete="new-password"
              placeholder={t('Repite la frase de paso')}
              aria-label={t('Repite la frase de paso')}
              className={input}
            />
          )}
          <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
            {exists
              ? t('Esta cuenta ya tiene datos. Introduce la frase de paso que elegiste en su día.')
              : t('Mínimo 12 caracteres. Cifra tus datos en tu dispositivo; si la olvidas no hay forma de recuperarlos.')}
          </p>
          <div className="flex gap-2">
            <button type="submit" disabled={working} className={`${button} flex-1`}>
              {working ? t('Conectando…') : exists ? t('Conectar') : t('Crear cuenta')}
            </button>
            <button type="button" onClick={leave} disabled={working} className={`${ghost} shrink-0`}>
              {t('Cambiar de cuenta')}
            </button>
          </div>
        </>
      )}
    </form>
  )
}

export function AccountConnected({ status, setStatus, onMessage }: Props) {
  const [syncVisual, setSyncVisual] = useStored(SYNC_VISUAL_KEY, true)
  const [confirming, setConfirming] = useState(false)
  const [working, setWorking] = useState(false)

  const run = async (action: () => Promise<void>, done: string) => {
    setWorking(true)
    try {
      await action()
      setStatus(null)
      onMessage(done)
    } catch (e) {
      onMessage(message(e))
    }
    setWorking(false)
    setConfirming(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${line}`}>
        <span className="min-w-0 flex-1 truncate text-sm">{status?.account?.email}</span>
        <span className="shrink-0 text-xs text-neutral-400">Google</span>
      </div>

      <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
        {status?.error
          ? tp('Último intento fallido: {0}', t(status.error))
          : status?.lastSeen
            ? tp('Al día · {0} · se comprueba cada 4 s', new Date(status.lastSeen).toLocaleTimeString(locale()))
            : t('Sin sincronizar todavía.')}
      </p>

      <Switch
        checked={!syncVisual}
        onChange={(v) => setSyncVisual(!v)}
        label={t('Mantener el aspecto propio de este dispositivo')}
        hint={t(
          'Colores, fondo, sonidos, temas e Initiative no se sincronizan; el resto de tus datos (asignaturas, tareas, notas…) sí.',
        )}
      />

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <button
          type="button"
          disabled={working}
          onClick={() =>
            run(disconnectAccount, t('Sesión cerrada. Tus datos siguen en este dispositivo y en la nube.'))
          }
          className="w-fit text-xs text-neutral-400 transition-colors hover:text-red-500"
        >
          {t('Cerrar sesión en este dispositivo')}
        </button>
        {confirming ? (
          <button
            type="button"
            disabled={working}
            onClick={() =>
              status &&
              run(
                () => deleteCloudData(status),
                t('Datos de la nube borrados. Tus datos siguen en este dispositivo.'),
              )
            }
            className="w-fit text-xs text-red-500"
          >
            {t('Confirmar: borrar mis datos de la nube')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="w-fit text-xs text-neutral-400 transition-colors hover:text-red-500"
          >
            {t('Borrar mis datos de la nube')}
          </button>
        )}
      </div>
    </div>
  )
}
