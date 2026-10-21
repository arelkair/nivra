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
  const [active, setActive] = useState(0)
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
  useEffect(() => setActive(0), [text])
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setText(''); setOpen(false); e.currentTarget.blur() }
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(i => Math.min(Math.max(0, results.length - 1), i + 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)) }
    if (e.key === 'Enter' && results[active]) { e.preventDefault(); choose(results[active]) }
  }
  useEffect(() => { box.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }) }, [active])

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
            onKeyDown={onKey}
            role="combobox"
            aria-expanded={open}
            aria-controls="classic-search-results"
            aria-activedescendant={open && results[active] ? `classic-hit-${active}` : undefined}
            placeholder={t('Buscar…')}
            aria-label={t('Buscar')}
            className={`${input} h-10 w-52 py-0 !pl-9 lg:w-72`}
          />
        </div>
      </div>

      {open && (
        <>
          <div
            className={`nv-search-dialog ${card} fixed inset-x-3 top-[4.2rem] z-30 overflow-hidden p-2 sm:absolute sm:inset-x-auto sm:top-12 sm:right-0 sm:w-[26rem]`}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKey}
              role="combobox"
              aria-expanded={open}
              aria-controls="classic-search-results"
              aria-activedescendant={results[active] ? `classic-hit-${active}` : undefined}
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
                {t('Nada coincide con tu búsqueda.')}
              </p>
            ) : (
              <ul id="classic-search-results" role="listbox" className="max-h-80 overflow-y-auto overscroll-contain">
                {results.map((r, index) => (
                  <li id={`classic-hit-${index}`} role="option" aria-selected={active === index} key={`${r.page}-${r.id}`}>
                    <button
                      type="button"
                      onClick={() => choose(r)}
                      onMouseMove={() => setActive(index)}
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
