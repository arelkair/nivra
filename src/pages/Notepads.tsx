import { useEffect, useRef, useState } from 'react'
import { sanitize, type Notepad } from '../lib/store'
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
    const nuevo = { id: crypto.randomUUID(), title, html: '' }
    setNotepads((prev) => [...prev, nuevo])
    setActiveId(nuevo.id)
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
          key={active.id}
          notepad={active}
          onChange={(html) =>
            setNotepads((prev) => prev.map((n) => (n.id === active.id ? { ...n, html } : n)))
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
                    setNotepads((prev) => prev.filter((n) => n.id !== renaming.id))
                    setActiveId(null)
                    setRenaming(null)
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

function Editor({ notepad, onChange }: { notepad: Notepad; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const inicial = useRef(notepad.html)

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = sanitize(inicial.current)
  }, [])

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
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={`Contenido de ${notepad.title}`}
        onInput={(e) => onChange(sanitize(e.currentTarget.innerHTML))}
        className="min-h-[24rem] p-5 text-sm leading-relaxed outline-none [&_ul]:list-disc [&_ul]:pl-5"
      />
    </section>
  )
}
