import { useState } from 'react'
import { dateKey, eur, type Subscription } from '../../lib/store'
import { notifyWithUndo } from '../../lib/undo'
import { locale, t, tp } from '../../lib/i18n'
import { playDrop, playPop } from '../../lib/sound'
import { Icon } from '../ui'
import { cleanDecimal, nextRenewal, parseAmount } from './moneyCalc'
import { skin, type Skin } from './skin'

type Props = {
  subs: Subscription[]
  setSubs: (update: (prev: Subscription[]) => Subscription[]) => void
  dark: boolean
}

type Sort = 'renovacion' | 'precio' | 'nombre'

const cleanDay = (text: string) => {
  const digits = text.replace(/[^0-9]/g, '').slice(0, 2)
  if (digits === '') return ''
  return String(Math.min(31, Number(digits)))
}

export function InitiativeSubscriptions({ subs, setSubs, dark }: Props) {
  const s = skin(dark)
  const now = new Date()
  const [sort, setSort] = useState<Sort>('renovacion')
  const [openId, setOpenId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [day, setDay] = useState(String(now.getDate()))
  const [link, setLink] = useState('')

  const active = subs.filter((x) => !x.paused)
  const monthly = active.reduce((a, x) => a + x.price, 0)
  const withNext = subs.map((x) => ({ sub: x, next: nextRenewal(x.day, now) }))
  const upcoming = withNext.filter((x) => !x.sub.paused).sort((a, b) => a.next.days - b.next.days)[0]
  const parsedPrice = parseAmount(price)
  const dayNumber = Number(day)
  const canAdd = title.trim() !== '' && parsedPrice !== null && dayNumber >= 1 && dayNumber <= 31

  const ordered = [...withNext].sort((a, b) => {
    if (!!a.sub.paused !== !!b.sub.paused) return a.sub.paused ? 1 : -1
    if (sort === 'precio') return b.sub.price - a.sub.price
    if (sort === 'nombre') return a.sub.title.localeCompare(b.sub.title)
    return a.next.days - b.next.days
  })

  const add = () => {
    if (!canAdd || parsedPrice === null) return
    playPop()
    const url = link.trim()
    setSubs((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        price: parsedPrice,
        day: dayNumber,
        url: /^https?:\/\//i.test(url) ? url : undefined,
      },
    ])
    setTitle('')
    setPrice('')
    setLink('')
  }

  const patch = (id: string, changes: Partial<Subscription>) =>
    setSubs((prev) => prev.map((x) => (x.id === id ? { ...x, ...changes } : x)))

  const remove = (id: string) => {
    playDrop()
    const before = subs
    const name = subs.find((x) => x.id === id)?.title ?? ''
    setSubs((prev) => prev.filter((x) => x.id !== id))
    setOpenId(null)
    notifyWithUndo(tp('«{0}» eliminada', name), () => setSubs(() => before))
  }

  const togglePause = (sub: Subscription) => {
    playPop()
    if (sub.paused) patch(sub.id, { paused: undefined, lastCharged: dateKey(new Date()) })
    else patch(sub.id, { paused: true })
  }

  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const renewalDays = new Set(active.map((x) => Math.min(x.day, lastDay)))
  const label = `font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`

  const stats = [
    { title: t('Al mes'), value: eur(monthly) },
    { title: t('Al año'), value: eur(monthly * 12) },
    { title: t('Activas'), value: String(active.length) },
    {
      title: t('Próxima renovación'),
      value: upcoming ? (upcoming.next.days === 0 ? t('Hoy') : tp('En {0} días', upcoming.next.days)) : '—',
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-initiative text-3xl font-medium tracking-tight sm:text-4xl">{t('Suscripciones')}</h1>
        {upcoming && (
          <p className={`text-xs ${s.faint}`}>
            {upcoming.sub.title} · {eur(upcoming.sub.price)}
          </p>
        )}
      </div>

      <div className={`grid grid-cols-2 divide-x divide-y overflow-hidden rounded-2xl border sm:grid-cols-4 sm:divide-y-0 ${s.line} ${s.divide}`}>
        {stats.map((x) => (
          <div key={x.title} className="flex min-w-0 flex-col gap-1.5 px-4 py-4">
            <span className="truncate text-xl font-semibold tabular-nums">{x.value}</span>
            <span className={`text-[0.65rem] tracking-wide uppercase ${s.muted}`}>{x.title}</span>
          </div>
        ))}
      </div>

      <section className={`flex flex-col gap-3 rounded-2xl border p-4 ${s.line} ${s.panel}`}>
        <p className={label}>{now.toLocaleDateString(locale(), { month: 'long', year: 'numeric' })}</p>
        <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1.5 sm:grid-cols-[repeat(31,minmax(0,1fr))]">
          {Array.from({ length: lastDay }, (_, i) => i + 1).map((d) => {
            const renews = renewalDays.has(d)
            const today = d === now.getDate()
            return (
              <span
                key={d}
                title={renews ? active.filter((x) => Math.min(x.day, lastDay) === d).map((x) => x.title).join(', ') : String(d)}
                className={`grid aspect-square place-items-center rounded-full text-[0.55rem] tabular-nums ${
                  renews
                    ? dark
                      ? 'bg-white text-neutral-900'
                      : 'bg-neutral-900 text-white'
                    : today
                      ? `border ${dark ? 'border-white/60' : 'border-black/50'} ${s.strong}`
                      : s.faint
                }`}
              >
                {d}
              </span>
            )
          })}
        </div>
        <p className={`text-[0.7rem] ${s.faint}`}>{t('Los días marcados se renueva alguna suscripción.')}</p>
      </section>

      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          add()
        }}
        className={`flex flex-col gap-3 rounded-2xl border p-3 ${s.line} ${s.panel}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            placeholder={t('Nombre')}
            aria-label={t('Nombre')}
            className="min-w-0 flex-[2] bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-neutral-500 sm:text-sm"
          />
          <input
            value={price}
            onChange={(e) => setPrice(cleanDecimal(e.target.value))}
            inputMode="decimal"
            placeholder={t('Precio al mes')}
            aria-label={t('Precio al mes')}
            className={`${s.field} !w-32 !py-1.5 text-xs`}
          />
          <label className={`flex items-center gap-2 text-xs ${s.muted}`}>
            {t('Día')}
            <input
              value={day}
              onChange={(e) => setDay(cleanDay(e.target.value))}
              inputMode="numeric"
              aria-label={t('Día de renovación')}
              className={`${s.field} !w-14 !py-1.5 text-center text-xs`}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            type="url"
            placeholder="https://…"
            aria-label={t('Enlace')}
            className={`${s.field} min-w-32 flex-1 !py-1.5 text-xs`}
          />
          <button
            type="submit"
            disabled={!canAdd}
            aria-label={t('Añadir')}
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors disabled:opacity-30 ${s.primary}`}
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between gap-3">
        <p className={label}>{t('Suscripciones')}</p>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t('Orden')} className={`${s.field} !w-auto !py-1.5 text-xs`}>
          <option value="renovacion">{t('Próxima renovación')}</option>
          <option value="precio">{t('Más caras primero')}</option>
          <option value="nombre">{t('Por nombre')}</option>
        </select>
      </div>

      {ordered.length === 0 ? (
        <p className={`text-sm ${s.faint}`}>{t('Sin suscripciones.')}</p>
      ) : (
        <ul className={`flex flex-col divide-y overflow-hidden rounded-2xl border ${s.line} ${s.divide}`}>
          {ordered.map(({ sub, next }) => {
            const open = openId === sub.id
            const share = monthly > 0 && !sub.paused ? sub.price / monthly : 0
            return (
              <li key={sub.id} className={open ? s.panel : ''}>
                <div className={`flex items-center gap-3 px-4 py-3 ${sub.paused ? 'opacity-50' : ''}`}>
                  <button type="button" onClick={() => setOpenId(open ? null : sub.id)} aria-expanded={open} title={t('Editar')} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm">
                      {sub.title}
                      {sub.paused && <span className={`ml-2 text-[0.65rem] ${s.faint}`}>{t('En pausa')}</span>}
                    </span>
                    <span className={`block text-[0.7rem] ${s.faint}`}>
                      {sub.paused
                        ? tp('Se renovaba el día {0} de cada mes', sub.day)
                        : `${next.days === 0 ? t('Hoy') : tp('En {0} días', next.days)} · ${next.date.toLocaleDateString(locale(), { day: 'numeric', month: 'short' })}`}
                    </span>
                    {share > 0 && (
                      <span className={`mt-1.5 block h-1 overflow-hidden rounded-full ${dark ? 'bg-white/10' : 'bg-black/[0.07]'}`}>
                        <span className={`block h-full rounded-full ${dark ? 'bg-white' : 'bg-neutral-900'}`} style={{ width: `${share * 100}%` }} />
                      </span>
                    )}
                  </button>
                  <span className="shrink-0 text-sm tabular-nums text-red-500">−{eur(sub.price)}</span>
                  {sub.url && (
                    <a href={sub.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${sub.title}`} className={`shrink-0 ${s.muted} ${s.hoverText} transition-colors`}>
                      <Icon name="link" className="h-4 w-4" />
                    </a>
                  )}
                  <button type="button" onClick={() => setOpenId(open ? null : sub.id)} aria-label={t('Editar')} className={`${s.muted} ${s.hoverText} shrink-0 transition-colors`}>
                    <Icon name={open ? 'up' : 'down'} className="h-3.5 w-3.5" />
                  </button>
                </div>
                {open && <SubDetail sub={sub} s={s} onPatch={(c) => patch(sub.id, c)} onRemove={() => remove(sub.id)} onTogglePause={() => togglePause(sub)} />}
              </li>
            )
          })}
        </ul>
      )}
      <p className={`text-[0.7rem] ${s.faint}`}>{t('El día de renovación se resta solo del dinero, como gasto de categoría «Suscripción».')}</p>
    </div>
  )
}

function SubDetail({
  sub,
  s,
  onPatch,
  onRemove,
  onTogglePause,
}: {
  sub: Subscription
  s: Skin
  onPatch: (changes: Partial<Subscription>) => void
  onRemove: () => void
  onTogglePause: () => void
}) {
  const [priceText, setPriceText] = useState(String(sub.price))
  const [dayText, setDayText] = useState(String(sub.day))
  const label = `font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`

  return (
    <div className={`flex flex-col gap-4 border-t px-4 py-4 ${s.line}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={label}>{t('Nombre')}</span>
          <input value={sub.title} onChange={(e) => onPatch({ title: e.target.value })} maxLength={60} className={s.field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Precio al mes')}</span>
          <input
            value={priceText}
            inputMode="decimal"
            onChange={(e) => {
              const clean = cleanDecimal(e.target.value)
              setPriceText(clean)
              const n = parseAmount(clean)
              if (n !== null) onPatch({ price: n })
            }}
            className={s.field}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Día de renovación')}</span>
          <input
            value={dayText}
            inputMode="numeric"
            onChange={(e) => {
              const clean = cleanDay(e.target.value)
              setDayText(clean)
              const n = Number(clean)
              if (n >= 1 && n <= 31) onPatch({ day: n })
            }}
            className={s.field}
          />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={label}>{t('Enlace')}</span>
          <input
            type="url"
            defaultValue={sub.url ?? ''}
            placeholder="https://…"
            onChange={(e) => onPatch({ url: /^https?:\/\//i.test(e.target.value.trim()) ? e.target.value.trim() : undefined })}
            className={s.field}
          />
        </label>
      </div>
      {sub.lastCharged && <p className={`text-xs ${s.faint}`}>{t('Último cobro')}: {sub.lastCharged}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onTogglePause} className={s.ghost}>
          {sub.paused ? t('Reactivar') : t('Pausar')}
        </button>
        <span className="flex-1" />
        <button type="button" onClick={onRemove} className={`flex items-center gap-1.5 text-xs ${s.muted} transition-colors hover:text-red-500`}>
          <Icon name="trash" className="h-3.5 w-3.5" />
          {t('Eliminar')}
        </button>
      </div>
    </div>
  )
}
