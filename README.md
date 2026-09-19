# TitanTrack

A weight-loss / body-composition tracker: goal progress, food + activity logging, a
ClyHealth-style diagnostics dashboard, and a real photo-based body composition viewer.

This is the production build — a proper Vite + React project (real bundling,
tree-shaking, minification), split into modules, with secrets pulled from
environment variables instead of hardcoded in source.

## Quick start (local)

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. That's it — no `.env` file is required to run
it. Every optional integration below degrades gracefully when unset: Google
sign-in shows as not-configured, cloud sync just doesn't happen (your data
still saves to localStorage), and the login background falls back to a
gradient instead of a broken video.

## Project structure

```
src/
  lib/
    config.js          # reads all env vars — the only place secrets are referenced
    supabaseClient.js   # Supabase client + push/pull helpers
    auth.js              # Google JWT decode helper
    calculations.js      # pure functions: BMI, BMR, TDEE, body-fat, projections, food DB
    useAppState.js       # the app's single state hook (localStorage + Supabase sync)
  components/
    LoginScreen.jsx, OnboardingScreen.jsx
    GoalCard.jsx, EnergyCard.jsx, FoodLogCard.jsx, TrendCard.jsx, ActivityCard.jsx
    CalendarModal.jsx, BodyCompositionDashboard.jsx, ClyHealthDashboard.jsx, ProfileDrawer.jsx
    shared/  (MetricStatusTag, GoogleLogo, MacroBar)
  App.jsx, main.jsx, index.css
public/
  assets/    # body reference photos, login video, onboarding background
```

## Setting up cloud sync (Supabase)

Your daily data (weight, food log, activity, profile) already saves instantly
to localStorage — this step is only needed if you want that data to also
persist to the cloud (e.g. survive clearing browser data, or sync across
devices/browsers under the same login).

**1. Create a free project** at [supabase.com](https://supabase.com) → New Project.

**2. Create the table.** In your project's SQL Editor, run:

```sql
create table titan_track_state (
  user_key text primary key,
  state jsonb not null,
  updated_at timestamptz default now()
);

alter table titan_track_state enable row level security;

-- This app doesn't use Supabase Auth (it's a lightweight local-profile login,
-- not real authentication) — so there's no auth.uid() to scope rows by. This
-- policy allows anyone with your anon key to read/write any row. That's fine
-- for a personal/local tool, but be aware of it before treating this as a
-- real multi-user product. If you need real per-user security, you'd add
-- Supabase Auth and scope this policy to auth.uid() = user_key instead.
create policy "public read/write (no real auth in this app)"
  on titan_track_state for all
  using (true)
  with check (true);
```

**3. Get your API keys.** Project Settings → API → copy the **Project URL**
and **anon public** key.

**4. Add them to `.env`:**

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**5. Restart the dev server.** The footer indicator at the bottom of the app
will switch from "auto-saved locally" to "synced to cloud" once it's working.
Any sync failure (offline, misconfigured, RLS issue) is logged to the browser
console as a warning and never blocks or breaks the app — it just keeps
working off localStorage.

## Setting up Google Sign-In (optional)

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create Credentials → OAuth client ID → Web application.
2. Add `http://localhost:5173` (dev) and your production URL under **Authorized JavaScript origins**.
3. Add the client ID to `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

Until this is set, the Google button is intentionally shown disabled rather
than pretending to work — email/phone login (no real auth, just a local
profile key) works either way.

## Building for production

```bash
npm run build
```

Outputs a static site to `dist/` — `index.html` plus hashed, minified JS/CSS
and the `assets/` folder. This is a static site: no server-side code, no
Node process needed to run it, so it deploys to any static host.

Preview the production build locally before deploying:

```bash
npm run preview
```

## Deploying

`dist/` is a plain static site. Any of these work with zero extra config:

- **Vercel / Netlify** — connect the repo, build command `npm run build`, output directory `dist`. Add your `VITE_*` env vars in their dashboard (not in a committed `.env`).
- **Any static host** (S3+CloudFront, GitHub Pages, Cloudflare Pages, etc.) — run `npm run build` and upload the contents of `dist/`.

Remember: `VITE_*` values are inlined into the JS bundle at build time, so
they're set as build-time environment variables on whichever platform you
use — not read at runtime, and not something you can change without a
rebuild.

## Security notes (read before treating this as more than a personal tool)

- Login here is a **local profile key** (your email/phone labels a
  localStorage/Supabase row), not real authentication — there's no password,
  no verification, nothing stopping someone from typing in any email and
  loading whatever `user_key` happens to exist. Fine for personal use; not
  fine for a real multi-user product without adding actual auth.
- The Supabase RLS policy above is permissive by design (see the comment in
  the SQL) because there's no `auth.uid()` to scope by without real auth.
  Anyone with your anon key — which is necessarily public, it ships in your
  JS bundle — can read/write any row in that table.
- The Google credential is decoded client-side without signature
  verification (see `src/lib/auth.js`) — sufficient to read an email for this
  app's purposes, not sufficient as a real trust boundary. A real backend
  would verify the JWT signature server-side.
