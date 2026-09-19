import { useEffect, useRef, useState } from 'react'
import { t } from '../../../lib/i18n'
import { Icon } from '../../ui'
import type { Skin } from '../skin'
import { ACCEPT, FORMATS, ICO_SIZES, decodeFile, encodeCanvas, isImageFile, type Format } from './imageCodecs'
import { makeZip, saveBlob } from './zip'

type Resize = 'original' | 'percent' | 'width'

type Options = { format: Format; quality: number; resize: Resize; percent: number; width: number; background: string; icoSizes: number[] }

type Source = { id: string; file: File }

type Outcome = { blob: Blob; name: string; w: number; h: number; thumb: string } | { error: string }

const baseName = (name: string) => {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

const formatSize = (bytes: number) => (bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`)

const typeLabel = (file: File) => {
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
  const fromMime = file.type.replace('image/', '').replace('svg+xml', 'svg').replace('jpeg', 'jpg').replace('x-icon', 'ico').replace('vnd.microsoft.icon', 'ico')
  return (ext || fromMime || '?').toUpperCase()
}

const thumbOf = (canvas: HTMLCanvasElement) => {
  const scale = Math.min(1, 96 / Math.max(canvas.width, canvas.height))
  const small = document.createElement('canvas')
  small.width = Math.max(1, Math.round(canvas.width * scale))
  small.height = Math.max(1, Math.round(canvas.height * scale))
  small.getContext('2d')!.drawImage(canvas, 0, 0, small.width, small.height)
  return small.toDataURL('image/png')
}

async function convert(file: File, options: Options): Promise<Outcome> {
  const format = FORMATS.find((f) => f.id === options.format)!
  let decoded: Awaited<ReturnType<typeof decodeFile>> | null = null
  try {
    decoded = await decodeFile(file)
    const scale = options.resize === 'percent' ? options.percent / 100 : options.resize === 'width' && options.width > 0 ? options.width / decoded.w : 1
    const w = Math.max(1, Math.round(decoded.w * scale))
    const h = Math.max(1, Math.round(decoded.h * scale))
    if (w * h > 120_000_000) throw new Error(t('La imagen resultante es demasiado grande.'))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error(t('No se pudo procesar la imagen.'))
    ctx.imageSmoothingQuality = 'high'
    if (!format.alpha) {
      ctx.fillStyle = options.background
      ctx.fillRect(0, 0, w, h)
    }
    ctx.drawImage(decoded.source, 0, 0, w, h)
    const blob = await encodeCanvas(canvas, options.format, { quality: options.quality, icoSizes: options.icoSizes })
    return { blob, name: `${baseName(file.name)}.${format.ext}`, w, h, thumb: thumbOf(canvas) }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : t('No se pudo convertir.') }
  } finally {
    decoded?.close()
  }
}

export function ImageConverter({ s }: { s: Skin }) {
  const [sources, setSources] = useState<Source[]>([])
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({})
  const [options, setOptions] = useState<Options>({ format: 'png', quality: 0.92, resize: 'original', percent: 50, width: 1280, background: '#ffffff', icoSizes: [16, 32, 48, 256] })
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const picker = useRef<HTMLInputElement>(null)

  const format = FORMATS.find((f) => f.id === options.format)!

  const accept = (files: File[]) => {
    const images = files.filter(isImageFile)
    if (images.length === 0) return
    setSources((prev) => [...prev, ...images.map((file) => ({ id: crypto.randomUUID(), file }))])
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'))
      if (files.length > 0) setSources((prev) => [...prev, ...files.map((file) => ({ id: crypto.randomUUID(), file }))])
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setBusy(true)
      for (const source of sources) {
        const outcome = await convert(source.file, options)
        if (cancelled) return
        setOutcomes((prev) => ({ ...prev, [source.id]: outcome }))
      }
      if (!cancelled) setBusy(false)
    }
    const id = setTimeout(run, 150)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [sources, options])

  const remove = (id: string) => {
    setSources((prev) => prev.filter((x) => x.id !== id))
    setOutcomes((prev) => {
      const { [id]: _drop, ...rest } = prev
      return rest
    })
  }

  const clearAll = () => {
    setSources([])
    setOutcomes({})
  }

  const done = sources
    .map((x) => ({ source: x, outcome: outcomes[x.id] }))
    .filter((x): x is { source: Source; outcome: Extract<Outcome, { blob: Blob }> } => !!x.outcome && 'blob' in x.outcome)

  const downloadAll = async () => {
    if (done.length === 1) return saveBlob(done[0].outcome.name, done[0].outcome.blob)
    saveBlob('imagenes-convertidas.zip', await makeZip(done.map((x) => ({ name: x.outcome.name, blob: x.outcome.blob }))))
  }

  const toggleSize = (size: number) =>
    setOptions((prev) => ({ ...prev, icoSizes: prev.icoSizes.includes(size) ? prev.icoSizes.filter((x) => x !== size) : [...prev.icoSizes, size] }))

  const chip = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${active ? `${s.active} border-transparent` : `${s.line} ${s.muted} ${s.hover}`}`

  const note: Partial<Record<Format, string>> = {
    gif: 'GIF: hasta 256 colores y sin animación.',
    avif: 'AVIF: la primera vez descarga el codificador (unos 3 MB).',
    ico: 'ICO: puede llevar varios tamaños dentro.',
    pgm: 'PGM: escala de grises.',
    ppm: 'PPM: color sin transparencia ni compresión.',
    tga: 'TGA: sin compresión, con transparencia.',
    tiff: 'TIFF: sin compresión, con transparencia.',
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            accept([...e.dataTransfer.files])
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors ${
            dragging ? (s.dark ? 'border-white/60 bg-white/[0.06]' : 'border-black/50 bg-black/[0.04]') : s.line
          }`}
        >
          <Icon name="upload" className={`h-6 w-6 ${s.muted}`} />
          <p className="text-sm font-medium">{t('Arrastra tus imágenes aquí')}</p>
          <p className={`text-xs ${s.faint}`}>{t('O pega una imagen con Ctrl+V. PNG, JPG, WebP, GIF, BMP, SVG, AVIF, ICO, TIFF, TGA, PPM, PGM y HEIC.')}</p>
          <button type="button" onClick={() => picker.current?.click()} className={`mt-1 rounded-lg px-4 py-2 text-sm font-medium ${s.primary}`}>
            {t('Elegir archivos')}
          </button>
          <input
            ref={picker}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              accept([...(e.target.files ?? [])])
              e.target.value = ''
            }}
          />
        </div>

        {sources.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`}>
                {sources.length} {t(sources.length === 1 ? 'imagen' : 'imágenes')}
                {busy && ` · ${t('Convirtiendo…')}`}
              </p>
              <span className="flex-1" />
              <button type="button" disabled={done.length === 0} onClick={downloadAll} className={`${s.ghost} disabled:opacity-40`}>
                {done.length > 1 ? t('Descargar todo (.zip)') : t('Descargar')}
              </button>
              <button type="button" onClick={clearAll} className={`text-xs ${s.muted} transition-colors hover:text-red-500`}>
                {t('Quitar todo')}
              </button>
            </div>
            <ul className={`flex flex-col divide-y overflow-hidden rounded-2xl border ${s.line} ${s.divide}`}>
              {sources.map((source) => {
                const outcome = outcomes[source.id]
                return (
                  <li key={source.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border ${s.line} ${s.dark ? 'bg-white/[0.04]' : 'bg-black/[0.03]'}`}>
                      {outcome && 'thumb' in outcome ? <img src={outcome.thumb} alt="" className="h-full w-full object-cover" /> : <span className={`text-[0.6rem] ${s.faint}`}>{typeLabel(source.file)}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{source.file.name}</p>
                      <p className={`truncate text-[0.7rem] ${outcome && 'error' in outcome ? 'text-red-500' : s.faint}`}>
                        {!outcome
                          ? t('Convirtiendo…')
                          : 'error' in outcome
                            ? outcome.error
                            : `${typeLabel(source.file)} ${formatSize(source.file.size)} → ${format.label} ${formatSize(outcome.blob.size)} · ${outcome.w}×${outcome.h}${
                                source.file.size > 0 ? ` (${outcome.blob.size <= source.file.size ? '−' : '+'}${Math.abs(Math.round((1 - outcome.blob.size / source.file.size) * 100))} %)` : ''
                              }`}
                      </p>
                    </div>
                    {outcome && 'blob' in outcome && (
                      <button type="button" onClick={() => saveBlob(outcome.name, outcome.blob)} aria-label={`${t('Descargar')} ${outcome.name}`} className={s.iconButton}>
                        <Icon name="download" className="h-4 w-4" />
                      </button>
                    )}
                    <button type="button" onClick={() => remove(source.id)} aria-label={t('Quitar')} className={`shrink-0 ${s.muted} transition-colors hover:text-red-500`}>
                      <Icon name="close" className="h-4 w-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      <aside className={`flex h-fit flex-col gap-4 rounded-2xl border p-4 ${s.line} ${s.panel}`}>
        <div className="flex flex-col gap-2">
          <p className={`font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`}>{t('Convertir a')}</p>
          <div className="grid grid-cols-4 gap-1.5">
            {FORMATS.map((f) => (
              <button key={f.id} type="button" aria-pressed={options.format === f.id} onClick={() => setOptions({ ...options, format: f.id })} className={`${chip(options.format === f.id)} !px-1 text-center`}>
                {f.label}
              </button>
            ))}
          </div>
          {note[options.format] && <p className={`text-[0.7rem] leading-relaxed ${s.faint}`}>{t(note[options.format]!)}</p>}
        </div>

        {format.lossy && (
          <label className="flex flex-col gap-1.5">
            <span className={`flex justify-between text-xs ${s.muted}`}>
              {t('Calidad')}
              <span className="font-mono">{Math.round(options.quality * 100)} %</span>
            </span>
            <input type="range" min={10} max={100} step={1} value={Math.round(options.quality * 100)} onChange={(e) => setOptions({ ...options, quality: Number(e.target.value) / 100 })} className="accent-neutral-500" />
          </label>
        )}

        {options.format === 'ico' && (
          <div className="flex flex-col gap-2">
            <p className={`text-xs ${s.muted}`}>{t('Tamaños incluidos')}</p>
            <div className="flex flex-wrap gap-1.5">
              {ICO_SIZES.map((size) => (
                <button key={size} type="button" aria-pressed={options.icoSizes.includes(size)} onClick={() => toggleSize(size)} className={`${chip(options.icoSizes.includes(size))} !px-2 !py-1 !text-xs font-mono`}>
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {!format.alpha && (
          <label className={`flex items-center justify-between gap-3 text-xs ${s.muted}`}>
            {t('Fondo para transparencias')}
            <input type="color" value={options.background} onChange={(e) => setOptions({ ...options, background: e.target.value })} className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
          </label>
        )}

        <div className="flex flex-col gap-2">
          <p className={`font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`}>{t('Tamaño')}</p>
          <select value={options.resize} onChange={(e) => setOptions({ ...options, resize: e.target.value as Resize })} aria-label={t('Tamaño')} className={s.field}>
            <option value="original">{t('Original')}</option>
            <option value="percent">{t('Por porcentaje')}</option>
            <option value="width">{t('Ancho máximo en píxeles')}</option>
          </select>
          {options.resize === 'percent' && (
            <label className="flex flex-col gap-1.5">
              <span className={`flex justify-between text-xs ${s.muted}`}>
                {t('Escala')}
                <span className="font-mono">{options.percent} %</span>
              </span>
              <input type="range" min={5} max={200} step={5} value={options.percent} onChange={(e) => setOptions({ ...options, percent: Number(e.target.value) })} className="accent-neutral-500" />
            </label>
          )}
          {options.resize === 'width' && (
            <input
              type="number"
              min={1}
              max={20000}
              value={options.width}
              onChange={(e) => setOptions({ ...options, width: Math.max(1, Math.min(20000, Number(e.target.value) || 1)) })}
              aria-label={t('Ancho en píxeles')}
              className={`${s.field} font-mono`}
            />
          )}
        </div>

        <p className={`text-[0.7rem] leading-relaxed ${s.faint}`}>
          {t('Todo se convierte en tu equipo: las imágenes no se suben a ningún sitio. Los GIF animados se guardan con su primer fotograma.')}
        </p>
      </aside>
    </div>
  )
}
