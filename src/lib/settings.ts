import { useStored, type Subject } from './store'

export function useSettings() {
  const [intro, setIntro] = useStored('nivra-intro', true)
  const [accent, setAccent] = useStored('nivra-accent', 'basico')
  const [clockOn, setClockOn] = useStored('nivra-clock', false)
  const [autoTheme, setAutoTheme] = useStored('nivra-auto-theme', false)
  const [hour12, setHour12] = useStored('nivra-hour12', false)
  const [birthday, setBirthday] = useStored('nivra-birthday', '')
  const [subjects, setSubjects] = useStored<Subject[]>('nivra-subjects', [])
  const [notifs, setNotifs] = useStored('nivra-notifs', false)
  const [toasts, setToasts] = useStored('nivra-toasts', true)
  const [searchOn, setSearchOn] = useStored('nivra-search', true)
  const [animations, setAnimations] = useStored('nivra-animations', true)
  const [navButtons, setNavButtons] = useStored('nivra-nav-buttons', true)
  const [bankEnabled, setBankEnabled] = useStored('nivra-bank-enabled', true)
  const [shortcutsOn, setShortcutsOn] = useStored('nivra-shortcuts', true)
  const [enabledShortcuts, setEnabledShortcuts] = useStored<Record<string, boolean>>('nivra-shortcut-keys', {})
  const [customKeys, setCustomKeys] = useStored<Record<string, string>>('nivra-shortcut-custom', {})

  return {
    intro,
    setIntro,
    accent,
    setAccent,
    clockOn,
    setClockOn,
    autoTheme,
    setAutoTheme,
    hour12,
    setHour12,
    birthday,
    setBirthday,
    subjects,
    setSubjects,
    notifs,
    setNotifs,
    toasts,
    setToasts,
    searchOn,
    setSearchOn,
    animations,
    setAnimations,
    navButtons,
    setNavButtons,
    bankEnabled,
    setBankEnabled,
    shortcutsOn,
    setShortcutsOn,
    enabledShortcuts,
    setEnabledShortcuts,
    customKeys,
    setCustomKeys,
  }
}

export type Settings = ReturnType<typeof useSettings>
