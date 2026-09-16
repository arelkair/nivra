import { useEffect, useRef, useState } from 'react'
import { moveById, pagesOf, sanitize, type Notepad, type NotepadPage } from '../lib/store'
import { notifyWithUndo } from '../lib/undo'
import { Empty, Icon, Modal, button, card, input, line } from '../components/ui'
import { t, tp } from '../lib/i18n'
import { playDrop, playPop } from '../lib/sound'

type Props = {
  notepads: Notepad[]
  setNotepads: (update: (prev: Notepad[]) => Notepad[]) => void
}

const COLORS = ['#1a1a1a', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7']

export function Notepads({ notepads, setNotepads }: Props) {
  const [activeId, setActiveId] = useState<string | null>(notepads[0]?.id ?? null)
  const [renaming, setRenaming] = useState<Notepad | null>(null)
  const [creating, setCreating] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const active = notepads.find((n) => n.id === activeId) ?? notepads[0]

  const create = (title: string) => {
    const id = crypto.randomUUID()
    const newNotepad: Notepad = { id, title, pages: [{ id: id + '-1', html: '' }] }
    setNotepads((prev) => [...prev, newNotepad])
    setActiveId(id)
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {notepads.map((n) => (
          <button
            key={n.id}
            type="button"
            draggable
            onDragStart={() => setDraggingId(n.id)}
            onDragEnd={() => {
              setDraggingId(null)
              setOverId(null)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setOverId(n.id)
            }}
            onDrop={() => {
              if (draggingId) {
                playDrop()
                setNotepads((prev) => moveById(prev, draggingId, n.id))
              }
              setDraggingId(null)
              setOverId(null)
            }}
            onClick={() => (n.id === active?.id ? setRenaming(n) : setActiveId(n.id))}
            title={n.id === active?.id ? t('Renombrar o eliminar') : t('Abrir')}
            className={`cursor-grab rounded-xl border px-4 py-2 text-sm transition-colors active:cursor-grabbing ${
              draggingId === n.id ? 'opacity-40' : ''
            } ${
              overId === n.id && draggingId && draggingId !== n.id && n.id !== active?.id
                ? 'border-neutral-400 dark:border-neutral-500'
                : ''
            } ${
              n.id === active?.id
                ? 'border-neutral-900 font-medium dark:border-white'
                : `${line} text-neutral-500 hover:bg-black/[0.03] dark:text-neutral-400 dark:hover:bg-white/[0.04]`
            }`}
          >
            {n.title}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label={t('Nuevo bloc')}
          className={`grid h-10 w-10 place-items-center rounded-xl border border-dashed text-neutral-400 transition-colors hover:text-neutral-900 ${line} dark:hover:text-white`}
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
      </div>

      {notepads.length > 1 && (
        <p className="-mt-2 text-[0.7rem] text-neutral-400 dark:text-neutral-500">
          {t('Arrastra un bloc para reordenarlo.')}
        </p>
      )}

      {active ? (
        <Editor
          notepad={active}
          onPages={(pages) =>
            setNotepads((prev) =>
              prev.map((n) => (n.id === active.id ? { ...n, pages, html: undefined } : n)),
            )
          }
        />
      ) : (
        <section className={`${card} p-6`}>
          <Empty>{t('Sin blocs. Crea el primero con el botón +.')}</Empty>
        </section>
      )}

      {(creating || renaming) && (
        <Modal
          title={renaming ? t('Bloc') : t('Nuevo bloc')}
          onClose={() => {
            setCreating(false)
            setRenaming(null)
          }}
        >
          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              const title = String(new FormData(ev.currentTarget).get('title') ?? '').trim()
              if (!title) return
              if (renaming) {
                setNotepads((prev) =>
                  prev.map((n) => (n.id === renaming.id ? { ...n, title } : n)),
                )
                setRenaming(null)
              } else {
                create(title)
                setCreating(false)
              }
            }}
            className="flex flex-col gap-2"
          >
            <input
              name="title"
              defaultValue={renaming?.title}
              maxLength={30}
              required
              autoFocus
              placeholder={t('Nombre del bloc')}
              className={input}
            />
            <div className="mt-2 flex gap-2">
              {renaming && (
                <button
                  type="button"
                  onClick={() => {
                    const before = notepads
                    setNotepads((prev) => prev.filter((n) => n.id !== renaming.id))
                    setActiveId(null)
                    setRenaming(null)
                    notifyWithUndo(tp('«{0}» eliminado', renaming.title), () => setNotepads(() => before))
                  }}
                  className="rounded-xl px-4 py-2.5 text-sm text-neutral-400 transition-colors hover:text-red-500"
                >
                  {t('Eliminar')}
                </button>
              )}
              <button type="submit" className={`${button} ml-auto`}>
                {t('Guardar')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

const plainText = (html: string) => {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent ?? ''
}

const countWords = (html: string) => {
  const m = plainText(html).match(/\S+/g)
  return m ? m.length : 0
}

const TABLE_CELL = (r: number, c: number) =>
  Array.from({ length: r }, (_, ri) =>
    `<tr>${Array.from({ length: c }, () => (ri === 0 ? '<th> </th>' : '<td> </td>')).join('')}</tr>`,
  ).join('')

function barChartHtml(title: string, rows: { label: string; value: number }[]) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  const rowH = 26
  const height = rows.length * rowH + (title ? 28 : 8)
  const width = 360
  const barMaxW = 220
  const bars = rows
    .map((r, i) => {
      const y = (title ? 28 : 8) + i * rowH
      const w = Math.max(2, (r.value / max) * barMaxW)
      return `<text x="0" y="${y + 14}" font-size="11" fill="currentColor">${r.label}</text>
        <rect x="110" y="${y + 3}" width="${w}" height="14" rx="3" fill="currentColor" opacity="0.75" />
        <text x="${116 + w}" y="${y + 14}" font-size="11" fill="currentColor">${r.value}</text>`
    })
    .join('')
  const heading = title ? `<text x="0" y="16" font-size="12" font-weight="600" fill="currentColor">${title}</text>` : ''
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%">${heading}${bars}</svg>`
}

export function Editor({
  notepad,
  onPages,
  compacto,
}: {
  notepad: Notepad
  onPages: (pages: NotepadPage[]) => void
  compacto?: boolean
}) {
  const pageList = pagesOf(notepad)
  const [index, setIndex] = useState(0)
  const currentPage = pageList[Math.min(index, pageList.length - 1)]
  const ref = useRef<HTMLDivElement>(null)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [tableDialog, setTableDialog] = useState(false)
  const [chartDialog, setChartDialog] = useState(false)

  const last = useRef<string | null>(null)
  const pendingSelect = useRef<number | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const clean = sanitize(currentPage.html)
    if (clean === last.current) return
    if (element.innerHTML === clean) {
      last.current = clean
      return
    }
    element.innerHTML = clean
    last.current = clean
  })

  const selectOccurrence = (occ: number) => {
    const el = ref.current
    if (!el || !query) return
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const needle = query.toLowerCase()
    let count = 0
    let node: Node | null
    while ((node = walker.nextNode())) {
      const text = node.textContent ?? ''
      const lower = text.toLowerCase()
      let from = 0
      while (true) {
        const at = lower.indexOf(needle, from)
        if (at === -1) break
        if (count === occ) {
          const range = document.createRange()
          range.setStart(node, at)
          range.setEnd(node, at + needle.length)
          const sel = window.getSelection()
          sel?.removeAllRanges()
          sel?.addRange(range)
          const container = node.parentElement
          container?.scrollIntoView({ block: 'center' })
          return
        }
        count++
        from = at + needle.length
      }
    }
  }

  useEffect(() => {
    if (pendingSelect.current === null) return
    const occ = pendingSelect.current
    pendingSelect.current = null
    selectOccurrence(occ)
  })

  const onChange = (html: string) => {
    last.current = html
    const bookmarks = currentPage.bookmarks?.filter((b) => html.includes(`data-bookmark-id="${b.id}"`))
    onPages(pageList.map((p) => (p.id === currentPage.id ? { ...p, html, bookmarks } : p)))
  }

  const apply = (command: string, value?: string) => {
    ref.current?.focus()
    document.execCommand(command, false, value)
    if (ref.current) onChange(sanitize(ref.current.innerHTML))
  }

  const appendHtml = (html: string) => {
    const el = ref.current
    if (!el) return
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    document.execCommand('insertHTML', false, html)
    onChange(sanitize(el.innerHTML))
  }

  const savedRange = useRef<Range | null>(null)
  const [bookmarkDialog, setBookmarkDialog] = useState(false)
  const [bookmarksPanel, setBookmarksPanel] = useState(false)

  const openBookmarkDialog = () => {
    const sel = window.getSelection()
    savedRange.current =
      sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)
        ? sel.getRangeAt(0).cloneRange()
        : null
    setBookmarkDialog(true)
  }

  const insertBookmark = (title: string, color: string) => {
    playPop()
    const el = ref.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    sel?.removeAllRanges()
    if (savedRange.current) {
      sel?.addRange(savedRange.current)
    } else {
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      sel?.addRange(range)
    }
    const id = crypto.randomUUID()
    const marker = `<span data-bookmark-id="${id}" contenteditable="false" title="${title.replace(/"/g, '&quot;')}" style="display:inline-block;width:9px;height:9px;border-radius:9999px;vertical-align:middle;margin:0 2px;background:${color};box-shadow:0 0 0 1px rgba(128,128,128,.5)"></span>`
    document.execCommand('insertHTML', false, marker)
    const html = sanitize(el.innerHTML)
    last.current = html
    onPages(
      pageList.map((p) =>
        p.id === currentPage.id
          ? { ...p, html, bookmarks: [...(p.bookmarks ?? []), { id, title, color }] }
          : p,
      ),
    )
  }

  const jumpToBookmark = (id: string) => {
    const marker = ref.current?.querySelector(`[data-bookmark-id="${CSS.escape(id)}"]`)
    if (marker) {
      marker.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    onPages(
      pageList.map((p) =>
        p.id === currentPage.id
          ? { ...p, bookmarks: (p.bookmarks ?? []).filter((b) => b.id !== id) }
          : p,
      ),
    )
  }

  const deleteBookmark = (id: string) => {
    const marker = ref.current?.querySelector(`[data-bookmark-id="${CSS.escape(id)}"]`)
    marker?.remove()
    const html = ref.current ? sanitize(ref.current.innerHTML) : currentPage.html
    last.current = html
    onPages(
      pageList.map((p) =>
        p.id === currentPage.id
          ? { ...p, html, bookmarks: (p.bookmarks ?? []).filter((b) => b.id !== id) }
          : p,
      ),
    )
  }

  const countMatches = (html: string, q: string) => {
    const needle = q.toLowerCase()
    const text = plainText(html).toLowerCase()
    let count = 0
    let pos = 0
    while (true) {
      const at = text.indexOf(needle, pos)
      if (at === -1) break
      count++
      pos = at + needle.length
    }
    return count
  }

  const matches = query
    ? pageList.flatMap((p, pageIndex) =>
        Array.from({ length: countMatches(p.html, query) }, (_, occ) => ({ pageIndex, occ })),
      )
    : []

  const [matchPos, setMatchPos] = useState(0)

  const goToMatch = (pos: number) => {
    if (matches.length === 0) return
    const wrapped = ((pos % matches.length) + matches.length) % matches.length
    const m = matches[wrapped]
    setMatchPos(wrapped)
    if (index !== m.pageIndex) {
      pendingSelect.current = m.occ
      setIndex(m.pageIndex)
    } else {
      selectOccurrence(m.occ)
    }
  }

  const findNext = (back: boolean) => goToMatch(matchPos + (back ? -1 : 1))

  const palabrasPagina = countWords(currentPage.html)
  const palabrasTotal = pageList.reduce((s, p) => s + countWords(p.html), 0)

  const btnClass =
    'grid h-9 w-9 place-items-center rounded-lg border text-sm transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'

  return (
    <>
    <section className={`${card} flex flex-col overflow-hidden ${compacto ? '' : 'min-h-0 flex-1'}`}>
      <div className={`flex items-center gap-1.5 border-b p-2 ${line}`}>
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => apply('formatBlock', 'h2')}
          aria-label={t('Título')}
          className={`${btnClass} ${line} font-semibold`}
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => apply('formatBlock', 'h3')}
          aria-label={t('Subtítulo')}
          className={`${btnClass} ${line} text-xs font-semibold`}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => apply('formatBlock', 'p')}
          aria-label={t('Texto normal')}
          className={`${btnClass} ${line} text-neutral-400`}
        >
          T
        </button>

        <span className={`mx-1 h-6 w-px ${'bg-black/10 dark:bg-white/15'}`} />

        <button
          type="button"
          onClick={() => apply('bold')}
          aria-label={t('Negrita')}
          className={`${btnClass} ${line} font-bold`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => apply('italic')}
          aria-label={t('Cursiva')}
          className={`${btnClass} ${line} font-serif italic`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => apply('underline')}
          aria-label={t('Subrayado')}
          className={`${btnClass} ${line} underline`}
        >
          U
        </button>
        <button
          type="button"
          onClick={() => apply('strikeThrough')}
          aria-label={t('Tachado')}
          className={`${btnClass} ${line} line-through`}
        >
          S
        </button>

        <span className={`mx-1 h-6 w-px ${'bg-black/10 dark:bg-white/15'}`} />

        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => apply('foreColor', c)}
            aria-label={`Color ${c}`}
            className="h-6 w-6 rounded-full border border-black/10 transition-transform hover:scale-110 dark:border-white/20"
            style={{ background: c }}
          />
        ))}

        <span className={`mx-1 h-6 w-px ${'bg-black/10 dark:bg-white/15'}`} />

        <button
          type="button"
          onClick={() => apply('insertUnorderedList')}
          aria-label={t('Lista')}
          className={`${btnClass} ${line}`}
        >
          <Icon name="tasks" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => apply('removeFormat')}
          aria-label={t('Quitar formato')}
          className={`${btnClass} ${line} text-neutral-400`}
        >
          <Icon name="close" className="h-4 w-4" />
        </button>

        <span className={`mx-1 h-6 w-px ${'bg-black/10 dark:bg-white/15'}`} />

        <button
          type="button"
          onClick={() => setTableDialog(true)}
          aria-label={t('Insertar tabla')}
          className={`${btnClass} ${line}`}
        >
          <Icon name="table" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setChartDialog(true)}
          aria-label={t('Insertar gráfica')}
          className={`${btnClass} ${line}`}
        >
          <Icon name="chart" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() =>
            appendHtml(
              `<details><summary>${t('Toca para expandir')}</summary><div>${t('Escribe aquí…')}</div></details><br>`,
            )
          }
          aria-label={t('Insertar texto desplegable')}
          className={`${btnClass} ${line}`}
        >
          <Icon name="collapse" className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={openBookmarkDialog}
          aria-label={t('Añadir marcador aquí')}
          className={`${btnClass} ${line} text-neutral-400`}
        >
          <Icon name="star" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setBookmarksPanel(true)}
          aria-label={t('Ver marcadores de esta página')}
          className={`${btnClass} ${line} relative text-neutral-400`}
        >
          <Icon name="pin" className="h-4 w-4" />
          {(currentPage.bookmarks?.length ?? 0) > 0 && (
            <span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-neutral-900 px-0.5 font-mono text-[0.55rem] text-white dark:bg-white dark:text-neutral-900">
              {currentPage.bookmarks!.length}
            </span>
          )}
        </button>

      </div>
        <button
          type="button"
          onClick={() =>
            setSearching((v) => {
              if (v) setQuery('')
              return !v
            })
          }
          aria-label={t('Buscar en el bloc')}
          aria-pressed={searching}
          className={`${btnClass} ${line} shrink-0 ${searching ? 'bg-black/[0.06] dark:bg-white/[0.1]' : ''}`}
        >
          <Icon name="search" className="h-4 w-4" />
        </button>
      </div>

      {searching && (
        <div className={`flex items-center gap-2 border-b p-2 ${line}`}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') findNext(e.shiftKey)
              if (e.key === ' ' && query.trim()) goToMatch(0)
              if (e.key === 'Escape') {
                setSearching(false)
                setQuery('')
              }
            }}
            autoFocus
            placeholder={t('Buscar en todo el bloc…')}
            aria-label={t('Buscar en el bloc')}
            className={`${input} h-8 flex-1 py-0 text-sm`}
          />
          {query && (
            <span className="shrink-0 font-mono text-xs text-neutral-400 dark:text-neutral-500">
              {matches.length === 0 ? t('Sin resultados') : `${matchPos + 1}/${matches.length}`}
            </span>
          )}
          <button
            type="button"
            onClick={() => findNext(true)}
            disabled={matches.length === 0}
            aria-label={t('Coincidencia anterior')}
            className={`${btnClass} ${line} h-8 w-8 disabled:opacity-30`}
          >
            <Icon name="up" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => findNext(false)}
            disabled={matches.length === 0}
            aria-label={t('Siguiente coincidencia')}
            className={`${btnClass} ${line} h-8 w-8 disabled:opacity-30`}
          >
            <Icon name="down" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div
        key={notepad.id + currentPage.id}
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={`Contenido de ${notepad.title}`}
        onInput={(e) => onChange(sanitize(e.currentTarget.innerHTML))}
        className={`${compacto ? 'p-4' : 'p-5'} min-h-0 flex-1 overflow-y-auto nivra-scroll text-sm leading-relaxed outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-black/10 [&_td]:p-1.5 [&_th]:border [&_th]:border-black/10 [&_th]:bg-black/[0.04] [&_th]:p-1.5 dark:[&_td]:border-white/15 dark:[&_th]:border-white/15 dark:[&_th]:bg-white/[0.06] [&_details]:my-2 [&_details]:rounded-lg [&_details]:border [&_details]:border-black/10 [&_details]:p-2 dark:[&_details]:border-white/15 [&_summary]:cursor-pointer [&_summary]:font-medium [&_h2]:mt-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-1.5 [&_h3]:text-base [&_h3]:font-semibold`}
      />

      <p className={`shrink-0 border-t px-3 py-1.5 font-mono text-[0.65rem] text-neutral-400 dark:text-neutral-500 ${line}`}>
        {palabrasPagina} {t(palabrasPagina === 1 ? 'palabra' : 'palabras')} {t('en esta página')}
        {pageList.length > 1 && tp(' · {0} en el bloc', palabrasTotal)}
      </p>

      <div className={`flex shrink-0 items-center justify-between gap-2 border-t p-2 ${line}`}>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          aria-label={t('Página anterior')}
          className={btnClass + ' ' + line + ' disabled:opacity-30'}
        >
          <Icon name="left" className="h-4 w-4" />
        </button>

        <div className="flex flex-wrap items-center justify-center gap-1">
          {pageList.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={t('Página ') + (i + 1)}
              aria-current={i === index}
              className={
                'relative h-7 min-w-7 rounded-lg px-2 font-mono text-xs transition-colors ' +
                (i === index
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white')
              }
            >
              {i + 1}
              {(p.bookmarks?.length ?? 0) > 0 && (
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-yellow-500" />
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const newPage = { id: crypto.randomUUID(), html: '' }
              onPages([...pageList, newPage])
              setIndex(pageList.length)
            }}
            aria-label={t('Nueva página')}
            className={btnClass + ' ' + line + ' ml-1'}
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
          </button>
          {pageList.length > 1 && (
            <button
              type="button"
              onClick={() => {
                onPages(pageList.filter((p) => p.id !== currentPage.id))
                setIndex((i) => Math.max(0, i - 1))
              }}
              aria-label={t('Eliminar esta página')}
              className={btnClass + ' ' + line + ' text-neutral-400 hover:text-red-500'}
            >
              <Icon name="trash" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(pageList.length - 1, i + 1))}
          disabled={index >= pageList.length - 1}
          aria-label={t('Página siguiente')}
          className={btnClass + ' ' + line + ' disabled:opacity-30'}
        >
          <Icon name="right" className="h-4 w-4" />
        </button>
      </div>
    </section>

    {tableDialog && (
      <Modal title={t('Insertar tabla')} onClose={() => setTableDialog(false)}>
        <form
          onSubmit={(ev) => {
            ev.preventDefault()
            const data = new FormData(ev.currentTarget)
            const rows = Math.min(20, Math.max(1, Number(data.get('rows')) || 1))
            const cols = Math.min(10, Math.max(1, Number(data.get('cols')) || 1))
            setTableDialog(false)
            requestAnimationFrame(() => appendHtml(`<table>${TABLE_CELL(rows, cols)}</table><br>`))
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex gap-2">
            <input
              name="rows"
              type="number"
              min={1}
              max={20}
              defaultValue={3}
              required
              aria-label={t('Filas')}
              placeholder={t('Filas')}
              className={input}
            />
            <input
              name="cols"
              type="number"
              min={1}
              max={10}
              defaultValue={3}
              required
              aria-label={t('Columnas')}
              placeholder={t('Columnas')}
              className={input}
            />
          </div>
          <button type="submit" className={`${button} mt-2`}>
            {t('Insertar')}
          </button>
        </form>
      </Modal>
    )}

    {chartDialog && <ChartDialog onClose={() => setChartDialog(false)} onInsert={appendHtml} />}

    {bookmarkDialog && (
      <Modal title={t('Nuevo marcador')} onClose={() => setBookmarkDialog(false)}>
        <BookmarkForm
          onCancel={() => setBookmarkDialog(false)}
          onSave={(title, color) => {
            setBookmarkDialog(false)
            requestAnimationFrame(() => insertBookmark(title, color))
          }}
        />
      </Modal>
    )}

    {bookmarksPanel && (
      <Modal title={t('Marcadores')} onClose={() => setBookmarksPanel(false)}>
        {(currentPage.bookmarks?.length ?? 0) === 0 ? (
          <Empty>{t('Sin marcadores en esta página.')}</Empty>
        ) : (
          <ul className="flex flex-col gap-1">
            {currentPage.bookmarks!.map((b) => (
              <li key={b.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setBookmarksPanel(false)
                    requestAnimationFrame(() => jumpToBookmark(b.id))
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: b.color }}
                  />
                  <span className="truncate">{b.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteBookmark(b.id)}
                  aria-label={tp('Eliminar marcador «{0}»', b.title)}
                  className="shrink-0 rounded-lg p-2 text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    )}
    </>
  )
}

function BookmarkForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void
  onSave: (title: string, color: string) => void
}) {
  const [color, setColor] = useState(COLORS[1])
  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault()
        const title = String(new FormData(ev.currentTarget).get('title') ?? '').trim()
        if (!title) return
        onSave(title, color)
      }}
      className="flex flex-col gap-3"
    >
      <input
        name="title"
        maxLength={40}
        required
        autoFocus
        placeholder={t('Título del marcador')}
        className={input}
      />
      <div className="flex gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
            aria-pressed={color === c}
            className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
              color === c ? 'border-neutral-900 dark:border-white' : 'border-transparent'
            }`}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2.5 text-sm text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
        >
          {t('Cerrar')}
        </button>
        <button type="submit" className={`${button} ml-auto`}>
          {t('Guardar')}
        </button>
      </div>
    </form>
  )
}

function ChartDialog({
  onClose,
  onInsert,
}: {
  onClose: () => void
  onInsert: (html: string) => void
}) {
  const [rows, setRows] = useState([0, 1, 2])

  return (
    <Modal title={t('Gráfica de barras')} onClose={onClose}>
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          const data = new FormData(ev.currentTarget)
          const title = String(data.get('title') ?? '').trim()
          const values = rows
            .map((id) => ({
              label: String(data.get(`label${id}`) ?? '').trim(),
              value: Number(data.get(`value${id}`)) || 0,
            }))
            .filter((r) => r.label)
          if (!values.length) return
          onClose()
          requestAnimationFrame(() => onInsert(barChartHtml(title, values) + '<br>'))
        }}
        className="flex flex-col gap-2"
      >
        <input name="title" maxLength={40} placeholder={t('Título')} className={input} />
        {rows.map((id) => (
          <div key={id} className="flex gap-2">
            <input
              name={`label${id}`}
              maxLength={20}
              placeholder={t('Etiqueta')}
              aria-label={t('Etiqueta')}
              className={`${input} flex-[2]`}
            />
            <input
              name={`value${id}`}
              type="number"
              placeholder={t('Valor')}
              aria-label={t('Valor')}
              className={`${input} flex-1`}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, (prev.at(-1) ?? 0) + 1])}
          className="self-start text-xs text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
        >
          {t('Añadir fila')}
        </button>
        <button type="submit" className={`${button} mt-2`}>
          {t('Insertar')}
        </button>
      </form>
    </Modal>
  )
}
