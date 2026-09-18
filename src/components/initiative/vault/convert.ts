const BLOCK = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'TABLE', 'HR', 'PRE', 'DETAILS'])

function inline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').replace(/\s+/g, ' ')
  if (!(node instanceof HTMLElement)) return ''
  const content = () => Array.from(node.childNodes).map(inline).join('')
  switch (node.tagName) {
    case 'B':
    case 'STRONG':
      return content().trim() ? `**${content().trim()}**` : ''
    case 'I':
    case 'EM':
      return content().trim() ? `*${content().trim()}*` : ''
    case 'S':
    case 'STRIKE':
    case 'DEL':
      return content().trim() ? `~~${content().trim()}~~` : ''
    case 'CODE':
      return `\`${node.textContent ?? ''}\``
    case 'BR':
      return '\n'
    case 'A': {
      const href = node.getAttribute('href') ?? ''
      const text = content().trim()
      return /^https?:\/\//i.test(href) && text ? `[${text}](${href})` : text
    }
    case 'SVG':
    case 'SCRIPT':
    case 'STYLE':
      return ''
    case 'SPAN':
      if (node.hasAttribute('data-bookmark-id')) return ''
      return content()
    default:
      return content()
  }
}

function table(node: HTMLElement) {
  const rows = Array.from(node.querySelectorAll('tr')).map((tr) =>
    Array.from(tr.children).map((cell) => inline(cell).replace(/\|/g, '\\|').replace(/\n/g, ' ').trim()),
  )
  if (rows.length === 0) return ''
  const width = Math.max(...rows.map((r) => r.length))
  const pad = (r: string[]) => Array.from({ length: width }, (_, i) => r[i] ?? '')
  const line = (r: string[]) => `| ${pad(r).join(' | ')} |`
  return [line(rows[0]), `| ${Array.from({ length: width }, () => '---').join(' | ')} |`, ...rows.slice(1).map(line)].join('\n')
}

function blocks(node: Node, depth = 0): string[] {
  const out: string[] = []
  let buffer = ''
  const flush = () => {
    const text = buffer.replace(/[ \t]+\n/g, '\n').trim()
    if (text) out.push(text)
    buffer = ''
  }
  for (const child of Array.from(node.childNodes)) {
    if (!(child instanceof HTMLElement) || !BLOCK.has(child.tagName)) {
      buffer += inline(child)
      continue
    }
    flush()
    const tag = child.tagName
    if (/^H[1-6]$/.test(tag)) {
      const level = Math.min(3, Number(tag[1]))
      out.push(`${'#'.repeat(level)} ${inline(child).trim()}`)
    } else if (tag === 'UL' || tag === 'OL') {
      const items = Array.from(child.children).filter((li) => li.tagName === 'LI')
      const lines = items.map((li, i) => {
        const nested = Array.from(li.children).filter((c) => c.tagName === 'UL' || c.tagName === 'OL')
        const own = Array.from(li.childNodes)
          .filter((c) => !(c instanceof HTMLElement && (c.tagName === 'UL' || c.tagName === 'OL')))
          .map(inline)
          .join('')
          .trim()
        const mark = tag === 'OL' ? `${i + 1}.` : '-'
        const lead = `${'  '.repeat(depth)}${mark} ${own}`
        const sub = nested.flatMap((n) => blocks({ childNodes: [n] } as unknown as Node, depth + 1))
        return [lead, ...sub].join('\n')
      })
      out.push(lines.join('\n'))
    } else if (tag === 'BLOCKQUOTE') {
      out.push(
        blocks(child)
          .join('\n\n')
          .split('\n')
          .map((l) => `> ${l}`)
          .join('\n'),
      )
    } else if (tag === 'TABLE') {
      out.push(table(child))
    } else if (tag === 'HR') {
      out.push('---')
    } else if (tag === 'PRE') {
      out.push('```\n' + (child.textContent ?? '') + '\n```')
    } else if (tag === 'DETAILS') {
      const summary = child.querySelector('summary')
      if (summary) out.push(`**${inline(summary).trim()}**`)
      out.push(...blocks(child).filter((x) => x !== `**${inline(summary ?? child).trim()}**`))
    } else {
      out.push(...blocks(child, depth))
    }
  }
  flush()
  return out
}

export function htmlToMarkdown(html: string) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''
  return blocks(root).join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}
