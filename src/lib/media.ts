export type MusicProvider = 'spotify' | 'youtube' | 'soundcloud'

export type MusicEmbed = { provider: MusicProvider; url: string; source: string; uri?: string; playlist?: boolean }

const SPOTIFY_TYPES = ['track', 'album', 'playlist', 'artist', 'episode', 'show']

function parseSpotify(u: URL): MusicEmbed | null {
  const parts = u.pathname.split('/').filter(Boolean).filter((p) => !/^intl-[a-z-]+$/i.test(p) && p !== 'embed' && p !== 'embed-podcast')
  const at = parts.findIndex((p) => SPOTIFY_TYPES.includes(p))
  if (at < 0 || !parts[at + 1]) return null
  const type = parts[at]
  const id = parts[at + 1].split('?')[0]
  if (!/^[A-Za-z0-9]{10,}$/.test(id)) return null
  return {
    provider: 'spotify',
    url: `https://open.spotify.com/embed/${type}/${id}`,
    source: u.href,
    uri: `spotify:${type}:${id}`,
    playlist: type === 'playlist' || type === 'album' || type === 'show' || type === 'artist',
  }
}

function parseSpotifyUri(raw: string): MusicEmbed | null {
  const m = /^spotify:(track|album|playlist|artist|episode|show):([A-Za-z0-9]{10,})$/.exec(raw)
  if (!m) return null
  return { provider: 'spotify', url: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, source: raw, uri: raw, playlist: m[1] !== 'track' && m[1] !== 'episode' }
}

function youtubeEmbedUrl(id: string, list?: string | null) {
  const params = new URLSearchParams({
    enablejsapi: '1',
    origin: typeof location !== 'undefined' ? location.origin : '',
  })
  if (list) params.set('list', list)
  return `https://www.youtube.com/embed/${id}?${params.toString()}`
}

function parseYoutube(u: URL, host: string): MusicEmbed | null {
  const list = u.searchParams.get('list')
  const v = u.searchParams.get('v')
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0]
    return id ? { provider: 'youtube', url: youtubeEmbedUrl(id, list), source: u.href, playlist: !!list } : null
  }
  const parts = u.pathname.split('/').filter(Boolean)
  const direct = ['embed', 'shorts', 'live', 'v'].includes(parts[0]) ? parts[1] : null
  if (v) return { provider: 'youtube', url: youtubeEmbedUrl(v, list), source: u.href, playlist: !!list }
  if (direct && direct !== 'videoseries') return { provider: 'youtube', url: youtubeEmbedUrl(direct, list), source: u.href, playlist: !!list }
  if (list) return { provider: 'youtube', url: youtubeEmbedUrl('videoseries', list), source: u.href, playlist: true }
  return null
}

function parseSoundcloud(u: URL, host: string): MusicEmbed | null {
  const parts = u.pathname.split('/').filter(Boolean)
  if (parts.length === 0) return null
  const canonical = `https://${host}${u.pathname}`
  const params = new URLSearchParams({
    url: canonical,
    color: '#888888',
    auto_play: 'false',
    hide_related: 'true',
    show_comments: 'false',
    show_user: 'true',
    show_reposts: 'false',
    show_teaser: 'false',
    visual: 'false',
  })
  return { provider: 'soundcloud', url: `https://w.soundcloud.com/player/?${params.toString()}`, source: canonical, playlist: parts.includes('sets') }
}

export function parseMusicUrl(input: string): MusicEmbed | null {
  const raw = input.trim()
  if (!raw) return null
  const uri = parseSpotifyUri(raw)
  if (uri) return uri
  let u: URL
  try {
    u = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }
  const host = u.hostname.replace(/^(www|m|music|play)\./, '')

  if (host === 'open.spotify.com' || host === 'spotify.com') return parseSpotify(u)
  if (host === 'youtube.com' || host === 'youtu.be') return parseYoutube(u, host)
  if (host === 'soundcloud.com' || host === 'on.soundcloud.com') return parseSoundcloud(u, host)
  return null
}

export function sendYoutubeCommand(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*')
}
