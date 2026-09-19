import { useEffect, useRef, useState, type RefObject } from 'react'
import { ambientEmbedUrl } from '../../lib/ambientVideos'
import { t, tp } from '../../lib/i18n'
import { parseMusicUrl, sendYoutubeCommand, type MusicEmbed } from '../../lib/media'
import type { Settings } from '../../lib/settings'
import { realVolume } from '../../lib/volume'
import { Icon } from '../ui'
import { useLinkPlayer } from './linkPlayer'
import { skin } from './skin'

export type MusicProps = {
  embed: MusicEmbed | null
  ambientVideoId: string | null
  consent: boolean
  setConsent: (value: boolean) => void
  ambientIframe: RefObject<HTMLIFrameElement | null>
}

type Props = MusicProps & {
  dark: boolean
  cfg: Settings
  open: boolean
  onClose: () => void
}

type Preset = 'lluvia' | 'lluvia-truenos' | 'olas' | 'fuego' | 'enlace'

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'lluvia', label: 'Lluvia' },
  { id: 'lluvia-truenos', label: 'Lluvia y truenos' },
  { id: 'olas', label: 'Olas' },
  { id: 'fuego', label: 'Fuego de hoguera' },
  { id: 'enlace', label: 'Tu música' },
]

const SLEEP = [0, 15, 30, 60]

const SHORT_SPOTIFY = /^(https?:\/\/)?(spotify\.link|link\.tospotify\.com|spotify\.app\.link)\//i

const clock = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = String(total % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`
}

const withAutoplay = (embed: MusicEmbed) =>
  embed.provider === 'youtube' ? `${embed.url}&autoplay=1` : embed.provider === 'soundcloud' ? embed.url.replace('auto_play=false', 'auto_play=true') : embed.url

export function InitiativeMusic({ dark, cfg, open, onClose, embed, ambientVideoId, consent, setConsent, ambientIframe }: Props) {
  const s = skin(dark)
  const panel = useRef<HTMLDivElement>(null)
  const spotifyHost = useRef<HTMLDivElement>(null)
  const persist = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [link, setLink] = useState(cfg.customSoundUrl)
  const [sleepAt, setSleepAt] = useState<number | null>(null)
  const [, setTick] = useState(0)
  const [volume, setVolume] = useState(cfg.ambientVolume)
  const [scrub, setScrub] = useState<number | null>(null)
  const preset = cfg.ambientPreset as Preset | 'estatico'
  const isLink = preset === 'enlace'
  const parsed = parseMusicUrl(link)
  const valid = link.trim() === '' || !!parsed
  const needsConsent = (isLink && !!embed) || (!isLink && !!ambientVideoId && cfg.ambientOn)
  const active = isLink && !!embed && consent && cfg.ambientOn
  const player = useLinkPlayer({ embed: active ? embed : null, enabled: active, volume, spotifyHost })

  useEffect(() => {
    setLink(cfg.customSoundUrl)
  }, [cfg.customSoundUrl])

  useEffect(() => {
    setVolume(cfg.ambientVolume)
  }, [cfg.ambientVolume])

  useEffect(() => {
    if (cfg.ambientPreset === 'estatico') cfg.setAmbientPreset('lluvia')
  }, [cfg])

  useEffect(() => {
    const el = panel.current as (HTMLDivElement & { inert?: boolean }) | null
    if (el) el.inert = !open
  }, [open])

  useEffect(() => {
    if (sleepAt === null) return
    const id = setInterval(() => {
      if (Date.now() >= sleepAt) {
        cfg.setAmbientOn(false)
        setSleepAt(null)
      } else setTick((n) => n + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [sleepAt, cfg])

  useEffect(() => {
    if (!cfg.ambientOn) setSleepAt(null)
  }, [cfg.ambientOn])

  useEffect(() => () => clearTimeout(persist.current), [])

  const changeVolume = (value: number) => {
    setVolume(value)
    player.setVolume(value)
    if (cfg.ambientOn && ambientVideoId) sendYoutubeCommand(ambientIframe.current, 'setVolume', [realVolume(value)])
    clearTimeout(persist.current)
    persist.current = setTimeout(() => cfg.setAmbientVolume(value), 250)
  }

  const choose = (p: Preset) => {
    cfg.setAmbientPreset(p)
    cfg.setAmbientOn(true)
  }

  const saveLink = () => {
    const value = link.trim()
    if (value !== cfg.customSoundUrl && (value === '' || parseMusicUrl(value))) cfg.setCustomSoundUrl(value)
  }

  const remaining = sleepAt ? Math.max(0, Math.ceil((sleepAt - Date.now()) / 60000)) : 0
  const showTransport = active && !player.fallback && (embed?.provider !== 'spotify' || player.ready)
  const shownTime = scrub ?? player.time
  const span = Math.max(1, Math.floor(player.duration))

  const chip = (on: boolean) => `rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${on ? `${s.active} border-transparent` : `${s.line} ${s.muted} ${s.hover}`}`

  return (
    <>
      {cfg.ambientOn && ambientVideoId && consent && !isLink && (
        <iframe
          ref={ambientIframe}
          key={ambientVideoId}
          src={ambientEmbedUrl(ambientVideoId)}
          title="ambient"
          aria-hidden
          referrerPolicy="strict-origin-when-cross-origin"
          className="pointer-events-none fixed h-px w-px opacity-0"
          allow="autoplay"
          loading="lazy"
        />
      )}

      <div
        ref={panel}
        role="dialog"
        aria-label={t('Música y ambiente')}
        aria-hidden={!open}
        className={
          open
            ? `fixed right-4 bottom-[4.25rem] z-40 flex max-h-[calc(100svh-6rem)] w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 overflow-y-auto rounded-2xl border p-4 shadow-2xl backdrop-blur-sm max-md:right-3 max-md:bottom-[8.25rem] max-md:left-3 max-md:w-auto max-md:max-w-none ${s.line} ${dark ? 'bg-[#131316]/95 text-neutral-100 [color-scheme:dark]' : 'bg-white/95 text-neutral-900'}`
            : 'pointer-events-none fixed top-0 -left-[9999px] w-80 opacity-0'
        }
      >
        <div className="flex items-center gap-2">
          <p className="flex-1 text-sm font-medium">{t('Música y ambiente')}</p>
          <button
            type="button"
            role="switch"
            aria-checked={cfg.ambientOn}
            aria-label={cfg.ambientOn ? t('Apagar') : t('Encender')}
            onClick={() => cfg.setAmbientOn(!cfg.ambientOn)}
            className={`relative h-6 w-10 shrink-0 rounded-full border transition-colors ${cfg.ambientOn ? (dark ? 'border-white bg-white' : 'border-neutral-900 bg-neutral-900') : `${s.line} ${dark ? 'bg-white/[0.06]' : 'bg-black/[0.05]'}`}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-[1.15rem] w-[1.15rem] rounded-full transition-transform ${cfg.ambientOn ? `translate-x-4 ${dark ? 'bg-neutral-900' : 'bg-white'}` : dark ? 'bg-neutral-400' : 'bg-neutral-500'}`} />
          </button>
          <button type="button" onClick={onClose} aria-label={t('Cerrar')} className={`shrink-0 ${s.muted} ${s.hoverText}`}>
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={cfg.ambientOn && preset === p.id} onClick={() => choose(p.id)} className={chip(cfg.ambientOn && preset === p.id)}>
              {t(p.label)}
            </button>
          ))}
        </div>

        {isLink && (
          <div className="flex flex-col gap-1.5">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onBlur={saveLink}
              onKeyDown={(e) => e.key === 'Enter' && saveLink()}
              placeholder="Spotify, YouTube o SoundCloud"
              aria-label={t('Enlace de música')}
              spellCheck={false}
              className={`${s.field} font-mono !text-xs`}
            />
            {!valid && (
              <p className="text-[0.7rem] text-red-500">
                {SHORT_SPOTIFY.test(link.trim())
                  ? t('Los enlaces cortos de Spotify no funcionan. Abre la canción o lista y usa «Compartir → Copiar enlace».')
                  : t('Ese enlace no es de Spotify, YouTube ni SoundCloud.')}
              </p>
            )}
            {parsed && <p className={`text-[0.7rem] ${s.faint}`}>{`${parsed.provider === 'spotify' ? 'Spotify' : parsed.provider === 'youtube' ? 'YouTube' : 'SoundCloud'} · ${parsed.playlist ? t('Lista de reproducción') : t('Canción o vídeo')}`}</p>}
            <p className={`text-[0.65rem] leading-relaxed ${s.faint}`}>{t('Admite canciones y listas de Spotify, vídeos y listas de YouTube, y canciones y listas de SoundCloud.')}</p>
          </div>
        )}

        {needsConsent && !consent && (
          <div className={`flex flex-col gap-2 rounded-xl border p-3 ${s.line}`}>
            <p className={`text-xs leading-relaxed ${s.muted}`}>{t('Este reproductor se carga desde los servidores de Spotify, YouTube o SoundCloud y puede usar sus propias cookies.')}</p>
            <button type="button" onClick={() => setConsent(true)} className={`rounded-lg px-3 py-2 text-xs font-medium ${s.primary}`}>
              {t('Cargar reproductor')}
            </button>
          </div>
        )}

        {isLink && embed && consent && (
          <>
            {(embed.provider === 'youtube' || embed.provider === 'soundcloud') && (
              <div className="fixed top-0 -left-[9999px] h-40 w-72">
                <iframe
                  id="nivra-music-player"
                  key={embed.url}
                  src={withAutoplay(embed)}
                  title={embed.provider === 'youtube' ? 'YouTube' : 'SoundCloud'}
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="h-full w-full border-0"
                  height={160}
                  allow="autoplay; encrypted-media"
                />
              </div>
            )}
            {embed.provider === 'spotify' &&
              (player.fallback ? (
                <iframe title="Spotify" src={embed.url} referrerPolicy="strict-origin-when-cross-origin" className="w-full rounded-xl border-0" height={152} allow="autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture" />
              ) : (
                <div ref={spotifyHost} key={embed.url} className="min-h-[152px] w-full overflow-hidden rounded-xl" />
              ))}
          </>
        )}

        {showTransport && (
          <div className="flex flex-col gap-2">
            {player.title && <p className="truncate text-center text-xs">{player.title}</p>}
            <input
              type="range"
              min={0}
              max={span}
              value={Math.min(Math.floor(shownTime), span)}
              disabled={!player.ready || player.duration === 0}
              onChange={(e) => setScrub(Number(e.target.value))}
              onPointerUp={() => {
                if (scrub !== null) player.seek(scrub)
                setScrub(null)
              }}
              onKeyUp={() => {
                if (scrub !== null) player.seek(scrub)
                setScrub(null)
              }}
              aria-label={t('Avanzar en la canción')}
              className="h-1 w-full accent-neutral-500 disabled:opacity-40"
            />
            <div className={`flex justify-between font-mono text-[0.65rem] ${s.faint}`}>
              <span>{clock(shownTime)}</span>
              <span>{clock(player.duration)}</span>
            </div>
            <div className="flex items-center justify-center gap-5">
              {player.canSkip && (
                <button type="button" onClick={player.prev} aria-label={t('Anterior')} className={`${s.muted} ${s.hoverText}`}>
                  <Icon name="left" className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                onClick={player.toggle}
                disabled={!player.ready}
                aria-label={player.playing ? t('Pausar') : t('Reproducir')}
                className={`grid h-10 w-10 place-items-center rounded-full transition-transform active:scale-95 disabled:opacity-40 ${s.primary}`}
              >
                <Icon name={player.playing ? 'pause' : 'play'} className="h-4 w-4" />
              </button>
              {player.canSkip && (
                <button type="button" onClick={player.next} aria-label={t('Siguiente')} className={`${s.muted} ${s.hoverText}`}>
                  <Icon name="right" className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        <label className="flex items-center gap-3">
          <Icon name="volume" className={`h-4 w-4 shrink-0 ${s.muted}`} />
          <input type="range" min={0} max={100} value={volume} onChange={(e) => changeVolume(Number(e.target.value))} aria-label={t('Volumen')} className="h-1 flex-1 accent-neutral-500" />
          <span className={`w-8 text-right font-mono text-xs ${s.muted}`}>{volume}</span>
        </label>
        {isLink && embed?.provider === 'spotify' && <p className={`text-[0.65rem] ${s.faint}`}>{t('En Spotify el volumen no se puede ajustar desde aquí; usa el del sistema. Sin iniciar sesión solo suenan fragmentos de 30 segundos.')}</p>}

        {cfg.ambientOn && (
          <div className={`flex flex-wrap items-center gap-1.5 border-t pt-3 ${s.line}`}>
            <span className={`mr-1 text-xs ${s.muted}`}>{t('Apagar en')}</span>
            {SLEEP.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={m === 0 ? sleepAt === null : false}
                onClick={() => setSleepAt(m === 0 ? null : Date.now() + m * 60000)}
                className={chip(m === 0 && sleepAt === null)}
              >
                {m === 0 ? t('Nunca') : `${m} min`}
              </button>
            ))}
            {sleepAt !== null && <span className={`w-full text-[0.7rem] ${s.faint}`}>{tp('Se apagará en {0} min.', remaining)}</span>}
          </div>
        )}
      </div>
    </>
  )
}
