import { useCallback, useEffect, useState } from 'react'
import {
  MIN_PASSPHRASE,
  accountVaultExists,
  connectAccount,
  deleteCloudData,
  disconnectAccount,
  readSyncState,
  sendPasswordReset,
  setNewPassword,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  MIN_PASSWORD,
  SYNC_VISUAL_KEY,
  type SyncState,
} from '../lib/sync'
import { authPending, getSession, markReturnToSync, takeAuthError, isRecovering, clearRecovery } from '../lib/supabase'
import { useStored } from '../lib/store'
import { locale, t, tp } from '../lib/i18n'
import { classicUi, type SyncUi } from './syncUi'

type Props = {
  status: SyncState | null
  setStatus: (e: SyncState | null) => void
  onMessage: (text: string | null) => void
  ui?: SyncUi
}

type Phase = 'loading' | 'out' | 'recovery' | { email: string }

const message = (e: unknown) => t((e as Error).message ?? String(e))

const field = (form: HTMLFormElement, name: string) =>
  String(new FormData(form).get(name) ?? '').trim()

export function AccountSignIn({
  setStatus,
  onMessage,
  migrate = false,
  ui = classicUi,
}: Omit<Props, 'status'> & { migrate?: boolean }) {
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
      if (isRecovering()) {
        setPhase('recovery')
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

  const guard = async (action: () => Promise<void>) => {
    setWorking(true)
    onMessage(null)
    try {
      await action()
    } catch (e) {
      onMessage(message(e))
    }
    setWorking(false)
  }

  const google = () =>
    guard(async () => {
      markReturnToSync()
      await signInWithGoogle()
    })

  const credentials = (form: HTMLFormElement, forSignUp: boolean) => {
    const email = field(form, 'correo')
    const password = String(new FormData(form).get('clave') ?? '')
    if (!email || !password) {
      onMessage(t('Escribe tu correo y tu contraseña.'))
      return null
    }
    if (forSignUp && password.length < MIN_PASSWORD) {
      onMessage(t('La contraseña debe tener al menos 8 caracteres.'))
      return null
    }
    return { email, password }
  }

  const signIn = (form: HTMLFormElement) => {
    const c = credentials(form, false)
    if (!c) return
    guard(async () => {
      await signInWithEmail(c.email, c.password)
      await refresh()
    })
  }

  const signUp = (form: HTMLFormElement) => {
    const c = credentials(form, true)
    if (!c) return
    guard(async () => {
      const r = await signUpWithEmail(c.email, c.password)
      if (r.confirmed) await refresh()
      else
        onMessage(
          t('Te hemos enviado un correo para confirmar tu cuenta. Ábrelo en este navegador y después entra con tu contraseña. Si ya tenías cuenta, entra con ella.'),
        )
    })
  }

  const reset = (form: HTMLFormElement) => {
    const email = field(form, 'correo')
    if (!email) {
      onMessage(t('Escribe tu correo para recibir el enlace.'))
      return
    }
    guard(async () => {
      await sendPasswordReset(email)
      onMessage(t('Si el correo existe, recibirás un enlace para elegir una contraseña nueva. Ábrelo en este mismo navegador.'))
    })
  }

  const choosePassword = (form: HTMLFormElement) => {
    const password = String(new FormData(form).get('clave') ?? '')
    if (password.length < MIN_PASSWORD) {
      onMessage(t('La contraseña debe tener al menos 8 caracteres.'))
      return
    }
    if (password !== String(new FormData(form).get('repetir') ?? '')) {
      onMessage(t('Las dos contraseñas no coinciden.'))
      return
    }
    guard(async () => {
      await setNewPassword(password)
      clearRecovery()
      onMessage(t('Contraseña actualizada.'))
      await refresh()
    })
  }

  const leave = async () => {
    clearRecovery()
    await disconnectAccount({ keepState: migrate })
    setPhase('out')
    setExists(null)
  }

  const connect = (form: HTMLFormElement) => {
    const data = new FormData(form)
    const passphrase = String(data.get('frase') ?? '')
    const repeat = String(data.get('repetir') ?? '')
    if (!exists && passphrase !== repeat) {
      onMessage(t('Las dos frases de paso no coinciden.'))
      return
    }
    guard(async () => {
      const r = await connectAccount(passphrase, { migrate })
      setStatus(readSyncState())
      onMessage(
        migrate
          ? t('Migración completa: tus datos están en tu cuenta. El código sigue funcionando en otros dispositivos.')
          : r.created
            ? t('Cuenta conectada: se han subido tus datos, cifrados.')
            : r.change
              ? t('Cuenta conectada. Datos de tu cuenta descargados.')
              : t('Cuenta conectada. Ya estabais igual.'),
      )
      form.reset()
    })
  }

  if (phase === 'loading') return null

  if (phase === 'recovery') {
    return (
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          choosePassword(ev.currentTarget)
        }}
        className="flex flex-col gap-2"
      >
        <p className="text-sm">{t('Elige una contraseña nueva')}</p>
        <input name="clave" type="password" required autoComplete="new-password" placeholder={t('Contraseña nueva')} aria-label={t('Contraseña nueva')} className={ui.input} />
        <input name="repetir" type="password" required autoComplete="new-password" placeholder={t('Repite la contraseña')} aria-label={t('Repite la contraseña')} className={ui.input} />
        <button type="submit" disabled={working} className={`${ui.button} w-full`}>
          {t('Guardar contraseña')}
        </button>
      </form>
    )
  }

  if (phase === 'out') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <button type="button" onClick={google} disabled={working} className={`${ui.button} w-full`}>
            {working ? t('Abriendo Google…') : t('Continuar con Google')}
          </button>
        </div>
        <p className={`text-center text-[0.7rem] ${ui.faint}`}>{t('o con correo y contraseña')}</p>
        <form
          onSubmit={(ev) => {
            ev.preventDefault()
            signIn(ev.currentTarget)
          }}
          className="flex flex-col gap-2"
        >
          <input name="correo" type="email" required autoComplete="email" placeholder={t('Correo electrónico')} aria-label={t('Correo electrónico')} className={ui.input} />
          <input name="clave" type="password" required autoComplete="current-password" placeholder={t('Contraseña')} aria-label={t('Contraseña')} className={ui.input} />
          <div className="flex gap-2">
            <button type="submit" disabled={working} className={`${ui.button} flex-1`}>
              {t('Iniciar sesión')}
            </button>
            <button
              type="button"
              disabled={working}
              onClick={(ev) => ev.currentTarget.form && signUp(ev.currentTarget.form)}
              className={`${ui.ghost} shrink-0`}
            >
              {t('Registrarme')}
            </button>
          </div>
          <button
            type="button"
            disabled={working}
            onClick={(ev) => ev.currentTarget.form && reset(ev.currentTarget.form)}
            className={`w-fit text-xs ${ui.faint} transition-colors ${ui.hoverText}`}
          >
            {t('He olvidado mi contraseña')}
          </button>
        </form>
        <p className={`text-[0.7rem] ${ui.faint}`}>
          {t('Google o tu contraseña solo sirven para identificarte. Después elegirás una frase de paso distinta que cifra tus datos en tu dispositivo.')}
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault()
        connect(ev.currentTarget)
      }}
      className="flex flex-col gap-2"
    >
      <p className="text-sm">{tp('Sesión iniciada como {0}', phase.email)}</p>
      {exists === null ? null : (
        <>
          <input
            name="frase"
            type="password"
            required
            autoComplete={exists ? 'current-password' : 'new-password'}
            placeholder={exists ? t('Frase de paso') : t('Elige una frase de paso')}
            aria-label={t('Frase de paso')}
            className={ui.input}
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
              className={ui.input}
            />
          )}
          <p className={`text-[0.7rem] ${ui.faint}`}>
            {exists
              ? migrate
                ? t('Esta cuenta ya tiene datos. Introduce su frase de paso: se combinarán con los de este dispositivo.')
                : t('Esta cuenta ya tiene datos. Introduce la frase de paso que elegiste en su día.')
              : t('Mínimo 12 caracteres. Cifra tus datos en tu dispositivo; si la olvidas no hay forma de recuperarlos.')}
          </p>
          <div className="flex gap-2">
            <button type="submit" disabled={working} className={`${ui.button} flex-1`}>
              {working ? t('Conectando…') : migrate ? t('Migrar a mi cuenta') : exists ? t('Conectar') : t('Crear cuenta')}
            </button>
            <button type="button" onClick={leave} disabled={working} className={`${ui.ghost} shrink-0`}>
              {t('Cambiar de cuenta')}
            </button>
          </div>
        </>
      )}
    </form>
  )
}

export function AccountConnected({ status, setStatus, onMessage, ui = classicUi }: Props) {
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
      <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${ui.line}`}>
        <span className="min-w-0 flex-1 truncate text-sm">{status?.account?.email}</span>
        <span className={`shrink-0 text-xs ${ui.faint}`}>Google</span>
      </div>

      <p className={`text-[0.7rem] ${ui.faint}`}>
        {status?.error
          ? tp('Último intento fallido: {0}', t(status.error))
          : status?.lastSeen
            ? tp('Al día · {0} · se comprueba cada 4 s', new Date(status.lastSeen).toLocaleTimeString(locale()))
            : t('Sin sincronizar todavía.')}
      </p>

      <ui.Switch
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
          className={`w-fit text-xs ${ui.faint} transition-colors hover:text-red-500`}
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
            className={`w-fit text-xs ${ui.faint} transition-colors hover:text-red-500`}
          >
            {t('Borrar mis datos de la nube')}
          </button>
        )}
      </div>
    </div>
  )
}
