# Data and sync

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

### With an account (Google or e-mail)

Settings > Sync (in Classic, or Settings > Sync in Initiative) offers
**Continue with Google** (Supabase Auth, OAuth with PKCE) or **e-mail and
password** (sign up, sign in and a "forgot my password" link). Signing in and
signing up are the same step for Google. Either way the account only
identifies the person; it never sees the data. The login password is separate
from the passphrase below, and the passphrase is never sent anywhere.

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
- **Moving from a code**: a device connected with a code shows **Move to an
  account**. It first pulls the latest data from the code, then uploads it to
  the account (or, if the account already has data, merges both sides by
  timestamp). The code's data is not deleted and keeps working on every device
  still using it; each of those devices has to be moved separately.
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
`https://nivra.arelkair.dev/` and `http://localhost:5173/`) under
**Authentication > URL Configuration > Redirect URLs**.

E-mail and password sign-up sends a confirmation e-mail, and password recovery
sends a link. Supabase's built-in mail service only delivers to members of your
organisation and is heavily rate limited, so for real users configure a custom
SMTP server under **Authentication > Emails > SMTP Settings**. Without one,
either use Google or turn off **Confirm email** (which also leaves recovery
unavailable).
