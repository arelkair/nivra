import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bank, type BankTab } from './pages/Bank'
import { Calendar } from './pages/Calendar'
import { Dashboard } from './pages/Dashboard'
import { Exams } from './pages/Exams'
import { Grades } from './pages/Grades'
import { Notepads } from './pages/Notepads'
import { Reminders } from './pages/Reminders'
import { Schedule } from './pages/Schedule'
import { SetupScreen } from './pages/SetupScreen'
import { Subscriptions } from './pages/Subscriptions'
import { Tasks } from './pages/Tasks'
import { Wishlist } from './pages/Wishlist'
import { Intro } from './components/Intro'
import { Search, type Destination, type SearchResult } from './components/Search'
import { Settings } from './components/Settings'
import { FloatingNote } from './components/FloatingNote'
import { Countdowns } from './components/Countdowns'
import { Clock, Confetti, Icon, Toasts, line, type Toast } from './components/ui'
import { useSettings } from './lib/settings'
import { showSystemNotice, markNoticesSent, pendingNotices } from './lib/notify'
import { SHORTCUTS, isTyping, keyOf } from './lib/shortcuts'
import { useSync } from './lib/useSync'
import { registerNotifier } from './lib/undo'
import {
  EXPENSE_CATS,
  INCOME_CATS,
  SUBSCRIPTION_CAT,
  calendarItems,
  duePayments,
  dateKey,
  monthDay,
  useStored,
  type Anniversary,
  type Block,
  type Countdown,
  type Goal,
  type Grade,
  type Movement,
  type NivraEvent,
  type Notepad,
  type PageId,
  type Profile,
  type Reminder,
  type Streak,
  type Subscription,
  type Task,
  type Wish,
  type Work,
} from './lib/store'
import { t, tp } from './lib/i18n'

const SETUP_KEY = 'nivra-setup-done'

type Page = { id: PageId; label: string; short: string; icon: string }

const GROUPS: { title: string; pages: Page[] }[] = [
  {
    title: 'Principal',
    pages: [
      { id: 'dashboard', label: 'Dashboard', short: 'Inicio', icon: 'dashboard' },
      { id: 'calendario', label: 'Calendario', short: 'Calend.', icon: 'calendar' },
      { id: 'horario', label: 'Horario', short: 'Horario', icon: 'schedule' },
    ],
  },
  {
    title: 'Estudio',
    pages: [
      { id: 'tareas', label: 'Tareas', short: 'Tareas', icon: 'tasks' },
      { id: 'examenes', label: 'Exámenes y Proyectos', short: 'Exám.', icon: 'exams' },
      { id: 'notas', label: 'Notas', short: 'Notas', icon: 'grades' },
    ],
  },
  {
    title: 'Dinero',
    pages: [
      { id: 'banco', label: 'Banco', short: 'Banco', icon: 'bank' },
      { id: 'deseos', label: 'Lista de Deseos', short: 'Deseos', icon: 'wish' },
      { id: 'suscripciones', label: 'Suscripciones', short: 'Subs', icon: 'subs' },
    ],
  },
  {
    title: 'Utilidades',
    pages: [
      { id: 'bloc', label: 'Bloc de Notas', short: 'Bloc', icon: 'pencil' },
      { id: 'cuentas', label: 'Cuentas atrás', short: 'Cuentas', icon: 'timer' },
      { id: 'recordatorios', label: 'Recordatorios', short: 'Avisos', icon: 'bell' },
    ],
  },
]

const PAGES = GROUPS.flatMap((g) => g.pages)

const BANK_TABS: { id: BankTab; label: string }[] = [
  { id: 'dinero', label: 'Dinero' },
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'gastos', label: 'Gastos' },
  { id: 'objetivos', label: 'Objetivos' },
]

const SETTING_LABELS = [
  'Animación de inicio',
  'Animaciones al cambiar de apartado',
  'Tema según la hora',
  'Reloj',
  'Formato de 12 horas',
  'Buscador',
  'Botones de atrás y adelante',
  'Color',
  'Asignaturas',
  'Notificaciones',
  'Atajos de teclado',
  'Sincronización',
  'Exportar o importar datos',
  'Cumpleaños',
]

const DAY_START = 7
const DAY_END = 20
const isDaytime = (d: Date) => d.getHours() >= DAY_START && d.getHours() < DAY_END

const headerButton =
  'grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/[0.07] text-neutral-500 transition-colors hover:bg-black/[0.03] hover:text-neutral-900 disabled:opacity-30 disabled:hover:bg-transparent dark:border-white/[0.08] dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white'

function App() {
  const [setupDone, setSetupDone] = useState(() => localStorage.getItem(SETUP_KEY) === '1')
  const [introDone, setIntroDone] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [floatingNote, setFloatingNote] = useState(false)
  const [bankTab, setBankTab] = useState<BankTab>('dinero')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [sync, setSync] = useSync()
  const cfg = useSettings()

  const [pageHistory, setPageHistory] = useState<PageId[]>(['dashboard'])
  const [index, setIndex] = useState(0)
  const page = pageHistory[index]

  const historyLength = useRef(1)
  historyLength.current = pageHistory.length

  useEffect(() => {
    history.replaceState({ nivra: 0 }, '')
  }, [])

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const i = (e.state as { nivra?: number } | null)?.nivra
      if (typeof i !== 'number') return
      // A reload keeps browser entries from the previous session, so the index is
      // clamped to the history that actually exists to avoid rendering a blank page.
      setIndex(Math.min(Math.max(i, 0), historyLength.current - 1))
    }
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  const irA = useCallback(
    (destino: PageId) => {
      if (destino === 'banco' && !cfg.bankEnabled) return
      setMenuOpen(false)
      if (pageHistory[index] === destino) return
      if (destino === 'banco') setBankTab('dinero')
      const next = index + 1
      setPageHistory((prev) => [...prev.slice(0, index + 1), destino])
      setIndex(next)
      history.pushState({ nivra: next }, '')
    },
    [index, pageHistory, cfg.bankEnabled],
  )
  const back = useCallback(() => history.back(), [])
  const forward = useCallback(() => history.forward(), [])

  useEffect(() => {
    if (page === 'banco' && !cfg.bankEnabled) irA('dashboard')
  }, [page, cfg.bankEnabled, irA])

  const notify = useCallback(
    (text: string, undo?: () => void) => {
      if (!cfg.toasts) return
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, text, undo }])
      setTimeout(() => setToasts((prev) => prev.filter((a) => a.id !== id)), undo ? 8000 : 6000)
    },
    [cfg.toasts],
  )

  useEffect(() => registerNotifier(notify), [notify])

  const [installPrompt, setInstallPrompt] = useState<Event | null>(null)
  useEffect(() => {
    const save = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    addEventListener('beforeinstallprompt', save)
    addEventListener('appinstalled', () => setInstallPrompt(null))
    return () => removeEventListener('beforeinstallprompt', save)
  }, [])

  const [theme, setTheme] = useStored<'light' | 'dark'>(
    'nivra-theme',
    matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  )
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const appliedStretch = useRef<'light' | 'dark' | null>(null)
  useEffect(() => {
    if (!cfg.autoTheme) {
      appliedStretch.current = null
      return
    }
    // Only switches when crossing dawn or dusk, so a manual change made midway
    // through a stretch survives until the next one instead of being undone.
    const apply = () => {
      const stretch = isDaytime(new Date()) ? 'light' : 'dark'
      if (stretch === appliedStretch.current) return
      appliedStretch.current = stretch
      setTheme(stretch)
    }
    apply()
    const id = setInterval(apply, 60000)
    return () => clearInterval(id)
  }, [cfg.autoTheme, setTheme])
  useEffect(() => {
    if (cfg.accent === 'basico') delete document.documentElement.dataset.accent
    else document.documentElement.dataset.accent = cfg.accent
  }, [cfg.accent])

  const [events, setEvents] = useStored<NivraEvent[]>('nivra-events', [])
  const [tasks, setTasks] = useStored<Task[]>('nivra-tasks', [])
  const [blocks, setBlocks] = useStored<Block[]>('nivra-blocks', [])
  const [works, setWorks] = useStored<Work[]>('nivra-works', [])
  const [freeDays, setFreeDays] = useStored<string[]>('nivra-free-days', [])
  const [specialDays, setSpecialDays] = useStored<string[]>('nivra-special-days', [])
  const [anniversaries, setAnniversaries] = useStored<Anniversary[]>('nivra-anniversaries', [])
  const [bankInitial, setBankInitial] = useStored<number | null>('nivra-bank-initial', null)
  const [movements, setMovements] = useStored<Movement[]>('nivra-movements', [])
  const [countdowns, setCountdowns] = useStored<Countdown[]>('nivra-timers', [])
  const [wishes, setWishes] = useStored<Wish[]>('nivra-wishes', [])
  const [grades, setGrades] = useStored<Grade[]>('nivra-grades', [])
  const [streak, setStreak] = useStored<Streak>('nivra-streak', { count: 0, last: '' })
  const [notepads, setNotepads] = useStored<Notepad[]>('nivra-notepads', [])
  const [reminders, setReminders] = useStored<Reminder[]>('nivra-reminders', [])
  const [subs, setSubs] = useStored<Subscription[]>('nivra-subs', [])
  const [goals, setGoals] = useStored<Goal[]>('nivra-goals', [])
  const [profiles, setProfiles] = useStored<Profile[]>('nivra-profiles', [
    { id: 'principal', name: 'Horario' },
  ])
  const [profile, setProfile] = useStored('nivra-profile', 'principal')

  const items = useMemo(() => calendarItems(events, tasks, works), [events, tasks, works])
  const balance =
    bankInitial === null
      ? null
      : bankInitial + movements.reduce((s, m) => s + (m.kind === 'ingreso' ? m.amount : -m.amount), 0)

  const isBirthday =
    cfg.birthday !== '' && monthDay(cfg.birthday) === monthDay(dateKey(new Date()))

  const mainCountdown = countdowns[0]
  const allSpecialDays = useMemo(
    () => [...specialDays, ...countdowns.map((c) => c.target.slice(0, 10))],
    [specialDays, countdowns],
  )
  const subscriptionDays = useMemo(() => subs.map((s) => s.day), [subs])
  const todayKey = dateKey(new Date())
  const remindersHoy = useMemo(
    () => reminders.filter((r) => r.date === todayKey),
    [reminders, todayKey],
  )

  useEffect(() => {
    const dueCharges = duePayments(subs, new Date())
    if (dueCharges.length === 0) return
    setMovements((prev) => [
      ...dueCharges
        .filter(({ sub, date }) => !prev.some((m) => m.id === `sub-${sub.id}-${date}`))
        .map(({ sub, date }) => ({
        id: `sub-${sub.id}-${date}`,
        kind: 'gasto' as const,
        amount: sub.price,
        category: SUBSCRIPTION_CAT,
        date,
      })),
      ...prev,
    ])
    setSubs((prev) =>
      prev.map((s) => {
        const own = dueCharges.filter((p) => p.sub.id === s.id)
        if (own.length === 0) return s
        return { ...s, lastCharged: own.map((p) => p.date).sort().pop() }
      }),
    )
    notify(tp('Se han cobrado {0} suscripción/es.', dueCharges.length))
  }, [subs, setMovements, setSubs, notify])

  const alreadyNotified = useRef(false)
  useEffect(() => {
    if (alreadyNotified.current) return
    alreadyNotified.current = true
    const list = pendingNotices(new Date(), {
      countdowns,
      anniversaries,
      items,
      works,
      reminders,
      tasks,
    })
    const delivered = list
      .filter((p) => cfg.toasts || (cfg.notifs && p.isSystem))
      .slice(0, 5)
    if (delivered.length === 0) return
    for (const p of delivered) {
      if (cfg.notifs && p.isSystem) showSystemNotice(p.text)
      notify(p.text)
    }
    markNoticesSent(delivered.map((p) => p.key))
  }, [cfg.notifs, cfg.toasts, countdowns, anniversaries, items, works, reminders, tasks, notify])

  const search = useCallback(
    (text: string): SearchResult[] => {
      const q = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
      const matches = (s?: string) =>
        !!s &&
        s
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .includes(q)
      const out: SearchResult[] = []
      const add = (id: string, title: string, kind: string, page: Destination) => {
        if (page === 'banco' && !cfg.bankEnabled) return
        out.push({ id, title, kind, page })
      }

      for (const task of tasks)
        if (matches(task.title)) add(task.id, task.title, t('Tarea'), 'tareas')
      for (const w of works)
        if (matches(w.title))
          add(w.id, w.title, w.kind === 'examen' ? t('Examen') : t('Proyecto'), 'examenes')
      for (const e of events)
        if (matches(e.title)) add(e.id, e.title, t('Actividad del calendario'), 'calendario')
      for (const a of anniversaries)
        if (matches(a.name)) add(a.id, a.name, t('Aniversario'), 'calendario')
      for (const w of wishes) if (matches(w.title)) add(w.id, w.title, t('Deseo'), 'deseos')
      for (const x of subs) if (matches(x.title)) add(x.id, x.title, t('Suscripción'), 'suscripciones')
      for (const n of notepads) if (matches(n.title)) add(n.id, n.title, t('Bloc de notas'), 'bloc')
      for (const g of grades) if (matches(g.desc)) add(g.id, g.desc ?? '', t('Nota'), 'notas')
      for (const b of blocks) if (matches(b.title)) add(b.id, b.title, t('Bloque del horario'), 'horario')
      for (const c of countdowns)
        if (matches(c.title)) add(c.id, c.title, t('Cuenta atrás'), 'cuentas')
      for (const r of reminders)
        if (matches(r.title)) add(r.id, r.title, t('Recordatorio'), 'recordatorios')
      for (const g of goals)
        if (matches(g.title))
          add(
            g.id,
            g.title,
            g.kind === 'meta' ? t('Meta de ahorro') : g.kind === 'limite' ? t('Límite de gasto') : t('Idea'),
            'banco',
          )
      for (const p of profiles) if (matches(p.name)) add(p.id, p.name, t('Perfil de horario'), 'horario')
      for (const a of cfg.subjects) if (matches(a.name)) add(a.id, a.name, t('Asignatura'), 'ajustes')

      for (const c of [...new Set([...EXPENSE_CATS, SUBSCRIPTION_CAT])])
        if (matches(c)) add(`gasto-${c}`, t(c), t('Categoría de gasto'), 'banco')
      for (const c of INCOME_CATS)
        if (matches(c)) add(`ingreso-${c}`, t(c), t('Categoría de ingreso'), 'banco')

      const seen = new Set<string>()
      for (const m of movements) {
        const label = `${t(m.category)} · ${m.amount.toFixed(2)} €`
        if (matches(m.category) && !seen.has(m.id)) {
          seen.add(m.id)
          add(m.id, label, m.kind === 'gasto' ? t('Gasto') : t('Ingreso'), 'banco')
        }
      }

      for (const o of SETTING_LABELS) if (matches(o)) add(`op-${o}`, t(o), t('Ajustes'), 'ajustes')

      return out.slice(0, 12)
    },
    [
      tasks,
      works,
      events,
      anniversaries,
      wishes,
      subs,
      notepads,
      grades,
      blocks,
      countdowns,
      reminders,
      goals,
      profiles,
      movements,
      cfg.subjects,
      cfg.bankEnabled,
    ],
  )

  useEffect(() => {
    if (!cfg.shortcutsOn) return
    let previous = ''
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      const pressedKey = keyOf(e)
      const combo = previous === 'g' ? `g ${pressedKey}` : pressedKey
      previous = pressedKey === 'g' ? 'g' : ''

      const shortcut = SHORTCUTS.find(
        (a) => (cfg.customKeys[a.id] ?? a.key) === combo && cfg.enabledShortcuts[a.id] !== false,
      )
      if (!shortcut) return
      e.preventDefault()
      const a = shortcut.action
      if (a.kind === 'ir') irA(a.page)
      else if (a.kind === 'atras') back()
      else if (a.kind === 'adelante') forward()
      else if (a.kind === 'ajustes') setSettingsOpen(true)
      else if (a.kind === 'tema') setTheme(theme === 'dark' ? 'light' : 'dark')
      else if (a.kind === 'nota') setFloatingNote((v) => !v)
      else if (a.kind === 'buscar') document.getElementById('nivra-buscador')?.focus()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [cfg.shortcutsOn, cfg.enabledShortcuts, cfg.customKeys, irA, back, forward, theme, setTheme])

  if (!setupDone) {
    return (
      <>
        {cfg.intro && !introDone && <Intro onDone={() => setIntroDone(true)} />}
        <SetupScreen
          delay={cfg.intro ? 2.25 : 0}
          onDone={() => {
            localStorage.setItem(SETUP_KEY, '1')
            setSetupDone(true)
          }}
        />
      </>
    )
  }

  const currentGroup = GROUPS.find((g) => g.pages.some((p) => p.id === page))
  const currentPage = PAGES.find((p) => p.id === page)

  return (
    <>
      {cfg.intro && !introDone && <Intro onDone={() => setIntroDone(true)} />}

      <div className="flex h-svh overflow-hidden text-neutral-800 dark:text-neutral-200">
        <aside
          className={`nivra-scroll fixed inset-y-0 left-0 hidden w-60 flex-col overflow-y-auto overscroll-contain border-r px-3 py-4 md:flex ${line}`}
        >
          <span className="font-display mb-7 px-3 text-2xl font-semibold tracking-tight">Nivra</span>

          <Navigation
            page={page}
            irA={irA}
            bankTab={bankTab}
            setBankTab={setBankTab}
            bankInitial={bankInitial}
            bankEnabled={cfg.bankEnabled}
          />
        </aside>

        <div className="flex h-full min-w-0 flex-1 flex-col md:ml-60">
          <header
            className={`flex shrink-0 items-center justify-between gap-2 border-b px-3 py-3 sm:gap-4 sm:px-8 ${line}`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label={t('Menú')}
                className={`${headerButton} md:hidden`}
              >
                <Icon name="menu" className="h-[18px] w-[18px]" />
              </button>
              {cfg.navButtons && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={back}
                    disabled={index === 0}
                    aria-label={t('Atrás')}
                    className={headerButton}
                  >
                    <Icon name="back" className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={forward}
                    disabled={index >= pageHistory.length - 1}
                    aria-label={t('Adelante')}
                    className={headerButton}
                  >
                    <Icon name="forward" className="h-[18px] w-[18px]" />
                  </button>
                </div>
              )}
              <span className="font-display truncate text-lg font-semibold tracking-tight md:hidden">
                Nivra
              </span>
              <p className="hidden min-w-0 items-center gap-2 text-sm md:flex">
                <span className="text-neutral-400 dark:text-neutral-500">{currentGroup && t(currentGroup.title)}</span>
                <Icon name="right" className="h-3 w-3 shrink-0 text-neutral-300 dark:text-neutral-600" />
                <span className="truncate font-medium">{currentPage && t(currentPage.label)}</span>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {cfg.searchOn && (
                <Search
                  search={search}
                  onIr={(destino) =>
                    destino === 'ajustes' ? setSettingsOpen(true) : irA(destino as PageId)
                  }
                />
              )}
              {cfg.clockOn && <Clock hour12={cfg.hour12} />}
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={theme === 'dark' ? t('Tema claro') : t('Tema oscuro')}
                className={headerButton}
              >
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label={t('Ajustes')}
                className={headerButton}
              >
                <Icon name="settings" className="h-[18px] w-[18px]" />
              </button>
            </div>
          </header>

          <main
            key={cfg.animations ? page : 'fijo'}
            className={`nivra-scroll flex-1 overflow-y-auto overscroll-contain px-5 pt-7 pb-10 sm:px-8 sm:pt-8 md:pb-12 ${
              cfg.animations ? 'animate-[fade-in_0.35s_ease-out]' : ''
            } ${page === 'dashboard' ? 'lg:overflow-hidden' : ''} ${
              page === 'bloc' ? 'overflow-hidden' : ''
            }`}
          >
            {page === 'dashboard' && (
              <Dashboard
                items={items}
                tasks={tasks}
                blocks={blocks}
                works={works}
                balance={balance}
                bankEnabled={cfg.bankEnabled}
                countdowns={mainCountdown ? [mainCountdown] : []}
                setCountdowns={setCountdowns}
                remindersHoy={remindersHoy}
                streak={streak}
                setStreak={setStreak}
                profile={profile}
                onGo={irA}
              />
            )}
            {page === 'calendario' && (
              <Calendar
                items={items}
                setEvents={setEvents}
                freeDays={freeDays}
                setFreeDays={setFreeDays}
                specialDays={specialDays}
                setSpecialDays={setSpecialDays}
                autoSpecial={allSpecialDays}
                subDays={subscriptionDays}
                anniversaries={anniversaries}
                setAnniversaries={setAnniversaries}
              />
            )}
            {page === 'horario' && (
              <Schedule
                blocks={blocks}
                setBlocks={setBlocks}
                profiles={profiles}
                setProfiles={setProfiles}
                active={profile}
                setActive={setProfile}
              />
            )}
            {page === 'bloc' && <Notepads notepads={notepads} setNotepads={setNotepads} />}
            {page === 'tareas' && (
              <Tasks
                tasks={tasks}
                setTasks={setTasks}
                subjects={cfg.subjects}
                notepads={notepads}
                setNotepads={setNotepads}
              />
            )}
            {page === 'examenes' && (
              <Exams
                works={works}
                setWorks={setWorks}
                subjects={cfg.subjects}
                notepads={notepads}
                setNotepads={setNotepads}
                grades={grades}
              />
            )}
            {page === 'notas' && (
              <Grades grades={grades} setGrades={setGrades} subjects={cfg.subjects} works={works} />
            )}
            {page === 'deseos' && <Wishlist wishes={wishes} setWishes={setWishes} />}
            {page === 'suscripciones' && <Subscriptions subs={subs} setSubs={setSubs} />}
            {page === 'banco' && cfg.bankEnabled && (
              <Bank
                initial={bankInitial}
                setInitial={setBankInitial}
                movements={movements}
                setMovements={setMovements}
                tab={bankTab}
                setTab={setBankTab}
                goals={goals}
                setGoals={setGoals}
              />
            )}
            {page === 'cuentas' && (
              <div className="mx-auto w-full max-w-4xl">
                <Countdowns countdowns={countdowns} setCountdowns={setCountdowns} />
              </div>
            )}
            {page === 'recordatorios' && (
              <Reminders reminders={reminders} setReminders={setReminders} works={works} />
            )}
          </main>
        </div>

        {menuOpen && (
          <div className="fixed inset-0 z-30 md:hidden">
            <button
              type="button"
              aria-label={t('Cerrar menú')}
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <div
              className={`nivra-scroll animate-[fade-in_0.2s_ease-out] absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r bg-[var(--paper)] px-3 py-4 ${line}`}
            >
              <div className="mb-6 flex items-center justify-between px-3">
                <span className="font-display text-2xl font-semibold tracking-tight">Nivra</span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label={t('Cerrar')}
                  className="text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>
              <Navigation
                page={page}
                irA={irA}
                bankTab={bankTab}
                setBankTab={(t) => {
                  setBankTab(t)
                  setMenuOpen(false)
                }}
                bankInitial={bankInitial}
                bankEnabled={cfg.bankEnabled}
              />
            </div>
          </div>
        )}

        {floatingNote && (
          <FloatingNote
            notepads={notepads}
            setNotepads={setNotepads}
            onClose={() => setFloatingNote(false)}
          />
        )}

        {isBirthday && <Confetti />}
        {cfg.toasts && (
          <Toasts toasts={toasts} onClose={(id) => setToasts((prev) => prev.filter((a) => a.id !== id))} />
        )}

        {settingsOpen && (
          <Settings
            cfg={cfg}
            sync={sync}
            setSync={setSync}
            installPrompt={installPrompt}
            onInstalled={() => setInstallPrompt(null)}
            onClose={() => setSettingsOpen(false)}
            onNotify={notify}
            items={items}
            anniversaries={anniversaries}
            blocks={blocks}
          />
        )}
      </div>
    </>
  )
}

function Navigation({
  page,
  irA,
  bankTab,
  setBankTab,
  bankInitial,
  bankEnabled,
}: {
  page: PageId
  irA: (p: PageId) => void
  bankTab: BankTab
  setBankTab: (t: BankTab) => void
  bankInitial: number | null
  bankEnabled: boolean
}) {
  const navItem = (activo: boolean) =>
    `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
      activo
        ? 'bg-black/[0.06] font-medium text-neutral-900 dark:bg-white/[0.10] dark:text-white'
        : 'text-neutral-500 hover:bg-black/[0.03] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white'
    }`

  return (
          <nav className="flex flex-col gap-6 pb-4">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <p className="mb-2 px-3 text-[0.65rem] font-medium tracking-[0.14em] text-neutral-400 uppercase dark:text-neutral-500">
                  {t(g.title)}
                </p>
                <div className="flex flex-col gap-0.5">
                  {g.pages
                    .filter((p) => p.id !== 'banco' || bankEnabled)
                    .map((p) => (
                    <div key={p.id}>
                      <button type="button" onClick={() => irA(p.id)} className={navItem(page === p.id)}>
                        <Icon name={p.icon} className="h-[17px] w-[17px] shrink-0" />
                        <span className="min-w-0 truncate">{t(p.label)}</span>
                      </button>

                      {p.id === 'banco' && page === 'banco' && bankInitial !== null && (
                        <div className={`mt-1 ml-6 flex flex-col gap-0.5 border-l pl-3 ${line}`}>
                          {BANK_TABS.map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setBankTab(tab.id)}
                              className={`rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                                bankTab === tab.id
                                  ? 'font-medium text-neutral-900 dark:text-white'
                                  : 'text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white'
                              }`}
                            >
                              {t(tab.label)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </nav>
  )
}

export default App
