import type { ReactNode } from 'react'
import { input, line } from '../ui'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-xs text-neutral-400 dark:text-neutral-500">{label}</span>
      {children}
    </label>
  )
}

export function NumberInput({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
}) {
  return (
    <Field label={label}>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${input} font-mono`}
      />
    </Field>
  )
}

export function Result({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className={`rounded-2xl border bg-[var(--sunken)] px-4 py-3 ${line}`}>
      {label && <p className="text-xs text-neutral-400 dark:text-neutral-500">{label}</p>}
      <p className="font-mono text-2xl font-medium tracking-tight tabular-nums break-words">{children}</p>
    </div>
  )
}
