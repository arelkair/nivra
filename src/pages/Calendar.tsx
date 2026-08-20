import { useState } from 'react'
import {
  DAYS,
  MONTHS,
  REPEATS,
  TYPES,
  dateKey,
  itemsOfDay,
  isFreeDay,
  isOfficialHoliday,
  isWeekend,
  monthDay,
  monthGrid,
  weekIndex,
  type Anniversary,
  type CalItem,
  type ItemType,
  type NivraEvent,
  type Repeat,
} from '../lib/store'
import { notifyWithUndo } from '../lib/undo'
import { Empty, Icon, Modal, Segmented, button, input, select } from '../components/ui'
import { locale, t, tp, weekdayLetters } from '../lib/i18n'

type Props = {
  items: CalItem[]
  specialDays: string[]
  setSpecialDays: (update: (prev: string[]) => string[]) => void
  autoSpecial: string[]
  subDays: number[]
  setEvents: (update: (prev: NivraEvent[]) => NivraEvent[]) => void
  freeDays: string[]
  setFreeDays: (update: (prev: string[]) => string[]) => void
  anniversaries: Anniversary[]
  setAnniversaries: (update: (prev: Anniversary[]) => Anniversary[]) => void
}

const GRADIENT =
  'bg-[linear-gradient(135deg,#ec4899_0%,#8b5cf6_35%,#3b82f6_60%,#06b6d4_80%,#22c55e_100%)]'

export function Calendar({
  items,
  setEvents,
  freeDays,
  setFreeDays,
  specialDays,
  setSpecialDays,
  autoSpecial,
  subDays,
  anniversaries,
  setAnniversaries,
}: Props) {
  const today = new Date()
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<'mes' | 'semana'>('mes')
  const [monday, setMonday] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate() - weekIndex(today)),
  )

  const weekDays = Array.from(
    { length: 7 },
    (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i),
  )
  const moveWeek = (delta: number) =>
    setMonday((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + delta * 7))

  const cells = monthGrid(cursor.y, cursor.m)
  const todayKey = dateKey(today)
  const move = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  const navButton =
    'grid h-10 w-10 place-items-center rounded-xl border border-black/[0.07] text-neutral-500 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 dark:border-white/[0.08] dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-neutral-100'

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight first-letter:uppercase sm:text-3xl">
          {view === 'mes' ? (
            <>
              {t(MONTHS[cursor.m])}{' '}
              <span className="text-neutral-300 dark:text-neutral-600">{cursor.y}</span>
            </>
          ) : (
            <>
              {weekDays[0].getDate()} {t(MONTHS[weekDays[0].getMonth()]).slice(0, 3)}
              <span className="text-neutral-300 dark:text-neutral-600"> — </span>
              {weekDays[6].getDate()} {t(MONTHS[weekDays[6].getMonth()]).slice(0, 3)}
            </>
          )}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { id: 'mes', label: 'Mes' },
              { id: 'semana', label: 'Semana' },
            ]}
          />
          <button
            type="button"
            onClick={() => {
              setCursor({ y: today.getFullYear(), m: today.getMonth() })
              setMonday(
                new Date(today.getFullYear(), today.getMonth(), today.getDate() - weekIndex(today)),
              )
            }}
            className="rounded-xl border border-black/[0.07] px-4 py-2 text-sm text-neutral-500 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 dark:border-white/[0.08] dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-neutral-100"
          >
            {t('Hoy')}
          </button>
          <button
            type="button"
            onClick={() => (view === 'mes' ? move(-1) : moveWeek(-1))}
            aria-label={view === 'mes' ? t('Mes anterior') : t('Semana anterior')}
            className={navButton}
          >
            <Icon name="left" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => (view === 'mes' ? move(1) : moveWeek(1))}
            aria-label={view === 'mes' ? t('Mes siguiente') : t('Semana siguiente')}
            className={navButton}
          >
            <Icon name="right" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {view === 'semana' && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {weekDays.map((d) => {
            const key = dateKey(d)
            const own = itemsOfDay(items, key)
            const isAnniversary = anniversaries.find((a) => a.md === monthDay(key))
            const isFree = isFreeDay(key, freeDays)
            const isSpecial = specialDays.includes(key) || autoSpecial.includes(key)
            const isCurrentDay = key === todayKey
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={`flex min-h-40 flex-col rounded-2xl border p-4 text-left transition-colors hover:border-neutral-400 lg:min-h-56 ${
                  isCurrentDay ? 'border-neutral-900 dark:border-white' : 'border-black/[0.07] dark:border-white/[0.08]'
                }`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[0.65rem] tracking-wider text-neutral-400 uppercase">
                    {t(DAYS[weekIndex(d)]).slice(0, 3)}
                  </span>
                  <span
                    className={`font-mono text-2xl tabular-nums ${
                      isFree
                        ? 'text-red-500'
                        : isSpecial
                          ? `${GRADIENT} bg-clip-text text-transparent`
                          : isAnniversary
                            ? 'text-yellow-600 dark:text-yellow-500'
                            : ''
                    }`}
                  >
                    {d.getDate()}
                  </span>
                </span>

                <span className="mt-2 flex min-w-0 flex-col gap-1">
                  {isAnniversary && (
                    <span className="truncate rounded-md bg-yellow-100 px-1.5 py-0.5 text-[0.65rem] text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-200">
                      {isAnniversary.name || 'Aniversario'}
                    </span>
                  )}
                  {isSpecial && (
                    <span
                      className={`truncate rounded-md ${GRADIENT} px-1.5 py-0.5 text-[0.65rem] text-white`}
                    >
                      {t('Día especial')}
                    </span>
                  )}
                  {own.length === 0 && !isAnniversary && !isSpecial ? (
                    <span className="text-[0.7rem] text-neutral-300 dark:text-neutral-600">
                      {t('Nada')}
                    </span>
                  ) : (
                    own.map((e) => (
                      <span
                        key={e.id}
                        className={`truncate rounded-md px-1.5 py-0.5 text-[0.65rem] ${TYPES[e.type].chip}`}
                      >
                        {e.title}
                      </span>
                    ))
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {view === 'mes' && (
      <>

      <div className="mb-2 grid grid-cols-7 text-center text-[0.7rem] font-semibold tracking-wider text-neutral-300 dark:text-neutral-600">
        {weekdayLetters().map((d, i) => (
          <span key={i} className={i >= 5 ? 'text-red-300 dark:text-red-500/60' : ''}>
            {d}
          </span>
        ))}
      </div>

      <div
        key={`${cursor.y}-${cursor.m}`}
        className="animate-[fade-in_0.3s_ease-out] grid grid-cols-7 gap-1 sm:gap-2"
      >
        {cells.map((day, i) => {
          if (day === null) return <span key={`empty-${i}`} />
          const key = dateKey(new Date(cursor.y, cursor.m, day))
          const dayItems = itemsOfDay(items, key)
          const anniversary = anniversaries.find((a) => a.md === monthDay(key))
          const free = isFreeDay(key, freeDays)
          const special = specialDays.includes(key) || autoSpecial.includes(key)
          const hasSubscription = subDays.includes(day)
          const isToday = key === todayKey

          const numberClass = isToday
            ? `font-semibold text-white ${
                free
                  ? 'bg-red-500'
                  : anniversary
                    ? 'bg-yellow-500'
                    : 'bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900'
              }`
            : free
              ? 'text-red-500'
              : special
                ? 'bg-[linear-gradient(135deg,#ec4899_0%,#8b5cf6_35%,#3b82f6_60%,#06b6d4_80%,#22c55e_100%)] bg-clip-text text-transparent'
                : anniversary
                  ? 'text-yellow-600 dark:text-yellow-500'
                  : ''

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              aria-label={`${day} de ${MONTHS[cursor.m]}`}
              className="relative flex aspect-square flex-col items-center gap-1 rounded-xl border border-transparent p-1 transition-colors hover:border-black/[0.07] hover:bg-[var(--surface)] sm:aspect-auto sm:min-h-24 sm:rounded-2xl sm:p-2 dark:hover:border-white/[0.08] dark:hover:bg-white/[0.04]"
            >
              {hasSubscription && (
                <span
                  title={t('Ese día se renueva una suscripción')}
                  className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-neutral-400 ring-2 ring-[var(--paper)] dark:bg-neutral-500"
                />
              )}
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-sm tabular-nums sm:h-8 sm:w-8 ${numberClass}`}
              >
                {day}
              </span>

              <span className="flex gap-0.5 sm:hidden">
                {anniversary && <span className="h-1 w-1 rounded-full bg-yellow-500" />}
                {dayItems.slice(0, 3).map((e) => (
                  <span key={e.id} className={`h-1 w-1 rounded-full ${TYPES[e.type].dot}`} />
                ))}
              </span>

              <span className="hidden w-full min-w-0 flex-col gap-1 sm:flex">
                {anniversary && (
                  <span className="truncate rounded-md bg-yellow-100 px-1.5 py-0.5 text-left text-[0.65rem] leading-4 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-200">
                    {anniversary.name || 'Aniversario'}
                  </span>
                )}
                {dayItems.slice(0, 2).map((e) => (
                  <span
                    key={e.id}
                    className={`truncate rounded-md px-1.5 py-0.5 text-left text-[0.65rem] leading-4 ${TYPES[e.type].chip}`}
                  >
                    {e.title}
                  </span>
                ))}
                {dayItems.length > 2 && (
                  <span className="px-1.5 text-left text-[0.6rem] text-neutral-400">
                    +{dayItems.length - 2}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      </>
      )}

      {selected && (
        <DayDialog
          key={selected}
          date={selected}
          items={itemsOfDay(items, selected)}
          anniversary={anniversaries.find((a) => a.md === monthDay(selected))}
          free={isFreeDay(selected, freeDays)}
          locked={isWeekend(selected) || isOfficialHoliday(selected)}
          special={specialDays.includes(selected) || autoSpecial.includes(selected)}
          onToggleSpecial={() =>
            setSpecialDays((prev) =>
              prev.includes(selected) ? prev.filter((d) => d !== selected) : [...prev, selected],
            )
          }
          onClose={() => setSelected(null)}
          onToggleFree={() =>
            setFreeDays((prev) =>
              prev.includes(selected) ? prev.filter((d) => d !== selected) : [...prev, selected],
            )
          }
          onToggleAnniversary={() =>
            setAnniversaries((prev) =>
              prev.some((a) => a.md === monthDay(selected))
                ? prev.filter((a) => a.md !== monthDay(selected))
                : [...prev, { id: crypto.randomUUID(), md: monthDay(selected), name: '' }],
            )
          }
          onRenameAnniversary={(name) =>
            setAnniversaries((prev) =>
              prev.map((a) => (a.md === monthDay(selected) ? { ...a, name } : a)),
            )
          }
          onAdd={(title, type, desc, repeat) =>
            setEvents((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                date: selected,
                title,
                type,
                desc: desc || undefined,
                repeat,
              },
            ])
          }
          onDelete={(id, title) => {
            setEvents((prev) => {
              const before = prev
              notifyWithUndo(tp('«{0}» eliminada', title), () => setEvents(() => before))
              return prev.filter((e) => e.id !== id)
            })
          }}
        />
      )}
    </div>
  )
}

type DialogProps = {
  date: string
  items: CalItem[]
  anniversary?: Anniversary
  free: boolean
  locked: boolean
  special: boolean
  onToggleSpecial: () => void
  onClose: () => void
  onToggleFree: () => void
  onToggleAnniversary: () => void
  onRenameAnniversary: (name: string) => void
  onAdd: (title: string, type: ItemType, desc: string, repeat?: Repeat) => void
  onDelete: (id: string, title: string) => void
}

function DayDialog({
  date,
  items,
  anniversary,
  free,
  locked,
  special,
  onToggleSpecial,
  onClose,
  onToggleFree,
  onToggleAnniversary,
  onRenameAnniversary,
  onAdd,
  onDelete,
}: DialogProps) {
  const [y, m, d] = date.split('-').map(Number)
  const label = new Date(y, m - 1, d).toLocaleDateString(locale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const square = 'grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors'

  return (
    <Modal
      title={label}
      onClose={onClose}
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggleFree}
            disabled={locked}
            aria-pressed={free}
            title={locked ? t('Festivo oficial o fin de semana') : t('Marcar como día sin trabajo')}
            aria-label={t('Día sin trabajo')}
            className={`${square} ${
              free
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-black/[0.07] text-neutral-300 hover:border-red-400 dark:border-neutral-700 dark:text-neutral-600'
            } ${locked ? 'cursor-default opacity-70' : ''}`}
          >
            <Icon name="pin" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleSpecial}
            aria-pressed={special}
            title={t('Marcar como día especial')}
            aria-label={t('Día especial')}
            className={`${square} ${
              special
                ? 'border-transparent bg-[linear-gradient(135deg,#ec4899_0%,#8b5cf6_35%,#3b82f6_60%,#06b6d4_80%,#22c55e_100%)] text-white'
                : 'border-black/[0.07] text-neutral-300 hover:border-fuchsia-400 dark:border-white/[0.08] dark:text-neutral-600'
            }`}
          >
            <Icon name="special" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleAnniversary}
            aria-pressed={!!anniversary}
            title={t('Marcar como aniversario (cada año)')}
            aria-label={t('Aniversario')}
            className={`${square} ${
              anniversary
                ? 'border-yellow-500 bg-yellow-500 text-white'
                : 'border-black/[0.07] text-neutral-300 hover:border-yellow-400 dark:border-neutral-700 dark:text-neutral-600'
            }`}
          >
            <Icon name="star" className="h-4 w-4" />
          </button>
        </div>
      }
    >
      {anniversary && (
        <input
          defaultValue={anniversary.name}
          onChange={(e) => onRenameAnniversary(e.target.value)}
          maxLength={40}
          placeholder={t('¿De qué o de quién es el aniversario?')}
          className={`${input} mb-4 border-yellow-300 bg-yellow-50 dark:border-yellow-500/40 dark:bg-yellow-500/10`}
        />
      )}

      {items.length === 0 ? (
        <div className="mb-5">
          <Empty>{t('Sin actividades.')}</Empty>
        </div>
      ) : (
        <ul className="mb-5 flex flex-col gap-2">
          {items.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-3 rounded-xl border border-black/[0.07] px-4 py-3 dark:border-white/[0.08]"
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TYPES[e.type].dot}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{e.title}</p>
                {e.desc && (
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{e.desc}</p>
                )}
                <p className="mt-1 text-[0.65rem] text-neutral-400 dark:text-neutral-500">
                  {t(TYPES[e.type].label)}
                  {e.repeat && ` · ${t(REPEATS.find((r) => r.id === e.repeat)?.label ?? '').toLowerCase()}`}
                  {e.origin !== 'evento' && t(' · desde su apartado')}
                </p>
              </div>
              {e.origin === 'evento' && (
                <button
                  type="button"
                  onClick={() => onDelete(e.id, e.title)}
                  aria-label={`Eliminar ${e.title}`}
                  className="shrink-0 text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          const form = ev.currentTarget
          const data = new FormData(form)
          const title = String(data.get('title') ?? '').trim()
          if (!title) return
          onAdd(
            title,
            String(data.get('type')) as ItemType,
            String(data.get('desc') ?? '').trim(),
            (String(data.get('repeat')) || undefined) as Repeat | undefined,
          )
          form.reset()
        }}
        className="flex flex-col gap-2"
      >
        <input name="title" maxLength={60} required placeholder={t('Nueva actividad')} className={input} />
        <textarea name="desc" maxLength={200} rows={2} placeholder={t('Descripción')} className={input} />
        <div className="flex gap-2">
          <select name="type" defaultValue="festividad" className={select} aria-label={t('Tipo')}>
            {Object.entries(TYPES).map(([value, info]) => (
              <option key={value} value={value}>
                {t(info.label)}
              </option>
            ))}
          </select>
          <select name="repeat" defaultValue="" className={select} aria-label={t('Repetición')}>
            <option value="">{t('No se repite')}</option>
            {REPEATS.map((r) => (
              <option key={r.id} value={r.id}>
                {t(r.label)}
              </option>
            ))}
          </select>
          <button type="submit" className={`${button} shrink-0`}>
            {t('Añadir')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
