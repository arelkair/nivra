import { useEffect, useRef, useState } from 'react'
import { t } from '../../lib/i18n'
import type { Block, CalItem, Countdown, Goal, Grade, Reminder, Subject, Subscription, Task, Wish, Work } from '../../lib/store'
import { Icon } from '../ui'
import { SECTIONS, type Section } from './sections'
import { keyOf } from '../../lib/shortcuts'
import { skin } from './skin'
import { snippetOf, type VaultNote } from './vault/vaultModel'

export type Command = { id: string; label: string; hint?: string; run: () => void }

type Data = {
  tasks: Task[]
  items: CalItem[]
  works: Work[]
  grades: Grade[]
  blocks: Block[]
  subs: Subscription[]
  wishes: Wish[]
  countdowns: Countdown[]
  reminders: Reminder[]
  goals: Goal[]
  subjects: Subject[]
  notes: VaultNote[]
  bankEnabled: boolean
}

type Props = {
  open: boolean
  onClose: () => void
  dark: boolean
  data: Data
  commands: Command[]
  closeKeys: string[]
  onGo: (section: Section) => void
  onOpenNote: (id: string) => void
}

type Hit = {
  key: string
  title: string
  kind: string
  detail?: string
  score: number
  run: () => void
  icon: string
}

const norm = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const bonus = (base: number, extra: number) => (base > 0 ? base + extra : 0)

const score = (text: string, q: string) => {
  const n = norm(text)
  if (n === q) return 4
  if (n.startsWith(q)) return 3
  if (n.split(/[\s\-_/·:]+/).some((w) => w.startsWith(q))) return 2
  return n.includes(q) ? 1 : 0
}

export function InitiativeSearch({ open, ...rest }: Props) {
  return open ? <Palette {...rest} /> : null
}

function Palette({ onClose, dark, data, commands, closeKeys, onGo, onOpenNote }: Omit<Props, 'open'>) {
  const s = skin(dark)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)

  useEffect(() => {
    input.current?.focus()
  }, [])

  const go = (section: Section) => () => {
    onClose()
    onGo(section)
  }

  const buildHits = (): Hit[] => {
    const q = norm(query.trim())
    const out: Hit[] = []
    const sectionList = SECTIONS.filter((x) => x.id !== 'banco' || data.bankEnabled)

    if (!q) {
      for (const c of commands) out.push({ key: `c-${c.id}`, title: c.label, kind: t('Acción'), detail: c.hint, score: 0, run: () => { onClose(); c.run() }, icon: 'settings' })
      for (const sec of sectionList) out.push({ key: `s-${sec.id}`, title: t(sec.label), kind: t('Ir a'), score: 0, run: go(sec.id), icon: sec.icon })
      return out
    }

    const add = (key: string, title: string, kind: string, sc: number, run: () => void, icon: string, detail?: string) => {
      if (sc > 0) out.push({ key, title, kind, score: sc, run, icon, detail })
    }

    for (const c of commands) add(`c-${c.id}`, c.label, t('Acción'), bonus(score(`${c.label} ${c.hint ?? ''}`, q), 0.5), () => { onClose(); c.run() }, 'settings', c.hint)
    for (const sec of sectionList) add(`s-${sec.id}`, t(sec.label), t('Ir a'), bonus(score(t(sec.label), q), 0.4), go(sec.id), sec.icon)
    for (const x of data.tasks) add(`t-${x.id}`, x.title, x.done ? `${t('Tarea')} · ${t('Hecha')}` : t('Tarea'), score(x.title, q), go('tareas'), 'tasks')
    for (const x of data.works) add(`w-${x.id}`, x.title, x.kind === 'examen' ? t('Examen') : t('Proyecto'), score(x.title, q), go('examenes'), 'exams', x.date)
    for (const x of data.items.filter((i) => i.origin === 'evento')) add(`e-${x.id}-${x.date}`, x.title, t('Actividad del calendario'), score(x.title, q), go('calendario'), 'calendar', x.date)
    for (const x of data.grades) add(`g-${x.id}`, x.desc ?? '', t('Nota'), score(x.desc ?? '', q), go('notas'), 'grades')
    for (const x of data.blocks) add(`b-${x.id}`, x.title, t('Bloque del horario'), score(x.title, q), go('horario'), 'schedule')
    for (const x of data.subs) add(`u-${x.id}`, x.title, t('Suscripción'), score(x.title, q), go('suscripciones'), 'subs')
    for (const x of data.wishes) add(`d-${x.id}`, x.title, t('Deseo'), score(x.title, q), go('deseos'), 'wish')
    for (const x of data.countdowns) add(`n-${x.id}`, x.title, t('Cuenta atrás'), score(x.title, q), go('cuentas'), 'timer')
    for (const x of data.reminders) add(`r-${x.id}`, x.title, t('Recordatorio'), score(x.title, q), go('recordatorios'), 'bell', x.date)
    if (data.bankEnabled) for (const x of data.goals) add(`m-${x.id}`, x.title, t('Meta de ahorro'), score(x.title, q), go('banco'), 'bank')
    for (const x of data.subjects) add(`a-${x.id}`, x.name, t('Asignatura'), score(x.name, q), go('ajustes'), 'settings')

    for (const note of data.notes) {
      const titleScore = score(note.title, q)
      const inBody = norm(note.body).includes(q)
      if (titleScore === 0 && !inBody) continue
      const at = inBody ? norm(note.body).indexOf(q) : -1
      const detail = at >= 0 ? snippetOf(note.body.slice(Math.max(0, at - 30)), 90) : undefined
      out.push({ key: `v-${note.id}`, title: note.title, kind: t('Nota de la Bóveda'), score: titleScore > 0 ? titleScore + 0.2 : 0.5, run: () => { onClose(); onOpenNote(note.id) }, icon: 'graph', detail })
    }

    return out.sort((a, b) => b.score - a.score).slice(0, 30)
  }
  const hits = buildHits()

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onKey = (e: React.KeyboardEvent) => {
    if (query === '' && closeKeys.includes(keyOf(e.nativeEvent)) && !e.nativeEvent.ctrlKey && !e.nativeEvent.altKey && !e.nativeEvent.metaKey) {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(hits.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      hits[active]?.run()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[10vh]" onKeyDown={onKey}>
      <button type="button" aria-label={t('Cerrar')} onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-label={t('Buscar')}
        className={`relative flex max-h-[70svh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${s.line} ${dark ? 'bg-[#131316] text-neutral-100 [color-scheme:dark]' : 'bg-white text-neutral-900'}`}
      >
        <div className="flex items-center gap-3 px-4">
          <Icon name="search" className={`h-4 w-4 shrink-0 ${s.muted}`} />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Busca tareas, notas, exámenes, acciones…')}
            aria-label={t('Buscar')}
            role="combobox"
            aria-expanded
            aria-controls="initiative-search-list"
            aria-activedescendant={hits[active] ? `hit-${hits[active].key}` : undefined}
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent py-4 text-base outline-none placeholder:text-neutral-500"
          />
          <kbd className={`hidden rounded border px-1.5 py-0.5 font-mono text-[0.6rem] sm:block ${s.line} ${s.muted}`}>Esc</kbd>
        </div>

        <ul ref={list} id="initiative-search-list" role="listbox" className="nivra-scroll overflow-y-auto overscroll-contain px-1.5 pb-1.5">
          {hits.length === 0 ? (
            <li className={`px-3 py-6 text-center text-sm ${s.faint}`}>{t('Nada coincide con tu búsqueda.')}</li>
          ) : (
            hits.map((hit, i) => (
              <li
                key={hit.key}
                id={`hit-${hit.key}`}
                role="option"
                aria-selected={i === active}
                onMouseMove={() => setActive(i)}
                onClick={hit.run}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ${i === active ? s.active : ''}`}
              >
                <Icon name={hit.icon} className={`h-4 w-4 shrink-0 ${s.muted}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{hit.title || t('Sin título')}</p>
                  {hit.detail && <p className={`truncate text-[0.7rem] ${s.faint}`}>{hit.detail}</p>}
                </div>
                <span className={`shrink-0 text-[0.65rem] ${s.faint}`}>{hit.kind}</span>
              </li>
            ))
          )}
        </ul>

        <div className={`hidden items-center gap-4 border-t px-4 py-2 text-[0.65rem] sm:flex ${s.line} ${s.faint}`}>
          <span>↑↓ {t('moverse')}</span>
          <span>↵ {t('abrir')}</span>
          <span>Esc {t('cerrar')}</span>
        </div>
      </div>
    </div>
  )
}
