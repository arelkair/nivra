import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { MusicEmbed } from '../../lib/media'
import { realVolume } from '../../lib/volume'
import { attachYoutubePlayer, type YTPlayer } from '../../lib/youtubePlayer'

type SoundCloudWidget = {
  play: () => void
  pause: () => void
  seekTo: (ms: number) => void
  setVolume: (volume: number) => void
  next: () => void
  prev: () => void
  bind: (event: string, handler: (data?: { currentPosition?: number }) => void) => void
  getDuration: (callback: (ms: number) => void) => void
  getCurrentSound: (callback: (sound: { title?: string } | null) => void) => void
}

type SpotifyUpdate = { data: { isPaused: boolean; isBuffering: boolean; duration: number; position: number } }

type SpotifyController = {
  play: () => void
  pause: () => void
  resume: () => void
  seek: (seconds: number) => void
  destroy?: () => void
  addListener: (event: string, handler: (event: SpotifyUpdate) => void) => void
}

type SpotifyApi = {
  createController: (element: HTMLElement, options: { uri: string; width: string; height: number }, callback: (controller: SpotifyController) => void) => void
}

declare global {
  interface Window {
    SC?: { Widget: ((iframe: HTMLElement) => SoundCloudWidget) & { Events: Record<string, string> } }
    onSpotifyIframeApiReady?: (api: SpotifyApi) => void
  }
}

const loaded = new Map<string, Promise<void>>()

const loadScript = (src: string, ready: () => boolean) => {
  const existing = loaded.get(src)
  if (existing) return existing
  const promise = new Promise<void>((resolve, reject) => {
    if (ready()) return resolve()
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      loaded.delete(src)
      reject(new Error('script'))
    }
    document.head.appendChild(script)
  })
  loaded.set(src, promise)
  return promise
}

let spotifyApi: Promise<SpotifyApi> | null = null

const loadSpotify = () => {
  if (spotifyApi) return spotifyApi
  spotifyApi = new Promise<SpotifyApi>((resolve, reject) => {
    const timeout = setTimeout(() => {
      spotifyApi = null
      reject(new Error('timeout'))
    }, 8000)
    window.onSpotifyIframeApiReady = (api) => {
      clearTimeout(timeout)
      resolve(api)
    }
    const script = document.createElement('script')
    script.src = 'https://open.spotify.com/embed/iframe-api/v1'
    script.async = true
    script.onerror = () => {
      clearTimeout(timeout)
      spotifyApi = null
      reject(new Error('script'))
    }
    document.head.appendChild(script)
  })
  return spotifyApi
}

export type LinkPlayer = {
  ready: boolean
  playing: boolean
  time: number
  duration: number
  title: string
  fallback: boolean
  canSkip: boolean
  canVolume: boolean
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (seconds: number) => void
  setVolume: (slider: number) => void
}

type Options = {
  embed: MusicEmbed | null
  enabled: boolean
  volume: number
  spotifyHost: RefObject<HTMLDivElement | null>
}

export function useLinkPlayer({ embed, enabled, volume, spotifyHost }: Options): LinkPlayer {
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [title, setTitle] = useState('')
  const [fallback, setFallback] = useState(false)
  const yt = useRef<YTPlayer | null>(null)
  const sc = useRef<SoundCloudWidget | null>(null)
  const sp = useRef<SpotifyController | null>(null)
  const playingRef = useRef(false)
  const volumeRef = useRef(volume)
  volumeRef.current = volume
  const embedRef = useRef(embed)
  embedRef.current = embed
  const provider = embed?.provider
  const url = embed?.url

  const mark = useCallback((value: boolean) => {
    playingRef.current = value
    setPlaying(value)
  }, [])

  useEffect(() => {
    yt.current = null
    sc.current = null
    sp.current = null
    setReady(false)
    mark(false)
    setTime(0)
    setDuration(0)
    setTitle('')
    setFallback(false)
    const embed = embedRef.current
    const hostNode = spotifyHost.current
    if (!embed || !enabled) return
    let cancelled = false
    let destroy: (() => void) | undefined

    if (embed.provider === 'youtube') {
      attachYoutubePlayer('nivra-music-player', (state) => {
        if (cancelled) return
        if (state === 1) mark(true)
        else if (state === 2 || state === 0 || state === 5) mark(false)
      }).then((player) => {
        if (cancelled) return
        yt.current = player
        player.setVolume(realVolume(volumeRef.current))
        setDuration(player.getDuration() || 0)
        setReady(true)
      })
    } else if (embed.provider === 'soundcloud') {
      loadScript('https://w.soundcloud.com/player/api.js', () => !!window.SC?.Widget)
        .then(() => {
          if (cancelled) return
          const iframe = document.getElementById('nivra-music-player')
          if (!iframe || !window.SC) return
          const widget = window.SC.Widget(iframe)
          const events = window.SC.Widget.Events
          const refresh = () => {
            widget.getDuration((ms) => !cancelled && setDuration(ms / 1000))
            widget.getCurrentSound((sound) => !cancelled && setTitle(sound?.title ?? ''))
          }
          widget.bind(events.READY, () => {
            if (cancelled) return
            sc.current = widget
            widget.setVolume(realVolume(volumeRef.current))
            refresh()
            setReady(true)
          })
          widget.bind(events.PLAY, () => {
            if (cancelled) return
            mark(true)
            refresh()
          })
          widget.bind(events.PAUSE, () => !cancelled && mark(false))
          widget.bind(events.FINISH, () => !cancelled && mark(false))
          widget.bind(events.PLAY_PROGRESS, (data) => !cancelled && setTime((data?.currentPosition ?? 0) / 1000))
        })
        .catch(() => !cancelled && setFallback(true))
    } else if (embed.provider === 'spotify' && embed.uri) {
      const host = hostNode
      const uri = embed.uri
      if (!host) return
      loadSpotify()
        .then((api) => {
          if (cancelled || !host.isConnected) return
          host.innerHTML = ''
          const slot = document.createElement('div')
          host.appendChild(slot)
          api.createController(slot, { uri, width: '100%', height: 152 }, (controller) => {
            if (cancelled) {
              controller.destroy?.()
              return
            }
            sp.current = controller
            destroy = () => controller.destroy?.()
            controller.addListener('ready', () => !cancelled && setReady(true))
            controller.addListener('playback_update', (event) => {
              if (cancelled) return
              mark(!event.data.isPaused)
              setTime(event.data.position / 1000)
              setDuration(event.data.duration / 1000)
            })
            setReady(true)
          })
        })
        .catch(() => !cancelled && setFallback(true))
    }

    return () => {
      cancelled = true
      destroy?.()
      if (embed.provider === 'spotify' && hostNode) hostNode.innerHTML = ''
    }
  }, [provider, url, enabled, mark, spotifyHost])

  useEffect(() => {
    if (provider !== 'youtube' || !ready || !playing) return
    const id = setInterval(() => {
      const player = yt.current
      if (!player) return
      setTime(player.getCurrentTime() || 0)
      const total = player.getDuration() || 0
      setDuration((d) => (Math.abs(d - total) > 0.5 ? total : d))
    }, 300)
    return () => clearInterval(id)
  }, [provider, ready, playing])

  const toggle = useCallback(() => {
    const next = !playingRef.current
    mark(next)
    if (yt.current) {
      if (next) yt.current.playVideo()
      else yt.current.pauseVideo()
    } else if (sc.current) {
      if (next) sc.current.play()
      else sc.current.pause()
    } else if (sp.current) {
      if (next) sp.current.resume()
      else sp.current.pause()
    }
  }, [mark])

  const seek = useCallback((seconds: number) => {
    setTime(seconds)
    if (yt.current) yt.current.seekTo(seconds, true)
    else if (sc.current) sc.current.seekTo(seconds * 1000)
    else if (sp.current) sp.current.seek(seconds)
  }, [])

  const next = useCallback(() => {
    if (yt.current) yt.current.nextVideo()
    else sc.current?.next()
  }, [])

  const prev = useCallback(() => {
    if (yt.current) yt.current.previousVideo()
    else sc.current?.prev()
  }, [])

  const setVolume = useCallback((slider: number) => {
    const real = realVolume(slider)
    yt.current?.setVolume(real)
    sc.current?.setVolume(real)
  }, [])

  return {
    ready,
    playing,
    time,
    duration,
    title,
    fallback,
    canSkip: !!embed?.playlist && provider !== 'spotify',
    canVolume: provider !== 'spotify',
    toggle,
    next,
    prev,
    seek,
    setVolume,
  }
}
