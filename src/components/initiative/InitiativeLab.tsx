import { useState, type ReactNode } from 'react'
import { t } from '../../lib/i18n'
import { Icon } from '../ui'
import { CalcTab } from './calc/CalcTab'
import { BaseMode, EquationsMode, MatrixMode, StatsMode, TableMode } from './calc/modes'
import { skin, type Skin } from './skin'
import { Dice, Roulette } from '../lab/Generators'
import { Base64Tool } from './tools/Base64Tool'
import { ImageConverter } from './tools/ImageConverter'
import { PdfTool } from './tools/PdfTool'

const CALC_TABS = [
  { id: 'calc', label: 'Calcular' },
  { id: 'stats', label: 'Estadística' },
  { id: 'equations', label: 'Ecuaciones' },
  { id: 'base', label: 'Base-N' },
  { id: 'matrix', label: 'Matrices' },
  { id: 'table', label: 'Tabla' },
] as const

type CalcTabId = (typeof CALC_TABS)[number]['id']

function Scientific({ s }: { s: Skin }) {
  const [tab, setTab] = useState<CalcTabId>('calc')
  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" className={`nivra-scroll flex gap-1 overflow-x-auto rounded-xl border p-1 ${s.line}`}>
        {CALC_TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors ${tab === x.id ? s.active : `${s.muted} ${s.hover} ${s.hoverText}`}`}
          >
            {t(x.label)}
          </button>
        ))}
      </div>
      {tab === 'calc' && <CalcTab s={s} />}
      {tab === 'stats' && <StatsMode s={s} />}
      {tab === 'equations' && <EquationsMode s={s} />}
      {tab === 'base' && <BaseMode s={s} />}
      {tab === 'matrix' && <MatrixMode s={s} />}
      {tab === 'table' && <TableMode s={s} />}
    </div>
  )
}

type Tool = { id: string; label: string; hint: string; render: (s: Skin) => ReactNode }

const ZONES: { id: string; title: string; hint: string; tools: Tool[] }[] = [
  {
    id: 'mates',
    title: 'Matemáticas',
    hint: 'Cálculo y resolución',
    tools: [
      {
        id: 'cientifica',
        label: 'Calculadora científica',
        hint: 'Funciones, trigonometría, memoria e historial',
        render: (s) => <Scientific s={s} />,
      },
    ],
  },
  {
    id: 'generadores',
    title: 'Generadores',
    hint: 'Azar para decidir y jugar',
    tools: [
      {
        id: 'ruleta',
        label: 'Ruleta',
        hint: 'Con probabilidades a medida',
        render: (s) => (
          <section className={`flex flex-col gap-5 rounded-2xl border p-4 sm:p-6 ${s.line} ${s.panel}`}>
            <Roulette />
          </section>
        ),
      },
      {
        id: 'dados',
        label: 'Dados',
        hint: 'De cualquier número de caras',
        render: (s) => (
          <section className={`flex flex-col gap-5 rounded-2xl border p-4 sm:p-6 ${s.line} ${s.panel}`}>
            <Dice />
          </section>
        ),
      },
    ],
  },
  {
    id: 'archivos',
    title: 'Archivos',
    hint: 'Conversión de archivos en tu equipo',
    tools: [
      {
        id: 'imagenes',
        label: 'Conversor de imágenes',
        hint: '11 formatos, con AVIF, ICO y HEIC de entrada',
        render: (s) => <ImageConverter s={s} />,
      },
      {
        id: 'pdf',
        label: 'Herramientas PDF',
        hint: 'Unir, dividir, rotar y crear PDF',
        render: (s) => <PdfTool s={s} />,
      },
    ],
  },
  {
    id: 'texto',
    title: 'Texto y datos',
    hint: 'Codificación y formatos',
    tools: [
      {
        id: 'base64',
        label: 'Base64',
        hint: 'Texto y archivos, en los dos sentidos',
        render: (s) => <Base64Tool s={s} />,
      },
    ],
  },
]

export function InitiativeLab({ dark }: { dark: boolean }) {
  const s = skin(dark)
  const [toolId, setToolId] = useState<string | null>(null)
  const located = ZONES.flatMap((zone) => zone.tools.map((tool) => ({ zone, tool }))).find((x) => x.tool.id === toolId)

  if (located) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <button type="button" onClick={() => setToolId(null)} className={`flex w-fit items-center gap-1.5 text-sm ${s.muted} ${s.hoverText} transition-colors`}>
          <Icon name="left" className="h-4 w-4" />
          {t('Laboratorio')}
          <span className={s.faint}>/</span>
          <span>{t(located.zone.title)}</span>
        </button>
        <h1 className="font-initiative text-3xl font-medium tracking-tight sm:text-4xl">{t(located.tool.label)}</h1>
        {located.tool.render(s)}
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-initiative text-3xl font-medium tracking-tight sm:text-4xl">{t('Laboratorio')}</h1>
        <p className={`text-sm ${s.muted}`}>{t('Herramientas para el día a día.')}</p>
      </div>
      {ZONES.map((zone) => (
        <section key={zone.id} className="flex flex-col gap-3">
          <div className={`flex items-baseline justify-between gap-3 border-b pb-2 ${s.line}`}>
            <h2 className="text-sm font-medium">{t(zone.title)}</h2>
            <p className={`text-xs ${s.faint}`}>{t(zone.hint)}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {zone.tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => setToolId(tool.id)}
                className={`flex flex-col gap-0.5 rounded-xl border px-4 py-3 text-left transition-colors ${s.line} ${s.hover}`}
              >
                <span className="text-sm font-medium">{t(tool.label)}</span>
                <span className={`text-xs ${s.faint}`}>{t(tool.hint)}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
