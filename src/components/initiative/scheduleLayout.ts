export const SNAP = 15
export const MIN_BLOCK = 15
export const DAY_END = 24 * 60 - 1

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export const fromMin = (total: number) => {
  const clamped = Math.max(0, Math.min(DAY_END, Math.round(total)))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const snap = (value: number, mode: 'round' | 'floor' = 'round') =>
  (mode === 'floor' ? Math.floor(value / SNAP) : Math.round(value / SNAP)) * SNAP

export const formatSpan = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

type Span = { id: string; start: number; end: number }

export function layoutDay(spans: Span[]) {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end)
  const result = new Map<string, { lane: number; lanes: number }>()
  let cluster: { span: Span; lane: number }[] = []
  let clusterEnd = -1

  const flush = () => {
    const lanes = cluster.reduce((max, item) => Math.max(max, item.lane + 1), 1)
    for (const item of cluster) result.set(item.span.id, { lane: item.lane, lanes })
    cluster = []
  }

  for (const span of sorted) {
    if (cluster.length > 0 && span.start >= clusterEnd) {
      flush()
      clusterEnd = -1
    }
    const used = new Set(cluster.filter((item) => item.span.end > span.start).map((item) => item.lane))
    let lane = 0
    while (used.has(lane)) lane++
    cluster.push({ span, lane })
    clusterEnd = Math.max(clusterEnd, span.end)
  }
  if (cluster.length > 0) flush()
  return result
}

export function overlaps(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && b.start < a.end
}
