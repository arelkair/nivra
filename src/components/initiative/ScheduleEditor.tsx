import { useState } from 'react'
import { DAYS, textOn, type Subject } from '../../lib/store'
import { t } from '../../lib/i18n'
import { Icon } from '../ui'
import { formatSpan, fromMin, toMin } from './scheduleLayout'
import { skin, type Skin } from './skin'

export type Draft = {
  id: string | null
  day: number
  start: string
  end: string
  title: string
  color?: string
  textColor?: string
  textBg?: string
  alsoDays: number[]
}

const SWATCHES = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#38bdf8', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b']

const DURATIONS = [30, 45, 60, 90, 120]

function shift(hhmm: string, minutes: number) {
  return fromMin(Math.min(24 * 60 - 1, Math.max(0, toMin(hhmm || '00:00') + minutes)))
}

function Stepper({ label, value, onChange, s }: { label: string; value: string; onChange: (v: string) => void; s: Skin }) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <span className={`text-[0.65rem] tracking-widest uppercase ${s.faint}`}>{label}</span>
      <div className={`flex items-stretch overflow-hidden rounded-lg border ${s.line}`}>
        <button
          type="button"
          onClick={() => onChange(shift(value, -15))}
          aria-label={`${label} −15 min`}
          className={`grid w-9 shrink-0 place-items-center text-lg ${s.muted} ${s.hover} ${s.hoverText}`}
        >
          −
        </button>
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent px-1 py-2 text-center text-base tabular-nums outline-none sm:text-sm"
        />
        <button
          type="button"
          onClick={() => onChange(shift(value, 15))}
          aria-label={`${label} +15 min`}
          className={`grid w-9 shrink-0 place-items-center text-lg ${s.muted} ${s.hover} ${s.hoverText}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

export function ScheduleEditor({
  draft,
  setDraft,
  subjects,
  dark,
  conflicts,
  onSave,
  onDelete,
  onDuplicate,
}: {
  draft: Draft
  setDraft: (d: Draft | null) => void
  subjects: Subject[]
  dark: boolean
  conflicts: string[]
  onSave: () => void
  onDelete?: () => void
  onDuplicate?: () => void
}) {
  const s: Skin = skin(dark)
  const [more, setMore] = useState(!!draft.textColor || !!draft.textBg)
  const label = `text-[0.65rem] tracking-widest uppercase ${s.faint}`
  const set = (changes: Partial<Draft>) => setDraft({ ...draft, ...changes })
  const duration = draft.start && draft.end ? Math.abs(toMin(draft.end) - toMin(draft.start)) : 0
  const ink = draft.color ? textOn(draft.color) : ''
  const dayNames = DAYS.map((d) => t(d))

  const colorRow = (name: 'textColor' | 'textBg', title: string, fallback: string) => (
    <div className="flex items-center gap-3">
      <label className={`flex flex-1 items-center gap-2 text-xs ${s.muted}`}>
        <input
          type="checkbox"
          checked={!!draft[name]}
          onChange={(e) => set({ [name]: e.target.checked ? fallback : undefined } as Partial<Draft>)}
          className="h-4 w-4 rounded"
        />
        {title}
      </label>
      {draft[name] && (
        <input
          type="color"
          value={draft[name]}
          onChange={(e) => set({ [name]: e.target.value } as Partial<Draft>)}
          aria-label={title}
          className="h-7 w-7 cursor-pointer rounded-lg border-0 bg-transparent p-0"
        />
      )}
    </div>
  )

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault()
        onSave()
      }}
      className={`flex flex-col overflow-hidden rounded-2xl border xl:sticky xl:top-0 xl:max-h-[calc(100svh-7rem)] max-xl:fixed max-xl:inset-x-0 max-xl:bottom-14 max-xl:z-30 max-xl:max-h-[85svh] max-xl:rounded-b-none max-xl:shadow-2xl md:max-xl:bottom-0 md:max-xl:left-56 ${s.line} ${
        dark ? 'bg-neutral-900' : 'bg-white'
      }`}
    >
      <div className={`flex shrink-0 items-center justify-between border-b px-4 py-3 ${s.line}`}>
        <p className={label}>{draft.id ? t('Editar bloque') : t('Nuevo bloque')}</p>
        <button type="button" onClick={() => setDraft(null)} aria-label={t('Cerrar')} className={`${s.muted} ${s.hoverText}`}>
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>

      <div className="nivra-scroll flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain px-4 py-4">
        <div
          style={draft.color ? { background: draft.color } : undefined}
          className={`flex flex-col gap-1 rounded-xl px-3 py-3 transition-colors ${draft.color ? '' : `border ${s.line}`}`}
        >
          <span className={`text-[0.7rem] tabular-nums ${draft.color ? `${ink} opacity-80` : s.muted}`}>
            {draft.start || '--:--'}–{draft.end || '--:--'}
            {duration > 0 && ` · ${formatSpan(duration)}`}
          </span>
          <input
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            maxLength={60}
            required
            autoFocus
            placeholder={t('Asignatura o bloque')}
            aria-label={t('Asignatura o bloque')}
            style={{ color: draft.textColor ?? undefined, background: draft.textBg ?? undefined }}
            className={`w-full rounded-lg bg-transparent px-1.5 py-1 text-lg font-medium outline-none placeholder:opacity-50 ${
              !draft.textColor && draft.color ? ink : ''
            }`}
          />
        </div>

        {subjects.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className={label}>{t('Asignaturas')}</span>
            <div className="nivra-scroll flex flex-wrap gap-1.5">
              {subjects.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => set({ title: sub.name, color: sub.color })}
                  className="rounded-md px-2.5 py-1.5 text-xs transition-opacity hover:opacity-80"
                  style={{ background: sub.color, color: textOn(sub.color) }}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Stepper label={t('Inicio')} value={draft.start} onChange={(v) => set({ start: v })} s={s} />
            <Stepper label={t('Fin')} value={draft.end} onChange={(v) => set({ end: v })} s={s} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DURATIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => draft.start && set({ end: shift(draft.start, m) })}
                aria-pressed={duration === m}
                className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                  duration === m ? `${s.active} border-transparent` : `${s.line} ${s.muted} ${s.hover}`
                }`}
              >
                {formatSpan(m)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={label}>{draft.id ? t('Día y copias') : t('Días')}</span>
          <div className="flex gap-1.5">
            {dayNames.map((name, i) => {
              const selected = [draft.day, ...draft.alsoDays]
              const on = selected.includes(i)
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    if (on && selected.length === 1) return
                    const next = on ? selected.filter((d) => d !== i) : [...selected, i]
                    const primary = next.includes(draft.day) ? draft.day : next[0]
                    set({ day: primary, alsoDays: next.filter((d) => d !== primary) })
                  }}
                  aria-pressed={on}
                  title={name}
                  className={`flex-1 rounded-lg border py-2 text-xs transition-colors ${
                    on ? `${s.active} border-transparent font-medium` : `${s.line} ${s.muted} ${s.hover}`
                  }`}
                >
                  {name.slice(0, 1)}
                </button>
              )
            })}
          </div>
          <p className={`text-[0.7rem] ${s.faint}`}>
            {[draft.day, ...draft.alsoDays]
              .sort((x, y) => x - y)
              .map((d) => dayNames[d].slice(0, 3))
              .join(', ')}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className={label}>{t('Color')}</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => set({ color: undefined })}
              aria-label={t('Sin color')}
              aria-pressed={!draft.color}
              className={`grid h-7 w-7 place-items-center rounded-full border-2 border-dashed text-xs ${s.muted} ${
                !draft.color ? (dark ? 'border-white' : 'border-neutral-900') : s.line
              }`}
            >
              ×
            </button>
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set({ color: c })}
                aria-label={c}
                aria-pressed={draft.color === c}
                className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                  draft.color === c ? (dark ? 'border-white' : 'border-neutral-900') : 'border-transparent'
                }`}
                style={{ background: c }}
              />
            ))}
            <input
              type="color"
              value={draft.color ?? '#3b82f6'}
              onChange={(e) => set({ color: e.target.value })}
              aria-label={t('Color del bloque')}
              className="h-7 w-7 cursor-pointer rounded-lg border-0 bg-transparent p-0"
            />
          </div>
          <button
            type="button"
            onClick={() => setMore(!more)}
            aria-expanded={more}
            className={`flex items-center gap-1 self-start text-xs ${s.muted} ${s.hoverText}`}
          >
            <Icon name={more ? 'up' : 'down'} className="h-3 w-3" />
            {t('Más colores')}
          </button>
          {more && (
            <div className="flex flex-col gap-2">
              {colorRow('textColor', t('Color del texto'), '#ffffff')}
              {colorRow('textBg', t('Color del recuadro del texto'), '#1e3a8a')}
            </div>
          )}
        </div>

        {conflicts.length > 0 && (
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            {t('Se solapa con')}: {conflicts.join(', ')}
          </p>
        )}
      </div>

      <div className={`flex shrink-0 flex-wrap items-center gap-2 border-t px-4 py-3 max-xl:pb-5 ${s.line}`}>
        <button type="submit" className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-colors ${s.primary}`}>
          {draft.id ? t('Guardar') : t('Añadir')}
        </button>
        <button type="button" onClick={() => setDraft(null)} className={s.ghost}>
          {t('Cancelar')}
        </button>
        <span className="flex-1" />
        {onDuplicate && (
          <button type="button" onClick={onDuplicate} aria-label={t('Duplicar')} title={t('Duplicar')} className={`${s.muted} ${s.hoverText}`}>
            <Icon name="copy" className="h-4 w-4" />
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={onDelete} aria-label={t('Eliminar')} title={t('Eliminar')} className={`${s.muted} transition-colors hover:text-red-500`}>
            <Icon name="trash" className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  )
}
