import { useEffect, useState } from 'react'

const LETTERS = ['N', 'i', 'v', 'r', 'a']
const LOAD_START_MS = 200
const LOAD_MS = 1800
export const INTRO_MS = 3000

export function Intro({ onDone }: { onDone: () => void }) {
  const [percent, setPercent] = useState(0)

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = setTimeout(onDone, reduced ? 0 : INTRO_MS)
    return () => clearTimeout(id)
  }, [onDone])

  useEffect(() => {
    let frame = 0
    const start = performance.now() + LOAD_START_MS
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / LOAD_MS))
      setPercent(Math.round((p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2) * 100))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="nw nw-intro" role="status" aria-label="Nivra">
      <div className="nw-grid" aria-hidden />
      <div className="nw-glow" aria-hidden />

      <div className="relative flex flex-col items-center" aria-hidden>
        <div className="nw-word">
          {LETTERS.map((letter, i) => (
            <span key={i} className="nw-letter" style={{ '--i': i } as React.CSSProperties}>
              {letter}
            </span>
          ))}
          <span className="nw-dot" />
        </div>
        <span className="nw-rule w-full" />
        <span className="nw-tag">INITIATIVE</span>
      </div>

      <div className="nw-meta" aria-hidden>
        <span>nivra</span>
        <span>{String(percent).padStart(3, '0')}</span>
      </div>
      <div className="nw-bar" aria-hidden />
    </div>
  )
}
