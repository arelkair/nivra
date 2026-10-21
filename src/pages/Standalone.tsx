import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { AccountConnected, AccountSignIn } from '../components/Account'
import { PrivacyPanel } from '../components/PrivacyPanel'
import { SecurityPanel } from '../components/PinLock'
import { MarkdownView } from '../components/initiative/vault/MarkdownView'
import { button, ghost, input } from '../components/ui'
import { backendEnabled } from '../lib/backend'
import { sendFeedback } from '../lib/feedback'
import { getSupabase } from '../lib/supabase'
import { readLocal, writeLocal } from '../lib/dataLifecycle'
import { readPortable, readPublicNote, type SharedDocument } from '../lib/sharing'
import { t, locale } from '../lib/i18n'
import { useSync } from '../lib/useSync'
import { useSettings } from '../lib/settings'
import { validColor } from '../lib/appearance'

const EmbeddedContext = createContext(false)
export function EmbeddedPages({ children }: { children: ReactNode }) { return <EmbeddedContext.Provider value>{children}</EmbeddedContext.Provider> }
export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  const cfg = useSettings()
  const embedded = useContext(EmbeddedContext)
  useEffect(() => {
    const root = document.documentElement
    root.dataset.contrast = cfg.highContrast ? 'high' : 'normal'
    root.dataset.largeText = String(cfg.largeText)
    root.dataset.dyslexia = String(cfg.dyslexiaFont)
    root.dataset.customTheme = String(cfg.customThemeOn)
    for (const mode of ['light', 'dark'] as const) for (const key of ['background', 'surface', 'text', 'accent'] as const) {
      const value = cfg.customTheme?.[mode]?.[key]
      if (value && validColor(value)) root.style.setProperty(`--custom-${mode}-${key}`, value)
    }
  }, [cfg.highContrast, cfg.largeText, cfg.dyslexiaFont, cfg.customThemeOn, cfg.customTheme])
  const content = <div className="mx-auto flex w-full max-w-4xl flex-col gap-6"><header className="flex flex-wrap items-center justify-between gap-4 border-b border-(--minimal-line) pb-4"><h1 className="text-3xl font-semibold">{t(title)}</h1><nav aria-label={t('Navegación de cuenta y novedades')} className="flex flex-wrap gap-2 text-sm"><a href="/dashboard" className={ghost}>{t('Inicio')}</a><a href="/account" aria-current={title === 'Tu cuenta' || title === 'Iniciar sesión' ? 'page' : undefined} className={ghost}>{t('Cuenta')}</a><a href="/changelog" aria-current={title === 'Novedades' ? 'page' : undefined} className={ghost}>{t('Novedades')}</a></nav></header>{children}</div>
  return embedded ? content : <main className="min-h-svh bg-(--paper) px-4 py-6 text-(--minimal-text) sm:px-8">{content}</main>
}

export function AccountPage({ login = false }: { login?: boolean }) {
  const [status, setStatus] = useSync()
  const [message, setMessage] = useState<string | null>(null)
  const readTab = () => { const value = new URLSearchParams(location.search).get('tab'); return value === 'privacy' || value === 'security' ? value : 'session' }
  const [tab, setTabState] = useState(readTab)
  const setTab = (value: string) => { setTabState(value); history.pushState({}, '', `${location.pathname}${value === 'session' ? '' : `?tab=${value}`}`) }
  useEffect(() => { const pop = () => setTabState(readTab()); addEventListener('popstate', pop); return () => removeEventListener('popstate', pop) }, [])
  return <PageShell title={login ? 'Iniciar sesión' : 'Tu cuenta'}>
    {!backendEnabled && <p role="status" className="rounded-lg border border-(--minimal-line) bg-(--sunken) p-4 text-sm">{t('La sincronización está desactivada y tus datos siguen en este dispositivo.')}</p>}
    {!login && <nav role="tablist" className="flex flex-wrap gap-2 border-b border-(--minimal-line) pb-3" aria-label={t('Cuenta')}>{[['session', 'Sesión'], ['privacy', 'Privacidad y papelera'], ['security', 'Seguridad']].map(([id, title]) => <button role="tab" type="button" key={id} aria-selected={tab === id} onClick={() => setTab(id)} className={`${ghost} ${tab === id ? 'bg-(--surface) text-(--minimal-accent)' : ''}`}>{t(title)}</button>)}</nav>}
    {(tab === 'session' || login) && <section className="nv-panel max-w-xl rounded-lg border border-(--minimal-line) p-5"><p className="mb-5 text-sm text-(--minimal-muted)">{t('Tu cuenta recupera tus datos en cada dispositivo. La copia automática está protegida por los permisos de tu cuenta en Supabase; no tiene cifrado de extremo a extremo.')}</p>{status?.account ? <AccountConnected status={status} setStatus={setStatus} onMessage={setMessage} /> : <AccountSignIn setStatus={setStatus} onMessage={setMessage} />}{message && <p role="status" className="mt-4 text-sm">{message}</p>}{login && <a href="/account" className="mt-5 inline-block text-sm underline">{t('Ir a mi cuenta')}</a>}</section>}
    {!login && tab === 'privacy' && <PrivacyPanel />}
    {!login && tab === 'security' && <SecurityPanel />}
  </PageShell>
}

type Update = { id: string; title: string; body: string; published_at: string }
const LOCAL_UPDATES: Update[] = [{ id: '2026-10-19-study', title: 'Más control sobre tu espacio', published_at: '2026-10-19T12:00:00+02:00', body: 'Tu estudio, tus rutinas y tu cuenta, dentro de la misma aplicación.\n\n· Nuevo panel Mi curso con pomodoro por asignatura.\n· Resumen semanal, progreso del curso y boletín en PDF.\n· Captura rápida, tareas repetidas y tablero Kanban.\n· Hábitos, lecturas y diario con estado de ánimo.\n· Calendarios externos y horas de no molestar.\n· Cuenta y novedades integradas en la navegación.' }]
function Feedback({ update }: { update: Update }) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState(() => readLocal<Record<string, string>>('nivra-feedback-drafts', {})[update.id] ?? '')
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  const saveDraft = () => { writeLocal('nivra-feedback-drafts', { ...readLocal('nivra-feedback-drafts', {}), [update.id]: body }); setMessage(t('Borrador guardado en este dispositivo.')) }
  return <div className="mt-4 border-t border-(--minimal-line) pt-4"><button type="button" aria-expanded={open} className={ghost} onClick={() => setOpen(!open)}>{t('Comentarios')}</button>{open && <form className="mt-4 flex flex-col gap-3" onSubmit={async e => { e.preventDefault(); setBusy(true); setMessage(''); try { await sendFeedback(update.id, body); writeLocal('nivra-feedback-drafts', { ...readLocal('nivra-feedback-drafts', {}), [update.id]: '' }); setBody(''); setMessage(t('Comentario enviado. Solo tú y el equipo de Nivra pueden leerlo.')) } catch (cause) { saveDraft(); setMessage(t((cause as Error).message) + ' ' + t('Borrador guardado en este dispositivo.')) } finally { setBusy(false) } }}><p className="text-xs text-(--minimal-muted)">{t('Los comentarios se envían al equipo de Nivra con tu cuenta; no se publican en el tablón.')}</p><label className="flex flex-col gap-2 text-sm">{t('Tu comentario')}<textarea required maxLength={4000} rows={4} value={body} onChange={e => setBody(e.target.value)} className={input} /></label><div className="flex flex-wrap gap-2"><button disabled={busy || !backendEnabled} className={`${button} disabled:opacity-40`}>{t('Enviar comentario')}</button><button type="button" onClick={saveDraft} className={ghost}>{t('Guardar borrador')}</button><a href="/login" className={ghost}>{t('Iniciar sesión')}</a></div>{!backendEnabled && <p className="text-xs text-(--minimal-muted)">{t('Supabase está en pausa. El comentario puede guardarse como borrador local.')}</p>}</form>}{message && <p role="status" className="mt-3 text-sm">{message}</p>}</div>
}
export function ChangelogPage() {
  const [updates, setUpdates] = useState(LOCAL_UPDATES), [error, setError] = useState('')
  useEffect(() => {
    if (!backendEnabled) return
    let alive = true
    void getSupabase().then(sb => sb.from('app_updates').select('id,title,body,published_at').order('published_at', { ascending: false }).limit(30)).then(result => {
      if (!alive) return
      if (result.error) setError(t('No se han podido cargar las novedades online. Se muestra el tablón incluido en esta versión.'))
      else if (result.data?.length) setUpdates([...result.data, ...LOCAL_UPDATES.filter(local => !result.data.some(row => row.id === local.id))])
    }).catch(() => { if (alive) setError(t('No se han podido cargar las novedades online. Se muestra el tablón incluido en esta versión.')) })
    return () => { alive = false }
  }, [])
  return <PageShell title="Novedades"><p className="text-sm text-(--minimal-muted)">{t('Un tablón abierto a todo el mundo, sin necesidad de iniciar sesión.')}</p>{error && <p role="status">{error}</p>}{updates.map(update => <article key={update.id} className="nv-panel rounded-lg border border-(--minimal-line) p-5"><time dateTime={update.published_at} className="text-xs text-(--minimal-muted)">{new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' }).format(new Date(update.published_at))}</time><h2 className="mt-2 text-xl font-medium">{update === LOCAL_UPDATES[0] ? t(update.title) : update.title}</h2><div className="mt-4 flex flex-col gap-3 text-sm leading-relaxed">{update.body.split(/\n\s*\n/).map((paragraph, index) => paragraph.trim().startsWith('·') ? <ul key={index} className="flex flex-col gap-2">{paragraph.split('\n').filter(Boolean).map((line, i) => <li key={i} className="flex gap-2"><span aria-hidden="true">·</span><span>{update === LOCAL_UPDATES[0] ? t(line.replace(/^·\s*/, '')) : line.replace(/^·\s*/, '')}</span></li>)}</ul> : <p key={index}>{update === LOCAL_UPDATES[0] ? t(paragraph) : paragraph}</p>)}</div><Feedback update={update} /></article>)}</PageShell>
}
function SharedPage() {
  const [document, setDocument] = useState<SharedDocument | null>(null), [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    const load = async () => {
      try { const doc = location.hash ? readPortable(location.hash) : await readPublicNote(location.pathname.split('/')[2] ?? ''); if (alive) setDocument(doc) } catch (cause) { if (alive) setError(t((cause as Error).message)) }
    }
    void load()
    return () => { alive = false }
  }, [])
  return <PageShell title={document?.kind === 'badge' ? 'Insignia compartida' : 'Nota compartida'}>{error ? <p role="alert" className="rounded border border-(--minimal-line) p-4">{error}</p> : document ? <article className="nv-panel rounded-lg border border-(--minimal-line) p-6"><p className="mb-3 text-xs text-(--minimal-muted)">{t('Copia de lectura. No da acceso a la cuenta ni a la bóveda de su autor.')}</p><h2 className="mb-6 break-words text-2xl font-medium">{document.title}</h2><MarkdownView body={document.body} dark={globalThis.document.documentElement.classList.contains('dark')} exists={() => false} onOpenLink={() => {}} onOpenApp={() => {}} onTag={() => {}} onToggleTask={() => {}} /></article> : <p role="status">{t('Cargando…')}</p>}</PageShell>
}
export function StandalonePage() {
  if (location.pathname === '/changelog') return <ChangelogPage />
  if (location.pathname.startsWith('/shared')) return <SharedPage />
  return <AccountPage login={location.pathname === '/login'} />
}
