import { SECTIONS, type Section } from '../sections'

export type AppLink = { section: Section; id?: string }

export type LinkTarget = { section: Section; id: string; label: string }

export const APP_SCHEME = 'nivra:'

export const appHref = (section: Section, id?: string) => `${APP_SCHEME}${section}${id ? `/${encodeURIComponent(id)}` : ''}`

export function parseAppLink(href: string): AppLink | null {
  if (!href.startsWith(APP_SCHEME)) return null
  const [name, ...rest] = href.slice(APP_SCHEME.length).split('/')
  const section = SECTIONS.find((x) => x.id === name)?.id ?? (name === 'ajustes' ? 'ajustes' : null)
  if (!section) return null
  const id = rest.join('/')
  return { section, id: id ? decodeURIComponent(id) : undefined }
}
