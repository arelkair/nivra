import { useEffect, useMemo, useRef, useState } from 'react'
import { dateKey } from '../../lib/store'
import { notify, notifyWithUndo } from '../../lib/undo'
import { t, tp } from '../../lib/i18n'
import { playDrop, playPop } from '../../lib/sound'
import { Icon } from '../ui'
import { skin, type Skin } from './skin'
import { ContextMenu, type MenuItem, type MenuState } from './vault/ContextMenu'
import { GraphView } from './vault/GraphView'
import { importObsidian } from './vault/importer'
import { MarkdownView } from './vault/MarkdownView'
import {
  backlinksOf,
  descendantFolders,
  folderPath,
  linkMention,
  linkTargets,
  norm,
  renameLinks,
  snippetOf,
  tagHue,
  tagsOf,
  titleIndex,
  unlinkedMentions,
  wordCount,
  type VaultFolder,
  type VaultNote,
} from './vault/vaultModel'

type Props = {
  dark: boolean
  notes: VaultNote[]
  setNotes: (update: (prev: VaultNote[]) => VaultNote[]) => void
  folders: VaultFolder[]
  setFolders: (update: (prev: VaultFolder[]) => VaultFolder[]) => void
  focusId: string | null
  onFocusHandled: () => void
}

type Tab = 'notas' | 'grafo'
type Mode = 'editar' | 'vista'

const FOLDER_COLOR = '#f59e0b'

const WELCOME: { title: string; body: string }[] = [
  {
    title: 'Bienvenida',
    body: '# Bienvenida\n\nEsta es tu bóveda: notas conectadas entre sí.\n\n- Enlaza notas escribiendo [[Enlaces]].\n- Organízalas en carpetas y con etiquetas como #ideas.\n- Mira cómo se conectan en la pestaña **Grafo**.\n\nSiguiente: [[Enlaces]] y [[Etiquetas]].',
  },
  {
    title: 'Enlaces',
    body: '# Enlaces\n\nEscribe `[[` y elige una nota para enlazarla. Si la nota no existe, aparece en el grafo como un nodo por crear, como [[Una idea nueva]].\n\nVuelve a [[Bienvenida]].\n\n| Atajo | Qué hace |\n| --- | --- |\n| Ctrl+B | Negrita |\n| Ctrl+K | Enlace a nota |\n\n- [ ] Crear mi primera nota\n- [x] Leer esta nota',
  },
  {
    title: 'Etiquetas',
    body: '# Etiquetas\n\nCualquier palabra con almohadilla es una etiqueta: #ideas #estudio. En el grafo, cada etiqueta tiene su color.\n\nEnlaces relacionados: [[Enlaces]], [[Bienvenida]].',
  },
]

export function InitiativeVault({ dark, notes, setNotes, folders, setFolders, focusId, onFocusHandled }: Props) {
  const s = skin(dark)
  const [tab, setTab] = useState<Tab>('notas')
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id ?? null)
  const [mode, setMode] = useState<Mode>('vista')
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [mobileEditor, setMobileEditor] = useState(false)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuState>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const dragging = useRef<{ kind: 'note' | 'folder'; id: string } | null>(null)
  const importInput = useRef<HTMLInputElement>(null)
  const active = notes.find((n) => n.id === activeId) ?? null
  const index = useMemo(() => titleIndex(notes), [notes])

  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const n of notes) for (const tag of tagsOf(n.body)) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [notes])

  const q = norm(query)
  const filtering = q !== '' || tagFilter !== ''
  const flat = [...notes]
    .sort((a, b) => b.updated - a.updated)
    .filter((n) => (!tagFilter || tagsOf(n.body).includes(tagFilter)) && (!q || norm(n.title).includes(q) || n.body.toLowerCase().includes(q)))

  const uniqueTitle = (base: string) => {
    let title = base
    let n = 2
    while (index.has(norm(title))) title = `${base} ${n++}`
    return title
  }

  const reveal = (folderId?: string) => {
    if (!folderId) return
    setOpen((prev) => {
      const next = new Set(prev)
      let cursor: string | undefined = folderId
      let guard = 0
      while (cursor && guard++ < 50) {
        next.add(cursor)
        cursor = folders.find((f) => f.id === cursor)?.parent
      }
      return next
    })
  }

  const focusNote = (id: string) => {
    setActiveId(id)
    setMobileEditor(true)
    setTab('notas')
    reveal(notes.find((n) => n.id === id)?.folder)
  }

  const focusRef = useRef(focusNote)
  focusRef.current = focusNote
  const handledRef = useRef(onFocusHandled)
  handledRef.current = onFocusHandled

  useEffect(() => {
    if (!focusId) return
    if (notes.some((n) => n.id === focusId)) {
      focusRef.current(focusId)
      setMode('vista')
    }
    handledRef.current()
  }, [focusId, notes])

  const create = (title?: string, body = '', folder?: string) => {
    playPop()
    const id = crypto.randomUUID()
    const now = Date.now()
    const name = uniqueTitle(title?.trim() || t('Sin título'))
    setNotes((prev) => [...prev, { id, title: name, body, created: now, updated: now, folder }])
    reveal(folder)
    setActiveId(id)
    setMode('editar')
    setTab('notas')
    setMobileEditor(true)
    return id
  }

  const openByTitle = (title: string) => {
    const id = index.get(norm(title))
    if (id) focusNote(id)
    else create(title)
  }

  const patch = (id: string, changes: Partial<VaultNote>) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...changes, updated: Date.now() } : n)))

  const rename = (note: VaultNote, title: string) => {
    const clean = title.trim()
    if (!clean || clean === note.title) return
    if (index.has(norm(clean)) && index.get(norm(clean)) !== note.id) return
    setNotes((prev) => renameLinks(prev, note.title, clean).map((n) => (n.id === note.id ? { ...n, title: clean, updated: Date.now() } : n)))
  }

  const removeNote = (note: VaultNote) => {
    playDrop()
    const before = notes
    const at = notes.findIndex((n) => n.id === note.id)
    const rest = notes.filter((n) => n.id !== note.id)
    setNotes(() => rest)
    if (activeId === note.id) setActiveId(rest[Math.min(at, rest.length - 1)]?.id ?? null)
    setMobileEditor(false)
    notifyWithUndo(tp('«{0}» eliminada', note.title), () => {
      setNotes(() => before)
      setActiveId(note.id)
    })
  }

  const duplicateNote = (note: VaultNote) => {
    playPop()
    const id = crypto.randomUUID()
    const now = Date.now()
    setNotes((prev) => [...prev, { ...note, id, title: uniqueTitle(`${note.title} ${t('(copia)')}`), created: now, updated: now }])
    focusNote(id)
  }

  const moveNote = (id: string, folder?: string) => {
    patch(id, { folder })
    reveal(folder)
  }

  const siblingsName = (parent?: string, base = t('Nueva carpeta')) => {
    let name = base
    let n = 2
    while (folders.some((f) => f.parent === parent && norm(f.name) === norm(name))) name = `${base} ${n++}`
    return name
  }

  const createFolder = (parent?: string) => {
    playPop()
    const id = crypto.randomUUID()
    setFolders((prev) => [...prev, { id, name: siblingsName(parent), parent }])
    reveal(parent)
    setOpen((prev) => new Set(prev).add(id))
    setRenamingFolder(id)
    setTab('notas')
    setMobileEditor(false)
  }

  const commitFolderName = (id: string, name: string) => {
    const clean = name.trim()
    setRenamingFolder(null)
    if (!clean) return
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: clean } : f)))
  }

  const moveFolder = (id: string, parent?: string) => {
    if (parent && descendantFolders(folders, id).has(parent)) return
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, parent } : f)))
    reveal(parent)
  }

  const deleteFolder = (folder: VaultFolder, withContents: boolean) => {
    playDrop()
    const beforeNotes = notes
    const beforeFolders = folders
    if (withContents) {
      const ids = descendantFolders(folders, folder.id)
      setFolders((prev) => prev.filter((f) => !ids.has(f.id)))
      setNotes((prev) => prev.filter((n) => !(n.folder && ids.has(n.folder))))
      if (active?.folder && ids.has(active.folder)) setActiveId(null)
    } else {
      setFolders((prev) => prev.filter((f) => f.id !== folder.id).map((f) => (f.parent === folder.id ? { ...f, parent: folder.parent } : f)))
      setNotes((prev) => prev.map((n) => (n.folder === folder.id ? { ...n, folder: folder.parent } : n)))
    }
    notifyWithUndo(tp('«{0}» eliminada', folder.name), () => {
      setNotes(() => beforeNotes)
      setFolders(() => beforeFolders)
    })
  }

  const daily = () => openByTitle(dateKey(new Date()))

  const seed = () => {
    playPop()
    const now = Date.now()
    const created = WELCOME.map((w, i) => ({ id: crypto.randomUUID(), title: w.title, body: w.body, created: now + i, updated: now + i }))
    setNotes((prev) => [...prev, ...created])
    setActiveId(created[0].id)
    setMode('vista')
  }

  const importFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return
    const result = await importObsidian(Array.from(list), folders, new Set(notes.map((n) => norm(n.title))))
    if (importInput.current) importInput.current.value = ''
    if (result.notes.length === 0) {
      notify(t('No se han encontrado notas .md para importar.'))
      return
    }
    const noteIds = new Set(result.notes.map((n) => n.id))
    const folderIds = new Set(result.folders.map((f) => f.id))
    setFolders((prev) => [...prev, ...result.folders])
    setNotes((prev) => [...prev, ...result.notes])
    setActiveId(result.notes[0].id)
    setOpen((prev) => new Set([...prev, ...folderIds]))
    notifyWithUndo(tp('Importadas {0} notas y {1} carpetas.', result.notes.length, result.folders.length), () => {
      setNotes((prev) => prev.filter((n) => !noteIds.has(n.id)))
      setFolders((prev) => prev.filter((f) => !folderIds.has(f.id)))
    })
  }

  const showMenu = (e: React.MouseEvent, items: MenuItem[]) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, items })
  }

  const noop = () => {}

  const noteMenu = (note: VaultNote): MenuItem[] => [
    { label: t('Abrir'), onSelect: () => focusNote(note.id) },
    { label: t('Duplicar'), onSelect: () => duplicateNote(note) },
    ...(folders.length > 0 || note.folder
      ? [
          { label: '', separator: true, onSelect: noop },
          ...(note.folder ? [{ label: t('Mover a la raíz'), onSelect: () => moveNote(note.id, undefined) }] : []),
          ...folders
            .filter((f) => f.id !== note.folder)
            .map((f) => ({ label: `${t('Mover a')} ${folderPath(folders, f.id)}`, onSelect: () => moveNote(note.id, f.id) })),
        ]
      : []),
    { label: '', separator: true, onSelect: noop },
    { label: t('Eliminar nota'), danger: true, onSelect: () => removeNote(note) },
  ]

  const folderMenu = (folder: VaultFolder): MenuItem[] => [
    { label: t('Nueva nota aquí'), onSelect: () => create(undefined, '', folder.id) },
    { label: t('Nueva subcarpeta'), onSelect: () => createFolder(folder.id) },
    { label: t('Renombrar'), onSelect: () => setRenamingFolder(folder.id) },
    { label: '', separator: true, onSelect: noop },
    { label: t('Eliminar carpeta (conservar notas)'), danger: true, onSelect: () => deleteFolder(folder, false) },
    { label: t('Eliminar carpeta y su contenido'), danger: true, onSelect: () => deleteFolder(folder, true) },
  ]

  const backgroundMenu: MenuItem[] = [
    { label: t('Nueva nota'), onSelect: () => create() },
    { label: t('Nueva carpeta'), onSelect: () => createFolder() },
  ]

  const dropOn = (target: string | null) => {
    const drag = dragging.current
    dragging.current = null
    setDropTarget(null)
    if (!drag) return
    const folder = target && target !== 'root' ? target : undefined
    if (drag.kind === 'note') moveNote(drag.id, folder)
    else moveFolder(drag.id, folder)
  }

  const dropProps = (target: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!dragging.current) return
      e.preventDefault()
      e.stopPropagation()
      setDropTarget(target)
    },
    onDragLeave: () => setDropTarget((prev) => (prev === target ? null : prev)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dropOn(target)
    },
  })

  const countIn = (id: string) => {
    const ids = descendantFolders(folders, id)
    return notes.filter((n) => n.folder && ids.has(n.folder)).length
  }

  const noteRow = (n: VaultNote, depth: number, showPath = false) => (
    <li key={n.id}>
      <button
        type="button"
        draggable
        onDragStart={() => (dragging.current = { kind: 'note', id: n.id })}
        onDragEnd={() => {
          dragging.current = null
          setDropTarget(null)
        }}
        onContextMenu={(e) => showMenu(e, noteMenu(n))}
        onClick={() => focusNote(n.id)}
        aria-current={n.id === active?.id}
        style={{ paddingLeft: 16 + depth * 14 }}
        className={`flex w-full flex-col gap-0.5 py-2.5 pr-4 text-left transition-colors ${n.id === active?.id ? s.selectedCell : s.hover}`}
      >
        <span className="truncate text-sm font-medium">{n.title}</span>
        <span className={`truncate text-xs ${s.faint}`}>
          {showPath && n.folder ? `${folderPath(folders, n.folder)} · ` : ''}
          {snippetOf(n.body, 70) || t('Vacío.')}
        </span>
      </button>
    </li>
  )

  const folderRow = (folder: VaultFolder, depth: number): React.ReactNode => {
    const expanded = open.has(folder.id)
    const children = folders.filter((f) => f.parent === folder.id).sort((a, b) => a.name.localeCompare(b.name))
    const inside = notes.filter((n) => n.folder === folder.id).sort((a, b) => a.title.localeCompare(b.title))
    return (
      <li key={folder.id}>
        <div
          draggable={renamingFolder !== folder.id}
          onDragStart={() => (dragging.current = { kind: 'folder', id: folder.id })}
          onDragEnd={() => {
            dragging.current = null
            setDropTarget(null)
          }}
          {...dropProps(folder.id)}
          onContextMenu={(e) => showMenu(e, folderMenu(folder))}
          style={{ paddingLeft: 10 + depth * 14 }}
          className={`flex items-center gap-2 py-2 pr-3 transition-colors ${dropTarget === folder.id ? (dark ? 'bg-white/10' : 'bg-black/[0.07]') : s.hover}`}
        >
          <button
            type="button"
            onClick={() =>
              setOpen((prev) => {
                const next = new Set(prev)
                if (next.has(folder.id)) next.delete(folder.id)
                else next.add(folder.id)
                return next
              })
            }
            aria-expanded={expanded}
            aria-label={folder.name}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <Icon name={expanded ? 'down' : 'right'} className={`h-3 w-3 shrink-0 ${s.muted}`} />
            <span style={{ color: FOLDER_COLOR }}>
              <Icon name="folder" className="h-4 w-4 shrink-0" />
            </span>
            {renamingFolder === folder.id ? (
              <input
                autoFocus
                defaultValue={folder.name}
                maxLength={60}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={(e) => commitFolderName(folder.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  if (e.key === 'Escape') setRenamingFolder(null)
                }}
                aria-label={t('Nombre de la carpeta')}
                className={`${s.field} min-w-0 flex-1 !py-0.5 text-sm`}
              />
            ) : (
              <span className="truncate text-sm font-medium">{folder.name}</span>
            )}
          </button>
          <span className={`shrink-0 text-[0.65rem] tabular-nums ${s.faint}`}>{countIn(folder.id)}</span>
        </div>
        {expanded && (
          <ul>
            {children.map((c) => folderRow(c, depth + 1))}
            {inside.map((n) => noteRow(n, depth + 1))}
            {children.length === 0 && inside.length === 0 && (
              <li style={{ paddingLeft: 38 + depth * 14 }} className={`py-2 text-xs ${s.faint}`}>
                {t('Carpeta vacía.')}
              </li>
            )}
          </ul>
        )}
      </li>
    )
  }

  const rootFolders = folders.filter((f) => !f.parent || !folders.some((x) => x.id === f.parent)).sort((a, b) => a.name.localeCompare(b.name))
  const rootNotes = notes.filter((n) => !n.folder || !folders.some((f) => f.id === n.folder)).sort((a, b) => a.title.localeCompare(b.title))
  const empty = notes.length === 0 && folders.length === 0

  const label = `font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`

  const listPane = (
    <div className={`flex min-h-0 min-w-0 flex-col gap-3 ${mobileEditor ? 'max-md:hidden' : ''}`}>
      <div className="flex items-center gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Buscar')} aria-label={t('Buscar')} className={`${s.field} min-w-0 flex-1 !py-1.5`} />
        <button type="button" onClick={() => createFolder()} aria-label={t('Nueva carpeta')} title={t('Nueva carpeta')} className={s.iconButton}>
          <Icon name="folder" className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => create()} aria-label={t('Nueva nota')} title={t('Nueva nota')} className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors ${s.primary}`}>
          <Icon name="plus" className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={daily} className={s.ghost}>
          {t('Nota de hoy')}
        </button>
        <button type="button" onClick={() => importInput.current?.click()} className={s.ghost}>
          {t('Importar de Obsidian')}
        </button>
        <input
          ref={importInput}
          type="file"
          multiple
          className="hidden"
          aria-label={t('Importar de Obsidian')}
          {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
          onChange={(e) => void importFiles(e.target.files)}
        />
      </div>
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.slice(0, 12).map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
              aria-pressed={tagFilter === tag}
              className="rounded-full px-2 py-0.5 text-[0.7rem] transition-opacity hover:opacity-80"
              style={{
                background: `hsl(${tagHue(tag)} 60% ${dark ? '28%' : '88%'})`,
                color: `hsl(${tagHue(tag)} 60% ${dark ? '80%' : '30%'})`,
                outline: tagFilter === tag ? `2px solid hsl(${tagHue(tag)} 60% 50%)` : 'none',
              }}
            >
              #{tag} {count}
            </button>
          ))}
        </div>
      )}

      {empty ? (
        <div className="flex flex-col gap-3">
          <p className={`px-1 text-sm ${s.faint}`}>{t('Tu bóveda está vacía.')}</p>
          <button type="button" onClick={seed} className={`${s.ghost} self-start`}>
            {t('Crear notas de ejemplo')}
          </button>
        </div>
      ) : filtering && flat.length === 0 ? (
        <p className={`px-1 text-sm ${s.faint}`}>{t('Nada coincide.')}</p>
      ) : (
        <ul
          onContextMenu={(e) => showMenu(e, backgroundMenu)}
          {...dropProps('root')}
          className={`nivra-scroll flex min-h-24 flex-col divide-y overflow-y-auto rounded-2xl border ${s.line} ${s.divide} ${dropTarget === 'root' ? (dark ? 'bg-white/[0.06]' : 'bg-black/[0.04]') : ''}`}
        >
          {filtering ? flat.map((n) => noteRow(n, 0, true)) : [...rootFolders.map((f) => folderRow(f, 0)), ...rootNotes.map((n) => noteRow(n, 0))]}
        </ul>
      )}
      {!empty && !filtering && <p className={`text-[0.7rem] ${s.faint}`}>{t('Clic derecho para más opciones. Arrastra notas a las carpetas.')}</p>}
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 md:h-[calc(100svh-8rem)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-initiative text-3xl font-medium tracking-tight sm:text-4xl">{t('Bóveda')}</h1>
          <p className={`mt-1 text-xs ${s.faint}`}>
            {tp('{0} notas', notes.length)} · {tp('{0} carpetas', folders.length)} ·{' '}
            {tp('{0} enlaces', notes.reduce((a, n) => a + new Set(linkTargets(n.body).map(norm)).size, 0))}
          </p>
        </div>
        <div className={`flex rounded-lg border p-0.5 ${s.line}`}>
          {(['notas', 'grafo'] as const).map((k) => (
            <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k} className={`rounded-md px-3 py-1 text-xs transition-colors ${tab === k ? s.active : `${s.muted} ${s.hoverText}`}`}>
              {k === 'notas' ? t('Notas') : t('Grafo')}
            </button>
          ))}
        </div>
      </div>

      {tab === 'grafo' ? (
        <GraphView
          notes={notes}
          folders={folders}
          onOpenFolder={(id) => {
            reveal(id)
            setOpen((prev) => new Set(prev).add(id))
            setTab('notas')
            setMobileEditor(false)
          }}
          activeId={activeId}
          onOpen={focusNote}
          onCreate={(title) => create(title)}
          dark={dark}
        />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_17rem]">
          {listPane}
          {active ? (
            <NotePane
              key={active.id}
              note={active}
              notes={notes}
              folders={folders}
              s={s}
              dark={dark}
              mode={mode}
              setMode={setMode}
              mobileVisible={mobileEditor}
              onBack={() => setMobileEditor(false)}
              onBody={(body) => patch(active.id, { body })}
              onRename={(title) => rename(active, title)}
              onRemove={() => removeNote(active)}
              onOpenTitle={openByTitle}
              onOpenId={(id) => {
                focusNote(id)
                setMode('vista')
              }}
              onTag={(tag) => setTagFilter(tag)}
              onLinkMention={(other) => patch(other.id, { body: linkMention(other.body, active.title) })}
              label={label}
            />
          ) : (
            <div className={`grid place-items-center rounded-2xl border p-10 max-md:hidden xl:col-span-2 ${s.line} ${s.panel}`}>
              <p className={`text-sm ${s.faint}`}>{t('Elige una nota o crea una nueva.')}</p>
            </div>
          )}
        </div>
      )}

      {menu && <ContextMenu menu={menu} onClose={() => setMenu(null)} dark={dark} />}
    </div>
  )
}

function tableMarkdown(rows: number, cols: number) {
  const row = (cells: string[]) => `| ${cells.join(' | ')} |`
  const head = Array.from({ length: cols }, (_, i) => `Columna ${i + 1}`)
  const blank = Array.from({ length: cols }, () => '   ')
  return [row(head), row(Array.from({ length: cols }, () => '---')), ...Array.from({ length: Math.max(1, rows - 1) }, () => row(blank))].join('\n')
}

function NotePane({
  note,
  notes,
  folders,
  s,
  dark,
  mode,
  setMode,
  mobileVisible,
  onBack,
  onBody,
  onRename,
  onRemove,
  onOpenTitle,
  onOpenId,
  onTag,
  onLinkMention,
  label,
}: {
  note: VaultNote
  notes: VaultNote[]
  folders: VaultFolder[]
  s: Skin
  dark: boolean
  mode: Mode
  setMode: (m: Mode) => void
  mobileVisible: boolean
  onBack: () => void
  onBody: (body: string) => void
  onRename: (title: string) => void
  onRemove: () => void
  onOpenTitle: (title: string) => void
  onOpenId: (id: string) => void
  onTag: (tag: string) => void
  onLinkMention: (other: VaultNote) => void
  label: string
}) {
  const [title, setTitle] = useState(note.title)
  const area = useRef<HTMLTextAreaElement>(null)
  const [suggest, setSuggest] = useState<{ start: number; items: string[]; index: number } | null>(null)
  const [tablePanel, setTablePanel] = useState(false)
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  const exists = (name: string) => notes.some((n) => norm(n.title) === norm(name))
  const backlinks = backlinksOf(notes, note)
  const mentions = unlinkedMentions(notes, note)
  const outgoing = [...new Set(linkTargets(note.body).map(norm))]
    .map((target) => ({ target, note: notes.find((n) => norm(n.title) === target) }))
    .filter((x) => x.target !== norm(note.title))
  const words = wordCount(note.body)
  const path = folderPath(folders, note.folder)

  useEffect(() => {
    if (mode === 'editar') area.current?.focus()
  }, [mode])

  useEffect(() => {
    setTitle(note.title)
  }, [note.title])

  const edit = (fn: (value: string, start: number, end: number) => { value: string; start: number; end: number }) => {
    const el = area.current
    if (!el) return
    const result = fn(el.value, el.selectionStart, el.selectionEnd)
    onBody(result.value)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(result.start, result.end)
    })
  }

  const wrap = (before: string, after: string, placeholder: string) =>
    edit((value, a, b) => {
      const selected = value.slice(a, b) || placeholder
      return { value: value.slice(0, a) + before + selected + after + value.slice(b), start: a + before.length, end: a + before.length + selected.length }
    })

  const linePrefix = (prefix: string) =>
    edit((value, a, b) => {
      const lineStart = value.lastIndexOf('\n', a - 1) + 1
      const nextBreak = value.indexOf('\n', b)
      const lineEnd = nextBreak < 0 ? value.length : nextBreak
      const block = value.slice(lineStart, lineEnd).split('\n')
      const all = block.every((l) => l.startsWith(prefix))
      const changed = block.map((l) => (all ? l.slice(prefix.length) : prefix + l.replace(/^(#{1,3}\s|[-*]\s(\[[ xX]\]\s)?|\d+\.\s|>\s)/, ''))).join('\n')
      return { value: value.slice(0, lineStart) + changed + value.slice(lineEnd), start: lineStart, end: lineStart + changed.length }
    })

  const insertBlock = (text: string) =>
    edit((value, a, b) => {
      const lead = a > 0 && value[a - 1] !== '\n' ? '\n\n' : a > 1 && value[a - 2] !== '\n' ? '\n' : ''
      const tail = '\n\n'
      const at = a + lead.length + text.length + tail.length
      return { value: value.slice(0, a) + lead + text + tail + value.slice(b), start: at, end: at }
    })

  const updateSuggest = (value: string, caret: number) => {
    const before = value.slice(0, caret)
    const open = before.lastIndexOf('[[')
    if (open < 0 || before.slice(open).includes(']]') || before.slice(open).includes('\n')) return setSuggest(null)
    const typed = norm(before.slice(open + 2))
    const items = notes
      .filter((n) => n.id !== note.id && norm(n.title).includes(typed))
      .slice(0, 6)
      .map((n) => n.title)
    setSuggest(items.length ? { start: open + 2, items, index: 0 } : null)
  }

  const accept = (name: string) => {
    const el = area.current
    if (!el || !suggest) return
    const caret = el.selectionStart
    const value = note.body
    const after = value.slice(caret).startsWith(']]') ? value.slice(caret + 2) : value.slice(caret)
    onBody(`${value.slice(0, suggest.start)}${name}]]${after}`)
    setSuggest(null)
    const position = suggest.start + name.length + 2
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(position, position)
    })
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      return wrap('**', '**', 'texto')
    }
    if (mod && e.key.toLowerCase() === 'i') {
      e.preventDefault()
      return wrap('*', '*', 'texto')
    }
    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      return wrap('[[', ']]', 'Nota')
    }
    if (suggest) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSuggest({ ...suggest, index: (suggest.index + 1) % suggest.items.length })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSuggest({ ...suggest, index: (suggest.index - 1 + suggest.items.length) % suggest.items.length })
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        accept(suggest.items[suggest.index])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setSuggest(null)
      }
      return
    }
    if (e.key === 'Enter' && !e.shiftKey && !mod) {
      const el = e.currentTarget
      const caret = el.selectionStart
      const lineStart = el.value.lastIndexOf('\n', caret - 1) + 1
      const line = el.value.slice(lineStart, caret)
      const m = /^(\s*)([-*]|\d+\.)\s(\[[ xX]\]\s)?(.*)$/.exec(line)
      if (m) {
        e.preventDefault()
        if (m[4].trim() === '' && caret === el.selectionEnd) {
          onBody(el.value.slice(0, lineStart) + el.value.slice(caret))
          requestAnimationFrame(() => el.setSelectionRange(lineStart, lineStart))
          return
        }
        const marker = /^\d+\./.test(m[2]) ? `${Number.parseInt(m[2], 10) + 1}.` : m[2]
        const insert = `\n${m[1]}${marker} ${m[3] ? '[ ] ' : ''}`
        onBody(el.value.slice(0, caret) + insert + el.value.slice(el.selectionEnd))
        const at = caret + insert.length
        requestAnimationFrame(() => el.setSelectionRange(at, at))
      }
    }
  }

  const toggleTask = (line: number) => {
    const lines = note.body.split('\n')
    lines[line] = lines[line].includes('[ ]') ? lines[line].replace('[ ]', '[x]') : lines[line].replace(/\[[xX]\]/, '[ ]')
    onBody(lines.join('\n'))
  }

  const download = () => {
    const url = URL.createObjectURL(new Blob([note.body], { type: 'text/markdown;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${note.title || 'nota'}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  const tb = `grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-sm transition-colors ${s.muted} ${s.hover} ${s.hoverText}`
  const tool = (name: string, action: () => void, content: React.ReactNode) => (
    <button key={name} type="button" title={name} aria-label={name} onClick={action} className={tb}>
      {content}
    </button>
  )
  const sep = <span className={`mx-1 h-5 w-px ${dark ? 'bg-white/10' : 'bg-black/10'}`} />

  const side = (
    <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto max-xl:hidden">
      <section className={`rounded-2xl border p-4 ${s.line} ${s.panel}`}>
        <p className={`mb-3 ${label}`}>
          {t('Enlaces entrantes')} · {backlinks.length}
        </p>
        {backlinks.length === 0 ? (
          <p className={`text-xs ${s.faint}`}>{t('Ninguna nota enlaza aquí.')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {backlinks.map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => onOpenId(b.id)} className="w-full text-left">
                  <span className="block truncate text-sm">{b.title}</span>
                  <span className={`block truncate text-[0.7rem] ${s.faint}`}>{snippetOf(b.body, 60)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`rounded-2xl border p-4 ${s.line} ${s.panel}`}>
        <p className={`mb-3 ${label}`}>
          {t('Enlaces salientes')} · {outgoing.length}
        </p>
        {outgoing.length === 0 ? (
          <p className={`text-xs ${s.faint}`}>{t('Esta nota no enlaza a otras.')}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {outgoing.map(({ target, note: found }) => (
              <li key={target}>
                <button type="button" onClick={() => (found ? onOpenId(found.id) : onOpenTitle(target))} className={`w-full truncate text-left text-sm ${found ? '' : `${s.faint} italic`}`}>
                  {found?.title ?? target}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {mentions.length > 0 && (
        <section className={`rounded-2xl border p-4 ${s.line} ${s.panel}`}>
          <p className={`mb-3 ${label}`}>
            {t('Menciones sin enlazar')} · {mentions.length}
          </p>
          <ul className="flex flex-col gap-2">
            {mentions.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <button type="button" onClick={() => onOpenId(m.id)} className="min-w-0 flex-1 truncate text-left text-sm">
                  {m.title}
                </button>
                <button type="button" onClick={() => onLinkMention(m)} className={s.ghost}>
                  {t('Enlazar')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )

  return (
    <>
      <section className={`${mobileVisible ? '' : 'max-md:hidden'} flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border max-md:min-h-[70svh] ${s.line} ${s.panel}`}>
        <div className={`flex shrink-0 items-center gap-2 border-b px-3 py-2 ${s.line}`}>
          <button type="button" onClick={onBack} aria-label={t('Volver')} className={`grid h-8 w-8 place-items-center rounded-md ${s.muted} ${s.hover} md:hidden`}>
            <Icon name="left" className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            {path && <p className={`truncate px-1 text-[0.65rem] ${s.faint}`}>{path}</p>}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                const clean = title.trim()
                const taken = notes.some((n) => n.id !== note.id && norm(n.title) === norm(clean))
                if (!clean || taken) setTitle(note.title)
                else onRename(clean)
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              maxLength={80}
              aria-label={t('Título')}
              className="w-full bg-transparent px-1 py-0.5 text-lg font-medium outline-none"
            />
          </div>
          <div className={`flex rounded-lg border p-0.5 ${s.line}`}>
            {(['vista', 'editar'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={`rounded-md px-3 py-1 text-xs transition-colors ${mode === m ? s.active : `${s.muted} ${s.hoverText}`}`}>
                {m === 'vista' ? t('Vista') : t('Editar')}
              </button>
            ))}
          </div>
          <button type="button" onClick={download} aria-label={t('Descargar')} title={t('Descargar .md')} className={`grid h-8 w-8 place-items-center rounded-md ${s.muted} ${s.hover} ${s.hoverText}`}>
            <Icon name="down" className="h-4 w-4" />
          </button>
          <button type="button" onClick={onRemove} aria-label={t('Eliminar')} title={t('Eliminar')} className={`grid h-8 w-8 place-items-center rounded-md ${s.muted} transition-colors hover:text-red-500`}>
            <Icon name="trash" className="h-4 w-4" />
          </button>
        </div>

        {mode === 'editar' && (
          <div className={`flex shrink-0 flex-wrap items-center gap-0.5 border-b px-2 py-1.5 ${s.line}`} onMouseDown={(e) => (e.target as HTMLElement).tagName !== 'SELECT' && e.preventDefault()}>
            {tool(t('Negrita'), () => wrap('**', '**', 'texto'), <b>B</b>)}
            {tool(t('Cursiva'), () => wrap('*', '*', 'texto'), <i>I</i>)}
            {tool(t('Tachado'), () => wrap('~~', '~~', 'texto'), <s>S</s>)}
            {tool(t('Resaltar'), () => wrap('==', '==', 'texto'), <span className="rounded bg-yellow-200 px-1 leading-tight text-neutral-900">A</span>)}
            {tool(t('Código'), () => wrap('`', '`', 'código'), '</>')}
            {sep}
            {tool(t('Título'), () => linePrefix('# '), 'H1')}
            {tool(t('Subtítulo'), () => linePrefix('## '), 'H2')}
            {tool(t('Lista'), () => linePrefix('- '), '•')}
            {tool(t('Lista numerada'), () => linePrefix('1. '), '1.')}
            {tool(t('Lista de tareas'), () => linePrefix('- [ ] '), '☐')}
            {tool(t('Cita'), () => linePrefix('> '), '❝')}
            {sep}
            {tool(t('Enlace a nota'), () => wrap('[[', ']]', 'Nota'), '[[ ]]')}
            {tool(t('Enlace web'), () => wrap('[', '](https://)', 'texto'), <Icon name="link" className="h-4 w-4" />)}
            {tool(t('Etiqueta'), () => wrap('#', '', 'etiqueta'), '#')}
            {tool(t('Separador'), () => insertBlock('---'), '—')}
            {tool(t('Bloque de código'), () => insertBlock('```\ncódigo\n```'), '{ }')}
            <button type="button" title={t('Tabla')} aria-label={t('Tabla')} aria-pressed={tablePanel} onClick={() => setTablePanel(!tablePanel)} className={`${tb} ${tablePanel ? s.active : ''}`}>
              <Icon name="table" className="h-4 w-4" />
            </button>
            {tablePanel && (
              <span className="flex flex-wrap items-center gap-2 pl-2">
                <label className={`flex items-center gap-1 text-xs ${s.muted}`}>
                  {t('Filas')}
                  <select value={rows} onChange={(e) => setRows(Number(e.target.value))} className={`${s.field} !w-14 !py-0.5`}>
                    {[2, 3, 4, 5, 6, 8].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <label className={`flex items-center gap-1 text-xs ${s.muted}`}>
                  {t('Columnas')}
                  <select value={cols} onChange={(e) => setCols(Number(e.target.value))} className={`${s.field} !w-14 !py-0.5`}>
                    {[2, 3, 4, 5, 6].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    insertBlock(tableMarkdown(rows, cols))
                    setTablePanel(false)
                  }}
                  className={`rounded-lg px-3 py-1 text-xs font-medium ${s.primary}`}
                >
                  {t('Insertar')}
                </button>
              </span>
            )}
          </div>
        )}

        <div className="nivra-scroll relative min-h-40 flex-1 overflow-y-auto">
          {mode === 'editar' ? (
            <>
              <textarea
                ref={area}
                value={note.body}
                onChange={(e) => {
                  onBody(e.target.value)
                  updateSuggest(e.target.value, e.target.selectionStart)
                }}
                onKeyDown={onKey}
                onBlur={() => setTimeout(() => setSuggest(null), 150)}
                placeholder={t('Escribe aquí. Usa [[ para enlazar notas y # para etiquetas.')}
                aria-label={t('Contenido')}
                spellCheck
                className="block h-full min-h-72 w-full resize-none bg-transparent p-5 text-base leading-relaxed outline-none placeholder:text-neutral-500 sm:text-[0.95rem]"
              />
              {suggest && (
                <ul className={`absolute right-5 bottom-3 left-5 z-10 flex flex-col overflow-hidden rounded-xl border shadow-lg ${s.line} ${dark ? 'bg-neutral-900' : 'bg-white'}`} role="listbox">
                  {suggest.items.map((item, i) => (
                    <li key={item} role="option" aria-selected={i === suggest.index}>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => accept(item)} className={`w-full px-3 py-2 text-left text-sm ${i === suggest.index ? s.active : `${s.muted} ${s.hover}`}`}>
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="p-5 text-base sm:text-[0.95rem]">
              {note.body.trim() === '' ? (
                <p className={`text-sm ${s.faint}`}>{t('Esta nota está vacía. Pulsa Editar para escribir.')}</p>
              ) : (
                <MarkdownView body={note.body} dark={dark} exists={exists} onOpenLink={onOpenTitle} onTag={onTag} onToggleTask={toggleTask} />
              )}
            </div>
          )}
        </div>

        <div className={`flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-[0.7rem] tabular-nums ${s.line} ${s.faint}`}>
          <span>
            {words} {t(words === 1 ? 'palabra' : 'palabras')} · {backlinks.length} {t(backlinks.length === 1 ? 'enlace entrante' : 'enlaces entrantes')}
          </span>
          <span>{new Date(note.updated).toLocaleString()}</span>
        </div>
      </section>
      {side}
    </>
  )
}
