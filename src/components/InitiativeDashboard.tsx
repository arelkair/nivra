import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './ui'
import { InitiativeSettingsPage } from './initiative/InitiativeSettingsPage'
import type { Settings } from '../lib/settings'
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
  type Reminder,
  type Grade,
  type Movement,
  type BankAccount,
  MAIN_ACCOUNT,
  accountBalances,
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
import { InitiativeReminders } from './initiative/InitiativeReminders'
import { InitiativeCountdownsPage } from './initiative/InitiativeCountdownsPage'
import { PAGE_TO_SECTION, SECTIONS, type Section } from './initiative/sections'
import { InitiativeSearch, type Command } from './initiative/InitiativeSearch'
import { InitiativeNote } from './initiative/InitiativeNote'
import { InitiativeMusic, type MusicProps } from './initiative/InitiativeMusic'
import { ShortcutsHelp } from './initiative/ShortcutsPanel'
import { SHORTCUTS, isTyping, keyOf, prettyKey } from '../lib/shortcuts'
import { InitiativeLab } from './initiative/InitiativeLab'
import { InitiativeVault } from './initiative/InitiativeVault'
import type { AppLink, LinkTarget } from './initiative/vault/appLinks'
import { htmlToMarkdown } from './initiative/vault/convert'
import { norm, type VaultFolder, type VaultNote } from './initiative/vault/vaultModel'

type Props = {
  tasks: Task[]
  items: CalItem[]
  countdowns: Countdown[]
  setCountdowns: (update: (prev: Countdown[]) => Countdown[]) => void
  userName: string
  works: Work[]
  reminders: Reminder[]
  setReminders: (update: (prev: Reminder[]) => Reminder[]) => void
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
  accounts: BankAccount[]
  setAccounts: (update: (prev: BankAccount[]) => BankAccount[]) => void
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
  manualSubjects: Subject[]
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
  cfg: Settings
  music: MusicProps
}

export function InitiativeDashboard({
  tasks,
  items,
  countdowns,
  setCountdowns,
  userName,
  works,
  reminders,
  setReminders,
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
  accounts,
  setAccounts,
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
  manualSubjects,
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
  cfg,
  music,
}: Props) {
  const [now, setNow] = useState(() => new Date())
  const [theme, setTheme] = useStored<'light' | 'dark'>(
    'nivra-initiative-theme',
    matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  )
  const [section, setSectionState] = useState<Section>('inicio')
  const trail = useRef<Section[]>(['inicio'])
  const cursor = useRef(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [musicOpen, setMusicOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useStored('nivra-initiative-note-open', false)

  const setSection = useCallback((next: Section) => {
    if (trail.current[cursor.current] === next) return
    trail.current = [...trail.current.slice(0, cursor.current + 1), next]
    cursor.current = trail.current.length - 1
    setSectionState(next)
  }, [])

  const step = useCallback((delta: number) => {
    const target = cursor.current + delta
    if (target < 0 || target >= trail.current.length) return
    cursor.current = target
    setSectionState(trail.current[target])
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const dark = theme === 'dark'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    return () => {
      let saved = ''
      try {
        saved = localStorage.getItem('nivra-theme') ?? ''
      } catch {
        saved = ''
      }
      document.documentElement.classList.toggle('dark', saved.includes('dark'))
    }
  }, [dark])
  const bankBalance =
    bankEnabled && bankInitial !== null ? Object.values(accountBalances(bankInitial, accounts, movements)).reduce((a, x) => a + x, 0) : null
  const [vaultNotes, setVaultNotes] = useStored<VaultNote[]>('nivra-vault', [])
  const [vaultFolders, setVaultFolders] = useStored<VaultFolder[]>('nivra-vault-folders', [])
  const [migrated, setMigrated] = useStored<string[]>('nivra-vault-migrated', [])
  const [vaultTarget, setVaultTarget] = useState<string | null>(null)
  const [calendarFocus, setCalendarFocus] = useState<string | null>(null)
  const [bankFocus, setBankFocus] = useState<string | null>(null)
  const [pendingFocus, setPendingFocus] = useState<string | null>(null)

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

  const openApp = useCallback(
    (link: AppLink) => {
      if (link.section === 'calendario') setCalendarFocus(link.id ?? null)
      else if (link.section === 'banco') setBankFocus(link.id ?? null)
      else setPendingFocus(link.id ?? null)
      setSection(link.section)
    },
    [setSection],
  )

  const appTargets = useMemo<LinkTarget[]>(() => {
    const seen = new Set<string>()
    const events: LinkTarget[] = []
    for (const e of items) {
      if (e.origin !== 'evento' || seen.has(`${e.id}${e.date}`)) continue
      seen.add(`${e.id}${e.date}`)
      events.push({ section: 'calendario', id: e.date, label: `${e.title} (${e.date})` })
    }
    return [
      ...tasks.map((x) => ({ section: 'tareas' as Section, id: x.id, label: x.title })),
      ...works.map((x) => ({ section: 'examenes' as Section, id: x.id, label: x.title })),
      ...events,
      ...reminders.map((x) => ({ section: 'recordatorios' as Section, id: x.id, label: x.title })),
      ...wishes.map((x) => ({ section: 'deseos' as Section, id: x.id, label: x.title })),
      ...subs.map((x) => ({ section: 'suscripciones' as Section, id: x.id, label: x.title })),
      ...countdowns.map((x) => ({ section: 'cuentas' as Section, id: x.id, label: x.title })),
      ...(bankEnabled && bankInitial !== null
        ? [{ section: 'banco' as Section, id: MAIN_ACCOUNT, label: t('Principal') }, ...accounts.map((x) => ({ section: 'banco' as Section, id: x.id, label: x.name }))]
        : []),
    ].filter((x) => x.label)
  }, [items, tasks, works, reminders, wishes, subs, countdowns, accounts, bankEnabled, bankInitial])

  const sections = SECTIONS.filter((x) => x.id !== 'banco' || bankEnabled)

  const toggleTheme = () => setTheme(dark ? 'light' : 'dark')

  const commands: Command[] = [
    { id: 'tema', label: t('Cambiar tema'), hint: dark ? t('Pasar a claro') : t('Pasar a oscuro'), run: toggleTheme },
    { id: 'ajustes', label: t('Abrir ajustes'), run: () => setSection('ajustes') },
    { id: 'nota', label: t('Nota rápida'), hint: t('Abre la nota flotante'), run: () => setNoteOpen(true) },
    { id: 'musica', label: t('Música y ambiente'), hint: t('Abre el reproductor'), run: () => setMusicOpen(true) },
    { id: 'atajos', label: t('Ver los atajos'), run: () => setHelpOpen(true) },
  ]

  const searchKeys = useMemo(
    () =>
      cfg.shortcutsOn
        ? ['paleta', 'buscar']
            .filter((id) => cfg.enabledShortcuts[id] !== false)
            .map((id) => cfg.customKeys[id] ?? SHORTCUTS.find((a) => a.id === id)?.key ?? '')
            .filter(Boolean)
        : [],
    [cfg.shortcutsOn, cfg.enabledShortcuts, cfg.customKeys],
  )
  const searchHint = searchKeys[0] ? prettyKey(searchKeys[0]).replace(/ \+ /g, ' ') : ''

  useEffect(() => {
    if (!cfg.shortcutsOn) return
    let previous = ''
    const onKey = (e: KeyboardEvent) => {
      const pressed = keyOf(e)
      if (/^(ctrl|alt)\+/.test(pressed) && searchKeys.includes(pressed)) {
        e.preventDefault()
        setSearchOpen((v) => !v)
        return
      }
      if (searchOpen || helpOpen || isTyping(e.target)) return
      const combo = previous === 'g' ? `g ${pressed}` : pressed
      previous = pressed === 'g' ? 'g' : ''
      const shortcut = SHORTCUTS.find((a) => (cfg.customKeys[a.id] ?? a.key) === combo && cfg.enabledShortcuts[a.id] !== false)
      if (!shortcut) return
      e.preventDefault()
      const a = shortcut.action
      if (a.kind === 'ir') {
        const target = PAGE_TO_SECTION[a.page]
        if (target && (target !== 'banco' || bankEnabled)) setSection(target)
      } else if (a.kind === 'atras') step(-1)
      else if (a.kind === 'adelante') step(1)
      else if (a.kind === 'ajustes') setSection('ajustes')
      else if (a.kind === 'tema') setTheme((v) => (v === 'dark' ? 'light' : 'dark'))
      else if (a.kind === 'nota') setNoteOpen((v) => !v)
      else if (a.kind === 'musica') setMusicOpen((v) => !v)
      else if (a.kind === 'ayuda') setHelpOpen(true)
      else if (a.kind === 'buscar') setSearchOpen(true)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [cfg.shortcutsOn, cfg.enabledShortcuts, cfg.customKeys, bankEnabled, searchOpen, helpOpen, searchKeys, setSection, step, setTheme, setNoteOpen])
  const groups = sections.reduce<{ title: string; items: typeof sections }[]>((acc, x) => {
    const last = acc[acc.length - 1]
    if (last && last.title === x.group) last.items.push(x)
    else acc.push({ title: x.group, items: [x] })
    return acc
  }, [])
  const current: Section = section === 'banco' && !bankEnabled ? 'inicio' : section

  useEffect(() => {
    if (!pendingFocus) return
    let tries = 0
    const timer = setInterval(() => {
      const el = document.querySelector<HTMLElement>(`[data-nivra-id="${CSS.escape(pendingFocus)}"]`)
      if (!el && ++tries <= 15) return
      clearInterval(timer)
      setPendingFocus(null)
      if (!el) return
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el.classList.remove('nivra-flash')
      void el.offsetWidth
      el.classList.add('nivra-flash')
    }, 80)
    return () => clearInterval(timer)
  }, [pendingFocus, current])

  useEffect(() => {
    document.querySelector('nav.fixed [aria-current="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [current])

  return (
    <div
      className={`relative z-10 flex h-svh flex-col overflow-hidden transition-colors ${
        dark ? 'bg-[#0a0a0c] text-neutral-100 [color-scheme:dark]' : 'bg-[#f5f4f0] text-neutral-900'
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
              <p className={`mb-1 px-3 font-mono text-[0.6rem] tracking-[0.18em] uppercase ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
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
                        ? 'text-neutral-400 hover:bg-white/5 hover:text-neutral-100'
                        : 'text-neutral-600 hover:bg-black/[0.04] hover:text-neutral-900'
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
          onClick={() => setSearchOpen(true)}
          aria-label={t('Buscar')}
          title={searchHint ? `${t('Buscar')} (${searchHint})` : t('Buscar')}
          className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-sm transition-colors max-md:w-10 max-md:justify-center max-md:px-0 ${
            dark
              ? 'border-white/[0.12] text-neutral-400 hover:bg-white/5 hover:text-white'
              : 'border-black/[0.1] text-neutral-600 hover:bg-black/[0.04] hover:text-neutral-900'
          }`}
        >
          <Icon name="search" className="h-[18px] w-[18px]" />
          <span className="hidden md:inline">{t('Buscar')}</span>
          {searchHint && <kbd className="hidden rounded border border-current/20 px-1.5 font-mono text-[0.6rem] opacity-70 lg:inline">{searchHint}</kbd>}
        </button>
        <button
          type="button"
          onClick={() => setTheme(dark ? 'light' : 'dark')}
          aria-label={dark ? t('Tema claro') : t('Tema oscuro')}
          className={`grid h-10 w-10 place-items-center rounded-xl border transition-colors ${
            dark
              ? 'border-white/[0.12] text-neutral-400 hover:bg-white/5 hover:text-white'
              : 'border-black/[0.1] text-neutral-600 hover:bg-black/[0.04] hover:text-neutral-900'
          }`}
        >
          <Icon name={dark ? 'sun' : 'moon'} className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={onDisable}
          aria-label={t('Volver a Nivra Classic')}
          title={t('Volver a Nivra Classic')}
          className={`grid h-10 w-10 place-items-center rounded-xl border transition-colors ${
            dark
              ? 'border-white/[0.12] text-neutral-400 hover:bg-white/5 hover:text-white'
              : 'border-black/[0.1] text-neutral-600 hover:bg-black/[0.04] hover:text-neutral-900'
          }`}
        >
          <Icon name="initiative" className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => setSection('ajustes')}
          aria-current={section === 'ajustes'}
          aria-label={t('Ajustes')}
          className={`grid h-10 w-10 place-items-center rounded-xl border transition-colors ${
            dark
              ? 'border-white/[0.12] text-neutral-400 hover:bg-white/5 hover:text-white'
              : 'border-black/[0.1] text-neutral-600 hover:bg-black/[0.04] hover:text-neutral-900'
          }`}
        >
          <Icon name="settings" className="h-[18px] w-[18px]" />
        </button>
        </span>
      </header>

      <nav
        className={`nivra-scroll fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto border-t pb-[env(safe-area-inset-bottom)] md:hidden ${
          dark ? 'border-white/[0.08] bg-[#0a0a0c]/95' : 'border-black/[0.08] bg-[#f5f4f0]/95'
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
                  ? 'text-neutral-400'
                  : 'text-neutral-600'
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
            focusDate={calendarFocus}
            onFocusHandled={() => setCalendarFocus(null)}
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
        <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-24 md:py-6 md:pr-8 md:pb-6 md:pl-64 lg:overflow-hidden lg:py-4 lg:pb-5">
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
            bank={bankBalance !== null ? { balance: bankBalance, movements } : null}
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
            accounts={accounts}
            setAccounts={setAccounts}
            focusAccount={bankFocus}
            onFocusHandled={() => setBankFocus(null)}
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
          <InitiativeSubscriptions subs={subs} setSubs={setSubs} accounts={accounts} dark={dark} />
        </main>
      )}

      {current === 'recordatorios' && (
        <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-24 md:py-6 md:pr-8 md:pb-6 md:pl-64">
          <InitiativeReminders reminders={reminders} setReminders={setReminders} works={works} dark={dark} />
        </main>
      )}

      {current === 'ajustes' && (
        <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-24 md:py-6 md:pr-8 md:pb-6 md:pl-64">
          <InitiativeSettingsPage
            cfg={cfg}
            dark={dark}
            onTheme={setTheme}
            detected={subjects.filter((x) => !manualSubjects.some((m) => m.id === x.id))}
            items={items}
            blocks={blocks}
            anniversaries={anniversaries}
            onDisable={onDisable}
          />
        </main>
      )}

      {current === 'cuentas' && (
        <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-24 md:py-6 md:pr-8 md:pb-6 md:pl-64">
          <InitiativeCountdownsPage countdowns={countdowns} setCountdowns={setCountdowns} works={works} now={now} dark={dark} />
        </main>
      )}

      {current === 'lab' && (
        <main className="nivra-scroll relative z-10 flex-1 overflow-y-auto px-4 py-4 pb-24 md:py-6 md:pr-8 md:pb-6 md:pl-64">
          <InitiativeLab dark={dark} />
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
            linkTargets={appTargets}
            onOpenApp={openApp}
            focusId={vaultTarget}
            onFocusHandled={() => setVaultTarget(null)}
          />
        </main>
      )}

      <div className="fixed right-4 bottom-4 z-40 flex gap-2 max-md:right-3 max-md:bottom-[4.75rem]">
        <button
          type="button"
          onClick={() => setNoteOpen(!noteOpen)}
          aria-label={t('Nota rápida')}
          aria-pressed={noteOpen}
          title={`${t('Nota rápida')} (⇧ N)`}
          className={`grid h-10 w-10 place-items-center rounded-full border shadow-lg transition-colors ${
            noteOpen
              ? dark
                ? 'border-white bg-white text-neutral-900'
                : 'border-neutral-900 bg-neutral-900 text-white'
              : dark
                ? 'border-white/[0.12] bg-[#131316] text-neutral-300 hover:text-white'
                : 'border-black/[0.1] bg-white text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Icon name="pencil" className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => setMusicOpen(!musicOpen)}
          aria-label={t('Música y ambiente')}
          aria-pressed={musicOpen}
          title={`${t('Música y ambiente')} (⇧ M)`}
          className={`relative grid h-10 w-10 place-items-center rounded-full border shadow-lg transition-colors ${
            musicOpen
              ? dark
                ? 'border-white bg-white text-neutral-900'
                : 'border-neutral-900 bg-neutral-900 text-white'
              : dark
                ? 'border-white/[0.12] bg-[#131316] text-neutral-300 hover:text-white'
                : 'border-black/[0.1] bg-white text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Icon name="volume" className="h-[18px] w-[18px]" />
          {cfg.ambientOn && <span className="absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-inherit bg-emerald-500" />}
        </button>
      </div>

      <InitiativeMusic {...music} dark={dark} cfg={cfg} open={musicOpen} onClose={() => setMusicOpen(false)} />

      {noteOpen && (
        <InitiativeNote
          dark={dark}
          notes={vaultNotes}
          setNotes={setVaultNotes}
          createNote={createNote}
          onOpenNote={(id) => {
            openNote(id)
          }}
          onClose={() => setNoteOpen(false)}
        />
      )}

      <InitiativeSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        dark={dark}
        data={{ tasks, items, works, grades, blocks, subs, wishes, countdowns, reminders, goals, subjects, notes: vaultNotes, bankEnabled }}
        commands={commands}
        closeKeys={searchKeys}
        onGo={setSection}
        onOpenNote={openNote}
      />

      {helpOpen && <ShortcutsHelp cfg={cfg} dark={dark} onClose={() => setHelpOpen(false)} />}
    </div>
  )
}
