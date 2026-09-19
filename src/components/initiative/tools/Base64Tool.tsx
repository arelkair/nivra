import { useEffect, useMemo, useState } from 'react'
import { t, tp } from '../../../lib/i18n'
import type { Skin } from '../skin'
import { FileDrop } from './FileDrop'
import { saveBlob } from './zip'

type Mode = 'text' | 'file' | 'decode'

const MODES: { id: Mode; label: string }[] = [
  { id: 'text', label: 'Texto' },
  { id: 'file', label: 'Archivo → Base64' },
  { id: 'decode', label: 'Base64 → Archivo' },
]

const MAX_FILE = 25 * 1024 * 1024
const PREVIEW_LIMIT = 200000

const toBase64 = (bytes: Uint8Array) => {
  let out = ''
  const step = 0x8000
  for (let i = 0; i < bytes.length; i += step) out += String.fromCharCode(...bytes.subarray(i, i + step))
  return btoa(out)
}

const fromBase64 = (input: string): Uint8Array => {
  const body = input.replace(/^data:[^,]*,/, '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(body)) throw new Error(t('Hay caracteres que no son Base64.'))
  const padded = body + '='.repeat((4 - (body.length % 4)) % 4)
  let raw: string
  try {
    raw = atob(padded)
  } catch {
    throw new Error(t('El Base64 no es válido.'))
  }
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

const urlSafe = (value: string) => value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const wrap = (value: string, width: number) => value.replace(new RegExp(`(.{${width}})`, 'g'), '$1\n').replace(/\n$/, '')

const SIGNATURES: { test: (b: Uint8Array) => boolean; mime: string; ext: string }[] = [
  { test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47, mime: 'image/png', ext: 'png' },
  { test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, mime: 'image/jpeg', ext: 'jpg' },
  { test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46, mime: 'image/gif', ext: 'gif' },
  { test: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[8] === 0x57 && b[9] === 0x45, mime: 'image/webp', ext: 'webp' },
  { test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46, mime: 'application/pdf', ext: 'pdf' },
  { test: (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04, mime: 'application/zip', ext: 'zip' },
  { test: (b) => b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33, mime: 'audio/mpeg', ext: 'mp3' },
  { test: (b) => b[0] === 0x42 && b[1] === 0x4d, mime: 'image/bmp', ext: 'bmp' },
]

const size = (bytes: number) => (bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`)

export function Base64Tool({ s }: { s: Skin }) {
  const [mode, setMode] = useState<Mode>('text')
  const [direction, setDirection] = useState<'encode' | 'decode'>('encode')
  const [text, setText] = useState('')
  const [safe, setSafe] = useState(false)
  const [lines, setLines] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const [file, setFile] = useState<{ name: string; type: string; size: number; base64: string } | null>(null)
  const [dataUri, setDataUri] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const [encoded, setEncoded] = useState('')
  const [fileName, setFileName] = useState('archivo')

  const textResult = useMemo(() => {
    if (!text) return { value: '', error: null as string | null }
    try {
      if (direction === 'encode') {
        const raw = toBase64(new TextEncoder().encode(text))
        const value = safe ? urlSafe(raw) : raw
        return { value: lines ? wrap(value, 76) : value, error: null }
      }
      const bytes = fromBase64(text)
      return { value: new TextDecoder('utf-8', { fatal: true }).decode(bytes), error: null }
    } catch (e) {
      return { value: '', error: e instanceof Error && e.message ? e.message : t('No es texto UTF-8.') }
    }
  }, [text, direction, safe, lines])

  const decoded = useMemo(() => {
    if (!encoded.trim()) return null
    try {
      const bytes = fromBase64(encoded)
      const header = /^data:([^;,]+)/.exec(encoded.trim())
      const sig = SIGNATURES.find((x) => x.test(bytes))
      const mime = header?.[1] ?? sig?.mime ?? 'application/octet-stream'
      const ext = sig?.ext ?? (mime.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '')
      return { bytes, mime, ext, error: null as string | null }
    } catch (e) {
      return { bytes: null, mime: '', ext: '', error: (e as Error).message }
    }
  }, [encoded])

  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => {
    if (!decoded?.bytes || !decoded.mime.startsWith('image/')) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(new Blob([decoded.bytes.slice().buffer], { type: decoded.mime }))
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [decoded])

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1400)
    } catch {
      setCopied(null)
    }
  }

  const loadFile = async (files: File[]) => {
    const f = files[0]
    if (!f) return
    setFileError(null)
    if (f.size > MAX_FILE) {
      setFile(null)
      return setFileError(tp('El archivo pesa {0}; el máximo es 25 MB.', size(f.size)))
    }
    setFile({ name: f.name, type: f.type || 'application/octet-stream', size: f.size, base64: toBase64(new Uint8Array(await f.arrayBuffer())) })
  }

  const fileOutput = file ? (dataUri ? `data:${file.type};base64,${file.base64}` : file.base64) : ''

  const chip = (active: boolean) => `shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors ${active ? s.active : `${s.muted} ${s.hover} ${s.hoverText}`}`
  const check = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <label className={`flex items-center gap-2 text-xs ${s.muted}`}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded" />
      {label}
    </label>
  )

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" className={`nivra-scroll flex gap-1 overflow-x-auto rounded-xl border p-1 ${s.line}`}>
        {MODES.map((m) => (
          <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} onClick={() => setMode(m.id)} className={chip(mode === m.id)}>
            {t(m.label)}
          </button>
        ))}
      </div>

      {mode === 'text' && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className={`flex flex-col gap-3 rounded-2xl border p-4 ${s.line} ${s.panel}`}>
            <div className="flex flex-wrap items-center gap-3">
              <div role="group" className={`flex overflow-hidden rounded-lg border text-xs ${s.line}`}>
                {(['encode', 'decode'] as const).map((d) => (
                  <button key={d} type="button" aria-pressed={direction === d} onClick={() => setDirection(d)} className={`px-3 py-1.5 transition-colors ${direction === d ? s.active : `${s.muted} ${s.hover}`}`}>
                    {d === 'encode' ? t('Codificar') : t('Decodificar')}
                  </button>
                ))}
              </div>
              <span className="flex-1" />
              <button type="button" onClick={() => setText(textResult.value)} disabled={!textResult.value} className={`${s.ghost} disabled:opacity-40`}>
                {t('Intercambiar')}
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              spellCheck={false}
              placeholder={direction === 'encode' ? t('Escribe o pega el texto…') : t('Pega el Base64…')}
              aria-label={direction === 'encode' ? t('Texto') : 'Base64'}
              className={`${s.field} font-mono text-xs`}
            />
          </section>
          <section className={`flex flex-col gap-3 rounded-2xl border p-4 ${s.line} ${s.panel}`}>
            <div className="flex flex-wrap items-center gap-3">
              <p className={`font-mono text-[0.65rem] tracking-widest uppercase ${s.faint}`}>{direction === 'encode' ? 'Base64' : t('Texto')}</p>
              <span className="flex-1" />
              {direction === 'encode' && (
                <>
                  {check(t('URL segura'), safe, setSafe)}
                  {check(t('Líneas de 76'), lines, setLines)}
                </>
              )}
              <button type="button" onClick={() => copy('text', textResult.value)} disabled={!textResult.value} className={`${s.ghost} disabled:opacity-40`}>
                {copied === 'text' ? t('Copiado') : t('Copiar')}
              </button>
            </div>
            <textarea value={textResult.value} readOnly rows={12} aria-label={t('Resultado')} className={`${s.field} font-mono text-xs`} />
            {textResult.error && <p className="text-xs text-red-500">{textResult.error}</p>}
          </section>
        </div>
      )}

      {mode === 'file' && (
        <div className="flex flex-col gap-4">
          <FileDrop s={s} accept="*/*" multiple={false} compact title={t('Arrastra un archivo aquí')} hint={t('Hasta 25 MB. Se codifica en tu equipo.')} onFiles={loadFile} />
          {fileError && <p className="text-sm text-red-500">{fileError}</p>}
          {file && (
            <section className={`flex flex-col gap-3 rounded-2xl border p-4 ${s.line} ${s.panel}`}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{file.name}</p>
                  <p className={`text-[0.7rem] ${s.faint}`}>
                    {file.type} · {size(file.size)} → {size(fileOutput.length)}
                  </p>
                </div>
                {check(t('Como data URI'), dataUri, setDataUri)}
                <button type="button" onClick={() => copy('file', fileOutput)} className={s.ghost}>
                  {copied === 'file' ? t('Copiado') : t('Copiar')}
                </button>
                <button type="button" onClick={() => saveBlob(`${file.name}.base64.txt`, new Blob([fileOutput], { type: 'text/plain' }))} className={s.ghost}>
                  {t('Descargar .txt')}
                </button>
              </div>
              <textarea value={fileOutput.slice(0, PREVIEW_LIMIT)} readOnly rows={8} aria-label="Base64" className={`${s.field} font-mono text-xs break-all`} />
              {fileOutput.length > PREVIEW_LIMIT && <p className={`text-[0.7rem] ${s.faint}`}>{t('Se muestra solo el principio; «Copiar» y «Descargar» incluyen todo.')}</p>}
            </section>
          )}
        </div>
      )}

      {mode === 'decode' && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className={`flex flex-col gap-3 rounded-2xl border p-4 ${s.line} ${s.panel}`}>
            <textarea
              value={encoded}
              onChange={(e) => setEncoded(e.target.value)}
              rows={12}
              spellCheck={false}
              placeholder={t('Pega aquí el Base64 o un data URI…')}
              aria-label="Base64"
              className={`${s.field} font-mono text-xs break-all`}
            />
          </section>
          <section className={`flex flex-col gap-3 rounded-2xl border p-4 ${s.line} ${s.panel}`}>
            {!decoded && <p className={`text-sm ${s.faint}`}>{t('Pega un Base64 para ver el archivo.')}</p>}
            {decoded?.error && <p className="text-sm text-red-500">{decoded.error}</p>}
            {decoded?.bytes && (
              <>
                <p className={`text-xs ${s.muted}`}>
                  {decoded.mime} · {size(decoded.bytes.length)}
                </p>
                {preview && <img src={preview} alt="" className={`max-h-56 w-fit max-w-full rounded-xl border object-contain ${s.line}`} />}
                <label className="flex flex-col gap-1.5">
                  <span className={`text-xs ${s.muted}`}>{t('Nombre del archivo')}</span>
                  <div className="flex items-center gap-2">
                    <input value={fileName} onChange={(e) => setFileName(e.target.value)} aria-label={t('Nombre del archivo')} className={s.field} />
                    <span className={`font-mono text-xs ${s.muted}`}>.{decoded.ext}</span>
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => saveBlob(`${fileName.trim() || 'archivo'}.${decoded.ext}`, new Blob([decoded.bytes.slice().buffer], { type: decoded.mime }))}
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium ${s.primary}`}
                >
                  {t('Descargar archivo')}
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
