const CACHE = 'nivra-v1'
const BASE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(BASE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Same-origin only: sync requests must never be cached.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copia = r.clone()
          caches.open(CACHE).then((c) => c.put('/index.html', copia))
          return r
        })
        .catch(() => caches.match('/index.html').then((r) => r ?? Response.error())),
    )
    return
  }

  e.respondWith(
    caches.match(e.request).then((guardado) => {
      const red = fetch(e.request)
        .then((r) => {
          if (r.ok) {
            const copia = r.clone()
            caches.open(CACHE).then((c) => c.put(e.request, copia))
          }
          return r
        })
        .catch(() => guardado ?? Response.error())
      return guardado ?? red
    }),
  )
})
