import { useCallback, useEffect, useRef, useState } from 'react'
import type { GEdge, GNode } from './vaultModel'

export type Body = { x: number; y: number; vx: number; vy: number; fixed: boolean }

type Options = { repulsion: number; link: number }

export function useForceGraph(nodes: GNode[], edges: GEdge[], options: Options) {
  const bodies = useRef(new Map<string, Body>())
  const alpha = useRef(1)
  const frame = useRef(0)
  const dragging = useRef(false)
  const [, setTick] = useState(0)
  const graph = useRef({ nodes, edges, options })
  graph.current = { nodes, edges, options }

  const step = useCallback(() => {
    const { nodes: list, edges: links, options: opt } = graph.current
    const map = bodies.current
    const k = 0.35 + 0.65 * alpha.current
    for (let i = 0; i < list.length; i++) {
      const p = map.get(list[i].id)
      if (!p) continue
      for (let j = i + 1; j < list.length; j++) {
        const q = map.get(list[j].id)
        if (!q) continue
        let dx = p.x - q.x
        let dy = p.y - q.y
        let d2 = dx * dx + dy * dy
        if (d2 < 1) {
          dx = Math.random() - 0.5
          dy = Math.random() - 0.5
          d2 = 1
        }
        const d = Math.sqrt(d2)
        const force = Math.min((opt.repulsion / d2) * k, 12)
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
      const force = (d - opt.link) * 0.03 * k
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
      p.vx -= p.x * 0.004
      p.vy -= p.y * 0.004
      if (p.fixed) {
        p.vx = 0
        p.vy = 0
        continue
      }
      p.vx *= 0.72
      p.vy *= 0.72
      p.x += p.vx
      p.y += p.vy
    }
    alpha.current *= 0.99
  }, [])

  const run = useCallback(() => {
    if (frame.current) return
    const loop = () => {
      step()
      setTick((t) => t + 1)
      if (alpha.current > 0.02 || dragging.current) frame.current = requestAnimationFrame(loop)
      else frame.current = 0
    }
    frame.current = requestAnimationFrame(loop)
  }, [step])

  useEffect(() => {
    const map = bodies.current
    const ids = new Set(nodes.map((n) => n.id))
    for (const id of [...map.keys()]) if (!ids.has(id)) map.delete(id)
    for (const n of nodes) {
      if (map.has(n.id)) continue
      const angle = Math.random() * Math.PI * 2
      const radius = 30 + Math.random() * 90
      map.set(n.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, vx: 0, vy: 0, fixed: false })
    }
    alpha.current = 1
    run()
  }, [nodes, edges, options.repulsion, options.link, run])

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
      if (p) p.fixed = false
      dragging.current = false
      alpha.current = Math.max(alpha.current, 0.3)
      run()
    },
    [run],
  )

  const reheat = useCallback(() => {
    alpha.current = 1
    run()
  }, [run])

  return { bodies: bodies.current, pin, release, reheat }
}
