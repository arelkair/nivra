import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
function load(language = 'es', saved = language) {
  const cache = new Map()
  const values = new Map(saved ? [['nivra-lang', saved]] : [])
  const document = { documentElement: { lang: '' } }
  const localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  const read = file => {
    if (cache.has(file)) return cache.get(file)
    let source = fs.readFileSync(file, 'utf8')
    source = source.replaceAll('import.meta.env.DEV', 'false')
    if (file.endsWith('i18n.ts')) source = source.replace('const EN:', 'export const EN:')
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText
    const module = { exports: {} }
    cache.set(file, module.exports)
    const localRequire = spec => {
      if (spec === './sync') return { onSyncApplied: () => () => {}, markChanged: () => {} }
      return spec.startsWith('.') ? read(path.resolve(path.dirname(file), `${spec}.ts`)) : require(spec)
    }
    vm.runInNewContext(compiled, { module, exports: module.exports, require: localRequire, localStorage, navigator: { language }, document, location: { reload() {} }, Intl, Date, console }, { filename: file })
    return module.exports
  }
  return { read: name => read(path.join(root, name)), document, values }
}

const glEnv = load('gl-ES', null)
const gl = glEnv.read('src/lib/i18n.ts')
const catalogue = glEnv.read('src/lib/gl.ts').GL
assert.equal(gl.getLang(), 'gl')
assert.equal(glEnv.document.documentElement.lang, 'gl')
assert.equal(gl.locale(), 'gl-ES')
assert.equal(gl.formatDate(new Date(2026, 9, 18), { day: 'numeric', month: 'long', year: 'numeric' }), '18 de outubro de 2026')
assert.equal(gl.formatDate(new Date(2026, 9, 21), { weekday: 'long' }), 'mércores')
assert.equal(gl.t('Tareas'), 'Tarefas')
assert.equal(gl.tp('Tienes {0} tareas atrasadas', 3), 'Tes 3 tarefas atrasadas')
assert.deepEqual(Array.from(gl.weekdayLetters()), ['L', 'M', 'M', 'X', 'V', 'S', 'D'])
assert.deepEqual(Object.keys(gl.EN).filter(key => !Object.hasOwn(catalogue, key)), [], 'Missing Galician messages')
const sourceMessages = new Set()
for (const relative of fs.readdirSync(path.join(root, 'src'), { recursive: true })) {
  if (!/\.tsx?$/.test(relative)) continue
  const file = path.join(root, 'src', relative)
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const visit = node => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ['t', 'tp'].includes(node.expression.text) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) sourceMessages.add(node.arguments[0].text)
    ts.forEachChild(node, visit)
  }
  visit(ast)
}
assert.deepEqual([...sourceMessages].filter(key => !Object.hasOwn(catalogue, key)), [], 'Untranslated literal UI messages')
for (const key of Object.keys(gl.EN)) {
  assert.ok(Object.hasOwn(catalogue, key), `Missing Galician message: ${key}`)
  const placeholders = value => (value.match(/\{\d+\}/g) ?? []).sort().join(',')
  assert.equal(placeholders(catalogue[key]), placeholders(key), `Broken placeholders: ${key}`)
  assert.ok(catalogue[key].trim(), `Empty translation: ${key}`)
}
gl.setLang('en')
assert.equal(glEnv.values.get('nivra-lang'), 'en')
const es = load('es-ES').read('src/lib/i18n.ts')
assert.equal(es.t('Tareas'), 'Tareas')
assert.equal(es.locale(), 'es-ES')
const en = load('en-GB').read('src/lib/i18n.ts')
assert.equal(en.t('Personalizar Inicio'), 'Customise Home')
assert.equal(en.locale(), 'en-GB')

const store = glEnv.read('src/lib/store.ts')
const items = store.calendarItems([], [{ id: 'task', title: 'Test task', date: '2026-10-18', done: false, subject: 'maths', subtasks: [] }], [{ id: 'exam', title: 'Test exam', kind: 'examen', date: '2026-10-18', subject: 'maths' }])
assert.equal(items.length, 2)
assert.ok(items.every(item => item.subject === 'maths'), 'Calendar must retain task and exam subjects')
const appearance = glEnv.read('src/lib/appearance.ts')
assert.equal(appearance.validColor('#aabbcc'), true)
assert.equal(appearance.validColor('red; background: url(...)'), false)
assert.equal(appearance.validColor('#xyzxyz'), false)
console.log(`Interface checks passed: ${Object.keys(catalogue).length} Galician messages, literal UI coverage, placeholders, locale selection, subject colours and theme input.`)
