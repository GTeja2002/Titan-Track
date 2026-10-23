# TitanTrack — Setup, Deployment & Android Guide

Everything needed to go from this repo to: a production web app on your
domain, a cloud database with your history, and the app installed on your
Android phone. Steps marked **[you]** need your accounts; nothing in the repo
can do them for you.

---

## 1. Architecture in one minute

```
 Android app (Capacitor WebView) ─┐
                                  ├─► Supabase (Postgres + Auth, HTTPS)
 Web app (static, your domain) ───┘      • RLS: each user sees only their rows
                                         • no custom server to run
```

* **Frontend:** Vite + React. The same build is the web app and the APK.
* **Backend:** Supabase. There's no server of our own. Auth, the database and the
  security rules all live in Supabase. The only keys in the app are the
  **public** anon key and URL. Row Level Security is what protects data.
* **Local-first:** every change saves to the device instantly, then syncs.
  You can log offline, and it syncs when you're back online (`src/lib/sync.js`).

---

## 2. Supabase project **[you]**

1. Create a project at <https://supabase.com/dashboard> (a region near you, e.g.
   Mumbai `ap-south-1`).
2. **Run the migration.** Either:
   * Dashboard → SQL Editor → paste
     `supabase/migrations/20261023000000_secure_per_user_schema.sql` → Run, or
   * `npx supabase link --project-ref <ref>` then `npx supabase db push`.

   It's safe to run more than once. It creates `profiles`, `daily_logs`,
   `meal_entries`, `custom_foods`, `app_settings`, turns on owner-only RLS, and
   **locks the old `titan_track_state` table**. Before this, anyone holding the
   anon key could read or write every row in it, and its
   `titan_global_user_directory` row (every user's email and body stats) gets
   deleted. Existing users get their own old data back automatically on first
   sign-in, through `claim_legacy_state()`.
3. **Auth → Providers → Email:** enabled. **Auth → Email Templates → Magic
   Link:** make sure the template contains `{{ .Token }}`, so the email shows
   the 6-digit code the app asks for. For example:
   `<p>Your TitanTrack code: <strong>{{ .Token }}</strong></p>`
4. **Auth → URL Configuration:**
   * Site URL: `https://<your production domain>`
   * Redirect URLs: `https://<your domain>`, `http://localhost:5173`,
     `com.titantrack.app://auth-callback`
5. **SMTP (strongly recommended) [you]:** Supabase's built-in email sender
   only allows a few emails per hour and is meant for testing. Add your own
   SMTP (Resend, Brevo, Amazon SES, etc.) under Auth → SMTP Settings before you
   invite other people.
6. Copy **Project URL** and **anon public key** (Settings → API) into
   `.env.production` (from `.env.production.example`). **Never** use the
   `service_role` key in this app.

### Google sign-in (optional) **[you]**
1. Google Cloud Console → APIs & Services → Credentials → **OAuth client ID →
   Web application**.
   * Authorized JavaScript origins: `https://<your domain>`, `http://localhost:5173`
   * Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
2. Supabase → Auth → Providers → Google: paste the client ID and secret, and
   enable it.
3. Put the client ID in `VITE_GOOGLE_CLIENT_ID`. On the web, the Google button's
   token is verified by Supabase. In the Android app, sign-in opens Google in
   the system browser and comes back through `com.titantrack.app://auth-callback`.
   No separate Android client ID is needed for this flow.

---

## 3. Data retention, backups and limits

**What the app does:**
* Nothing is ever deleted automatically. The old code deleted logs older than
  365 days; that code is gone and there's a test proving it stays gone. History
  is kept **indefinitely**, until you delete it yourself (Clear History, or
  Delete Account).
* Every meal entry stores a snapshot of its nutrition, so editing or deleting a
  custom food never changes past totals.
* Deletes are "soft" (`deleted_at`) so they sync to every device.

**What Supabase itself guarantees depends on your plan. Check
<https://supabase.com/pricing> before relying on any of this.** Third-party
summaries as of Oct 2026 say:

| | Free | Pro ($25/mo per org) |
|---|---|---|
| Database size | 500 MB | 8 GB included |
| Inactivity | **Project pauses after ~7 days with no activity** (data kept; you un-pause it in the dashboard) | Never paused |
| Backups | Limited, don't rely on them | Daily backups (confirm retention on the pricing page) |
| Point-in-time recovery | No | Paid add-on |

Rough size: one person logging ~10 items a day uses well under 5 MB a year,
so 500 MB covers many users for years. **The main risk on Free is pausing and
backups, not space.**

**Recommendation:** while it's just you, Free plus the encrypted backup workflow
below is enough, as long as you open the app at least once a week. Move to Pro
before you invite other people.

**Independent encrypted backup:** `.github/workflows/backup.yml` runs a daily
`pg_dump`, encrypts it with AES-256 using a passphrase only you hold, and keeps
each dump as a GitHub artifact for 90 days. Setup **[you]**: add the secrets
`SUPABASE_DB_URL` and `BACKUP_PASSPHRASE` (the instructions are at the top of
the file). To restore:
```bash
gpg -d titantrack-2026-10-23.sql.gz.gpg | gunzip | psql "$SUPABASE_DB_URL"
```
Each user can also download their own data at any time: Settings → Your data
(JSON, plus CSV that opens in Excel or Sheets).

---

## 4. Web app on the StepCurve domain **[you]**

The repo has no StepCurve configuration and no hosting setup, so I need two
answers from you first: **who your DNS provider/registrar is** and **which host
you want**. Any static host works. These steps use Vercel; Netlify and
Cloudflare Pages work the same way.

1. Import the GitHub repo in Vercel. Build command `npm run build:prod`, output
   directory `dist`.
2. Environment variables (Production): `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_CLIENT_ID`,
   `VITE_AUTH_REDIRECT_URL=https://<your domain>`.
3. Vercel → Domains → add e.g. `app.<your-domain>`. Vercel shows the exact
   record to create. Typically:
   * subdomain: `CNAME  app  →  cname.vercel-dns.com`
   * apex domain: `A  @  →  76.76.21.21`

   Add **only** that record at your DNS provider and change nothing else. HTTPS
   certificates are issued automatically once DNS resolves.
4. Put the final URL into Supabase (Site URL + Redirect URLs) and into Google's
   authorized origins (section 2).

The production build **refuses** to build if any `VITE_` URL points at
`localhost`, `127.0.0.1` or `10.0.2.2`, or if the Supabase URL isn't `https://`.

---

## 5. Android app

The Android project is in `android/`: app id `com.titantrack.app`, name
TitanTrack, version 1.0.0 (code 1). It requests the INTERNET permission only,
and Android auto-backup is off.

### Option A: let GitHub build the APK (nothing to install)
1. **[you]** Add repo secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   (and optionally `VITE_GOOGLE_CLIENT_ID`).
2. Push. The **CI** workflow runs the tests, then builds `app-debug.apk`.
3. Open the Actions run → *Artifacts* → download `titantrack-debug-apk`.

### Option B: build on your PC
Needs **JDK 21** and the **Android SDK**. Installing Android Studio gives you
both. This PC currently has JDK 11 and no SDK.
```bash
npm ci
cp .env.production.example .env.production   # fill in real values
npm run android:apk:debug
# → android/app/build/outputs/apk/debug/app-debug.apk
```
`npm run android:open` opens the project in Android Studio, which can run it
on a connected phone.

### Signed release APK
1. Create a keystore once and **back it up**. If you lose it, you can never
   update the installed app:
   ```bash
   keytool -genkeypair -v -keystore titantrack-release.jks -alias titantrack \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Create `android/keystore.properties` (it's gitignored):
   ```
   storeFile=../titantrack-release.jks
   storePassword=…
   keyAlias=titantrack
   keyPassword=…
   ```
3. `npm run android:apk:release` → `android/app/build/outputs/apk/release/app-release.apk`

   Or in CI: base64-encode the .jks into the `ANDROID_KEYSTORE_BASE64` secret,
   add `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and
   `ANDROID_KEY_PASSWORD`, then run the CI workflow manually with *release*
   ticked.
4. For every new version, bump `versionCode` (it must increase) and
   `versionName` in `android/app/build.gradle`.

### Install on your phone
* **USB:** turn on Developer options → USB debugging, then
  `adb install -r app-debug.apk`.
* **File:** copy the APK to the phone, open it, and allow *Install unknown apps*
  for your file manager or browser when Android asks.
* A debug APK and a release APK are signed differently. Uninstall one before
  installing the other.

### What's handled on mobile
Sign-in (emailed code works in-app; Google goes out to the system browser and
back), the bottom tab bar, safe areas, the keyboard, and the Android back
button (closes the open sheet, then goes back to Dashboard, then backgrounds
the app). The app resyncs when it returns to the foreground or the network
comes back. Your data survives reinstalls: sign in again and it restores from
the cloud.

---

## 6. Feature flags: Achievements and Competitions

Both are **off**. While off, they show a "Coming soon" card, send no requests
and write nothing. To turn one on for everyone without a rebuild, run this in
the Supabase SQL editor:
```sql
update app_settings
set value = jsonb_set(value, '{achievements}', 'true'), updated_at = now()
where key = 'feature_flags';
```
Apps pick it up on next launch. You can also set
`VITE_FEATURE_ACHIEVEMENTS=true` / `VITE_FEATURE_COMPETITIONS=true` at build
time; the database row wins over the env var.
Competitions still needs a backend (challenge, participant and score tables)
before it's useful. The page shows real data or empty states, never fake
users.

---

## 7. Testing

| Command | What it covers |
|---|---|
| `npm test` | 278 unit and integration tests: nutrition maths and validation, sync (two devices, retries, offline, deletions, last-write-wins), migration + RLS on real Postgres (PGlite), cloud sign-in UI, locked features, custom-food UI |
| `npm run test:e2e` | Playwright, desktop + Pixel 7: log a custom food, reload, data still there; validation; locked features; no sideways scrolling; history |
| `npm run build:prod` | Production build with the localhost guard |

**Manual cloud-sync check** (after section 2):
1. Sign in on the web, log a custom food, and wait for "saved to your account".
2. Sign in with the same email on the phone. The entry and the food appear.
3. Put the phone in airplane mode and log something. The status says "offline".
   Turn the network back on and it syncs, then appears on the web after a
   refresh.
4. Delete it on the web. It disappears on the phone after the app comes back
   to the foreground.
5. Sign in with a different account. None of the first account's data is
   visible.
