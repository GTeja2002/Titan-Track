/* ---------------- lib/useAppState.js ---------------- */
import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateBMR, calculateTDEE, getRemainingDays, calculateDailyCaloriesForAge } from './calculations.js';
import { supabase } from './supabaseClient.js';
import { getSession, onAuthChange, signOut, deleteMyAccount } from './auth.js';
import { stampChanges, newSyncEpoch, clearSnapshot } from './sync.js';
import { useCloudSync } from './useCloudSync.js';
import { getLocalDateString } from './date.js';
import { DEFAULT_GOAL } from './goals.js';
import { accentAttribute } from './accents.js';
import { readLocal, readLocalJSON, writeLocal, removeLocal } from './storage.js';
import { createEmptyLogShape } from './logShape.js';
import { ensureEntryIds } from './mealLog.js';

export const defaultState = {
  isDarkMode: false,
  gymStarted: false,
  calorieTarget: 2302,
  logs: {},
  currentDate: getLocalDateString(),
  // Neutral defaults. These used to describe a 42-year-old man at 97.5kg
  // trying to lose weight, which made that the implicit persona of the whole
  // app before the user had said anything about themselves.
  gender: '',
  age: null,
  height: null,
  weight: null,
  goalWeight: null,
  startWeight: null,
  goal: DEFAULT_GOAL,
  activityLevel: 'Moderate',
  overrideBodyFat: false,
  manualBodyFat: 18,
  currentView: 'Front',
  // Weight is opt-in. A non-scale goal should not put a weight number and a
  // "% to goal" ring at the centre of the app.
  trackWeight: false,
  // The body-fat silhouette gallery is opt-in and off by default: it is the
  // highest-risk surface in the app for a young audience.
  showBodyComposition: false,
  // Wellbeing tracking (sleep, mood, energy) and cycle tracking, both opt-in.
  trackWellbeing: true,
  cycle: { enabled: false, lastPeriodStart: null, avgCycleLength: 28, avgPeriodLength: 5 },
  // Streak forgiveness: planned rest days, plus freezes that absorb a miss.
  restDays: [0],            // 0 = Sunday
  streakFreezes: 2,
  streakFreezesUsedOn: [],
  accent: 'evergreen',
  // Recipes the user hearted on the dashboard.
  savedRecipes: [],
  // User's available foods list (defaults to empty array - user populates)
  availableFoods: [],
  // Foods the user defined with "+ What I Eat". Soft-deleted entries keep a
  // deletedAt so the deletion syncs; see lib/nutrition.js and lib/mealLog.js.
  customFoods: [],
  // Applied filters for Personalized Plan
  appliedPlanFilters: {
    trainingFocus: 'General Fitness',
    workoutIntensity: 'Moderate',
    mealType: 'All',
    nutritionFocus: 'Balanced'
  },
  // Manually-entered blood pressure readings only — the app never computes
  // or estimates a blood pressure value. See src/lib/wellness.js.
  bpHistory: [],
  weeklyPlan: {
    Monday: {
      meals: [
        { name: 'Oats with Fruits & Oats', cal: 450, protein: 12, carbs: 65, fat: 8, fiber: 9, image: '/assets/recipes/oats-and-berry-bowl.png' },
        { name: 'Grilled Chicken Salad', cal: 550, protein: 42, carbs: 10, fat: 12, fiber: 4, image: '/assets/recipes/chickpea-salad.png' },
        { name: 'Greek Yogurt with Berries', cal: 200, protein: 18, carbs: 15, fat: 3, fiber: 2, image: '/assets/food/yogurt.png' },
        { name: 'Quinoa & Veggies Bowl', cal: 450, protein: 14, carbs: 60, fat: 10, fiber: 8, image: '/assets/recipes/quinoa-veg-bowl.png' }
      ],
      workouts: [
        { id: 'cardio', name: 'Cardiff Cardio', desc: '30 mins endurance run' },
        { id: 'strength', name: 'Strength Training', desc: '45 mins full body lift' },
        { id: 'core', name: 'Core Workout', desc: '15 mins abdominal reps' },
        { id: 'walk', name: 'Evening Walk', desc: '30 mins recovery stroll' }
      ]
    },
    Tuesday: {
      meals: [
        { name: 'Oats with Fruits & Oats', cal: 450, protein: 12, carbs: 65, fat: 8, fiber: 9, image: '/assets/recipes/oats-and-berry-bowl.png' },
        { name: 'Grilled Chicken Salad', cal: 550, protein: 42, carbs: 10, fat: 12, fiber: 4, image: '/assets/recipes/chickpea-salad.png' },
        { name: 'Greek Yogurt with Berries', cal: 200, protein: 18, carbs: 15, fat: 3, fiber: 2, image: '/assets/food/yogurt.png' },
        { name: 'Quinoa & Veggies Bowl', cal: 450, protein: 14, carbs: 60, fat: 10, fiber: 8, image: '/assets/recipes/quinoa-veg-bowl.png' }
      ],
      workouts: [
        { id: 'cardio', name: 'Cardiff Cardio', desc: '30 mins endurance run' },
        { id: 'strength', name: 'Strength Training', desc: '45 mins full body lift' },
        { id: 'core', name: 'Core Workout', desc: '15 mins abdominal reps' },
        { id: 'walk', name: 'Evening Walk', desc: '30 mins recovery stroll' }
      ]
    },
    Wednesday: {
      meals: [
        { name: 'Oats with Fruits & Oats', cal: 450, protein: 12, carbs: 65, fat: 8, fiber: 9, image: '/assets/recipes/oats-and-berry-bowl.png' },
        { name: 'Grilled Chicken Salad', cal: 550, protein: 42, carbs: 10, fat: 12, fiber: 4, image: '/assets/recipes/chickpea-salad.png' },
        { name: 'Greek Yogurt with Berries', cal: 200, protein: 18, carbs: 15, fat: 3, fiber: 2, image: '/assets/food/yogurt.png' },
        { name: 'Quinoa & Veggies Bowl', cal: 450, protein: 14, carbs: 60, fat: 10, fiber: 8, image: '/assets/recipes/quinoa-veg-bowl.png' }
      ],
      workouts: [
        { id: 'cardio', name: 'Cardiff Cardio', desc: '30 mins endurance run' },
        { id: 'strength', name: 'Strength Training', desc: '45 mins full body lift' },
        { id: 'core', name: 'Core Workout', desc: '15 mins abdominal reps' },
        { id: 'walk', name: 'Evening Walk', desc: '30 mins recovery stroll' }
      ]
    },
    Thursday: {
      meals: [
        { name: 'Oats with Fruits & Oats', cal: 450, protein: 12, carbs: 65, fat: 8, fiber: 9, image: '/assets/recipes/oats-and-berry-bowl.png' },
        { name: 'Grilled Chicken Salad', cal: 550, protein: 42, carbs: 10, fat: 12, fiber: 4, image: '/assets/recipes/chickpea-salad.png' },
        { name: 'Greek Yogurt with Berries', cal: 200, protein: 18, carbs: 15, fat: 3, fiber: 2, image: '/assets/food/yogurt.png' },
        { name: 'Quinoa & Veggies Bowl', cal: 450, protein: 14, carbs: 60, fat: 10, fiber: 8, image: '/assets/recipes/quinoa-veg-bowl.png' }
      ],
      workouts: [
        { id: 'cardio', name: 'Cardiff Cardio', desc: '30 mins endurance run' },
        { id: 'strength', name: 'Strength Training', desc: '45 mins full body lift' },
        { id: 'core', name: 'Core Workout', desc: '15 mins abdominal reps' },
        { id: 'walk', name: 'Evening Walk', desc: '30 mins recovery stroll' }
      ]
    },
    Friday: {
      meals: [
        { name: 'Oats with Fruits & Oats', cal: 450, protein: 12, carbs: 65, fat: 8, fiber: 9, image: '/assets/recipes/oats-and-berry-bowl.png' },
        { name: 'Grilled Chicken Salad', cal: 550, protein: 42, carbs: 10, fat: 12, fiber: 4, image: '/assets/recipes/chickpea-salad.png' },
        { name: 'Greek Yogurt with Berries', cal: 200, protein: 18, carbs: 15, fat: 3, fiber: 2, image: '/assets/food/yogurt.png' },
        { name: 'Quinoa & Veggies Bowl', cal: 450, protein: 14, carbs: 60, fat: 10, fiber: 8, image: '/assets/recipes/quinoa-veg-bowl.png' }
      ],
      workouts: [
        { id: 'cardio', name: 'Cardiff Cardio', desc: '30 mins endurance run' },
        { id: 'strength', name: 'Strength Training', desc: '45 mins full body lift' },
        { id: 'core', name: 'Core Workout', desc: '15 mins abdominal reps' },
        { id: 'walk', name: 'Evening Walk', desc: '30 mins recovery stroll' }
      ]
    },
    Saturday: {
      meals: [
        { name: 'Oats with Fruits & Oats', cal: 450, protein: 12, carbs: 65, fat: 8, fiber: 9, image: '/assets/recipes/oats-and-berry-bowl.png' },
        { name: 'Grilled Chicken Salad', cal: 550, protein: 42, carbs: 10, fat: 12, fiber: 4, image: '/assets/recipes/chickpea-salad.png' },
        { name: 'Greek Yogurt with Berries', cal: 200, protein: 18, carbs: 15, fat: 3, fiber: 2, image: '/assets/food/yogurt.png' },
        { name: 'Quinoa & Veggies Bowl', cal: 450, protein: 14, carbs: 60, fat: 10, fiber: 8, image: '/assets/recipes/quinoa-veg-bowl.png' }
      ],
      workouts: [
        { id: 'cardio', name: 'Cardiff Cardio', desc: '30 mins endurance run' },
        { id: 'strength', name: 'Strength Training', desc: '45 mins full body lift' },
        { id: 'core', name: 'Core Workout', desc: '15 mins abdominal reps' },
        { id: 'walk', name: 'Evening Walk', desc: '30 mins recovery stroll' }
      ]
    },
    Sunday: {
      meals: [
        { name: 'Oats with Fruits & Oats', cal: 450, protein: 12, carbs: 65, fat: 8, fiber: 9, image: '/assets/recipes/oats-and-berry-bowl.png' },
        { name: 'Grilled Chicken Salad', cal: 550, protein: 42, carbs: 10, fat: 12, fiber: 4, image: '/assets/recipes/chickpea-salad.png' },
        { name: 'Greek Yogurt with Berries', cal: 200, protein: 18, carbs: 15, fat: 3, fiber: 2, image: '/assets/food/yogurt.png' },
        { name: 'Quinoa & Veggies Bowl', cal: 450, protein: 14, carbs: 60, fat: 10, fiber: 8, image: '/assets/recipes/quinoa-veg-bowl.png' }
      ],
      workouts: [
        { id: 'cardio', name: 'Cardiff Cardio', desc: '30 mins endurance run' },
        { id: 'strength', name: 'Strength Training', desc: '45 mins full body lift' },
        { id: 'core', name: 'Core Workout', desc: '15 mins abdominal reps' },
        { id: 'walk', name: 'Evening Walk', desc: '30 mins recovery stroll' }
      ]
    }
  }
};

export function createEmptyLog() {
  return createEmptyLogShape();
}

const userKeyFor = (email) => `titan_user_${email.toLowerCase()}`;

/** A fresh state for an account with nothing saved on this device. */
function newUserState(email, extra = {}) {
  return {
    ...defaultState,
    email,
    isOnboarded: false,
    name: email.split('@')[0] || '',
    logs: { [defaultState.currentDate]: { ...createEmptyLog(), weight: defaultState.weight || 70 } },
    ...extra,
  };
}

const loggedOutState = () => ({ ...defaultState, email: '', isOnboarded: false });

/**
 * Two modes:
 *   - Cloud (Supabase configured): you are whoever Supabase Auth says you are.
 *     Nothing opens without a verified session; data syncs to your account.
 *   - Local-only (no Supabase env, e.g. a dev checkout): the old behaviour —
 *     an email labels a profile stored in this browser. No cloud, no account.
 */
export function useAppState() {
  const cloud = !!supabase;
  const [state, setState] = useState(() => {
    if (cloud) return loggedOutState(); // wait for the session check below
    const lastEmail = readLocal('titan_last_email') || '';
    if (lastEmail) {
      const parsed = readLocalJSON(userKeyFor(lastEmail));
      if (parsed) {
        return { ...defaultState, ...parsed, email: lastEmail, isOnboarded: parsed.isOnboarded ?? false };
      }
      return newUserState(lastEmail);
    }
    return loggedOutState();
  });
  const [authReady, setAuthReady] = useState(!cloud);
  // True while a signed-in account with no copy on this device is being
  // restored from the cloud, so returning users don't see onboarding.
  const [restoring, setRestoring] = useState(false);

  const [savedFlash, setSavedFlash] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const saveTimer = useRef(null);

  const persist = useCallback((next) => {
    if (!next.email) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const wrote = writeLocal(userKeyFor(next.email), JSON.stringify(next));
      if (!cloud) writeLocal('titan_last_email', next.email);
      // Storage can be full or blocked. Surface that rather than flashing
      // "saved" over a write that never happened.
      setStorageFailed(!wrote);
      if (wrote) {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1000);
      }
    }, 300);
  }, [cloud]);

  /** Applies a user action: entry ids for anything new, and timestamps on
   *  whatever changed so sync can resolve conflicts (lib/sync.js). */
  const commit = useCallback((updater) => {
    setState((prev) => {
      let next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === prev) return prev;
      const logs = ensureEntryIds(next.logs);
      if (logs !== next.logs) next = { ...next, logs };
      return stampChanges(prev, next);
    });
  }, []);
  const update = commit;

  const { syncStatus, syncNow, flushSync } = useCloudSync(state, setState);

  useEffect(() => {
    if (restoring && syncStatus.firstSyncDone) setRestoring(false);
  }, [restoring, syncStatus.firstSyncDone]);

  // Single source of truth for persistence: any state change — from update(),
  // ensureLog(), completeOnboarding(), etc. — flows through here. Keeping
  // setState updaters pure (no side effects inside them) matters because
  // React 18 StrictMode intentionally double-invokes updater functions in
  // dev to catch exactly this kind of bug; persist() itself is debounced so
  // this is safe to fire on every state change.
  useEffect(() => {
    persist(state);
  }, [state, persist]);

  useEffect(() => {
    document.body.classList.toggle('dark', state.isDarkMode);
  }, [state.isDarkMode]);

  // Accent theme. index.css keys off this attribute to re-point the primary
  // colour tokens, so no component needs to know the theme changed.
  useEffect(() => {
    const attr = accentAttribute(state.accent);
    if (attr) document.body.setAttribute('data-accent', attr);
    else document.body.removeAttribute('data-accent');
  }, [state.accent]);

  const ensureLog = useCallback((date) => {
    setState((prev) => {
      if (!prev.email || !prev.isOnboarded) return prev;
      if (prev.logs && prev.logs[date]) return prev;
      const currentLogs = prev.logs || {};
      return { ...prev, logs: { ...currentLogs, [date]: createEmptyLog() } };
    });
  }, []);

  useEffect(() => {
    if (state.email && state.isOnboarded) {
      // History is never pruned. Logs used to be deleted after 365 days;
      // they are now kept indefinitely (see README "Data retention").
      ensureLog(state.currentDate);
    }
  }, [state.currentDate, state.email, state.isOnboarded, ensureLog]);

  /** Opens the signed-in account's data: this device's copy if there is one,
   *  otherwise an empty state that the first sync fills from the cloud. */
  const openSession = useCallback((session) => {
    const email = (session.user.email || '').toLowerCase();
    const userId = session.user.id;
    const local = readLocalJSON(userKeyFor(email));
    // A local copy that belongs to a different account id (e.g. the account
    // was deleted and re-created) is not this user's data.
    const usable = local && (!local.userId || local.userId === userId) ? local : null;
    setState((prev) => {
      if (prev.userId === userId) return prev;
      const base = usable
        ? { ...defaultState, ...usable, isOnboarded: usable.isOnboarded ?? false }
        : newUserState(email);
      return { ...base, currentDate: defaultState.currentDate, email, userId, syncEpoch: base.syncEpoch || newSyncEpoch() };
    });
    setRestoring((r) => r || !usable);
  }, []);

  // Session check on start, then follow sign-in / sign-out events. A session
  // that expires (refresh fails) signs the user out here but leaves their
  // device copy in place, so unsynced changes are not lost.
  useEffect(() => {
    if (!cloud) return undefined;
    let alive = true;
    getSession().then((session) => {
      if (!alive) return;
      if (session) openSession(session);
      setAuthReady(true);
    });
    const unsubscribe = onAuthChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        openSession(session);
      } else if (event === 'SIGNED_OUT') {
        clearTimeout(saveTimer.current);
        setState(loggedOutState());
        setRestoring(false);
      }
    });
    return () => { alive = false; unsubscribe(); };
  }, [cloud, openSession]);

  /** Local-only mode sign-in (no Supabase configured). */
  const login = (email) => {
    const lowerEmail = email.trim().toLowerCase();
    writeLocal('titan_last_email', lowerEmail);
    const loadedState = readLocalJSON(userKeyFor(lowerEmail));
    setState(loadedState
      ? { ...defaultState, ...loadedState, email: lowerEmail, isOnboarded: loadedState.isOnboarded ?? false }
      : newUserState(lowerEmail));
  };

  /** Removes this account's data from the device (cloud mode, on sign-out or
   *  account deletion) so the next person on a shared phone sees nothing. */
  const forgetDevice = (email, userId) => {
    clearTimeout(saveTimer.current);
    if (email) removeLocal(userKeyFor(email));
    if (userId) clearSnapshot(userId);
  };

  /** Signs out. In cloud mode, first makes sure everything reached the cloud;
   *  if it could not (offline), asks before discarding the device copy.
   *  Returns false if the user cancelled. */
  const logout = async () => {
    if (cloud && state.userId) {
      const left = await flushSync();
      if (left > 0 && !window.confirm(
        `${left} change${left > 1 ? 's have' : ' has'} not reached the cloud yet (you may be offline). ` +
        'Sign out anyway? Those changes will be lost.'
      )) return false;
      const { email, userId } = state;
      await signOut();
      forgetDevice(email, userId);
    } else {
      clearTimeout(saveTimer.current);
      removeLocal('titan_last_email');
    }
    setState(loggedOutState());
    return true;
  };

  /** Permanently deletes the account and all cloud data, then signs out. */
  const deleteAccount = async () => {
    if (!cloud || !state.userId) return { error: 'Not signed in to a cloud account.' };
    const { email, userId } = state;
    const { error } = await deleteMyAccount();
    if (error) return { error };
    forgetDevice(email, userId);
    await signOut().catch(() => {});
    setState(loggedOutState());
    return { error: null };
  };

  const completeOnboarding = (details) => {
    commit((prev) => {
      const next = { ...prev, ...details, isOnboarded: true };
      next.logs = { ...(next.logs || {}) };
      const today = next.currentDate;
      // Merge rather than overwrite: anything already logged today (water, a
      // first meal) must survive finishing onboarding.
      next.logs[today] = { ...createEmptyLog(), ...next.logs[today], weight: next.weight };

      const bmr = calculateBMR(next.gender, next.age, next.weight, next.height);
      const tdee = calculateTDEE(bmr, next.activityLevel);
      const days = getRemainingDays(next.currentDate, next.goalTargetDate);
      // Age-safe: an under-18 never receives a deficit target.
      next.calorieTarget = calculateDailyCaloriesForAge(
        next.age, next.goal, tdee, next.weight, next.goalWeight, days
      );

      return next;
    });
  };

  const clearLogsHistory = () => {
    commit((prev) => {
      const today = prev.currentDate;
      const freshLog = { ...createEmptyLog(), weight: prev.weight || 70 };
      return {
        ...prev,
        logs: {
          [today]: freshLog
        }
      };
    });
  };

  const addAvailableFood = (foodName) => {
    if (!foodName || typeof foodName !== 'string') return;
    const cleanName = foodName.trim();
    if (!cleanName) return;

    commit((prev) => {
      const currentList = prev.availableFoods || [];
      // Case-insensitive duplicate check
      const exists = currentList.some((item) => item.toLowerCase() === cleanName.toLowerCase());
      if (exists) return prev;
      return {
        ...prev,
        availableFoods: [...currentList, cleanName]
      };
    });
  };

  const removeAvailableFood = (foodName) => {
    if (!foodName) return;
    const targetName = foodName.trim().toLowerCase();
    commit((prev) => {
      const currentList = prev.availableFoods || [];
      const updatedList = currentList.filter((item) => item.trim().toLowerCase() !== targetName);
      return {
        ...prev,
        availableFoods: updatedList
      };
    });
  };

  const applyPlanFilters = (newFilters) => {
    if (!newFilters) return;
    commit((prev) => ({
      ...prev,
      appliedPlanFilters: {
        ...prev.appliedPlanFilters,
        ...newFilters
      }
    }));
  };

  return {
    state,
    update,
    savedFlash,
    storageFailed,
    createEmptyLog,
    cloud,
    authReady,
    restoring,
    syncStatus,
    syncNow,
    login,
    logout,
    deleteAccount,
    completeOnboarding,
    clearLogsHistory,
    addAvailableFood,
    removeAvailableFood,
    applyPlanFilters
  };
}

