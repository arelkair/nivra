import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'local-calendar-reader',
    configureServer(server) {
      server.middlewares.use('/api/calendar', async (request, response) => {
        try {
          if (request.method !== 'GET') { response.writeHead(405); response.end(); return }
          const url = new URL(new URL(request.url || '/', 'http://localhost').searchParams.get('url') || '')
          if (url.protocol !== 'https:' || url.port || url.username || url.password || !['calendar.google.com', 'calendar.googleusercontent.com'].includes(url.hostname)) { response.writeHead(400); response.end(); return }
          const upstream = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000) })
          if (!upstream.ok) throw new Error('Calendar unavailable')
          const reader = upstream.body?.getReader(); let size = 0; const chunks: Uint8Array[] = []
          if (!reader) throw new Error('Empty calendar')
          while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 2_000_000) { await reader.cancel(); throw new Error('Calendar too large') } chunks.push(part.value) }
          response.writeHead(200, { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' }); for (const chunk of chunks) response.write(chunk); response.end()
        } catch { response.writeHead(502); response.end('Calendar unavailable') }
      })
    },
  }],
  optimizeDeps: { exclude: ['@jsquash/avif'] },
})
