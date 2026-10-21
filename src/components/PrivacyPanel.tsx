import { useEffect, useState } from 'react'
import { DATA_EVENT, liveTrash, privacyInventory, purgeExpiredTrash, readTrash, restoreTrash, TRASH_KEY, writeLocal, type TrashEntry } from '../lib/dataLifecycle'
import { listSnapshots } from '../lib/autoBackup'
import { formatDate, t } from '../lib/i18n'
import { useLocalResource } from '../lib/useLocalResource'
import { button, ghost } from './ui'
import { useLockStatus } from '../lib/useLockStatus'

const bytes = (value: number) => value < 1024 ? `${value} B` : value < 1048576 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1048576).toFixed(2)} MB`
export function PrivacyPanel() {
  const stored = useLocalResource<TrashEntry[]>(TRASH_KEY, [])
  const vaultAccess = useLockStatus('vault')
  const trash = liveTrash(stored).filter(entry => vaultAccess || !['nivra-vault', 'nivra-vault-folders'].includes(entry.source))
  const [inventory, setInventory] = useState(privacyInventory)
  const [backups, setBackups] = useState({ count: 0, bytes: 0 })
  const [disk, setDisk] = useState<number | null>(null)
  const [message, setMessage] = useState(''), [confirm, setConfirm] = useState<string | null>(null)
  useEffect(() => {
    const refresh = () => setInventory(privacyInventory())
    purgeExpiredTrash()
    listSnapshots().then(all => setBackups({ count: all.length, bytes: all.reduce((sum, item) => sum + new Blob([JSON.stringify(item)]).size, 0) })).catch(() => {})
    navigator.storage?.estimate().then(value => setDisk(value.usage ?? null)).catch(() => {})
    addEventListener(DATA_EVENT, refresh)
    const timer = setInterval(purgeExpiredTrash, 60000)
    return () => { removeEventListener(DATA_EVENT, refresh); clearInterval(timer) }
  }, [])
  return <div className="flex flex-col gap-4">
    <section className="nv-panel rounded-lg border border-(--minimal-line) p-5"><h2 className="text-lg font-medium">{t('Privacidad y almacenamiento')}</h2><p className="mt-2 text-sm text-(--minimal-muted)">{t('Tus datos se guardan en este navegador. La sincronización es opcional y cifra los datos antes de enviarlos. Las notas publicadas y los datos sociales que compartas son excepciones explícitas.')}</p><div className="my-4 grid gap-3 sm:grid-cols-3">{[[t('Datos locales'), bytes(inventory.reduce((sum, row) => sum + row.bytes, 0))], [t('Copias automáticas'), `${backups.count} · ${bytes(backups.bytes)}`], [t('Uso estimado del sitio'), disk === null ? '—' : bytes(disk)]].map(([label, value]) => <div key={label} className="rounded bg-(--sunken) p-3"><p className="text-xs text-(--minimal-muted)">{label}</p><p className="mt-1 text-lg">{value}</p></div>)}</div><p className="mb-3 text-xs text-(--minimal-muted)">{t('Los tamaños locales estiman caracteres UTF-16; el uso del sitio lo calcula el navegador e incluye otras cachés. No se muestran contraseñas, PIN ni tokens.')}</p><details><summary className="cursor-pointer text-sm">{t('Ver qué datos se guardan')}</summary><ul className="mt-3 divide-y divide-(--minimal-line)">{inventory.map(row => <li key={row.key} className="flex flex-wrap justify-between gap-2 py-2 text-xs"><span className="break-all">{row.key.startsWith('sb-') ? t('Sesión de cuenta') : row.key.startsWith('device-') ? t('Configuración de bloqueo local') : row.key.replace('nivra-', '')}</span><span>{row.count === null ? '' : `${row.count} · `}{bytes(row.bytes)}</span></li>)}</ul></details></section>
    <section className="nv-panel rounded-lg border border-(--minimal-line) p-5"><h2 className="text-lg font-medium">{t('Papelera global')} <span className="text-sm text-(--minimal-muted)">{trash.length}</span></h2><p className="mt-2 text-sm text-(--minimal-muted)">{t('Los elementos eliminados se pueden restaurar durante 30 días. Las carpetas que ya no existen se restauran en la raíz.')}</p>{message && <p role="status" className="my-3 text-sm">{message}</p>}{trash.length === 0 ? <p className="py-5 text-sm text-(--minimal-muted)">{t('La papelera está vacía.')}</p> : <ul className="mt-4 divide-y divide-(--minimal-line)">{trash.map(entry => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm">{String(entry.item.title ?? entry.item.name ?? entry.item.desc ?? t('Elemento'))}</p><p className="text-xs text-(--minimal-muted)">{entry.source.replace('nivra-', '')} · {formatDate(new Date(entry.deletedAt), { day: 'numeric', month: 'short' })} · {Math.max(1, Math.ceil((entry.deletedAt + 30 * 86400000 - Date.now()) / 86400000))} {t('días')}</p></div><div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => { try { restoreTrash(entry.id); setMessage(t('Elemento restaurado.')) } catch (cause) { setMessage(t((cause as Error).message)) } }}>{t('Restaurar')}</button>{confirm === entry.id ? <button className={`${ghost} text-red-500`} onClick={() => { writeLocal(TRASH_KEY, readTrash().filter(item => item.id !== entry.id)); setConfirm(null) }}>{t('Confirmar eliminación permanente')}</button> : <button className={ghost} onClick={() => setConfirm(entry.id)}>{t('Eliminar definitivamente')}</button>}</div></li>)}</ul>}</section>
  </div>
}
