import { useState } from 'react'
import { DAYS, DEFAULT_PROFILE, blockProfile, weekIndex, type Block, type Profile } from '../lib/store'
import { Empty, Icon, Modal, button, card, input, line } from '../components/ui'

type Props = {
  blocks: Block[]
  setBlocks: (update: (prev: Block[]) => Block[]) => void
  profiles: Profile[]
  setProfiles: (update: (prev: Profile[]) => Profile[]) => void
  active: string
  setActive: (id: string) => void
}

export function Schedule({ blocks, setBlocks, profiles, setProfiles, active, setActive }: Props) {
  const [adding, setAdding] = useState<number | null>(null)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [creatingProfile, setCreatingProfile] = useState(false)
  const todayIndex = weekIndex(new Date())
  const visibles = blocks.filter((b) => blockProfile(b) === active)

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => (p.id === active ? setEditingProfile(p) : setActive(p.id))}
            title={p.id === active ? 'Renombrar o eliminar' : 'Cambiar a este horario'}
            className={`rounded-xl border px-4 py-2 text-sm transition-colors ${
              p.id === active
                ? 'border-neutral-900 font-medium dark:border-white'
                : `${line} text-neutral-500 hover:bg-black/[0.03] dark:text-neutral-400 dark:hover:bg-white/[0.04]`
            }`}
          >
            {p.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCreatingProfile(true)}
          aria-label="Nuevo horario"
          className={`grid h-10 w-10 place-items-center rounded-xl border border-dashed text-neutral-400 transition-colors hover:text-neutral-900 ${line} dark:hover:text-white`}
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {DAYS.map((day, i) => {
          const dayBlocks = visibles
            .filter((b) => b.day === i)
            .sort((a, b) => a.start.localeCompare(b.start))
          return (
            <section
              key={day}
              style={{ animationDelay: `${i * 0.04}s` }}
              className={`${card} animate-[fade-in_0.35s_ease-out_both] flex flex-col p-4`}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3
                  className={`text-sm font-semibold ${
                    i === todayIndex ? '' : 'text-neutral-400 dark:text-neutral-500'
                  }`}
                >
                  {day}
                </h3>
                {i === todayIndex && (
                  <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[0.6rem] font-medium text-white dark:bg-white dark:text-neutral-900">
                    hoy
                  </span>
                )}
              </div>

              <ul className="flex flex-1 flex-col gap-2">
                {dayBlocks.length === 0 ? (
                  <Empty>Vacío.</Empty>
                ) : (
                  dayBlocks.map((b) => (
                    <li key={b.id} className="rounded-xl bg-black/[0.04] px-3 py-2.5 dark:bg-white/[0.06]">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[0.7rem] tabular-nums text-neutral-500 dark:text-neutral-400">
                          {b.start}–{b.end}
                        </span>
                        <button
                          type="button"
                          onClick={() => setBlocks((prev) => prev.filter((x) => x.id !== b.id))}
                          aria-label={`Eliminar ${b.title}`}
                          className="text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
                        >
                          <Icon name="trash" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-0.5 truncate text-sm">{b.title}</p>
                    </li>
                  ))
                )}
              </ul>

              <button
                type="button"
                onClick={() => setAdding(i)}
                aria-label={`Añadir bloque el ${day}`}
                className={`mt-3 flex items-center justify-center gap-1 rounded-xl border border-dashed py-2 text-xs text-neutral-400 transition-colors hover:border-neutral-400 hover:text-neutral-900 ${line} dark:hover:text-white`}
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
              </button>
            </section>
          )
        })}
      </div>

      {adding !== null && (
        <Modal title={DAYS[adding]} onClose={() => setAdding(null)}>
          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              const data = new FormData(ev.currentTarget)
              const title = String(data.get('title') ?? '').trim()
              const a = String(data.get('start') ?? '')
              const b = String(data.get('end') ?? '')
              if (!title || !a || !b) return
              const [start, end] = a <= b ? [a, b] : [b, a]
              setBlocks((prev) => [
                ...prev,
                { id: crypto.randomUUID(), day: adding, start, end, title, profile: active },
              ])
              setAdding(null)
            }}
            className="flex flex-col gap-2"
          >
            <input name="title" maxLength={60} required placeholder="Asignatura o bloque" className={input} />
            <div className="flex gap-2">
              <input name="start" type="time" required aria-label="Inicio" className={input} />
              <input name="end" type="time" required aria-label="Fin" className={input} />
            </div>
            <button type="submit" className={`${button} mt-2`}>
              Añadir
            </button>
          </form>
        </Modal>
      )}

      {(creatingProfile || editingProfile) && (
        <Modal
          title={editingProfile ? 'Horario' : 'Nuevo horario'}
          onClose={() => {
            setCreatingProfile(false)
            setEditingProfile(null)
          }}
        >
          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              const name = String(new FormData(ev.currentTarget).get('name') ?? '').trim()
              if (!name) return
              if (editingProfile) {
                setProfiles((prev) =>
                  prev.map((p) => (p.id === editingProfile.id ? { ...p, name } : p)),
                )
                setEditingProfile(null)
              } else {
                const id = crypto.randomUUID()
                setProfiles((prev) => [...prev, { id, name }])
                setActive(id)
                setCreatingProfile(false)
              }
            }}
            className="flex flex-col gap-2"
          >
            <input
              name="name"
              defaultValue={editingProfile?.name}
              maxLength={30}
              required
              autoFocus
              placeholder="Nombre del horario"
              className={input}
            />
            <div className="mt-2 flex gap-2">
              {editingProfile && profiles.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const resto = profiles.filter((p) => p.id !== editingProfile.id)
                    setBlocks((prev) => prev.filter((b) => blockProfile(b) !== editingProfile.id))
                    setProfiles(() => resto)
                    setActive(resto[0]?.id ?? DEFAULT_PROFILE)
                    setEditingProfile(null)
                  }}
                  className="rounded-xl px-4 py-2.5 text-sm text-neutral-400 transition-colors hover:text-red-500"
                >
                  Eliminar
                </button>
              )}
              <button type="submit" className={`${button} ml-auto`}>
                Guardar
              </button>
            </div>
            {editingProfile && profiles.length > 1 && (
              <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
                Al eliminarlo se borran también sus bloques.
              </p>
            )}
          </form>
        </Modal>
      )}
    </div>
  )
}
