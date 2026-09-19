import { useEffect, useState } from 'react'
import { t, tp } from '../../lib/i18n'
import type { Settings } from '../../lib/settings'
import { SHORTCUTS, keyOf, prettyKey as pretty } from '../../lib/shortcuts'
import { notify } from '../../lib/undo'
import { Icon } from '../ui'
import { skin, type Skin } from './skin'

export function Keycap({ s, value }: { s: Skin; value: string }) {
  return <kbd className={`inline-block rounded-md border px-1.5 py-0.5 font-mono text-[0.68rem] whitespace-nowrap ${s.line} ${s.dark ? 'bg-white/[0.05]' : 'bg-black/[0.03]'}`}>{pretty(value)}</kbd>
}

const visible = (bankEnabled: boolean) => SHORTCUTS.filter((a) => a.id !== 'banco' || bankEnabled)

export function ShortcutsEditor({ cfg, dark }: { cfg: Settings; dark: boolean }) {
  const s = skin(dark)
  const [capturing, setCapturing] = useState<string | null>(null)

  useEffect(() => {
    if (!capturing) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return
      if (e.key === 'Escape') {
        setCapturing(null)
        return
      }
      const key = keyOf(e)
      const taken = SHORTCUTS.find((a) => a.id !== capturing && (cfg.customKeys[a.id] ?? a.key) === key)
      if (taken) {
        notify(tp('Esa tecla ya la usa «{0}».', t(taken.label)))
        setCapturing(null)
        return
      }
      cfg.setCustomKeys((prev) => ({ ...prev, [capturing]: key }))
      setCapturing(null)
    }
    addEventListener('keydown', onKey, true)
    return () => removeEventListener('keydown', onKey, true)
  }, [capturing, cfg])

  return (
    <ul>
      {visible(cfg.bankEnabled).map((a) => {
        const key = cfg.customKeys[a.id] ?? a.key
        const changed = key !== a.key
        return (
          <li key={a.id} className={`flex items-center gap-2 border-b py-2.5 last:border-0 ${s.line}`}>
            <span className="min-w-0 flex-1 truncate text-sm">{t(a.label)}</span>
            <button
              type="button"
              disabled={!cfg.shortcutsOn}
              onClick={() => setCapturing(capturing === a.id ? null : a.id)}
              title={t('Pulsa para cambiar la tecla')}
              className={`shrink-0 rounded-md border px-2 py-1 font-mono text-[0.68rem] transition-colors disabled:opacity-40 ${capturing === a.id ? (dark ? 'border-white' : 'border-neutral-900') : `${s.line} ${s.hover}`}`}
            >
              {capturing === a.id ? t('pulsa una tecla…') : pretty(key)}
            </button>
            {changed && (
              <button
                type="button"
                onClick={() =>
                  cfg.setCustomKeys((prev) => {
                    const copy = { ...prev }
                    delete copy[a.id]
                    return copy
                  })
                }
                aria-label={`${t('Restaurar tecla de')} ${t(a.label)}`}
                className={`shrink-0 ${s.muted} ${s.hoverText}`}
              >
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            )}
            <input
              type="checkbox"
              checked={cfg.enabledShortcuts[a.id] !== false}
              disabled={!cfg.shortcutsOn}
              onChange={(e) => cfg.setEnabledShortcuts((prev) => ({ ...prev, [a.id]: e.target.checked }))}
              aria-label={`${t('Activar')} ${t(a.label)}`}
              className="h-4 w-4 shrink-0 accent-neutral-500"
            />
          </li>
        )
      })}
    </ul>
  )
}

export function ShortcutsHelp({ cfg, dark, onClose }: { cfg: Settings; dark: boolean; onClose: () => void }) {
  const s = skin(dark)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])

  const active = visible(cfg.bankEnabled).filter((a) => cfg.enabledShortcuts[a.id] !== false)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-3">
      <button type="button" aria-label={t('Cerrar')} onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div role="dialog" aria-label={t('Atajos de teclado')} className={`relative flex max-h-[80svh] w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-2xl ${s.line} ${dark ? 'bg-[#131316] text-neutral-100 [color-scheme:dark]' : 'bg-white text-neutral-900'}`}>
        <div className={`flex items-center justify-between border-b px-5 py-3 ${s.line}`}>
          <p className="text-sm font-medium">{t('Atajos de teclado')}</p>
          <button type="button" onClick={onClose} aria-label={t('Cerrar')} className={`${s.muted} ${s.hoverText}`}>
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        {!cfg.shortcutsOn ? (
          <p className={`px-5 py-6 text-sm ${s.faint}`}>{t('Los atajos están desactivados en Ajustes.')}</p>
        ) : (
          <ul className="nivra-scroll overflow-y-auto px-5 py-2">
            {active.map((a) => (
              <li key={a.id} className={`flex items-center justify-between gap-3 border-b py-2 last:border-0 ${s.line}`}>
                <span className="min-w-0 truncate text-sm">{t(a.label)}</span>
                <Keycap s={s} value={cfg.customKeys[a.id] ?? a.key} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
