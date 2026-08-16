const INTERNAS = ['nivra-sync', 'nivra-sync-times', 'nivra-notified']

function datos() {
  const out: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('nivra-') && !INTERNAS.includes(k)) out[k] = localStorage.getItem(k) ?? ''
  }
  return out
}

const hoy = () => new Date().toISOString().slice(0, 10)

function descargar(nombre: string, texto: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

export function exportarJson() {
  descargar(`nivra-${hoy()}.json`, JSON.stringify(datos(), null, 2), 'application/json')
}

const escapa = (v: string) => `"${v.replace(/"/g, '""')}"`

/** Una fila por elemento de cada lista, con sus campos aplanados. */
export function exportarCsv() {
  const filas: string[] = ['seccion,campo,valor']
  for (const [clave, crudo] of Object.entries(datos())) {
    const seccion = clave.replace('nivra-', '')
    let valor: unknown
    try {
      valor = JSON.parse(crudo)
    } catch {
      valor = crudo
    }
    if (Array.isArray(valor)) {
      valor.forEach((item, i) => {
        if (item && typeof item === 'object') {
          for (const [campo, v] of Object.entries(item as Record<string, unknown>)) {
            filas.push([escapa(seccion), escapa(`${i}.${campo}`), escapa(String(v ?? ''))].join(','))
          }
        } else {
          filas.push([escapa(seccion), escapa(String(i)), escapa(String(item))].join(','))
        }
      })
    } else if (valor && typeof valor === 'object') {
      for (const [campo, v] of Object.entries(valor as Record<string, unknown>)) {
        filas.push([escapa(seccion), escapa(campo), escapa(String(v ?? ''))].join(','))
      }
    } else {
      filas.push([escapa(seccion), escapa(''), escapa(String(valor))].join(','))
    }
  }
  descargar(`nivra-${hoy()}.csv`, filas.join('\n'), 'text/csv;charset=utf-8')
}

/** Sólo acepta JSON: el CSV es para leerlo fuera, no para volver a entrar. */
export async function importarJson(fichero: File) {
  const texto = await fichero.text()
  const datos = JSON.parse(texto) as Record<string, unknown>
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new Error('El fichero no tiene el formato de una copia de Nivra.')
  }
  const claves = Object.keys(datos).filter((k) => k.startsWith('nivra-') && !INTERNAS.includes(k))
  if (claves.length === 0) throw new Error('La copia no contiene datos de Nivra.')

  for (const k of claves) {
    const v = datos[k]
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
  }
  return claves.length
}
