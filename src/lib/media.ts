export type MusicEmbed = { provider: 'spotify' | 'youtube'; url: string }

export function parseMusicUrl(input: string): MusicEmbed | null {
  const raw = input.trim()
  if (!raw) return null
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  const host = u.hostname.replace(/^www\./, '')

  if (host === 'open.spotify.com') {
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length >= 2 && ['track', 'album', 'playlist', 'artist', 'episode', 'show'].includes(parts[0])) {
      return { provider: 'spotify', url: `https://open.spotify.com/embed/${parts[0]}/${parts[1]}` }
    }
    return null
  }

  if (host === 'youtube.com' || host === 'music.youtube.com') {
    const list = u.searchParams.get('list')
    const v = u.searchParams.get('v')
    if (v) return { provider: 'youtube', url: youtubeEmbedUrl(v, list) }
    if (list) return { provider: 'youtube', url: youtubeEmbedUrl('videoseries', list) }
    return null
  }

  if (host === 'youtu.be') {
    const id = u.pathname.slice(1)
    if (id) return { provider: 'youtube', url: youtubeEmbedUrl(id) }
    return null
  }

  return null
}

function youtubeEmbedUrl(id: string, list?: string | null) {
  const params = new URLSearchParams({
    enablejsapi: '1',
    origin: typeof location !== 'undefined' ? location.origin : '',
  })
  if (list) params.set('list', list)
  return `https://www.youtube.com/embed/${id}?${params.toString()}`
}

export function sendYoutubeCommand(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*')
}
