import { Icon } from '../components/ui'

const FEATURES = [
  { icon: 'calendar', title: 'Calendario', desc: 'Eventos por día.' },
  { icon: 'schedule', title: 'Horario', desc: 'Bloques semanales.' },
  { icon: 'tasks', title: 'Tareas', desc: 'Pendientes y hechas.' },
  { icon: 'dashboard', title: 'Privado', desc: 'Todo en tu navegador.' },
]

export function SetupScreen({ onDone, delay }: { onDone: () => void; delay: number }) {
  return (
    <div className="flex min-h-svh items-center bg-[#f6f5f2] px-6 py-16 text-neutral-900 sm:px-10 dark:bg-[#0b0b0c] dark:text-neutral-200">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-10">
        <div
          style={{ animationDelay: `${delay}s` }}
          className="animate-[fade-in_0.7s_cubic-bezier(.16,1,.3,1)_both] flex flex-col gap-3 text-left"
        >
          <h1 className="font-display text-6xl font-semibold tracking-tight sm:text-7xl">Nivra</h1>
          <p className="text-base text-neutral-500 sm:text-lg dark:text-neutral-400">
            Bienvenido a Nivra, tu espacio privado de organización.
          </p>
        </div>

        <ul className="flex flex-col">
          {FEATURES.map((f, i) => (
            <li
              key={f.title}
              style={{ animationDelay: `${delay + 0.15 + i * 0.08}s` }}
              className="animate-[fade-in_0.7s_cubic-bezier(.16,1,.3,1)_both] flex items-center gap-4 border-b border-black/[0.07] py-4 last:border-0 dark:border-white/[0.08]"
            >
              <Icon name={f.icon} className="h-5 w-5 shrink-0 text-neutral-400 dark:text-neutral-500" />
              <span className="text-sm font-medium">{f.title}</span>
              <span className="ml-auto text-sm text-neutral-400 dark:text-neutral-500">{f.desc}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onDone}
          style={{ animationDelay: `${delay + 0.5}s` }}
          className="animate-[fade-in_0.7s_cubic-bezier(.16,1,.3,1)_both] flex w-full items-center justify-between rounded-2xl bg-neutral-900 px-6 py-4 text-white transition-opacity hover:opacity-80 active:scale-[.99] sm:w-fit sm:gap-16 dark:bg-neutral-100 dark:text-neutral-900"
        >
          Entrar
          <Icon name="right" className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
