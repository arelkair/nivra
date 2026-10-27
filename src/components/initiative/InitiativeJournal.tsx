import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { dateKey, useStored } from '../../lib/store'
import { locale, t, tp } from '../../lib/i18n'
import { deleteMedia, saveImage, useMedia } from '../../lib/photos'
import { notify } from '../../lib/undo'
import { Icon, Modal } from '../ui'
import { skin } from './skin'

const MAX_LINES = 5
const MAX_PHOTOS = 3

type Journal = Record<string, string>
type Photos = Record<string, string[]>

const fromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const shift = (key: string, days: number) => {
  const d = fromKey(key)
  d.setDate(d.getDate() + days)
  return dateKey(d)
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

function visualLines(el: HTMLTextAreaElement) {
  if (!el.value) return 0
  if (!el.clientWidth) return el.value.split('\n').length
  const cs = getComputedStyle(el)
  const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.6
  const padding = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
  const previous = el.style.height
  el.style.height = '0px'
  const height = el.scrollHeight - padding
  el.style.height = previous
  return Math.max(1, Math.round(height / lineHeight))
}

function fitLines(el: HTMLTextAreaElement, value: string) {
  if (!el.clientWidth) return value
  el.value = value
  if (visualLines(el) <= MAX_LINES) return value
  let lo = 0
  let hi = value.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    el.value = value.slice(0, mid)
    if (visualLines(el) <= MAX_LINES) lo = mid
    else hi = mid - 1
  }
  const fitted = value.slice(0, lo).replace(/\n$/, '')
  el.value = fitted
  return fitted
}

function Photo({ id, size, onOpen, onRemove }: { id: string; size: 'big' | 'small'; onOpen: (src: string) => void; onRemove?: () => void }) {
  const { src, missing } = useMedia(id)
  const box = size === 'big' ? 'h-24 w-24' : 'h-16 w-16'
  return (
    <div className={`group relative shrink-0 ${box}`}>
      {src ? (
        <button type="button" onClick={() => onOpen(src)} aria-label={t('Ver foto')} className="h-full w-full overflow-hidden rounded-xl">
          <img src={src} alt="" className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]" />
        </button>
      ) : (
        <div className="grid h-full w-full place-items-center rounded-xl bg-(--sunken) p-1 text-center text-[0.6rem] leading-tight text-(--minimal-muted)">
          {missing ? t('Foto en otro dispositivo') : ''}
        </div>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('Quitar foto')}
          className="absolute -top-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full border border-(--minimal-line) bg-(--surface) text-(--minimal-muted) opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-red-500 pointer-coarse:opacity-100"
        >
          <Icon name="close" className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

export function InitiativeJournal({ dark }: { dark: boolean }) {
  const s = skin(dark)
  const [journal, setJournal] = useStored<Journal>('nivra-journal', {})
  const [photos, setPhotos] = useStored<Photos>('nivra-journal-photos', {})
  const today = dateKey(new Date())
  const [day, setDay] = useState(today)
  const [lines, setLines] = useState(0)
  const [viewing, setViewing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const area = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const text = journal[day] ?? ''
  const dayPhotos = photos[day] ?? []
  const year = Number(day.slice(0, 4))
  const monthDay = day.slice(5)

  useLayoutEffect(() => {
    if (area.current) setLines(visualLines(area.current))
  }, [text, day])

  useEffect(() => {
    const el = area.current
    if (!el) return
    const observer = new ResizeObserver(() => setLines(visualLines(el)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [day])

  const past = useMemo(() => {
    const days = new Set([monthDay])
    if (monthDay === '02-28' && !isLeap(year)) days.add('02-29')
    const keys = new Set([...Object.keys(journal), ...Object.keys(photos)])
    return [...keys]
      .filter((k) => Number(k.slice(0, 4)) < year && days.has(k.slice(5)) && ((journal[k] ?? '').trim() || (photos[k] ?? []).length))
      .sort((a, b) => b.localeCompare(a))
  }, [journal, photos, monthDay, year])

  const written = useMemo(
    () => new Set([...Object.keys(journal).filter((k) => journal[k].trim()), ...Object.keys(photos).filter((k) => photos[k].length)]).size,
    [journal, photos],
  )

  const write = (el: HTMLTextAreaElement) => {
    const next = fitLines(el, el.value)
    setJournal((prev) => {
      const copy = { ...prev }
      if (next.trim()) copy[day] = next
      else delete copy[day]
      return copy
    })
  }

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    const room = MAX_PHOTOS - dayPhotos.length
    const chosen = [...files].filter((f) => f.type.startsWith('image/')).slice(0, room)
    if (files.length > room) notify(tp('Máximo {0} fotos por día.', MAX_PHOTOS))
    if (!chosen.length) return
    setBusy(true)
    try {
      const saved = await Promise.all(chosen.map((f) => saveImage(f, 1600)))
      setPhotos((prev) => ({ ...prev, [day]: [...(prev[day] ?? []), ...saved.map((x) => x.id)].slice(0, MAX_PHOTOS) }))
    } catch {
      notify(t('No se pudo guardar la foto.'))
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const rest = (prev[day] ?? []).filter((x) => x !== id)
      const copy = { ...prev }
      if (rest.length) copy[day] = rest
      else delete copy[day]
      return copy
    })
    deleteMedia(id)
  }

  const title = fromKey(day).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const short = fromKey(day).toLocaleDateString(locale(), { day: 'numeric', month: 'long' })

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-initiative text-3xl font-medium tracking-tight sm:text-4xl">{t('Diario')}</h1>
        <p className={`text-sm ${s.muted}`}>{tp('{0} días escritos', written)}</p>
      </header>

      <section className={`flex flex-col gap-4 rounded-2xl border p-5 ${s.line} ${s.panel}`}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setDay(shift(day, -1))} aria-label={t('Día anterior')} className={s.iconButton}>
            <Icon name="left" className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-base font-medium first-letter:uppercase">{title}</p>
            {day !== today && (
              <button type="button" onClick={() => setDay(today)} className={`text-xs ${s.muted} underline-offset-4 hover:underline`}>
                {t('Volver a hoy')}
              </button>
            )}
          </div>
          <button type="button" onClick={() => setDay(shift(day, 1))} disabled={day >= today} aria-label={t('Día siguiente')} className={`${s.iconButton} disabled:opacity-35`}>
            <Icon name="right" className="h-4 w-4" />
          </button>
        </div>

        <label className="flex flex-col gap-2">
          <span className="sr-only">{tp('Qué pasó el {0}', short)}</span>
          <textarea
            ref={area}
            key={day}
            value={text}
            onChange={(e) => write(e.target)}
            rows={MAX_LINES}
            placeholder={day === today ? t('¿Qué ha pasado hoy?') : t('¿Qué pasó este día?')}
            className={`${s.field} resize-none overflow-hidden leading-relaxed`}
          />
          <span className={`font-mono text-[0.7rem] tabular-nums ${lines >= MAX_LINES ? 'text-(--minimal-accent)' : s.faint}`}>{tp('{0}/{1} líneas', lines, MAX_LINES)}</span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          {dayPhotos.map((id) => (
            <Photo key={id} id={id} size="big" onOpen={setViewing} onRemove={() => removePhoto(id)} />
          ))}
          {dayPhotos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className={`grid h-24 w-24 shrink-0 place-items-center rounded-xl border border-dashed text-xs transition-colors disabled:opacity-50 ${s.line} ${s.muted} hover:border-(--minimal-accent) hover:text-(--minimal-text)`}
            >
              <span className="flex flex-col items-center gap-1">
                <Icon name="image" className="h-5 w-5" />
                {busy ? t('Guardando…') : tp('Foto {0}/{1}', dayPhotos.length, MAX_PHOTOS)}
              </span>
            </button>
          )}
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="nv-group-label">{tp('El {0} en otros años', short)}</h2>
        {past.length === 0 ? (
          <p className={`rounded-2xl border border-dashed px-5 py-6 text-center text-sm ${s.line} ${s.muted}`}>
            {t('Cuando vuelva este día el año que viene, aquí verás lo que escribiste.')}
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {past.map((key, i) => {
              const ago = year - Number(key.slice(0, 4))
              return (
                <li
                  key={key}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={`animate-[fade-in_0.4s_cubic-bezier(.16,1,.3,1)_both] flex flex-col gap-3 rounded-2xl border px-5 py-4 ${s.line} ${s.panel}`}
                >
                  <p className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-sm font-semibold tabular-nums">{key.slice(0, 4)}</span>
                    <span className={`text-xs ${s.muted}`}>{ago === 1 ? t('Hace 1 año') : tp('Hace {0} años', ago)}</span>
                  </p>
                  {journal[key]?.trim() && <p className="text-sm leading-relaxed whitespace-pre-wrap">{journal[key]}</p>}
                  {(photos[key] ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {photos[key].map((id) => (
                        <Photo key={id} id={id} size="small" onOpen={setViewing} />
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {viewing && (
        <Modal title={t('Foto')} onClose={() => setViewing(null)} size="wide">
          <img src={viewing} alt="" className="mx-auto max-h-[70vh] w-auto rounded-xl" />
        </Modal>
      )}
    </div>
  )
}
