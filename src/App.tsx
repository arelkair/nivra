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
import { InitiativeIntro } from './components/InitiativeIntro'
import { InitiativeDashboard } from './components/InitiativeDashboard'
import { Search, type Destination, type SearchResult } from './components/Search'
import { Lab } from './pages/Lab'
import { Settings } from './components/Settings'
import { snapshotNow } from './lib/autoBackup'
import { realVolume } from './lib/volume'
import { DashboardEditor } from './components/DashboardEditor'
import { FloatingNote } from './components/FloatingNote'
import { Countdowns } from './components/Countdowns'
import { Clock, Confetti, Icon, Toasts, line, type Toast } from './components/ui'
import { useSettings } from './lib/settings'
import { showSystemNotice, markNoticesSent, pendingNotices } from './lib/notify'
import { SHORTCUTS, isTyping, keyOf } from './lib/shortcuts'
import { useSync } from './lib/useSync'
import { shouldReturnToSync } from './lib/supabase'
import { registerNotifier } from './lib/undo'
import { playTick, startAmbient, stopAmbient, setAmbientVolume as applyAmbientVolume } from './lib/sound'
import { SHAPES, SHAPE_SIZE, GRADIENTS, loadBackgroundImage, onBackgroundImageChange } from './lib/background'
import { parseMusicUrl, sendYoutubeCommand } from './lib/media'
import { attachYoutubePlayer, type YTPlayer } from './lib/youtubePlayer'
import { AMBIENT_VIDEOS, ambientEmbedUrl, type AmbientVideoPreset } from './lib/ambientVideos'
import {
  EXPENSE_CATS,
  INCOME_CATS,
  SUBSCRIPTION_CAT,
  allSubjects,
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
  type BankAccount,
  accountBalances,
  accountOf,
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
const INITIATIVE_PENDING_KEY = 'nivra-initiative-pending'
const INITIATIVE_SEEN_KEY = 'nivra-initiative-intro-seen'
const SKIP_INTRO_KEY = 'nivra-skip-intro'

const initiativeSeen = () => localStorage.getItem(INITIATIVE_SEEN_KEY) === '1' || localStorage.getItem('nivra-initiative-use-data') !== null

const switchEnvironment = (initiative: boolean) => {
  localStorage.setItem('nivra-initiative', String(initiative))
  if (initiative && !initiativeSeen()) sessionStorage.setItem(INITIATIVE_PENDING_KEY, '1')
  sessionStorage.setItem(SKIP_INTRO_KEY, '1')
  location.reload()
}

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
  {
    title: 'Nivra Lab',
    pages: [{ id: 'lab', label: 'Laboratorio', short: 'Lab', icon: 'lab' }],
  },
]

const PAGES = GROUPS.flatMap((g) => g.pages)

const pageAvailable = (id: PageId, flags: { bankEnabled: boolean; labEnabled: boolean }) =>
  (id !== 'banco' || flags.bankEnabled) && (id !== 'lab' || flags.labEnabled)

const PAGE_SLUG: Record<PageId, string> = {
  dashboard: 'dashboard',
  calendario: 'calendar',
  horario: 'schedule',
  tareas: 'tasks',
  examenes: 'exams',
  notas: 'grades',
  bloc: 'notes',
  banco: 'money',
  deseos: 'wishlist',
  suscripciones: 'subscriptions',
  cuentas: 'countdowns',
  recordatorios: 'reminders',
  lab: 'lab',
}

const SLUG_TO_PAGE: Record<string, PageId> = Object.fromEntries(
  (Object.entries(PAGE_SLUG) as [PageId, string][]).map(([id, slug]) => [slug, id]),
)

const pagePath = (id: PageId) => `/${PAGE_SLUG[id]}`

const pageFromPath = (): PageId => {
  const slug = location.pathname.slice(1).split('/')[0]
  return SLUG_TO_PAGE[slug] ?? 'dashboard'
}

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

const isAmbientVideoPreset = (p: string): p is AmbientVideoPreset => p in AMBIENT_VIDEOS

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const headerButton =
  'grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/[0.07] text-neutral-500 transition-colors hover:bg-black/[0.03] hover:text-neutral-900 disabled:opacity-30 disabled:hover:bg-transparent dark:border-white/[0.08] dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white'

function App() {
  const [setupDone, setSetupDone] = useState(() => localStorage.getItem(SETUP_KEY) === '1')
  const [introDone, setIntroDone] = useState(
    () => sessionStorage.getItem(INITIATIVE_PENDING_KEY) === '1' || sessionStorage.getItem(SKIP_INTRO_KEY) === '1',
  )
  const [initiativeIntro, setInitiativeIntro] = useState(
    () => sessionStorage.getItem(INITIATIVE_PENDING_KEY) === '1' && !initiativeSeen(),
  )
  useEffect(() => {
    sessionStorage.removeItem(INITIATIVE_PENDING_KEY)
    sessionStorage.removeItem(SKIP_INTRO_KEY)
  }, [])
  useEffect(() => {
    const id = setTimeout(() => void snapshotNow().catch(() => undefined), 4000)
    return () => clearTimeout(id)
  }, [])
  const [dashboardEditorOpen, setDashboardEditorOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [floatingNote, setFloatingNote] = useState(false)
  const [bankTab, setBankTab] = useState<BankTab>('dinero')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [sync, setSync] = useSync()
  const cfg = useSettings()
  const [settingsOpen, setSettingsOpen] = useState(() => shouldReturnToSync() && !cfg.initiativeEnabled)

  const [pageHistory, setPageHistory] = useState<PageId[]>(() => [pageFromPath()])
  const [index, setIndex] = useState(0)
  const page = pageHistory[index]

  const historyLength = useRef(1)
  historyLength.current = pageHistory.length
  const indexRef = useRef(0)
  indexRef.current = index

  useEffect(() => {
    if (cfg.initiativeEnabled) return
    history.replaceState({ nivra: 0 }, '', pagePath(pageHistory[0]))
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('initiative-mode', cfg.initiativeEnabled)
  }, [cfg.initiativeEnabled])

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const i = (e.state as { nivra?: number } | null)?.nivra
      if (typeof i === 'number') {
        setIndex(Math.min(Math.max(i, 0), historyLength.current - 1))
        return
      }
      const destino = pageFromPath()
      setPageHistory((prev) => [...prev.slice(0, indexRef.current + 1), destino])
      setIndex(indexRef.current + 1)
    }
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  const navFlags = useMemo(
    () => ({ bankEnabled: cfg.bankEnabled, labEnabled: cfg.labEnabled }),
    [cfg.bankEnabled, cfg.labEnabled],
  )

  const irA = useCallback(
    (destino: PageId) => {
      if (!pageAvailable(destino, navFlags)) return
      setMenuOpen(false)
      if (pageHistory[index] === destino) return
      if (destino === 'banco') setBankTab('dinero')
      const next = index + 1
      setPageHistory((prev) => [...prev.slice(0, index + 1), destino])
      setIndex(next)
      history.pushState({ nivra: next }, '', pagePath(destino))
    },
    [index, pageHistory, navFlags],
  )
  const back = useCallback(() => history.back(), [])
  const forward = useCallback(() => history.forward(), [])

  useEffect(() => {
    if (!cfg.initiativeEnabled && !pageAvailable(page, navFlags)) irA('dashboard')
  }, [page, navFlags, irA, cfg.initiativeEnabled])

  const notify = useCallback(
    (text: string, undo?: () => void) => {
      if (!cfg.toasts) return
      playTick()
      const id = crypto.randomUUID()
      const durationMs = undo ? 8000 : 6000
      setToasts((prev) => [...prev, { id, text, undo, durationMs }])
      setTimeout(() => setToasts((prev) => prev.filter((a) => a.id !== id)), durationMs)
    },
    [cfg.toasts],
  )

  useEffect(() => registerNotifier(notify), [notify])

  const ambientVideoId = isAmbientVideoPreset(cfg.ambientPreset) ? AMBIENT_VIDEOS[cfg.ambientPreset] : null

  useEffect(() => {
    if (!cfg.ambientOn || cfg.ambientPreset !== 'estatico') {
      stopAmbient()
      return
    }
    startAmbient(realVolume(cfg.ambientVolume) / 100)
    return () => stopAmbient()
  }, [cfg.ambientOn, cfg.ambientPreset])

  useEffect(() => {
    if (cfg.ambientOn && cfg.ambientPreset === 'estatico') applyAmbientVolume(realVolume(cfg.ambientVolume) / 100)
  }, [cfg.ambientOn, cfg.ambientPreset, cfg.ambientVolume])

  const ambientIframe = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    if (cfg.ambientOn && ambientVideoId) sendYoutubeCommand(ambientIframe.current, 'setVolume', [realVolume(cfg.ambientVolume)])
  }, [cfg.ambientOn, ambientVideoId, cfg.ambientVolume])

  const [musicPlayerOpen, setMusicPlayerOpen] = useState(true)
  const [musicMinimized, setMusicMinimized] = useState(false)
  useEffect(() => setMusicPlayerOpen(true), [cfg.customSoundUrl])
  const musicEmbed =
    cfg.ambientOn && cfg.ambientPreset === 'enlace' ? parseMusicUrl(cfg.customSoundUrl) : null
  const [embedConsent, setEmbedConsent] = useStored('nivra-embed-consent', false)
  const ytPlayerRef = useRef<YTPlayer | null>(null)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicTime, setMusicTime] = useState(0)
  const [musicDuration, setMusicDuration] = useState(0)

  useEffect(() => {
    ytPlayerRef.current = null
    setMusicPlaying(false)
    setMusicTime(0)
    setMusicDuration(0)
    if (musicEmbed?.provider !== 'youtube' || !embedConsent || cfg.initiativeEnabled) return
    let cancelled = false
    attachYoutubePlayer('nivra-music-player').then((player) => {
      if (cancelled) return
      ytPlayerRef.current = player
      player.setVolume(realVolume(cfg.ambientVolume))
    })
    return () => {
      cancelled = true
    }
  }, [musicEmbed?.url, embedConsent, cfg.initiativeEnabled])

  useEffect(() => {
    if (musicEmbed?.provider !== 'youtube' || cfg.initiativeEnabled) return
    const id = setInterval(() => {
      const player = ytPlayerRef.current
      if (!player) return
      setMusicPlaying(player.getPlayerState() === 1)
      setMusicTime(player.getCurrentTime() || 0)
      setMusicDuration(player.getDuration() || 0)
    }, 500)
    return () => clearInterval(id)
  }, [musicEmbed?.provider, cfg.initiativeEnabled])

  useEffect(() => {
    ytPlayerRef.current?.setVolume(realVolume(cfg.ambientVolume))
  }, [cfg.ambientVolume])

  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  useEffect(() => {
    if (cfg.backgroundMode !== 'imagen') {
      setBackgroundUrl(null)
      return
    }
    let url: string | null = null
    const load = () => {
      loadBackgroundImage().then((blob) => {
        if (url) URL.revokeObjectURL(url)
        url = blob ? URL.createObjectURL(blob) : null
        setBackgroundUrl(url)
      })
    }
    load()
    const off = onBackgroundImageChange(load)
    return () => {
      off()
      if (url) URL.revokeObjectURL(url)
    }
  }, [cfg.backgroundMode])

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
  useEffect(() => {
    if (cfg.themePack === 'ninguno') delete document.documentElement.dataset.themePack
    else document.documentElement.dataset.themePack = cfg.themePack
  }, [cfg.themePack])
  useEffect(() => {
    document.documentElement.style.setProperty('--menu-opacity', `${cfg.menuOpacity}%`)
    document.documentElement.style.setProperty('--menu-blur', `${(cfg.menuBlur / 100) * 24}px`)
  }, [cfg.menuOpacity, cfg.menuBlur])

  const [events, setEvents] = useStored<NivraEvent[]>('nivra-events', [])
  const [tasks, setTasks] = useStored<Task[]>('nivra-tasks', [])
  const [blocks, setBlocks] = useStored<Block[]>('nivra-blocks', [])
  const [works, setWorks] = useStored<Work[]>('nivra-works', [])
  const [freeDays, setFreeDays] = useStored<string[]>('nivra-free-days', [])
  const [specialDays, setSpecialDays] = useStored<string[]>('nivra-special-days', [])
  const [anniversaries, setAnniversaries] = useStored<Anniversary[]>('nivra-anniversaries', [])
  const [bankInitial, setBankInitial] = useStored<number | null>('nivra-bank-initial', null)
  const [movements, setMovements] = useStored<Movement[]>('nivra-movements', [])
  const [accounts, setAccounts] = useStored<BankAccount[]>('nivra-bank-accounts', [])
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
  const subjects = useMemo(() => allSubjects(blocks, cfg.subjects), [blocks, cfg.subjects])
  const balances = useMemo(() => (bankInitial === null ? null : accountBalances(bankInitial, accounts, movements)), [bankInitial, accounts, movements])
  const balance = balances === null ? null : Object.values(balances).reduce((a, x) => a + x, 0)

  const isBirthday =
    cfg.birthday !== '' && monthDay(cfg.birthday) === monthDay(dateKey(new Date()))

  const [carouselIndex, setCarouselIndex] = useState(0)
  useEffect(() => {
    if (!cfg.carouselEnabled || countdowns.length <= 1) return
    const id = setInterval(
      () => setCarouselIndex((i) => (i + 1) % countdowns.length),
      Math.max(2, cfg.carouselSeconds) * 1000,
    )
    return () => clearInterval(id)
  }, [cfg.carouselEnabled, cfg.carouselSeconds, countdowns.length])

  const mainCountdown =
    cfg.carouselEnabled && countdowns.length > 0
      ? countdowns[carouselIndex % countdowns.length]
      : countdowns[0]
  const allSpecialDays = useMemo(
    () => [...specialDays, ...countdowns.map((c) => c.target.slice(0, 10))],
    [specialDays, countdowns],
  )
  const subscriptionDays = useMemo(() => subs.filter((s) => !s.paused).map((s) => s.day), [subs])
  const todayKey = dateKey(new Date())
  const remindersHoy = useMemo(
    () => reminders.filter((r) => r.date === todayKey),
    [reminders, todayKey],
  )

  useEffect(() => {
    const dueCharges = duePayments(
      subs.filter((x) => !x.paused),
      new Date(),
    ).sort((a, b) => a.date.localeCompare(b.date))
    if (dueCharges.length === 0) return
    const running: Record<string, number> | null = balances === null ? null : Object.fromEntries(Object.entries(balances).map(([k, v]) => [k, Math.round(v * 100)]))
    const charged: typeof dueCharges = []
    let skipped = 0
    for (const due of dueCharges) {
      if (due.sub.paidBy === 'other') continue
      const cents = Math.round(due.sub.price * 100)
      const key = accountOf(due.sub, accounts)
      if (running !== null && running[key] - cents < 0) {
        skipped++
        continue
      }
      if (running !== null) running[key] -= cents
      charged.push(due)
    }
    setMovements((prev) => [
      ...charged
        .filter(({ sub, date }) => !prev.some((m) => m.id === `sub-${sub.id}-${date}`))
        .map(({ sub, date }) => ({
        id: `sub-${sub.id}-${date}`,
        kind: 'gasto' as const,
        amount: sub.price,
        category: SUBSCRIPTION_CAT,
        date,
        account: sub.account && accounts.some((x) => x.id === sub.account) ? sub.account : undefined,
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
    if (charged.length > 0) notify(tp('Se han cobrado {0} suscripción/es.', charged.length))
    if (skipped > 0) notify(tp('Saldo insuficiente: {0} cobro/s de suscripción no se han aplicado.', skipped))
  }, [subs, balances, accounts, setMovements, setSubs, notify])

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
      for (const a of subjects) if (matches(a.name)) add(a.id, a.name, t('Asignatura'), 'ajustes')

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
      subjects,
      cfg.bankEnabled,
    ],
  )

  useEffect(() => {
    if (!cfg.shortcutsOn || cfg.initiativeEnabled) return
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
  }, [cfg.shortcutsOn, cfg.initiativeEnabled, cfg.enabledShortcuts, cfg.customKeys, irA, back, forward, theme, setTheme])

  if (!setupDone) {
    return (
      <>
        {cfg.intro && !introDone && <Intro onDone={() => setIntroDone(true)} />}
        <SetupScreen
          delay={cfg.intro ? 2.25 : 0}
          onDone={(name) => {
            cfg.setUserName(name)
            localStorage.setItem(SETUP_KEY, '1')
            setSetupDone(true)
          }}
        />
      </>
    )
  }

  const currentGroup = GROUPS.find((g) => g.pages.some((p) => p.id === page))
  const currentPage = PAGES.find((p) => p.id === page)

  const showMiniPlayer = embedConsent && musicEmbed?.provider === 'youtube' && musicMinimized

  return (
    <>
      {cfg.intro && !introDone && <Intro onDone={() => setIntroDone(true)} />}
      {initiativeIntro && (
        <InitiativeIntro
          onDone={(useExisting) => {
            localStorage.setItem('nivra-initiative-use-data', String(useExisting))
            localStorage.setItem(INITIATIVE_SEEN_KEY, '1')
            setInitiativeIntro(false)
          }}
        />
      )}

      {cfg.themePack !== 'ninguno' && (
        <div
          aria-hidden
          className={`pointer-events-none fixed inset-0 z-0 nivra-theme-bg-${cfg.themePack}`}
        />
      )}
      {cfg.themePack === 'ninguno' && cfg.backgroundMode === 'forma' &&
        (() => {
          const shape = SHAPES.find((s) => s.id === cfg.backgroundShape)
          if (!shape || shape.id === 'ninguno') return null
          return (
            <div
              aria-hidden
              className="pointer-events-none fixed inset-0 z-0 text-neutral-500 opacity-[0.16] dark:text-neutral-500 dark:opacity-[0.14]"
              style={{ backgroundImage: shape.css, backgroundSize: SHAPE_SIZE[shape.id] ?? 'auto' }}
            />
          )
        })()}
      {cfg.themePack === 'ninguno' && cfg.backgroundMode === 'imagen' && backgroundUrl && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${backgroundUrl})` }}
        />
      )}
      {cfg.themePack === 'ninguno' && cfg.backgroundMode === 'degradado' && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 opacity-20"
          style={{ background: GRADIENTS.find((g) => g.id === cfg.backgroundGradient)?.css }}
        />
      )}
      {cfg.themePack === 'ninguno' &&
        cfg.backgroundMode === 'video' &&
        musicEmbed?.provider === 'youtube' &&
        embedConsent && (
          <iframe
            id="nivra-music-player"
            key={musicEmbed.url}
            src={musicEmbed.url}
            title={t('Fondo de vídeo')}
            aria-hidden
            referrerPolicy="strict-origin-when-cross-origin"
            className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-70"
            allow="autoplay; encrypted-media"
            loading="lazy"
          />
        )}

      {cfg.initiativeEnabled && (
        <InitiativeDashboard
          tasks={tasks}
          items={items}
          countdowns={countdowns}
          setCountdowns={setCountdowns}
          userName={cfg.userName}
          works={works}
          reminders={reminders}
          setReminders={setReminders}
          streak={streak}
          setStreak={setStreak}
          grades={grades}
          setGrades={setGrades}
          bankEnabled={cfg.bankEnabled}
          bankInitial={bankInitial}
          setBankInitial={setBankInitial}
          movements={movements}
          setMovements={setMovements}
          accounts={accounts}
          setAccounts={setAccounts}
          subs={subs}
          setSubs={setSubs}
          wishes={wishes}
          setWishes={setWishes}
          goals={goals}
          setGoals={setGoals}
          blocks={blocks}
          setBlocks={setBlocks}
          profiles={profiles}
          setProfiles={setProfiles}
          activeProfile={profile}
          setActiveProfile={setProfile}
          setWorks={setWorks}
          subjects={subjects}
          manualSubjects={cfg.subjects}
          cfg={cfg}
          music={{
            embed: musicEmbed,
            ambientVideoId,
            consent: embedConsent,
            setConsent: setEmbedConsent,
            ambientIframe,
          }}
          setTasks={setTasks}
          setEvents={setEvents}
          notepads={notepads}
          freeDays={freeDays}
          setFreeDays={setFreeDays}
          specialDays={specialDays}
          setSpecialDays={setSpecialDays}
          autoSpecial={allSpecialDays}
          subDays={subscriptionDays}
          anniversaries={anniversaries}
          setAnniversaries={setAnniversaries}
          sync={sync}
          setSync={setSync}
          onDisable={() => switchEnvironment(false)}
        />
      )}

      {!cfg.initiativeEnabled && (
      <div className="relative z-10 flex h-svh overflow-hidden text-neutral-800 dark:text-neutral-200">
        {cfg.themeStyle !== 'barra' && (
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
              flags={navFlags}
              themeStyle={cfg.themeStyle}
            />
          </aside>
        )}

        <div
          className={
            cfg.themeStyle === 'barra'
              ? 'flex h-full min-w-0 flex-1 flex-col pb-16'
              : 'flex h-full min-w-0 flex-1 flex-col md:ml-60'
          }
        >
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
                <Icon name="right" className="h-3 w-3 shrink-0 text-neutral-500 dark:text-neutral-500" />
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
                onClick={() => switchEnvironment(true)}
                aria-label={t('Cambiar a Initiative')}
                title={t('Cambiar a Initiative')}
                className={headerButton}
              >
                <Icon name="classic" className="h-[18px] w-[18px]" />
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
                slots={cfg.dashboardSlots}
              />
            )}
            {page === 'calendario' && (
              <Calendar
                items={items}
                subjects={subjects}
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
                subjects={subjects}
                notepads={notepads}
                setNotepads={setNotepads}
              />
            )}
            {page === 'examenes' && (
              <Exams
                works={works}
                setWorks={setWorks}
                subjects={subjects}
                notepads={notepads}
                setNotepads={setNotepads}
                grades={grades}
                showCountdowns={cfg.examCountdowns}
              />
            )}
            {page === 'notas' && (
              <Grades grades={grades} setGrades={setGrades} subjects={subjects} works={works} />
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
            {page === 'lab' && cfg.labEnabled && <Lab subjects={subjects} />}
            {page === 'recordatorios' && (
              <Reminders reminders={reminders} setReminders={setReminders} works={works} />
            )}
          </main>
        </div>

        {cfg.themeStyle === 'barra' && (
          <BottomTaskbar page={page} irA={irA} flags={navFlags} />
        )}

        {menuOpen && (
          <div className="fixed inset-0 z-30 md:hidden">
            <button
              type="button"
              aria-label={t('Cerrar menú')}
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <div
              className={`nivra-menu nivra-scroll animate-[fade-in_0.2s_ease-out] absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r bg-[var(--paper)] px-3 py-4 ${line}`}
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
                flags={navFlags}
                themeStyle={cfg.themeStyle}
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

        {cfg.ambientOn && ambientVideoId && embedConsent && (
          <iframe
            ref={ambientIframe}
            key={ambientVideoId}
            src={ambientEmbedUrl(ambientVideoId)}
            title="ambient"
            aria-hidden
            referrerPolicy="strict-origin-when-cross-origin"
            className="fixed h-px w-px opacity-0"
            allow="autoplay"
            loading="lazy"
          />
        )}

        {cfg.ambientOn && ambientVideoId && !embedConsent && (
          <div className="fixed right-4 bottom-24 z-40 flex w-72 flex-col gap-2 rounded-2xl border bg-[var(--surface)] p-3 shadow-lg dark:border-white/10">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t(
                'Este sonido de ambiente se carga desde los servidores de YouTube y puede usar sus propias cookies.',
              )}
            </p>
            <button
              type="button"
              onClick={() => setEmbedConsent(true)}
              className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-neutral-900"
            >
              {t('Cargar sonido de ambiente')}
            </button>
          </div>
        )}

        {musicEmbed && musicPlayerOpen && cfg.backgroundMode !== 'video' && (
          <div className="fixed right-4 bottom-4 z-40 w-72 overflow-hidden rounded-2xl border bg-[var(--surface)] shadow-lg dark:border-white/10">
            {showMiniPlayer ? (
              <div className="flex flex-col gap-1.5 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[0.65rem] text-neutral-400 dark:text-neutral-500">
                    {t('Tu música')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMusicMinimized(false)}
                    aria-label={t('Maximizar')}
                    className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
                  >
                    <Icon name="up" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMusicPlayerOpen(false)}
                    aria-label={t('Cerrar')}
                    className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
                  >
                    <Icon name="close" className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const ratio = (e.clientX - rect.left) / rect.width
                    if (musicDuration > 0) ytPlayerRef.current?.seekTo(ratio * musicDuration, true)
                  }}
                  aria-label={t('Avanzar en el vídeo')}
                  className="group relative h-1.5 w-full rounded-full bg-black/[0.08] dark:bg-white/[0.12]"
                >
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-neutral-900 dark:bg-white"
                    style={{ width: `${musicDuration > 0 ? (musicTime / musicDuration) * 100 : 0}%` }}
                  />
                </button>
                <div className="flex items-center justify-between font-mono text-[0.6rem] text-neutral-400 dark:text-neutral-500">
                  <span>{formatTime(musicTime)}</span>
                  <span>{formatTime(musicDuration)}</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => ytPlayerRef.current?.previousVideo()}
                    aria-label={t('Anterior')}
                    className="shrink-0 text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-white"
                  >
                    <Icon name="left" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      musicPlaying ? ytPlayerRef.current?.pauseVideo() : ytPlayerRef.current?.playVideo()
                    }
                    aria-label={musicPlaying ? t('Pausar') : t('Reproducir')}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  >
                    <Icon name={musicPlaying ? 'pause' : 'play'} className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => ytPlayerRef.current?.nextVideo()}
                    aria-label={t('Siguiente')}
                    className="shrink-0 text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-white"
                  >
                    <Icon name="right" className="h-4 w-4" />
                  </button>
                  <Icon name="volume" className="ml-1 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={cfg.ambientVolume}
                    onChange={(e) => cfg.setAmbientVolume(Number(e.target.value))}
                    aria-label={t('Volumen')}
                    className="h-1 flex-1 accent-neutral-800 dark:accent-white"
                  />
                </div>
              </div>
            ) : (
              <div className={`flex items-center justify-between gap-1 px-3 py-1.5 ${line} border-b`}>
                <span className="min-w-0 flex-1 truncate text-[0.65rem] text-neutral-400 dark:text-neutral-500">
                  {t('Tu música')}
                </span>
                {embedConsent && musicEmbed.provider === 'youtube' && (
                  <button
                    type="button"
                    onClick={() => setMusicMinimized(true)}
                    aria-label={t('Minimizar')}
                    className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
                  >
                    <Icon name="down" className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMusicPlayerOpen(false)}
                  aria-label={t('Cerrar')}
                  className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {embedConsent ? (
              <div className={showMiniPlayer ? 'h-0 overflow-hidden' : ''}>
                <iframe
                  id="nivra-music-player"
                  key={musicEmbed.url}
                  src={musicEmbed.url}
                  title={musicEmbed.provider === 'spotify' ? 'Spotify' : 'YouTube'}
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="w-full border-0"
                  height={musicEmbed.provider === 'spotify' ? 152 : 160}
                  allow="autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2 px-3 pb-3">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t(
                    'Este reproductor se carga desde los servidores de Spotify o YouTube y puede usar sus propias cookies.',
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setEmbedConsent(true)}
                  className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-neutral-900"
                >
                  {t('Cargar reproductor')}
                </button>
              </div>
            )}
          </div>
        )}

      </div>
      )}

    {cfg.toasts && (
      <Toasts
        toasts={toasts}
        onClose={(id) => setToasts((prev) => prev.filter((a) => a.id !== id))}
        offsetBottom={
          !cfg.initiativeEnabled && musicEmbed && musicPlayerOpen && cfg.backgroundMode !== 'video'
            ? musicMinimized
              ? 160
              : 220
            : cfg.initiativeEnabled
              ? 72
              : 16
        }
      />
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
          onEditDashboard={() => {
            setSettingsOpen(false)
            setDashboardEditorOpen(true)
          }}
          onActivateInitiative={() => switchEnvironment(true)}
        />
      )}

      {dashboardEditorOpen && (
        <DashboardEditor
          slots={cfg.dashboardSlots}
          setSlots={cfg.setDashboardSlots}
          onClose={() => setDashboardEditorOpen(false)}
        />
      )}
    </>
  )
}

function Navigation({
  page,
  irA,
  bankTab,
  setBankTab,
  bankInitial,
  flags,
  themeStyle,
}: {
  page: PageId
  irA: (p: PageId) => void
  bankTab: BankTab
  setBankTab: (t: BankTab) => void
  bankInitial: number | null
  flags: { bankEnabled: boolean; labEnabled: boolean }
  themeStyle: 'clasico' | 'carpetas' | 'barra'
}) {
  const navItem = (activo: boolean) =>
    `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
      activo
        ? 'bg-black/[0.06] font-medium text-neutral-900 dark:bg-white/[0.10] dark:text-white'
        : 'text-neutral-500 hover:bg-black/[0.03] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white'
    }`

  const bankTabs = page === 'banco' && bankInitial !== null && (
    <div className={`flex flex-col gap-0.5 border-l pl-3 ${line}`}>
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
  )

  const visibleGroups = GROUPS.filter((g) => g.pages.some((p) => pageAvailable(p.id, flags)))

  if (themeStyle === 'carpetas') {
    return (
      <nav className="flex flex-col gap-5 pb-4">
        {visibleGroups.map((g) => (
          <div key={g.title}>
            <p className="mb-2 px-1 text-[0.65rem] font-medium tracking-[0.14em] text-neutral-400 uppercase dark:text-neutral-500">
              {t(g.title)}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {g.pages
                .filter((p) => pageAvailable(p.id, flags))
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => irA(p.id)}
                    className={`group flex flex-col items-center gap-1.5 ${p.id === 'lab' ? 'col-span-3' : ''}`}
                  >
                    <span className="relative">
                      <span
                        className={`absolute -top-1.5 left-2 h-2 w-6 rounded-t-md transition-colors ${
                          page === p.id ? 'bg-neutral-900 dark:bg-white' : 'bg-black/10 dark:bg-white/15'
                        }`}
                      />
                      <span
                        className={`flex h-12 items-center justify-center rounded-lg rounded-tl-none border transition-colors ${
                          p.id === 'lab' ? 'w-[11.5rem]' : 'w-14'
                        } ${
                          page === p.id
                            ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                            : `${line} text-neutral-500 group-hover:bg-black/[0.03] dark:text-neutral-400 dark:group-hover:bg-white/[0.05]`
                        }`}
                      >
                        <Icon name={p.icon} className="h-5 w-5" />
                      </span>
                    </span>
                    <span className="max-w-full truncate text-[0.65rem] text-neutral-600 dark:text-neutral-500">
                      {t(p.short)}
                    </span>
                  </button>
                ))}
            </div>
            {g.pages.some((p) => p.id === 'banco') && bankTabs && (
              <div className="mt-2 ml-1">{bankTabs}</div>
            )}
          </div>
        ))}
      </nav>
    )
  }

  return (
          <nav className="flex flex-col gap-6 pb-4">
            {visibleGroups.map((g) => (
              <div key={g.title}>
                <p className="mb-2 px-3 text-[0.65rem] font-medium tracking-[0.14em] text-neutral-400 uppercase dark:text-neutral-500">
                  {t(g.title)}
                </p>
                <div className="flex flex-col gap-0.5">
                  {g.pages
                    .filter((p) => pageAvailable(p.id, flags))
                    .map((p) => (
                    <div key={p.id}>
                      <button type="button" onClick={() => irA(p.id)} className={navItem(page === p.id)}>
                        <Icon name={p.icon} className="h-[17px] w-[17px] shrink-0" />
                        <span className="min-w-0 truncate">{t(p.label)}</span>
                      </button>

                      {p.id === 'banco' && page === 'banco' && bankTabs && (
                        <div className="mt-1 ml-6">{bankTabs}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </nav>
  )
}

function BottomTaskbar({
  page,
  irA,
  flags,
}: {
  page: PageId
  irA: (p: PageId) => void
  flags: { bankEnabled: boolean; labEnabled: boolean }
}) {
  return (
    <nav
      className={`nivra-menu nivra-scroll fixed inset-x-0 bottom-0 z-20 flex items-center justify-center gap-1 overflow-x-auto border-t bg-[var(--paper)] px-2 py-1.5 ${line}`}
    >
      {PAGES.filter((p) => pageAvailable(p.id, flags)).map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => irA(p.id)}
          aria-label={t(p.label)}
          aria-current={page === p.id}
          className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[0.6rem] transition-colors ${
            page === p.id
              ? 'bg-black/[0.06] font-medium text-neutral-900 dark:bg-white/[0.10] dark:text-white'
              : 'text-neutral-500 hover:bg-black/[0.03] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white'
          }`}
        >
          <Icon name={p.icon} className="h-[18px] w-[18px]" />
          {t(p.short)}
        </button>
      ))}
    </nav>
  )
}

export default App
