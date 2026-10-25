export type Palette = { background: string; surface: string; text: string; accent: string }
export type CustomTheme = { name: string; light: Palette; dark: Palette }

export const PALETTE_FIELDS: { key: keyof Palette; label: string }[] = [
  { key: 'accent', label: 'Color destacado' },
  { key: 'background', label: 'Fondo' },
  { key: 'surface', label: 'Paneles' },
  { key: 'text', label: 'Texto' },
]

export const DEFAULT_THEME: CustomTheme = {
  name: 'Mi tema',
  light: { background: '#faf9f6', surface: '#ffffff', text: '#292825', accent: '#6b5599' },
  dark: { background: '#202020', surface: '#252525', text: '#e1dfda', accent: '#b4a0df' },
}

export const validColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value)

export function applyAppearance(root: HTMLElement, theme: CustomTheme, on: boolean, contrast: boolean, largeText: boolean, dyslexia: boolean) {
  root.dataset.customTheme = String(on)
  root.dataset.contrast = contrast ? 'high' : 'normal'
  root.dataset.largeText = String(largeText)
  root.dataset.dyslexia = String(dyslexia)
  for (const mode of ['light', 'dark'] as const) {
    for (const { key } of PALETTE_FIELDS) {
      const value = theme[mode]?.[key]
      if (value && validColor(value)) root.style.setProperty(`--custom-${mode}-${key}`, value)
    }
  }
}

export function clearAppearance(root: HTMLElement) {
  delete root.dataset.customTheme
  delete root.dataset.contrast
  delete root.dataset.largeText
  delete root.dataset.dyslexia
  for (const mode of ['light', 'dark']) {
    for (const { key } of PALETTE_FIELDS) root.style.removeProperty(`--custom-${mode}-${key}`)
  }
}
