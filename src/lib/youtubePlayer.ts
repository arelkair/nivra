type YTPlayer = {
  playVideo: () => void
  pauseVideo: () => void
  nextVideo: () => void
  previousVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  setVolume: (volume: number) => void
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: { events?: Record<string, (event: { target: YTPlayer }) => void> },
      ) => YTPlayer
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<void> | null = null

function loadApi(): Promise<void> {
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve()
      return
    }
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
    }
  })
  return apiPromise
}

export function attachYoutubePlayer(elementId: string): Promise<YTPlayer> {
  return loadApi().then(
    () =>
      new Promise((resolve) => {
        const player = new window.YT!.Player(elementId, {
          events: { onReady: () => resolve(player) },
        })
      }),
  )
}

export type { YTPlayer }
