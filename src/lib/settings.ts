import { useStored, type Subject } from './store'
import { DEFAULT_DASHBOARD_SLOTS, type WidgetType } from './dashboardLayout'

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
  const [menuOpacity, setMenuOpacity] = useStored('nivra-menu-opacity', 100)
  const [menuBlur, setMenuBlur] = useStored('nivra-menu-blur', 0)
  const [bankEnabled, setBankEnabled] = useStored('nivra-bank-enabled', true)
  const [labEnabled, setLabEnabled] = useStored('nivra-lab-enabled', false)
  const [examCountdowns, setExamCountdowns] = useStored('nivra-exam-countdowns', false)
  const [dashboardSlots, setDashboardSlots] = useStored<WidgetType[]>(
    'nivra-dashboard-slots',
    DEFAULT_DASHBOARD_SLOTS,
  )
  const [carouselEnabled, setCarouselEnabled] = useStored('nivra-carousel', false)
  const [carouselSeconds, setCarouselSeconds] = useStored('nivra-carousel-seconds', 8)
  const [backgroundMode, setBackgroundMode] = useStored<'ninguno' | 'forma' | 'imagen' | 'degradado' | 'video'>(
    'nivra-bg-mode',
    'ninguno',
  )
  const [backgroundShape, setBackgroundShape] = useStored('nivra-bg-shape', 'puntos')
  const [backgroundGradient, setBackgroundGradient] = useStored('nivra-bg-gradient', 'atardecer')
  const [uiSounds, setUiSounds] = useStored('nivra-ui-sounds', false)
  const [uiVolume, setUiVolume] = useStored('nivra-ui-volume', 15)
  const [ambientOn, setAmbientOn] = useStored('nivra-ambient', false)
  const [ambientPreset, setAmbientPreset] = useStored<
    'lluvia' | 'lluvia-truenos' | 'olas' | 'fuego' | 'estatico' | 'enlace' | 'naturaleza' | 'espacio'
  >('nivra-ambient-preset', 'lluvia')
  const [ambientVolume, setAmbientVolume] = useStored('nivra-ambient-volume', 50)
  const [customSoundUrl, setCustomSoundUrl] = useStored('nivra-custom-sound-url', '')
  const [themeStyle, setThemeStyle] = useStored<'clasico' | 'carpetas' | 'barra'>(
    'nivra-theme-style',
    'clasico',
  )
  const [themePack, setThemePack] = useStored<'ninguno' | 'naturaleza' | 'espacio'>(
    'nivra-theme-pack',
    'ninguno',
  )
  const [userName, setUserName] = useStored('nivra-name', '')
  const [initiativeEnabled, setInitiativeEnabled] = useStored('nivra-initiative', false)
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
    menuOpacity,
    setMenuOpacity,
    menuBlur,
    setMenuBlur,
    bankEnabled,
    setBankEnabled,
    labEnabled,
    setLabEnabled,
    examCountdowns,
    setExamCountdowns,
    dashboardSlots,
    setDashboardSlots,
    carouselEnabled,
    setCarouselEnabled,
    carouselSeconds,
    setCarouselSeconds,
    backgroundMode,
    setBackgroundMode,
    backgroundShape,
    setBackgroundShape,
    backgroundGradient,
    setBackgroundGradient,
    uiSounds,
    setUiSounds,
    uiVolume,
    setUiVolume,
    ambientOn,
    setAmbientOn,
    ambientPreset,
    setAmbientPreset,
    ambientVolume,
    setAmbientVolume,
    customSoundUrl,
    setCustomSoundUrl,
    themeStyle,
    setThemeStyle,
    themePack,
    setThemePack,
    userName,
    setUserName,
    initiativeEnabled,
    setInitiativeEnabled,
    shortcutsOn,
    setShortcutsOn,
    enabledShortcuts,
    setEnabledShortcuts,
    customKeys,
    setCustomKeys,
  }
}

export type Settings = ReturnType<typeof useSettings>
