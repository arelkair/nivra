import { readLocal, writeLocal } from './dataLifecycle'

// Device-only keys deliberately stay outside backup and sync namespaces.
export const PIN_KEY = 'device-nivra-lock'
const ATTEMPTS_KEY = 'device-nivra-lock-attempts'
export type LockScope = 'app' | 'vault'
export type PinConfig = { version: 1; scope: LockScope; salt: string; digest: string; iterations: number }
const ITERATIONS = 310000
const opened = new Set<LockScope>()
const hex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
async function digest(pin: string, salt: string, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations }, key, 256)))
}
export function pinConfig() { return readLocal<PinConfig | null>(PIN_KEY, null) }
export function isUnlocked(scope: LockScope) {
  const config = pinConfig()
  return !config || (scope === 'app' && config.scope === 'vault') || opened.has(config.scope)
}
export function lockNow() { opened.clear(); window.dispatchEvent(new Event('nivra-lock')) }
export function retryAt() { return readLocal(ATTEMPTS_KEY, { count: 0, until: 0 }).until }
export async function verifyPin(pin: string) {
  const config = pinConfig()
  if (!config) return true
  if (retryAt() > Date.now()) throw new Error('Demasiados intentos. Espera a que termine la cuenta atrás.')
  const actual = await digest(pin, config.salt, config.iterations)
  let mismatch = actual.length ^ config.digest.length
  for (let i = 0; i < actual.length; i++) mismatch |= actual.charCodeAt(i) ^ (config.digest.charCodeAt(i) || 0)
  if (mismatch !== 0) {
    const attempts = readLocal(ATTEMPTS_KEY, { count: 0, until: 0 })
    const count = attempts.count + 1
    writeLocal(ATTEMPTS_KEY, { count, until: count >= 5 ? Date.now() + Math.min(900000, 30000 * 2 ** Math.min(count - 5, 5)) : 0 }, false)
    return false
  }
  localStorage.removeItem(ATTEMPTS_KEY)
  opened.add(config.scope)
  window.dispatchEvent(new Event('nivra-lock'))
  return true
}
export async function configurePin(scope: LockScope | 'off', pin: string, current: string) {
  if (pinConfig() && !(await verifyPin(current))) throw new Error('El PIN actual no es correcto.')
  if (scope === 'off') {
    localStorage.removeItem(PIN_KEY)
    lockNow()
    return
  }
  if (!/^\d{6,12}$/.test(pin)) throw new Error('El PIN debe tener entre 6 y 12 cifras.')
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
  const config: PinConfig = { version: 1, scope, salt, digest: await digest(pin, salt, ITERATIONS), iterations: ITERATIONS }
  writeLocal(PIN_KEY, config, false)
  opened.clear()
  opened.add(scope)
  window.dispatchEvent(new Event('nivra-lock'))
}
