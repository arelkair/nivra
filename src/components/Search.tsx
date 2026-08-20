import { useEffect, useMemo, useRef, useState } from 'react'
import type { PageId } from '../lib/store'
import { Icon, card, input, line } from './ui'
import { t } from '../lib/i18n'

export type Destination = PageId | 'ajustes'

export type SearchResult = { id: string; title: string; kind: string; page: Destination }

export function Search({
  search,
  onIr,
}: {
  search: (text: string) => SearchResult[]
  onIr: (page: Destination) => void
}) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const outside = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    addEventListener('pointerdown', outside)
    return () => removeEventListener('pointerdown', outside)
  }, [open])
  const results = useMemo(() => (text.trim() ? search(text.trim()) : []), [text, search])

  const choose = (r: SearchResult) => {
    onIr(r.page)
    setText('')
    setOpen(false)
  }

  return (
    <div ref={box} className="relative">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={t('Buscar')}
          className={`grid h-10 w-10 place-items-center rounded-xl border text-neutral-500 transition-colors hover:text-neutral-900 sm:hidden ${line} dark:text-neutral-400 dark:hover:text-white`}
        >
          <Icon name="search" className="h-[18px] w-[18px]" />
        </button>

        <div className="relative hidden sm:block">
          <Icon
            name="search"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
          />
          <input
            id="nivra-buscador"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setText('')
                setOpen(false)
                e.currentTarget.blur()
              }
              if (e.key === 'Enter' && results[0]) choose(results[0])
            }}
            placeholder={t('Buscar…')}
            aria-label={t('Buscar')}
            className={`${input} h-10 w-44 py-0 !pl-9 lg:w-60`}
          />
        </div>
      </div>

      {open && (
        <>
          <div
            className={`${card} fixed inset-x-3 top-[4.2rem] z-30 overflow-hidden p-2 shadow-xl sm:absolute sm:inset-x-auto sm:top-12 sm:right-0 sm:w-[22rem]`}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
              placeholder={t('Buscar…')}
              aria-label={t('Buscar')}
              className={`${input} mb-2 sm:hidden`}
            />
            {text.trim() === '' ? (
              <p className="px-2 py-3 text-sm text-neutral-400 dark:text-neutral-500">
                {t('Escribe para buscar en todos los apartados.')}
              </p>
            ) : results.length === 0 ? (
              <p className="px-2 py-3 text-sm text-neutral-400 dark:text-neutral-500">
                Nada coincide con «{text}».
              </p>
            ) : (
              <ul className="max-h-80 overflow-y-auto overscroll-contain">
                {results.map((r) => (
                  <li key={`${r.page}-${r.id}`}>
                    <button
                      type="button"
                      onClick={() => choose(r)}
                      className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    >
                      <span className="block truncate text-sm">{r.title}</span>
                      <span className="block text-[0.65rem] text-neutral-400 dark:text-neutral-500">
                        {r.kind}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
