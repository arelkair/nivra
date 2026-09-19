import type { PDFFont } from 'pdf-lib'
import type { VaultNote } from './vaultModel'

export type ExportFormat = 'md' | 'txt' | 'pdf'

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'text'; text: string; indent: number; bullet?: string; quote?: boolean }
  | { kind: 'code'; text: string }
  | { kind: 'rule' }
  | { kind: 'space' }

const inline = (text: string) =>
  text
    .replace(/!\[\[[^\]]*\]\]/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\[([^\]|#^]+)(?:[#^][^\]|]*)?\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]|#^]+)(?:[#^][^\]|]*)?\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(.+?)\1/g, '$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/==(.+?)==/g, '$1')
    .replace(/`([^`]+)`/g, '$1')

const parse = (body: string): Block[] => {
  const lines = body.replace(/\r\n?/g, '\n').split('\n')
  const out: Block[] = []
  let i = 0
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((line, at) => at > 0 && line.trim() === '---')
    if (end > 0) i = end + 1
  }
  while (i < lines.length) {
    const line = lines[i]
    if (/^\s*```/.test(line)) {
      const code: string[] = []
      i++
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++])
      i++
      out.push(...code.map((text) => ({ kind: 'code' as const, text })))
      out.push({ kind: 'space' })
      continue
    }
    const heading = /^(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/.exec(line)
    if (heading) {
      out.push({ kind: 'heading', level: heading[1].length, text: inline(heading[2]) })
      i++
      continue
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push({ kind: 'rule' })
      i++
      continue
    }
    if (line.includes('|') && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[i + 1] ?? '')) {
      const rows: string[] = [line]
      i += 2
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') rows.push(lines[i++])
      for (const row of rows) {
        const cells = row.trim().replace(/^\||\|$/g, '').split('|').map((cell) => inline(cell.trim()))
        out.push({ kind: 'text', text: cells.join('   |   '), indent: 0 })
      }
      out.push({ kind: 'space' })
      continue
    }
    const task = /^(\s*)[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line)
    if (task) {
      out.push({ kind: 'text', text: inline(task[3]), indent: Math.floor(task[1].length / 2) + 1, bullet: task[2] === ' ' ? '[ ]' : '[x]' })
      i++
      continue
    }
    const bullet = /^(\s*)[-*+]\s+(.*)$/.exec(line)
    if (bullet) {
      out.push({ kind: 'text', text: inline(bullet[2]), indent: Math.floor(bullet[1].length / 2) + 1, bullet: '•' })
      i++
      continue
    }
    const numbered = /^(\s*)(\d+)[.)]\s+(.*)$/.exec(line)
    if (numbered) {
      out.push({ kind: 'text', text: inline(numbered[3]), indent: Math.floor(numbered[1].length / 2) + 1, bullet: `${numbered[2]}.` })
      i++
      continue
    }
    const quote = /^\s*>\s?(.*)$/.exec(line)
    if (quote) {
      out.push({ kind: 'text', text: inline(quote[1].replace(/^\[![^\]]+\]\s*/, '')), indent: 1, quote: true })
      i++
      continue
    }
    if (line.trim() === '') out.push({ kind: 'space' })
    else out.push({ kind: 'text', text: inline(line), indent: 0 })
    i++
  }
  return out
}

const plainText = (note: VaultNote) => {
  const lines: string[] = [note.title || 'Nota', '='.repeat(Math.max(3, (note.title || 'Nota').length)), '']
  for (const block of parse(note.body)) {
    if (block.kind === 'heading') lines.push('', block.level <= 2 ? block.text.toUpperCase() : block.text)
    else if (block.kind === 'rule') lines.push('----------')
    else if (block.kind === 'space') lines.push('')
    else if (block.kind === 'code') lines.push(`    ${block.text}`)
    else lines.push(`${'  '.repeat(Math.max(0, block.indent - (block.bullet ? 1 : 0)))}${block.bullet ? `${block.bullet} ` : block.quote ? '> ' : ''}${block.text}`)
  }
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`
}

const REPLACEMENTS: Record<string, string> = { '→': '->', '←': '<-', '↔': '<->', '✓': 'v', '✔': 'v', '✗': 'x', '“': '"', '”': '"', '‘': "'", '’': "'", '−': '-', '\t': '    ' }

const clean = (text: string, font: PDFFont) => {
  const allowed = new Set(font.getCharacterSet())
  let out = ''
  for (const ch of text) {
    const mapped = REPLACEMENTS[ch] ?? ch
    for (const c of mapped) out += allowed.has(c.codePointAt(0) ?? 0) ? c : c.codePointAt(0)! > 0x2000 ? '' : '?'
  }
  return out
}

async function pdfBytes(note: VaultNote): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const mono = await doc.embedFont(StandardFonts.Courier)
  const W = 595.28
  const H = 841.89
  const M = 56
  let page = doc.addPage([W, H])
  let y = H - M

  const need = (height: number) => {
    if (y - height < M) {
      page = doc.addPage([W, H])
      y = H - M
    }
  }

  const wrap = (text: string, font: PDFFont, size: number, width: number) => {
    const words = clean(text, font).split(/\s+/).filter(Boolean)
    const lines: string[] = []
    let current = ''
    for (const word of words) {
      const next = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(next, size) <= width) current = next
      else {
        if (current) lines.push(current)
        current = word
        while (font.widthOfTextAtSize(current, size) > width && current.length > 1) {
          let cut = current.length - 1
          while (cut > 1 && font.widthOfTextAtSize(current.slice(0, cut), size) > width) cut--
          lines.push(current.slice(0, cut))
          current = current.slice(cut)
        }
      }
    }
    if (current) lines.push(current)
    return lines.length ? lines : ['']
  }

  const write = (text: string, font: PDFFont, size: number, x: number, extra?: { color?: [number, number, number]; gap?: number; marker?: string; bar?: boolean }) => {
    const lineHeight = size * 1.42
    const lines = wrap(text, font, size, W - M - x)
    if (extra?.marker) {
      need(lineHeight)
      page.drawText(clean(extra.marker, font), { x: x - Math.max(14, font.widthOfTextAtSize(clean(extra.marker, font), size) + 6), y: y - size, size, font, color: rgb(0.35, 0.35, 0.35) })
    }
    for (const line of lines) {
      need(lineHeight)
      if (extra?.bar) page.drawRectangle({ x: x - 8, y: y - lineHeight + 2, width: 2, height: lineHeight, color: rgb(0.8, 0.8, 0.8) })
      page.drawText(line, { x, y: y - size, size, font, color: rgb(...(extra?.color ?? [0.1, 0.1, 0.1])) })
      y -= lineHeight
    }
    y -= extra?.gap ?? 0
  }

  write(note.title || 'Nota', bold, 22, M, { gap: 10 })
  for (const block of parse(note.body)) {
    if (block.kind === 'heading') {
      const size = [0, 18, 15, 13, 12, 11.5, 11][block.level]
      y -= block.level <= 2 ? 6 : 3
      write(block.text, bold, size, M, { gap: 3 })
    } else if (block.kind === 'rule') {
      need(14)
      page.drawLine({ start: { x: M, y: y - 6 }, end: { x: W - M, y: y - 6 }, thickness: 0.6, color: rgb(0.75, 0.75, 0.75) })
      y -= 14
    } else if (block.kind === 'space') y -= 6
    else if (block.kind === 'code') {
      need(13)
      page.drawRectangle({ x: M - 4, y: y - 13, width: W - 2 * M + 8, height: 13, color: rgb(0.95, 0.95, 0.95) })
      const line = clean(block.text, mono)
      page.drawText(line.slice(0, 90), { x: M, y: y - 9.5, size: 9, font: mono, color: rgb(0.15, 0.15, 0.15) })
      y -= 13
    } else write(block.text, regular, 11, M + block.indent * 16, { marker: block.bullet, bar: block.quote, color: block.quote ? [0.35, 0.35, 0.35] : undefined, gap: 1.5 })
  }
  return doc.save()
}

export const exportName = (note: VaultNote, format: ExportFormat) => `${(note.title || 'nota').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'nota'}.${format}`

export async function exportNote(note: VaultNote, format: ExportFormat): Promise<{ name: string; blob: Blob }> {
  const name = exportName(note, format)
  if (format === 'md') return { name, blob: new Blob([note.body], { type: 'text/markdown;charset=utf-8' }) }
  if (format === 'txt') return { name, blob: new Blob([plainText(note)], { type: 'text/plain;charset=utf-8' }) }
  const bytes = await pdfBytes(note)
  return { name, blob: new Blob([bytes.slice().buffer], { type: 'application/pdf' }) }
}

export async function downloadNote(note: VaultNote, format: ExportFormat) {
  const { name, blob } = await exportNote(note, format)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
