const INTERFACE_KEY = 'nivra-initiative'
const SHARE_KEY = 'nivra-share-data'
const READY_KEY = 'nivra-spaces-ready'
const PREFIX = 'nivra-'
const CLASSIC_PREFIX = 'nivra-classic-'

const DATA_KEYS = new Set([
  'nivra-anniversaries',
  'nivra-bank-accounts',
  'nivra-bank-initial',
  'nivra-birthday',
  'nivra-blocks',
  'nivra-boards',
  'nivra-events',
  'nivra-exam-countdowns',
  'nivra-free-days',
  'nivra-goals',
  'nivra-grades',
  'nivra-journal',
  'nivra-lab-decks',
  'nivra-lab-quizzes',
  'nivra-lab-roulette',
  'nivra-movements',
  'nivra-notepads',
  'nivra-profile',
  'nivra-profiles',
  'nivra-reminders',
  'nivra-special-days',
  'nivra-streak',
  'nivra-subjects',
  'nivra-subs',
  'nivra-tasks',
  'nivra-timers',
  'nivra-vault',
  'nivra-vault-folders',
  'nivra-vault-migrated',
  'nivra-wishes',
  'nivra-works',
])

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const classicKey = (key: string) => CLASSIC_PREFIX + key.slice(PREFIX.length)

export const usesInitiative = read(INTERFACE_KEY) === 'true'
export const sharesData = read(SHARE_KEY) === 'true'

export function scopedKey(key: string): string {
  if (usesInitiative || sharesData || !DATA_KEYS.has(key)) return key
  return classicKey(key)
}

export function prepareSpaces() {
  try {
    if (localStorage.getItem(READY_KEY)) return
    for (const key of DATA_KEYS) {
      const value = localStorage.getItem(key)
      if (value !== null && localStorage.getItem(classicKey(key)) === null) localStorage.setItem(classicKey(key), value)
    }
    localStorage.setItem(READY_KEY, '1')
  } catch {
    return
  }
}

export function setSharedData(share: boolean) {
  try {
    localStorage.setItem(SHARE_KEY, String(share))
  } catch {
    return
  }
  location.reload()
}
