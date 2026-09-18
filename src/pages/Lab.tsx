import { useState, type ComponentType } from 'react'
import { Icon, Label, card, line } from '../components/ui'
import {
  BaseConverter,
  Fractions,
  GcdLcm,
  Percentages,
  RuleOfThree,
  Statistics,
} from '../components/lab/MathTools'
import { CountdownTimer, DateCalculator, Stopwatch, TimeCalculator } from '../components/lab/TimeTools'
import { Coin, Dice, RandomNumber, Roulette } from '../components/lab/Generators'
import { CurrencyConverter, UnitConverter } from '../components/lab/Converters'
import { Flashcards, Quizzes } from '../components/lab/Study'
import { t } from '../lib/i18n'
import type { Subject } from '../lib/store'

type Tool = { id: string; label: string; hint: string; render: (subjects: Subject[]) => React.ReactNode }

const simple = (Component: ComponentType) => () => <Component />

const ZONES: { title: string; tools: Tool[] }[] = [
  {
    title: 'Zona matemática',
    tools: [
      { id: 'regla3', label: 'Regla de tres', hint: 'Directa e inversa', render: simple(RuleOfThree) },
      { id: 'porcentajes', label: 'Porcentajes', hint: 'Descuentos, aumentos, variación', render: simple(Percentages) },
      { id: 'fracciones', label: 'Fracciones', hint: 'Operar y simplificar', render: simple(Fractions) },
      { id: 'estadistica', label: 'Media, mediana y moda', hint: 'Y más estadísticos', render: simple(Statistics) },
      { id: 'mcdmcm', label: 'MCD y MCM', hint: 'De varios números', render: simple(GcdLcm) },
      { id: 'bases', label: 'Cambio de base', hint: 'Binario, hexadecimal…', render: simple(BaseConverter) },
    ],
  },
  {
    title: 'Zona de tiempo',
    tools: [
      { id: 'fechas', label: 'Calculadora de fechas', hint: 'Diferencias y sumas', render: simple(DateCalculator) },
      { id: 'horas', label: 'Calculadora de horas', hint: 'Sumar y restar duraciones', render: simple(TimeCalculator) },
      { id: 'temporizador', label: 'Cuenta atrás corta', hint: 'Con alarma configurable', render: simple(CountdownTimer) },
      { id: 'cronometro', label: 'Cronómetro', hint: 'Con vueltas', render: simple(Stopwatch) },
    ],
  },
  {
    title: 'Generadores',
    tools: [
      { id: 'ruleta', label: 'Ruleta', hint: 'Con probabilidades a medida', render: simple(Roulette) },
      { id: 'dados', label: 'Dados', hint: 'De cualquier número de caras', render: simple(Dice) },
      { id: 'moneda', label: 'Moneda', hint: 'Cara o cruz', render: simple(Coin) },
      { id: 'aleatorio', label: 'Número aleatorio', hint: 'En el rango que quieras', render: simple(RandomNumber) },
    ],
  },
  {
    title: 'Cambio de cifras',
    tools: [
      { id: 'unidades', label: 'Unidades', hint: 'Longitud, masa, temperatura…', render: simple(UnitConverter) },
      { id: 'divisas', label: 'Divisas', hint: 'Tasas del BCE', render: simple(CurrencyConverter) },
    ],
  },
  {
    title: 'Estudio',
    tools: [
      { id: 'flashcards', label: 'Flashcards', hint: 'Mazos con repaso espaciado', render: simple(Flashcards) },
      {
        id: 'examenes',
        label: 'Exámenes por asignatura',
        hint: 'Test con corrección',
        render: (subjects) => <Quizzes subjects={subjects} />,
      },
    ],
  },
]

export function Lab({ subjects }: { subjects: Subject[] }) {
  const [toolId, setToolId] = useState<string | null>(null)
  const tool = ZONES.flatMap((z) => z.tools).find((x) => x.id === toolId) ?? null

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="animate-[fade-in_0.4s_ease-out]">
        <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{t('Laboratorio')}</h2>
        <p className="mt-1 text-sm text-neutral-400 dark:text-neutral-500">
          {t('Calculadoras, generadores, conversores y herramientas de estudio.')}
        </p>
      </header>

      {tool ? (
        <section className={`${card} animate-[fade-in_0.3s_ease-out] flex flex-col gap-5 p-5 sm:p-6`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setToolId(null)}
              className="flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
            >
              <Icon name="left" className="h-4 w-4" />
              {t('Laboratorio')}
            </button>
            <h3 className="min-w-0 flex-1 truncate text-right text-sm font-medium">{t(tool.label)}</h3>
          </div>
          {tool.render(subjects)}
        </section>
      ) : (
        ZONES.map((zone, zi) => (
          <section
            key={zone.title}
            style={{ animationDelay: `${zi * 0.05}s` }}
            className={`${card} animate-[fade-in_0.4s_ease-out_both] p-5 sm:p-6`}
          >
            <Label>{t(zone.title)}</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {zone.tools.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setToolId(x.id)}
                  className={`flex flex-col gap-0.5 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.05] ${line}`}
                >
                  <span className="text-sm font-medium">{t(x.label)}</span>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">{t(x.hint)}</span>
                </button>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
