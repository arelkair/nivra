import { useEffect, useRef, type ReactNode } from 'react'

export const card =
  'rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'

export const input =
  'w-full rounded-xl border border-neutral-200 bg-stone-50 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 sm:px-4 sm:py-3 dark:border-neutral-800 dark:bg-neutral-950 dark:focus:border-neutral-600'

export const button =
  'rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80 active:scale-[.98] sm:px-5 sm:py-3 dark:bg-neutral-100 dark:text-neutral-900'

export const ghost =
  'rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 sm:px-5 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800'

export function Label({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 text-xs font-semibold tracking-widest text-neutral-400 uppercase sm:mb-4 dark:text-neutral-500">
      {children}
    </h3>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-neutral-400 dark:text-neutral-500">{children}</p>
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])

  // ponytail: cerrar = desmontar. React 19 no propaga el evento 'close' del <dialog>,
  // así que Esc se captura por teclado y el fondo por su propio click.
  return (
    <dialog
      ref={ref}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(100%-1.5rem,30rem)] rounded-3xl border border-neutral-200 bg-white p-5 text-neutral-900 backdrop:bg-black/50 backdrop:backdrop-blur-sm sm:p-7 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold first-letter:uppercase sm:text-xl">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="-mt-1 -mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
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
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  left: <path d="M14.5 5L8 12l6.5 7" />,
  right: <path d="M9.5 5l6.5 7-6.5 7" />,
  trash: <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />,
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
