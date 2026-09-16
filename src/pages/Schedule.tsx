import { useState } from 'react'
import { DAYS, DEFAULT_PROFILE, blockProfile, weekIndex, type Block, type Profile } from '../lib/store'
import { notifyWithUndo } from '../lib/undo'
import { Empty, Icon, Modal, Segmented, button, card, input, line } from '../components/ui'
import { t, tp } from '../lib/i18n'
import { playDrop } from '../lib/sound'

type Adding = { day: number; start?: string; end?: string }

type Props = {
  blocks: Block[]
  setBlocks: (update: (prev: Block[]) => Block[]) => void
  profiles: Profile[]
  setProfiles: (update: (prev: Profile[]) => Profile[]) => void
  active: string
  setActive: (id: string) => void
}

export function Schedule({ blocks, setBlocks, profiles, setProfiles, active, setActive }: Props) {
  const [adding, setAdding] = useState<Adding | null>(null)
  const [editingItem, setEditingItem] = useState<Block | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<number | null>(null)

  const dropOn = (dayIndex: number) => {
    const id = dragging
    setDragging(null)
    setOver(null)
    if (!id) return
    playDrop()
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, day: dayIndex } : b)))
  }

  const duplicate = (b: Block) =>
    setBlocks((prev) => [...prev, { ...b, id: crypto.randomUUID() }])
  const removeBlock = (b: Block) => {
    const before = blocks
    setBlocks((prev) => prev.filter((x) => x.id !== b.id))
    notifyWithUndo(tp('«{0}» eliminado', b.title), () => setBlocks(() => before))
  }
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [creatingProfile, setCreatingProfile] = useState(false)
  const todayIndex = weekIndex(new Date())
  const visible = blocks.filter((b) => blockProfile(b) === active)
  const activeProfile = profiles.find((p) => p.id === active)
  const mode = activeProfile?.mode ?? 'libre'
  const setMode = (m: 'libre' | 'tabla') =>
    setProfiles((prev) => prev.map((p) => (p.id === active ? { ...p, mode: m } : p)))

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => (p.id === active ? setEditingProfile(p) : setActive(p.id))}
            title={p.id === active ? t('Renombrar o eliminar') : t('Cambiar a este horario')}
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
          aria-label={t('Nuevo horario')}
          className={`grid h-10 w-10 place-items-center rounded-xl border border-dashed text-neutral-400 transition-colors hover:text-neutral-900 ${line} dark:hover:text-white`}
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-5 flex justify-center">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { id: 'libre', label: t('Horario libre') },
            { id: 'tabla', label: t('Horario en tabla') },
          ]}
        />
      </div>

      {mode === 'tabla' ? (
        <TableSchedule
          visible={visible}
          onQuickAdd={(day, start, end) => setAdding({ day, start, end })}
          onAddRow={() => setAdding({ day: 0 })}
          onEdit={setEditingItem}
          onDelete={removeBlock}
        />
      ) : (
        <>
          <p className="mb-3 text-[0.7rem] text-neutral-400 dark:text-neutral-500">
            {t('Arrastra un bloque a otro día para moverlo, o púlsalo para editarlo.')}
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {DAYS.map((day, i) => {
          const dayBlocks = visible
            .filter((b) => b.day === i)
            .sort((a, b) => {
              const la = a.lateNight ? 1 : 0
              const lb = b.lateNight ? 1 : 0
              return la !== lb ? la - lb : a.start.localeCompare(b.start)
            })
          return (
            <section
              key={day}
              style={{ animationDelay: `${i * 0.04}s` }}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(i)
              }}
              onDragLeave={() => setOver((prev) => (prev === i ? null : prev))}
              onDrop={() => dropOn(i)}
              className={`${card} animate-[fade-in_0.35s_ease-out_both] flex flex-col p-4 transition-colors ${
                over === i ? 'border-neutral-400 dark:border-neutral-500' : ''
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3
                  className={`text-sm font-semibold ${
                    i === todayIndex ? '' : 'text-neutral-400 dark:text-neutral-500'
                  }`}
                >
                  {t(day)}
                </h3>
                {i === todayIndex && (
                  <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[0.6rem] font-medium text-neutral-50 dark:bg-white dark:text-neutral-900">
                    {t('hoy')}
                  </span>
                )}
              </div>

              <ul className="flex flex-1 flex-col gap-2">
                {dayBlocks.length === 0 ? (
                  <Empty>{t('Vacío.')}</Empty>
                ) : (
                  dayBlocks.map((b) => (
                    <li
                      key={b.id}
                      draggable
                      onDragStart={() => setDragging(b.id)}
                      onDragEnd={() => {
                        setDragging(null)
                        setOver(null)
                      }}
                      className={`group cursor-grab rounded-xl bg-black/[0.04] px-3 py-2.5 active:cursor-grabbing dark:bg-white/[0.06] ${
                        dragging === b.id ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="whitespace-nowrap font-mono text-[0.7rem] tabular-nums text-neutral-500 dark:text-neutral-400">
                          {b.start}–{b.end}
                        </span>
                        <span className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => duplicate(b)}
                            aria-label={`Duplicar ${b.title}`}
                            className="text-neutral-300 transition-colors hover:text-neutral-900 dark:text-neutral-600 dark:hover:text-white"
                          >
                            <Icon name="copy" className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const before = blocks
                              setBlocks((prev) => prev.filter((x) => x.id !== b.id))
                              notifyWithUndo(tp('«{0}» eliminado', b.title), () => setBlocks(() => before))
                            }}
                            aria-label={`Eliminar ${b.title}`}
                            className="text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
                          >
                            <Icon name="trash" className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingItem(b)}
                        className="mt-0.5 w-full truncate text-left text-sm"
                        title={t('Editar')}
                      >
                        {b.title}
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <button
                type="button"
                onClick={() => setAdding({ day: i })}
                aria-label={tp('Añadir bloque el {0}', t(day))}
                className={`mt-3 flex items-center justify-center gap-1 rounded-xl border border-dashed py-2 text-xs text-neutral-400 transition-colors hover:border-neutral-400 hover:text-neutral-900 ${line} dark:hover:text-white`}
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
              </button>
            </section>
          )
        })}
          </div>
        </>
      )}

      {adding && (
        <Modal title={t('Nuevo bloque')} onClose={() => setAdding(null)}>
          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              const data = new FormData(ev.currentTarget)
              const title = String(data.get('title') ?? '').trim()
              const a = String(data.get('start') ?? '')
              const b = String(data.get('end') ?? '')
              if (!title || !a || !b) return
              const [start, end] = a <= b ? [a, b] : [b, a]
              const dayIndex = Number(data.get('day'))
              const lateNight = data.get('lateNight') === 'on'
              setBlocks((prev) => [
                ...prev,
                { id: crypto.randomUUID(), day: dayIndex, start, end, title, profile: active, lateNight },
              ])
              setAdding(null)
            }}
            className="flex flex-col gap-2"
          >
            <input name="title" maxLength={60} required autoFocus placeholder={t('Asignatura o bloque')} className={input} />
            <select name="day" defaultValue={adding.day} aria-label={t('Día')} className={input}>
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {t(d)}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                name="start"
                type="time"
                defaultValue={adding.start}
                required
                aria-label={t('Inicio')}
                className={input}
              />
              <input
                name="end"
                type="time"
                defaultValue={adding.end}
                required
                aria-label={t('Fin')}
                className={input}
              />
            </div>
            <label className="mt-1 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <input name="lateNight" type="checkbox" className="h-4 w-4 rounded" />
              {t('Colocar al final del día')}
            </label>
            <p className="text-[0.65rem] text-neutral-400 dark:text-neutral-500">
              {t('Útil si tienes una actividad que empieza pasada la medianoche.')}
            </p>
            <button type="submit" className={`${button} mt-2`}>
              {t('Añadir')}
            </button>
          </form>
        </Modal>
      )}

      {editingItem && (
        <Modal title={t('Bloque')} onClose={() => setEditingItem(null)}>
          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              const data = new FormData(ev.currentTarget)
              const title = String(data.get('title') ?? '').trim()
              const a = String(data.get('start') ?? '')
              const b = String(data.get('end') ?? '')
              if (!title || !a || !b) return
              const [start, end] = a <= b ? [a, b] : [b, a]
              const dayIndex = Number(data.get('day'))
              const lateNight = data.get('lateNight') === 'on'
              setBlocks((prev) =>
                prev.map((x) =>
                  x.id === editingItem.id ? { ...x, title, start, end, day: dayIndex, lateNight } : x,
                ),
              )
              setEditingItem(null)
            }}
            className="flex flex-col gap-2"
          >
            <input
              name="title"
              defaultValue={editingItem.title}
              maxLength={60}
              required
              className={input}
            />
            <div className="flex gap-2">
              <input
                name="start"
                type="time"
                defaultValue={editingItem.start}
                required
                aria-label={t('Inicio')}
                className={input}
              />
              <input
                name="end"
                type="time"
                defaultValue={editingItem.end}
                required
                aria-label={t('Fin')}
                className={input}
              />
            </div>
            <select name="day" defaultValue={editingItem.day} aria-label={t('Día')} className={input}>
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {t(d)}
                </option>
              ))}
            </select>
            <label className="mt-1 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <input
                name="lateNight"
                type="checkbox"
                defaultChecked={editingItem.lateNight}
                className="h-4 w-4 rounded"
              />
              {t('Colocar al final del día')}
            </label>
            <p className="text-[0.65rem] text-neutral-400 dark:text-neutral-500">
              {t('Útil si tienes una actividad que empieza pasada la medianoche.')}
            </p>
            <button type="submit" className={`${button} mt-2`}>
              {t('Guardar')}
            </button>
          </form>
        </Modal>
      )}

      {(creatingProfile || editingProfile) && (
        <Modal
          title={editingProfile ? t('Horario') : t('Nuevo horario')}
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
              placeholder={t('Nombre del horario')}
              className={input}
            />
            <div className="mt-2 flex gap-2">
              {editingProfile && profiles.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const rest = profiles.filter((p) => p.id !== editingProfile.id)
                    setBlocks((prev) => prev.filter((b) => blockProfile(b) !== editingProfile.id))
                    setProfiles(() => rest)
                    setActive(rest[0]?.id ?? DEFAULT_PROFILE)
                    setEditingProfile(null)
                  }}
                  className="rounded-xl px-4 py-2.5 text-sm text-neutral-400 transition-colors hover:text-red-500"
                >
                  {t('Eliminar')}
                </button>
              )}
              <button type="submit" className={`${button} ml-auto`}>
                {t('Guardar')}
              </button>
            </div>
            {editingProfile && profiles.length > 1 && (
              <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
                {t('Al eliminarlo se borran también sus bloques.')}
              </p>
            )}
          </form>
        </Modal>
      )}
    </div>
  )
}

function TableSchedule({
  visible,
  onQuickAdd,
  onAddRow,
  onEdit,
  onDelete,
}: {
  visible: Block[]
  onQuickAdd: (day: number, start: string, end: string) => void
  onAddRow: () => void
  onEdit: (b: Block) => void
  onDelete: (b: Block) => void
}) {
  const todayIndex = weekIndex(new Date())
  const rowKey = (start: string, end: string) => `${start}–${end}`
  const rows = Array.from(
    new Map(visible.map((b) => [rowKey(b.start, b.end), { start: b.start, end: b.end }])).values(),
  ).sort((a, b) => a.start.localeCompare(b.start))

  return (
    <div className="flex flex-col gap-3">
      <div className={`${card} overflow-x-auto`}>
        {rows.length === 0 ? (
          <div className="p-6">
            <Empty>{t('Vacío.')}</Empty>
          </div>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className={`w-24 border-b p-2 text-left text-[0.65rem] font-medium text-neutral-400 ${line}`} />
                {DAYS.map((day, i) => (
                  <th
                    key={day}
                    className={`border-b border-l p-2 text-center text-[0.65rem] font-medium ${line} ${
                      i === todayIndex ? '' : 'text-neutral-400 dark:text-neutral-500'
                    }`}
                  >
                    {t(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={rowKey(row.start, row.end)}>
                  <td
                    className={`whitespace-nowrap border-b p-2 font-mono text-[0.65rem] tabular-nums text-neutral-400 ${line}`}
                  >
                    {row.start}–{row.end}
                  </td>
                  {DAYS.map((_, dayIndex) => {
                    const block = visible.find(
                      (b) => b.day === dayIndex && b.start === row.start && b.end === row.end,
                    )
                    return (
                      <td
                        key={dayIndex}
                        className={`border-b border-l p-1 align-top ${line} ${
                          dayIndex === todayIndex ? 'bg-black/[0.02] dark:bg-white/[0.03]' : ''
                        }`}
                      >
                        {block ? (
                          <div className="group flex items-center gap-1 rounded-lg bg-black/[0.04] px-2 py-1.5 dark:bg-white/[0.06]">
                            <button
                              type="button"
                              onClick={() => onEdit(block)}
                              className="min-w-0 flex-1 truncate text-left text-xs"
                              title={t('Editar')}
                            >
                              {block.title}
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(block)}
                              aria-label={`Eliminar ${block.title}`}
                              className="shrink-0 text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500 dark:text-neutral-600"
                            >
                              <Icon name="trash" className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onQuickAdd(dayIndex, row.start, row.end)}
                            aria-label={tp('Añadir bloque el {0} de {1} a {2}', t(DAYS[dayIndex]), row.start, row.end)}
                            className="grid h-8 w-full place-items-center rounded-lg text-neutral-300 transition-colors hover:bg-black/[0.03] hover:text-neutral-900 dark:text-neutral-700 dark:hover:bg-white/[0.05] dark:hover:text-white"
                          >
                            <Icon name="plus" className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <button
        type="button"
        onClick={onAddRow}
        className={`flex items-center justify-center gap-1 self-start rounded-xl border border-dashed px-4 py-2 text-xs text-neutral-400 transition-colors hover:border-neutral-400 hover:text-neutral-900 ${line} dark:hover:text-white`}
      >
        <Icon name="plus" className="h-3.5 w-3.5" />
        {t('Nueva franja horaria')}
      </button>

      <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
        {t('Las horas fijas se mantienen siempre en la misma fila. Un día con una hora distinta simplemente añade una franja nueva.')}
      </p>
    </div>
  )
}
