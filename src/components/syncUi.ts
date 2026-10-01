import type { ReactNode } from 'react'
import { Switch, button, ghost, input, line } from './ui'

// Classic and Initiative style their controls differently; the sync UI takes
// its look from this set so both share the same logic.
export type SyncUi = {
  button: string
  ghost: string
  input: string
  line: string
  faint: string
  muted: string
  hoverText: string
  Switch: (p: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) => ReactNode
}

export const classicUi: SyncUi = {
  button,
  ghost,
  input,
  line,
  faint: 'text-neutral-400 dark:text-neutral-500',
  muted: 'text-neutral-500 dark:text-neutral-400',
  hoverText: 'hover:text-neutral-900 dark:hover:text-white',
  Switch,
}
