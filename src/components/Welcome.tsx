import { useState } from 'react'
import { Icon } from './ui'
import { LANGS, getLang, setLang, t } from '../lib/i18n'

export function Welcome({ onDone }: { onDone: (name: string) => void }) {
  const [name, setName] = useState(() => sessionStorage.getItem('nivra-welcome-name') ?? '')
  const [step, setStep] = useState(0)
  const [environment, setEnvironment] = useState('initiative')
  return <main className="min-h-svh bg-(--paper) px-6 py-8 text-(--minimal-text) sm:px-12">
    <header className="mx-auto flex max-w-5xl items-center justify-between border-b border-(--minimal-line) pb-5"><span className="text-lg font-semibold tracking-tight">nivra<span className="text-(--minimal-accent)">.</span></span><span className="text-xs text-(--minimal-muted)">{t('Tu espacio, a tu ritmo.')}</span></header>
    <div className="mx-auto grid max-w-5xl gap-12 py-16 md:grid-cols-2 md:gap-20 md:py-24">
      <section className="flex flex-col items-start gap-6">
        <span className="rounded border border-(--minimal-line) px-2 py-1 text-xs text-(--minimal-muted)">Nivra / Initiative</span>
        <h1 className="max-w-md text-4xl leading-tight font-semibold sm:text-5xl">{t('Un poco de orden. Más espacio para ti.')}</h1>
        <p className="max-w-sm text-base leading-relaxed text-(--minimal-muted)">{t('Tus días, tus ideas y tus planes, en un lugar tranquilo que puedes hacer tuyo.')}</p>
        <div className="mt-2 w-full max-w-sm rounded-lg border border-(--minimal-line) bg-(--surface) p-5">
          <p className="mb-3 text-xs text-(--minimal-muted)">{t('Tu día')}</p>
          {['Organiza lo importante', 'Conecta tus ideas', 'Hazlo a tu manera'].map((label, i) => <div key={label} className="flex items-center gap-3 border-t border-(--minimal-line) py-3 text-sm"><Icon name={['calendar', 'graph', 'settings'][i]} className="h-4 w-4 text-(--minimal-accent)" />{t(label)}</div>)}
        </div>
        <p className="text-xs text-(--minimal-muted)">{t('Privado desde el principio. Sin cuenta obligatoria.')}</p>
      </section>
      <form onSubmit={e => { e.preventDefault(); if (step === 0) { setStep(1); return } localStorage.setItem('nivra-initiative', JSON.stringify(environment === 'initiative')); if (environment === 'initiative') localStorage.setItem('nivra-initiative-intro-seen', '1'); sessionStorage.removeItem('nivra-welcome-name'); onDone(name.trim()); location.reload() }} className="flex flex-col justify-center gap-6">
        <div className="flex gap-2" aria-label={t('Progreso')}>{[0, 1].map(i => <span key={i} className={`h-1 w-10 rounded-full ${i === step ? 'bg-(--minimal-accent)' : 'bg-(--minimal-line)'}`} />)}</div>
        <div><p className="mb-2 text-xs text-(--minimal-muted)">{step + 1} / 2</p><h2 className="text-2xl font-semibold tracking-tight">{t(step === 0 ? 'Empecemos por ti' : 'Elige tu espacio')}</h2></div>
        {step === 0 ? <>
          <label className="flex flex-col gap-2 text-sm">{t('¿Cuál es tu nombre?')}<input value={name} onChange={e => { setName(e.target.value); sessionStorage.setItem('nivra-welcome-name', e.target.value) }} autoComplete="given-name" maxLength={30} className="nv-field rounded border px-3 py-3" placeholder={t('Tu nombre (opcional)')} /></label>
          <fieldset><legend className="mb-3 text-sm">{t('Idioma')}</legend><div className="flex flex-wrap gap-2">{LANGS.map(lang => <button key={lang.id} type="button" onClick={() => lang.id !== getLang() && setLang(lang.id)} aria-pressed={lang.id === getLang()} className={`rounded border px-3 py-2 text-sm ${lang.id === getLang() ? 'border-(--minimal-accent) text-(--minimal-accent)' : 'border-(--minimal-line)'}`}>{lang.label}</button>)}</div></fieldset>
        </> : <fieldset className="flex flex-col gap-3"><legend className="sr-only">{t('Entorno')}</legend>{['initiative', 'classic'].map(value => <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${environment === value ? 'border-(--minimal-accent) bg-(--surface)' : 'border-(--minimal-line)'}`}><input type="radio" name="environment" value={value} checked={environment === value} onChange={() => setEnvironment(value)} className="mt-1" /><span><span className="block text-sm font-medium">{value === 'initiative' ? 'Initiative' : 'Classic'} {value === 'initiative' && <span className="ml-2 text-xs text-(--minimal-accent)">{t('Recomendado')}</span>}</span><span className="mt-1 block text-xs leading-relaxed text-(--minimal-muted)">{t(value === 'initiative' ? 'Un espacio minimalista con Inicio personalizable y Bóveda.' : 'La organización original de Nivra, con un aspecto renovado.')}</span></span></label>)}</fieldset>}
        <div className="flex items-center gap-3">{step === 1 && <button type="button" onClick={() => setStep(0)} className="nv-ghost px-3 py-3 text-sm">{t('Atrás')}</button>}<button type="submit" className="nv-primary flex flex-1 items-center justify-between px-4 py-3 text-sm">{t(step === 0 ? 'Continuar' : 'Entrar en Nivra')}<Icon name="right" className="h-4 w-4" /></button></div>
        <p className="text-xs leading-relaxed text-(--minimal-muted)">{t('Podrás cambiar todo esto en Ajustes cuando quieras.')}</p>
      </form>
    </div>
  </main>
}
