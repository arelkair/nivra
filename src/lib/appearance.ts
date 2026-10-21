export type Palette = { background: string; surface: string; text: string; accent: string }
export type CustomTheme = { name: string; light: Palette; dark: Palette }
export const DEFAULT_THEME: CustomTheme = {
  name: 'Mi tema',
  light: { background: '#faf9f6', surface: '#f0efeb', text: '#292825', accent: '#7861a8' },
  dark: { background: '#202020', surface: '#272727', text: '#e1dfda', accent: '#b4a0df' },
}
export const validColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value)
