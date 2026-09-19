import { useState } from 'react'
import { Icon, Label, card, line } from '../components/ui'
import { LAB_ZONES } from '../components/lab/zones'
import { t } from '../lib/i18n'
import type { Subject } from '../lib/store'

export function Lab({ subjects }: { subjects: Subject[] }) {
  const [toolId, setToolId] = useState<string | null>(null)
  const tool = LAB_ZONES.flatMap((z) => z.tools).find((x) => x.id === toolId) ?? null

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
        LAB_ZONES.map((zone, zi) => (
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
