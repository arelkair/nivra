import { useStored, type Subject } from './store'

export function useSettings() {
  const [intro, setIntro] = useStored('nivra-intro', true)
  const [accent, setAccent] = useStored('nivra-accent', 'basico')
  const [clockOn, setClockOn] = useStored('nivra-clock', false)
  const [hour12, setHour12] = useStored('nivra-hour12', false)
  const [birthday, setBirthday] = useStored('nivra-birthday', '')
  const [subjects, setSubjects] = useStored<Subject[]>('nivra-subjects', [])
  const [notifs, setNotifs] = useStored('nivra-notifs', false)
  const [toasts, setToasts] = useStored('nivra-toasts', true)
  const [searchOn, setSearchOn] = useStored('nivra-search', true)
  const [animations, setAnimations] = useStored('nivra-animations', true)
  const [navButtons, setNavButtons] = useStored('nivra-nav-buttons', true)
  const [shortcutsOn, setShortcutsOn] = useStored('nivra-shortcuts', true)
  const [atajos, setAtajos] = useStored<Record<string, boolean>>('nivra-shortcut-keys', {})
  const [teclas, setTeclas] = useStored<Record<string, string>>('nivra-shortcut-custom', {})
  const [hideCountdowns, setHideCountdowns] = useStored('nivra-hide-countdowns', false)

  return {
    intro,
    setIntro,
    accent,
    setAccent,
    clockOn,
    setClockOn,
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
    shortcutsOn,
    setShortcutsOn,
    atajos,
    setAtajos,
    teclas,
    setTeclas,
    hideCountdowns,
    setHideCountdowns,
  }
}

export type Settings = ReturnType<typeof useSettings>
