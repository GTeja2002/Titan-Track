# TitanTrack

A food, activity and wellbeing tracker. Goals can be about the scale or not —
the default is consistency, not weight loss — with one-tap food logging,
streaks that forgive a missed day, a daily mood/sleep/energy check-in, and an
optional body-composition view for people who want it.

This is the production build — a proper Vite + React project (real bundling,
tree-shaking, minification), split into modules, with secrets pulled from
environment variables instead of hardcoded in source.

## Quick start (local)

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. No `.env` file is required to run it.
Without Supabase settings the app runs in **local-only mode**: there are no
accounts, an email just labels a profile in this browser, and the login
screen says so. With Supabase configured you get real accounts (an emailed
one-time code, or Google) and per-user cloud sync.

**Going to production, building the Android APK, setting up the domain,
backups and retention: see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).**

## Project structure

```
src/
  lib/
    config.js                 # reads all env vars — the only place config is referenced
    supabaseClient.js         # the Supabase client (null in local-only mode)
    auth.js                   # Supabase Auth: email code, Google, sign-out, delete account
    sync.js                   # local-first two-way sync engine (pure, tested)
    useCloudSync.js           # runs sync: on sign-in, after edits, on reconnect/resume
    nutrition.js              # calorie/macro maths, validation, meal-entry snapshots
    mealLog.js                # pure transforms for entries and custom foods
    features.js               # feature flags (achievements, competitions: off)
    dismiss.js                # Escape / Android-back closes the topmost overlay
    nativeShell.js            # Android: Google deep-link sign-in, back button
    platform.js               # isNativeApp()
    date.js                   # local-calendar date helpers (never use toISOString for dates)
    storage.js                # safe localStorage access (never throws)
    goals.js                  # goal definitions + age-appropriate safety rules
    streak.js                 # streak counting with rest days and freezes
    portions.js               # household portions, so logging isn't done in grams
    recentFoods.js            # your own rotation, derived from log history
    cycle.js                  # optional menstrual cycle phase
    accents.js                # accent themes
    backup.js                 # JSON export / import
    calculations.js           # pure functions: BMI, BMR, TDEE, body-fat, projections, food DB
    wellness.js               # wellness/activity scoring
    wellnessContent.js        # static recipe + tip content
    personalizedPlanEngine.js # builds the personalized meal/workout plan
    useAppState.js            # the app's single state hook (localStorage + Supabase sync)
  components/
    LoginScreen.jsx, OnboardingScreen.jsx
    Dashboard.jsx             # the main dashboard shell
    GoalCard.jsx, EnergyCard.jsx, FoodLogCard.jsx, TrendCard.jsx, ActivityCard.jsx
    WaterTrackerCard.jsx, AchievementsCard.jsx, PersonalizedPlanCard.jsx
    ConsistencyCard.jsx       # streak headline for goals that aren't about weight
    WellbeingCard.jsx         # daily mood / sleep / energy, and cycle
    CalendarModal.jsx, BodyCompositionDashboard.jsx, HealthWellnessInsights.jsx
    ProfileDrawer.jsx
    CustomFoodModal.jsx       # "+ What I Eat"
    HistoryCard.jsx, AccountCards.jsx, CommunityPage.jsx (flagged)
    shared/  (GoogleLogo, MacroBar)
  data/foods.json             # built-in food list (data, not code)
  App.jsx, main.jsx, index.css
supabase/migrations/          # database schema + RLS (run in Supabase)
supabase/tests/               # migration + RLS tests on real Postgres (PGlite)
android/                      # Capacitor Android project
e2e/                          # Playwright end-to-end tests
docs/DEPLOYMENT.md            # production, domain, Android, backups
public/
  assets/    # body reference photos, login video, onboarding background
```

Tests live next to the code they cover and run with `npm test`.
`npm run test:e2e` runs the Playwright suite in a real browser.

## Installing on a phone

* **Android app (APK):** see [docs/DEPLOYMENT.md §5](docs/DEPLOYMENT.md#5-android-app).
* **Browser install (PWA):** the web build ships a manifest and a service
  worker. Open it in a mobile browser and choose "Add to Home Screen".

## Accounts, cloud sync and security

* Sign-in goes through **Supabase Auth**. Email gets a real one-time code;
  Google ID tokens are verified by Supabase, not the browser. The old
  in-browser "OTP" and unverified token decoding are gone.
* Data lives in per-user tables protected by **Row Level Security**: Postgres
  only returns rows whose `user_id` matches the signed-in user. Run
  `supabase/migrations/*.sql` once (see [DEPLOYMENT §2](docs/DEPLOYMENT.md#2-supabase-project-you)).
  The tests in `supabase/tests/rls.test.js` prove one user can't read, write
  or impersonate another.
* Only the public anon key ships in the app. Never put the `service_role` key
  in it.
* Sync is local-first: every edit saves on the device instantly, then syncs.
  Retries are idempotent (record ids come from the device), deletions sync,
  and conflicts resolve last-write-wins per record. The footer shows the real
  status: saved to your account, waiting to sync, offline, or failed.
* History is kept indefinitely. Nothing is auto-deleted.
* Settings has: Sync now, Export (JSON / CSV), Clear history, Sign out (which
  removes your data from this device after confirming it reached the cloud),
  and Delete account.

## Building for production

```bash
npm run build:prod     # uses .env.production; refuses localhost URLs
npm run preview
```

`dist/` is a static site that deploys to any static host. `VITE_*` values are
built into the bundle at build time, so changing them needs a rebuild. Feature
flags are the exception: they can also be flipped at runtime in the
`app_settings` table.

## Backing up your data

* **Per user:** Settings → Your data → full JSON backup (restorable from the
  profile drawer) or CSV. Backups never carry account or sync identifiers, so
  a backup can't move data onto a different account.
* **Whole database:** `.github/workflows/backup.yml` makes a daily encrypted
  `pg_dump`. See [DEPLOYMENT §3](docs/DEPLOYMENT.md#3-data-retention-backups-and-limits).
