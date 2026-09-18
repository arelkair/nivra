import { useEffect, useState } from 'react'
import { t } from '../lib/i18n'

const LINES = [
  'Bienvenido a Initiative, la nueva capa de personalización para Nivra.',
  'Initiative es un cambio radical en la interfaz, donde se prioriza una estética mucho más minimalista y futurista.',
  'Initiative también incluye nuevas e interesantes funciones para Nivra. Aunque por el momento están en fase beta, pero puedes probarlas perfectamente.',
]

const MS_PER_WORD = 60000 / 220
const LAST_LINE_PAUSE_MS = 350
const CONTINUE_APPEAR_DELAY_MS = 80

function linePacing(line: string) {
  const words = line.trim().split(/\s+/).length
  const totalMs = Math.max(1400, words * MS_PER_WORD)
  const typeMs = totalMs * 0.45
  const pauseMs = totalMs - typeMs
  const charDelay = Math.max(10, typeMs / line.length)
  return { charDelay, pauseMs }
}

type Phase = 'carga' | 'texto' | 'pregunta' | 'si-perfecto' | 'si-cargando' | 'si-exito' | 'no'

export function InitiativeIntro({ onDone }: { onDone: (useExisting: boolean) => void }) {
  const [phase, setPhase] = useState<Phase>('carga')
  const [lineIndex, setLineIndex] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [showContinue, setShowContinue] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setPhase('texto'), 1800)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    if (phase !== 'texto') return
    if (lineIndex >= LINES.length) {
      const id = setTimeout(() => setShowContinue(true), CONTINUE_APPEAR_DELAY_MS)
      return () => clearTimeout(id)
    }
    const line = t(LINES[lineIndex])
    const isLast = lineIndex === LINES.length - 1
    if (charCount < line.length) {
      const { charDelay } = linePacing(line)
      const id = setTimeout(() => setCharCount((c) => c + 1), charDelay)
      return () => clearTimeout(id)
    }
    const { pauseMs } = linePacing(line)
    const id = setTimeout(
      () => {
        setLineIndex((i) => i + 1)
        setCharCount(0)
      },
      isLast ? LAST_LINE_PAUSE_MS : pauseMs,
    )
    return () => clearTimeout(id)
  }, [phase, lineIndex, charCount])

  useEffect(() => {
    if (phase === 'si-perfecto') {
      const id = setTimeout(() => setPhase('si-cargando'), 1100)
      return () => clearTimeout(id)
    }
    if (phase === 'si-cargando') {
      const id = setTimeout(() => setPhase('si-exito'), 1900)
      return () => clearTimeout(id)
    }
    if (phase === 'si-exito') {
      const id = setTimeout(() => onDone(true), 1300)
      return () => clearTimeout(id)
    }
    if (phase === 'no') {
      const id = setTimeout(() => onDone(false), 1300)
      return () => clearTimeout(id)
    }
  }, [phase, onDone])

  if (phase === 'carga') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-stone-50">
        <p className="font-mono text-sm tracking-wide text-neutral-500">{t('Cargando Initiative.')}</p>
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-neutral-200 border-t-neutral-800" />
      </div>
    )
  }

  if (phase === 'pregunta') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-stone-50 px-6">
        <p className="animate-[fade-in_0.6s_ease-out_both] max-w-xl text-center font-mono text-[clamp(0.95rem,2.2vw,1.35rem)] leading-relaxed text-neutral-800">
          {t('¿Deseas usar tu información existente en Initiative?')}
        </p>
        <div className="animate-[fade-in_0.6s_ease-out_0.15s_both] flex gap-3">
          <button
            type="button"
            onClick={() => setPhase('si-perfecto')}
            className="rounded-full bg-neutral-900 px-8 py-2.5 text-sm font-medium text-stone-50 transition-colors hover:bg-neutral-700"
          >
            {t('Sí')}
          </button>
          <button
            type="button"
            onClick={() => setPhase('no')}
            className="rounded-full border border-neutral-300 px-8 py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-100"
          >
            {t('No')}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'si-perfecto' || phase === 'no') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-stone-50 px-6">
        <p
          key={phase}
          className="animate-[fade-in_0.5s_ease-out_both] max-w-xl text-center font-mono text-[clamp(0.95rem,2.2vw,1.35rem)] leading-relaxed text-neutral-800"
        >
          {phase === 'si-perfecto' ? t('Perfecto.') : t('Bien, continuemos.')}
        </p>
      </div>
    )
  }

  if (phase === 'si-cargando' || phase === 'si-exito') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-stone-50">
        <p className="animate-[fade-in_0.5s_ease-out_both] max-w-sm px-6 text-center font-mono text-sm tracking-wide text-neutral-500">
          {phase === 'si-cargando'
            ? t('Cargando información existente en Initiative.')
            : t('Información cargada con éxito.')}
        </p>
        {phase === 'si-cargando' && (
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-neutral-200 border-t-neutral-800" />
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-stone-50 px-6">
      <div className="w-full max-w-2xl font-mono text-[clamp(0.95rem,2.2vw,1.35rem)] leading-relaxed text-neutral-800">
        {LINES.slice(0, lineIndex + 1).map((line, i) => {
          const text = t(line)
          return (
            <p key={i} className="mb-3">
              {i < lineIndex ? text : text.slice(0, charCount)}
              {i === lineIndex && charCount < text.length && <span className="animate-pulse">▍</span>}
            </p>
          )
        })}
      </div>
      {showContinue && (
        <button
          type="button"
          onClick={() => setPhase('pregunta')}
          className="animate-[fade-in_0.6s_ease-out_both] rounded-full bg-neutral-900 px-8 py-2.5 text-sm font-medium text-stone-50 transition-colors hover:bg-neutral-700"
        >
          {t('Continuar')}
        </button>
      )}
    </div>
  )
}
