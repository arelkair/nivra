import { useEffect, useRef, useState } from 'react'
import { paginasDe, sanitize, type Notepad, type NotepadPage } from '../lib/store'
import { conDeshacer } from '../lib/undo'
import { Empty, Icon, Modal, button, card, input, line } from '../components/ui'

type Props = {
  notepads: Notepad[]
  setNotepads: (update: (prev: Notepad[]) => Notepad[]) => void
}

const COLORES = ['#1a1a1a', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7']

export function Notepads({ notepads, setNotepads }: Props) {
  const [activeId, setActiveId] = useState<string | null>(notepads[0]?.id ?? null)
  const [renaming, setRenaming] = useState<Notepad | null>(null)
  const [creating, setCreating] = useState(false)
  const active = notepads.find((n) => n.id === activeId) ?? notepads[0]

  const crear = (title: string) => {
    const id = crypto.randomUUID()
    const nuevo: Notepad = { id, title, pages: [{ id: id + '-1', html: '' }] }
    setNotepads((prev) => [...prev, nuevo])
    setActiveId(id)
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {notepads.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => (n.id === active?.id ? setRenaming(n) : setActiveId(n.id))}
            title={n.id === active?.id ? 'Renombrar o eliminar' : 'Abrir'}
            className={`rounded-xl border px-4 py-2 text-sm transition-colors ${
              n.id === active?.id
                ? 'border-neutral-900 font-medium dark:border-white'
                : `${line} text-neutral-500 hover:bg-black/[0.03] dark:text-neutral-400 dark:hover:bg-white/[0.04]`
            }`}
          >
            {n.title}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label="Nuevo bloc"
          className={`grid h-10 w-10 place-items-center rounded-xl border border-dashed text-neutral-400 transition-colors hover:text-neutral-900 ${line} dark:hover:text-white`}
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
      </div>

      {active ? (
        <Editor
          notepad={active}
          onPaginas={(pages) =>
            setNotepads((prev) =>
              prev.map((n) => (n.id === active.id ? { ...n, pages, html: undefined } : n)),
            )
          }
        />
      ) : (
        <section className={`${card} p-6`}>
          <Empty>Sin blocs. Crea el primero con el botón +.</Empty>
        </section>
      )}

      {(creating || renaming) && (
        <Modal
          title={renaming ? 'Bloc' : 'Nuevo bloc'}
          onClose={() => {
            setCreating(false)
            setRenaming(null)
          }}
        >
          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              const title = String(new FormData(ev.currentTarget).get('title') ?? '').trim()
              if (!title) return
              if (renaming) {
                setNotepads((prev) =>
                  prev.map((n) => (n.id === renaming.id ? { ...n, title } : n)),
                )
                setRenaming(null)
              } else {
                crear(title)
                setCreating(false)
              }
            }}
            className="flex flex-col gap-2"
          >
            <input
              name="title"
              defaultValue={renaming?.title}
              maxLength={30}
              required
              autoFocus
              placeholder="Nombre del bloc"
              className={input}
            />
            <div className="mt-2 flex gap-2">
              {renaming && (
                <button
                  type="button"
                  onClick={() => {
                    const antes = notepads
                    setNotepads((prev) => prev.filter((n) => n.id !== renaming.id))
                    setActiveId(null)
                    setRenaming(null)
                    conDeshacer(`«${renaming.title}» eliminado`, () => setNotepads(() => antes))
                  }}
                  className="rounded-xl px-4 py-2.5 text-sm text-neutral-400 transition-colors hover:text-red-500"
                >
                  Eliminar
                </button>
              )}
              <button type="submit" className={`${button} ml-auto`}>
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export function Editor({
  notepad,
  onPaginas,
  compacto,
}: {
  notepad: Notepad
  onPaginas: (pages: NotepadPage[]) => void
  compacto?: boolean
}) {
  const paginas = paginasDe(notepad)
  const [indice, setIndice] = useState(0)
  const actual = paginas[Math.min(indice, paginas.length - 1)]
  const ref = useRef<HTMLDivElement>(null)

  const ultimo = useRef<string | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const limpio = sanitize(actual.html)
    if (limpio === ultimo.current) return
    if (el.innerHTML === limpio) {
      ultimo.current = limpio
      return
    }
    el.innerHTML = limpio
    ultimo.current = limpio
  })

  const onChange = (html: string) => {
    ultimo.current = html
    onPaginas(paginas.map((p) => (p.id === actual.id ? { ...p, html } : p)))
  }

  const aplicar = (comando: string, valor?: string) => {
    ref.current?.focus()
    document.execCommand(comando, false, valor)
    if (ref.current) onChange(sanitize(ref.current.innerHTML))
  }

  const boton =
    'grid h-9 w-9 place-items-center rounded-lg border text-sm transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'

  return (
    <section className={`${card} flex flex-col overflow-hidden`}>
      <div className={`flex flex-wrap items-center gap-1.5 border-b p-2 ${line}`}>
        <button
          type="button"
          onClick={() => aplicar('bold')}
          aria-label="Negrita"
          className={`${boton} ${line} font-bold`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => aplicar('italic')}
          aria-label="Cursiva"
          className={`${boton} ${line} font-serif italic`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => aplicar('underline')}
          aria-label="Subrayado"
          className={`${boton} ${line} underline`}
        >
          U
        </button>
        <button
          type="button"
          onClick={() => aplicar('strikeThrough')}
          aria-label="Tachado"
          className={`${boton} ${line} line-through`}
        >
          S
        </button>

        <span className={`mx-1 h-6 w-px ${'bg-black/10 dark:bg-white/15'}`} />

        {COLORES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => aplicar('foreColor', c)}
            aria-label={`Color ${c}`}
            className="h-6 w-6 rounded-full border border-black/10 transition-transform hover:scale-110 dark:border-white/20"
            style={{ background: c }}
          />
        ))}

        <span className={`mx-1 h-6 w-px ${'bg-black/10 dark:bg-white/15'}`} />

        <button
          type="button"
          onClick={() => aplicar('insertUnorderedList')}
          aria-label="Lista"
          className={`${boton} ${line}`}
        >
          <Icon name="tasks" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => aplicar('removeFormat')}
          aria-label="Quitar formato"
          className={`${boton} ${line} text-neutral-400`}
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>

      <div
        key={notepad.id + actual.id}
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={`Contenido de ${notepad.title}`}
        onInput={(e) => onChange(sanitize(e.currentTarget.innerHTML))}
        className={`${compacto ? 'min-h-40 flex-1 overflow-y-auto p-4' : 'min-h-[24rem] p-5'} nivra-scroll text-sm leading-relaxed outline-none [&_ul]:list-disc [&_ul]:pl-5`}
      />

      <div className={`flex items-center justify-between gap-2 border-t p-2 ${line}`}>
        <button
          type="button"
          onClick={() => setIndice((i) => Math.max(0, i - 1))}
          disabled={indice === 0}
          aria-label="Página anterior"
          className={boton + ' ' + line + ' disabled:opacity-30'}
        >
          <Icon name="left" className="h-4 w-4" />
        </button>

        <div className="flex flex-wrap items-center justify-center gap-1">
          {paginas.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndice(i)}
              aria-label={'Página ' + (i + 1)}
              aria-current={i === indice}
              className={
                'h-7 min-w-7 rounded-lg px-2 font-mono text-xs transition-colors ' +
                (i === indice
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white')
              }
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const nueva = { id: crypto.randomUUID(), html: '' }
              onPaginas([...paginas, nueva])
              setIndice(paginas.length)
            }}
            aria-label="Nueva página"
            className={boton + ' ' + line + ' ml-1'}
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
          </button>
          {paginas.length > 1 && (
            <button
              type="button"
              onClick={() => {
                onPaginas(paginas.filter((p) => p.id !== actual.id))
                setIndice((i) => Math.max(0, i - 1))
              }}
              aria-label="Eliminar esta página"
              className={boton + ' ' + line + ' text-neutral-400 hover:text-red-500'}
            >
              <Icon name="trash" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIndice((i) => Math.min(paginas.length - 1, i + 1))}
          disabled={indice >= paginas.length - 1}
          aria-label="Página siguiente"
          className={boton + ' ' + line + ' disabled:opacity-30'}
        >
          <Icon name="right" className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
