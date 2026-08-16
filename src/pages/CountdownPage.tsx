import { useEffect, useState } from 'react'
import { UNITS, countdown, progress, type Countdown, type Unit } from '../lib/store'
import { Empty, Icon, Label, Switch, button, card, input, line } from '../components/ui'

type Props = {
  id: string
  countdowns: Countdown[]
  setCountdowns: (update: (prev: Countdown[]) => Countdown[]) => void
  onSalir: () => void
}

const dos = (n: number) => String(n).padStart(2, '0')
const fecha = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}
const hora = (iso: string) => {
  const d = new Date(iso)
  return `${dos(d.getHours())}:${dos(d.getMinutes())}`
}

export function CountdownPage({ id, countdowns, setCountdowns, onSalir }: Props) {
  const [now, setNow] = useState(() => new Date())
  const item = countdowns.find((c) => c.id === id)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  if (!item) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Empty>Esta cuenta atrás ya no existe.</Empty>
      </div>
    )
  }

  const cambiar = (cambios: Partial<Countdown>) =>
    setCountdowns((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)))

  const objetivo = new Date(item.target)
  const partes = countdown(now, objetivo, item.units)
  const pct = progress(item.created, item.target, now)
  const acabado = objetivo.getTime() <= now.getTime()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <section className={`${card} p-5 sm:p-6`}>
        <input
          value={item.title}
          onChange={(e) => cambiar({ title: e.target.value })}
          maxLength={40}
          aria-label="Título"
          className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none"
        />
        <input
          value={item.subtitle ?? ''}
          onChange={(e) => cambiar({ subtitle: e.target.value || undefined })}
          maxLength={60}
          placeholder="Subtítulo"
          aria-label="Subtítulo"
          className="mt-1 w-full bg-transparent text-sm text-neutral-400 outline-none dark:text-neutral-500"
        />

        {acabado ? (
          <p className="mt-5 font-mono text-3xl font-medium">Se acabó</p>
        ) : (
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
            {partes.map((p) => (
              <div key={p.unit}>
                <p className="font-mono text-3xl font-medium tabular-nums sm:text-4xl">{p.value}</p>
                <p className="text-[0.6rem] tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                  {p.label}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-neutral-700 transition-[width] duration-1000 dark:bg-neutral-300"
            style={{ width: `${pct * 100}%` }}
          />
        </div>
        <p className="mt-1.5 font-mono text-[0.65rem] text-neutral-400">{Math.round(pct * 100)}%</p>
      </section>

      <section className={`${card} p-5 sm:p-6`}>
        <Label>Empieza</Label>
        <div className="flex gap-2">
          <input
            type="date"
            value={fecha(item.created)}
            onChange={(e) => cambiar({ created: `${e.target.value}T${hora(item.created)}` })}
            aria-label="Día de inicio"
            className={input}
          />
          <input
            type="time"
            value={hora(item.created)}
            onChange={(e) => cambiar({ created: `${fecha(item.created)}T${e.target.value}` })}
            aria-label="Hora de inicio"
            className={input}
          />
        </div>

        <div className="mt-4">
          <Label>Acaba</Label>
          <div className="flex gap-2">
            <input
              type="date"
              value={fecha(item.target)}
              onChange={(e) => cambiar({ target: `${e.target.value}T${hora(item.target)}` })}
              aria-label="Día del final"
              className={input}
            />
            <input
              type="time"
              value={hora(item.target)}
              onChange={(e) => cambiar({ target: `${fecha(item.target)}T${e.target.value}` })}
              aria-label="Hora del final"
              className={input}
            />
          </div>
        </div>

        <div className="mt-4">
          <Label>Unidades</Label>
          {UNITS.map((u) => (
            <Switch
              key={u.id}
              checked={item.units[u.id]}
              onChange={(v) => cambiar({ units: { ...item.units, [u.id]: v } as Record<Unit, boolean> })}
              label={u.many[0].toUpperCase() + u.many.slice(1)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setCountdowns((prev) => prev.filter((c) => c.id !== id))
            onSalir()
          }}
          className={`mt-5 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm text-neutral-400 transition-colors hover:text-red-500 ${line}`}
        >
          <Icon name="trash" className="h-4 w-4" />
          Eliminar cuenta atrás
        </button>
      </section>

      <button type="button" onClick={onSalir} className={`${button} w-fit`}>
        Volver
      </button>
    </div>
  )
}
