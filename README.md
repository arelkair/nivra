# Nivra

A privacy-first personal organizer for the browser. Calendar, timetable, tasks,
exams, notes and personal finances, all stored on your own device.

No account required, no tracking. Everything lives in `localStorage` unless you
explicitly turn on the optional end-to-end encrypted sync, either with a code or
with a Google account.

Nivra ships two interfaces over the same data:

- **Nivra Classic**, the original layout with swappable dashboard blocks,
  backgrounds, themes and the full toolset.
- **Initiative** (beta), a minimalist redesign with its own sections, a note
  vault, a laboratory of tools, global search and more. Switch between the two
  at any time with the button next to Settings; nothing is lost.

## Features

| Area | What it does |
| --- | --- |
| **Dashboard** | Today at a glance: clock, current class, day agenda, tasks, exams, grades, subscriptions, money and a rotating countdown. |
| **Calendar** | Month and week views with holidays, tasks, exams and projects. Supports weekly, monthly and yearly recurrence, plus anniversaries and custom day marks. |
| **Timetable** | Weekly blocks with named profiles, drag to create, move and resize, and import or export as JSON or CSV. |
| **Tasks** | Subtasks, descriptions, subjects, a working date and a separate due date. |
| **Exams & projects** | Due dates, subjects (with their colour), linked notes and the grade obtained. |
| **Grades** | Per subject and per term, with averages and optional weighting. |
| **Money** | Several bank accounts with their own balance, income and expenses by category, savings goals and spending limits. |
| **Wishlist** | Items with price, priority and purchase link. |
| **Subscriptions** | Recurring charges on their renewal day, paused when the balance would go negative, with who pays each one. |
| **Reminders** | Grouped by urgency, with snooze, repeat and a link to an exam or project. |
| **Countdowns** | A main countdown, filters, ordering and creation from an exam. |
| **Vault** | Markdown notes with folders, wikilinks, tags, backlinks, tables, an interactive graph and Obsidian import. |

Subjects are managed in Settings and are also detected automatically from the
names used in the timetable.

### Initiative extras

- **Laboratory**: scientific calculator (arbitrary precision, fractions,
  complex numbers, calculus, statistics, equations, base-N, matrices and
  tables), dice, roulette, image converter (11 formats including AVIF, ICO,
  TIFF and HEIC input), PDF tools (merge, split, rotate, images to PDF) and
  Base64. Files are processed in the browser and never uploaded.
- **Links to Initiative** inside vault notes: the editor's Initiative button inserts
  a link to a section or to an exact task, exam, reminder, wish, subscription,
  countdown or calendar day (`[text](nivra:tareas/ID)`).
- **Global search** across every section and the contents of vault notes.
- **Keyboard shortcuts**, all configurable, with a cheat sheet on `?`.
- **Music and ambience** player for Spotify, YouTube and SoundCloud links and
  playlists, plus ambient sounds and a sleep timer.
- **Quick note**, a small draggable window that writes into the vault.

Also included: Spanish and English interfaces, undo for deletions, light and
dark themes, browser notifications, automatic daily backups, JSON and CSV
exports and `.ics` export.

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

## Data storage

All application state is kept in `localStorage` under `nivra-*` keys. Clearing
those keys resets the application to a clean state.

A snapshot is stored once a day in IndexedDB and the last 14 are kept, so a
mistake can be undone from Settings. Backups can also be exported as JSON, which
can be imported back, or as CSV for use in a spreadsheet. The calendar and
timetable can be exported as `.ics` files for Google Calendar or Apple
Calendar.

Data lives only in the browser that created it. Clearing site data, switching
browser or changing computer loses it, so keep an exported backup somewhere
safe.

## Optional device sync

Sync is disabled by default. Nothing leaves the browser until it is turned on.
There are two ways to link devices, both end-to-end encrypted with AES-GCM, so
the server only ever holds ciphertext it cannot read.

### With a code (no account)

Creating a code derives two independent values from it:

- an **identifier** (SHA-256), the only value sent to the server, used as the
  address of the stored blob;
- an **encryption key** (PBKDF2, 200 000 iterations), which never leaves the
  device.

Entering the same code on another device downloads and decrypts that data and
keeps both devices in sync. Without the code the data is unrecoverable.

### With a Google account

Settings > Sync (in Classic, or Settings > Sync in Initiative) > **Continue with Google** signs in through Supabase Auth
(OAuth with PKCE) and creates the account the first time. Google only
identifies the person; it never sees the data.

- The first time, you choose a **passphrase** (12 characters or more). The
  encryption key is derived on the device with PBKDF2 (600 000 iterations) and a
  random per-account salt, and is kept on the device like the code is. Neither
  the passphrase nor the key is ever sent.
- On another device, sign in with the same Google account and enter the same
  passphrase. A wrong passphrase is detected because the existing data fails to
  decrypt.
- The server stores one row per account in `account_vaults` (salt and
  ciphertext), protected by row level security so each user can only touch their
  own row. The salt cannot be changed after creation.
- **Sign out on this device** ends sync here and drops the local session, but
  keeps the data. **Delete my cloud data** removes the stored row.
- A forgotten passphrase cannot be recovered. This is the price of the server
  being unable to read the data.

The Google session lives under `sb-nivra-auth` in `localStorage`, deliberately
outside the `nivra-` prefix so it is never synced or exported.

### How it syncs

Both devices can be edited at the same time. Changes are pushed about a second
after an edit. Every four seconds a device asks the server only for the
timestamp of the stored data (a few dozen bytes) and downloads the blob only
when it changed or when there are local edits to upload, which keeps bandwidth
low. Each section carries its own timestamp and is merged independently, so
editing tasks on one device and notes on another preserves both. Simultaneous
edits to the same section resolve to the most recent one.

### Backend setup

The schema lives in `supabase/migrations`. For Google sign-in, in the Supabase
dashboard enable **Authentication > Providers > Google** with a Google OAuth
client ID and secret (type "Web application"), add
`https://<your-supabase-ref>.supabase.co/auth/v1/callback` as an authorised
redirect URI in Google Cloud, and list the app's URLs (for example
`https://nivra.arelkair.dev/**` and `http://localhost:5173/**`) under
**Authentication > URL Configuration > Redirect URLs**.

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
