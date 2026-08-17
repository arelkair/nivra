import { useEffect, useRef, useState } from 'react'
import { exportarCsv, exportarIcsCalendario, exportarIcsHorario, exportarJson, importarJson } from '../lib/backup'
import { pedirPermiso, permiso, soportadas } from '../lib/notify'
import type { Settings } from '../lib/settings'
import { ATAJOS, teclaDe } from '../lib/shortcuts'
import { ACCENTS, mover, type Anniversary, type Block, type CalItem } from '../lib/store'
import type { EstadoSync } from '../lib/sync'
import { SyncPanel } from './Sync'
import { Collapsible, Icon, Modal, Switch, button, ghost, input, line } from './ui'

type Props = {
  cfg: Settings
  sync: EstadoSync | null
  setSync: (e: EstadoSync | null) => void
  instalador: Event | null
  onInstalado: () => void
  onClose: () => void
  onAviso: (texto: string) => void
  items: CalItem[]
  anniversaries: Anniversary[]
  blocks: Block[]
}

type Instalable = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const COLORES_ASIG = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#38bdf8', '#a855f7', '#ec4899']

export function Settings({
  cfg,
  sync,
  setSync,
  instalador,
  onInstalado,
  onClose,
  onAviso,
  items,
  anniversaries,
  blocks,
}: Props) {
  const [abierta, setAbierta] = useState<string | null>(null)
  const alterna = (id: string) => setAbierta((prev) => (prev === id ? null : id))

  return (
    <Modal title="Ajustes" onClose={onClose}>
      <div className="flex flex-col gap-2">
        <Collapsible title="General" abierto={abierta === 'general'} animar={cfg.animations} onToggle={() => alterna('general')}>
          <div className="flex flex-col gap-1">
            <Switch
              checked={cfg.intro}
              onChange={cfg.setIntro}
              label="Animación de inicio"
              hint="La presentación de Nivra al abrir o recargar la web."
            />
            <Switch
              checked={cfg.animations}
              onChange={cfg.setAnimations}
              label="Animaciones al cambiar de apartado"
            />
            <Switch checked={cfg.clockOn} onChange={cfg.setClockOn} label="Reloj" />
            {cfg.clockOn && (
              <Switch checked={cfg.hour12} onChange={cfg.setHour12} label="Formato de 12 horas" />
            )}
            <Switch
              checked={cfg.searchOn}
              onChange={cfg.setSearchOn}
              label="Buscador"
              hint="Aparece en la cabecera y busca en todos los apartados."
            />
            <Switch
              checked={cfg.navButtons}
              onChange={cfg.setNavButtons}
              label="Botones de atrás y adelante"
            />
            <Switch
              checked={cfg.hideCountdowns}
              onChange={cfg.setHideCountdowns}
              label="Ocultar cuentas atrás"
              hint="Las quita del menú y del dashboard."
            />
          </div>
        </Collapsible>

        <Collapsible
          title="Aplicación"
          abierto={abierta === 'app'}
          animar={cfg.animations}
          onToggle={() => alterna('app')}
        >
          <Instalar instalador={instalador} onInstalado={onInstalado} onAviso={onAviso} />
        </Collapsible>

        <Collapsible title="Color" abierto={abierta === 'color'} animar={cfg.animations} onToggle={() => alterna('color')}>
          <div className="grid grid-cols-5 gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => cfg.setAccent(a.id)}
                title={a.label}
                aria-label={a.label}
                aria-pressed={cfg.accent === a.id}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors ${
                  cfg.accent === a.id
                    ? 'border-neutral-900 dark:border-white'
                    : `${line} hover:border-neutral-400`
                }`}
              >
                <span className="h-5 w-5 rounded-full" style={{ background: a.swatch }} aria-hidden />
                <span className="w-full truncate text-center text-[0.55rem] text-neutral-500 dark:text-neutral-400">
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </Collapsible>

        <Collapsible
          title="Asignaturas"
          abierto={abierta === 'asignaturas'}
          animar={cfg.animations} onToggle={() => alterna('asignaturas')}
        >
          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              const form = ev.currentTarget
              const name = String(new FormData(form).get('name') ?? '').trim()
              if (!name) return
              cfg.setSubjects((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  name,
                  color: COLORES_ASIG[prev.length % COLORES_ASIG.length],
                },
              ])
              form.reset()
            }}
            className="mb-3 flex gap-2"
          >
            <input name="name" maxLength={40} required placeholder="Nueva asignatura" className={input} />
            <button type="submit" aria-label="Añadir asignatura" className={`${button} shrink-0 px-4`}>
              <Icon name="plus" className="h-4 w-4" />
            </button>
          </form>

          {cfg.subjects.length === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500">Sin asignaturas.</p>
          ) : (
            <ul className="flex flex-col">
              {cfg.subjects.map((s, i) => (
                <li key={s.id} className={`flex items-center gap-3 border-b py-2 last:border-0 ${line}`}>
                  <input
                    type="color"
                    value={s.color}
                    onChange={(e) =>
                      cfg.setSubjects((prev) =>
                        prev.map((x) => (x.id === s.id ? { ...x, color: e.target.value } : x)),
                      )
                    }
                    aria-label={`Color de ${s.name}`}
                    className="h-6 w-6 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
                  <button
                    type="button"
                    onClick={() => cfg.setSubjects((prev) => mover(prev, i, -1))}
                    aria-label={`Subir ${s.name}`}
                    className="shrink-0 text-neutral-300 hover:text-neutral-900 dark:text-neutral-600 dark:hover:text-white"
                  >
                    <Icon name="up" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => cfg.setSubjects((prev) => prev.filter((x) => x.id !== s.id))}
                    aria-label={`Eliminar ${s.name}`}
                    className="shrink-0 text-neutral-300 transition-colors hover:text-red-500 dark:text-neutral-600"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Collapsible>

        <Collapsible
          title="Notificaciones"
          abierto={abierta === 'notificaciones'}
          animar={cfg.animations} onToggle={() => alterna('notificaciones')}
        >
          <Notificaciones cfg={cfg} onAviso={onAviso} />
        </Collapsible>

        <Collapsible
          title="Atajos de teclado"
          abierto={abierta === 'atajos'}
          animar={cfg.animations} onToggle={() => alterna('atajos')}
        >
          <Switch
            checked={cfg.shortcutsOn}
            onChange={cfg.setShortcutsOn}
            label="Atajos activados"
            hint="No se disparan mientras escribes en un campo."
          />
          <Teclas cfg={cfg} onAviso={onAviso} />
        </Collapsible>

        <Collapsible
          title="Sincronización"
          abierto={abierta === 'sync'}
          animar={cfg.animations} onToggle={() => alterna('sync')}
        >
          <SyncPanel estado={sync} setEstado={setSync} />
        </Collapsible>

        <Collapsible
          title="Exportar o importar datos"
          abierto={abierta === 'copia'}
          animar={cfg.animations} onToggle={() => alterna('copia')}
        >
          <Copia onAviso={onAviso} items={items} anniversaries={anniversaries} blocks={blocks} />
        </Collapsible>

        <Collapsible
          title="Cumpleaños"
          abierto={abierta === 'cumple'}
          animar={cfg.animations} onToggle={() => alterna('cumple')}
        >
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={cfg.birthday}
              onChange={(e) => cfg.setBirthday(e.target.value)}
              aria-label="Fecha de cumpleaños"
              className={input}
            />
            {cfg.birthday && (
              <button
                type="button"
                onClick={() => cfg.setBirthday('')}
                className="shrink-0 text-xs text-neutral-400 transition-colors hover:text-red-500"
              >
                Quitar
              </button>
            )}
          </div>
          <p className="mt-2 text-[0.7rem] text-neutral-400 dark:text-neutral-500">
            Ese día, todos los años, cae confeti.
          </p>
        </Collapsible>
      </div>
    </Modal>
  )
}

function Notificaciones({ cfg, onAviso }: { cfg: Settings; onAviso: (t: string) => void }) {
  const [estado, setEstado] = useState(permiso())

  if (!soportadas()) {
    return (
      <p className="text-sm text-neutral-400 dark:text-neutral-500">
        Este navegador no admite notificaciones.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Switch
        checked={cfg.toasts}
        onChange={cfg.setToasts}
        label="Avisos dentro de la web"
        hint="Aparecen abajo a la derecha."
      />

      {estado === 'granted' ? (
        <Switch
          checked={cfg.notifs}
          onChange={cfg.setNotifs}
          label="Notificaciones del sistema"
          hint="Cuentas atrás que acaban, aniversarios, actividades de hoy y exámenes de mañana."
        />
      ) : (
        <div>
          <button
            type="button"
            disabled={estado === 'denied'}
            onClick={async () => {
              const r = await pedirPermiso()
              setEstado(r)
              if (r === 'granted') {
                cfg.setNotifs(true)
                onAviso('Notificaciones activadas.')
              } else {
                onAviso('El navegador ha bloqueado las notificaciones.')
              }
            }}
            className={`${button} w-full`}
          >
            {estado === 'denied' ? 'Bloqueadas por el navegador' : 'Permitir notificaciones'}
          </button>
          <p className="mt-2 text-[0.7rem] text-neutral-400 dark:text-neutral-500">
            {estado === 'denied'
              ? 'Tendrás que volver a permitirlas desde los ajustes del navegador.'
              : 'El navegador te preguntará si quieres permitirlas.'}
          </p>
        </div>
      )}
    </div>
  )
}

function Copia({
  onAviso,
  items,
  anniversaries,
  blocks,
}: {
  onAviso: (t: string) => void
  items: CalItem[]
  anniversaries: Anniversary[]
  blocks: Block[]
}) {
  const fichero = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.7rem] font-medium tracking-[0.14em] text-neutral-400 uppercase dark:text-neutral-500">
        Copia de seguridad
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={exportarJson} className={`${ghost} flex-1`}>
          <span className="flex items-center justify-center gap-2">
            <Icon name="download" className="h-4 w-4" />
            JSON
          </span>
        </button>
        <button type="button" onClick={exportarCsv} className={`${ghost} flex-1`}>
          <span className="flex items-center justify-center gap-2">
            <Icon name="download" className="h-4 w-4" />
            CSV
          </span>
        </button>
      </div>

      <button type="button" onClick={() => fichero.current?.click()} className={button}>
        <span className="flex items-center justify-center gap-2">
          <Icon name="upload" className="h-4 w-4" />
          Importar copia
        </span>
      </button>
      <input
        ref={fichero}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          try {
            const n = await importarJson(f)
            onAviso(`Copia importada: ${n} apartados. Recargando…`)
            setTimeout(() => location.reload(), 900)
          } catch (err) {
            onAviso(`No se pudo importar: ${(err as Error).message}`)
          }
        }}
      />
      <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
        El CSV es para abrirlo fuera; para volver a entrar usa el JSON. Importar reemplaza lo que
        haya.
      </p>

      <p className="mt-3 text-[0.7rem] font-medium tracking-[0.14em] text-neutral-400 uppercase dark:text-neutral-500">
        Exportar a Google/Apple Calendar
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => exportarIcsCalendario(items, anniversaries)}
          className={`${ghost} flex-1`}
        >
          <span className="flex items-center justify-center gap-2">
            <Icon name="download" className="h-4 w-4" />
            Calendario (.ics)
          </span>
        </button>
        <button
          type="button"
          onClick={() => exportarIcsHorario(blocks)}
          className={`${ghost} flex-1`}
        >
          <span className="flex items-center justify-center gap-2">
            <Icon name="download" className="h-4 w-4" />
            Horario (.ics)
          </span>
        </button>
      </div>
      <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
        Ábrelos con «Importar calendario» en Google Calendar o Apple Calendar.
      </p>
    </div>
  )
}

function Instalar({
  instalador,
  onInstalado,
  onAviso,
}: {
  instalador: Event | null
  onInstalado: () => void
  onAviso: (t: string) => void
}) {
  const yaInstalada = matchMedia('(display-mode: standalone)').matches
  const esApple = /iphone|ipad|ipod/i.test(navigator.userAgent)

  if (yaInstalada) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Ya la estás usando instalada.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {instalador ? (
        <button
          type="button"
          onClick={async () => {
            const evento = instalador as Instalable
            await evento.prompt()
            const { outcome } = await evento.userChoice
            onInstalado()
            onAviso(outcome === 'accepted' ? 'Nivra se está instalando.' : 'Instalación cancelada.')
          }}
          className={button}
        >
          <span className="flex items-center justify-center gap-2">
            <Icon name="download" className="h-4 w-4" />
            Instalar Nivra
          </span>
        </button>
      ) : (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {esApple
            ? 'En iPhone o iPad: pulsa Compartir y luego «Añadir a pantalla de inicio».'
            : 'Tu navegador aún no ofrece instalarla. Suele aparecer tras usar la web un rato, o desde su menú, en «Instalar aplicación».'}
        </p>
      )}
      <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
        Instalada se abre a pantalla completa, con su icono, y funciona sin conexión.
      </p>
    </div>
  )
}


function Teclas({ cfg, onAviso }: { cfg: Settings; onAviso: (t: string) => void }) {
  const [capturando, setCapturando] = useState<string | null>(null)

  useEffect(() => {
    if (!capturando) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return
      if (e.key === 'Escape') {
        setCapturando(null)
        return
      }
      const tecla = teclaDe(e)
      const ocupada = ATAJOS.find(
        (a) => a.id !== capturando && (cfg.teclas[a.id] ?? a.tecla) === tecla,
      )
      if (ocupada) {
        onAviso(`Esa tecla ya la usa «${ocupada.label}».`)
        setCapturando(null)
        return
      }
      cfg.setTeclas((prev) => ({ ...prev, [capturando]: tecla }))
      setCapturando(null)
    }
    addEventListener('keydown', onKey, true)
    return () => removeEventListener('keydown', onKey, true)
  }, [capturando, cfg, onAviso])

  return (
    <ul className="mt-3 flex flex-col">
      {ATAJOS.map((a) => {
        const tecla = cfg.teclas[a.id] ?? a.tecla
        const cambiada = tecla !== a.tecla
        return (
          <li key={a.id} className={`flex items-center gap-2 border-b py-2 last:border-0 ${line}`}>
            <span className="min-w-0 flex-1 truncate text-sm">{a.label}</span>

            <button
              type="button"
              disabled={!cfg.shortcutsOn}
              onClick={() => setCapturando(capturando === a.id ? null : a.id)}
              title="Pulsa para cambiar la tecla"
              className={`shrink-0 rounded-md border px-2 py-1 font-mono text-[0.65rem] transition-colors disabled:opacity-40 ${
                capturando === a.id
                  ? 'border-neutral-900 dark:border-white'
                  : 'border-black/10 bg-[var(--sunken)] hover:border-neutral-400 dark:border-white/15'
              }`}
            >
              {capturando === a.id ? 'pulsa una tecla…' : tecla}
            </button>

            {cambiada && (
              <button
                type="button"
                onClick={() =>
                  cfg.setTeclas((prev) => {
                    const copia = { ...prev }
                    delete copia[a.id]
                    return copia
                  })
                }
                aria-label={`Restaurar tecla de ${a.label}`}
                className="shrink-0 text-neutral-300 transition-colors hover:text-neutral-900 dark:text-neutral-600 dark:hover:text-white"
              >
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            )}

            <input
              type="checkbox"
              checked={cfg.atajos[a.id] !== false}
              disabled={!cfg.shortcutsOn}
              onChange={(e) => cfg.setAtajos((prev) => ({ ...prev, [a.id]: e.target.checked }))}
              aria-label={`Activar ${a.label}`}
              className="h-4 w-4 shrink-0 accent-neutral-900 dark:accent-white"
            />
          </li>
        )
      })}
    </ul>
  )
}
