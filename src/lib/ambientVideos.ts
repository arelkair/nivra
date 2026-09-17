export type AmbientVideoPreset = 'lluvia' | 'lluvia-truenos' | 'olas' | 'fuego' | 'naturaleza' | 'espacio'

export const AMBIENT_VIDEOS: Record<AmbientVideoPreset, string> = {
  lluvia: '-hWCZcl2VxE',
  'lluvia-truenos': 'gVKEM4K8J8A',
  olas: '0qEOlwW3MjU',
  fuego: '-VGQxQHLXEI',
  naturaleza: 'xNN7iTA57jM',
  espacio: 'wzeGFGyjxzU',
}

export function ambientEmbedUrl(id: string) {
  const params = new URLSearchParams({
    enablejsapi: '1',
    origin: typeof location !== 'undefined' ? location.origin : '',
    autoplay: '1',
    mute: '0',
    controls: '0',
    loop: '1',
    playlist: id,
    playsinline: '1',
  })
  return `https://www.youtube.com/embed/${id}?${params.toString()}`
}
