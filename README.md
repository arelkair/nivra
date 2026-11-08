# Nivra

A private organizer for your browser. Calendar, timetable, tasks, exams, notes and
personal finances, with everything stored on your own device.

No account and no tracking.

## Why Nivra

- **Local first.** Your data lives in the browser. Nothing is sent anywhere unless you
  turn on sync.
- **Private sync, if you want it.** Link devices with a code or an account. Data is
  encrypted on your device with AES-GCM, so the server only ever holds ciphertext.
- **Works offline.** Installable as a web app, with the interface cached on your device.
- **Two interfaces, one dataset.** Switch between them at any time without losing
  anything.
  - **Classic**: the original layout, with swappable dashboard blocks, backgrounds and
    themes.
  - **Initiative** (beta): a minimalist redesign with a note vault, a laboratory of
    tools and global search.

## What it does

| Area | Highlights |
| --- | --- |
| **Dashboard** | Today at a glance: current class, agenda, tasks, exams, money and countdowns |
| **Calendar** | Month and week views, holidays, recurring events and `.ics` export |
| **Timetable** | Weekly blocks with profiles; import and export as JSON or CSV |
| **Tasks and reminders** | Subtasks, working and due dates, snooze and repeat |
| **Exams and grades** | Due dates, subjects, averages and optional weighting |
| **Money** | Accounts, income and expenses, savings goals, spending limits, subscriptions and a wishlist |
| **Vault** | Markdown notes with folders, wikilinks, tags, backlinks, a graph and Obsidian import |
| **Laboratory** | Scientific calculator, image converter, PDF tools, dice and more, all processed in the browser |
| **Also** | English and Spanish, light and dark themes, notifications, daily backups, shortcuts and a music player |

## Run it locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

## Documentation

- [Development](docs/development.md): scripts, structure, routes, deploy and tech stack
- [Data and sync](docs/sync.md): storage, backups, encrypted sync and backend setup

## License

Nivra is released under the [GNU Affero General Public License v3.0](LICENSE).
