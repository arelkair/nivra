import { useState, type ReactNode } from 'react'
import { t } from '../../lib/i18n'
import { useStored } from '../../lib/store'

const PANELS = ['Ahora', 'Tu día', 'Tareas', 'Cuentas atrás', 'Exámenes y Proyectos', 'Notas', 'Suscripciones', 'Dinero', 'Tu curso en números']
const DEFAULT_ORDER = PANELS.map((_, index) => index)
export function HomeLayout({ children }: { children: ReactNode }) {
  const nodes = Array.isArray(children) ? children : [children]
  const [storedOrder, setOrder] = useStored<number[]>('nivra-initiative-home-order', DEFAULT_ORDER)
  const [hidden, setHidden] = useStored<number[]>('nivra-initiative-home-hidden', [])
  const [editing, setEditing] = useState(false)
  const [dragging, setDragging] = useState<number | null>(null)
  const order = [...new Set([...storedOrder, ...DEFAULT_ORDER])].filter(id => DEFAULT_ORDER.includes(id))
  const move = (id: number, to: number) => {
    const next = order.filter(value => value !== id)
    next.splice(Math.max(0, Math.min(to, next.length)), 0, id)
    setOrder(next)
  }
  return <div className="flex flex-col gap-4">
    <div className="flex justify-end"><button className="nv-ghost rounded px-3 py-2 text-xs" type="button" aria-expanded={editing} onClick={() => setEditing(!editing)}>{t(editing ? 'Terminar edición' : 'Personalizar Inicio')}</button></div>
    {editing && <section className="nv-panel rounded-lg border border-current/15 p-4" aria-label={t('Elegir paneles')}>
      <p className="mb-3 text-xs opacity-70">{t('Elige los paneles y arrástralos o usa las flechas para moverlos.')}</p>
      <div className="flex flex-wrap gap-3">{PANELS.map((label, id) => <label key={id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!hidden.includes(id)} onChange={e => setHidden(prev => e.target.checked ? prev.filter(x => x !== id) : [...prev, id])} />{t(label)}</label>)}</div>
      <button className="mt-4 text-xs underline underline-offset-4" type="button" onClick={() => { setOrder(DEFAULT_ORDER); setHidden([]) }}>{t('Restablecer distribución')}</button>
    </section>}
    <div className="nv-home-grid grid items-start gap-4 lg:grid-cols-2">
      {order.filter(id => !hidden.includes(id) && nodes[id]).map(id => <div key={id} className="nv-home-widget min-w-0" onDragOver={e => { if (editing) e.preventDefault() }} onDrop={e => { e.preventDefault(); if (dragging !== null) move(dragging, order.indexOf(id)); setDragging(null) }}>
        {editing && <div className="mb-2 flex items-center gap-2 text-xs">
          <button type="button" draggable onDragStart={() => setDragging(id)} onDragEnd={() => setDragging(null)} className="cursor-grab rounded border border-current/20 px-2 py-1" aria-label={`${t('Mover')} ${t(PANELS[id])}`}>⠿ {t(PANELS[id])}</button>
          <button type="button" disabled={order.indexOf(id) === 0} onClick={() => move(id, order.indexOf(id) - 1)} aria-label={`${t('Subir')} ${t(PANELS[id])}`} className="rounded border border-current/20 px-2 py-1 disabled:opacity-30">↑</button>
          <button type="button" disabled={order.indexOf(id) === order.length - 1} onClick={() => move(id, order.indexOf(id) + 1)} aria-label={`${t('Bajar')} ${t(PANELS[id])}`} className="rounded border border-current/20 px-2 py-1 disabled:opacity-30">↓</button>
        </div>}{nodes[id]}
      </div>)}
    </div>
    {hidden.length === PANELS.length && <p className="py-8 text-center text-sm opacity-60">{t('Elige paneles para crear tu Inicio.')}</p>}
  </div>
}
