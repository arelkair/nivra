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

export function centralFolder(notes: VaultNote[], folders: VaultFolder[]): string | null {
  const tops = folders.filter((f) => !f.parent)
  if (tops.length !== 1) return null
  if (notes.some((n) => !n.folder)) return null
  return tops[0].id
}

export type Point = { x: number; y: number }

export function radialLayout(nodes: GNode[], edges: GEdge[], centralId: string | null): Map<string, Point> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const children = new Map<string, string[]>()
  const parented = new Set<string>()
  for (const e of edges) {
    if (!e.folder) continue
    children.set(e.from, [...(children.get(e.from) ?? []), e.to])
    parented.add(e.to)
  }
  const rootKey = centralId && byId.has(`folder:${centralId}`) ? `folder:${centralId}` : ''
  const top = rootKey ? children.get(rootKey) ?? [] : nodes.filter((n) => !n.ghost && !parented.has(n.id)).map((n) => n.id)
  const kids = (id: string) => {
    const list = id === rootKey ? top : children.get(id) ?? []
    return [...list].sort((a, b) => {
      const na = byId.get(a)!
      const nb = byId.get(b)!
      return Number(nb.folder) - Number(na.folder) || na.label.localeCompare(nb.label)
    })
  }

  const leaves = new Map<string, number>()
  const count = (id: string, guard = 0): number => {
    const list = guard > 40 ? [] : kids(id)
    const total = list.length === 0 ? 1 : list.reduce((sum, child) => sum + count(child, guard + 1), 0)
    leaves.set(id, total)
    return total
  }
  count(rootKey)

  const perDepth: number[] = []
  const tally = (id: string, depth: number, guard = 0) => {
    if (guard > 40) return
    for (const child of kids(id)) {
      perDepth[depth] = (perDepth[depth] ?? 0) + 1
      tally(child, depth + 1, guard + 1)
    }
  }
  tally(rootKey, 1)

  const STEP = 118
  const rings: number[] = [0]
  for (let d = 1; d < perDepth.length; d++) {
    const needed = ((perDepth[d] ?? 0) * 58) / (2 * Math.PI)
    rings[d] = Math.max(rings[d - 1] + STEP * 0.85, d * STEP * 0.85, needed)
  }

  const out = new Map<string, Point>()
  if (rootKey) out.set(rootKey, { x: 0, y: 0 })
  const place = (id: string, depth: number, from: number, to: number, guard = 0) => {
    if (guard > 40) return
    const list = kids(id)
    const total = list.reduce((sum, child) => sum + (leaves.get(child) ?? 1), 0) || 1
    let cursor = from
    for (const child of list) {
      const span = ((to - from) * (leaves.get(child) ?? 1)) / total
      const angle = cursor + span / 2
      out.set(child, { x: Math.cos(angle) * rings[depth], y: Math.sin(angle) * rings[depth] })
      place(child, depth + 1, cursor, cursor + span, guard + 1)
      cursor += span
    }
  }
  place(rootKey, 1, -Math.PI / 2, (3 * Math.PI) / 2)

  const outer = (rings[rings.length - 1] ?? 0) + 52
  const links = new Map<string, Point[]>()
  for (const e of edges) {
    if (e.folder) continue
    for (const [a, b] of [[e.from, e.to], [e.to, e.from]] as const) {
      const at = out.get(b)
      if (byId.get(a)?.ghost && at) links.set(a, [...(links.get(a) ?? []), at])
    }
  }
  const ghosts = nodes.filter((n) => n.ghost)
  ghosts.forEach((g, i) => {
    const near = links.get(g.id)
    const cx = near?.length ? near.reduce((acc, p) => acc + p.x, 0) / near.length : 0
    const cy = near?.length ? near.reduce((acc, p) => acc + p.y, 0) / near.length : 0
    const angle = near?.length ? Math.atan2(cy, cx) : (i / Math.max(1, ghosts.length)) * Math.PI * 2
    const radius = near?.length ? Math.min(outer, Math.hypot(cx, cy) + 70) : outer
    out.set(g.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
  })
  for (const n of nodes) if (!out.has(n.id)) out.set(n.id, { x: 0, y: 0 })
  return out
}
