import { useState } from 'react'
import {
  conGuiones,
  conectar,
  guardarEstado,
  leerEstado,
  normaliza,
  nuevoCodigo,
  subir,
  type EstadoSync,
} from '../lib/sync'
import { Icon, Label, button, input, line } from './ui'

export function SyncPanel({
  estado,
  setEstado,
}: {
  estado: EstadoSync | null
  setEstado: (e: EstadoSync | null) => void
}) {
  const [visible, setVisible] = useState(false)
  const [trabajando, setTrabajando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const crear = async () => {
    setTrabajando(true)
    setAviso(null)
    try {
      const nuevo = await subir({ code: normaliza(nuevoCodigo()), lastSeen: null })
      setEstado(nuevo)
      setVisible(true)
      setAviso('Listo. Copia el código y pégalo en el otro dispositivo.')
    } catch (e) {
      setAviso(`No se pudo activar: ${(e as Error).message}`)
    }
    setTrabajando(false)
  }

  const unir = async (codigo: string) => {
    setTrabajando(true)
    setAviso(null)
    try {
      const r = await conectar(codigo)
      setEstado(leerEstado())
      setAviso(
        r.creado
          ? 'Código nuevo: se han subido tus datos.'
          : r.cambio
            ? 'Conectado. Datos del otro dispositivo descargados.'
            : 'Conectado. Ya estabais igual.',
      )
    } catch (e) {
      setAviso(`No se pudo conectar: ${(e as Error).message}`)
    }
    setTrabajando(false)
  }

  return (
    <div>
      <Label>Sincronización</Label>

      {estado ? (
        <div className="flex flex-col gap-2">
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${line}`}>
            <span className="min-w-0 flex-1 truncate font-mono text-sm tracking-wider">
              {visible ? conGuiones(estado.code) : '••••-••••-••••-••••'}
            </span>
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              className="shrink-0 text-xs text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
            >
              {visible ? 'Ocultar' : 'Ver'}
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(conGuiones(estado.code))
                setAviso('Código copiado.')
              }}
              aria-label="Copiar código"
              className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-white"
            >
              <Icon name="link" className="h-4 w-4" />
            </button>
          </div>

          <p className="text-[0.7rem] text-neutral-400 dark:text-neutral-500">
            {estado.error
              ? `Último intento fallido: ${estado.error}`
              : estado.lastSeen
                ? `Al día · ${new Date(estado.lastSeen).toLocaleTimeString('es-ES')} · se comprueba cada 4 s`
                : 'Sin sincronizar todavía.'}
          </p>

          <button
            type="button"
            onClick={() => {
              guardarEstado(null)
              setEstado(null)
              setAviso('Este dispositivo ya no se sincroniza. Tus datos siguen aquí.')
            }}
            className="w-fit text-xs text-neutral-400 transition-colors hover:text-red-500"
          >
            Desconectar este dispositivo
          </button>
        </div>
      ) : (
        <button type="button" onClick={crear} disabled={trabajando} className={`${button} w-full`}>
          {trabajando ? 'Activando…' : 'Crear mi código'}
        </button>
      )}

      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          const form = ev.currentTarget
          const codigo = String(new FormData(form).get('codigo') ?? '')
          if (normaliza(codigo).length !== 16) {
            setAviso('El código tiene 16 caracteres.')
            return
          }
          unir(codigo)
          form.reset()
        }}
        className="mt-3 flex gap-2"
      >
        <input
          name="codigo"
          placeholder="Código de otro dispositivo"
          aria-label="Código de otro dispositivo"
          className={`${input} font-mono tracking-wider`}
        />
        <button type="submit" disabled={trabajando} className={`${button} shrink-0`}>
          Unir
        </button>
      </form>

      {aviso && <p className="mt-2 text-[0.7rem] text-neutral-500 dark:text-neutral-400">{aviso}</p>}

      <p className="mt-2 text-[0.7rem] text-neutral-400 dark:text-neutral-500">
        Los datos se cifran en tu navegador con el código antes de salir. El servidor guarda algo que
        no puede leer, y sin el código no hay forma de recuperarlo.
      </p>
    </div>
  )
}
