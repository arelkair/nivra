import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { skin } from '../skin'

export type MenuItem = { label: string; onSelect: () => void; danger?: boolean; indent?: number; separator?: boolean }

export type MenuState = { x: number; y: number; items: MenuItem[] } | null

export function ContextMenu({ menu, onClose, dark }: { menu: NonNullable<MenuState>; onClose: () => void; dark: boolean }) {
  const s = skin(dark)
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: menu.x, y: menu.y })

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

  return (
    <div
      ref={ref}
      role="menu"
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{ left: pos.x, top: pos.y }}
      className={`nivra-scroll fixed z-50 max-h-[70svh] min-w-48 overflow-y-auto rounded-xl border py-1 shadow-xl ${s.line} ${dark ? 'bg-neutral-900 text-neutral-100' : 'bg-white text-neutral-900'}`}
    >
      {menu.items.map((item, i) =>
        item.separator ? (
          <div key={i} className={`my-1 h-px ${dark ? 'bg-white/10' : 'bg-black/10'}`} />
        ) : (
          <button
            key={i}
            type="button"
            role="menuitem"
            onClick={() => {
              onClose()
              item.onSelect()
            }}
            style={{ paddingLeft: 12 + (item.indent ?? 0) * 12 }}
            className={`block w-full truncate py-2 pr-4 text-left text-sm transition-colors ${
              item.danger ? 'text-red-500 hover:bg-red-500/10' : `${s.muted} ${s.hover} ${s.hoverText}`
            }`}
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  )
}
