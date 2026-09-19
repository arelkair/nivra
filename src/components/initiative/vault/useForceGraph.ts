import { useCallback, useEffect, useRef, useState } from 'react'
import type { GEdge, GNode, Point } from './vaultModel'

export type Body = { x: number; y: number; vx: number; vy: number; fixed: boolean; home: Point | null; r: number }

export type Layout = { home: Map<string, Point>; pinned: Set<string>; radius: Map<string, number> }

type Options = { repulsion: number; link: number }

export function useForceGraph(nodes: GNode[], edges: GEdge[], options: Options, layout: Layout) {
  const bodies = useRef(new Map<string, Body>())
  const alpha = useRef(1)
  const frame = useRef(0)
  const dragging = useRef(false)
  const [, setTick] = useState(0)
  const graph = useRef({ nodes, edges, options, layout })
  graph.current = { nodes, edges, options, layout }

  const step = useCallback(() => {
    const { nodes: list, edges: links, options: opt } = graph.current
    const map = bodies.current
    const heat = 0.3 + 0.7 * alpha.current

    for (let i = 0; i < list.length; i++) {
      const p = map.get(list[i].id)
      if (!p) continue
      for (let j = i + 1; j < list.length; j++) {
        const q = map.get(list[j].id)
        if (!q) continue
        let dx = p.x - q.x
        let dy = p.y - q.y
        let d2 = dx * dx + dy * dy
        if (d2 > 360000) continue
        if (d2 < 1) {
          dx = Math.random() - 0.5
          dy = Math.random() - 0.5
          d2 = 1
        }
        const d = Math.sqrt(d2)
        let force = Math.min((opt.repulsion / d2) * heat, 6)
        const gap = p.r + q.r + 14
        if (d < gap) force += (gap - d) * 0.35
        const fx = (dx / d) * force
        const fy = (dy / d) * force
        p.vx += fx
        p.vy += fy
        q.vx -= fx
        q.vy -= fy
      }
    }

    for (const e of links) {
      const p = map.get(e.from)
      const q = map.get(e.to)
      if (!p || !q) continue
      const dx = q.x - p.x
      const dy = q.y - p.y
      const d = Math.hypot(dx, dy) || 1
      const rest = e.folder ? 70 : opt.link
      const force = (d - rest) * (e.folder ? 0.05 : 0.008) * heat
      const fx = (dx / d) * force
      const fy = (dy / d) * force
      p.vx += fx
      p.vy += fy
      q.vx -= fx
      q.vy -= fy
    }

    for (const node of list) {
      const p = map.get(node.id)
      if (!p) continue
      if (p.fixed) {
        p.vx = 0
        p.vy = 0
        continue
      }
      if (p.home) {
        p.vx += (p.home.x - p.x) * 0.045
        p.vy += (p.home.y - p.y) * 0.045
      }
      p.vx -= p.x * 0.0015
      p.vy -= p.y * 0.0015
      p.vx *= 0.76
      p.vy *= 0.76
      p.x += p.vx
      p.y += p.vy
    }
    alpha.current *= 0.985
  }, [])

  const run = useCallback(() => {
    if (frame.current) return
    const loop = () => {
      step()
      setTick((t) => t + 1)
      if (alpha.current > 0.03 || dragging.current) frame.current = requestAnimationFrame(loop)
      else frame.current = 0
    }
    frame.current = requestAnimationFrame(loop)
  }, [step])

  useEffect(() => {
    const map = bodies.current
    const ids = new Set(nodes.map((n) => n.id))
    for (const id of [...map.keys()]) if (!ids.has(id)) map.delete(id)
    for (const n of nodes) {
      const home = layout.home.get(n.id) ?? null
      const r = layout.radius.get(n.id) ?? 6
      const existing = map.get(n.id)
      if (existing) {
        existing.home = home
        existing.r = r
        if (layout.pinned.has(n.id) && !dragging.current) {
          existing.fixed = true
          existing.x = home?.x ?? 0
          existing.y = home?.y ?? 0
        }
        continue
      }
      const angle = Math.random() * Math.PI * 2
      const start = home ?? { x: Math.cos(angle) * 120, y: Math.sin(angle) * 120 }
      map.set(n.id, { x: start.x, y: start.y, vx: 0, vy: 0, fixed: layout.pinned.has(n.id), home, r })
    }
    alpha.current = 1
    run()
  }, [nodes, edges, options.repulsion, options.link, layout, run])

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current)
      frame.current = 0
    },
    [],
  )

  const pin = useCallback(
    (id: string, x: number, y: number) => {
      const p = bodies.current.get(id)
      if (!p) return
      dragging.current = true
      p.fixed = true
      p.x = x
      p.y = y
      alpha.current = Math.max(alpha.current, 0.5)
      run()
    },
    [run],
  )

  const release = useCallback(
    (id: string) => {
      const p = bodies.current.get(id)
      if (p) {
        p.home = { x: p.x, y: p.y }
        p.fixed = graph.current.layout.pinned.has(id)
      }
      dragging.current = false
      alpha.current = Math.max(alpha.current, 0.3)
      run()
    },
    [run],
  )

  const reset = useCallback(() => {
    for (const n of graph.current.nodes) {
      const p = bodies.current.get(n.id)
      const home = graph.current.layout.home.get(n.id)
      if (!p || !home) continue
      p.home = home
      p.x = home.x
      p.y = home.y
      p.vx = 0
      p.vy = 0
      p.fixed = graph.current.layout.pinned.has(n.id)
    }
    alpha.current = 0.6
    run()
  }, [run])

  return { bodies: bodies.current, pin, release, reset }
}
