import { useEffect, useRef, useState, type ReactNode } from 'react'
import { locale, t } from '../lib/i18n'
import { playTick } from '../lib/sound'

export const line = 'border-black/[0.07] dark:border-white/[0.08]'

export const card = `rounded-2xl border bg-[var(--surface)] ${line}`

export const input =
  'w-full rounded-xl border border-black/[0.07] bg-[var(--sunken)] px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 sm:px-4 sm:py-3 dark:border-white/[0.08] dark:focus:border-neutral-600'

export const select = `${input} appearance-none`

export const button =
  'rounded-xl bg-neutral-800 px-4 py-2.5 text-sm font-medium text-neutral-50 transition-opacity hover:opacity-85 active:scale-[.98] sm:px-5 sm:py-3 dark:bg-white dark:text-neutral-900'

export const ghost = `rounded-xl border px-4 py-2.5 text-sm text-neutral-500 transition-colors hover:bg-black/[0.03] sm:px-5 ${line} dark:text-neutral-400 dark:hover:bg-white/[0.04]`

export function Label({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 text-[0.68rem] font-medium tracking-[0.14em] text-neutral-400 uppercase sm:mb-4 dark:text-neutral-500">
      {children}
    </h3>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-neutral-400 dark:text-neutral-500">{children}</p>
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className={`flex gap-1 rounded-full border bg-[var(--sunken)] p-1 ${line}`}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            value === o.id
              ? 'bg-[var(--surface)] text-neutral-900 shadow-sm dark:text-white'
              : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          {t(o.label)}
        </button>
      ))}
    </div>
  )
}

const compact = (n: number) =>
  n >= 10 ? String(Math.round(n)) : n.toFixed(1).replace('.0', '').replace('.', ',')

function Half({ value, height, up }: { value: number; height: string; up: boolean }) {
  if (value === 0) return <span className="flex-1" />
  return (
    <span className="flex h-full flex-1 flex-col justify-end gap-1">
      <span
        className={`text-center font-mono text-[0.5rem] leading-none tabular-nums ${
          up ? 'text-green-600 dark:text-green-500' : 'text-red-500'
        }`}
      >
        {up ? '+' : '−'}
        {compact(value)}
      </span>
      <span
        className={`w-full rounded-md transition-opacity hover:opacity-70 ${
          up ? 'bg-green-500' : 'bg-red-500'
        }`}
        style={{ height }}
      />
    </span>
  )
}

export function BarChart({
  data,
  todayIndex = -1,
}: {
  data: { label: string; income: number; expense: number }[]
  todayIndex?: number
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]))
  const height = (v: number) => `${Math.max(6, (v / max) * 92)}%`

  return (
    <div>
      <div className="flex h-40 items-end gap-[3px]">
        {data.map((d, i) => {
          const idle = d.income === 0 && d.expense === 0
          return (
            <div
              key={i}
              title={`${d.label} · entra ${d.income.toFixed(2)} € · sale ${d.expense.toFixed(2)} €`}
              className="flex h-full flex-1 items-end gap-px"
            >
              {idle ? (
                <span className="h-1 w-full rounded-md bg-black/[0.08] dark:bg-white/[0.12]" />
              ) : (
                <>
                  <Half value={d.income} height={height(d.income)} up />
                  <Half value={d.expense} height={height(d.expense)} up={false} />
                </>
              )}
            </div>
          )
        })}
      </div>
      {todayIndex >= 0 && (
        <div className="mt-1.5 flex gap-[3px]">
          {data.map((_, i) => (
            <span
              key={i}
              className={`flex-1 text-center font-mono text-[0.5rem] leading-none ${
                i === todayIndex
                  ? 'font-bold text-neutral-900 dark:text-white'
                  : 'text-neutral-400 dark:text-neutral-500'
              }`}
            >
              {i === todayIndex ? 'HOY' : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-neutral-400 dark:text-neutral-500">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => {
          playTick()
          onChange(!checked)
        }}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-neutral-800 dark:bg-white' : 'bg-black/10 dark:bg-white/15'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-neutral-50 shadow-sm transition-[left] dark:bg-neutral-900 ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  )
}

export function CatChart({ data, tone }: { data: { label: string; value: number }[]; tone: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  if (data.length === 0) return <Empty>{t('Sin datos.')}</Empty>
  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => (
        <li key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-24 shrink-0 truncate text-neutral-500 dark:text-neutral-400">{d.label}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.06]">
            <span
              className={`block h-full rounded-full ${tone}`}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </span>
          <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums">
            {d.value.toFixed(2)} €
          </span>
        </li>
      ))}
    </ul>
  )
}

export function Clock({ hour12 }: { hour12: boolean }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span
      className={`flex h-10 shrink-0 items-center rounded-xl border px-2.5 font-mono text-xs tabular-nums text-neutral-500 sm:px-3 sm:text-sm ${line} dark:text-neutral-400`}
    >
      {now.toLocaleTimeString(locale(), {
        hour: '2-digit',
        minute: '2-digit',
        hour12,
      })}
    </span>
  )
}

const CONFETTI = Array.from({ length: 60 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 13) % 40) / 10,
  duration: 3 + ((i * 7) % 25) / 10,
  size: 6 + ((i * 5) % 7),
  color: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'][i % 6],
  round: i % 3 === 0,
}))

export function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden>
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className={`animate-[confetti-fall_linear_infinite] absolute top-0 block ${c.round ? 'rounded-full' : 'rounded-[1px]'}`}
          style={{
            left: `${c.left}%`,
            width: c.size,
            height: c.size,
            background: c.color,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

export function Collapsible({
  title,
  open,
  onToggle,
  animar = true,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  animar?: boolean
  children: ReactNode
}) {
  return (
    <div className={`rounded-2xl border ${line}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-[0.68rem] font-medium tracking-[0.14em] text-neutral-500 uppercase dark:text-neutral-400">
          {title}
        </span>
        <Icon
          name="chevron"
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`grid ${animar ? 'transition-[grid-template-rows] duration-300 ease-out' : ''} ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className={`border-t px-4 py-4 ${line}`}>{children}</div>
        </div>
      </div>
    </div>
  )
}

export type Toast = { id: string; text: string; undo?: () => void; durationMs: number }

export function Toasts({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  return (
    <div className="nivra-scroll pointer-events-none fixed right-4 bottom-4 z-40 flex max-h-[80svh] flex-col gap-2 overflow-y-auto overscroll-contain">
      {toasts.map((a) => (
        <div
          key={a.id}
          className={`animate-[fade-in_0.25s_ease-out] pointer-events-auto relative flex max-w-xs items-center gap-3 overflow-hidden rounded-xl border bg-[var(--surface)] py-2 pr-2 pl-4 text-sm shadow-lg ${line}`}
        >
          <span className="min-w-0 flex-1 py-1">{a.text}</span>
          {a.undo && (
            <button
              type="button"
              onClick={() => {
                a.undo?.()
                onClose(a.id)
              }}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium underline underline-offset-2 transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
            >
              {t('Deshacer')}
            </button>
          )}
          <button
            type="button"
            onClick={() => onClose(a.id)}
            aria-label={t('Cerrar aviso')}
            className="shrink-0 rounded-lg p-1 text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
          >
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
          <span
            style={{ animationDuration: `${a.durationMs}ms` }}
            className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-[shrink-bar_linear_forwards] bg-neutral-300 dark:bg-neutral-600"
          />
        </div>
      ))}
    </div>
  )
}

export function Modal({
  title,
  onClose,
  actions,
  children,
}: {
  title: string
  onClose: () => void
  actions?: ReactNode
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[min(100%-1.5rem,30rem)] rounded-3xl border bg-[var(--surface)] p-5 text-neutral-800 backdrop:bg-black/40 backdrop:backdrop-blur-sm sm:p-7 ${line} dark:text-neutral-100`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <h3 className="mr-auto text-lg font-semibold first-letter:uppercase sm:text-xl">{title}</h3>
        {actions}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('Cerrar')}
          className="-mt-1 -mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-neutral-400 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 dark:hover:bg-white/[0.06] dark:hover:text-white"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  )
}

const PATHS: Record<string, ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="11" width="7" height="10" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  schedule: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  tasks: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 13.5A8.5 8.5 0 0110.5 4a8.5 8.5 0 109.5 9.5z" />,
  exams: (
    <>
      <path d="M6 3h8l5 5v13H6z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  bank: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="3" />
      <path d="M3 10h18M16.5 15h2" />
    </>
  ),
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />,
  pin: (
    <>
      <path d="M9 3h6" />
      <path d="M10 3v6l-3 3v2h10v-2l-3-3V3" />
      <path d="M12 14v7" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 00-3-3L5 17v3z" />
      <path d="M14.5 6.5l3 3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 14.6a1.7 1.7 0 00.35 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.35 1.7 1.7 0 00-1.03 1.56V21a2 2 0 11-4 0v-.11a1.7 1.7 0 00-1.11-1.56 1.7 1.7 0 00-1.87.35l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.35-1.87 1.7 1.7 0 00-1.56-1.03H3a2 2 0 110-4h.11a1.7 1.7 0 001.56-1.11 1.7 1.7 0 00-.35-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.35H9a1.7 1.7 0 001-1.56V3a2 2 0 114 0v.11a1.7 1.7 0 001 1.56 1.7 1.7 0 001.87-.35l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.35 1.87V9a1.7 1.7 0 001.56 1H21a2 2 0 110 4h-.11a1.7 1.7 0 00-1.56 1z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  left: <path d="M14.5 5L8 12l6.5 7" />,
  right: <path d="M9.5 5l6.5 7-6.5 7" />,
  trash: <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  down: <path d="M12 5v14M18 13l-6 6-6-6" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  forward: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  bell: <path d="M18 16v-5a6 6 0 10-12 0v5l-2 3h16zM10 22h4" />,
  download: <path d="M12 3v13M7 12l5 5 5-5M4 21h16" />,
  upload: <path d="M12 21V8M7 12l5-5 5 5M4 3h16" />,
  subs: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M2.5 10h19" />
    </>
  ),
  drag: <path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M5 15V5.5A2.5 2.5 0 017.5 3H15" />
    </>
  ),
  special: (
    <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM19 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
  ),
  wish: <path d="M12 20s-7-4.4-7-9.3A3.9 3.9 0 0112 8.4a3.9 3.9 0 017 2.3c0 4.9-7 9.3-7 9.3z" />,
  grades: (
    <>
      <path d="M12 4L3 8.5 12 13l9-4.5z" />
      <path d="M7 11v4.5c0 1 2.2 2.5 5 2.5s5-1.5 5-2.5V11" />
    </>
  ),
  flame: (
    <path d="M12 21c3.3 0 6-2.5 6-5.7 0-4.3-4.4-5.6-3.4-10.3-2.6.6-4 2.6-4 4.9 0 1.4.6 2.3.6 3.2 0 .8-.6 1.5-1.4 1.5s-1.4-.8-1.3-1.9C7.2 13.6 6 14.9 6 16.4 6 19 8.4 21 12 21z" />
  ),
  link: (
    <>
      <path d="M10.5 13.5a4 4 0 005.7 0l2.8-2.8a4 4 0 10-5.7-5.7l-1.2 1.2" />
      <path d="M13.5 10.5a4 4 0 00-5.7 0L5 13.3a4 4 0 105.7 5.7l1.2-1.2" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2M9 2h6" />
    </>
  ),
  table: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M3 16h18M9 4v16M15 4v16" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M4 20h16" />,
  collapse: (
    <>
      <rect x="3" y="4" width="18" height="6" rx="1.5" />
      <path d="M8 15l4 4 4-4" />
    </>
  ),
}

export function Icon({ name, className = 'h-[1.15em] w-[1.15em]' }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  )
}
