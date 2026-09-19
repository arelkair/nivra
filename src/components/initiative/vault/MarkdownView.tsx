import type { ReactNode } from 'react'
import { skin } from '../skin'
import { tagHue } from './vaultModel'

type Props = {
  body: string
  dark: boolean
  exists: (title: string) => boolean
  onOpenLink: (title: string) => void
  onTag: (tag: string) => void
  onToggleTask: (line: number) => void
}

const INLINE =
  /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(==[^=\n]+==)|(~~[^~\n]+~~)|(!?\[\[[^[\]]+\]\])|(\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))|((?:^|\s)#[\p{L}\p{N}_/-]+)/gu

const isSeparator = (line: string) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line) && line.includes('|')

function cellsOf(line: string) {
  const cells: string[] = []
  let current = ''
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '\\' && line[i + 1] === '|') {
      current += '|'
      i++
    } else if (ch === '|') {
      cells.push(current)
      current = ''
    } else current += ch
  }
  cells.push(current)
  if (line.trim().startsWith('|')) cells.shift()
  if (line.trim().endsWith('|') && !line.trim().endsWith('\\|')) cells.pop()
  return cells.map((c) => c.trim())
}

function alignOf(cell: string): 'left' | 'center' | 'right' {
  const c = cell.trim()
  if (c.startsWith(':') && c.endsWith(':')) return 'center'
  if (c.endsWith(':')) return 'right'
  return 'left'
}

const HEADING_CLASS = [
  'mt-5 mb-2 text-2xl font-semibold',
  'mt-4 mb-1.5 text-xl font-semibold',
  'mt-3 mb-1 text-lg font-semibold',
  'mt-3 mb-1 text-base font-semibold',
  'mt-2 mb-1 text-sm font-semibold',
  'mt-2 mb-1 text-xs font-semibold tracking-wide uppercase opacity-80',
]

export function MarkdownView({ body, dark, exists, onOpenLink, onTag, onToggleTask }: Props) {
  const s = skin(dark)

  const inline = (text: string, keyBase: string): ReactNode[] => {
    const out: ReactNode[] = []
    let last = 0
    let n = 0
    for (const match of text.matchAll(INLINE)) {
      const at = match.index ?? 0
      if (at > last) out.push(text.slice(last, at))
      const token = match[0]
      const key = `${keyBase}-${n++}`
      if (match[1]) {
        out.push(
          <code key={key} className={`rounded px-1 py-0.5 text-[0.85em] ${dark ? 'bg-white/10' : 'bg-black/[0.06]'}`}>
            {token.slice(1, -1)}
          </code>,
        )
      } else if (match[2]) {
        out.push(<strong key={key}>{token.slice(2, -2)}</strong>)
      } else if (match[3]) {
        out.push(<em key={key}>{token.slice(1, -1)}</em>)
      } else if (match[4]) {
        out.push(
          <mark key={key} className={`rounded px-0.5 ${dark ? 'bg-yellow-400/30 text-yellow-100' : 'bg-yellow-200 text-neutral-900'}`}>
            {token.slice(2, -2)}
          </mark>,
        )
      } else if (match[5]) {
        out.push(<s key={key}>{token.slice(2, -2)}</s>)
      } else if (match[6]) {
        const embed = token.startsWith('!')
        const inner = token.slice(embed ? 3 : 2, -2)
        const [target, alias] = inner.split('|')
        const clean = target.split('#')[0].split('^')[0].trim()
        const title = (clean.includes('/') ? clean.slice(clean.lastIndexOf('/') + 1) : clean).replace(/\.md$/i, '')
        const found = exists(title)
        out.push(
          <button
            key={key}
            type="button"
            onClick={() => onOpenLink(title)}
            title={title}
            className={`rounded px-0.5 underline decoration-dotted underline-offset-4 ${
              found ? (dark ? 'text-sky-300' : 'text-sky-700') : `${s.faint} decoration-dashed`
            }`}
          >
            {embed ? '↳ ' : ''}
            {alias?.trim() || title}
          </button>,
        )
      } else if (match[7]) {
        const close = token.indexOf('](')
        out.push(
          <a key={key} href={token.slice(close + 2, -1)} target="_blank" rel="noopener noreferrer" className={dark ? 'text-sky-300 underline' : 'text-sky-700 underline'}>
            {token.slice(1, close)}
          </a>,
        )
      } else if (match[8]) {
        const lead = token.startsWith('#') ? '' : token.slice(0, 1)
        const tag = token.trim().slice(1).toLowerCase()
        if (lead) out.push(lead)
        out.push(
          <button
            key={key}
            type="button"
            onClick={() => onTag(tag)}
            className="rounded-full px-2 py-0.5 text-[0.8em]"
            style={{ background: `hsl(${tagHue(tag)} 60% ${dark ? '28%' : '88%'})`, color: `hsl(${tagHue(tag)} 60% ${dark ? '80%' : '30%'})` }}
          >
            #{tag}
          </button>,
        )
      }
      last = at + token.length
    }
    if (last < text.length) out.push(text.slice(last))
    return out
  }

  const lines = body.split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((l, idx) => idx > 0 && l.trim() === '---')
    if (end > 0) {
      const props = lines.slice(1, end).filter((l) => l.includes(':'))
      if (props.length > 0) {
        blocks.push(
          <dl key={key++} className={`my-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl border p-3 text-sm ${s.line}`}>
            {props.map((line, idx) => {
              const at = line.indexOf(':')
              return (
                <div key={idx} className="contents">
                  <dt className={s.faint}>{line.slice(0, at).trim()}</dt>
                  <dd className="break-words">{line.slice(at + 1).trim()}</dd>
                </div>
              )
            })}
          </dl>,
        )
      }
      i = end + 1
    }
  }

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

    if (line.trim().startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++])
      i++
      blocks.push(
        <pre key={key++} className={`my-3 overflow-x-auto rounded-xl p-3 text-[0.85em] ${dark ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}>
          <code>{code.join('\n')}</code>
        </pre>,
      )
      continue
    }

    if (line.trim().startsWith('|') && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      const head = cellsOf(line)
      const aligns = cellsOf(lines[i + 1]).map(alignOf)
      const rows: string[][] = []
      let cursor = i + 2
      while (cursor < lines.length && lines[cursor].trim().startsWith('|')) rows.push(cellsOf(lines[cursor++]))
      i = cursor
      const cellClass = `border px-3 py-1.5 ${dark ? 'border-white/15' : 'border-black/15'}`
      blocks.push(
        <div key={key++} className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {head.map((cell, c) => (
                  <th key={c} style={{ textAlign: aligns[c] ?? 'left' }} className={`${cellClass} font-semibold ${dark ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}>
                    {inline(cell, `th${key}-${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {head.map((_, c) => (
                    <td key={c} style={{ textAlign: aligns[c] ?? 'left' }} className={cellClass}>
                      {inline(row[c] ?? '', `td${key}-${r}-${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    const heading = /^(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const cls = HEADING_CLASS[level - 1]
      blocks.push(
        <p key={key++} role="heading" aria-level={level} className={cls}>
          {inline(heading[2], `h${key}`)}
        </p>,
      )
      i++
      continue
    }

    if (/^-{3,}\s*$/.test(line)) {
      blocks.push(<hr key={key++} className={`my-4 ${dark ? 'border-white/15' : 'border-black/15'}`} />)
      i++
      continue
    }

    if (/^\s*[-*]\s+\[[ xX]\]\s+/.test(line)) {
      const items: ReactNode[] = []
      while (i < lines.length && /^\s*[-*]\s+\[[ xX]\]\s+/.test(lines[i])) {
        const at = i
        const m = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.exec(lines[i])!
        const done = m[1].toLowerCase() === 'x'
        items.push(
          <li key={at} className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => onToggleTask(at)}
              aria-pressed={done}
              aria-label={m[2]}
              className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded border text-[0.6rem] ${
                done ? (dark ? 'border-white bg-white text-neutral-900' : 'border-neutral-900 bg-neutral-900 text-white') : dark ? 'border-white/30' : 'border-black/30'
              }`}
            >
              {done ? '✓' : ''}
            </button>
            <span className={done ? `${s.faint} line-through` : ''}>{inline(m[2], `t${at}`)}</span>
          </li>,
        )
        i++
      }
      blocks.push(
        <ul key={key++} className="my-2 flex flex-col gap-1">
          {items}
        </ul>,
      )
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: ReactNode[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]) && !/^\s*[-*]\s+\[[ xX]\]\s+/.test(lines[i])) {
        const indent = (/^(\s*)/.exec(lines[i])?.[1].length ?? 0) / 2
        items.push(
          <li key={i} style={{ marginLeft: indent * 16 }}>
            {inline(lines[i].replace(/^\s*[-*]\s+/, ''), `u${i}`)}
          </li>,
        )
        i++
      }
      blocks.push(
        <ul key={key++} className="my-2 list-disc pl-5">
          {items}
        </ul>,
      )
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: ReactNode[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(<li key={i}>{inline(lines[i].replace(/^\s*\d+\.\s+/, ''), `o${i}`)}</li>)
        i++
      }
      blocks.push(
        <ol key={key++} className="my-2 list-decimal pl-5">
          {items}
        </ol>,
      )
      continue
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''))
      const callout = /^\[!(\w+)\][+-]?\s*(.*)$/.exec(quote[0])
      if (callout) {
        blocks.push(
          <div key={key++} className={`my-3 rounded-xl border p-3 ${dark ? 'border-sky-400/30 bg-sky-400/10' : 'border-sky-300 bg-sky-50'}`}>
            <p className="mb-1 text-sm font-semibold capitalize">{callout[2] || callout[1]}</p>
            <div className="text-sm">{inline(quote.slice(1).join(' '), `c${key}`)}</div>
          </div>,
        )
      } else {
        blocks.push(
          <blockquote key={key++} className={`my-3 border-l-2 pl-3 ${dark ? 'border-white/25' : 'border-black/25'} ${s.muted}`}>
            {inline(quote.join(' '), `q${key}`)}
          </blockquote>,
        )
      }
      continue
    }

    const para: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6}\s|>\s?|\s*[-*]\s|\s*\d+\.\s|```|-{3,}\s*$|\|)/.test(lines[i])) para.push(lines[i++])
    blocks.push(
      <p key={key++} className="my-2">
        {para.map((text, index) => (
          <span key={index}>
            {index > 0 && <br />}
            {inline(text, `p${key}-${index}`)}
          </span>
        ))}
      </p>,
    )
  }

  if (blocks.length === 0) return null
  return <div className="leading-relaxed break-words">{blocks}</div>
}
