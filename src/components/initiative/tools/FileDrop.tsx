import { useRef, useState } from 'react'
import { t } from '../../../lib/i18n'
import { Icon } from '../../ui'
import type { Skin } from '../skin'

type Props = {
  s: Skin
  accept: string
  multiple?: boolean
  title: string
  hint: string
  onFiles: (files: File[]) => void
  compact?: boolean
}

export function FileDrop({ s, accept, multiple = true, title, hint, onFiles, compact }: Props) {
  const picker = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        onFiles([...e.dataTransfer.files])
      }}
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 text-center transition-colors ${compact ? 'py-6' : 'py-10'} ${
        dragging ? (s.dark ? 'border-white/60 bg-white/[0.06]' : 'border-black/50 bg-black/[0.04]') : s.line
      }`}
    >
      <Icon name="upload" className={`h-6 w-6 ${s.muted}`} />
      <p className="text-sm font-medium">{title}</p>
      <p className={`text-xs ${s.faint}`}>{hint}</p>
      <button type="button" onClick={() => picker.current?.click()} className={`mt-1 rounded-lg px-4 py-2 text-sm font-medium ${s.primary}`}>
        {t('Elegir archivos')}
      </button>
      <input
        ref={picker}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          onFiles([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />
    </div>
  )
}
