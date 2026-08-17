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
import { Search, type Destino, type Resultado } from './components/Search'
import { Settings } from './components/Settings'
import { FloatingNote } from './components/FloatingNote'
import { Countdowns } from './components/Countdowns'
import { Clock, Confetti, Icon, Toasts, line, type Aviso } from './components/ui'
import { useSettings } from './lib/settings'
import { lanzar, marcarEnviadas, pendientes } from './lib/notify'
import { ATAJOS, escribiendo, teclaDe } from './lib/shortcuts'
import { useSync } from './lib/useSync'
import { registrarAvisos } from './lib/undo'
import {
  EXPENSE_CATS,
  INCOME_CATS,
  SUBSCRIPTION_CAT,
  calendarItems,
  cobrosPendientes,
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

const OPCIONES = [
  'Animación de inicio',
  'Animaciones al cambiar de apartado',
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

const headerButton =
  'grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/[0.07] text-neutral-500 transition-colors hover:bg-black/[0.03] hover:text-neutral-900 disabled:opacity-30 disabled:hover:bg-transparent dark:border-white/[0.08] dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white'

function App() {
  const [setupDone, setSetupDone] = useState(() => localStorage.getItem(SETUP_KEY) === '1')
  const [introDone, setIntroDone] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [notaFlotante, setNotaFlotante] = useState(false)
  const [bankTab, setBankTab] = useState<BankTab>('dinero')
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [sync, setSync] = useSync()
  const cfg = useSettings()

  const [historial, setHistorial] = useState<PageId[]>(['dashboard'])
  const [indice, setIndice] = useState(0)
  const page = historial[indice]

  const irA = useCallback(
    (destino: PageId) => {
      setMenuAbierto(false)
      if (destino === 'banco' && historial[indice] !== 'banco') setBankTab('dinero')
      setHistorial((prev) => {
        if (prev[indice] === destino) return prev
        return [...prev.slice(0, indice + 1), destino]
      })
      setIndice((prev) => (historial[prev] === destino ? prev : prev + 1))
    },
    [indice, historial],
  )
  const atras = useCallback(() => setIndice((i) => Math.max(0, i - 1)), [])
  const adelante = useCallback(
    () => setIndice((i) => Math.min(historial.length - 1, i + 1)),
    [historial.length],
  )

  const avisar = useCallback(
    (texto: string, deshacer?: () => void) => {
      if (!cfg.toasts) return
      const id = crypto.randomUUID()
      setAvisos((prev) => [...prev, { id, texto, deshacer }])
      setTimeout(() => setAvisos((prev) => prev.filter((a) => a.id !== id)), deshacer ? 8000 : 6000)
    },
    [cfg.toasts],
  )

  useEffect(() => registrarAvisos(avisar), [avisar])

  const [instalador, setInstalador] = useState<Event | null>(null)
  useEffect(() => {
    const guardar = (e: Event) => {
      e.preventDefault()
      setInstalador(e)
    }
    addEventListener('beforeinstallprompt', guardar)
    addEventListener('appinstalled', () => setInstalador(null))
    return () => removeEventListener('beforeinstallprompt', guardar)
  }, [])

  const [theme, setTheme] = useStored<'light' | 'dark'>(
    'nivra-theme',
    matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  )
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
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

  const esCumple =
    cfg.birthday !== '' && monthDay(cfg.birthday) === monthDay(dateKey(new Date()))

  const general = countdowns[0]
  const diasEspeciales = useMemo(
    () => [...specialDays, ...countdowns.map((c) => c.target.slice(0, 10))],
    [specialDays, countdowns],
  )
  const diasSuscripcion = useMemo(() => subs.map((s) => s.day), [subs])
  const todayKey = dateKey(new Date())
  const remindersHoy = useMemo(
    () => reminders.filter((r) => r.date === todayKey),
    [reminders, todayKey],
  )

  useEffect(() => {
    const pendientesDeCobro = cobrosPendientes(subs, new Date())
    if (pendientesDeCobro.length === 0) return
    setMovements((prev) => [
      ...pendientesDeCobro
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
        const suyos = pendientesDeCobro.filter((p) => p.sub.id === s.id)
        if (suyos.length === 0) return s
        return { ...s, lastCharged: suyos.map((p) => p.date).sort().pop() }
      }),
    )
    avisar(`Se han cobrado ${pendientesDeCobro.length} suscripción/es.`)
  }, [subs, setMovements, setSubs, avisar])

  const notificadas = useRef(false)
  useEffect(() => {
    if (notificadas.current) return
    notificadas.current = true
    const lista = pendientes(new Date(), {
      countdowns,
      anniversaries,
      items,
      works,
      reminders,
      tasks,
    })
    // Sólo se marcan las que de verdad se enseñan, y de cinco en cinco para no
    // tapar la pantalla: el resto sale en la siguiente visita.
    const entregadas = lista
      .filter((p) => cfg.toasts || (cfg.notifs && p.sistema))
      .slice(0, 5)
    if (entregadas.length === 0) return
    for (const p of entregadas) {
      if (cfg.notifs && p.sistema) lanzar(p.texto)
      avisar(p.texto)
    }
    marcarEnviadas(entregadas.map((p) => p.clave))
  }, [cfg.notifs, cfg.toasts, countdowns, anniversaries, items, works, reminders, tasks, avisar])

  const buscar = useCallback(
    (texto: string): Resultado[] => {
      const q = texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
      const casa = (s?: string) =>
        !!s &&
        s
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .includes(q)
      const out: Resultado[] = []
      const add = (id: string, titulo: string, tipo: string, page: Destino) =>
        out.push({ id, titulo, tipo, page })

      for (const t of tasks) if (casa(t.title)) add(t.id, t.title, 'Tarea', 'tareas')
      for (const w of works)
        if (casa(w.title))
          add(w.id, w.title, w.kind === 'examen' ? 'Examen' : 'Proyecto', 'examenes')
      for (const e of events)
        if (casa(e.title)) add(e.id, e.title, 'Actividad del calendario', 'calendario')
      for (const a of anniversaries)
        if (casa(a.name)) add(a.id, a.name, 'Aniversario', 'calendario')
      for (const w of wishes) if (casa(w.title)) add(w.id, w.title, 'Deseo', 'deseos')
      for (const x of subs) if (casa(x.title)) add(x.id, x.title, 'Suscripción', 'suscripciones')
      for (const n of notepads) if (casa(n.title)) add(n.id, n.title, 'Bloc de notas', 'bloc')
      for (const g of grades) if (casa(g.desc)) add(g.id, g.desc ?? '', 'Nota', 'notas')
      for (const b of blocks) if (casa(b.title)) add(b.id, b.title, 'Bloque del horario', 'horario')
      for (const c of countdowns)
        if (casa(c.title)) add(c.id, c.title, 'Cuenta atrás', 'cuentas')
      for (const r of reminders)
        if (casa(r.title)) add(r.id, r.title, 'Recordatorio', 'recordatorios')
      for (const g of goals)
        if (casa(g.title))
          add(
            g.id,
            g.title,
            g.kind === 'meta' ? 'Meta de ahorro' : g.kind === 'limite' ? 'Límite de gasto' : 'Idea',
            'banco',
          )
      for (const p of profiles) if (casa(p.name)) add(p.id, p.name, 'Perfil de horario', 'horario')
      for (const a of cfg.subjects) if (casa(a.name)) add(a.id, a.name, 'Asignatura', 'ajustes')

      for (const c of [...new Set([...EXPENSE_CATS, SUBSCRIPTION_CAT])])
        if (casa(c)) add(`gasto-${c}`, c, 'Categoría de gasto', 'banco')
      for (const c of INCOME_CATS)
        if (casa(c)) add(`ingreso-${c}`, c, 'Categoría de ingreso', 'banco')

      const vistos = new Set<string>()
      for (const m of movements) {
        const etiqueta = `${m.category} · ${m.amount.toFixed(2)} €`
        if (casa(m.category) && !vistos.has(m.id)) {
          vistos.add(m.id)
          add(m.id, etiqueta, m.kind === 'gasto' ? 'Gasto' : 'Ingreso', 'banco')
        }
      }

      for (const o of OPCIONES) if (casa(o)) add(`op-${o}`, o, 'Ajustes', 'ajustes')

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
    ],
  )

  useEffect(() => {
    if (!cfg.shortcutsOn) return
    let anterior = ''
    const onKey = (e: KeyboardEvent) => {
      if (escribiendo(e.target)) return
      const tecla = teclaDe(e)
      const combo = anterior === 'g' ? `g ${tecla}` : tecla
      anterior = tecla === 'g' ? 'g' : ''

      const atajo = ATAJOS.find(
        (a) => (cfg.teclas[a.id] ?? a.tecla) === combo && cfg.atajos[a.id] !== false,
      )
      if (!atajo) return
      e.preventDefault()
      const a = atajo.accion
      if (a.tipo === 'ir') irA(a.page)
      else if (a.tipo === 'atras') atras()
      else if (a.tipo === 'adelante') adelante()
      else if (a.tipo === 'ajustes') setSettingsOpen(true)
      else if (a.tipo === 'tema') setTheme(theme === 'dark' ? 'light' : 'dark')
      else if (a.tipo === 'nota') setNotaFlotante((v) => !v)
      else if (a.tipo === 'buscar') document.getElementById('nivra-buscador')?.focus()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [cfg.shortcutsOn, cfg.atajos, cfg.teclas, irA, atras, adelante, theme, setTheme])

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

  const grupoActual = GROUPS.find((g) => g.pages.some((p) => p.id === page))
  const actual = PAGES.find((p) => p.id === page)

  return (
    <>
      {cfg.intro && !introDone && <Intro onDone={() => setIntroDone(true)} />}

      <div className="flex h-svh overflow-hidden text-neutral-800 dark:text-neutral-200">
        <aside
          className={`nivra-scroll fixed inset-y-0 left-0 hidden w-60 flex-col overflow-y-auto overscroll-contain border-r px-3 py-4 md:flex ${line}`}
        >
          <span className="font-display mb-7 px-3 text-2xl font-semibold tracking-tight">Nivra</span>

          <Navegacion
            page={page}
            irA={irA}
            bankTab={bankTab}
            setBankTab={setBankTab}
            bankInitial={bankInitial}
          />
        </aside>

        <div className="flex h-full min-w-0 flex-1 flex-col md:ml-60">
          <header
            className={`flex shrink-0 items-center justify-between gap-2 border-b px-3 py-3 sm:gap-4 sm:px-8 ${line}`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMenuAbierto(true)}
                aria-label="Menú"
                className={`${headerButton} md:hidden`}
              >
                <Icon name="menu" className="h-[18px] w-[18px]" />
              </button>
              {cfg.navButtons && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={atras}
                    disabled={indice === 0}
                    aria-label="Atrás"
                    className={headerButton}
                  >
                    <Icon name="back" className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={adelante}
                    disabled={indice >= historial.length - 1}
                    aria-label="Adelante"
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
                <span className="text-neutral-400 dark:text-neutral-500">{grupoActual?.title}</span>
                <Icon name="right" className="h-3 w-3 shrink-0 text-neutral-300 dark:text-neutral-600" />
                <span className="truncate font-medium">{actual?.label}</span>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {cfg.searchOn && (
                <Search
                  buscar={buscar}
                  onIr={(destino) =>
                    destino === 'ajustes' ? setSettingsOpen(true) : irA(destino as PageId)
                  }
                />
              )}
              {cfg.clockOn && <Clock hour12={cfg.hour12} />}
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
                className={headerButton}
              >
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label="Ajustes"
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
            } ${page === 'dashboard' ? 'lg:overflow-hidden' : ''}`}
          >
            {page === 'dashboard' && (
              <Dashboard
                items={items}
                tasks={tasks}
                blocks={blocks}
                works={works}
                balance={balance}
                countdowns={general ? [general] : []}
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
                autoSpecial={diasEspeciales}
                subDays={diasSuscripcion}
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
            {page === 'banco' && (
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

        {menuAbierto && (
          <div className="fixed inset-0 z-30 md:hidden">
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setMenuAbierto(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <div
              className={`nivra-scroll animate-[fade-in_0.2s_ease-out] absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r bg-[var(--paper)] px-3 py-4 ${line}`}
            >
              <div className="mb-6 flex items-center justify-between px-3">
                <span className="font-display text-2xl font-semibold tracking-tight">Nivra</span>
                <button
                  type="button"
                  onClick={() => setMenuAbierto(false)}
                  aria-label="Cerrar"
                  className="text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>
              <Navegacion
                page={page}
                irA={irA}
                bankTab={bankTab}
                setBankTab={(t) => {
                  setBankTab(t)
                  setMenuAbierto(false)
                }}
                bankInitial={bankInitial}
              />
            </div>
          </div>
        )}

        {notaFlotante && (
          <FloatingNote
            notepads={notepads}
            setNotepads={setNotepads}
            onCerrar={() => setNotaFlotante(false)}
          />
        )}

        {esCumple && <Confetti />}
        {cfg.toasts && (
          <Toasts avisos={avisos} onCerrar={(id) => setAvisos((prev) => prev.filter((a) => a.id !== id))} />
        )}

        {settingsOpen && (
          <Settings
            cfg={cfg}
            sync={sync}
            setSync={setSync}
            instalador={instalador}
            onInstalado={() => setInstalador(null)}
            onClose={() => setSettingsOpen(false)}
            onAviso={avisar}
            items={items}
            anniversaries={anniversaries}
            blocks={blocks}
          />
        )}
      </div>
    </>
  )
}

function Navegacion({
  page,
  irA,
  bankTab,
  setBankTab,
  bankInitial,
}: {
  page: PageId
  irA: (p: PageId) => void
  bankTab: BankTab
  setBankTab: (t: BankTab) => void
  bankInitial: number | null
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
                  {g.title}
                </p>
                <div className="flex flex-col gap-0.5">
                  {g.pages.map((p) => (
                    <div key={p.id}>
                      <button type="button" onClick={() => irA(p.id)} className={navItem(page === p.id)}>
                        <Icon name={p.icon} className="h-[17px] w-[17px] shrink-0" />
                        <span className="min-w-0 truncate">{p.label}</span>
                      </button>

                      {p.id === 'banco' && page === 'banco' && bankInitial !== null && (
                        <div className={`mt-1 ml-6 flex flex-col gap-0.5 border-l pl-3 ${line}`}>
                          {BANK_TABS.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setBankTab(t.id)}
                              className={`rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                                bankTab === t.id
                                  ? 'font-medium text-neutral-900 dark:text-white'
                                  : 'text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white'
                              }`}
                            >
                              {t.label}
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
