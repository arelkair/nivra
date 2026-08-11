import { useEffect, useState } from 'react'
import { Bank, type BankTab } from './Bank'
import { Calendar } from './Calendar'
import { Dashboard } from './Dashboard'
import { Exams } from './Exams'
import { Intro } from './Intro'
import { Schedule } from './Schedule'
import { SetupScreen } from './SetupScreen'
import { Tasks } from './Tasks'
import { Icon } from './ui'
import {
  calendarItems,
  useStored,
  type Anniversary,
  type Block,
  type Movement,
  type NivraEvent,
  type PageId,
  type Task,
  type Work,
} from './store'

const SETUP_KEY = 'nivra-setup-done'

const PAGES: { id: PageId; label: string; short: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', short: 'Inicio', icon: 'dashboard' },
  { id: 'calendario', label: 'Calendario', short: 'Calend.', icon: 'calendar' },
  { id: 'horario', label: 'Horario', short: 'Horario', icon: 'schedule' },
  { id: 'tareas', label: 'Tareas', short: 'Tareas', icon: 'tasks' },
  { id: 'examenes', label: 'Exámenes y Proyectos', short: 'Exám.', icon: 'exams' },
  { id: 'banco', label: 'Banco', short: 'Banco', icon: 'bank' },
]

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

  const [theme, setTheme] = useStored<'light' | 'dark'>(
    'nivra-theme',
    matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  )
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const [events, setEvents] = useStored<NivraEvent[]>('nivra-events', [])
  const [tasks, setTasks] = useStored<Task[]>('nivra-tasks', [])
  const [blocks, setBlocks] = useStored<Block[]>('nivra-blocks', [])
  const [works, setWorks] = useStored<Work[]>('nivra-works', [])
  const [freeDays, setFreeDays] = useStored<string[]>('nivra-free-days', [])
  const [anniversaries, setAnniversaries] = useStored<Anniversary[]>('nivra-anniversaries', [])
  const [bankInitial, setBankInitial] = useStored<number | null>('nivra-bank-initial', null)
  const [movements, setMovements] = useStored<Movement[]>('nivra-movements', [])

  const items = calendarItems(events, tasks, works)
  const balance =
    bankInitial === null
      ? null
      : bankInitial +
        movements.reduce((s, m) => s + (m.kind === 'ingreso' ? m.amount : -m.amount), 0)

  if (!setupDone) {
    return (
      <>
        {!introDone && <Intro onDone={() => setIntroDone(true)} />}
        <SetupScreen
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
      {!introDone && <Intro onDone={() => setIntroDone(true)} />}

      <div className="flex min-h-svh bg-stone-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-200">
        <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col overflow-y-auto border-r border-neutral-200 px-4 py-6 md:flex dark:border-neutral-800">
          <span className="font-display mb-8 px-3 text-2xl font-semibold tracking-tight">Nivra</span>
          <nav className="flex flex-col gap-1">
            {PAGES.map((p) => (
              <div key={p.id}>
                <button
                  type="button"
                  onClick={() => setPage(p.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    page === p.id
                      ? 'bg-neutral-900 font-medium text-white dark:bg-neutral-100 dark:text-neutral-900'
                      : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100'
                  }`}
                >
                  <Icon name={p.icon} className="h-[18px] w-[18px] shrink-0" />
                  <span className="min-w-0 truncate">{p.label}</span>
                </button>

                {p.id === 'banco' && page === 'banco' && bankInitial !== null && (
                  <div className="mt-1 ml-5 flex flex-col gap-0.5 border-l border-neutral-200 pl-3 dark:border-neutral-800">
                    {BANK_TABS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setBankTab(t.id)}
                        className={`rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                          bankTab === t.id
                            ? 'font-medium text-neutral-900 dark:text-neutral-100'
                            : 'text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-100'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col md:ml-56">
          <header className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-8 dark:border-neutral-800">
            <span className="font-display text-xl font-semibold tracking-tight md:hidden">Nivra</span>
            <h1 className="hidden truncate text-lg font-semibold md:block">
              {PAGES.find((p) => p.id === page)?.label}
            </h1>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 sm:h-11 sm:w-11 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-5 w-5" />
            </button>
          </header>

          <main
            key={page}
            className="animate-[fade-in_0.35s_ease-out] flex-1 px-5 pt-7 pb-28 sm:px-8 sm:pt-9 md:pb-12"
          >
            {page === 'dashboard' && (
              <Dashboard
                items={items}
                tasks={tasks}
                blocks={blocks}
                works={works}
                balance={balance}
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

        <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-neutral-200 bg-stone-50/90 backdrop-blur-md md:hidden dark:border-neutral-800 dark:bg-neutral-950/90">
          {PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPage(p.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[0.6rem] transition-colors ${
                page === p.id
                  ? 'font-medium text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-400 dark:text-neutral-500'
              }`}
            >
              <Icon name={p.icon} className="h-5 w-5" />
              {p.short}
            </button>
          ))}
        </nav>
      </div>
    </>
  )
}

export default App
