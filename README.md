# Nivra

A privacy-first personal organizer for the browser. Calendar, timetable, tasks,
exams, notes and personal finances, all stored on your own device.

No account, no tracking, no backend. Everything lives in `localStorage` unless
you explicitly turn on the optional end-to-end encrypted sync.

## Features

| Area | What it does |
| --- | --- |
| **Dashboard** | Today at a glance: balance, activities, tasks, upcoming work and reminders. |
| **Calendar** | Month and week views with holidays, tasks, exams and projects. Supports weekly, monthly and yearly recurrence, plus anniversaries and custom day marks. |
| **Timetable** | Weekly blocks with multiple named profiles. Blocks can be dragged between days. |
| **Tasks** | Subtasks, descriptions, subjects and an optional date that promotes them to the calendar. |
| **Exams & projects** | Due dates, subjects, linked notepads and the grade obtained. |
| **Grades** | Per subject and per term, with averages. |
| **Bank** | Balance, income and expenses by category, savings goals and spending limits. |
| **Wishlist** | Items with price and purchase link. |
| **Subscriptions** | Recurring charges billed automatically on their renewal day. |
| **Notepad** | Rich-text notes with pages, full-text search and word counts. |
| **Countdowns** | Multiple countdowns with configurable units. |
| **Reminders** | Date, time and optional link to an exam or project. |

Also included: global search, configurable keyboard shortcuts, undo for
deletions, light and dark themes with ten accent colours, an optional
time-of-day theme, browser notifications, JSON/CSV backups and `.ics` export.

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

Backups can be exported as JSON, which can be imported back, or as CSV for use
in a spreadsheet. The calendar and timetable can also be exported as `.ics`
files for Google Calendar or Apple Calendar.

## Optional device sync

Sync is disabled by default. Nothing leaves the browser until it is turned on.

Creating a code derives two independent values from it:

- an **identifier** (SHA-256), the only value sent to the server, used as the
  address of the stored blob;
- an **encryption key** (PBKDF2, 200 000 iterations), which never leaves the
  device.

Data is encrypted with AES-GCM before upload, so the server only ever holds
ciphertext it cannot read. Entering the same code on another device downloads
and decrypts that data and keeps both devices in sync. Without the code the
data is unrecoverable.

Both devices can be edited at the same time. Changes are pushed within a couple
of seconds and pulled every four, then applied without a reload. Each section
carries its own timestamp and is merged independently, so editing tasks on one
device and notes on another preserves both. Simultaneous edits to the same
section resolve to the most recent one.

## Progressive web app

Nivra ships a web app manifest and a service worker, so it can be installed to
the home screen and opened full screen with its own icon. The application shell
is cached and works offline; only sync requires a connection.

## Project structure

```
public/            Icons, manifest and service worker
src/
  App.tsx          Layout, navigation and shared state
  main.tsx         Entry point
  index.css        Theme tokens and global styles
  components/      Reusable UI and cross-cutting panels
  lib/             Domain model, persistence, sync and helpers
  pages/           One module per section
```

## Tech stack

React 19, TypeScript, Tailwind CSS 4 and Vite.
