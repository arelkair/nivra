import { useState } from 'react'
import { PDFDocument, degrees } from 'pdf-lib'
import { t, tp } from '../../../lib/i18n'
import { Icon } from '../../ui'
import type { Skin } from '../skin'
import { FileDrop } from './FileDrop'
import { makeZip, saveBlob } from './zip'

type Mode = 'merge' | 'pages' | 'rotate' | 'images'

const MODES: { id: Mode; label: string }[] = [
  { id: 'merge', label: 'Unir' },
  { id: 'pages', label: 'Extraer o dividir' },
  { id: 'rotate', label: 'Rotar' },
  { id: 'images', label: 'Imágenes a PDF' },
]

const baseName = (name: string) => {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

const size = (bytes: number) => (bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(2)} MB`)

const toBlob = (bytes: Uint8Array, type = 'application/pdf') => new Blob([bytes.slice().buffer], { type })

async function loadPdf(file: File) {
  try {
    return await PDFDocument.load(await file.arrayBuffer())
  } catch {
    throw new Error(tp('«{0}» no se puede abrir: está protegido con contraseña o dañado.', file.name))
  }
}

function parseRanges(text: string, total: number): number[] | null {
  const clean = text.trim()
  if (!clean) return Array.from({ length: total }, (_, i) => i)
  const out: number[] = []
  for (const part of clean.split(/[,;\s]+/).filter(Boolean)) {
    const m = /^(\d*)(?:-(\d*))?$/.exec(part)
    if (!m || (m[1] === '' && m[2] === undefined)) return null
    const from = m[1] === '' ? 1 : Number(m[1])
    const to = m[2] === undefined ? from : m[2] === '' ? total : Number(m[2])
    if (from < 1 || to > total || from > to) return null
    for (let p = from; p <= to; p++) if (!out.includes(p - 1)) out.push(p - 1)
  }
  return out
}

type Item = { id: string; file: File; pages?: number; error?: string }

const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
const isImage = (f: File) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(f.name)

function OrderList({ s, items, onChange, showPages }: { s: Skin; items: Item[]; onChange: (items: Item[]) => void; showPages?: boolean }) {
  const move = (i: number, step: number) => {
    const next = [...items]
    const j = i + step
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <ul className={`flex flex-col divide-y overflow-hidden rounded-2xl border ${s.line} ${s.divide}`}>
      {items.map((item, i) => (
        <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
          <span className={`w-5 shrink-0 text-center font-mono text-xs ${s.faint}`}>{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{item.file.name}</p>
            <p className={`text-[0.7rem] ${item.error ? 'text-red-500' : s.faint}`}>
              {item.error ?? `${size(item.file.size)}${showPages && item.pages ? ` · ${item.pages} ${t(item.pages === 1 ? 'página' : 'páginas')}` : ''}`}
            </p>
          </div>
          <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t('Subir')} className={`${s.muted} ${s.hoverText} disabled:opacity-30`}>
            <Icon name="up" className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={t('Bajar')} className={`${s.muted} ${s.hoverText} disabled:opacity-30`}>
            <Icon name="down" className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onChange(items.filter((x) => x.id !== item.id))} aria-label={t('Quitar')} className={`${s.muted} transition-colors hover:text-red-500`}>
            <Icon name="close" className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  )
}

export function PdfTool({ s }: { s: Skin }) {
  const [mode, setMode] = useState<Mode>('merge')
  const [merge, setMerge] = useState<Item[]>([])
  const [images, setImages] = useState<Item[]>([])
  const [single, setSingle] = useState<Item | null>(null)
  const [ranges, setRanges] = useState('')
  const [action, setAction] = useState<'extract' | 'delete' | 'split'>('extract')
  const [angle, setAngle] = useState(90)
  const [paper, setPaper] = useState<'fit' | 'a4' | 'letter'>('a4')
  const [margin, setMargin] = useState(10)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)

  const report = (text: string, error = false) => setMessage({ text, error })

  const withPages = async (files: File[]): Promise<Item[]> =>
    Promise.all(
      files.map(async (file) => {
        const id = crypto.randomUUID()
        try {
          return { id, file, pages: (await loadPdf(file)).getPageCount() }
        } catch (e) {
          return { id, file, error: (e as Error).message }
        }
      }),
    )

  const addMerge = async (files: File[]) => {
    const pdfs = files.filter(isPdf)
    if (pdfs.length === 0) return
    setMessage(null)
    const items = await withPages(pdfs)
    setMerge((prev) => [...prev, ...items])
  }

  const setOne = async (files: File[]) => {
    const file = files.find(isPdf)
    if (!file) return
    setMessage(null)
    const [item] = await withPages([file])
    setSingle(item)
  }

  const addImages = (files: File[]) => {
    const list = files.filter(isImage)
    if (list.length > 0) setImages((prev) => [...prev, ...list.map((file) => ({ id: crypto.randomUUID(), file }))])
  }

  const guard = async (job: () => Promise<void>) => {
    setBusy(true)
    setMessage(null)
    try {
      await job()
    } catch (e) {
      report(e instanceof Error ? e.message : t('No se pudo completar la operación.'), true)
    } finally {
      setBusy(false)
    }
  }

  const doMerge = () =>
    guard(async () => {
      const usable = merge.filter((x) => !x.error)
      if (usable.length < 2) throw new Error(t('Añade al menos dos PDF válidos.'))
      const out = await PDFDocument.create()
      for (const item of usable) {
        const doc = await loadPdf(item.file)
        const pages = await out.copyPages(doc, doc.getPageIndices())
        pages.forEach((p) => out.addPage(p))
      }
      const bytes = await out.save()
      saveBlob('unido.pdf', toBlob(bytes))
      report(tp('Listo: {0} páginas en un solo PDF ({1}).', out.getPageCount(), size(bytes.length)))
    })

  const doPages = () =>
    guard(async () => {
      if (!single || single.error || !single.pages) throw new Error(t('Elige un PDF.'))
      const chosen = parseRanges(ranges, single.pages)
      if (!chosen || (ranges.trim() === '' && action !== 'split')) throw new Error(t('Escribe las páginas, por ejemplo 1-3, 5, 8-.'))
      const src = await loadPdf(single.file)
      const name = baseName(single.file.name)
      if (action === 'split') {
        const files: { name: string; blob: Blob }[] = []
        for (const index of chosen) {
          const doc = await PDFDocument.create()
          const [page] = await doc.copyPages(src, [index])
          doc.addPage(page)
          files.push({ name: `${name}-pagina-${String(index + 1).padStart(3, '0')}.pdf`, blob: toBlob(await doc.save()) })
        }
        saveBlob(`${name}-paginas.zip`, await makeZip(files))
        return report(tp('Listo: {0} PDF de una página en un .zip.', files.length))
      }
      const keep = action === 'extract' ? chosen : src.getPageIndices().filter((i) => !chosen.includes(i))
      if (keep.length === 0) throw new Error(t('No quedaría ninguna página.'))
      const out = await PDFDocument.create()
      const pages = await out.copyPages(src, keep)
      pages.forEach((p) => out.addPage(p))
      const bytes = await out.save()
      saveBlob(`${name}-${action === 'extract' ? 'extraido' : 'editado'}.pdf`, toBlob(bytes))
      report(tp('Listo: PDF de {0} páginas ({1}).', keep.length, size(bytes.length)))
    })

  const doRotate = () =>
    guard(async () => {
      if (!single || single.error || !single.pages) throw new Error(t('Elige un PDF.'))
      const chosen = parseRanges(ranges, single.pages)
      if (!chosen) throw new Error(t('Escribe las páginas, por ejemplo 1-3, 5, 8-.'))
      const doc = await loadPdf(single.file)
      for (const index of chosen) {
        const page = doc.getPage(index)
        page.setRotation(degrees((page.getRotation().angle + angle) % 360))
      }
      const bytes = await doc.save()
      saveBlob(`${baseName(single.file.name)}-rotado.pdf`, toBlob(bytes))
      report(tp('Listo: {0} páginas rotadas.', chosen.length))
    })

  const imageBytes = async (file: File): Promise<{ bytes: Uint8Array; kind: 'png' | 'jpg'; w: number; h: number }> => {
    const jpeg = file.type === 'image/jpeg'
    const png = file.type === 'image/png'
    const bitmap = await createImageBitmap(file)
    try {
      if (jpeg || png) return { bytes: new Uint8Array(await file.arrayBuffer()), kind: jpeg ? 'jpg' : 'png', w: bitmap.width, h: bitmap.height }
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error(tp('No se puede leer «{0}».', file.name))
      return { bytes: new Uint8Array(await blob.arrayBuffer()), kind: 'png', w: bitmap.width, h: bitmap.height }
    } finally {
      bitmap.close()
    }
  }

  const doImages = () =>
    guard(async () => {
      if (images.length === 0) throw new Error(t('Añade al menos una imagen.'))
      const out = await PDFDocument.create()
      for (const item of images) {
        const data = await imageBytes(item.file).catch(() => {
          throw new Error(tp('No se puede leer «{0}».', item.file.name))
        })
        const embedded = data.kind === 'png' ? await out.embedPng(data.bytes) : await out.embedJpg(data.bytes)
        if (paper === 'fit') {
          const page = out.addPage([data.w * 0.75, data.h * 0.75])
          page.drawImage(embedded, { x: 0, y: 0, width: data.w * 0.75, height: data.h * 0.75 })
          continue
        }
        const [pw, ph] = paper === 'a4' ? [595.28, 841.89] : [612, 792]
        const landscape = data.w > data.h
        const width = landscape ? ph : pw
        const height = landscape ? pw : ph
        const pad = margin * 2.835
        const scale = Math.min((width - pad * 2) / data.w, (height - pad * 2) / data.h)
        const w = data.w * scale
        const h = data.h * scale
        const page = out.addPage([width, height])
        page.drawImage(embedded, { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h })
      }
      const bytes = await out.save()
      saveBlob('imagenes.pdf', toBlob(bytes))
      report(tp('Listo: PDF de {0} páginas ({1}).', out.getPageCount(), size(bytes.length)))
    })

  const chip = (active: boolean) => `shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors ${active ? s.active : `${s.muted} ${s.hover} ${s.hoverText}`}`
  const run = mode === 'merge' ? doMerge : mode === 'pages' ? doPages : mode === 'rotate' ? doRotate : doImages
  const action_label = mode === 'merge' ? t('Unir y descargar') : mode === 'pages' ? (action === 'split' ? t('Dividir y descargar .zip') : t('Crear PDF')) : mode === 'rotate' ? t('Rotar y descargar') : t('Crear PDF')

  const singleFile = (
    <>
      <FileDrop s={s} accept="application/pdf,.pdf" multiple={false} compact title={t('Arrastra un PDF aquí')} hint={t('Todo se procesa en tu equipo.')} onFiles={setOne} />
      {single && (
        <div className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${s.line}`}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{single.file.name}</p>
            <p className={`text-[0.7rem] ${single.error ? 'text-red-500' : s.faint}`}>{single.error ?? `${size(single.file.size)} · ${single.pages} ${t(single.pages === 1 ? 'página' : 'páginas')}`}</p>
          </div>
          <button type="button" onClick={() => setSingle(null)} aria-label={t('Quitar')} className={`${s.muted} transition-colors hover:text-red-500`}>
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  )

  const rangeField = (
    <label className="flex flex-col gap-1.5">
      <span className={`text-xs ${s.muted}`}>{mode === 'rotate' ? t('Páginas (vacío = todas)') : t('Páginas')}</span>
      <input value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="1-3, 5, 8-" aria-label={t('Páginas')} spellCheck={false} className={`${s.field} font-mono`} />
    </label>
  )

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" className={`nivra-scroll flex gap-1 overflow-x-auto rounded-xl border p-1 ${s.line}`}>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => {
              setMode(m.id)
              setMessage(null)
            }}
            className={chip(mode === m.id)}
          >
            {t(m.label)}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-3">
          {mode === 'merge' && (
            <>
              <FileDrop s={s} accept="application/pdf,.pdf" title={t('Arrastra tus PDF aquí')} hint={t('Se unirán en el orden de la lista.')} onFiles={addMerge} />
              {merge.length > 0 && <OrderList s={s} items={merge} onChange={setMerge} showPages />}
            </>
          )}
          {(mode === 'pages' || mode === 'rotate') && singleFile}
          {mode === 'images' && (
            <>
              <FileDrop s={s} accept="image/*" title={t('Arrastra tus imágenes aquí')} hint={t('Cada imagen será una página, en el orden de la lista.')} onFiles={addImages} />
              {images.length > 0 && <OrderList s={s} items={images} onChange={setImages} />}
            </>
          )}
        </div>

        <aside className={`flex h-fit flex-col gap-4 rounded-2xl border p-4 ${s.line} ${s.panel}`}>
          {mode === 'pages' && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className={`text-xs ${s.muted}`}>{t('Qué hacer')}</span>
                <select value={action} onChange={(e) => setAction(e.target.value as typeof action)} aria-label={t('Qué hacer')} className={s.field}>
                  <option value="extract">{t('Quedarme con estas páginas')}</option>
                  <option value="delete">{t('Eliminar estas páginas')}</option>
                  <option value="split">{t('Dividir en un PDF por página')}</option>
                </select>
              </label>
              {rangeField}
              {action === 'split' && <p className={`text-[0.7rem] ${s.faint}`}>{t('Vacío = todas las páginas.')}</p>}
            </>
          )}
          {mode === 'rotate' && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className={`text-xs ${s.muted}`}>{t('Giro')}</span>
                <select value={angle} onChange={(e) => setAngle(Number(e.target.value))} aria-label={t('Giro')} className={s.field}>
                  <option value={90}>90° {t('a la derecha')}</option>
                  <option value={180}>180°</option>
                  <option value={270}>90° {t('a la izquierda')}</option>
                </select>
              </label>
              {rangeField}
            </>
          )}
          {mode === 'images' && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className={`text-xs ${s.muted}`}>{t('Tamaño de página')}</span>
                <select value={paper} onChange={(e) => setPaper(e.target.value as typeof paper)} aria-label={t('Tamaño de página')} className={s.field}>
                  <option value="a4">A4</option>
                  <option value="letter">Carta (Letter)</option>
                  <option value="fit">{t('Igual que la imagen')}</option>
                </select>
              </label>
              {paper !== 'fit' && (
                <label className="flex flex-col gap-1.5">
                  <span className={`flex justify-between text-xs ${s.muted}`}>
                    {t('Margen')}
                    <span className="font-mono">{margin} mm</span>
                  </span>
                  <input type="range" min={0} max={30} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="accent-neutral-500" />
                </label>
              )}
            </>
          )}
          {mode === 'merge' && <p className={`text-xs leading-relaxed ${s.muted}`}>{t('Sube los PDF y ordénalos con las flechas. Los protegidos con contraseña no se pueden unir.')}</p>}
          <button type="button" onClick={run} disabled={busy} className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${s.primary}`}>
            {busy ? t('Trabajando…') : action_label}
          </button>
          {message && (
            <p role="status" className={`text-xs leading-relaxed ${message.error ? 'text-red-500' : s.muted}`}>
              {message.text}
            </p>
          )}
          <p className={`text-[0.7rem] leading-relaxed ${s.faint}`}>{t('Los archivos no salen de tu equipo. El original nunca se modifica.')}</p>
        </aside>
      </div>
    </div>
  )
}
