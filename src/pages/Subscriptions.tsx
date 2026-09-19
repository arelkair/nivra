import { useState } from 'react'
import { eur, type Subscription } from '../lib/store'
import { notifyWithUndo } from '../lib/undo'
import { Empty, Icon, Label, Modal, button, card, input, line } from '../components/ui'
import { t, tp } from '../lib/i18n'
import { playDrop, playPop } from '../lib/sound'

type Props = {
  subs: Subscription[]
  setSubs: (update: (prev: Subscription[]) => Subscription[]) => void
}

export function Subscriptions({ subs, setSubs }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const editingItem = subs.find((s) => s.id === editingId)
  const total = subs.filter((x) => !x.paused && x.paidBy !== 'other').reduce((s, x) => s + x.price, 0)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <button type="button" onClick={() => setCreating(true)} className={`${button} w-fit`}>
        <span className="flex items-center gap-2">
          <Icon name="plus" className="h-4 w-4" />
          {t('Nueva suscripción')}
        </span>
      </button>

      <section className={`${card} animate-[fade-in_0.35s_ease-out] p-5 sm:p-6`}>
        <Label>
          {t('Suscripciones')} · {subs.length}
          {total > 0 && ` · ${eur(total)} ${t('al mes')}`}
        </Label>
        {subs.length === 0 ? (
          <Empty>{t('Sin suscripciones.')}</Empty>
        ) : (
          <ul className="flex flex-col">
            {subs.map((s) => (
              <li key={s.id} className={`flex items-center gap-3 border-b py-3 last:border-0 ${line}`}>
                <button
                  type="button"
                  onClick={() => setEditingId(s.id)}
                  className="min-w-0 flex-1 text-left"
                  title={t('Editar')}
                >
                  <span className="block truncate text-sm">
                    {s.title}
                    <span className={`ml-2 rounded border px-1.5 text-[0.6rem] ${s.paidBy === 'other' ? 'border-sky-500/50 text-sky-500' : 'border-neutral-300 text-neutral-400 dark:border-white/15 dark:text-neutral-500'}`}>
                      {s.paidBy === 'other' ? t('Lo paga otra persona') : t('Pagas tú')}
                    </span>
                  </span>
                  <span className="block text-[0.7rem] text-neutral-400 dark:text-neutral-500">
                    {tp('Se renueva el día {0} de cada mes', s.day)}
                    {s.lastCharged && tp(' · último cobro {0}', s.lastCharged)}
                  </span>
                </button>
                <span className={`shrink-0 font-mono text-sm tabular-nums ${s.paidBy === 'other' ? 'text-neutral-400' : 'text-red-500'}`}>
                  {s.paidBy === 'other' ? '' : '−'}{eur(s.price)}
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
                  onClick={() => {
                    playDrop()
                    const before = subs
                    setSubs((prev) => prev.filter((x) => x.id !== s.id))
                    notifyWithUndo(tp('«{0}» eliminada', s.title), () => setSubs(() => before))
                  }}
                  aria-label={`Eliminar ${s.title}`}
                  className="shrink-0 text-neutral-500 transition-colors hover:text-red-500 dark:text-neutral-500"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-[0.7rem] text-neutral-400 dark:text-neutral-500">
          {t('El día de renovación se resta solo del dinero, como gasto de categoría «Suscripción».')}
        </p>
      </section>

      {(creating || editingItem) && (
        <SubDialog
          sub={editingItem}
          onClose={() => {
            setCreating(false)
            setEditingId(null)
          }}
          onSave={(s) => {
            if (!editingItem) playPop()
            setSubs((prev) => (editingItem ? prev.map((x) => (x.id === s.id ? s : x)) : [...prev, s]))
            setCreating(false)
            setEditingId(null)
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
    <Modal title={sub ? t('Suscripción') : t('Nueva suscripción')} onClose={onClose}>
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          const data = new FormData(ev.currentTarget)
          const title = String(data.get('title') ?? '').trim()
          const price = Number(String(data.get('price') ?? '').replace(',', '.'))
          const dayNumber = Number(data.get('day'))
          if (!title || !Number.isFinite(price) || price <= 0) return
          if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) return
          const url = String(data.get('url') ?? '').trim()
          onSave({
            id: sub?.id ?? crypto.randomUUID(),
            title,
            price: Math.round(price * 100) / 100,
            day: dayNumber,
            url: /^https?:\/\//i.test(url) ? url : undefined,
            lastCharged: sub?.lastCharged,
            paused: sub?.paused,
            paidBy: data.get('paidBy') === 'other' ? 'other' : undefined,
          })
        }}
        className="flex flex-col gap-2"
      >
        <input
          name="title"
          defaultValue={sub?.title}
          maxLength={60}
          required
          placeholder={t('Nombre')}
          className={input}
        />
        <input
          name="url"
          type="url"
          defaultValue={sub?.url}
          placeholder="https://…"
          aria-label={t('Enlace')}
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
            placeholder={t('Precio')}
            aria-label={t('Precio al mes')}
            className={`${input} font-mono`}
          />
          <input
            name="day"
            type="number"
            min="1"
            max="31"
            defaultValue={sub?.day ?? new Date().getDate()}
            required
            aria-label={t('Día de renovación')}
            className={`${input} font-mono`}
          />
        </div>
        <select name="paidBy" defaultValue={sub?.paidBy ?? 'me'} aria-label={t('Quién paga')} className={input}>
          <option value="me">{t('Pago yo')}</option>
          <option value="other">{t('Otra persona')}</option>
        </select>
        <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
          {t('Precio al mes y día del mes en que se renueva.')}
        </p>
        <button type="submit" className={`${button} mt-2`}>
          {t('Guardar')}
        </button>
      </form>
    </Modal>
  )
}
