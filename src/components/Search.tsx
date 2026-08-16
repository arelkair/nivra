import { useMemo, useState } from 'react'
import type { PageId } from '../lib/store'
import { Icon, card, input, line } from './ui'

export type Resultado = { id: string; titulo: string; tipo: string; page: PageId }

export function Search({
  buscar,
  onIr,
}: {
  buscar: (texto: string) => Resultado[]
  onIr: (page: PageId) => void
}) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const resultados = useMemo(() => (texto.trim() ? buscar(texto.trim()) : []), [texto, buscar])

  const elegir = (r: Resultado) => {
    onIr(r.page)
    setTexto('')
    setAbierto(false)
  }

  return (
    <div className="relative">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setAbierto(!abierto)}
          aria-label="Buscar"
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
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              setAbierto(true)
            }}
            onFocus={() => setAbierto(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setTexto('')
                setAbierto(false)
                e.currentTarget.blur()
              }
              if (e.key === 'Enter' && resultados[0]) elegir(resultados[0])
            }}
            placeholder="Buscar…"
            aria-label="Buscar"
            className={`${input} h-10 w-44 py-0 pl-9 lg:w-60`}
          />
        </div>
      </div>

      {abierto && (
        <>
          <div className="fixed inset-0 z-20 sm:hidden" onClick={() => setAbierto(false)} />
          <div
            className={`${card} absolute top-12 right-0 z-30 w-[min(22rem,calc(100vw-2.5rem))] overflow-hidden p-2 shadow-xl`}
          >
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoFocus
              placeholder="Buscar…"
              aria-label="Buscar"
              className={`${input} mb-2 sm:hidden`}
            />
            {texto.trim() === '' ? (
              <p className="px-2 py-3 text-sm text-neutral-400 dark:text-neutral-500">
                Escribe para buscar en todos los apartados.
              </p>
            ) : resultados.length === 0 ? (
              <p className="px-2 py-3 text-sm text-neutral-400 dark:text-neutral-500">
                Nada coincide con «{texto}».
              </p>
            ) : (
              <ul className="max-h-80 overflow-y-auto overscroll-contain">
                {resultados.map((r) => (
                  <li key={`${r.page}-${r.id}`}>
                    <button
                      type="button"
                      onClick={() => elegir(r)}
                      className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    >
                      <span className="block truncate text-sm">{r.titulo}</span>
                      <span className="block text-[0.65rem] text-neutral-400 dark:text-neutral-500">
                        {r.tipo}
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
