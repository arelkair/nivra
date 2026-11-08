# Development

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Type-check and build for production. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | Run the linter. |

## Language

The interface ships in Spanish and English. The language is chosen on the setup
screen the first time the app runs, defaults to the browser locale, and can be
changed later under Settings. It is stored under `nivra-lang`.

Translations live in `src/lib/i18n.ts`, keyed by the Spanish source string, so
`t()` is the identity function in Spanish and any missing translation falls back
to it rather than showing a key. Stored values, category names and localStorage
keys are deliberately left untranslated, since changing them would orphan data
already saved on the device.

## Pages and deploy

Nivra lives at `nivra.arelkair.dev`. Every top-level section has its own real
URL, in English regardless of the interface language (`/dashboard`,
`/calendar`, `/tasks`, `/vault`, `/settings`…), so a link can be shared or
reloaded directly. It is still a single-page app: routes are handled
client-side and `vercel.json` rewrites any unknown path back to `index.html`
so a direct load or a refresh never 404s.

## Third-party media

Spotify, YouTube and SoundCloud players load from their own servers and may use
their own cookies. Nivra asks for consent before loading any of them.

## Progressive web app

Nivra ships a web app manifest and a service worker, so it can be installed to
the home screen and opened full screen with its own icon. The application shell
is cached and works offline; only sync and third-party media require a
connection.

## Project structure

```
public/                    Icons, manifest and service worker
supabase/migrations/       Database schema for sync and Google accounts
src/
  App.tsx                  Shell for Classic and shared state
  main.tsx                 Entry point
  index.css                Theme tokens and global styles
  components/
    initiative/            Initiative sections, search, notes and music
      calc/                Scientific calculator engine and modes
      tools/               Image converter, PDF tools and Base64
      vault/               Markdown renderer, graph and importer
    lab/                   Classic laboratory tools
  lib/                     Domain model, persistence, sync and helpers
  pages/                   One module per Classic section
```

## Tech stack

React 19, TypeScript, Tailwind CSS 4 and Vite. Supabase (Auth and Postgres) for
the optional sync, with `@supabase/supabase-js` loaded only on demand. Arbitrary-precision maths with
`decimal.js`, PDF editing with `pdf-lib`, and lazily loaded codecs (`gifenc`,
`utif`, `heic2any`, `@jsquash/avif`) for the image converter.
