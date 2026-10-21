import type { Settings } from '../lib/settings'
import { DEFAULT_THEME } from '../lib/appearance'
import { t } from '../lib/i18n'

export function AppearanceEditor({ cfg }: { cfg: Settings }) {
  return <div className="nv-appearance flex flex-col gap-5 py-5">
    <div><h2 className="text-sm font-semibold">{t('Tema propio')}</h2><p className="mt-1 text-xs opacity-65">{t('Edita los colores de los modos claro y oscuro. Los cambios se guardan automáticamente.')}</p></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.customThemeOn} onChange={e => cfg.setCustomThemeOn(e.target.checked)} />{t('Usar tema propio')}</label>
    <label className="flex flex-col gap-2 text-sm">{t('Nombre del tema')}<input className="nv-field rounded border px-3 py-2" value={cfg.customTheme.name} maxLength={40} onChange={e => cfg.setCustomTheme(p => ({ ...p, name: e.target.value }))} /></label>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={!cfg.customTheme.name.trim()} className="nv-ghost rounded border border-current/15 px-3 py-2 text-xs disabled:opacity-40" onClick={() => {
        const theme = { ...cfg.customTheme, name: cfg.customTheme.name.trim() }
        cfg.setSavedThemes(prev => [...prev.filter(x => x.name !== theme.name), theme])
        cfg.setCustomTheme(theme)
        cfg.setCustomThemeOn(true)
      }}>{t('Guardar tema')}</button>
      {cfg.savedThemes.length > 0 && <><select aria-label={t('Temas guardados')} className="nv-field min-w-0 rounded px-3 py-2 text-xs" value="" onChange={e => { const theme = cfg.savedThemes.find(x => x.name === e.target.value); if (theme) { cfg.setCustomTheme(theme); cfg.setCustomThemeOn(true) } }}><option value="">{t('Temas guardados')}</option>{cfg.savedThemes.map(theme => <option key={theme.name} value={theme.name}>{theme.name}</option>)}</select><button type="button" disabled={!cfg.savedThemes.some(x => x.name === cfg.customTheme.name)} onClick={() => cfg.setSavedThemes(prev => prev.filter(x => x.name !== cfg.customTheme.name))} className="text-xs underline disabled:opacity-40">{t('Quitar tema guardado')}</button></>}
    </div>
    <div className="grid gap-5 sm:grid-cols-2">{(['light', 'dark'] as const).map(mode => <fieldset key={mode} className="rounded-lg border border-current/15 p-3">
      <legend className="px-1 text-xs">{t(mode === 'light' ? 'Claro' : 'Oscuro')}</legend>
      {(['background', 'surface', 'text', 'accent'] as const).map((key, i) => <label key={key} className="flex items-center justify-between gap-2 py-2 text-xs">
        {t(['Fondo', 'Superficie', 'Texto', 'Acento'][i])}<input type="color" value={cfg.customTheme[mode][key]} onChange={e => cfg.setCustomTheme(p => ({ ...p, [mode]: { ...p[mode], [key]: e.target.value } }))} className="h-7 w-10 cursor-pointer bg-transparent" />
      </label>)}
      <div className="mt-2 rounded p-3 text-xs" style={{ background: cfg.customTheme[mode].background, color: cfg.customTheme[mode].text }}><span style={{ color: cfg.customTheme[mode].accent }}>{cfg.customTheme.name || t('Mi tema')}</span><div className="mt-2 rounded p-2" style={{ background: cfg.customTheme[mode].surface }}>{t('Vista previa')}</div></div>
    </fieldset>)}</div>
    <button type="button" className="self-start rounded border border-current/15 px-3 py-2 text-xs" onClick={() => { cfg.setCustomTheme(DEFAULT_THEME); cfg.setCustomThemeOn(false) }}>{t('Restablecer tema')}</button>
    <div className="border-t border-current/15 pt-4"><h2 className="mb-3 text-sm font-semibold">{t('Accesibilidad')}</h2>
      {([{ label: 'Alto contraste', value: cfg.highContrast, set: cfg.setHighContrast }, { label: 'Letra grande', value: cfg.largeText, set: cfg.setLargeText }, { label: 'Fuente para dislexia', value: cfg.dyslexiaFont, set: cfg.setDyslexiaFont }]).map(option => <label key={option.label} className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" checked={option.value} onChange={e => option.set(e.target.checked)} />{t(option.label)}</label>)}
    </div>
  </div>
}
