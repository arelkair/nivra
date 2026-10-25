export type Tool =
  | 'select'
  | 'hand'
  | 'pen'
  | 'eraser'
  | 'text'
  | 'rect'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'hexagon'
  | 'line'
  | 'arrow'
  | 'link'

export type ShapeKind = 'rect' | 'ellipse' | 'triangle' | 'diamond' | 'star' | 'hexagon'
export type Brush = 'pen' | 'marker' | 'highlighter' | 'dashed'
export type Align = 'left' | 'center' | 'right'

type Base = { id: string; x: number; y: number; w: number; h: number; rotation: number; opacity: number }

export type StrokeItem = Base & { kind: 'stroke'; points: number[]; color: string; color2: string | null; width: number; brush: Brush }
export type ShapeItem = Base & { kind: 'shape'; shape: ShapeKind; stroke: string; fill: string | null; color2: string | null; strokeWidth: number; dashed: boolean }
export type LineItem = Base & { kind: 'line'; flipX: boolean; flipY: boolean; color: string; width: number; arrowStart: boolean; arrowEnd: boolean; dashed: boolean }
export type TextItem = Base & {
  kind: 'text'
  text: string
  color: string
  font: string
  size: number
  bold: boolean
  italic: boolean
  underline: boolean
  align: Align
}
export type LinkTargetRef = { type: 'note' | 'board'; id: string }
export type LinkItem = Base & { kind: 'link'; target: LinkTargetRef; label: string; color: string }

export type Item = StrokeItem | ShapeItem | LineItem | TextItem | LinkItem

export type BoardSettings = { background: string | null; grid: boolean; font: string }

export type Board = {
  id: string
  name: string
  parent: string | null
  items: Item[]
  settings: BoardSettings
  created: number
  updated: number
}

export type Style = {
  color: string
  color2: string | null
  fill: string | null
  opacity: number
  width: number
  brush: Brush
  font: string
  size: number
  bold: boolean
  italic: boolean
  underline: boolean
  align: Align
  dashed: boolean
  arrowStart: boolean
}

export const BOARDS_KEY = 'nivra-boards'

export const FONTS = [
  { id: 'sans', label: 'Geist', css: "'Geist Variable', system-ui, sans-serif" },
  { id: 'serif', label: 'Serif', css: "Georgia, 'Times New Roman', serif" },
  { id: 'mono', label: 'Mono', css: "'Geist Mono Variable', ui-monospace, monospace" },
  { id: 'hand', label: 'Manuscrita', css: "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive" },
  { id: 'dyslexic', label: 'OpenDyslexic', css: 'OpenDyslexic, system-ui, sans-serif' },
]

export const fontCss = (id: string) => (FONTS.find((f) => f.id === id) ?? FONTS[0]).css

export const SWATCHES = ['#1f1f1f', '#ffffff', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6b7280']

export const BACKGROUNDS = [null, '#ffffff', '#faf9f6', '#f1efe8', '#1e1e1e', '#16181d', '#0f2a24', '#1f1a2e']

export const DEFAULT_STYLE: Style = {
  color: '#8b5cf6',
  color2: null,
  fill: null,
  opacity: 1,
  width: 4,
  brush: 'pen',
  font: 'sans',
  size: 24,
  bold: false,
  italic: false,
  underline: false,
  align: 'left',
  dashed: false,
  arrowStart: false,
}

export function newBoard(name: string, parent: string | null): Board {
  const now = Date.now()
  return { id: crypto.randomUUID(), name, parent, items: [], settings: { background: null, grid: true, font: 'sans' }, created: now, updated: now }
}

export const uid = () => crypto.randomUUID()

export const center = (it: Item) => ({ x: it.x + it.w / 2, y: it.y + it.h / 2 })

export function rotate(px: number, py: number, deg: number) {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return { x: px * c - py * s, y: px * s + py * c }
}

export function bounds(items: Item[]) {
  let x1 = Infinity
  let y1 = Infinity
  let x2 = -Infinity
  let y2 = -Infinity
  for (const it of items) {
    const c = center(it)
    for (const [dx, dy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const p = rotate((dx * it.w) / 2, (dy * it.h) / 2, it.rotation)
      x1 = Math.min(x1, c.x + p.x)
      y1 = Math.min(y1, c.y + p.y)
      x2 = Math.max(x2, c.x + p.x)
      y2 = Math.max(y2, c.y + p.y)
    }
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

export function shapePoints(shape: ShapeKind, w: number, h: number): string {
  const pts: [number, number][] =
    shape === 'triangle'
      ? [
          [0.5, 0],
          [1, 1],
          [0, 1],
        ]
      : shape === 'diamond'
        ? [
            [0.5, 0],
            [1, 0.5],
            [0.5, 1],
            [0, 0.5],
          ]
        : shape === 'hexagon'
          ? [
              [0.25, 0],
              [0.75, 0],
              [1, 0.5],
              [0.75, 1],
              [0.25, 1],
              [0, 0.5],
            ]
          : Array.from({ length: 10 }, (_, i) => {
              const angle = -Math.PI / 2 + (i * Math.PI) / 5
              const r = i % 2 === 0 ? 0.5 : 0.2
              return [0.5 + r * Math.cos(angle), 0.53 + r * Math.sin(angle)] as [number, number]
            })
  return pts.map(([px, py]) => `${(px * w).toFixed(2)},${(py * h).toFixed(2)}`).join(' ')
}

export function strokePath(points: number[], w: number, h: number): string {
  if (points.length < 4) {
    const x = (points[0] ?? 0) * w
    const y = (points[1] ?? 0) * h
    return `M${x} ${y}L${x + 0.01} ${y}`
  }
  let d = `M${points[0] * w} ${points[1] * h}`
  for (let i = 2; i < points.length - 2; i += 2) {
    const x = points[i] * w
    const y = points[i + 1] * h
    const nx = (points[i] * w + points[i + 2] * w) / 2
    const ny = (points[i + 1] * h + points[i + 3] * h) / 2
    d += `Q${x} ${y} ${nx} ${ny}`
  }
  d += `L${points[points.length - 2] * w} ${points[points.length - 1] * h}`
  return d
}

export function lineEnds(it: LineItem) {
  const start = { x: it.flipX ? it.w : 0, y: it.flipY ? it.h : 0 }
  const end = { x: it.flipX ? 0 : it.w, y: it.flipY ? 0 : it.h }
  return { start, end }
}

export function arrowHead(from: { x: number; y: number }, to: { x: number; y: number }, size: number) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const a = angle + Math.PI - 0.45
  const b = angle + Math.PI + 0.45
  return `${to.x},${to.y} ${to.x + size * Math.cos(a)},${to.y + size * Math.sin(a)} ${to.x + size * Math.cos(b)},${to.y + size * Math.sin(b)}`
}

export function itemFromStyle(kind: Item['kind'], style: Style, box: { x: number; y: number; w: number; h: number }): Item {
  const base = { id: uid(), ...box, rotation: 0, opacity: style.opacity }
  if (kind === 'text')
    return { ...base, kind, text: '', color: style.color, font: style.font, size: style.size, bold: style.bold, italic: style.italic, underline: style.underline, align: style.align }
  if (kind === 'line') return { ...base, kind, flipX: false, flipY: false, color: style.color, width: style.width, arrowStart: style.arrowStart, arrowEnd: false, dashed: style.dashed }
  if (kind === 'stroke') return { ...base, kind, points: [], color: style.color, color2: style.color2, width: style.width, brush: style.brush }
  if (kind === 'link') return { ...base, kind, target: { type: 'note', id: '' }, label: '', color: style.color }
  return { ...base, kind: 'shape', shape: 'rect', stroke: style.color, fill: style.fill, color2: style.color2, strokeWidth: style.width, dashed: style.dashed }
}

export function boardSearchText(board: Board) {
  return board.items
    .map((it) => (it.kind === 'text' ? it.text : it.kind === 'link' ? it.label : ''))
    .filter(Boolean)
    .join(' ')
}
