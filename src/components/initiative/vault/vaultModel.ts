export type VaultNote = { id: string; title: string; body: string; created: number; updated: number; folder?: string }

export type VaultFolder = { id: string; name: string; parent?: string }

export type GNode = { id: string; label: string; ghost: boolean; folder: boolean; tags: string[]; degree: number }
export type GEdge = { from: string; to: string; folder?: boolean }

export const norm = (value: string) => value.trim().toLowerCase()

const LINK = /!?\[\[([^[\]|]+?)(?:\|([^[\]]+))?\]\]/g

const baseName = (target: string) => {
  const clean = target.split('#')[0].split('^')[0].trim()
  const at = clean.lastIndexOf('/')
  return (at >= 0 ? clean.slice(at + 1) : clean).replace(/\.md$/i, '').trim()
}

export function linkTargets(body: string) {
  const out: string[] = []
  for (const match of body.matchAll(LINK)) {
    const target = baseName(match[1])
    if (target) out.push(target)
  }
  return out
}

export function tagsOf(body: string) {
  const set = new Set<string>()
  for (const match of body.matchAll(/(^|\s)#([\p{L}\p{N}_/-]+)/gu)) set.add(match[2].toLowerCase())
  return [...set]
}

export function titleIndex(notes: VaultNote[]) {
  return new Map(notes.map((n) => [norm(n.title), n.id]))
}

export function buildGraph(notes: VaultNote[], folders: VaultFolder[], options: { ghosts: boolean; folders: boolean }) {
  const byTitle = titleIndex(notes)
  const nodes = new Map<string, GNode>()
  for (const note of notes) nodes.set(note.id, { id: note.id, label: note.title, ghost: false, folder: false, tags: tagsOf(note.body), degree: 0 })
  const seen = new Set<string>()
  const edges: GEdge[] = []
  const connect = (from: string, to: string, folder?: boolean) => {
    const key = `${from}>${to}`
    if (seen.has(key)) return
    seen.add(key)
    edges.push({ from, to, folder })
    nodes.get(from)!.degree++
    nodes.get(to)!.degree++
  }
  for (const note of notes) {
    for (const target of new Set(linkTargets(note.body).map(norm))) {
      const resolved = byTitle.get(target)
      if (resolved === note.id) continue
      let to = resolved
      if (!to) {
        if (!options.ghosts) continue
        to = `ghost:${target}`
        if (!nodes.has(to)) {
          const label = linkTargets(note.body).find((x) => norm(x) === target) ?? target
          nodes.set(to, { id: to, label, ghost: true, folder: false, tags: [], degree: 0 })
        }
      }
      connect(note.id, to)
    }
  }
  if (options.folders) {
    for (const f of folders) nodes.set(`folder:${f.id}`, { id: `folder:${f.id}`, label: f.name, ghost: false, folder: true, tags: [], degree: 0 })
    for (const f of folders) if (f.parent && nodes.has(`folder:${f.parent}`)) connect(`folder:${f.parent}`, `folder:${f.id}`, true)
    for (const n of notes) if (n.folder && nodes.has(`folder:${n.folder}`)) connect(`folder:${n.folder}`, n.id, true)
  }
  return { nodes: [...nodes.values()], edges }
}

export function backlinksOf(notes: VaultNote[], note: VaultNote) {
  const title = norm(note.title)
  return notes.filter((n) => n.id !== note.id && linkTargets(n.body).some((t) => norm(t) === title))
}

export function unlinkedMentions(notes: VaultNote[], note: VaultNote) {
  const title = norm(note.title)
  if (title.length < 3) return []
  return notes.filter(
    (n) => n.id !== note.id && n.body.toLowerCase().includes(title) && !linkTargets(n.body).some((t) => norm(t) === title),
  )
}

export function renameLinks(notes: VaultNote[], oldTitle: string, newTitle: string) {
  const oldKey = norm(oldTitle)
  return notes.map((n) => {
    const body = n.body.replace(LINK, (whole, target: string, alias?: string) => {
      if (norm(baseName(target)) !== oldKey) return whole
      const embed = whole.startsWith('!') ? '!' : ''
      const hash = target.includes('#') ? target.slice(target.indexOf('#')) : ''
      return `${embed}[[${newTitle}${hash}${alias ? `|${alias}` : ''}]]`
    })
    return body === n.body ? n : { ...n, body }
  })
}

export function linkMention(body: string, title: string) {
  const at = body.toLowerCase().indexOf(title.toLowerCase())
  if (at < 0) return body
  return `${body.slice(0, at)}[[${body.slice(at, at + title.length)}]]${body.slice(at + title.length)}`
}

export function neighborhood(edges: GEdge[], start: string, depth: number) {
  const adjacent = new Map<string, string[]>()
  for (const e of edges) {
    adjacent.set(e.from, [...(adjacent.get(e.from) ?? []), e.to])
    adjacent.set(e.to, [...(adjacent.get(e.to) ?? []), e.from])
  }
  const reached = new Set([start])
  let frontier = [start]
  for (let i = 0; i < depth; i++) {
    const next: string[] = []
    for (const id of frontier) {
      for (const other of adjacent.get(id) ?? []) {
        if (!reached.has(other)) {
          reached.add(other)
          next.push(other)
        }
      }
    }
    frontier = next
  }
  return reached
}

export function tagHue(tag: string) {
  let h = 0
  for (const ch of tag) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

export function snippetOf(body: string, length = 90) {
  return body
    .replace(/^---\n[\s\S]*?\n---\n?/, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`[\]|=~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, length)
}

export function wordCount(body: string) {
  const text = body.replace(/\s+/g, ' ').trim()
  return text === '' ? 0 : text.split(' ').length
}

export function descendantFolders(folders: VaultFolder[], id: string) {
  const out = new Set<string>([id])
  let grew = true
  while (grew) {
    grew = false
    for (const f of folders) {
      if (f.parent && out.has(f.parent) && !out.has(f.id)) {
        out.add(f.id)
        grew = true
      }
    }
  }
  return out
}

export function folderPath(folders: VaultFolder[], id?: string) {
  const parts: string[] = []
  let cursor = id
  let guard = 0
  while (cursor && guard++ < 50) {
    const folder = folders.find((f) => f.id === cursor)
    if (!folder) break
    parts.unshift(folder.name)
    cursor = folder.parent
  }
  return parts.join(' / ')
}
