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

- [ ] **6. Complete Application Data Backup & Restore (JSON Export/Import)** <!-- id: update-6 -->
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
