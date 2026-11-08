import { useState } from 'react'
import { Icon } from '../components/ui'
import { LegalDialog, type LegalDoc } from '../components/LegalDialog'
import { LANGS, getLang, setLang, t } from '../lib/i18n'

const FEATURES = [
  { icon: 'calendar', title: 'Calendario', desc: 'Eventos por día.' },
  { icon: 'schedule', title: 'Horario', desc: 'Bloques semanales.' },
  { icon: 'tasks', title: 'Tareas', desc: 'Pendientes y hechas.' },
  { icon: 'dashboard', title: 'Privado', desc: 'Todo en tu navegador.' },
]

const STATS = [
  { value: '0', label: 'Cookies' },
  { value: '0', label: 'Rastreadores' },
  { value: '100%', label: 'En tu dispositivo' },
]

const INTERFACES = [
  { id: true, label: 'Initiative', hint: 'Moderna, con bóveda y laboratorio.' },
  { id: false, label: 'Classic', hint: 'La original, con bloques personalizables.' },
]

function Preview({ initiative }: { initiative: boolean }) {
  return initiative ? (
    <div className="nw-mini gap-1 p-1" style={{ gridTemplateColumns: '0.9fr 3fr' }} aria-hidden>
      <span />
      <div className="grid gap-1" style={{ gridTemplateRows: 'auto 1fr 1fr' }}>
        <span className="h-1.5 w-1/2 !bg-[var(--nw-accent)]" />
        <span />
        <span />
      </div>
    </div>
  ) : (
    <div className="nw-mini grid-cols-3 grid-rows-2 gap-1 p-1" aria-hidden>
      <span className="col-span-2" />
      <span />
      <span />
      <span className="col-span-2" />
    </div>
  )
}

export function SetupScreen({ onDone, delay }: { onDone: (name: string, initiative: boolean) => void; delay: number }) {
  const lang = getLang()
  const [name, setName] = useState('')
  const [initiative, setInitiative] = useState(true)
  const [legal, setLegal] = useState<LegalDoc | null>(null)
  const rise = (n: number) => ({ '--d': `${delay + n * 0.07}s` }) as React.CSSProperties

  return (
    <div className="nw nw-page">
      <div className="relative mx-auto flex min-h-svh w-full max-w-6xl flex-col px-5 sm:px-10">
        <header className="nw-rise flex items-center justify-between py-6" style={rise(0)}>
          <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            Nivra
          </span>
          <div className="nw-seg" role="group" aria-label={t('Idioma')}>
            {LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => l.id !== lang && setLang(l.id)}
                aria-pressed={l.id === lang}
              >
                {l.label}
              </button>
            ))}
          </div>
        </header>

        <main className="grid flex-1 items-center gap-12 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20 lg:py-12">
          <section className="flex flex-col gap-8">
            <div className="flex flex-col gap-5">
              <h1 className="nw-title nw-rise" style={rise(2)}>
                Nivra
              </h1>
              <p className="nw-rise max-w-md text-lg leading-relaxed text-[var(--nw-muted)]" style={rise(3)}>
                {t('Bienvenido a Nivra, tu espacio privado de organización.')}
              </p>
            </div>

            <ul className="grid grid-cols-2 gap-3">
              {FEATURES.map((f, i) => (
                <li key={f.title} className="nw-feature nw-rise" style={rise(4 + i)}>
                  <Icon name={f.icon} />
                  <span className="text-sm font-medium">{t(f.title)}</span>
                  <span className="text-sm text-[var(--nw-muted)]">{t(f.desc)}</span>
                </li>
              ))}
            </ul>

            <dl className="nw-rise grid grid-cols-3 gap-4" style={rise(9)}>
              {STATS.map((s) => (
                <div key={s.label} className="nw-stat">
                  <dt className="order-2 text-xs text-[var(--nw-muted)]">{t(s.label)}</dt>
                  <dd>
                    <strong>{s.value}</strong>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              onDone(name.trim(), initiative)
            }}
            style={rise(5)}
            className="nw-card nw-rise flex flex-col gap-6 p-5 sm:p-7"
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold tracking-tight">{t('Empecemos')}</h2>
              <p className="text-sm text-[var(--nw-muted)]">{t('Dos pasos y ya estás dentro. Sin registro.')}</p>
            </div>

            <label className="flex flex-col gap-2">
              <span className="nw-label">{t('¿Cuál es tu nombre?')}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                autoComplete="given-name"
                className="nw-field"
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="nw-label">{t('Interfaz')}</span>
              <div className="grid grid-cols-2 gap-2">
                {INTERFACES.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setInitiative(option.id)}
                    aria-pressed={option.id === initiative}
                    className="nw-choice"
                  >
                    <Preview initiative={option.id} />
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-xs leading-snug text-[var(--nw-muted)]">{t(option.hint)}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-[var(--nw-muted)]">
                {t('Cada interfaz guarda sus propios datos. Puedes cambiar de interfaz o compartir los datos desde Ajustes.')}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button type="submit" className="nw-primary">
                {t('Continuar')}
                <Icon name="right" />
              </button>
              <p className="text-xs leading-relaxed text-[var(--nw-muted)]">
                {t('Al continuar, aceptas que Nivra guarde tus datos solo en este dispositivo. Consulta la')}{' '}
                <button type="button" className="nw-link" onClick={() => setLegal('privacy')}>
                  {t('política de privacidad')}
                </button>{' '}
                {t('y la')}{' '}
                <button type="button" className="nw-link" onClick={() => setLegal('cookies')}>
                  {t('política de cookies')}
                </button>
                .
              </p>
            </div>
          </form>
        </main>

        <footer
          className="nw-rise flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-[var(--nw-line)] py-6 text-xs text-[var(--nw-muted)]"
          style={rise(10)}
        >
          <span>{t('Código abierto bajo licencia AGPL-3.0.')}</span>
          <nav className="flex gap-5" aria-label={t('Información legal')}>
            <button type="button" className="nw-link" onClick={() => setLegal('privacy')}>
              {t('Privacidad')}
            </button>
            <button type="button" className="nw-link" onClick={() => setLegal('cookies')}>
              {t('Cookies')}
            </button>
            <a className="nw-link" href="https://github.com/arelkair/nivra" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </nav>
        </footer>
      </div>

      {legal && <LegalDialog doc={legal} onDoc={setLegal} onClose={() => setLegal(null)} />}
    </div>
  )
}
