import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './ui'
import { getLang, t } from '../lib/i18n'

export type LegalDoc = 'privacy' | 'cookies'

const REPO = 'https://github.com/arelkair/nivra'

const PRIVACY: Record<'es' | 'en', ReactNode> = {
  es: (
    <>
      <h3>Resumen</h3>
      <p>
        Nivra es tu espacio privado de organización. No hay cuentas obligatorias, ni publicidad, ni analítica, ni
        rastreadores. Tus datos viven en tu dispositivo y no nos los enviamos a ningún sitio salvo que tú actives la
        sincronización.
      </p>
      <h3>Qué datos guarda Nivra</h3>
      <p>
        Todo lo que escribes (tareas, eventos, horario, notas, finanzas, ajustes, tu nombre) se guarda únicamente en el
        almacenamiento local de tu navegador. Si borras los datos del sitio, desaparecen; por eso puedes exportar una
        copia desde Ajustes en cualquier momento.
      </p>
      <h3>Sincronización opcional</h3>
      <p>
        Si activas la sincronización, tus datos se cifran en tu dispositivo con tu frase de paso antes de enviarse. El
        servidor (Supabase) solo almacena el resultado cifrado y nunca ve la clave. Si pierdes la frase de paso, nadie
        puede recuperar esos datos, ni siquiera nosotros.
      </p>
      <h3>Inicio de sesión con Google</h3>
      <p>
        Es opcional. Google solo sirve para identificarte; tus datos siguen cifrados en tu dispositivo. Nivra recibe lo
        mínimo necesario para reconocer tu cuenta.
      </p>
      <h3>Servicios de terceros</h3>
      <ul>
        <li>
          <strong>Reproductores (YouTube, Spotify, SoundCloud):</strong> solo se cargan si pegas un enlace y das tu
          consentimiento. Sus servidores reciben tu dirección IP y pueden aplicar sus propias condiciones.
        </li>
        <li>
          <strong>Tasas de cambio (frankfurter.dev):</strong> solo se consulta cuando pulsas «actualizar» en el
          conversor de divisas.
        </li>
        <li>
          <strong>Tipografías:</strong> se sirven desde la propia aplicación; no se contacta con Google Fonts.
        </li>
      </ul>
      <h3>Tus derechos</h3>
      <p>
        Puedes consultar, exportar o borrar todos tus datos cuando quieras desde «Exportar o importar datos» en Ajustes.
        Como no recopilamos datos personales por nuestra parte, no hay nada más que solicitarnos; para los datos
        sincronizados, desactiva la sincronización y bórralos desde la propia aplicación.
      </p>
      <h3>Código abierto</h3>
      <p>
        Nivra se publica bajo licencia AGPL-3.0. Puedes comprobar todo lo anterior en el{' '}
        <a className="nw-link" href={REPO} target="_blank" rel="noopener noreferrer">
          código fuente
        </a>
        .
      </p>
      <h3>Cambios</h3>
      <p>Si esta política cambia, se actualizará en esta página con una nueva fecha. Última actualización: 8 de noviembre de 2026.</p>
    </>
  ),
  en: (
    <>
      <h3>Summary</h3>
      <p>
        Nivra is your private organising space. There are no mandatory accounts, no advertising, no analytics and no
        trackers. Your data lives on your device and is not sent anywhere unless you turn on sync.
      </p>
      <h3>What Nivra stores</h3>
      <p>
        Everything you write (tasks, events, timetable, notes, finances, settings, your name) is stored only in your
        browser's local storage. If you clear site data it disappears, so you can export a copy from Settings at any
        time.
      </p>
      <h3>Optional sync</h3>
      <p>
        If you turn on sync, your data is encrypted on your device with your passphrase before it is sent. The server
        (Supabase) only stores the encrypted result and never sees the key. If you lose your passphrase, nobody can
        recover that data, not even us.
      </p>
      <h3>Sign in with Google</h3>
      <p>
        This is optional. Google is only used to identify you; your data stays encrypted on your device. Nivra receives
        the minimum needed to recognise your account.
      </p>
      <h3>Third-party services</h3>
      <ul>
        <li>
          <strong>Players (YouTube, Spotify, SoundCloud):</strong> loaded only if you paste a link and give consent.
          Their servers receive your IP address and may apply their own terms.
        </li>
        <li>
          <strong>Exchange rates (frankfurter.dev):</strong> queried only when you press "update" in the currency
          converter.
        </li>
        <li>
          <strong>Typefaces:</strong> served from the app itself; Google Fonts is never contacted.
        </li>
      </ul>
      <h3>Your rights</h3>
      <p>
        You can review, export or delete all your data whenever you like from "Export or import data" in Settings. As
        we do not collect personal data ourselves there is nothing else to request from us; for synced data, turn off
        sync and delete it from within the app.
      </p>
      <h3>Open source</h3>
      <p>
        Nivra is released under the AGPL-3.0 licence. You can verify all of the above in the{' '}
        <a className="nw-link" href={REPO} target="_blank" rel="noopener noreferrer">
          source code
        </a>
        .
      </p>
      <h3>Changes</h3>
      <p>If this policy changes, this page will be updated with a new date. Last updated: 8 November 2026.</p>
    </>
  ),
}

const COOKIES: Record<'es' | 'en', ReactNode> = {
  es: (
    <>
      <h3>Resumen</h3>
      <p>
        Nivra no usa cookies propias ni de analítica o publicidad. Por eso no verás un banner de cookies: no hay nada
        que aceptar para usar la aplicación.
      </p>
      <h3>Almacenamiento local</h3>
      <p>
        Para funcionar, Nivra usa el almacenamiento del navegador (localStorage y sessionStorage). No se envía a ningún
        servidor y es estrictamente necesario para recordar tus datos y preferencias.
      </p>
      <table>
        <thead>
          <tr>
            <th>Qué</th>
            <th>Para qué</th>
            <th>Duración</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>nivra-*</code>
            </td>
            <td>Tus datos, tu nombre y ajustes (tema, idioma, interfaz).</td>
            <td>Hasta que los borres</td>
          </tr>
          <tr>
            <td>Sesión de sincronización</td>
            <td>Mantener tu sesión si activas sincronización o Google.</td>
            <td>Hasta cerrar sesión</td>
          </tr>
          <tr>
            <td>Caché sin conexión</td>
            <td>Un service worker guarda la aplicación para abrirla sin red.</td>
            <td>Hasta que la borres</td>
          </tr>
        </tbody>
      </table>
      <h3>Cookies de terceros</h3>
      <p>
        Solo aparecen si decides cargar un reproductor de YouTube, Spotify o SoundCloud: esos servicios pueden
        establecer sus propias cookies, y Nivra te pide consentimiento antes de cargarlos. Si inicias sesión con Google,
        la página de Google también puede usar las suyas.
      </p>
      <h3>Cómo gestionarlas</h3>
      <p>
        Puedes borrar el almacenamiento y las cookies desde los ajustes de tu navegador. Ten en cuenta que borrar el
        almacenamiento local elimina tus datos de Nivra si no los has exportado antes.
      </p>
      <p>Última actualización: 8 de noviembre de 2026.</p>
    </>
  ),
  en: (
    <>
      <h3>Summary</h3>
      <p>
        Nivra uses no first-party, analytics or advertising cookies. That is why you will not see a cookie banner:
        there is nothing to accept to use the app.
      </p>
      <h3>Local storage</h3>
      <p>
        To work, Nivra uses browser storage (localStorage and sessionStorage). It is never sent to a server and is
        strictly necessary to remember your data and preferences.
      </p>
      <table>
        <thead>
          <tr>
            <th>What</th>
            <th>Purpose</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>nivra-*</code>
            </td>
            <td>Your data, your name and settings (theme, language, interface).</td>
            <td>Until you delete them</td>
          </tr>
          <tr>
            <td>Sync session</td>
            <td>Keeps you signed in if you use sync or Google.</td>
            <td>Until you sign out</td>
          </tr>
          <tr>
            <td>Offline cache</td>
            <td>A service worker stores the app so it opens without a network.</td>
            <td>Until you clear it</td>
          </tr>
        </tbody>
      </table>
      <h3>Third-party cookies</h3>
      <p>
        These only appear if you choose to load a YouTube, Spotify or SoundCloud player: those services may set their
        own cookies, and Nivra asks for your consent before loading them. If you sign in with Google, Google's own page
        may use theirs too.
      </p>
      <h3>How to manage them</h3>
      <p>
        You can clear storage and cookies from your browser settings. Note that clearing local storage removes your
        Nivra data if you have not exported it first.
      </p>
      <p>Last updated: 8 November 2026.</p>
    </>
  ),
}

export function LegalDialog({
  doc,
  onDoc,
  onClose,
}: {
  doc: LegalDoc
  onDoc: (doc: LegalDoc) => void
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const lang = getLang()

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => {
      removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [onClose])

  return (
    <div className="nw nw-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="nw-dialog" role="dialog" aria-modal="true" aria-label={t('Información legal')}>
        <div className="flex items-center justify-between gap-3 border-b border-[var(--nw-line)] px-5 py-3">
          <div className="nw-seg" role="tablist">
            {(['privacy', 'cookies'] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={doc === id}
                aria-pressed={doc === id}
                onClick={() => onDoc(id)}
              >
                {id === 'privacy' ? t('Política de privacidad') : t('Política de cookies')}
              </button>
            ))}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('Cerrar')}
            className="grid h-8 w-8 place-items-center rounded-md text-[var(--nw-muted)] hover:bg-[var(--nw-sunken)] hover:text-[var(--nw-text)]"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div key={doc} className="nw-doc nw-rise overflow-y-auto px-5 py-6 sm:px-7" style={{ animationDuration: '0.3s' }}>
          {(doc === 'privacy' ? PRIVACY : COOKIES)[lang]}
        </div>
      </div>
    </div>
  )
}
