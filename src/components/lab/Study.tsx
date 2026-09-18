import { useState } from 'react'
import { button, ghost, input, line, Icon, Empty } from '../ui'
import { t, tp } from '../../lib/i18n'
import { random } from '../../lib/lab'
import { useStored } from '../../lib/store'
import { playDrop, playPop } from '../../lib/sound'

type Card = { id: string; front: string; back: string; box: number }
type Deck = { id: string; name: string; cards: Card[] }

const weightOf = (card: Card) => [4, 2, 1][Math.min(card.box, 2)]

function pickCard(cards: Card[], avoid?: string) {
  const pool = cards.length > 1 ? cards.filter((c) => c.id !== avoid) : cards
  const total = pool.reduce((acc, c) => acc + weightOf(c), 0)
  let pick = random() * total
  for (const card of pool) {
    pick -= weightOf(card)
    if (pick < 0) return card
  }
  return pool[pool.length - 1]
}

export function Flashcards() {
  const [decks, setDecks] = useStored<Deck[]>('nivra-lab-decks', [])
  const [openId, setOpenId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [studying, setStudying] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [flipped, setFlipped] = useState(false)

  const deck = decks.find((d) => d.id === openId) ?? null

  const updateDeck = (id: string, fn: (d: Deck) => Deck) =>
    setDecks((prev) => prev.map((d) => (d.id === id ? fn(d) : d)))

  if (!deck) {
    return (
      <div className="flex flex-col gap-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const name = newName.trim()
            if (!name) return
            const created = { id: crypto.randomUUID(), name, cards: [] }
            setDecks((prev) => [...prev, created])
            setNewName('')
            setOpenId(created.id)
            playPop()
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('Nombre del mazo (por ejemplo, Historia)')}
            className={input}
          />
          <button type="submit" className={`${button} shrink-0`}>
            {t('Crear mazo')}
          </button>
        </form>
        {decks.length === 0 ? (
          <Empty>{t('Aún no tienes mazos.')}</Empty>
        ) : (
          <ul className="flex flex-col">
            {decks.map((d) => (
              <li key={d.id} className={`flex items-center gap-3 border-b py-3 last:border-0 ${line}`}>
                <button type="button" onClick={() => setOpenId(d.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-neutral-400">{tp('{0} tarjetas', d.cards.length)}</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDecks((prev) => prev.filter((x) => x.id !== d.id))
                    playDrop()
                  }}
                  aria-label={t('Eliminar')}
                  className="shrink-0 text-neutral-400 transition-colors hover:text-red-500"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const current = deck.cards.find((c) => c.id === currentId) ?? null

  const startStudy = () => {
    if (deck.cards.length === 0) return
    setStudying(true)
    setFlipped(false)
    setCurrentId(pickCard(deck.cards).id)
  }

  const answer = (knew: boolean) => {
    if (!current) return
    const box = knew ? Math.min(2, current.box + 1) : 0
    updateDeck(deck.id, (d) => ({ ...d, cards: d.cards.map((c) => (c.id === current.id ? { ...c, box } : c)) }))
    const next = pickCard(
      deck.cards.map((c) => (c.id === current.id ? { ...c, box } : c)),
      current.id,
    )
    setFlipped(false)
    setCurrentId(next.id)
  }

  const learned = deck.cards.filter((c) => c.box >= 2).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setOpenId(null)
            setStudying(false)
          }}
          className="text-sm text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
        >
          ← {t('Mazos')}
        </button>
        <h3 className="min-w-0 flex-1 truncate text-sm font-medium">{deck.name}</h3>
        <span className="text-xs text-neutral-400">{tp('{0} de {1} dominadas', learned, deck.cards.length)}</span>
      </div>

      {studying && current ? (
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className={`flex min-h-44 w-full items-center justify-center rounded-2xl border bg-[var(--sunken)] p-6 text-center text-lg transition-transform active:scale-[.99] ${line}`}
          >
            <span className="break-words">{flipped ? current.back : current.front}</span>
          </button>
          <p className="text-xs text-neutral-400">{flipped ? t('Respuesta') : t('Pulsa la tarjeta para ver la respuesta')}</p>
          {flipped && (
            <div className="flex gap-2">
              <button type="button" onClick={() => answer(false)} className={ghost}>
                {t('No la sabía')}
              </button>
              <button type="button" onClick={() => answer(true)} className={button}>
                {t('La sabía')}
              </button>
            </div>
          )}
          <button type="button" onClick={() => setStudying(false)} className="text-xs text-neutral-400 hover:underline">
            {t('Terminar')}
          </button>
        </div>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!front.trim() || !back.trim()) return
              updateDeck(deck.id, (d) => ({
                ...d,
                cards: [...d.cards, { id: crypto.randomUUID(), front: front.trim(), back: back.trim(), box: 0 }],
              }))
              setFront('')
              setBack('')
              playPop()
            }}
            className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
          >
            <input
              type="text"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder={t('Pregunta o anverso')}
              className={input}
            />
            <input
              type="text"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder={t('Respuesta o reverso')}
              className={input}
            />
            <button type="submit" className={button}>
              {t('Añadir')}
            </button>
          </form>
          <button
            type="button"
            onClick={startStudy}
            disabled={deck.cards.length === 0}
            className={`${button} self-start disabled:opacity-40`}
          >
            {t('Estudiar')}
          </button>
          <ul className="flex flex-col">
            {deck.cards.map((c) => (
              <li key={c.id} className={`flex items-center gap-3 border-b py-2.5 text-sm last:border-0 ${line}`}>
                <span className="min-w-0 flex-1 truncate">{c.front}</span>
                <span className="min-w-0 flex-1 truncate text-neutral-400">{c.back}</span>
                <button
                  type="button"
                  onClick={() => updateDeck(deck.id, (d) => ({ ...d, cards: d.cards.filter((x) => x.id !== c.id) }))}
                  aria-label={t('Eliminar')}
                  className="shrink-0 text-neutral-400 transition-colors hover:text-red-500"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

type Question = { id: string; text: string; options: string[]; answer: number }
type Quiz = { id: string; subject: string; title: string; questions: Question[]; best?: number }

export function Quizzes({ subjects }: { subjects: { id: string; name: string }[] }) {
  const [quizzes, setQuizzes] = useStored<Quiz[]>('nivra-lab-quizzes', [])
  const [openId, setOpenId] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [answer, setAnswer] = useState(0)
  const [taking, setTaking] = useState(false)
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<number[]>([])

  const quiz = quizzes.find((q) => q.id === openId) ?? null
  const update = (id: string, fn: (q: Quiz) => Quiz) => setQuizzes((prev) => prev.map((q) => (q.id === id ? fn(q) : q)))

  if (!quiz) {
    const subjectNames = [...new Set(quizzes.map((q) => q.subject))].sort()
    return (
      <div className="flex flex-col gap-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!title.trim() || !subject.trim()) return
            const created: Quiz = {
              id: crypto.randomUUID(),
              subject: subject.trim(),
              title: title.trim(),
              questions: [],
            }
            setQuizzes((prev) => [...prev, created])
            setTitle('')
            setOpenId(created.id)
            playPop()
          }}
          className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
        >
          <input
            type="text"
            list="lab-subjects"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('Asignatura')}
            className={input}
          />
          <datalist id="lab-subjects">
            {[...new Set([...subjects.map((s) => s.name), ...subjectNames])].map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('Título del examen')}
            className={input}
          />
          <button type="submit" className={button}>
            {t('Crear examen')}
          </button>
        </form>
        {quizzes.length === 0 ? (
          <Empty>{t('Aún no tienes exámenes.')}</Empty>
        ) : (
          subjectNames.map((name) => (
            <div key={name}>
              <p className="mb-1 text-[0.68rem] font-medium tracking-[0.14em] text-neutral-400 uppercase">{name}</p>
              <ul className="flex flex-col">
                {quizzes
                  .filter((q) => q.subject === name)
                  .map((q) => (
                    <li key={q.id} className={`flex items-center gap-3 border-b py-3 last:border-0 ${line}`}>
                      <button type="button" onClick={() => setOpenId(q.id)} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-medium">{q.title}</p>
                        <p className="text-xs text-neutral-400">
                          {tp('{0} preguntas', q.questions.length)}
                          {q.best !== undefined && ` · ${tp('Mejor nota: {0} %', q.best)}`}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuizzes((prev) => prev.filter((x) => x.id !== q.id))
                          playDrop()
                        }}
                        aria-label={t('Eliminar')}
                        className="shrink-0 text-neutral-400 transition-colors hover:text-red-500"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))
        )}
      </div>
    )
  }

  const total = quiz.questions.length
  const finished = taking && step >= total
  const score = finished ? picked.filter((p, i) => p === quiz.questions[i].answer).length : 0
  const percent = total > 0 ? Math.round((score / total) * 100) : 0

  const startQuiz = () => {
    if (total === 0) return
    setTaking(true)
    setStep(0)
    setPicked([])
  }

  const close = () => {
    setOpenId(null)
    setTaking(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={close}
          className="text-sm text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
        >
          ← {t('Exámenes')}
        </button>
        <h3 className="min-w-0 flex-1 truncate text-sm font-medium">
          {quiz.subject} · {quiz.title}
        </h3>
      </div>

      {taking && !finished && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-neutral-400">{tp('Pregunta {0} de {1}', step + 1, total)}</p>
          <p className="text-lg font-medium break-words">{quiz.questions[step].text}</p>
          <div className="flex flex-col gap-2">
            {quiz.questions[step].options.map((option, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const next = [...picked, i]
                  setPicked(next)
                  setStep(step + 1)
                  if (step + 1 >= total) {
                    const correct = next.filter((p, idx) => p === quiz.questions[idx].answer).length
                    const grade = Math.round((correct / total) * 100)
                    update(quiz.id, (q) => ({ ...q, best: Math.max(q.best ?? 0, grade) }))
                  }
                }}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.05] ${line}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {finished && (
        <div className="flex flex-col gap-3">
          <div className={`rounded-2xl border bg-[var(--sunken)] px-4 py-4 text-center ${line}`}>
            <p className="font-mono text-4xl font-medium tabular-nums">{percent} %</p>
            <p className="text-sm text-neutral-400">{tp('{0} de {1} correctas', score, total)}</p>
          </div>
          <ul className="flex flex-col gap-2">
            {quiz.questions.map((q, i) => {
              const ok = picked[i] === q.answer
              return (
                <li key={q.id} className={`rounded-xl border px-4 py-3 text-sm ${line}`}>
                  <p className="font-medium break-words">{q.text}</p>
                  <p className={ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
                    {ok ? '✓' : '✗'} {q.options[picked[i]]}
                  </p>
                  {!ok && (
                    <p className="text-neutral-400">
                      {t('Correcta')}: {q.options[q.answer]}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="flex gap-2">
            <button type="button" onClick={startQuiz} className={button}>
              {t('Repetir')}
            </button>
            <button type="button" onClick={() => setTaking(false)} className={ghost}>
              {t('Volver a editar')}
            </button>
          </div>
        </div>
      )}

      {!taking && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const clean = options.map((o) => o.trim())
              const used = clean.filter((o) => o !== '')
              if (!text.trim() || used.length < 2 || !clean[answer]) return
              const mapped = clean.map((o, i) => ({ o, i })).filter(({ o }) => o !== '')
              update(quiz.id, (q) => ({
                ...q,
                questions: [
                  ...q.questions,
                  {
                    id: crypto.randomUUID(),
                    text: text.trim(),
                    options: mapped.map(({ o }) => o),
                    answer: mapped.findIndex(({ i }) => i === answer),
                  },
                ],
              }))
              setText('')
              setOptions(['', '', '', ''])
              setAnswer(0)
              playPop()
            }}
            className="flex flex-col gap-2"
          >
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('Enunciado de la pregunta')}
              className={input}
            />
            {options.map((option, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={answer === i}
                  onChange={() => setAnswer(i)}
                  aria-label={t('Marcar como correcta')}
                  className="accent-neutral-800 dark:accent-white"
                />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => setOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))}
                  placeholder={tp('Opción {0}', i + 1)}
                  className={input}
                />
              </div>
            ))}
            <p className="text-xs text-neutral-400">{t('Marca con el círculo la respuesta correcta. Mínimo dos opciones.')}</p>
            <button type="submit" className={`${ghost} self-start`}>
              {t('Añadir pregunta')}
            </button>
          </form>
          <button
            type="button"
            onClick={startQuiz}
            disabled={total === 0}
            className={`${button} self-start disabled:opacity-40`}
          >
            {t('Hacer el examen')}
          </button>
          <ul className="flex flex-col">
            {quiz.questions.map((q, i) => (
              <li key={q.id} className={`flex items-center gap-3 border-b py-2.5 text-sm last:border-0 ${line}`}>
                <span className="w-6 shrink-0 font-mono text-xs text-neutral-400">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{q.text}</span>
                <button
                  type="button"
                  onClick={() => update(quiz.id, (x) => ({ ...x, questions: x.questions.filter((y) => y.id !== q.id) }))}
                  aria-label={t('Eliminar')}
                  className="shrink-0 text-neutral-400 transition-colors hover:text-red-500"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
