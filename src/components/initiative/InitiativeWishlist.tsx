import { useState } from 'react'
import { dateKey, eur, shortDate, type Wish } from '../../lib/store'
import { notifyWithUndo } from '../../lib/undo'
import { t, tp } from '../../lib/i18n'
import { playDrop, playPop } from '../../lib/sound'
import { Icon } from '../ui'
import { cleanDecimal, parseAmount } from './moneyCalc'
import { skin, type Skin } from './skin'

type Priority = NonNullable<Wish['priority']>

type Props = {
  wishes: Wish[]
  setWishes: (update: (prev: Wish[]) => Wish[]) => void
  balance: number | null
  onExpense: (amount: number, title: string) => string
  onUndoExpense: (id: string) => void
  dark: boolean
}

type Tab = 'deseos' | 'comprados'
type Sort = 'manual' | 'prioridad' | 'barato' | 'caro'

const PRIORITIES: { id: Priority; label: string; dot: string }[] = [
  { id: 'alta', label: 'Alta', dot: 'bg-red-500' },
  { id: 'media', label: 'Media', dot: 'bg-amber-500' },
  { id: 'baja', label: 'Baja', dot: 'bg-sky-500' },
]

const rank: Record<Priority, number> = { alta: 0, media: 1, baja: 2 }
const prioOf = (w: Wish): Priority => w.priority ?? 'media'
const dotOf = (p: Priority) => PRIORITIES.find((x) => x.id === p)!.dot

export function InitiativeWishlist({ wishes, setWishes, balance, onExpense, onUndoExpense, dark }: Props) {
  const s = skin(dark)
  const [tab, setTab] = useState<Tab>('deseos')
  const [sort, setSort] = useState<Sort>('manual')
  const [onlyAffordable, setOnlyAffordable] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [priority, setPriority] = useState<Priority>('media')
  const [link, setLink] = useState('')

  const pending = wishes.filter((w) => !w.bought)
  const bought = wishes.filter((w) => w.bought)
  const totalPending = pending.reduce((a, w) => a + (w.price ?? 0), 0)
  const totalBought = bought.reduce((a, w) => a + (w.price ?? 0), 0)
  const affordable = (w: Wish) => balance !== null && w.price !== undefined && balance >= w.price
  const affordableCount = pending.filter(affordable).length

  let shown = tab === 'deseos' ? pending : [...bought].sort((a, b) => (b.bought ?? '').localeCompare(a.bought ?? ''))
  if (tab === 'deseos') {
    if (onlyAffordable) shown = shown.filter(affordable)
    if (sort === 'prioridad') shown = [...shown].sort((a, b) => rank[prioOf(a)] - rank[prioOf(b)])
    if (sort === 'barato') shown = [...shown].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
    if (sort === 'caro') shown = [...shown].sort((a, b) => (b.price ?? -1) - (a.price ?? -1))
  }

  const parsedPrice = parseAmount(price)
  const canAdd = title.trim() !== ''

  const add = () => {
    if (!canAdd) return
    playPop()
    const url = link.trim()
    setWishes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        price: parsedPrice ?? undefined,
        priority,
        url: /^https?:\/\//i.test(url) ? url : undefined,
      },
    ])
    setTitle('')
    setPrice('')
    setLink('')
  }

  const patch = (id: string, changes: Partial<Wish>) =>
    setWishes((prev) => prev.map((w) => (w.id === id ? { ...w, ...changes } : w)))

  const remove = (id: string) => {
    playDrop()
    const before = wishes
    const name = wishes.find((w) => w.id === id)?.title ?? ''
    setWishes((prev) => prev.filter((w) => w.id !== id))
    setOpenId(null)
    notifyWithUndo(tp('«{0}» eliminado', name), () => setWishes(() => before))
  }

  const move = (id: string, step: number) => {
    const list = pending
    const neighbor = list[list.findIndex((w) => w.id === id) + step]
    if (!neighbor) return
    setWishes((prev) => {
      const a = prev.findIndex((w) => w.id === id)
      const b = prev.findIndex((w) => w.id === neighbor.id)
      const next = [...prev]
      ;[next[a], next[b]] = [next[b], next[a]]
      return next
    })
  }

  const buy = (w: Wish, register: boolean) => {
    const before = wishes
    playPop()
    const expenseId = register && w.price ? onExpense(w.price, w.title) : null
    patch(w.id, { bought: dateKey(new Date()) })
    setOpenId(null)
    notifyWithUndo(tp('«{0}» comprado', w.title), () => {
      setWishes(() => before)
      if (expenseId) onUndoExpense(expenseId)
    })
  }

  const stats = [
    { title: t('Por comprar'), value: eur(totalPending), tone: '' },
    { title: t('Deseos'), value: String(pending.length), tone: '' },
    ...(balance !== null ? [{ title: t('Ya puedes comprar'), value: String(affordableCount), tone: affordableCount > 0 ? 'text-emerald-500' : '' }] : []),
    { title: t('Comprado'), value: eur(totalBought), tone: '' },
  ]

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-initiative text-3xl font-medium tracking-tight sm:text-4xl">{t('Lista de Deseos')}</h1>
        {balance !== null && (
          <p className={`text-xs ${s.faint}`}>
            {t('Dinero actual')}: <span className={`tabular-nums ${s.muted}`}>{eur(balance)}</span>
          </p>
        )}
      </div>

      <div className={`grid grid-cols-2 divide-x divide-y overflow-hidden rounded-2xl border sm:divide-y-0 ${stats.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} ${s.line} ${s.divide}`}>
        {stats.map((x) => (
          <div key={x.title} className="flex min-w-0 flex-col gap-1.5 px-4 py-4">
            <span className={`truncate text-xl font-semibold tabular-nums ${x.tone}`}>{x.value}</span>
            <span className={`text-[0.65rem] tracking-wide uppercase ${s.muted}`}>{x.title}</span>
          </div>
        ))}
      </div>

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
            placeholder={t('¿Qué quieres?')}
            aria-label={t('¿Qué quieres?')}
            className="min-w-0 flex-[2] bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-neutral-500 sm:text-sm"
          />
          <input
            value={price}
            onChange={(e) => setPrice(cleanDecimal(e.target.value))}
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            placeholder={t('Precio')}
            aria-label={t('Precio')}
            className={`${s.field} !w-28 !py-1.5 text-xs`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex rounded-lg border p-0.5 ${s.line}`}>
            {PRIORITIES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPriority(p.id)}
                aria-pressed={priority === p.id}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors ${priority === p.id ? s.active : `${s.muted} ${s.hoverText}`}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
                {t(p.label)}
              </button>
            ))}
          </div>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`flex rounded-lg border p-0.5 ${s.line}`}>
          {(['deseos', 'comprados'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              aria-pressed={tab === k}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors ${tab === k ? s.active : `${s.muted} ${s.hoverText}`}`}
            >
              {k === 'deseos' ? t('Deseos') : t('Comprados')}
              <span className={`text-[0.65rem] tabular-nums ${s.faint}`}>{k === 'deseos' ? pending.length : bought.length}</span>
            </button>
          ))}
        </div>
        {tab === 'deseos' && (
          <div className="flex flex-wrap items-center gap-2">
            {balance !== null && (
              <button
                type="button"
                onClick={() => setOnlyAffordable(!onlyAffordable)}
                aria-pressed={onlyAffordable}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${onlyAffordable ? `${s.active} border-transparent` : `${s.line} ${s.muted} ${s.hover}`}`}
              >
                {t('Solo los que puedo pagar')}
              </button>
            )}
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t('Orden')} className={`${s.field} !w-auto !py-1.5 text-xs`}>
              <option value="manual">{t('Mi orden')}</option>
              <option value="prioridad">{t('Por prioridad')}</option>
              <option value="barato">{t('Más baratos primero')}</option>
              <option value="caro">{t('Más caros primero')}</option>
            </select>
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <p className={`text-sm ${s.faint}`}>{tab === 'deseos' ? t('Sin deseos.') : t('Aún no has comprado nada.')}</p>
      ) : (
        <ul className={`flex flex-col divide-y overflow-hidden rounded-2xl border ${s.line} ${s.divide}`}>
          {shown.map((w) => {
            const open = openId === w.id
            const p = prioOf(w)
            const pct = balance !== null && w.price ? Math.min(1, Math.max(0, balance / w.price)) : null
            return (
              <li key={w.id} className={open ? s.panel : ''}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${w.bought ? 'bg-neutral-500' : dotOf(p)}`} title={t(PRIORITIES.find((x) => x.id === p)!.label)} />
                  <button type="button" onClick={() => setOpenId(open ? null : w.id)} aria-expanded={open} title={t('Editar')} className="min-w-0 flex-1 text-left">
                    <span className={`block truncate text-sm ${w.bought ? s.faint : ''}`}>{w.title}</span>
                    {w.desc && <span className={`block truncate text-[0.7rem] ${s.faint}`}>{w.desc}</span>}
                    {!w.bought && pct !== null && (
                      <span className="mt-1.5 flex items-center gap-2">
                        <span className={`h-1 flex-1 overflow-hidden rounded-full ${dark ? 'bg-white/10' : 'bg-black/[0.07]'}`}>
                          <span className={`block h-full rounded-full ${pct >= 1 ? 'bg-emerald-500' : dark ? 'bg-white' : 'bg-neutral-900'}`} style={{ width: `${pct * 100}%` }} />
                        </span>
                        <span className={`shrink-0 text-[0.65rem] ${pct >= 1 ? 'text-emerald-500' : s.faint}`}>
                          {pct >= 1 ? t('Puedes pagarlo') : tp('Te faltan {0}', eur(w.price! - (balance ?? 0)))}
                        </span>
                      </span>
                    )}
                    {w.bought && <span className={`block text-[0.7rem] ${s.faint}`}>{tp('Comprado el {0}', shortDate(w.bought))}</span>}
                  </button>
                  {w.price !== undefined && <span className={`shrink-0 text-sm tabular-nums ${w.bought ? s.faint : ''}`}>{eur(w.price)}</span>}
                  {w.url && (
                    <a href={w.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${w.title}`} className={`shrink-0 ${s.muted} ${s.hoverText} transition-colors`}>
                      <Icon name="link" className="h-4 w-4" />
                    </a>
                  )}
                  <button type="button" onClick={() => setOpenId(open ? null : w.id)} aria-label={t('Editar')} className={`${s.muted} ${s.hoverText} shrink-0 transition-colors`}>
                    <Icon name={open ? 'up' : 'down'} className="h-3.5 w-3.5" />
                  </button>
                </div>
                {open && (
                  <WishDetail
                    wish={w}
                    s={s}
                    balance={balance}
                    canMove={tab === 'deseos' && sort === 'manual' && !onlyAffordable}
                    onPatch={(changes) => patch(w.id, changes)}
                    onRemove={() => remove(w.id)}
                    onMove={(step) => move(w.id, step)}
                    onBuy={(register) => buy(w, register)}
                    onRestore={() => patch(w.id, { bought: undefined })}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function WishDetail({
  wish,
  s,
  balance,
  canMove,
  onPatch,
  onRemove,
  onMove,
  onBuy,
  onRestore,
}: {
  wish: Wish
  s: Skin
  balance: number | null
  canMove: boolean
  onPatch: (changes: Partial<Wish>) => void
  onRemove: () => void
  onMove: (step: number) => void
  onBuy: (register: boolean) => void
  onRestore: () => void
}) {
  const [register, setRegister] = useState(true)
  const [priceText, setPriceText] = useState(wish.price !== undefined ? String(wish.price) : '')
  const label = `font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`

  return (
    <div className={`flex flex-col gap-4 border-t px-4 py-4 ${s.line}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={label}>{t('Título')}</span>
          <input value={wish.title} onChange={(e) => onPatch({ title: e.target.value })} maxLength={60} className={s.field} />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={label}>{t('Descripción')}</span>
          <textarea value={wish.desc ?? ''} onChange={(e) => onPatch({ desc: e.target.value || undefined })} maxLength={200} rows={2} className={s.field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Precio')}</span>
          <input
            value={priceText}
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            onChange={(e) => {
              const clean = cleanDecimal(e.target.value)
              setPriceText(clean)
              onPatch({ price: parseAmount(clean) ?? undefined })
            }}
            className={s.field}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t('Prioridad')}</span>
          <select value={prioOf(wish)} onChange={(e) => onPatch({ priority: e.target.value as Priority })} className={s.field}>
            {PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>
                {t(p.label)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={label}>{t('Enlace')}</span>
          <input
            type="url"
            defaultValue={wish.url ?? ''}
            placeholder="https://…"
            onChange={(e) => onPatch({ url: /^https?:\/\//i.test(e.target.value.trim()) ? e.target.value.trim() : undefined })}
            className={s.field}
          />
        </label>
      </div>

      {wish.bought ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onRestore} className={s.ghost}>
            {t('Volver a deseos')}
          </button>
          <button type="button" onClick={onRemove} className={`flex items-center gap-1.5 text-xs ${s.muted} transition-colors hover:text-red-500`}>
            <Icon name="trash" className="h-3.5 w-3.5" />
            {t('Eliminar')}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => onBuy(register && balance !== null)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${s.primary}`}>
            {t('Marcar como comprado')}
          </button>
          {balance !== null && wish.price !== undefined && (
            <label className={`flex items-center gap-2 text-xs ${s.muted}`}>
              <input type="checkbox" checked={register} onChange={(e) => setRegister(e.target.checked)} className="h-4 w-4 rounded" />
              {t('Restar de Dinero')}
            </label>
          )}
          <span className="flex-1" />
          {canMove && (
            <span className="flex gap-2">
              <button type="button" onClick={() => onMove(-1)} aria-label={`Subir ${wish.title}`} className={s.iconButton}>
                <Icon name="up" className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => onMove(1)} aria-label={`Bajar ${wish.title}`} className={s.iconButton}>
                <Icon name="down" className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          <button type="button" onClick={onRemove} className={`flex items-center gap-1.5 text-xs ${s.muted} transition-colors hover:text-red-500`}>
            <Icon name="trash" className="h-3.5 w-3.5" />
            {t('Eliminar')}
          </button>
        </div>
      )}
    </div>
  )
}
