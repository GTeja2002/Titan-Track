# TitanTrack - Application Updates Roadmap (`data.md`)

This document outlines the planned feature updates, UX enhancements, and structural improvements for TitanTrack. Tasks will be implemented sequentially, one by one.

---

## 📋 Feature Updates Roadmap

- [x] **1. Dedicated Water Intake & Hydration Tracker Card** <!-- id: update-1 -->
  - **Goal**: Create an interactive, visual hydration card on the Dashboard.
  - **Features**:
    - Quick-add cup buttons (+250ml, +500ml, +750ml).
    - Customizable daily goal (in mL / Liters based on user weight).
    - Hydration progress ring and daily goal completion celebration.
    - Persistent logging in `state.logs[currentDate].water`.

- [ ] **2. Interactive Macro Budget & Distribution Visualizer Card** <!-- id: update-2 --> *(partially done)*
  - **Goal**: Give users a real-time breakdown of remaining macronutrient budgets.
  - **Features**:
    - [x] Progress bars for Protein, Carbs, Fats, and Fiber with remaining targets.
      (Built as `MacroBar` — used in `FoodLogCard.jsx` and `HealthWellnessInsights.jsx`.)
    - [ ] Visual macro distribution pie / stack bar chart.
    - [ ] Status badges (e.g. "Protein Target Hit", "Carb Surplus").
    - [ ] Pull the above together into one dedicated card.

- [ ] **3. Detailed Workout Planner & Exercise Library** <!-- id: update-3 -->
  - **Goal**: Expand gym logging into a multi-exercise strength & cardio logger.
  - **Features**:
    - Built-in exercise library categorized by muscle group (Chest, Back, Legs, Arms, Core, Cardio).
    - Set, Rep, and Weight logging per exercise.
    - Total volume calculation (kg lifted) and Personal Record (PR) tracking.

- [ ] **4. Custom Recipe & Meal Creator** <!-- id: update-4 -->
  - **Goal**: Allow users to save custom multi-ingredient recipes.
  - **Features**:
    - Recipe creator modal to combine ingredients from `FOOD_DB`.
    - Auto-calculation of total calories, protein, carbs, fats, and fiber.
    - Save recipes to user's `availableFoods` list for quick logging.

- [x] **5. Dynamic Achievement Badges & Milestone Tracker** <!-- id: update-5 -->
  - **Goal**: Convert static achievement UI into an automated gamified system.
  - **Features**:
    - Automated detection of 7-day streak, 30-day streak, 100k steps, protein target streaks, etc.
    - Interactive Achievement Gallery displaying unlocked vs locked badges.

- [x] **6. Complete Application Data Backup & Restore (JSON Export/Import)** <!-- id: update-6 -->
  - **Goal**: Provide full data portability for user profiles and history logs.
  - **Features**:
    - Export complete state (profile + daily logs) as a `.json` backup file.
    - Import `.json` backup to restore data onto any device or browser.

---

## 🛠️ Execution Process
1. Select the top uncompleted task from `data.md`.
2. Implement feature code in `src/`.
3. Verify build & functionality.
4. Mark task as `[x]` completed in `data.md` and proceed to the next update.

---

## 🎯 Audience Roadmap (Gen Z)

Added after a review of how the app's framing, friction and platform fit the
audience it wants. The finding that drove most of this: every new profile used
to start as a 42-year-old man at 97.5kg with a lose-fat goal, which made weight
loss the implicit identity of the product before the user had said anything.

### Done

- [x] **A1. Stop assuming everyone is here to lose weight** <!-- id: genz-1 -->
  - Non-scale goals (stay consistent, get stronger, feel better, eat better),
    with "stay consistent" as the default. `src/lib/goals.js`.
  - Neutral defaults — age, height, weight, sex and goal weight are asked for,
    not assumed.
  - Onboarding asks the goal first; weight is only requested when the goal is
    actually about the scale, or when the user opts in.
  - `ConsistencyCard` replaces the "% to goal weight" ring for non-scale goals.
  - Body-fat silhouettes are opt-in and off by default.

- [x] **A2. Age-appropriate safety** <!-- id: genz-2 -->
  - Under-18s are not offered weight-loss goals, and never receive a
    below-maintenance calorie target. A 1200 kcal floor is an adult floor.
  - "Rather not say" for sex, using the midpoint of Mifflin-St Jeor's constants
    instead of silently counting that person as male.

- [x] **A3. Logging in a tap, not in grams** <!-- id: genz-3 -->
  - Household portions — "1 bowl", "2 rotis", "a handful". `src/lib/portions.js`.
  - Your own most-logged foods surfaced first, plus "repeat yesterday".
    `src/lib/recentFoods.js`.

- [x] **A4. Phone-first** <!-- id: genz-4 -->
  - Installable PWA: manifest, icons, offline service worker.
  - Bottom tab bar on phones, with safe-area handling.

- [x] **A5. Wellbeing beyond the body** <!-- id: genz-5 -->
  - Daily mood, sleep and energy check-in. `WellbeingCard`.
  - Optional cycle tracking with phase context. `src/lib/cycle.js`.

- [x] **A6. Streaks that forgive** <!-- id: genz-6 -->
  - Rest days and streak freezes, so one missed day does not reset the count.
    `src/lib/streak.js`.

- [x] **A7. Make it yours** <!-- id: genz-7 -->
  - Six accent themes. `src/lib/accents.js`.

### Blocked — needs a decision or a key, not just code

- [ ] **A8. Real authentication** <!-- id: genz-8 -->
  - Login is a local profile key: typing any email opens that profile, and the
    Supabase RLS policy lets anyone with the anon key read or write any row.
    The six-digit code shown at sign-in is generated and checked in the browser.
  - **This blocks everything social.** Nobody should share health data through
    an account anyone can open. Needs Supabase Auth and a scoped RLS policy.

- [ ] **A9. Real social, in small groups** <!-- id: genz-9 -->
  - The Community tab is hardcoded: fake users, fake likes, a "Join Challenge"
    button with no handler.
  - Build friend-invite links and 3–6 person challenges rather than a public
    feed — this audience shares with close friends, not broadcast.
  - Depends on A8.

- [ ] **A10. Photo and barcode food logging** <!-- id: genz-10 -->
  - The next step after portions. Needs a vision model (an API key) and a
    barcode scanning dependency.

- [ ] **A11. An assistant that answers in context** <!-- id: genz-11 -->
  - "What can I eat tonight to hit 120g protein with what's in my fridge?"
    `personalizedPlanEngine.js` is a rules engine; this needs a model and a key.

- [ ] **A12. Short-form, shareable content** <!-- id: genz-12 -->
  - `wellnessContent.js` is static text. Make tips swipeable and shareable as
    images.
