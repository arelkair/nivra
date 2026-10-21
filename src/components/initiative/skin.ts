export type Skin = ReturnType<typeof skin>

export function skin(dark: boolean) {
  return {
    dark,
    line: 'border-(--minimal-line)',
    divide: 'divide-(--minimal-line)',
    muted: 'text-(--minimal-muted)',
    faint: 'text-(--minimal-muted)',
    strong: 'text-(--minimal-text)',
    hover: dark ? 'hover:bg-white/5' : 'hover:bg-black/[0.03]',
    hoverText: dark ? 'hover:text-white' : 'hover:text-neutral-900',
    active: 'bg-(--sunken) text-(--minimal-accent)',
    selectedCell: dark ? 'bg-white/[0.07]' : 'bg-black/[0.045]',
    panel: 'nv-panel',
    primary: `nv-primary ${dark ? 'bg-white text-neutral-900 hover:bg-neutral-200' : 'bg-neutral-900 text-white hover:bg-neutral-700'}`,
    field: `nv-field w-full rounded-lg border bg-transparent px-3 py-2 text-base sm:text-sm outline-none transition-colors placeholder:text-neutral-500 ${
      dark ? 'border-white/[0.12] focus:border-white/40' : 'border-black/[0.12] focus:border-black/45'
    }`,
    ghost: `nv-ghost rounded-lg border px-3 py-1.5 text-xs transition-colors pointer-coarse:py-2.5 ${
      dark
        ? 'border-white/[0.12] text-neutral-400 hover:bg-white/5 hover:text-white'
        : 'border-black/[0.12] text-neutral-600 hover:bg-black/[0.03] hover:text-neutral-900'
    }`,
    iconButton: `nv-iconbtn grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors pointer-coarse:h-10 pointer-coarse:w-10 ${
      dark
        ? 'border-white/[0.12] text-neutral-400 hover:bg-white/5 hover:text-white'
        : 'border-black/[0.12] text-neutral-600 hover:bg-black/[0.03] hover:text-neutral-900'
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
