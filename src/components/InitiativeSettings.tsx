import { useEffect, useRef } from 'react'
import { Icon } from './ui'
import { t } from '../lib/i18n'

export function InitiativeSettings({ onClose, onDisable }: { onClose: () => void; onDisable: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(100%-1.5rem,26rem)] rounded-3xl border border-black/[0.07] bg-white p-6 text-neutral-900 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <h3 className="mr-auto text-lg font-semibold">{t('Ajustes de Initiative')}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('Cerrar')}
          className="text-neutral-400 transition-colors hover:text-neutral-900"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

      <p className="mb-4 text-sm text-neutral-500">
        {t('Initiative sigue en fase beta. Por ahora, esto es todo lo que puedes ajustar aquí.')}
      </p>

      <button
        type="button"
        onClick={onDisable}
        className="w-full rounded-2xl bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80"
      >
        {t('Desactivar Initiative (beta)')}
      </button>
    </dialog>
  )
}
