import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { t } from '../../../lib/i18n'
import { skin } from '../skin'

export type MenuItem = { label: string; onSelect: () => void; danger?: boolean; indent?: number; separator?: boolean; submenu?: MenuItem[] }

export type MenuState = { x: number; y: number; items: MenuItem[] } | null

type Open = { index: number; x: number; y: number; flip: boolean }

export function ContextMenu({ menu, onClose, dark }: { menu: NonNullable<MenuState>; onClose: () => void; dark: boolean }) {
  const s = skin(dark)
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: menu.x, y: menu.y })
  const [open, setOpen] = useState<Open | null>(null)
  const [filter, setFilter] = useState('')

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({
      x: Math.max(8, Math.min(menu.x, window.innerWidth - rect.width - 8)),
      y: Math.max(8, Math.min(menu.y, window.innerHeight - rect.height - 8)),
    })
  }, [menu])

  useEffect(() => {
    const close = () => onClose()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('pointerdown', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', key)
    }
  }, [onClose])

  const surface = `fixed z-50 rounded-xl border shadow-xl ${s.line} ${dark ? 'bg-neutral-900 text-neutral-100' : 'bg-white text-neutral-900'}`
  const rowClass = (danger?: boolean) =>
    `block w-full truncate py-2 pr-4 text-left text-sm transition-colors ${danger ? 'text-red-500 hover:bg-red-500/10' : `${s.muted} ${s.hover} ${s.hoverText}`}`

  const openSub = (index: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect()
    const flip = rect.right + 250 > window.innerWidth
    setFilter('')
    setOpen({ index, x: flip ? rect.left - 4 : rect.right + 4, y: rect.top - 4, flip })
  }

  const submenu = open ? menu.items[open.index]?.submenu : undefined
  const shown = submenu?.filter((item) => item.label.toLowerCase().includes(filter.trim().toLowerCase())) ?? []

  return (
    <>
      <div
        ref={ref}
        role="menu"
        onPointerDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        style={{ left: pos.x, top: pos.y }}
        className={`${surface} min-w-48 py-1`}
      >
        {menu.items.map((item, i) =>
          item.separator ? (
            <div key={i} className={`my-1 h-px ${dark ? 'bg-white/10' : 'bg-black/10'}`} />
          ) : item.submenu ? (
            <button
              key={i}
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={open?.index === i}
              onMouseEnter={(e) => openSub(i, e.currentTarget)}
              onClick={(e) => (open?.index === i ? setOpen(null) : openSub(i, e.currentTarget))}
              className={`${rowClass()} flex items-center justify-between gap-6 pl-3 ${open?.index === i ? s.active : ''}`}
            >
              <span className="truncate">{item.label}</span>
              <span aria-hidden className={s.faint}>
                ›
              </span>
            </button>
          ) : (
            <button
              key={i}
              type="button"
              role="menuitem"
              onMouseEnter={() => setOpen(null)}
              onClick={() => {
                onClose()
                item.onSelect()
              }}
              style={{ paddingLeft: 12 + (item.indent ?? 0) * 12 }}
              className={rowClass(item.danger)}
            >
              {item.label}
            </button>
          ),
        )}
      </div>

      {open && submenu && (
        <div
          role="menu"
          onPointerDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            left: open.x,
            top: Math.max(8, Math.min(open.y, window.innerHeight - 340)),
            transform: open.flip ? 'translateX(-100%)' : undefined,
          }}
          className={`${surface} flex max-h-80 w-56 flex-col overflow-hidden py-1`}
        >
          {submenu.length > 8 && (
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t('Buscar carpeta…')}
              aria-label={t('Buscar carpeta…')}
              autoFocus
              className={`mx-2 mb-1 rounded-md border bg-transparent px-2 py-1 text-xs outline-none placeholder:text-neutral-500 ${s.line}`}
            />
          )}
          <div className="nivra-scroll overflow-y-auto">
            {shown.length === 0 && <p className={`px-3 py-2 text-xs ${s.faint}`}>{t('Sin resultados.')}</p>}
            {shown.map((item, i) => (
              <button
                key={i}
                type="button"
                role="menuitem"
                onClick={() => {
                  onClose()
                  item.onSelect()
                }}
                title={item.label}
                className={`${rowClass(item.danger)} pl-3`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
