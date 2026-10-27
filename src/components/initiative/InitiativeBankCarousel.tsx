import { useEffect, useState } from 'react'
import { eur } from '../../lib/store'
import { t } from '../../lib/i18n'
import { Panel } from './panel'
import { skin } from './skin'

export type AccountView = { id: string; name: string; balance: number; monthNet: number }

type Props = {
  accounts: AccountView[]
  dark: boolean
  delay: number
  onOpen: () => void
}

export function InitiativeBankCarousel({ accounts, dark, delay, onOpen }: Props) {
  const s = skin(dark)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const rotating = accounts.length > 1
  const current = rotating ? index % accounts.length : 0
  const account = accounts[current]

  useEffect(() => {
    if (!rotating || paused) return
    const id = setInterval(() => setIndex((i) => i + 1), 8000)
    return () => clearInterval(id)
  }, [rotating, paused, index])

  return (
    <Panel grow={1} title={t('Dinero')} count={accounts.length} dark={dark} delay={delay} onOpen={onOpen}>
      {account && (
        <div
          key={account.id}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="flex animate-[fade-in_0.4s_ease-out_both] flex-col gap-1 py-3"
        >
          <p className={`truncate text-sm ${s.muted}`}>{account.name}</p>
          <span className={`font-mono text-3xl font-semibold tabular-nums ${account.balance < 0 ? 'text-red-500' : ''}`}>{eur(account.balance)}</span>
          <span className={`font-mono text-xs ${account.monthNet < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {account.monthNet >= 0 ? '+' : ''}
            {eur(account.monthNet)} <span className={s.muted}>{t('este mes')}</span>
          </span>
        </div>
      )}
      {rotating && (
        <div className="flex items-center justify-center gap-1.5 pt-1 pb-2" role="tablist" aria-label={t('Cuentas')}>
          {accounts.map((a, i) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={a.name}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === current ? 'w-4 bg-(--minimal-accent)' : `w-1.5 ${dark ? 'bg-white/25' : 'bg-black/20'}`}`}
            />
          ))}
        </div>
      )}
    </Panel>
  )
}
