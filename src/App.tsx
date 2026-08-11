import { useEffect, useState } from 'react'
import { Bank, type BankTab } from './pages/Bank'
import { Calendar } from './pages/Calendar'
import { Dashboard } from './pages/Dashboard'
import { Exams } from './pages/Exams'
import { Intro } from './components/Intro'
import { Schedule } from './pages/Schedule'
import { SetupScreen } from './pages/SetupScreen'
import { Tasks } from './pages/Tasks'
import { Grades } from './pages/Grades'
import { Wishlist } from './pages/Wishlist'
import { Clock, Confetti, Icon, Label, Modal, Switch, input, line } from './components/ui'
import {
  ACCENTS,
  calendarItems,
  dateKey,
  monthDay,
  useStored,
  type Anniversary,
  type Block,
  type Grade,
  type Movement,
  type NivraEvent,
  type PageId,
  type Streak,
  type Task,
  type Timer,
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
    ],
  },
]

const PAGES = GROUPS.flatMap((g) => g.pages)

const headerButton =
  'grid h-10 w-10 place-items-center rounded-xl border border-black/[0.07] text-neutral-500 transition-colors hover:bg-black/[0.03] hover:text-neutral-900 dark:border-white/[0.08] dark:text-neutral-400 dark:hover:bg-white/[0.05] dark:hover:text-white'

const BANK_TABS: { id: BankTab; label: string }[] = [
  { id: 'dinero', label: 'Dinero' },
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'gastos', label: 'Gastos' },
]

function App() {
  const [setupDone, setSetupDone] = useState(() => localStorage.getItem(SETUP_KEY) === '1')
  const [introDone, setIntroDone] = useState(false)
  const [page, setPage] = useState<PageId>('dashboard')
  const [bankTab, setBankTab] = useState<BankTab>('dinero')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [introEnabled, setIntroEnabled] = useStored('nivra-intro', true)
  const [accent, setAccent] = useStored('nivra-accent', 'basico')
  const [clockOn, setClockOn] = useStored('nivra-clock', false)
  const [hour12, setHour12] = useStored('nivra-hour12', false)
  const [birthday, setBirthday] = useStored('nivra-birthday', '')

  const [theme, setTheme] = useStored<'light' | 'dark'>(
    'nivra-theme',
    matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  )
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  useEffect(() => {
    if (accent === 'basico') delete document.documentElement.dataset.accent
    else document.documentElement.dataset.accent = accent
  }, [accent])

  const [events, setEvents] = useStored<NivraEvent[]>('nivra-events', [])
  const [tasks, setTasks] = useStored<Task[]>('nivra-tasks', [])
  const [blocks, setBlocks] = useStored<Block[]>('nivra-blocks', [])
  const [works, setWorks] = useStored<Work[]>('nivra-works', [])
  const [freeDays, setFreeDays] = useStored<string[]>('nivra-free-days', [])
  const [anniversaries, setAnniversaries] = useStored<Anniversary[]>('nivra-anniversaries', [])
  const [bankInitial, setBankInitial] = useStored<number | null>('nivra-bank-initial', null)
  const [movements, setMovements] = useStored<Movement[]>('nivra-movements', [])
  const [timers, setTimers] = useStored<Timer[]>('nivra-timers', [])
  const [wishes, setWishes] = useStored<Wish[]>('nivra-wishes', [])
  const [grades, setGrades] = useStored<Grade[]>('nivra-grades', [])
  const [streak, setStreak] = useStored<Streak>('nivra-streak', { count: 0, last: '' })

  const esCumple = birthday !== '' && monthDay(birthday) === monthDay(dateKey(new Date()))

  const items = calendarItems(events, tasks, works)
  const balance =
    bankInitial === null
      ? null
      : bankInitial + movements.reduce((s, m) => s + (m.kind === 'ingreso' ? m.amount : -m.amount), 0)

  const group = GROUPS.find((g) => g.pages.some((p) => p.id === page))!
  const current = PAGES.find((p) => p.id === page)!

  if (!setupDone) {
    return (
      <>
        {introEnabled && !introDone && <Intro onDone={() => setIntroDone(true)} />}
        <SetupScreen
          delay={introEnabled ? 2.25 : 0}
          onDone={() => {
            localStorage.setItem(SETUP_KEY, '1')
            setSetupDone(true)
          }}
        />
      </>
    )
  }

  return (
    <>
      {introEnabled && !introDone && <Intro onDone={() => setIntroDone(true)} />}

      <div className="flex h-svh overflow-hidden text-neutral-900 dark:text-neutral-200">
        <aside
          className={`fixed inset-y-0 left-0 hidden w-60 flex-col overflow-y-auto overscroll-contain border-r px-3 py-4 md:flex ${line}`}
        >
          <span className="font-display mb-7 px-3 text-2xl font-semibold tracking-tight">Nivra</span>

          <nav className="flex flex-col gap-6">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <p className="mb-2 px-3 text-[0.65rem] font-medium tracking-[0.14em] text-neutral-400 uppercase dark:text-neutral-500">
                  {g.title}
                </p>
                <div className="flex flex-col gap-0.5">
                  {g.pages.map((p) => (
                    <div key={p.id}>
                      <button
                        type="button"
                        onClick={() => setPage(p.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                          page === p.id
                            ? `border bg-white font-medium shadow-sm ${line} dark:bg-[#1c1c1f]`
                            : 'border border-transparent text-neutral-500 hover:bg-black/[0.03] hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.04] dark:hover:text-white'
                        }`}
                      >
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
        </aside>

        <div className="flex h-full min-w-0 flex-1 flex-col md:ml-60">
          <header
            className={`flex shrink-0 items-center justify-between gap-4 border-b px-5 py-3.5 sm:px-8 ${line}`}
          >
            <span className="font-display text-xl font-semibold tracking-tight md:hidden">Nivra</span>
            <p className="hidden min-w-0 items-center gap-2 text-sm md:flex">
              <span className="text-neutral-400 dark:text-neutral-500">{group.title}</span>
              <Icon name="right" className="h-3 w-3 shrink-0 text-neutral-300 dark:text-neutral-600" />
              <span className="truncate font-medium">{current.label}</span>
            </p>
            <div className="flex shrink-0 items-center gap-2">
              {clockOn && <Clock hour12={hour12} />}
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
            key={page}
            className="animate-[fade-in_0.35s_ease-out] flex-1 overflow-y-auto overscroll-contain px-5 pt-7 pb-28 sm:px-8 sm:pt-8 md:pb-12"
          >
            {page === 'dashboard' && (
              <Dashboard
                items={items}
                tasks={tasks}
                blocks={blocks}
                works={works}
                balance={balance}
                timers={timers}
                setTimers={setTimers}
                streak={streak}
                setStreak={setStreak}
                onGo={setPage}
              />
            )}
            {page === 'calendario' && (
              <Calendar
                items={items}
                setEvents={setEvents}
                freeDays={freeDays}
                setFreeDays={setFreeDays}
                anniversaries={anniversaries}
                setAnniversaries={setAnniversaries}
              />
            )}
            {page === 'horario' && <Schedule blocks={blocks} setBlocks={setBlocks} />}
            {page === 'tareas' && <Tasks tasks={tasks} setTasks={setTasks} />}
            {page === 'examenes' && <Exams works={works} setWorks={setWorks} />}
            {page === 'notas' && <Grades grades={grades} setGrades={setGrades} />}
            {page === 'deseos' && <Wishlist wishes={wishes} setWishes={setWishes} />}
            {page === 'banco' && (
              <Bank
                initial={bankInitial}
                setInitial={setBankInitial}
                movements={movements}
                setMovements={setMovements}
                tab={bankTab}
                setTab={setBankTab}
              />
            )}
          </main>
        </div>

        <nav
          className={`fixed inset-x-0 bottom-0 z-10 flex border-t bg-[#f6f5f2]/90 backdrop-blur-md md:hidden ${line} dark:bg-[#0b0b0c]/90`}
        >
          {PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPage(p.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 pb-[max(0.7rem,env(safe-area-inset-bottom))] text-[0.6rem] transition-colors ${
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

        {settingsOpen && (
          <Modal title="Ajustes" onClose={() => setSettingsOpen(false)}>
            <div className={`divide-y ${line}`}>
              <Switch
                checked={introEnabled}
                onChange={setIntroEnabled}
                label="Animación de inicio"
                hint="La presentación de Nivra al abrir o recargar la web."
              />
              <Switch
                checked={clockOn}
                onChange={setClockOn}
                label="Reloj"
                hint="Muestra la hora junto al botón de tema."
              />
              {clockOn && (
                <Switch
                  checked={hour12}
                  onChange={setHour12}
                  label="Formato de 12 horas"
                  hint={hour12 ? 'Ahora en formato de 12 horas.' : 'Ahora en formato de 24 horas.'}
                />
              )}
            </div>

            <div className="mt-6">
              <Label>Color</Label>
              <div className="grid grid-cols-5 gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAccent(a.id)}
                    title={a.label}
                    aria-label={a.label}
                    aria-pressed={accent === a.id}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors ${
                      accent === a.id
                        ? 'border-neutral-900 dark:border-white'
                        : `${line} hover:border-neutral-400`
                    }`}
                  >
                    <span
                      className="h-5 w-5 rounded-full"
                      style={{ background: a.swatch }}
                      aria-hidden
                    />
                    <span className="w-full truncate text-center text-[0.55rem] text-neutral-500 dark:text-neutral-400">
                      {a.label}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[0.7rem] text-neutral-400 dark:text-neutral-500">
                El color tiñe el fondo por encima del modo claro u oscuro.
              </p>
            </div>

            <div className="mt-6">
              <Label>Cumpleaños</Label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  aria-label="Fecha de cumpleaños"
                  className={input}
                />
                {birthday && (
                  <button
                    type="button"
                    onClick={() => setBirthday('')}
                    className="shrink-0 text-xs text-neutral-400 transition-colors hover:text-red-500"
                  >
                    Quitar
                  </button>
                )}
              </div>
              <p className="mt-2 text-[0.7rem] text-neutral-400 dark:text-neutral-500">
                Ese día, todos los años, cae confeti.
              </p>
            </div>
          </Modal>
        )}
      </div>
    </>
  )
}

export default App
