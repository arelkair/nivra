import type { ComponentType } from 'react'
import { BaseConverter, Fractions, GcdLcm, Percentages, RuleOfThree, Statistics } from './MathTools'
import { CountdownTimer, DateCalculator, Stopwatch, TimeCalculator } from './TimeTools'
import { Coin, Dice, RandomNumber, Roulette } from './Generators'
import { CurrencyConverter, UnitConverter } from './Converters'
import { Flashcards, Quizzes } from './Study'
import type { Subject } from '../../lib/store'

export type LabTool = { id: string; label: string; hint: string; render: (subjects: Subject[]) => React.ReactNode }

const simple = (Component: ComponentType) => () => <Component />

export const LAB_ZONES: { title: string; tools: LabTool[] }[] = [
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
