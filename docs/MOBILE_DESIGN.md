# TitanTrack — Mobile Design System & Screen Inventory

How the Android-first layout works, which tokens to use, and the audit of
every screen. Read this before adding a screen or a card.

---

## 1. Navigation

| Phone (bottom tab bar) | Desktop (sidebar) | Notes |
|---|---|---|
| Home | Dashboard | |
| Meals | Nutrition | Food log is the first card on phones |
| Activity | Workouts | |
| Progress | Progress | Includes History |
| Profile | Settings | Also holds Community (secondary destination) |
| — (in Profile) | Community | Locked behind the `competitions` flag |

* Five tabs at most on phones. New, less-frequent destinations go in Profile → More.
* Android back: closes the topmost sheet or dialog (`lib/dismiss.js`), then
  retraces tab history, then backgrounds the app.
* Each tab opens scrolled to the top.
* The tab bar hides while the on-screen keyboard is up (`lib/useKeyboardAware.js`).

## 2. Tokens (in `src/index.css`)

| Token | Phone | Desktop | Use |
|---|---|---|---|
| `--space-page` | 16px | 24px | side gutter (`.app-content`) |
| `--space-section` | 14px | 20px | gap between cards (`.page-stack`) |
| `--space-card` | 16px | 20px | card padding |
| `--radius-card` | 18px | | every card |
| `--radius-control` | 12px | | buttons and inputs |
| `--tap` | 44px | | minimum touch target |
| `--nav-h` | 64px | | tab bar height (plus `--safe-bottom`) |
| `--safe-top/bottom/left/right` | `env(safe-area-inset-*)` | | system bars and notches |

Colour: use the existing `--color-*`, `--primary*`, `--text*`, `--border*`
tokens, and the per-metric family `--m-{calories|protein|water|steps|streak}-{wash,edge,ink,track}`.
**Never hard-code a light hex for a background.** Every token has a dark-mode
value under `body.dark`.

## 3. Building blocks

| Class / component | What it is |
|---|---|
| `.page-stack` | Vertical page layout with the standard section gap |
| `.m-card` | Standard card: surface, border, radius, padding |
| `.section-title` / `.section-sub` | Card heading and subheading |
| `.metric-grid` | Metric tiles: 2 columns on phones, 1 column at large text sizes (rem-based minimum), 4 at ≥1280px |
| `.sheet` / `.sheet-body` / `.sheet-actions` | Bottom sheet: scrolling body, action bar pinned above the keyboard and gesture area |
| `<PageHeader>` | Title, subtitle and optional icon/action for every tab |
| `<MetricRow>` / `<MetricCard>` | The four daily numbers. **One** source: `lib/dailyTotals.js` |
| `<TodayCard>` | Phone home: quick actions + today's meals from the real log |
| `<LockedFeature>` | "Coming soon" state for flagged features |

**Phone vs desktop ordering:** pages are a flex column on phones and a grid on
desktop. Column wrappers use `contents lg:flex`, and each card carries
`order-N lg:order-none` (literal class strings; Tailwind can't see classes
built at runtime).

**Rules that prevent layout bugs:**
* Any flex or grid child that holds text or a scroller gets `min-w-0`.
* Long names use `line-clamp-2 break-words`, never a fixed width.
* Value and target go on separate lines in tiles, so numbers never collide.
* Inputs are 16px on phones, so Android doesn't zoom the page on focus.
* Overlays are portalled to `<body>`. A tab's entry animation creates a
  stacking context that would otherwise put them under the tab bar.

## 4. Screen inventory (audit, Oct 2026)

| Screen | What it does | Found during audit | Fixed / changed | Backend | Tests |
|---|---|---|---|---|---|
| Sign-in | Supabase email code / Google; local mode without env | OK on phones | — | Supabase Auth | `cloudAuth.test.jsx` |
| Onboarding | Goal-first setup | OK | — | profile settings | — |
| Home | Daily overview | Full-screen hero before any data; 4 metrics stacked one per row (~600px); greeting missing the name; chart axis "70,70,70…"; 21px sideways scroll at 320px; dropdown-looking button that only navigated; **calorie target differed from other screens** | 2×2 metric grid first; Today card; decorative blocks desktop-only; axis decimals; one shared target | daily_logs, meal_entries | `responsive.spec.js` |
| Meals | Food log, custom foods, totals, plan | Food log 3rd card down; 4-field row squeezed ("Search or ty…"); meal chips wrapping; names truncated; overview tiles ignored the custom water target | Food log first; stacked search row; 4-up / 2×2 meal picker; wrapped names; overview uses MetricRow | meal_entries, custom_foods | `customFood.test.jsx`, `critical.spec.js` |
| + What I Eat sheet | Custom food entry | Save button could scroll away | Grab handle; scrolling body; pinned actions with live kcal; focused field kept visible | custom_foods | `responsive.spec.js` (320×480) |
| Activity | Walks, gym, streak, totals | Duplicate desktop header card; Energy card labels truncated to "I…", "Bu…" | PageHeader; Energy card wraps under the ring | daily_logs | `responsive.spec.js` |
| Progress | Wellbeing, history, trend, insights | **Body photo shown while body composition was off** | Photo gated on opt-in; daily check-in and history moved up | daily_logs, profiles | `bodyPrivacy.test.jsx` |
| Profile / Settings | Account, prefs, sync, export, delete | Unreachable from the phone tab bar; desktop-style glass blocks | Profile tab; grouped Android-style rows; Community row | profiles, RPC `delete_my_account` | `cloudAuth.test.jsx` |
| Community | Challenges/leaderboard | Locked | Reached from Profile on phones | — (flag) | `lockedFeatures.test.jsx` |
| Calendar | Pick a day | Raw "2026-10-21" label; no accessible name | Localised date, label, 44px | — | — |
| Profile drawer | Edit body stats | Off-brand blue button; footer under the gesture bar | Brand button; safe-area padding | profiles | — |

Also fixed: missing goal weight read as 0 kg (max 1,000 kcal deficit),
water % computed from ml as if glasses, device-wide water target shared by
all accounts, dark-mode contrast on the streak card and hero.

## 5. Test matrix

`npm run test:e2e` runs Playwright in Chromium, covering:

* 320, 360, 390, 430px portrait and 780×360 landscape: every tab, no sideways
  scroll, tab buttons uncovered, last content above the tab bar, Community
  reachable and locked.
* 360px: tiles are a 2×2 grid with even heights and real values.
* 130% text: tiles drop to one column with no overflow.
* Empty brand-new profile: no NaN, undefined or Infinity text.
* Desktop 1366px: sidebar, every section, one row of four tiles.
* Offline banner appears and clears.
* Food sheet at 320×480 (keyboard area simulated): the Add button stays
  visible and tappable.

**Not covered by these:** a real Android device or emulator. A browser
viewport doesn't prove WebView keyboard behaviour, status-bar rendering or
deep links on a phone. See the APK section in `DEPLOYMENT.md`.

Screenshots for review: `node scripts/screenshots.mjs <dir>` (all tabs, all
widths; `DARK=1` for dark mode) and `node scripts/screenshots-overlays.mjs <dir>`
(sign-in, onboarding, sheets, drawer, calendar). Both need the dev server
running on :4173.
