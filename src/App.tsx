import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bank, type BankTab } from './pages/Bank'
import { Calendar } from './pages/Calendar'
import { Dashboard } from './pages/Dashboard'
import { Exams } from './pages/Exams'
import { Grades } from './pages/Grades'
import { Notepads } from './pages/Notepads'
import { Schedule } from './pages/Schedule'
import { SetupScreen } from './pages/SetupScreen'
import { Subscriptions } from './pages/Subscriptions'
import { Tasks } from './pages/Tasks'
import { Wishlist } from './pages/Wishlist'
import { CountdownPage } from './pages/CountdownPage'
import { Intro } from './components/Intro'
import { Search, type Resultado } from './components/Search'
import { Settings } from './components/Settings'
import { Clock, Confetti, Icon, Toasts, line, type Aviso } from './components/ui'
import { useSettings } from './lib/settings'
import { lanzar, marcarEnviadas, pendientes } from './lib/notify'
import { ATAJOS, escribiendo, teclaDe } from './lib/shortcuts'
import { useSync } from './lib/useSync'
import {
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
      { id: 'bloc', label: 'Bloc de Notas', short: 'Bloc', icon: 'pencil' },
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
]

const PAGES = GROUPS.flatMap((g) => g.pages)

const BANK_TABS: { id: BankTab; label: string }[] = [
  { id: 'dinero', label: 'Dinero' },
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'gastos', label: 'Gastos' },
  { id: 'objetivos', label: 'Objetivos' },
]

const headerButton =
  'grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/[0.07] text-neutral-500 transition-colors hover:bg-black/[0.03] hover:text-neutral-900 disabled:opacity-30 disabled:hover:bg-transparent dark:border-white/[0.08] dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white'

function App() {
  const [setupDone, setSetupDone] = useState(() => localStorage.getItem(SETUP_KEY) === '1')
  const [introDone, setIntroDone] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [bankTab, setBankTab] = useState<BankTab>('dinero')
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [sync, setSync] = useSync()
  const cfg = useSettings()

  const [historial, setHistorial] = useState<PageId[]>(['dashboard'])
  const [indice, setIndice] = useState(0)
  const page = historial[indice]

  const irA = useCallback(
    (destino: PageId) => {
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
    (texto: string) => {
      if (!cfg.toasts) return
      const id = crypto.randomUUID()
      setAvisos((prev) => [...prev, { id, texto }])
      setTimeout(() => setAvisos((prev) => prev.filter((a) => a.id !== id)), 6000)
    },
    [cfg.toasts],
  )

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

  const [general, ...pequenas] = countdowns
  const diasEspeciales = useMemo(
    () => [...specialDays, ...countdowns.map((c) => c.target.slice(0, 10))],
    [specialDays, countdowns],
  )
  const diasSuscripcion = useMemo(() => subs.map((s) => s.day), [subs])

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
    if (!cfg.notifs || notificadas.current) return
    notificadas.current = true
    const lista = pendientes(new Date(), { countdowns, anniversaries, items, works })
    if (lista.length === 0) return
    for (const p of lista) {
      lanzar(p.texto)
      avisar(p.texto)
    }
    marcarEnviadas(lista.map((p) => p.clave))
  }, [cfg.notifs, countdowns, anniversaries, items, works, avisar])

  const buscar = useCallback(
    (texto: string): Resultado[] => {
      const q = texto.toLowerCase()
      const casa = (s?: string) => !!s && s.toLowerCase().includes(q)
      const out: Resultado[] = []
      for (const t of tasks) if (casa(t.title)) out.push({ id: t.id, titulo: t.title, tipo: 'Tarea', page: 'tareas' })
      for (const w of works)
        if (casa(w.title))
          out.push({ id: w.id, titulo: w.title, tipo: w.kind === 'examen' ? 'Examen' : 'Proyecto', page: 'examenes' })
      for (const e of events)
        if (casa(e.title)) out.push({ id: e.id, titulo: e.title, tipo: 'Actividad del calendario', page: 'calendario' })
      for (const w of wishes) if (casa(w.title)) out.push({ id: w.id, titulo: w.title, tipo: 'Deseo', page: 'deseos' })
      for (const s of subs) if (casa(s.title)) out.push({ id: s.id, titulo: s.title, tipo: 'Suscripción', page: 'suscripciones' })
      for (const n of notepads) if (casa(n.title)) out.push({ id: n.id, titulo: n.title, tipo: 'Bloc de notas', page: 'bloc' })
      for (const g of grades)
        if (casa(g.desc)) out.push({ id: g.id, titulo: g.desc ?? '', tipo: 'Nota', page: 'notas' })
      for (const b of blocks) if (casa(b.title)) out.push({ id: b.id, titulo: b.title, tipo: 'Bloque del horario', page: 'horario' })
      for (const c of countdowns)
        if (casa(c.title))
          out.push({ id: c.id, titulo: c.title, tipo: 'Cuenta atrás', page: c.id === general?.id ? 'dashboard' : `cuenta:${c.id}` })
      return out.slice(0, 12)
    },
    [tasks, works, events, wishes, subs, notepads, grades, blocks, countdowns, general],
  )

  useEffect(() => {
    if (!cfg.shortcutsOn) return
    let anterior = ''
    const onKey = (e: KeyboardEvent) => {
      if (escribiendo(e.target)) return
      const tecla = teclaDe(e)
      const combo = anterior === 'g' ? `g ${tecla}` : tecla
      anterior = tecla === 'g' ? 'g' : ''

      const atajo = ATAJOS.find((a) => a.tecla === combo && cfg.atajos[a.id] !== false)
      if (!atajo) return
      e.preventDefault()
      const a = atajo.accion
      if (a.tipo === 'ir') irA(a.page)
      else if (a.tipo === 'atras') atras()
      else if (a.tipo === 'adelante') adelante()
      else if (a.tipo === 'ajustes') setSettingsOpen(true)
      else if (a.tipo === 'tema') setTheme(theme === 'dark' ? 'light' : 'dark')
      else if (a.tipo === 'nota') irA('bloc')
      else if (a.tipo === 'buscar') document.getElementById('nivra-buscador')?.focus()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [cfg.shortcutsOn, cfg.atajos, irA, atras, adelante, theme, setTheme])

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

  const cuentaAbierta = page.startsWith('cuenta:') ? page.slice(7) : null
  const grupoActual = GROUPS.find((g) => g.pages.some((p) => p.id === page))
  const actual = PAGES.find((p) => p.id === page)
  const tituloCuenta = countdowns.find((c) => c.id === cuentaAbierta)?.title

  const navItem = (activo: boolean) =>
    `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
      activo
        ? 'bg-black/[0.06] font-medium text-neutral-900 dark:bg-white/[0.10] dark:text-white'
        : 'text-neutral-500 hover:bg-black/[0.03] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white'
    }`

  return (
    <>
      {cfg.intro && !introDone && <Intro onDone={() => setIntroDone(true)} />}

      <div className="flex h-svh overflow-hidden text-neutral-900 dark:text-neutral-200">
        <aside
          className={`nivra-scroll fixed inset-y-0 left-0 hidden w-60 flex-col overflow-y-auto overscroll-contain border-r px-3 py-4 md:flex ${line}`}
        >
          <span className="font-display mb-7 px-3 text-2xl font-semibold tracking-tight">Nivra</span>

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

            {!cfg.hideCountdowns && (
              <GrupoCuentas
                countdowns={pequenas}
                page={page}
                onIr={irA}
                onCrear={() => {
                  const id = crypto.randomUUID()
                  const ahora = new Date()
                  setCountdowns((prev) => [
                    ...prev,
                    {
                      id,
                      title: 'Nueva cuenta atrás',
                      target: `${dateKey(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 7))}T00:00`,
                      created: ahora.toISOString(),
                      units: { years: false, months: false, days: true, hours: true, minutes: true, seconds: true },
                    },
                  ])
                  irA(`cuenta:${id}`)
                }}
                navItem={navItem}
              />
            )}
          </nav>
        </aside>

        <div className="flex h-full min-w-0 flex-1 flex-col md:ml-60">
          <header
            className={`flex shrink-0 items-center justify-between gap-2 border-b px-3 py-3 sm:gap-4 sm:px-8 ${line}`}
          >
            <div className="flex min-w-0 items-center gap-2">
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
                <span className="text-neutral-400 dark:text-neutral-500">
                  {grupoActual?.title ?? 'Cuentas atrás'}
                </span>
                <Icon name="right" className="h-3 w-3 shrink-0 text-neutral-300 dark:text-neutral-600" />
                <span className="truncate font-medium">
                  {actual?.label ?? tituloCuenta ?? 'Cuenta atrás'}
                </span>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {cfg.searchOn && <Search buscar={buscar} onIr={irA} />}
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
            className={`nivra-scroll flex-1 overflow-y-auto overscroll-contain px-5 pt-7 pb-28 sm:px-8 sm:pt-8 md:pb-12 ${
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
              />
            )}
            {page === 'notas' && (
              <Grades grades={grades} setGrades={setGrades} subjects={cfg.subjects} />
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
            {cuentaAbierta && (
              <CountdownPage
                id={cuentaAbierta}
                countdowns={countdowns}
                setCountdowns={setCountdowns}
                onSalir={() => irA('dashboard')}
              />
            )}
          </main>
        </div>

        <nav
          className={`nivra-scroll fixed inset-x-0 bottom-0 z-10 flex overflow-x-auto border-t bg-[var(--paper)]/95 backdrop-blur-md md:hidden ${line}`}
        >
          {PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => irA(p.id)}
              className={`flex min-w-[4.2rem] flex-1 flex-col items-center gap-1 py-2.5 pb-[max(0.7rem,env(safe-area-inset-bottom))] text-[0.58rem] transition-colors ${
                page === p.id
                  ? 'font-medium text-neutral-900 dark:text-white'
                  : 'text-neutral-400 dark:text-neutral-500'
              }`}
            >
              <Icon name={p.icon} className="h-[18px] w-[18px]" />
              {p.short}
            </button>
          ))}
        </nav>

        {esCumple && <Confetti />}
        {cfg.toasts && (
          <Toasts avisos={avisos} onCerrar={(id) => setAvisos((prev) => prev.filter((a) => a.id !== id))} />
        )}

        {settingsOpen && (
          <Settings
            cfg={cfg}
            sync={sync}
            setSync={setSync}
            onClose={() => setSettingsOpen(false)}
            onAviso={avisar}
          />
        )}
      </div>
    </>
  )
}

function GrupoCuentas({
  countdowns,
  page,
  onIr,
  onCrear,
  navItem,
}: {
  countdowns: Countdown[]
  page: PageId
  onIr: (p: PageId) => void
  onCrear: () => void
  navItem: (activo: boolean) => string
}) {
  const [abierto, setAbierto] = useState(true)

  return (
    <div>
      <div className="mb-2 flex items-center gap-1 px-3">
        <button
          type="button"
          onClick={() => setAbierto(!abierto)}
          aria-expanded={abierto}
          className="flex min-w-0 flex-1 items-center gap-1 text-left text-[0.65rem] font-medium tracking-[0.14em] text-neutral-400 uppercase dark:text-neutral-500"
        >
          <Icon
            name="chevron"
            className={`h-3 w-3 shrink-0 transition-transform ${abierto ? '' : '-rotate-90'}`}
          />
          Cuentas atrás
        </button>
        <button
          type="button"
          onClick={onCrear}
          aria-label="Nueva cuenta atrás"
          className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
        </button>
      </div>

      {abierto && (
        <div className="flex flex-col gap-0.5">
          {countdowns.length === 0 ? (
            <p className="px-3 py-1 text-xs text-neutral-400 dark:text-neutral-500">Ninguna.</p>
          ) : (
            countdowns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onIr(`cuenta:${c.id}`)}
                className={navItem(page === `cuenta:${c.id}`)}
              >
                <Icon name="timer" className="h-[17px] w-[17px] shrink-0" />
                <span className="min-w-0 truncate">{c.title}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default App
