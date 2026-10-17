import { getLang } from '../lib/i18n'
import { LEGAL, LEGAL_PATH, type LegalKind } from '../lib/legal'

export function Legal({ kind }: { kind: LegalKind }) {
  const lang = getLang() === 'en' ? 'en' : 'es'
  const doc = LEGAL[kind][lang]
  const other: LegalKind = kind === 'privacy' ? 'cookies' : 'privacy'

  return (
    <div className="min-h-svh bg-[var(--paper)] px-6 py-14 text-neutral-900 sm:px-10 dark:text-neutral-200">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <nav className="flex items-center justify-between gap-4 text-sm text-neutral-500 dark:text-neutral-400">
          <a href="/dashboard" className="transition-colors hover:text-neutral-900 dark:hover:text-white">
            ← {doc.back}
          </a>
          <a href={LEGAL_PATH[other]} className="transition-colors hover:text-neutral-900 dark:hover:text-white">
            {LEGAL[other][lang].title}
          </a>
        </nav>

        <header className="flex flex-col gap-3">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{doc.title}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{doc.updated}</p>
          <p className="text-base leading-relaxed text-neutral-700 dark:text-neutral-300">{doc.intro}</p>
        </header>

        {doc.blocks.map((block) => (
          <section key={block.heading} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight">{block.heading}</h2>
            {block.text?.map((paragraph) => (
              <p key={paragraph} className="leading-relaxed text-neutral-700 dark:text-neutral-300">
                {paragraph}
              </p>
            ))}
            {block.list && (
              <ul className="flex list-disc flex-col gap-2 pl-5 leading-relaxed text-neutral-700 marker:text-neutral-400 dark:text-neutral-300">
                {block.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </main>
    </div>
  )
}
