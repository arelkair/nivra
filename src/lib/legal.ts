export type LegalKind = 'privacy' | 'cookies'

type Block = { heading: string; text?: string[]; list?: string[] }

type Doc = { title: string; updated: string; intro: string; blocks: Block[]; back: string; other: string }

const CONTACT = 'arelkair.dev'

const PRIVACY_ES: Doc = {
  title: 'Política de privacidad',
  updated: 'Última actualización: 17 de octubre de 2026',
  intro: 'Nivra es un organizador personal pensado para guardar tus datos en tu propio dispositivo. Esta política explica qué datos se tratan y cuándo.',
  back: 'Volver a Nivra',
  other: 'Política de cookies',
  blocks: [
    {
      heading: 'Quién es el responsable',
      text: [`Arel Kair, desarrollador independiente de Nivra. Puedes contactar a través de ${CONTACT}.`],
    },
    {
      heading: 'Qué datos se guardan y dónde',
      list: [
        'Tus datos de la aplicación (tareas, horario, exámenes, notas, bóveda, dinero, ajustes) se guardan únicamente en tu navegador. No los recibimos ni los vemos.',
        'Si creas una cuenta con Google o con tu correo, tratamos tu dirección de correo y un identificador de usuario para autenticarte. Este servicio lo presta Supabase, con servidores en la Unión Europea (París).',
        'Si activas la sincronización, una copia de tus datos se cifra en tu dispositivo (AES-GCM) antes de subirse. La clave se deriva en tu dispositivo, así que no podemos leer el contenido. Solo conocemos datos técnicos como la fecha y el tamaño de la copia.',
        'Para servir la web se utilizan Vercel (alojamiento) y Cloudflare (DNS, red de entrega y seguridad). Como cualquier servidor web, pueden registrar tu dirección IP y datos técnicos de la conexión.',
      ],
    },
    {
      heading: 'Para qué los usamos',
      list: [
        'Prestarte el servicio que has solicitado: guardar tus datos y, si lo activas, sincronizarlos entre dispositivos.',
        'Mantener la seguridad y evitar abusos del servicio.',
        'Mostrar contenido de terceros solo si lo aceptas expresamente.',
      ],
    },
    {
      heading: 'Contenido de terceros',
      text: [
        'El reproductor de música puede cargar YouTube, Spotify o SoundCloud. Solo se cargan después de que aceptes, y esos servicios pueden usar sus propias cookies y tratar tus datos según sus políticas.',
        'El conversor de divisas del laboratorio clásico consulta frankfurter.dev, que recibe tu dirección IP al hacerlo.',
      ],
    },
    {
      heading: 'Lo que no hacemos',
      list: ['No hay publicidad.', 'No hay analítica ni seguimiento de uso.', 'No vendemos ni cedemos tus datos.'],
    },
    {
      heading: 'Cuánto tiempo se conservan',
      text: [
        'Los datos locales permanecen en tu navegador hasta que los borres. La cuenta y la copia sincronizada se conservan hasta que las elimines.',
      ],
    },
    {
      heading: 'Tus derechos',
      text: [
        'Puedes acceder a tus datos, rectificarlos, borrarlos, exportarlos, limitar su tratamiento u oponerte a él. Desde Ajustes puedes exportar tus datos en JSON y borrar todo lo guardado. Para otras solicitudes, escribe a través de ' +
          CONTACT +
          '. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).',
      ],
    },
    {
      heading: 'Menores',
      text: ['Si tienes menos de 14 años, necesitas el consentimiento de tu padre, madre o tutor para crear una cuenta.'],
    },
    {
      heading: 'Seguridad',
      text: [
        'La web se sirve por HTTPS con una política de seguridad de contenido estricta, la sincronización está cifrada de extremo a extremo y las dependencias se revisan periódicamente.',
      ],
    },
    {
      heading: 'Cambios',
      text: ['Si esta política cambia, se actualizará la fecha de arriba.'],
    },
  ],
}

const PRIVACY_EN: Doc = {
  title: 'Privacy policy',
  updated: 'Last updated: 17 October 2026',
  intro: 'Nivra is a personal organizer designed to keep your data on your own device. This policy explains which data is processed and when.',
  back: 'Back to Nivra',
  other: 'Cookie policy',
  blocks: [
    {
      heading: 'Who is responsible',
      text: [`Arel Kair, independent developer of Nivra. You can get in touch through ${CONTACT}.`],
    },
    {
      heading: 'What data is stored and where',
      list: [
        'Your app data (tasks, timetable, exams, notes, vault, money, settings) is stored only in your browser. We do not receive or see it.',
        'If you create an account with Google or e-mail, we process your e-mail address and a user identifier to authenticate you. This service is provided by Supabase, with servers in the European Union (Paris).',
        'If you turn on sync, a copy of your data is encrypted on your device (AES-GCM) before it is uploaded. The key is derived on your device, so we cannot read the content. We only know technical details such as the date and size of the copy.',
        'The site is served through Vercel (hosting) and Cloudflare (DNS, delivery network and security). Like any web server, they may log your IP address and technical connection data.',
      ],
    },
    {
      heading: 'What we use it for',
      list: [
        'Providing the service you asked for: storing your data and, if you enable it, syncing it between devices.',
        'Keeping the service secure and preventing abuse.',
        'Showing third-party content only if you explicitly accept it.',
      ],
    },
    {
      heading: 'Third-party content',
      text: [
        'The music player can load YouTube, Spotify or SoundCloud. They only load after you accept, and those services may use their own cookies and process your data under their own policies.',
        'The currency converter in the classic laboratory queries frankfurter.dev, which receives your IP address when you use it.',
      ],
    },
    {
      heading: 'What we do not do',
      list: ['There is no advertising.', 'There is no analytics or usage tracking.', 'We do not sell or share your data.'],
    },
    {
      heading: 'How long it is kept',
      text: ['Local data stays in your browser until you delete it. The account and the synced copy are kept until you delete them.'],
    },
    {
      heading: 'Your rights',
      text: [
        'You can access, correct, delete, export, restrict or object to the processing of your data. In Settings you can export your data as JSON and delete everything stored. For other requests, get in touch through ' +
          CONTACT +
          '. You may also complain to your data protection authority.',
      ],
    },
    {
      heading: 'Minors',
      text: ['If you are under 14, you need the consent of a parent or guardian to create an account.'],
    },
    {
      heading: 'Security',
      text: [
        'The site is served over HTTPS with a strict content security policy, sync is end-to-end encrypted and dependencies are reviewed regularly.',
      ],
    },
    {
      heading: 'Changes',
      text: ['If this policy changes, the date above will be updated.'],
    },
  ],
}

const COOKIES_ES: Doc = {
  title: 'Política de cookies',
  updated: 'Última actualización: 17 de octubre de 2026',
  intro: 'Nivra no usa cookies propias, ni de analítica, ni de publicidad. Por eso no verás un aviso de cookies al entrar.',
  back: 'Volver a Nivra',
  other: 'Política de privacidad',
  blocks: [
    {
      heading: 'Almacenamiento que sí usamos',
      text: ['Para funcionar, Nivra usa el almacenamiento de tu navegador. Es estrictamente necesario para el servicio y no requiere consentimiento.'],
      list: [
        'Almacenamiento local (localStorage): tus datos, ajustes y preferencias. Permanece hasta que lo borres.',
        'IndexedDB: copias automáticas diarias y archivos grandes como imágenes de fondo. Permanece hasta que lo borres.',
        'Caché y service worker: permite abrir la web sin conexión y cargarla más rápido.',
        'Sesión de la cuenta: si inicias sesión, el navegador guarda tu sesión para no pedírtela cada vez.',
      ],
    },
    {
      heading: 'Contenido de terceros con tu consentimiento',
      text: [
        'YouTube, Spotify y SoundCloud solo se cargan si aceptas. Al hacerlo, esos servicios pueden guardar sus propias cookies. También puede ocurrir al iniciar sesión con Google, en el dominio de Google.',
      ],
    },
    {
      heading: 'Cómo borrarlo',
      text: [
        'En Ajustes puedes borrar todo lo guardado. También puedes borrar los datos del sitio desde la configuración de tu navegador. Si lo haces sin una copia, se pierde lo que no esté exportado o sincronizado.',
      ],
    },
  ],
}

const COOKIES_EN: Doc = {
  title: 'Cookie policy',
  updated: 'Last updated: 17 October 2026',
  intro: 'Nivra uses no first-party, analytics or advertising cookies, so you will not see a cookie banner when you arrive.',
  back: 'Back to Nivra',
  other: 'Privacy policy',
  blocks: [
    {
      heading: 'Storage we do use',
      text: ['To work, Nivra uses your browser storage. It is strictly necessary for the service and does not require consent.'],
      list: [
        'Local storage (localStorage): your data, settings and preferences. It stays until you delete it.',
        'IndexedDB: automatic daily backups and large files such as background images. It stays until you delete it.',
        'Cache and service worker: lets the site open offline and load faster.',
        'Account session: if you sign in, the browser keeps your session so it does not ask every time.',
      ],
    },
    {
      heading: 'Third-party content with your consent',
      text: [
        'YouTube, Spotify and SoundCloud only load if you accept. When they do, those services may store their own cookies. The same may happen when signing in with Google, on Google’s domain.',
      ],
    },
    {
      heading: 'How to delete it',
      text: [
        'In Settings you can delete everything stored. You can also clear the site data from your browser settings. If you do it without a backup, anything not exported or synced is lost.',
      ],
    },
  ],
}

export const LEGAL: Record<LegalKind, { es: Doc; en: Doc }> = {
  privacy: { es: PRIVACY_ES, en: PRIVACY_EN },
  cookies: { es: COOKIES_ES, en: COOKIES_EN },
}

export const LEGAL_PATH: Record<LegalKind, string> = { privacy: '/privacy', cookies: '/cookies' }

export function legalFromPath(): LegalKind | null {
  const slug = location.pathname.replace(/\/+$/, '')
  return slug === '/privacy' ? 'privacy' : slug === '/cookies' ? 'cookies' : null
}
