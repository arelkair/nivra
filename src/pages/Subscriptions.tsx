import { useState } from 'react'
import { eur, type Subscription } from '../lib/store'
import { Empty, Icon, Label, Modal, button, card, input, line } from '../components/ui'

type Props = {
  subs: Subscription[]
  setSubs: (update: (prev: Subscription[]) => Subscription[]) => void
}

export function Subscriptions({ subs, setSubs }: Props) {
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const editando = subs.find((s) => s.id === editandoId)
  const total = subs.reduce((s, x) => s + x.price, 0)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <button type="button" onClick={() => setCreando(true)} className={`${button} w-fit`}>
        <span className="flex items-center gap-2">
          <Icon name="plus" className="h-4 w-4" />
          Nueva suscripción
        </span>
      </button>

      <section className={`${card} animate-[fade-in_0.35s_ease-out] p-5 sm:p-6`}>
        <Label>
          Suscripciones · {subs.length}
          {total > 0 && ` · ${eur(total)} al mes`}
        </Label>
        {subs.length === 0 ? (
          <Empty>Sin suscripciones.</Empty>
        ) : (
          <ul className="flex flex-col">
            {subs.map((s) => (
              <li key={s.id} className={`flex items-center gap-3 border-b py-3 last:border-0 ${line}`}>
                <button
                  type="button"
                  onClick={() => setEditandoId(s.id)}
                  className="min-w-0 flex-1 text-left"
                  title="Editar"
                >
                  <span className="block truncate text-sm">{s.title}</span>
                  <span className="block text-[0.7rem] text-neutral-400 dark:text-neutral-500">
                    Se renueva el día {s.day} de cada mes
                    {s.lastCharged && ` · último cobro ${s.lastCharged}`}
                  </span>
                </button>
                <span className="shrink-0 font-mono text-sm tabular-nums text-red-500">
                  −{eur(s.price)}
                </span>
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir ${s.title}`}
                    className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
                  >
                    <Icon name="link" className="h-4 w-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSubs((prev) => prev.filter((x) => x.id !== s.id))}
                  aria-label={`Eliminar ${s.title}`}
                  className="shrink-0 text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-[0.7rem] text-neutral-400 dark:text-neutral-500">
          El día de renovación se resta solo del dinero, como gasto de categoría «Suscripción».
        </p>
      </section>

      {(creando || editando) && (
        <SubDialog
          sub={editando}
          onClose={() => {
            setCreando(false)
            setEditandoId(null)
          }}
          onSave={(s) => {
            setSubs((prev) => (editando ? prev.map((x) => (x.id === s.id ? s : x)) : [...prev, s]))
            setCreando(false)
            setEditandoId(null)
          }}
        />
      )}
    </div>
  )
}

function SubDialog({
  sub,
  onClose,
  onSave,
}: {
  sub?: Subscription
  onClose: () => void
  onSave: (s: Subscription) => void
}) {
  return (
    <Modal title={sub ? 'Suscripción' : 'Nueva suscripción'} onClose={onClose}>
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          const data = new FormData(ev.currentTarget)
          const title = String(data.get('title') ?? '').trim()
          const precio = Number(String(data.get('price') ?? '').replace(',', '.'))
          const dia = Number(data.get('day'))
          if (!title || !Number.isFinite(precio) || precio <= 0) return
          if (!Number.isInteger(dia) || dia < 1 || dia > 31) return
          const url = String(data.get('url') ?? '').trim()
          onSave({
            id: sub?.id ?? crypto.randomUUID(),
            title,
            price: Math.round(precio * 100) / 100,
            day: dia,
            url: /^https?:\/\//i.test(url) ? url : undefined,
            lastCharged: sub?.lastCharged,
          })
        }}
        className="flex flex-col gap-2"
      >
        <input
          name="title"
          defaultValue={sub?.title}
          maxLength={60}
          required
          placeholder="Nombre"
          className={input}
        />
        <input
          name="url"
          type="url"
          defaultValue={sub?.url}
          placeholder="https://…"
          aria-label="Enlace"
          className={input}
        />
        <div className="flex gap-2">
          <input
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={sub?.price}
            required
            placeholder="Precio"
            aria-label="Precio al mes"
            className={`${input} font-mono`}
          />
          <input
            name="day"
            type="number"
            min="1"
            max="31"
            defaultValue={sub?.day ?? new Date().getDate()}
            required
            aria-label="Día de renovación"
            className={`${input} font-mono`}
          />
        </div>
        <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
          Precio al mes y día del mes en que se renueva.
        </p>
        <button type="submit" className={`${button} mt-2`}>
          Guardar
        </button>
      </form>
    </Modal>
  )
}
