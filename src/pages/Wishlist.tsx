import { useState } from 'react'
import { eur, mover, type Wish } from '../lib/store'
import { Empty, Icon, Label, Modal, button, card, input } from '../components/ui'

type Props = {
  wishes: Wish[]
  setWishes: (update: (prev: Wish[]) => Wish[]) => void
}

export function Wishlist({ wishes, setWishes }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const editing = wishes.find((w) => w.id === editingId)
  const total = wishes.reduce((s, w) => s + (w.price ?? 0), 0)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <button type="button" onClick={() => setCreating(true)} className={`${button} w-fit`}>
        <span className="flex items-center gap-2">
          <Icon name="plus" className="h-4 w-4" />
          Nuevo deseo
        </span>
      </button>

      <section className={`${card} animate-[fade-in_0.35s_ease-out] p-5 sm:p-6`}>
        <Label>
          Deseos · {wishes.length}
          {total > 0 && ` · ${eur(total)}`}
        </Label>
        {wishes.length === 0 ? (
          <Empty>Sin deseos.</Empty>
        ) : (
          <ul className="flex flex-col">
            {wishes.map((w, i) => (
              <li
                key={w.id}
                className="flex items-center gap-3 border-b border-black/[0.06] py-3 last:border-0 dark:border-white/[0.08]"
              >
                <button
                  type="button"
                  onClick={() => setEditingId(w.id)}
                  className="min-w-0 flex-1 text-left"
                  title="Editar"
                >
                  <span className="block truncate text-sm">{w.title}</span>
                  {w.desc && (
                    <span className="block truncate text-[0.7rem] text-neutral-400 dark:text-neutral-500">
                      {w.desc}
                    </span>
                  )}
                </button>
                <span className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => setWishes((prev) => mover(prev, i, -1))}
                    aria-label={`Subir ${w.title}`}
                    className="text-neutral-300 hover:text-neutral-900 dark:text-neutral-600 dark:hover:text-white"
                  >
                    <Icon name="up" className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setWishes((prev) => mover(prev, i, 1))}
                    aria-label={`Bajar ${w.title}`}
                    className="text-neutral-300 hover:text-neutral-900 dark:text-neutral-600 dark:hover:text-white"
                  >
                    <Icon name="down" className="h-3 w-3" />
                  </button>
                </span>
                {w.price !== undefined && (
                  <span className="shrink-0 font-mono text-sm tabular-nums">{eur(w.price)}</span>
                )}
                {w.url && (
                  <a
                    href={w.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir ${w.title}`}
                    className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
                  >
                    <Icon name="link" className="h-4 w-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setWishes((prev) => prev.filter((x) => x.id !== w.id))}
                  aria-label={`Eliminar ${w.title}`}
                  className="shrink-0 text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(creating || editing) && (
        <WishDialog
          wish={editing}
          onClose={() => {
            setCreating(false)
            setEditingId(null)
          }}
          onSave={(w) => {
            setWishes((prev) => (editing ? prev.map((x) => (x.id === w.id ? w : x)) : [...prev, w]))
            setCreating(false)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

function WishDialog({
  wish,
  onClose,
  onSave,
}: {
  wish?: Wish
  onClose: () => void
  onSave: (w: Wish) => void
}) {
  return (
    <Modal title={wish ? 'Deseo' : 'Nuevo deseo'} onClose={onClose}>
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          const data = new FormData(ev.currentTarget)
          const title = String(data.get('title') ?? '').trim()
          if (!title) return
          const precio = Number(String(data.get('price') ?? '').replace(',', '.'))
          const url = String(data.get('url') ?? '').trim()
          onSave({
            id: wish?.id ?? crypto.randomUUID(),
            title,
            desc: String(data.get('desc') ?? '').trim() || undefined,
            price: Number.isFinite(precio) && precio > 0 ? Math.round(precio * 100) / 100 : undefined,
            url: /^https?:\/\//i.test(url) ? url : undefined,
          })
        }}
        className="flex flex-col gap-2"
      >
        <input
          name="title"
          defaultValue={wish?.title}
          maxLength={60}
          required
          placeholder="¿Qué quieres?"
          className={input}
        />
        <textarea
          name="desc"
          defaultValue={wish?.desc}
          maxLength={200}
          rows={2}
          placeholder="Descripción"
          className={input}
        />
        <input
          name="price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={wish?.price}
          placeholder="Precio"
          aria-label="Precio"
          className={`${input} font-mono`}
        />
        <input
          name="url"
          type="url"
          defaultValue={wish?.url}
          placeholder="https://donde-comprarlo.com"
          aria-label="Enlace"
          className={input}
        />
        <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
          El enlace debe empezar por http:// o https://.
        </p>
        <button type="submit" className={`${button} mt-2`}>
          Guardar
        </button>
      </form>
    </Modal>
  )
}
