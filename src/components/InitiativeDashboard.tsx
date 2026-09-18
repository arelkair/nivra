import { useEffect, useState } from 'react'
import { Icon } from './ui'
import { InitiativeSettings } from './InitiativeSettings'
import { t } from '../lib/i18n'
import {
  useStored,
  pagesOf,
  type Anniversary,
  type Block,
  type Profile,
  type CalItem,
  type Countdown,
  type Goal,
  type Subscription,
  type Wish,
  type Grade,
  type Movement,
  type NivraEvent,
  type Notepad,
  type Streak,
  type Subject,
  type Task,
  type Work,
} from '../lib/store'
import { InitiativeCalendar } from './initiative/InitiativeCalendar'
import { InitiativeTasks } from './initiative/InitiativeTasks'
import { InitiativeExams } from './initiative/InitiativeExams'
import { InitiativeHome } from './initiative/InitiativeHome'
import { InitiativeGrades } from './initiative/InitiativeGrades'
import { InitiativeSchedule } from './initiative/InitiativeSchedule'
import { InitiativeMoney } from './initiative/InitiativeMoney'
import { InitiativeWishlist } from './initiative/InitiativeWishlist'
import { InitiativeSubscriptions } from './initiative/InitiativeSubscriptions'
import { InitiativeVault } from './initiative/InitiativeVault'
import { htmlToMarkdown } from './initiative/vault/convert'
import { norm, type VaultFolder, type VaultNote } from './initiative/vault/vaultModel'

type Props = {
  tasks: Task[]
  items: CalItem[]
  countdowns: Countdown[]
  setCountdowns: (update: (prev: Countdown[]) => Countdown[]) => void
  userName: string
  setUserName: (name: string) => void
  works: Work[]
  streak: Streak
  setStreak: (update: (prev: Streak) => Streak) => void
  grades: Grade[]
  setGrades: (update: (prev: Grade[]) => Grade[]) => void
  setWorks: (update: (prev: Work[]) => Work[]) => void
  bankEnabled: boolean
  bankInitial: number | null
  setBankInitial: (update: (prev: number | null) => number | null) => void
  movements: Movement[]
  setMovements: (update: (prev: Movement[]) => Movement[]) => void
  subs: Subscription[]
  setSubs: (update: (prev: Subscription[]) => Subscription[]) => void
  wishes: Wish[]
  setWishes: (update: (prev: Wish[]) => Wish[]) => void
  goals: Goal[]
  setGoals: (update: (prev: Goal[]) => Goal[]) => void
  blocks: Block[]
  setBlocks: (update: (prev: Block[]) => Block[]) => void
  profiles: Profile[]
  setProfiles: (update: (prev: Profile[]) => Profile[]) => void
  activeProfile: string
  setActiveProfile: (id: string) => void
  subjects: Subject[]
  setTasks: (update: (prev: Task[]) => Task[]) => void
  setEvents: (update: (prev: NivraEvent[]) => NivraEvent[]) => void
  notepads: Notepad[]
  freeDays: string[]
  setFreeDays: (update: (prev: string[]) => string[]) => void
  specialDays: string[]
  setSpecialDays: (update: (prev: string[]) => string[]) => void
  autoSpecial: string[]
  subDays: number[]
  anniversaries: Anniversary[]
  setAnniversaries: (update: (prev: Anniversary[]) => Anniversary[]) => void
  onDisable: () => void
}

type Section = 'inicio' | 'calendario' | 'horario' | 'tareas' | 'examenes' | 'notas' | 'banco' | 'deseos' | 'suscripciones' | 'boveda'

const SECTIONS: { id: Section; group: string; label: string; short: string; icon: string }[] = [
  { id: 'inicio', group: 'Principal', label: 'Inicio', short: 'Inicio', icon: 'dashboard' },
  { id: 'calendario', group: 'Principal', label: 'Calendario', short: 'Calend.', icon: 'calendar' },
  { id: 'horario', group: 'Principal', label: 'Horario', short: 'Horario', icon: 'schedule' },
  { id: 'tareas', group: 'Estudio', label: 'Tareas', short: 'Tareas', icon: 'tasks' },
  { id: 'examenes', group: 'Estudio', label: 'Exámenes y Proyectos', short: 'Exám.', icon: 'exams' },
  { id: 'notas', group: 'Estudio', label: 'Notas', short: 'Notas', icon: 'grades' },
  { id: 'banco', group: 'Dinero', label: 'Dinero', short: 'Dinero', icon: 'bank' },
  { id: 'deseos', group: 'Dinero', label: 'Lista de Deseos', short: 'Deseos', icon: 'wish' },
  { id: 'suscripciones', group: 'Dinero', label: 'Suscripciones', short: 'Subs', icon: 'subs' },
  { id: 'boveda', group: 'Utilidades', label: 'Bóveda', short: 'Bóveda', icon: 'graph' },
]

export function InitiativeDashboard({
  tasks,
  items,
  countdowns,
  setCountdowns,
  userName,
  setUserName,
  works,
  streak,
  setStreak,
  grades,
  setGrades,
  setWorks,
  bankEnabled,
  bankInitial,
  setBankInitial,
  movements,
  setMovements,
  subs,
  setSubs,
  wishes,
  setWishes,
  goals,
  setGoals,
  blocks,
  setBlocks,
  profiles,
  setProfiles,
  activeProfile,
  setActiveProfile,
  subjects,
  setTasks,
  setEvents,
  notepads,
  freeDays,
  setFreeDays,
  specialDays,
  setSpecialDays,
  autoSpecial,
  subDays,
  anniversaries,
  setAnniversaries,
  onDisable,
}: Props) {
  const [now, setNow] = useState(() => new Date())
  const [theme, setTheme] = useStored<'light' | 'dark'>('nivra-initiative-theme', 'light')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [section, setSection] = useState<Section>('inicio')

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const dark = theme === 'dark'
  const bankBalance =
    bankEnabled && bankInitial !== null
      ? bankInitial + movements.reduce((a, m) => a + (m.kind === 'ingreso' ? m.amount : -m.amount), 0)
      : null
  const [vaultNotes, setVaultNotes] = useStored<VaultNote[]>('nivra-vault', [])
  const [vaultFolders, setVaultFolders] = useStored<VaultFolder[]>('nivra-vault-folders', [])
  const [migrated, setMigrated] = useStored<string[]>('nivra-vault-migrated', [])
  const [vaultTarget, setVaultTarget] = useState<string | null>(null)

  useEffect(() => {
    const pending = notepads.filter((n) => !migrated.includes(n.id))
    if (pending.length === 0) return
    const taken = new Set(vaultNotes.map((n) => norm(n.title)))
    const created: VaultNote[] = []
    for (const n of pending) {
      const base = n.title.trim() || 'Sin título'
      let title = base
      let k = 2
      while (taken.has(norm(title))) title = `${base} ${k++}`
      taken.add(norm(title))
      const body = pagesOf(n)
        .map((p) => htmlToMarkdown(p.html))
        .filter((x) => x !== '')
        .join('\n\n---\n\n')
      const now = Date.now()
      created.push({ id: n.id, title, body, created: now, updated: now })
    }
    setVaultNotes((prev) => [...prev, ...created.filter((c) => !prev.some((p) => p.id === c.id))])
    setMigrated((prev) => [...new Set([...prev, ...pending.map((n) => n.id)])])
  }, [notepads, migrated, vaultNotes, setVaultNotes, setMigrated])

  const noteRefs = vaultNotes.map((n) => ({ id: n.id, title: n.title }))
  const createNote = (title: string) => {
    const taken = new Set(vaultNotes.map((n) => norm(n.title)))
    const base = title.trim() || 'Sin título'
    let name = base
    let k = 2
    while (taken.has(norm(name))) name = `${base} ${k++}`
    const id = crypto.randomUUID()
    const now = Date.now()
    setVaultNotes((prev) => [...prev, { id, title: name, body: '', created: now, updated: now }])
    return id
  }
  const openNote = (id: string) => {
    setVaultTarget(id)
    setSection('boveda')
  }

  const sections = SECTIONS.filter((x) => x.id !== 'banco' || bankEnabled)
  const groups = sections.reduce<{ title: string; items: typeof sections }[]>((acc, x) => {
    const last = acc[acc.length - 1]
    if (last && last.title === x.group) last.items.push(x)
    else acc.push({ title: x.group, items: [x] })
    return acc
  }, [])
  const current: Section = section === 'banco' && !bankEnabled ? 'inicio' : section

  useEffect(() => {
    document.querySelector('nav.fixed [aria-current="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [current])

  return (
    <div
      className={`relative z-10 flex h-svh flex-col overflow-hidden transition-colors ${
        dark ? 'bg-neutral-950 text-neutral-100 [color-scheme:dark]' : 'bg-stone-50 text-neutral-900'
      }`}
    >
      <aside
        className={`fixed inset-y-0 left-0 z-20 hidden w-56 flex-col gap-1 border-r px-3 py-4 md:flex ${
          dark ? 'border-white/10' : 'border-black/[0.07]'
        }`}
      >
        <span className="font-initiative mb-4 px-2 text-lg font-medium tracking-tight">Initiative</span>
        <nav className="nivra-scroll flex flex-1 flex-col gap-5 overflow-y-auto overscroll-contain pb-2">
          {groups.map((g) => (
            <div key={g.title} className="flex flex-col gap-0.5">
              <p className={`mb-1 px-3 font-mono text-[0.6rem] tracking-[0.18em] uppercase ${dark ? 'text-neutral-600' : 'text-neutral-400'}`}>
                {t(g.title)}
              </p>
              {g.items.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  aria-current={current === s.id}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    current === s.id
                      ? dark
                        ? 'bg-white/10 font-medium text-white'
                        : 'bg-black/[0.06] font-medium text-neutral-900'
                      : dark
                        ? 'text-neutral-500 hover:bg-white/5 hover:text-neutral-200'
                        : 'text-neutral-500 hover:bg-black/[0.03] hover:text-neutral-900'
                  }`}
                >
                  <Icon name={s.icon} className="h-[17px] w-[17px] shrink-0" />
                  {t(s.label)}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <header className="relative z-10 flex shrink-0 items-center justify-between gap-2 px-4 py-3 md:justify-end md:py-4 md:pr-8 md:pl-64">
        <span className="font-initiative text-lg font-medium tracking-tight md:hidden">Initiative</span>
        <span className="flex gap-2">
        <button
          type="button"
          onClick={() => setTheme(dark ? 'light' : 'dark')}
          aria-label={dark ? t('Tema claro') : t('Tema oscuro')}
          className={`grid h-10 w-10 place-items-center rounded-xl border transition-colors ${
            dark
              ? 'border-white/10 text-neutral-400 hover:bg-white/5 hover:text-white'
              : 'border-black/[0.07] text-neutral-500 hover:bg-black/[0.03] hover:text-neutral-900'
          }`}
        >
          <Icon name={dark ? 'sun' : 'moon'} className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label={t('Ajustes')}
          className={`grid h-10 w-10 place-items-center rounded-xl border transition-colors ${
            dark
              ? 'border-white/10 text-neutral-400 hover:bg-white/5 hover:text-white'
              : 'border-black/[0.07] text-neutral-500 hover:bg-black/[0.03] hover:text-neutral-900'
          }`}
        >
          <Icon name="settings" className="h-[18px] w-[18px]" />
        </button>
        </span>
      </header>

      <nav
        className={`nivra-scroll fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto border-t pb-[env(safe-area-inset-bottom)] md:hidden ${
          dark ? 'border-white/10 bg-neutral-950/95' : 'border-black/[0.07] bg-stone-50/95'
        } backdrop-blur`}
      >
        {sections.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => setSection(sec.id)}
            aria-current={current === sec.id}
            className={`flex min-w-14 flex-1 shrink-0 flex-col items-center gap-1 py-2.5 text-[0.65rem] transition-colors ${
              current === sec.id
                ? dark
                  ? 'text-white'
                  : 'text-neutral-900'
                : dark
                  ? 'text-neutral-500'
                  : 'text-neutral-500'
            }`}
          >
            <Icon name={sec.icon} className="h-5 w-5" />
            <span className="max-w-full truncate">{t(sec.short)}</span>
          </button>
        ))}
      </nav>

      {current === 'calendario' && (
        <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-24 md:py-6 md:pr-8 md:pb-6 md:pl-64">
          <InitiativeCalendar
            items={items}
            subjects={subjects}
            setEvents={setEvents}
            freeDays={freeDays}
            setFreeDays={setFreeDays}
            specialDays={specialDays}
            setSpecialDays={setSpecialDays}
            autoSpecial={autoSpecial}
            subDays={subDays}
            anniversaries={anniversaries}
            setAnniversaries={setAnniversaries}
            dark={dark}
          />
        </main>
      )}

      {current === 'tareas' && (
        <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-24 md:py-6 md:pr-8 md:pb-6 md:pl-64">
          <InitiativeTasks
            tasks={tasks}
            setTasks={setTasks}
            subjects={subjects}
            notes={noteRefs}
            onCreateNote={createNote}
            onOpenNote={openNote}
            dark={dark}
          />
        </main>
      )}

      {current === 'inicio' && (
        <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-24 md:py-6 md:pr-8 md:pb-6 md:pl-64">
          <InitiativeHome
            now={now}
            dark={dark}
            items={items}
            tasks={tasks}
            setTasks={setTasks}
            works={works}
            countdowns={countdowns}
            setCountdowns={setCountdowns}
            userName={userName}
            streak={streak}
            setStreak={setStreak}
            subjects={subjects}
            grades={grades}
            blocks={blocks}
            profile={activeProfile}
            subs={subs}
            bank={bankEnabled && bankInitial !== null ? { balance: bankInitial + movements.reduce((a, m) => a + (m.kind === 'ingreso' ? m.amount : -m.amount), 0), movements } : null}
            onOpen={setSection}
          />
        </main>
      )}

      {current === 'examenes' && (
        <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-24 md:py-6 md:pr-8 md:pb-6 md:pl-64">
          <InitiativeExams
            works={works}
            setWorks={setWorks}
            subjects={subjects}
            notes={noteRefs}
            onCreateNote={createNote}
            onOpenNote={openNote}
            grades={grades}
            dark={dark}
          />
        </main>
      )}

      {current === 'horario' && (
        <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-24 md:py-6 md:pr-8 md:pb-6 md:pl-64">
          <InitiativeSchedule
            blocks={blocks}
            setBlocks={setBlocks}
            profiles={profiles}
            setProfiles={setProfiles}
            active={activeProfile}
            setActive={setActiveProfile}
            subjects={subjects}
            dark={dark}
          />
        </main>
      )}

      {current === 'notas' && (
        <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-24 md:py-6 md:pr-8 md:pb-6 md:pl-64">
          <InitiativeGrades grades={grades} setGrades={setGrades} subjects={subjects} works={works} dark={dark} />
        </main>
      )}

      {current === 'banco' && (
        <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-24 md:py-6 md:pr-8 md:pb-6 md:pl-64">
          <InitiativeMoney
            initial={bankInitial}
            setInitial={setBankInitial}
            movements={movements}
            setMovements={setMovements}
            goals={goals}
            setGoals={setGoals}
            dark={dark}
          />
        </main>
      )}

      {current === 'deseos' && (
        <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-24 md:py-6 md:pr-8 md:pb-6 md:pl-64">
          <InitiativeWishlist
            wishes={wishes}
            setWishes={setWishes}
            balance={bankBalance}
            onExpense={(amount, title) => {
              const id = crypto.randomUUID()
              const date = new Date()
              const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
              setMovements((prev) => [{ id, kind: 'gasto', amount, category: 'Otros', date: key, note: title }, ...prev])
              return id
            }}
            onUndoExpense={(id) => setMovements((prev) => prev.filter((m) => m.id !== id))}
            dark={dark}
          />
        </main>
      )}

      {current === 'suscripciones' && (
        <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-24 md:py-6 md:pr-8 md:pb-6 md:pl-64">
          <InitiativeSubscriptions subs={subs} setSubs={setSubs} dark={dark} />
        </main>
      )}

      {current === 'boveda' && (
        <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-24 md:py-6 md:pr-8 md:pb-6 md:pl-64">
          <InitiativeVault
            dark={dark}
            notes={vaultNotes}
            setNotes={setVaultNotes}
            folders={vaultFolders}
            setFolders={setVaultFolders}
            focusId={vaultTarget}
            onFocusHandled={() => setVaultTarget(null)}
          />
        </main>
      )}

      {settingsOpen && <InitiativeSettings onClose={() => setSettingsOpen(false)} onDisable={onDisable} name={userName} onName={setUserName} />}
    </div>
  )
}
