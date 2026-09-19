import { useEffect, useMemo, useRef, useState } from 'react'
import { t } from '../../lib/i18n'
import { useStored } from '../../lib/store'
import { Icon } from '../ui'
import { skin } from './skin'
import { wordCount, type VaultNote } from './vault/vaultModel'

type Props = {
  dark: boolean
  notes: VaultNote[]
  setNotes: (update: (prev: VaultNote[]) => VaultNote[]) => void
  createNote: (title: string) => string
  onOpenNote: (id: string) => void
  onClose: () => void
}

type Frame = { x: number; y: number; w: number; h: number; collapsed: boolean }

const MARGIN = 12

const viewport = () => ({ w: innerWidth > 200 ? innerWidth : 1280, h: innerHeight > 200 ? innerHeight : 720 })

const defaultFrame = (): Frame => {
  const w = 340
  const h = 300
  const v = viewport()
  return { x: Math.max(MARGIN, v.w - w - 24), y: Math.max(MARGIN, v.h - h - 84), w, h, collapsed: false }
}

const clamp = (f: Frame): Frame => {
  const v = viewport()
  return { ...f, x: Math.min(Math.max(MARGIN - f.w + 120, f.x), v.w - 120), y: Math.min(Math.max(MARGIN, f.y), v.h - 48) }
}

export function InitiativeNote({ dark, notes, setNotes, createNote, onOpenNote, onClose }: Props) {
  const s = skin(dark)
  const [stored, setStored] = useStored<Frame | null>('nivra-initiative-note-frame', null)
  const [activeId, setActiveId] = useStored<string>('nivra-initiative-note-active', '')
  const [frame, setFrame] = useState<Frame>(() => clamp(stored ?? defaultFrame()))
  const box = useRef<HTMLElement>(null)
  const text = useRef<HTMLTextAreaElement>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const wide = matchMedia('(min-width: 768px)').matches

  const quickTitle = t('Nota rápida')
  const active = useMemo(() => notes.find((n) => n.id === activeId) ?? notes.find((n) => n.title === quickTitle) ?? null, [notes, activeId, quickTitle])
  const creating = useRef(false)

  useEffect(() => {
    if (active || creating.current) return
    creating.current = true
    setActiveId(createNote(quickTitle))
  }, [active, createNote, quickTitle, setActiveId])

  useEffect(() => {
    if (!frame.collapsed) text.current?.focus()
  }, [frame.collapsed, active?.id])

  useEffect(() => {
    const el = box.current
    if (!el || !wide) return
    const observer = new ResizeObserver(() => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      setFrame((prev) => (Math.abs(prev.w - w) > 1 || Math.abs(prev.h - h) > 1 ? { ...prev, w, h } : prev))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [wide, frame.collapsed])

  useEffect(() => {
    const id = setTimeout(() => setStored(frame), 300)
    return () => clearTimeout(id)
  }, [frame, setStored])

  useEffect(() => {
    const onResize = () => setFrame((f) => clamp(f))
    addEventListener('resize', onResize)
    return () => removeEventListener('resize', onResize)
  }, [])

  const update = (body: string) => {
    if (!active) return
    setNotes((prev) => prev.map((n) => (n.id === active.id ? { ...n, body, updated: Date.now() } : n)))
  }

  const create = () => {
    const id = createNote(t('Nota rápida'))
    setActiveId(id)
  }

  const words = active ? wordCount(active.body) : 0

  return (
    <section
      ref={box}
      role="dialog"
      aria-label={t('Nota rápida')}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
      style={
        wide
          ? { left: frame.x, top: frame.y, width: frame.w, height: frame.collapsed ? undefined : frame.h, resize: frame.collapsed ? 'none' : 'both', minWidth: 260, minHeight: frame.collapsed ? 0 : 200, maxWidth: '90vw', maxHeight: '80vh' }
          : undefined
      }
      className={`fixed z-40 flex flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-sm max-md:inset-x-3 max-md:bottom-[4.75rem] ${frame.collapsed ? '' : 'max-md:h-64'} ${s.line} ${
        dark ? 'bg-[#131316]/95 text-neutral-100 [color-scheme:dark]' : 'bg-white/95 text-neutral-900'
      }`}
    >
      <header
        onPointerDown={(e) => {
          if (!wide || (e.target as HTMLElement).closest('button, select')) return
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = { dx: e.clientX - frame.x, dy: e.clientY - frame.y }
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          setFrame((f) => clamp({ ...f, x: e.clientX - drag.current!.dx, y: e.clientY - drag.current!.dy }))
        }}
        onPointerUp={() => {
          drag.current = null
        }}
        onDoubleClick={() => setFrame((f) => ({ ...f, collapsed: !f.collapsed }))}
        className={`flex shrink-0 items-center gap-2 px-3 py-2 md:cursor-grab md:active:cursor-grabbing ${frame.collapsed ? '' : `border-b ${s.line}`}`}
      >
        <Icon name="drag" className={`hidden h-4 w-4 shrink-0 md:block ${s.faint}`} />
        {notes.length > 1 && !frame.collapsed ? (
          <select
            value={active?.id ?? ''}
            onChange={(e) => setActiveId(e.target.value)}
            aria-label={t('Nota')}
            className={`min-w-0 flex-1 truncate bg-transparent text-sm font-medium outline-none ${s.strong}`}
          >
            {notes.map((n) => (
              <option key={n.id} value={n.id} className="text-neutral-900">
                {n.title}
              </option>
            ))}
          </select>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{active?.title ?? t('Nota rápida')}</span>
        )}
        <button type="button" onClick={create} aria-label={t('Nueva nota')} title={t('Nueva nota')} className={`shrink-0 ${s.muted} ${s.hoverText}`}>
          <Icon name="plus" className="h-4 w-4" />
        </button>
        {active && (
          <button type="button" onClick={() => onOpenNote(active.id)} aria-label={t('Abrir en la Bóveda')} title={t('Abrir en la Bóveda')} className={`shrink-0 ${s.muted} ${s.hoverText}`}>
            <Icon name="graph" className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setFrame((f) => ({ ...f, collapsed: !f.collapsed }))}
          aria-label={frame.collapsed ? t('Expandir') : t('Minimizar')}
          title={frame.collapsed ? t('Expandir') : t('Minimizar')}
          className={`shrink-0 ${s.muted} ${s.hoverText}`}
        >
          <Icon name={frame.collapsed ? 'up' : 'down'} className="h-4 w-4" />
        </button>
        <button type="button" onClick={onClose} aria-label={t('Cerrar')} title={t('Cerrar')} className={`shrink-0 ${s.muted} ${s.hoverText}`}>
          <Icon name="close" className="h-4 w-4" />
        </button>
      </header>

      {!frame.collapsed &&
        (active ? (
          <>
            <textarea
              ref={text}
              value={active.body}
              onChange={(e) => update(e.target.value)}
              spellCheck
              placeholder={t('Escribe aquí. Se guarda solo en tu Bóveda.')}
              aria-label={t('Contenido de la nota')}
              className="nivra-scroll min-h-0 flex-1 resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed outline-none placeholder:text-neutral-500"
            />
            <div className={`flex shrink-0 items-center justify-between border-t px-4 py-1.5 text-[0.65rem] ${s.line} ${s.faint}`}>
              <span>{t('Se guarda solo')}</span>
              <span className="tabular-nums">
                {words} {t(words === 1 ? 'palabra' : 'palabras')}
              </span>
            </div>
          </>
        ) : (
          <button type="button" onClick={create} className={`flex flex-1 items-center justify-center gap-2 text-sm ${s.muted} ${s.hoverText}`}>
            <Icon name="plus" className="h-4 w-4" />
            {t('Crear una nota rápida')}
          </button>
        ))}
    </section>
  )
}
