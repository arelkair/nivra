export type Skin = ReturnType<typeof skin>

export function skin(dark: boolean) {
  return {
    dark,
    line: dark ? 'border-white/10' : 'border-black/[0.08]',
    divide: dark ? 'divide-white/10' : 'divide-black/[0.08]',
    muted: dark ? 'text-neutral-500' : 'text-neutral-500',
    faint: dark ? 'text-neutral-600' : 'text-neutral-400',
    strong: dark ? 'text-white' : 'text-neutral-900',
    hover: dark ? 'hover:bg-white/5' : 'hover:bg-black/[0.03]',
    hoverText: dark ? 'hover:text-white' : 'hover:text-neutral-900',
    active: dark ? 'bg-white/10 text-white' : 'bg-black/[0.06] text-neutral-900',
    selectedCell: dark ? 'bg-white/[0.07]' : 'bg-black/[0.045]',
    panel: dark ? 'bg-white/[0.03]' : 'bg-white',
    primary: dark ? 'bg-white text-neutral-900 hover:bg-neutral-200' : 'bg-neutral-900 text-white hover:bg-neutral-700',
    field: `w-full rounded-lg border bg-transparent px-3 py-2 text-base sm:text-sm outline-none transition-colors placeholder:text-neutral-500 ${
      dark ? 'border-white/10 focus:border-white/35' : 'border-black/[0.1] focus:border-black/40'
    }`,
    ghost: `rounded-lg border px-3 py-1.5 text-xs transition-colors pointer-coarse:py-2.5 ${
      dark
        ? 'border-white/10 text-neutral-400 hover:bg-white/5 hover:text-white'
        : 'border-black/[0.1] text-neutral-500 hover:bg-black/[0.03] hover:text-neutral-900'
    }`,
    iconButton: `grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors pointer-coarse:h-10 pointer-coarse:w-10 ${
      dark
        ? 'border-white/10 text-neutral-400 hover:bg-white/5 hover:text-white'
        : 'border-black/[0.1] text-neutral-500 hover:bg-black/[0.03] hover:text-neutral-900'
    }`,
  }
}

export const DOT: Record<string, string> = {
  festividad: 'bg-purple-500',
  tarea: 'bg-blue-500',
  examen: 'bg-red-500',
  proyecto: 'bg-emerald-500',
}

export const SPECIAL_GRADIENT =
  'bg-[linear-gradient(135deg,#ec4899_0%,#8b5cf6_35%,#3b82f6_60%,#06b6d4_80%,#22c55e_100%)]'

export const gradeTone = (v: number) => (v >= 9 ? 'text-emerald-500' : v >= 5 ? '' : 'text-red-500')

export type NoteRef = { id: string; title: string }
