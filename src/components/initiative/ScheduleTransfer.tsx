import { useRef, useState } from 'react'
import { blockProfile, type Block } from '../../lib/store'
import { t, tp } from '../../lib/i18n'
import { notifyWithUndo } from '../../lib/undo'
import { downloadText, parseSchedule, scheduleToCsv, scheduleToJson } from './scheduleIO'
import type { Skin } from './skin'

type Props = {
  blocks: Block[]
  setBlocks: (update: (prev: Block[]) => Block[]) => void
  profile: string
  profileName: string
  s: Skin
}

const EXAMPLE = 'Lunes;08:00;09:00;Matemáticas;#3b82f6\nMartes 10:00-11:30 Historia'

export function ScheduleTransfer({ blocks, setBlocks, profile, profileName, s }: Props) {
  const file = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [replace, setReplace] = useState(false)
  const own = blocks.filter((b) => blockProfile(b) === profile)
  const parsed = parseSchedule(text)
  const slug = profileName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'horario'

  const apply = () => {
    if (parsed.blocks.length === 0) return
    const before = blocks
    const fresh: Block[] = parsed.blocks.map((b) => ({ ...b, id: crypto.randomUUID(), profile }))
    setBlocks((prev) => [...(replace ? prev.filter((b) => blockProfile(b) !== profile) : prev), ...fresh])
    notifyWithUndo(tp('{0} bloques importados', fresh.length), () => setBlocks(() => before))
    setText('')
    setOpen(false)
  }

  const onFile = async (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    setText(await f.text())
    setOpen(true)
    if (file.current) file.current.value = ''
  }

  return (
    <div className={`flex flex-col gap-3 border-t pt-3 ${s.line}`}>
      <span className={`text-xs ${s.muted}`}>{t('Importar y exportar')}</span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={own.length === 0}
          onClick={() => downloadText(`${slug}.json`, scheduleToJson(own), 'application/json')}
          className={`${s.ghost} disabled:opacity-40`}
        >
          {t('Exportar JSON')}
        </button>
        <button
          type="button"
          disabled={own.length === 0}
          onClick={() => downloadText(`${slug}.csv`, scheduleToCsv(own), 'text/csv')}
          className={`${s.ghost} disabled:opacity-40`}
        >
          {t('Exportar CSV')}
        </button>
        <button type="button" onClick={() => file.current?.click()} className={s.ghost}>
          {t('Importar archivo')}
        </button>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={s.ghost}>
          {t('Pegar texto')}
        </button>
        <input ref={file} type="file" accept=".json,.csv,.txt,text/*,application/json" hidden onChange={(e) => onFile(e.target.files)} />
      </div>
      {open && (
        <div className="flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={EXAMPLE}
            aria-label={t('Pegar texto')}
            className={`${s.field} font-mono text-xs`}
          />
          <p className={`text-[0.7rem] ${s.faint}`}>
            {t('Formatos: JSON exportado, CSV (día, inicio, fin, título, color) o líneas como «Lunes 08:00-09:00 Matemáticas».')}
          </p>
          <label className={`flex items-center gap-2 text-xs ${s.muted}`}>
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="h-4 w-4 rounded" />
            {t('Reemplazar el horario actual')}
          </label>
          {text.trim() && (
            <p className={`text-xs ${parsed.blocks.length > 0 ? s.muted : 'text-red-500'}`}>
              {tp('{0} bloques válidos', parsed.blocks.length)}
              {parsed.errors > 0 && ` · ${tp('{0} líneas ignoradas', parsed.errors)}`}
            </p>
          )}
          <button type="button" onClick={apply} disabled={parsed.blocks.length === 0} className={`${s.ghost} self-start disabled:opacity-40`}>
            {t('Importar')}
          </button>
        </div>
      )}
    </div>
  )
}
