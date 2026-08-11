import { dateKey, shortDate, type Grade } from '../lib/store'
import { Empty, Icon, Label, button, card, input, select } from '../components/ui'

type Props = {
  grades: Grade[]
  setGrades: (update: (prev: Grade[]) => Grade[]) => void
}

const KINDS: { id: Grade['kind']; label: string }[] = [
  { id: 'examen', label: 'Examen' },
  { id: 'trabajo', label: 'Trabajo' },
  { id: 'otro', label: 'Otro' },
]

const tono = (v: number) =>
  v >= 9
    ? 'text-green-600 dark:text-green-500'
    : v >= 5
      ? 'text-neutral-900 dark:text-white'
      : 'text-red-500'

export function Grades({ grades, setGrades }: Props) {
  const media = grades.length
    ? grades.reduce((s, g) => s + g.value, 0) / grades.length
    : null
  const ordenadas = [...grades].sort((a, b) => b.value - a.value)
  const mejores = ordenadas.slice(0, 3)
  const peores = ordenadas.slice(Math.max(3, ordenadas.length - 3)).reverse()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          const form = ev.currentTarget
          const data = new FormData(form)
          const value = Number(String(data.get('value') ?? '').replace(',', '.'))
          if (!Number.isFinite(value) || value < 1 || value > 10) return
          setGrades((prev) => [
            {
              id: crypto.randomUUID(),
              value: Math.round(value * 100) / 100,
              desc: String(data.get('desc') ?? '').trim() || undefined,
              kind: String(data.get('kind')) as Grade['kind'],
              date: dateKey(new Date()),
            },
            ...prev,
          ])
          form.reset()
        }}
        className={`${card} flex flex-col gap-2 p-4 sm:p-5`}
      >
        <Label>Nueva nota</Label>
        <div className="flex gap-2">
          <input
            name="value"
            type="number"
            step="0.01"
            min="1"
            max="10"
            required
            placeholder="Del 1 al 10"
            aria-label="Nota"
            className={`${input} font-mono`}
          />
          <select name="kind" defaultValue="examen" aria-label="Tipo" className={select}>
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <input name="desc" maxLength={80} placeholder="¿De qué?" className={input} />
        <button type="submit" className={button}>
          Añadir
        </button>
      </form>

      {media !== null && (
        <section className={`${card} animate-[fade-in_0.35s_ease-out] p-5 sm:p-6`}>
          <Label>Media · {grades.length} notas</Label>
          <p className={`font-mono text-4xl font-medium tabular-nums ${tono(media)}`}>
            {media.toFixed(2)}
          </p>
        </section>
      )}

      {grades.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Top title="Mejores" items={mejores} />
          {peores.length > 0 && <Top title="Peores" items={peores} />}
        </div>
      )}

      <section className={`${card} animate-[fade-in_0.35s_ease-out_0.05s_both] p-5 sm:p-6`}>
        <Label>Todas</Label>
        {grades.length === 0 ? (
          <Empty>Sin notas.</Empty>
        ) : (
          <ul className="flex flex-col">
            {grades.map((g) => (
              <li
                key={g.id}
                className="flex items-center gap-3 border-b border-black/[0.06] py-3 text-sm last:border-0 dark:border-white/[0.08]"
              >
                <span className={`w-12 shrink-0 font-mono font-medium tabular-nums ${tono(g.value)}`}>
                  {g.value}
                </span>
                <span className="min-w-0 flex-1 truncate">{g.desc || KINDS.find((k) => k.id === g.kind)?.label}</span>
                <span className="shrink-0 text-[0.7rem] text-neutral-400 dark:text-neutral-500">
                  {KINDS.find((k) => k.id === g.kind)?.label} · {shortDate(g.date)}
                </span>
                <button
                  type="button"
                  onClick={() => setGrades((prev) => prev.filter((x) => x.id !== g.id))}
                  aria-label={`Eliminar nota ${g.value}`}
                  className="shrink-0 text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Top({ title, items }: { title: string; items: Grade[] }) {
  return (
    <section className={`${card} p-5 sm:p-6`}>
      <Label>{title}</Label>
      <ul className="flex flex-col gap-2">
        {items.map((g) => (
          <li key={g.id} className="flex items-center gap-3 text-sm">
            <span className={`w-10 shrink-0 font-mono font-medium tabular-nums ${tono(g.value)}`}>
              {g.value}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {g.desc || KINDS.find((k) => k.id === g.kind)?.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
