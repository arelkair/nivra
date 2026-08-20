import { useEffect, useRef, useState } from 'react'
import { exportCsv, exportCalendarIcs, exportTimetableIcs, exportJson, importJson } from '../lib/backup'
import { askNotificationPermission, notificationPermission, notificationsSupported } from '../lib/notify'
import type { Settings } from '../lib/settings'
import { SHORTCUTS, keyOf } from '../lib/shortcuts'
import { ACCENTS, reorder, type Anniversary, type Block, type CalItem } from '../lib/store'
import type { SyncState } from '../lib/sync'
import { SyncPanel } from './Sync'
import { Collapsible, Icon, Modal, Switch, button, ghost, input, line } from './ui'

type Props = {
  cfg: Settings
  sync: SyncState | null
  setSync: (e: SyncState | null) => void
  installPrompt: Event | null
  onInstalled: () => void
  onClose: () => void
  onNotify: (text: string) => void
  items: CalItem[]
  anniversaries: Anniversary[]
  blocks: Block[]
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const SUBJECT_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#38bdf8', '#a855f7', '#ec4899']

export function Settings({
  cfg,
  sync,
  setSync,
  installPrompt,
  onInstalled,
  onClose,
  onNotify,
  items,
  anniversaries,
  blocks,
}: Props) {
  const [openSection, setOpenSection] = useState<string | null>(null)
  const alterna = (id: string) => setOpenSection((prev) => (prev === id ? null : id))

  return (
    <Modal title="Ajustes" onClose={onClose}>
      <div className="flex flex-col gap-2">
        <Collapsible title="General" open={openSection === 'general'} animar={cfg.animations} onToggle={() => alterna('general')}>
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
            <Switch
              checked={cfg.autoTheme}
              onChange={cfg.setAutoTheme}
              label="Tema según la hora"
              hint="Claro de 7:00 a 20:00 y oscuro el resto. Si lo cambias a mano, aguanta hasta el siguiente tramo."
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
          </div>
        </Collapsible>

        <Collapsible
          title="Aplicación"
          open={openSection === 'app'}
          animar={cfg.animations}
          onToggle={() => alterna('app')}
        >
          <InstallPanel installPrompt={installPrompt} onInstalled={onInstalled} onNotify={onNotify} />
        </Collapsible>

        <Collapsible title="Color" open={openSection === 'color'} animar={cfg.animations} onToggle={() => alterna('color')}>
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
          open={openSection === 'asignaturas'}
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
                  color: SUBJECT_COLORS[prev.length % SUBJECT_COLORS.length],
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
                    onClick={() => cfg.setSubjects((prev) => reorder(prev, i, -1))}
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
          open={openSection === 'notificaciones'}
          animar={cfg.animations} onToggle={() => alterna('notificaciones')}
        >
          <NotificationsPanel cfg={cfg} onNotify={onNotify} />
        </Collapsible>

        <Collapsible
          title="Atajos de teclado"
          open={openSection === 'atajos'}
          animar={cfg.animations} onToggle={() => alterna('atajos')}
        >
          <Switch
            checked={cfg.shortcutsOn}
            onChange={cfg.setShortcutsOn}
            label="Atajos activados"
            hint="No se disparan mientras escribes en un campo."
          />
          <ShortcutKeys cfg={cfg} onNotify={onNotify} />
        </Collapsible>

        <Collapsible
          title="Sincronización"
          open={openSection === 'sync'}
          animar={cfg.animations} onToggle={() => alterna('sync')}
        >
          <SyncPanel status={sync} setStatus={setSync} />
        </Collapsible>

        <Collapsible
          title="Exportar o importar datos"
          open={openSection === 'copia'}
          animar={cfg.animations} onToggle={() => alterna('copia')}
        >
          <BackupPanel onNotify={onNotify} items={items} anniversaries={anniversaries} blocks={blocks} />
        </Collapsible>

        <Collapsible
          title="Cumpleaños"
          open={openSection === 'cumple'}
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
            Ese día, all los años, cae confeti.
          </p>
        </Collapsible>
      </div>
    </Modal>
  )
}

function NotificationsPanel({ cfg, onNotify }: { cfg: Settings; onNotify: (t: string) => void }) {
  const [status, setStatus] = useState(notificationPermission())

  if (!notificationsSupported()) {
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

      {status === 'granted' ? (
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
            disabled={status === 'denied'}
            onClick={async () => {
              const r = await askNotificationPermission()
              setStatus(r)
              if (r === 'granted') {
                cfg.setNotifs(true)
                onNotify('Notificaciones activadas.')
              } else {
                onNotify('El navegador ha bloqueado las notificaciones.')
              }
            }}
            className={`${button} w-full`}
          >
            {status === 'denied' ? 'Bloqueadas por el navegador' : 'Permitir notificaciones'}
          </button>
          <p className="mt-2 text-[0.7rem] text-neutral-400 dark:text-neutral-500">
            {status === 'denied'
              ? 'Tendrás que volver a permitirlas desde los ajustes del navegador.'
              : 'El navegador te preguntará si quieres permitirlas.'}
          </p>
        </div>
      )}
    </div>
  )
}

function BackupPanel({
  onNotify,
  items,
  anniversaries,
  blocks,
}: {
  onNotify: (t: string) => void
  items: CalItem[]
  anniversaries: Anniversary[]
  blocks: Block[]
}) {
  const fileInput = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.7rem] font-medium tracking-[0.14em] text-neutral-400 uppercase dark:text-neutral-500">
        Copia de seguridad
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={exportJson} className={`${ghost} flex-1`}>
          <span className="flex items-center justify-center gap-2">
            <Icon name="download" className="h-4 w-4" />
            JSON
          </span>
        </button>
        <button type="button" onClick={exportCsv} className={`${ghost} flex-1`}>
          <span className="flex items-center justify-center gap-2">
            <Icon name="download" className="h-4 w-4" />
            CSV
          </span>
        </button>
      </div>

      <button type="button" onClick={() => fileInput.current?.click()} className={button}>
        <span className="flex items-center justify-center gap-2">
          <Icon name="upload" className="h-4 w-4" />
          Importar copia
        </span>
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          try {
            const n = await importJson(f)
            onNotify(`Copia importada: ${n} apartados. Recargando…`)
            setTimeout(() => location.reload(), 900)
          } catch (err) {
            onNotify(`No se pudo importar: ${(err as Error).message}`)
          }
        }}
      />
      <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
        El CSV es para abrirlo outside; para volver a entrar usa element JSON. Importar reemplaza lo que
        haya.
      </p>

      <p className="mt-3 text-[0.7rem] font-medium tracking-[0.14em] text-neutral-400 uppercase dark:text-neutral-500">
        Exportar a Google/Apple Calendar
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => exportCalendarIcs(items, anniversaries)}
          className={`${ghost} flex-1`}
        >
          <span className="flex items-center justify-center gap-2">
            <Icon name="download" className="h-4 w-4" />
            Calendario (.ics)
          </span>
        </button>
        <button
          type="button"
          onClick={() => exportTimetableIcs(blocks)}
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

function InstallPanel({
  installPrompt,
  onInstalled,
  onNotify,
}: {
  installPrompt: Event | null
  onInstalled: () => void
  onNotify: (t: string) => void
}) {
  const alreadyInstalled = matchMedia('(display-mode: standalone)').matches
  const isApple = /iphone|ipad|ipod/i.test(navigator.userAgent)

  if (alreadyInstalled) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Ya la estás usando instalada.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {installPrompt ? (
        <button
          type="button"
          onClick={async () => {
            const evento = installPrompt as InstallEvent
            await evento.prompt()
            const { outcome } = await evento.userChoice
            onInstalled()
            onNotify(outcome === 'accepted' ? 'Nivra se está instalando.' : 'Instalación cancelada.')
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
          {isApple
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


function ShortcutKeys({ cfg, onNotify }: { cfg: Settings; onNotify: (t: string) => void }) {
  const [capturing, setCapturing] = useState<string | null>(null)

  useEffect(() => {
    if (!capturing) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return
      if (e.key === 'Escape') {
        setCapturing(null)
        return
      }
      const key = keyOf(e)
      const taken = SHORTCUTS.find(
        (a) => a.id !== capturing && (cfg.customKeys[a.id] ?? a.key) === key,
      )
      if (taken) {
        onNotify(`Esa tecla ya la usa «${taken.label}».`)
        setCapturing(null)
        return
      }
      cfg.setCustomKeys((prev) => ({ ...prev, [capturing]: key }))
      setCapturing(null)
    }
    addEventListener('keydown', onKey, true)
    return () => removeEventListener('keydown', onKey, true)
  }, [capturing, cfg, onNotify])

  return (
    <ul className="mt-3 flex flex-col">
      {SHORTCUTS.map((a) => {
        const key = cfg.customKeys[a.id] ?? a.key
        const changed = key !== a.key
        return (
          <li key={a.id} className={`flex items-center gap-2 border-b py-2 last:border-0 ${line}`}>
            <span className="min-w-0 flex-1 truncate text-sm">{a.label}</span>

            <button
              type="button"
              disabled={!cfg.shortcutsOn}
              onClick={() => setCapturing(capturing === a.id ? null : a.id)}
              title="Pulsa para cambiar la tecla"
              className={`shrink-0 rounded-md border px-2 py-1 font-mono text-[0.65rem] transition-colors disabled:opacity-40 ${
                capturing === a.id
                  ? 'border-neutral-900 dark:border-white'
                  : 'border-black/10 bg-[var(--sunken)] hover:border-neutral-400 dark:border-white/15'
              }`}
            >
              {capturing === a.id ? 'pulsa una tecla…' : key}
            </button>

            {changed && (
              <button
                type="button"
                onClick={() =>
                  cfg.setCustomKeys((prev) => {
                    const copy = { ...prev }
                    delete copy[a.id]
                    return copy
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
              checked={cfg.enabledShortcuts[a.id] !== false}
              disabled={!cfg.shortcutsOn}
              onChange={(e) => cfg.setEnabledShortcuts((prev) => ({ ...prev, [a.id]: e.target.checked }))}
              aria-label={`Activar ${a.label}`}
              className="h-4 w-4 shrink-0 accent-neutral-900 dark:accent-white"
            />
          </li>
        )
      })}
    </ul>
  )
}
