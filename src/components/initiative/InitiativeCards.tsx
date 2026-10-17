import { useEffect, useMemo, useState } from 'react'
import { dateKey, useStored } from '../../lib/store'
import { notifyWithUndo } from '../../lib/undo'
import { t, tp } from '../../lib/i18n'
import { playDrop, playPop } from '../../lib/sound'
import { Icon } from '../ui'
import {
  buildQueue,
  createCard,
  dueCards,
  labelDays,
  parseBulk,
  previewDays,
  schedule,
  type Card,
  type Deck,
  type Grade,
} from './cardsModel'
import { skin } from './skin'

type LabDeck = { id: string; name: string; cards: { id: string; front: string; back: string; box: number }[] }

const GRADES: { grade: Grade; label: string }[] = [
  { grade: 0, label: 'Otra vez' },
  { grade: 1, label: 'Difícil' },
  { grade: 2, label: 'Bien' },
  { grade: 3, label: 'Fácil' },
]

export function InitiativeCards({ dark }: { dark: boolean }) {
  const s = skin(dark)
  const [decks, setDecks] = useStored<Deck[]>('nivra-cards', [])
  const [labDecks] = useStored<LabDeck[]>('nivra-lab-decks', [])
  const [imported, setImported] = useStored('nivra-cards-imported', false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [studyId, setStudyId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const today = dateKey(new Date())

  const deck = decks.find((d) => d.id === openId) ?? null
  const studying = decks.find((d) => d.id === studyId) ?? null
  const patchDeck = (id: string, fn: (d: Deck) => Deck) => setDecks((prev) => prev.map((d) => (d.id === id ? fn(d) : d)))

  const importLab = () => {
    const converted: Deck[] = labDecks.map((d) => ({
      id: crypto.randomUUID(),
      name: d.name,
      cards: d.cards.map((c) => ({
        ...createCard(c.front, c.back, today),
        reps: c.box,
        interval: c.box === 0 ? 0 : c.box === 1 ? 2 : 6,
        due: today,
      })),
    }))
    setDecks((prev) => [...prev, ...converted])
    setImported(true)
    playPop()
  }

  const removeDeck = (target: Deck) => {
    const before = decks
    setDecks((prev) => prev.filter((d) => d.id !== target.id))
    if (openId === target.id) setOpenId(null)
    playDrop()
    notifyWithUndo(tp('Mazo «{0}» eliminado', target.name), () => setDecks(() => before))
  }

  if (studying) {
    return (
      <Study
        deck={studying}
        today={today}
        s={s}
        onGrade={(card) => patchDeck(studying.id, (d) => ({ ...d, cards: d.cards.map((c) => (c.id === card.id ? card : c)) }))}
        onExit={() => setStudyId(null)}
      />
    )
  }

  if (deck) {
    return <DeckEditor deck={deck} today={today} s={s} onPatch={(fn) => patchDeck(deck.id, fn)} onBack={() => setOpenId(null)} onStudy={() => setStudyId(deck.id)} onDelete={() => removeDeck(deck)} />
  }

  const totalDue = decks.reduce((a, d) => a + dueCards(d, today).length, 0)
  const showImport = !imported && labDecks.some((d) => d.cards.length > 0)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-initiative text-3xl font-medium tracking-tight sm:text-4xl">{t('Tarjetas')}</h1>
        <p className={`text-sm ${s.muted}`}>{totalDue > 0 ? tp('{0} para repasar hoy', totalDue) : t('Todo al día')}</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const name = newName.trim()
          if (!name) return
          const created: Deck = { id: crypto.randomUUID(), name, cards: [] }
          setDecks((prev) => [...prev, created])
          setNewName('')
          setOpenId(created.id)
          playPop()
        }}
        className="flex gap-2"
      >
        <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={50} placeholder={t('Nuevo mazo (por ejemplo, Historia)')} aria-label={t('Nombre del mazo')} className={s.field} />
        <button type="submit" disabled={!newName.trim()} className={`shrink-0 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-30 ${s.primary}`}>
          {t('Crear')}
        </button>
      </form>

      {showImport && (
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${s.line}`}>
          <p className={`text-sm ${s.muted}`}>{t('Tienes mazos en el laboratorio. Puedes traerlos aquí con repetición espaciada.')}</p>
          <button type="button" onClick={importLab} className={s.ghost}>
            {t('Importar mazos')}
          </button>
        </div>
      )}

      {decks.length === 0 ? (
        <p className={`text-sm ${s.faint}`}>{t('Aún no tienes mazos.')}</p>
      ) : (
        <ul className={`flex flex-col divide-y overflow-hidden rounded-2xl border ${s.line} ${s.divide}`}>
          {decks.map((d) => {
            const due = dueCards(d, today).length
            return (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                <button type="button" onClick={() => setOpenId(d.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className={`text-xs ${s.faint}`}>
                    {tp('{0} tarjetas', d.cards.length)}
                    {due > 0 && ` · ${tp('{0} para hoy', due)}`}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setStudyId(d.id)}
                  disabled={due === 0}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-30 ${due > 0 ? s.primary : s.ghost}`}
                >
                  {due > 0 ? t('Estudiar') : t('Al día')}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function DeckEditor({
  deck,
  today,
  s,
  onPatch,
  onBack,
  onStudy,
  onDelete,
}: {
  deck: Deck
  today: string
  s: ReturnType<typeof skin>
  onPatch: (fn: (d: Deck) => Deck) => void
  onBack: () => void
  onStudy: () => void
  onDelete: () => void
}) {
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [bulk, setBulk] = useState(false)
  const [text, setText] = useState('')
  const due = dueCards(deck, today).length
  const parsed = useMemo(() => (bulk ? parseBulk(text, today) : []), [bulk, text, today])
  const label = `font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`

  const add = () => {
    if (bulk) {
      if (parsed.length === 0) return
      onPatch((d) => ({ ...d, cards: [...d.cards, ...parsed] }))
      setText('')
    } else {
      const f = front.trim()
      const b = back.trim()
      if (!f || !b) return
      onPatch((d) => ({ ...d, cards: [...d.cards, createCard(f, b, today)] }))
      setFront('')
      setBack('')
    }
    playPop()
  }

  const remove = (card: Card) => {
    const before = deck.cards
    onPatch((d) => ({ ...d, cards: d.cards.filter((c) => c.id !== card.id) }))
    playDrop()
    notifyWithUndo(t('Tarjeta eliminada'), () => onPatch((d) => ({ ...d, cards: before })))
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className={`flex items-center gap-1.5 text-sm ${s.muted} ${s.hoverText}`}>
          <Icon name="left" className="h-4 w-4" />
          {t('Mazos')}
        </button>
        <span className="flex-1" />
        <button type="button" onClick={onDelete} className={`flex items-center gap-1.5 text-xs ${s.muted} transition-colors hover:text-red-500`}>
          <Icon name="trash" className="h-3.5 w-3.5" />
          {t('Eliminar mazo')}
        </button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <input
          value={deck.name}
          onChange={(e) => onPatch((d) => ({ ...d, name: e.target.value }))}
          maxLength={50}
          aria-label={t('Nombre del mazo')}
          className="font-initiative min-w-0 flex-1 bg-transparent text-3xl font-medium tracking-tight outline-none sm:text-4xl"
        />
        <button type="button" onClick={onStudy} disabled={due === 0} className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors disabled:opacity-30 ${s.primary}`}>
          {due > 0 ? tp('Estudiar {0}', due) : t('Al día')}
        </button>
      </div>

      <section className={`flex flex-col gap-3 rounded-2xl border p-4 ${s.line} ${s.panel}`}>
        <div className="flex items-center justify-between">
          <p className={label}>{bulk ? t('Añadir varias') : t('Nueva tarjeta')}</p>
          <button type="button" onClick={() => setBulk((b) => !b)} className={`text-xs ${s.muted} ${s.hoverText}`}>
            {bulk ? t('Una a una') : t('Añadir varias')}
          </button>
        </div>
        {bulk ? (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder={t('Una por línea: pregunta :: respuesta')}
              aria-label={t('Tarjetas')}
              className={`${s.field} resize-y`}
            />
            <p className={`text-xs ${s.faint}`}>{tp('{0} tarjetas listas', parsed.length)}</p>
          </>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <textarea value={front} onChange={(e) => setFront(e.target.value)} rows={2} placeholder={t('Anverso')} aria-label={t('Anverso')} className={`${s.field} resize-none`} />
            <textarea value={back} onChange={(e) => setBack(e.target.value)} rows={2} placeholder={t('Reverso')} aria-label={t('Reverso')} className={`${s.field} resize-none`} />
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={add}
            disabled={bulk ? parsed.length === 0 : !front.trim() || !back.trim()}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-30 ${s.primary}`}
          >
            {t('Añadir')}
          </button>
        </div>
      </section>

      {deck.cards.length === 0 ? (
        <p className={`text-sm ${s.faint}`}>{t('Este mazo está vacío.')}</p>
      ) : (
        <ul className={`flex flex-col divide-y overflow-hidden rounded-2xl border ${s.line} ${s.divide}`}>
          {deck.cards.map((card) => (
            <li key={card.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{card.front}</p>
                <p className={`truncate text-xs ${s.faint}`}>{card.back}</p>
              </div>
              <span className={`shrink-0 text-[0.7rem] tabular-nums ${s.faint}`}>{card.due <= today ? t('Hoy') : card.due.slice(5).split('-').reverse().join('/')}</span>
              <button type="button" onClick={() => remove(card)} aria-label={t('Eliminar')} className={`shrink-0 ${s.muted} transition-colors hover:text-red-500`}>
                <Icon name="trash" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Study({
  deck,
  today,
  s,
  onGrade,
  onExit,
}: {
  deck: Deck
  today: string
  s: ReturnType<typeof skin>
  onGrade: (card: Card) => void
  onExit: () => void
}) {
  const [queue, setQueue] = useState(() => buildQueue(deck, today))
  const [total] = useState(queue.length)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(0)
  const current = deck.cards.find((c) => c.id === queue[0]) ?? null

  const grade = (g: Grade) => {
    if (!current || !flipped) return
    const next = schedule(current, g, today)
    onGrade(next)
    playPop()
    setQueue((q) => (g === 0 ? [...q.slice(1), q[0]] : q.slice(1)))
    if (g !== 0) setDone((n) => n + 1)
    setFlipped(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) grade(Number(e.key) - 1 as Grade)
      else if (e.key === 'Escape') onExit()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  if (!current) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 py-16 text-center">
        <h1 className="font-initiative text-3xl font-medium tracking-tight">{t('Sesión terminada')}</h1>
        <p className={`text-sm ${s.muted}`}>{tp('Has repasado {0} tarjetas.', done)}</p>
        <button type="button" onClick={onExit} className={`rounded-lg px-5 py-2 text-sm font-medium ${s.primary}`}>
          {t('Volver a los mazos')}
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onExit} className={`flex items-center gap-1.5 text-sm ${s.muted} ${s.hoverText}`}>
          <Icon name="left" className="h-4 w-4" />
          {t('Salir')}
        </button>
        <span className={`h-1 flex-1 overflow-hidden rounded-full ${s.dark ? 'bg-white/10' : 'bg-black/[0.07]'}`}>
          <span className={`block h-full rounded-full transition-[width] duration-200 ${s.dark ? 'bg-white' : 'bg-neutral-900'}`} style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </span>
        <span className={`text-xs tabular-nums ${s.faint}`}>
          {done} / {total}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className={`flex min-h-72 w-full flex-col items-center justify-center gap-5 rounded-2xl border p-8 text-center ${s.line} ${s.panel}`}
      >
        <p className="text-2xl leading-snug">{current.front}</p>
        {flipped ? (
          <>
            <span className={`h-px w-16 ${s.dark ? 'bg-white/15' : 'bg-black/15'}`} />
            <p className={`text-xl leading-snug ${s.muted}`}>{current.back}</p>
          </>
        ) : (
          <p className={`text-xs ${s.faint}`}>{t('Pulsa para ver la respuesta')}</p>
        )}
      </button>

      <div className={`grid grid-cols-4 gap-2 transition-opacity ${flipped ? 'opacity-100' : 'pointer-events-none opacity-30'}`}>
        {GRADES.map((g) => (
          <button key={g.grade} type="button" onClick={() => grade(g.grade)} disabled={!flipped} className={`flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 ${s.line} ${s.hover}`}>
            <span className="text-sm font-medium">{t(g.label)}</span>
            <span className={`text-[0.7rem] tabular-nums ${s.faint}`}>{labelDays(previewDays(current, g.grade))}</span>
          </button>
        ))}
      </div>
      <p className={`text-center text-xs ${s.faint}`}>{t('Espacio para girar, 1 a 4 para valorar')}</p>
    </div>
  )
}

