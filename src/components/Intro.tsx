import { useEffect } from 'react'

const LETTERS = ['N', 'i', 'v', 'r', 'a']
export const INTRO_MS = 3000

export function Intro({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = setTimeout(onDone, reduced ? 0 : INTRO_MS)
    return () => clearTimeout(id)
  }, [onDone])

  return (
    <div className="nw nw-intro" role="status" aria-label="Nivra">
      <div className="nw-word" aria-hidden>
        {LETTERS.map((letter, i) => (
          <span key={i} className="nw-letter" style={{ '--i': i } as React.CSSProperties}>
            {letter}
          </span>
        ))}
        <span className="nw-dot" />
      </div>
      <div className="nw-bar" aria-hidden />
    </div>
  )
}
