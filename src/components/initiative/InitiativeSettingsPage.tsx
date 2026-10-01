import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { deleteSnapshot, listSnapshots, restoreSnapshot, snapshotNow, type Snapshot } from '../../lib/autoBackup'
import { clearAllData, exportCalendarIcs, exportCsv, exportJson, exportTimetableIcs, importJson } from '../../lib/backup'
import { LANGS, getLang, setLang, t, tp } from '../../lib/i18n'
import { askNotificationPermission, notificationPermission, notificationsSupported } from '../../lib/notify'
import type { Settings } from '../../lib/settings'
import { SUBJECT_COLORS, hasSubject, reorder, subjectId, type Anniversary, type Block, type CalItem, type Subject } from '../../lib/store'
import { notify } from '../../lib/undo'
import { Icon } from '../ui'
import { SyncPanel } from '../Sync'
import type { SyncUi } from '../syncUi'
import type { SyncState } from '../../lib/sync'
import { clearReturnToSync, shouldReturnToSync } from '../../lib/supabase'
import { ShortcutsEditor } from './ShortcutsPanel'
import { skin, type Skin } from './skin'

type Props = {
  cfg: Settings
  dark: boolean
  onTheme: (mode: 'light' | 'dark') => void
  detected: Subject[]
  items: CalItem[]
  blocks: Block[]
  anniversaries: Anniversary[]
  sync: SyncState | null
  setSync: (e: SyncState | null) => void
  onDisable: () => void
}

type Group = 'general' | 'apariencia' | 'avisos' | 'atajos' | 'asignaturas' | 'sincronizacion' | 'datos' | 'acerca'

const GROUPS: { id: Group; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'apariencia', label: 'Apariencia y sonido' },
  { id: 'avisos', label: 'Avisos' },
  { id: 'atajos', label: 'Atajos de teclado' },
  { id: 'asignaturas', label: 'Asignaturas' },
  { id: 'sincronizacion', label: 'Sincronización' },
  { id: 'datos', label: 'Datos y copias' },
  { id: 'acerca', label: 'Acerca de Initiative' },
]

function Row({ s, label, hint, children }: { s: Skin; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b py-3.5 last:border-0 ${s.line}`}>
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-sm">{label}</p>
        {hint && <p className={`text-xs leading-relaxed ${s.faint}`}>{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}

function Toggle({ s, on, onChange, label }: { s: Skin; on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-10 shrink-0 rounded-full border transition-colors ${on ? (s.dark ? 'border-white bg-white' : 'border-neutral-900 bg-neutral-900') : `${s.line} ${s.dark ? 'bg-white/[0.06]' : 'bg-black/[0.05]'}`}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-[1.15rem] w-[1.15rem] rounded-full transition-transform ${on ? 'translate-x-4' : ''} ${
          on ? (s.dark ? 'bg-neutral-900' : 'bg-white') : s.dark ? 'bg-neutral-400' : 'bg-neutral-500'
        }`}
      />
    </button>
  )
}

function Segmented<T extends string | number>({ s, value, options, onChange, label }: { s: Skin; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className={`flex overflow-hidden rounded-lg border text-xs ${s.line}`}>
      {options.map((o) => (
        <button key={String(o.id)} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)} className={`px-3 py-1.5 transition-colors ${value === o.id ? s.active : `${s.muted} ${s.hover}`}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

const storageKilobytes = () => {
  let chars = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('nivra-')) chars += key.length + (localStorage.getItem(key)?.length ?? 0)
  }
  return Math.round((chars * 2) / 1024)
}

export function InitiativeSettingsPage({ cfg, dark, onTheme, detected, items, blocks, anniversaries, sync, setSync, onDisable }: Props) {
  const s = skin(dark)
  const [group, setGroup] = useState<Group>(() => (shouldReturnToSync() ? 'sincronizacion' : 'general'))
  useEffect(clearReturnToSync, [])
  const syncUi = useMemo<SyncUi>(() => {
    const k = skin(dark)
    return {
      button: `rounded-lg px-4 py-2 text-sm transition-colors ${k.primary}`,
      ghost: k.ghost,
      input: k.field,
      line: k.line,
      faint: k.faint,
      muted: k.muted,
      hoverText: k.hoverText,
      Switch: ({ checked, onChange, label, hint }) => (
        <Row s={k} label={label} hint={hint}>
          <Toggle s={k} on={checked} onChange={onChange} label={label} />
        </Row>
      ),
    }
  }, [dark])
  const [newSubject, setNewSubject] = useState('')
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [permission, setPermission] = useState(notificationPermission())
  const file = useRef<HTMLInputElement>(null)

  const refresh = useCallback(() => {
    listSnapshots().then(setSnapshots, () => setSnapshots([]))
  }, [])
  useEffect(refresh, [refresh])

  const themeChoice = cfg.autoTheme ? 'auto' : dark ? 'dark' : 'light'

  const addSubject = () => {
    const name = newSubject.trim()
    if (!name) return
    cfg.setSubjects((prev) => (hasSubject(prev, name) ? prev : [...prev, { id: subjectId(name), name, color: SUBJECT_COLORS[prev.length % SUBJECT_COLORS.length] }]))
    setNewSubject('')
  }

  const panel = `rounded-2xl border px-5 ${s.line} ${s.panel}`

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <h1 className="font-initiative text-3xl font-medium tracking-tight sm:text-4xl">{t('Ajustes')}</h1>

      <div className="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)]">
        <div role="tablist" aria-orientation="vertical" className="nivra-scroll flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={group === g.id}
              onClick={() => setGroup(g.id)}
              className={`shrink-0 rounded-xl px-3 py-2 text-left text-sm whitespace-nowrap transition-colors ${group === g.id ? s.active : `${s.muted} ${s.hover} ${s.hoverText}`}`}
            >
              {t(g.label)}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {group === 'general' && (
            <section className={panel}>
              <Row s={s} label={t('Tu nombre')} hint={t('Se usa en el saludo del Inicio.')}>
                <input value={cfg.userName} onChange={(e) => cfg.setUserName(e.target.value)} maxLength={30} aria-label={t('Tu nombre')} className={`${s.field} !w-48`} />
              </Row>
              <Row s={s} label={t('Idioma')}>
                <Segmented s={s} value={getLang()} options={LANGS.map((l) => ({ id: l.id, label: l.label }))} onChange={(v) => v !== getLang() && setLang(v)} label={t('Idioma')} />
              </Row>
              <Row s={s} label={t('Reloj de 12 horas')} hint={t('Muestra la hora con a. m. y p. m.')}>
                <Toggle s={s} on={cfg.hour12} onChange={cfg.setHour12} label={t('Reloj de 12 horas')} />
              </Row>
              <Row s={s} label={t('Tu cumpleaños')} hint={t('Para felicitarte ese día.')}>
                <input type="date" value={cfg.birthday} onChange={(e) => cfg.setBirthday(e.target.value)} aria-label={t('Tu cumpleaños')} className={`${s.field} !w-44`} />
              </Row>
              <Row s={s} label={t('Dinero')} hint={t('Muestra u oculta el módulo de banco.')}>
                <Toggle s={s} on={cfg.bankEnabled} onChange={cfg.setBankEnabled} label={t('Dinero')} />
              </Row>
            </section>
          )}

          {group === 'apariencia' && (
            <section className={panel}>
              <Row s={s} label={t('Tema')} hint={t('«Automático» sigue el día y la noche.')}>
                <Segmented
                  s={s}
                  value={themeChoice}
                  options={[
                    { id: 'light', label: t('Claro') },
                    { id: 'dark', label: t('Oscuro') },
                    { id: 'auto', label: t('Automático') },
                  ]}
                  onChange={(v) => {
                    if (v === 'auto') cfg.setAutoTheme(true)
                    else {
                      cfg.setAutoTheme(false)
                      onTheme(v)
                    }
                  }}
                  label={t('Tema')}
                />
              </Row>
              <Row s={s} label={t('Animaciones')} hint={t('Transiciones suaves al abrir y cerrar cosas.')}>
                <Toggle s={s} on={cfg.animations} onChange={cfg.setAnimations} label={t('Animaciones')} />
              </Row>
              <Row s={s} label={t('Animación de inicio')} hint={t('La animación que aparece al abrir Nivra.')}>
                <Toggle s={s} on={cfg.intro} onChange={cfg.setIntro} label={t('Animación de inicio')} />
              </Row>
              <Row s={s} label={t('Sonidos de la interfaz')} hint={t('Un pequeño clic al completar o borrar.')}>
                <Toggle s={s} on={cfg.uiSounds} onChange={cfg.setUiSounds} label={t('Sonidos de la interfaz')} />
              </Row>
              {cfg.uiSounds && (
                <Row s={s} label={t('Volumen')}>
                  <input type="range" min={0} max={100} value={cfg.uiVolume} onChange={(e) => cfg.setUiVolume(Number(e.target.value))} aria-label={t('Volumen')} className="w-40 accent-neutral-500" />
                  <span className={`w-9 text-right font-mono text-xs ${s.muted}`}>{cfg.uiVolume}</span>
                </Row>
              )}
            </section>
          )}

          {group === 'avisos' && (
            <section className={panel}>
              <Row s={s} label={t('Avisos dentro de la web')} hint={t('Aparecen abajo a la derecha, con opción de deshacer.')}>
                <Toggle s={s} on={cfg.toasts} onChange={cfg.setToasts} label={t('Avisos dentro de la web')} />
              </Row>
              {notificationsSupported() ? (
                permission === 'granted' ? (
                  <Row s={s} label={t('Notificaciones del sistema')} hint={t('Cuentas atrás que acaban, aniversarios, actividades de hoy y exámenes de mañana.')}>
                    <Toggle s={s} on={cfg.notifs} onChange={cfg.setNotifs} label={t('Notificaciones del sistema')} />
                  </Row>
                ) : (
                  <Row
                    s={s}
                    label={t('Notificaciones del sistema')}
                    hint={permission === 'denied' ? t('Tendrás que volver a permitirlas desde los ajustes del navegador.') : t('El navegador te preguntará si quieres permitirlas.')}
                  >
                    <button
                      type="button"
                      disabled={permission === 'denied'}
                      onClick={async () => {
                        const r = await askNotificationPermission()
                        setPermission(r)
                        if (r === 'granted') {
                          cfg.setNotifs(true)
                          notify(t('Notificaciones activadas.'))
                        } else notify(t('El navegador ha bloqueado las notificaciones.'))
                      }}
                      className={`${s.ghost} disabled:opacity-40`}
                    >
                      {permission === 'denied' ? t('Bloqueadas por el navegador') : t('Permitir notificaciones')}
                    </button>
                  </Row>
                )
              ) : (
                <Row s={s} label={t('Notificaciones del sistema')} hint={t('Este navegador no admite notificaciones.')}>
                  <span />
                </Row>
              )}
            </section>
          )}

          {group === 'atajos' && (
            <section className={panel}>
              <Row s={s} label={t('Atajos de teclado')} hint={t('Ctrl+K busca en todo; «?» muestra la lista. Pulsa una tecla para cambiarla.')}>
                <Toggle s={s} on={cfg.shortcutsOn} onChange={cfg.setShortcutsOn} label={t('Atajos de teclado')} />
              </Row>
              <ShortcutsEditor cfg={cfg} dark={dark} />
            </section>
          )}

          {group === 'asignaturas' && (
            <section className={panel}>
              <form
                onSubmit={(ev) => {
                  ev.preventDefault()
                  addSubject()
                }}
                className={`flex gap-2 border-b py-3.5 ${s.line}`}
              >
                <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} maxLength={40} placeholder={t('Nueva asignatura')} aria-label={t('Nueva asignatura')} className={s.field} />
                <button type="submit" aria-label={t('Añadir asignatura')} className={`shrink-0 rounded-lg px-3 ${s.primary}`}>
                  <Icon name="plus" className="h-4 w-4" />
                </button>
              </form>
              {cfg.subjects.length === 0 && <p className={`py-3.5 text-sm ${s.faint}`}>{t('Sin asignaturas.')}</p>}
              <ul>
                {cfg.subjects.map((sub, i) => (
                  <li key={sub.id} className={`flex items-center gap-3 border-b py-2.5 last:border-0 ${s.line}`}>
                    <input
                      type="color"
                      value={sub.color}
                      onChange={(e) => cfg.setSubjects((prev) => prev.map((x) => (x.id === sub.id ? { ...x, color: e.target.value } : x)))}
                      aria-label={`Color de ${sub.name}`}
                      className="h-6 w-6 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{sub.name}</span>
                    <button type="button" onClick={() => cfg.setSubjects((prev) => reorder(prev, i, -1))} aria-label={`Subir ${sub.name}`} className={`shrink-0 ${s.muted} ${s.hoverText}`}>
                      <Icon name="up" className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => cfg.setSubjects((prev) => prev.filter((x) => x.id !== sub.id))} aria-label={`Eliminar ${sub.name}`} className={`shrink-0 ${s.muted} transition-colors hover:text-red-500`}>
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              {detected.length > 0 && (
                <div className={`flex flex-col gap-2 border-t py-3.5 ${s.line}`}>
                  <span className={`text-xs ${s.muted}`}>{t('Detectadas en el horario')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {detected.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => cfg.setSubjects((prev) => (hasSubject(prev, sub.name) ? prev : [...prev, sub]))}
                        title={t('Guardar en mis asignaturas')}
                        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition-colors ${s.line} ${s.muted} ${s.hover}`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: sub.color }} />
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {group === 'sincronizacion' && (
            <section className={`${panel} py-4`}>
              <SyncPanel status={sync} setStatus={setSync} ui={syncUi} showTitle={false} />
            </section>
          )}

          {group === 'datos' && (
            <>
              <section className={panel}>
                <Row s={s} label={t('Exportar todo')} hint={t('Descarga tus datos para guardarlos o abrirlos fuera.')}>
                  <button type="button" onClick={exportJson} className={s.ghost}>
                    JSON
                  </button>
                  <button type="button" onClick={exportCsv} className={s.ghost}>
                    CSV
                  </button>
                </Row>
                <Row s={s} label={t('Importar copia')} hint={t('Reemplaza lo que haya con el archivo JSON de una copia.')}>
                  <button type="button" onClick={() => file.current?.click()} className={s.ghost}>
                    {t('Elegir archivo')}
                  </button>
                  <input
                    ref={file}
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (!f) return
                      try {
                        await importJson(f)
                        location.reload()
                      } catch (err) {
                        notify((err as Error).message)
                      }
                    }}
                  />
                </Row>
                <Row s={s} label={t('Calendario (.ics)')} hint={t('Ábrelo con «Importar calendario» en Google Calendar o Apple Calendar.')}>
                  <button type="button" onClick={() => exportCalendarIcs(items, anniversaries)} className={s.ghost}>
                    {t('Calendario')}
                  </button>
                  <button type="button" onClick={() => exportTimetableIcs(blocks)} className={s.ghost}>
                    {t('Horario')}
                  </button>
                </Row>
              </section>

              <section className={panel}>
                <Row s={s} label={t('Copias automáticas')} hint={t('Cada día se guarda una copia automática en este navegador (se conservan las últimas 14).')}>
                  <button type="button" onClick={() => snapshotNow(true).then(refresh, () => notify(t('No se pudo guardar la copia.')))} className={s.ghost}>
                    {t('Guardar copia ahora')}
                  </button>
                </Row>
                {snapshots.length === 0 && <p className={`py-3.5 text-sm ${s.faint}`}>{t('Aún no hay copias.')}</p>}
                <ul>
                  {snapshots.map((snap) => (
                    <li key={snap.date} className={`flex items-center gap-3 border-b py-2.5 text-sm last:border-0 ${s.line}`}>
                      <span className="flex-1 font-mono text-xs">{snap.date}</span>
                      <span className={`text-[0.7rem] ${s.faint}`}>
                        {Object.keys(snap.data).length} {t('apartados')}
                      </span>
                      {confirmRestore === snap.date ? (
                        <button type="button" onClick={() => restoreSnapshot(snap.date).then(() => location.reload(), (err: Error) => notify(err.message))} className="text-xs text-red-500">
                          {t('Confirmar')}
                        </button>
                      ) : (
                        <button type="button" onClick={() => setConfirmRestore(snap.date)} className={`text-xs ${s.muted} ${s.hoverText}`}>
                          {t('Restaurar')}
                        </button>
                      )}
                      <button type="button" aria-label={t('Eliminar')} onClick={() => deleteSnapshot(snap.date).then(refresh)} className={`${s.muted} transition-colors hover:text-red-500`}>
                        <Icon name="trash" className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={`${panel} border-red-500/30`}>
                <Row s={s} label={t('Espacio usado')} hint={t('Tus datos viven solo en este navegador.')}>
                  <span className="font-mono text-sm">{storageKilobytes()} KB</span>
                </Row>
                <Row s={s} label={t('Borrar todos mis datos')} hint={t('Elimina todo lo de este dispositivo. Descarga antes una copia.')}>
                  {confirmWipe ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          clearAllData()
                          location.reload()
                        }}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        {t('Sí, borrar todo')}
                      </button>
                      <button type="button" onClick={() => setConfirmWipe(false)} className={s.ghost}>
                        {t('Cancelar')}
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setConfirmWipe(true)} className={`${s.ghost} !text-red-500`}>
                      {t('Borrar todo')}
                    </button>
                  )}
                </Row>
              </section>
            </>
          )}

          {group === 'acerca' && (
            <section className={panel}>
              <Row s={s} label={t('Initiative (beta)')} hint={t('Una interfaz alternativa de Nivra. Comparte los mismos datos que Classic.')}>
                <span />
              </Row>
              <Row s={s} label={t('Privacidad')} hint={t('Nada sale de tu navegador salvo que actives la sincronización en Ajustes.')}>
                <span />
              </Row>
              <Row s={s} label={t('Volver a Nivra Classic')} hint={t('Desactiva Initiative. Tus datos se conservan.')}>
                <button type="button" onClick={onDisable} className={s.ghost}>
                  {tp('Desactivar {0}', 'Initiative')}
                </button>
              </Row>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
