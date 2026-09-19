import { norm, type VaultFolder, type VaultNote } from './vaultModel'

export type ImportResult = { notes: VaultNote[]; folders: VaultFolder[]; skipped: number }

type Entry = { file: File; parts: string[] }

const NOTE_FILE = /\.(md|markdown|txt)$/i

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
    if (!NOTE_FILE.test(file.name)) {
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
    let title = entry.parts[entry.parts.length - 1].replace(NOTE_FILE, '').trim() || 'Sin título'
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

type DroppedEntry = {
  isFile: boolean
  isDirectory: boolean
  fullPath: string
  file?: (callback: (file: File) => void, fail?: () => void) => void
  createReader?: () => { readEntries: (callback: (entries: DroppedEntry[]) => void, fail?: () => void) => void }
}

const walk = async (entry: DroppedEntry, out: File[]) => {
  if (entry.isFile && entry.file) {
    const file = await new Promise<File | null>((resolve) => entry.file!(resolve, () => resolve(null)))
    if (!file) return
    Object.defineProperty(file, 'webkitRelativePath', { value: entry.fullPath.replace(/^\//, '') })
    out.push(file)
  } else if (entry.isDirectory && entry.createReader) {
    const reader = entry.createReader()
    for (;;) {
      const batch = await new Promise<DroppedEntry[]>((resolve) => reader.readEntries(resolve, () => resolve([])))
      if (batch.length === 0) break
      for (const child of batch) await walk(child, out)
    }
  }
}

export async function readDropped(transfer: DataTransfer): Promise<File[]> {
  const out: File[] = []
  const entries = [...transfer.items].map((item) => (item as DataTransferItem & { webkitGetAsEntry?: () => DroppedEntry | null }).webkitGetAsEntry?.() ?? null)
  if (entries.some(Boolean)) {
    for (const entry of entries) if (entry) await walk(entry, out)
    return out
  }
  return [...transfer.files]
}
