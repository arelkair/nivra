import { norm, type VaultFolder, type VaultNote } from './vaultModel'

export type ImportResult = { notes: VaultNote[]; folders: VaultFolder[]; skipped: number }

type Entry = { file: File; parts: string[] }

const pathOf = (file: File) => {
  const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath
  return relative && relative.length > 0 ? relative : file.name
}

export async function importObsidian(files: File[], existing: VaultFolder[], takenTitles: Set<string>): Promise<ImportResult> {
  const hasRoot = files.some((f) => pathOf(f).includes('/'))
  const entries: Entry[] = []
  let skipped = 0

  for (const file of files) {
    const parts = pathOf(file).split('/').filter(Boolean)
    const trimmed = hasRoot && parts.length > 1 ? parts.slice(1) : parts
    if (trimmed.some((p) => p.startsWith('.'))) {
      skipped++
      continue
    }
    if (!/\.md$/i.test(file.name)) {
      skipped++
      continue
    }
    entries.push({ file, parts: trimmed })
  }

  const folders: VaultFolder[] = []
  const byPath = new Map<string, string>()
  for (const f of existing) if (!f.parent) byPath.set(norm(f.name), f.id)

  const folderFor = (segments: string[]) => {
    let parent: string | undefined
    let key = ''
    for (const segment of segments) {
      key = `${key}/${norm(segment)}`
      let id = byPath.get(key)
      if (!id) {
        id = crypto.randomUUID()
        byPath.set(key, id)
        folders.push({ id, name: segment, parent })
      }
      parent = id
    }
    return parent
  }

  const titles = new Set(takenTitles)
  const notes: VaultNote[] = []

  for (const entry of entries) {
    const folder = folderFor(entry.parts.slice(0, -1))
    let title = entry.parts[entry.parts.length - 1].replace(/\.md$/i, '').trim() || 'Sin título'
    if (titles.has(norm(title))) {
      const owner = entry.parts.length > 1 ? entry.parts[entry.parts.length - 2] : ''
      let candidate = owner ? `${title} (${owner})` : title
      let n = 2
      while (titles.has(norm(candidate))) candidate = `${title} (${owner || ''}${owner ? ' ' : ''}${n++})`
      title = candidate
    }
    titles.add(norm(title))
    const body = await entry.file.text()
    const time = entry.file.lastModified || Date.now()
    notes.push({ id: crypto.randomUUID(), title, body, created: time, updated: time, folder })
  }

  return { notes, folders, skipped }
}
