import { useEffect, useRef, type ReactNode } from 'react'

export const line = 'border-black/[0.07] dark:border-white/[0.08]'

export const card = `rounded-2xl border bg-white ${line} dark:bg-[#141416]`

export const input =
  'w-full rounded-xl border border-black/[0.07] bg-[#faf9f7] px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 sm:px-4 sm:py-3 dark:border-white/[0.08] dark:bg-[#0f0f11] dark:focus:border-neutral-600'

export const select = `${input} appearance-none`

export const button =
  'rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 active:scale-[.98] sm:px-5 sm:py-3 dark:bg-white dark:text-neutral-900'

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
    <div className={`flex gap-1 rounded-full border bg-[#faf9f7] p-1 ${line} dark:bg-[#0f0f11]`}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            value === o.id
              ? 'bg-white text-neutral-900 shadow-sm dark:bg-[#26262a] dark:text-white'
              : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d.value)))

  return (
    <div className="flex h-36 items-stretch gap-1">
      {data.map((d, i) => {
        const height = `${(Math.abs(d.value) / max) * 100}%`
        return (
          <div
            key={i}
            className="group flex flex-1 flex-col"
            title={`${d.label}: ${d.value.toFixed(2)}`}
          >
            <div className="flex flex-1 items-end">
              {d.value > 0 && (
                <div
                  className="w-full rounded-t-md bg-neutral-900 transition-opacity group-hover:opacity-70 dark:bg-white"
                  style={{ height }}
                />
              )}
            </div>
            <div className={`h-px w-full ${'bg-black/[0.08] dark:bg-white/10'}`} />
            <div className="flex flex-1 items-start">
              {d.value < 0 && (
                <div
                  className="w-full rounded-b-md bg-red-500 transition-opacity group-hover:opacity-70"
                  style={{ height }}
                />
              )}
            </div>
          </div>
        )
      })}
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
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-neutral-900 dark:bg-white' : 'bg-black/10 dark:bg-white/15'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[left] dark:bg-neutral-900 ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  )
}

export function CatChart({ data, tone }: { data: { label: string; value: number }[]; tone: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  if (data.length === 0) return <Empty>Sin datos.</Empty>
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
      className={`m-auto w-[min(100%-1.5rem,30rem)] rounded-3xl border bg-white p-5 text-neutral-900 backdrop:bg-black/40 backdrop:backdrop-blur-sm sm:p-7 ${line} dark:bg-[#141416] dark:text-neutral-100`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <h3 className="mr-auto text-lg font-semibold first-letter:uppercase sm:text-xl">{title}</h3>
        {actions}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
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
