import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { webcrypto } from 'node:crypto'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
export function runtime({ auth = false, backend = false, supabase = null } = {}) {
  const values = new Map(), cache = new Map(), changes = []
  const clock = { now: Date.now() }
  class Clock extends Date { static now() { return clock.now } }
  const window = new EventTarget()
  const localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key), key: index => [...values.keys()][index] ?? null, get length() { return values.size } }
  const read = file => {
    if (cache.has(file)) return cache.get(file)
    const source = fs.readFileSync(file, 'utf8').replaceAll('import.meta.env.DEV', 'false').replaceAll('import.meta.env.VITE_SUPABASE_ENABLED', JSON.stringify(String(backend))).replaceAll('import.meta.env.VITE_SUPABASE_AUTH_ENABLED', JSON.stringify(String(auth)))
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText
    const module = { exports: {} }
    cache.set(file, module.exports)
    const localRequire = spec => {
      if (spec === './sync') return { onSyncApplied: () => () => {}, markChanged: key => changes.push(key) }
      if (spec === './supabase') return supabase ?? { getSession: async () => { throw new Error('Network forbidden in local tests') }, getSupabase: async () => { throw new Error('Network forbidden in local tests') } }
      return spec.startsWith('.') ? read(path.resolve(path.dirname(file), `${spec}.ts`)) : require(spec)
    }
    vm.runInNewContext(compiled, { module, exports: module.exports, require: localRequire, localStorage, window, crypto: webcrypto, TextEncoder, TextDecoder, Blob, atob, btoa, Event, CustomEvent, DOMException, setTimeout, clearTimeout, dispatchEvent: event => window.dispatchEvent(event), addEventListener: (name, fn) => window.addEventListener(name, fn), removeEventListener: (name, fn) => window.removeEventListener(name, fn), navigator: { language: 'es' }, document: { documentElement: { lang: '' } }, location: { origin: 'http://localhost:5173', reload() {} }, Date: Clock, Intl, console }, { filename: file })
    return module.exports
  }
  return { read: relative => read(path.join(root, relative)), values, localStorage, clock, changes }
}
