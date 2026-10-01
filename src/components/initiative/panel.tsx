import type { ReactNode } from 'react'
import { Icon } from '../ui'
import { skin } from './skin'

export function Panel({
  title,
  count,
  onOpen,
  dark,
  delay,
  action,
  grow,
  children,
}: {
  title: string
  count?: number
  onOpen?: () => void
  dark: boolean
  delay: number
  action?: ReactNode
  grow?: 1 | 2
  children: ReactNode
}) {
  const s = skin(dark)
  const heading = (
    <span className={`font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`}>
      {title}
      {count !== undefined && <span className="ml-2 tabular-nums">{count}</span>}
    </span>
  )
  return (
    <section
      style={{ animationDelay: `${delay}s` }}
      className={`animate-[fade-in_0.6s_cubic-bezier(.16,1,.3,1)_both] flex min-w-0 flex-col rounded-2xl border lg:min-h-0 lg:overflow-hidden ${grow === 2 ? 'lg:flex-[2]' : grow ? 'lg:flex-1' : ''} ${s.line} ${s.panel}`}
    >
      <div className={`flex items-center justify-between gap-2 border-b px-4 py-3 lg:shrink-0 ${s.line}`}>
        {onOpen ? (
          <button type="button" onClick={onOpen} className="group flex items-center gap-2 text-left">
            {heading}
            <Icon name="right" className={`h-3 w-3 transition-transform group-hover:translate-x-0.5 ${s.muted}`} />
          </button>
        ) : (
          heading
        )}
        {action}
      </div>
      <div className="nivra-scroll flex flex-1 flex-col px-4 py-2 lg:min-h-0 lg:overflow-y-auto">{children}</div>
    </section>
  )
}
