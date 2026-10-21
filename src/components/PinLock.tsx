import { useEffect, useState, type ReactNode } from 'react'
import { configurePin, lockNow, pinConfig, retryAt, verifyPin, type LockScope } from '../lib/pin'
import { useLockStatus } from '../lib/useLockStatus'
import { t } from '../lib/i18n'
import { Icon, button, ghost, input } from './ui'

export function PinGate({ scope, children }: { scope: LockScope; children: ReactNode }) {
  const unlocked = useLockStatus(scope)
  const [publicRoute, setPublicRoute] = useState(() => location.pathname === '/changelog')
  useEffect(() => {
    const changed = () => setPublicRoute(location.pathname === '/changelog')
    addEventListener('nivra-route-change', changed); addEventListener('popstate', changed)
    return () => { removeEventListener('nivra-route-change', changed); removeEventListener('popstate', changed) }
  }, [])
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (scope !== 'app') return
    let timer: ReturnType<typeof setTimeout> | undefined
    let hiddenAt = 0
    const changed = () => {
      if (document.hidden) { hiddenAt = Date.now(); timer = setTimeout(lockNow, 5 * 60000) }
      else { clearTimeout(timer); if (hiddenAt && Date.now() - hiddenAt >= 5 * 60000) lockNow() }
    }
    document.addEventListener('visibilitychange', changed)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', changed) }
  }, [scope])
  useEffect(() => { if (unlocked) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [unlocked])
  if (unlocked || (scope === 'app' && publicRoute)) return children
  const seconds = Math.max(0, Math.ceil((retryAt() - now) / 1000))
  return <div className="grid min-h-[70svh] place-items-center bg-(--paper) p-6 text-(--minimal-text)"><form className="nv-panel flex w-full max-w-sm flex-col gap-4 border p-6" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError('')
    try { if (!(await verifyPin(pin))) setError(t('PIN incorrecto.')); setPin('') } catch (cause) { setError(t((cause as Error).message)) } finally { setBusy(false); setNow(Date.now()) }
  }}><Icon name="lock" className="h-7 w-7 text-(--minimal-accent)" /><h1 className="text-xl font-semibold">{t(scope === 'app' ? 'Nivra está bloqueada' : 'La bóveda está bloqueada')}</h1><label className="flex flex-col gap-2 text-sm">{t('PIN')}<input autoFocus type="password" inputMode="numeric" pattern="[0-9]{6,12}" minLength={6} maxLength={12} autoComplete="off" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} className={input} /></label>{error && <p role="alert" className="text-sm text-red-500">{error}</p>}<button disabled={busy || seconds > 0} className={`${button} disabled:opacity-40`}>{seconds ? `${seconds} s` : t('Desbloquear')}</button><p className="text-xs text-(--minimal-muted)">{t('Bloqueo local de pantalla. Tus datos no se cifran con el PIN.')}</p></form></div>
}
export function SecurityPanel() {
  const [scope, setScope] = useState<LockScope | 'off'>(pinConfig()?.scope ?? 'off')
  const [pin, setPin] = useState(''), [repeat, setRepeat] = useState(''), [current, setCurrent] = useState('')
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  const hasPin = !!pinConfig()
  const removeLock = async () => {
    setMessage('')
    if (!current) { setMessage(t('Escribe el PIN actual para eliminar el bloqueo.')); return }
    setBusy(true)
    try {
      await configurePin('off', '', current)
      setScope('off'); setPin(''); setRepeat(''); setCurrent('')
      setMessage(t('Método de bloqueo eliminado.'))
    } catch (cause) { setMessage(t((cause as Error).message)) }
    finally { setBusy(false) }
  }
  return <section className="nv-panel flex flex-col gap-4 rounded-lg border border-(--minimal-line) p-5"><h2 className="text-lg font-medium">{t('Bloqueo con PIN')}</h2><p className="text-sm text-(--minimal-muted)">{t('Elige si quieres bloquear la app completa o solo la bóveda. Se bloquea al recargar y tras 5 minutos en segundo plano.')}</p><form className="flex max-w-md flex-col gap-3" onSubmit={async e => {
    e.preventDefault(); setMessage(''); if (scope !== 'off' && pin !== repeat) { setMessage(t('Los PIN no coinciden.')); return }
    setBusy(true); try { await configurePin(scope, pin, current); setPin(''); setRepeat(''); setCurrent(''); setMessage(t('Bloqueo actualizado.')) } catch (cause) { setMessage(t((cause as Error).message)) } finally { setBusy(false) }
  }}><label className="flex flex-col gap-2 text-sm">{t('Proteger')}<select value={scope} onChange={e => setScope(e.target.value as typeof scope)} className={input}><option value="off">{t('Desactivado')}</option><option value="app">{t('Toda la app')}</option><option value="vault">{t('Solo la bóveda')}</option></select></label>{hasPin && <label className="flex flex-col gap-2 text-sm">{t('PIN actual')}<input required type="password" inputMode="numeric" maxLength={12} value={current} onChange={e => setCurrent(e.target.value)} className={input} /></label>}{scope !== 'off' && <><label className="flex flex-col gap-2 text-sm">{t('Nuevo PIN')}<input required type="password" inputMode="numeric" pattern="[0-9]{6,12}" minLength={6} maxLength={12} value={pin} onChange={e => setPin(e.target.value)} className={input} /></label><label className="flex flex-col gap-2 text-sm">{t('Repite el PIN')}<input required type="password" inputMode="numeric" maxLength={12} value={repeat} onChange={e => setRepeat(e.target.value)} className={input} /></label></>}{message && <p role="status" className="text-sm">{message}</p>}<div className="flex flex-wrap gap-2"><button disabled={busy} className={button}>{t('Guardar bloqueo')}</button>{hasPin && <><button type="button" disabled={busy} onClick={removeLock} className={ghost}>{t('Eliminar método de bloqueo')}</button><button type="button" onClick={lockNow} className={ghost}>{t('Bloquear ahora')}</button></>}</div></form><p className="text-xs text-(--minimal-muted)">{t('Bloqueo local de pantalla. Tus datos no se cifran con el PIN.')}</p></section>
}
