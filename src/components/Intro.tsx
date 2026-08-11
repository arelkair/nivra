import { useEffect } from 'react'

export function Intro({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const ms = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2650
    const id = setTimeout(onDone, ms)
    return () => clearTimeout(id)
  }, [onDone])

  return (
    <div
      className="animate-[intro-exit_0.9s_cubic-bezier(.76,0,.24,1)_1.75s_forwards] fixed inset-0 z-20 grid place-items-center overflow-hidden bg-neutral-950 text-stone-50"
    >
      <div
        aria-hidden
        className="animate-[drift_9s_ease-in-out_infinite_alternate] absolute top-[12%] left-[10%] aspect-square w-[min(20vw,260px)] rounded-full border border-neutral-700 opacity-70"
      />
      <div
        aria-hidden
        className="animate-[drift_11s_ease-in-out_-3s_infinite_alternate-reverse] absolute right-[13%] bottom-[14%] aspect-square w-[min(13vw,180px)] rotate-45 rounded-3xl border border-neutral-700 opacity-70"
      />

      <p className="overflow-hidden px-1 pb-2 text-[clamp(3.5rem,12vw,9rem)] leading-none">
        <span className="font-display animate-[word-enter_0.9s_cubic-bezier(.16,1,.3,1)_both] block font-semibold tracking-tight">
          Nivra
        </span>
      </p>

      <div className="animate-[load-line_1.55s_cubic-bezier(.65,0,.35,1)_0.25s_both] absolute bottom-0 left-0 h-1 w-full origin-left bg-stone-50" />
    </div>
  )
}
