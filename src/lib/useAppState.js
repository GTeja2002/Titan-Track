/* ---------------- lib/useAppState.js ---------------- */
import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateBMR, calculateTDEE, getRemainingDays, calculateDailyCalories } from './calculations.js';
import { pushStateToSupabase, pullStateFromSupabase } from './supabaseClient.js';
import { getLocalDateString } from './date.js';
import { readLocal, readLocalJSON, writeLocal, removeLocal } from './storage.js';
import { recordUserLogin, updateUserDirectoryRecord } from './userLogger.js';

export const defaultState = {
  isDarkMode: false,
  gymStarted: false,
  calorieTarget: 2302,
  logs: {},
  currentDate: getLocalDateString(),
  gender: 'male',
  age: 42,
  height: 175,
  weight: 97.5,
  goalWeight: 90,
  startWeight: 96,
  goal: 'lose-fat',
  activityLevel: 'Moderate',
  overrideBodyFat: false,
  manualBodyFat: 18,
  currentView: 'Front',
  // User's available foods list (defaults to empty array - user populates)
  availableFoods: [],
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

export function pruneOldLogs(logs, currentDate) {
  if (!logs || !currentDate) return logs;
  // Determine cutoff date (365 days ago relative to currentDate)
  const current = new Date(currentDate + 'T00:00:00');
  const cutoff = new Date(current.getTime());
  cutoff.setDate(cutoff.getDate() - 365);

  const nextLogs = { ...logs };
  let cleaned = false;

  Object.keys(nextLogs).forEach((dateKey) => {
    const logDate = new Date(dateKey + 'T00:00:00');
    if (!isNaN(logDate.getTime()) && logDate < cutoff) {
      delete nextLogs[dateKey];
      cleaned = true;
    }
  });

  return cleaned ? nextLogs : logs;
}

export function createEmptyLog() {
  return { foods: [], walk: 0, gym: 0, weight: 0, water: 0 };
}

export function useAppState() {
  const [state, setState] = useState(() => {
    const lastEmail = readLocal('titan_last_email') || '';
    if (lastEmail) {
      const parsed = readLocalJSON(`titan_user_${lastEmail.toLowerCase()}`);
      if (parsed) {
        return { ...defaultState, ...parsed, email: lastEmail, isOnboarded: parsed.isOnboarded ?? false };
      }
      return {
        ...defaultState,
        email: lastEmail,
        isOnboarded: false,
        name: lastEmail.split('@')[0] || '',
        logs: {
          [defaultState.currentDate]: { ...createEmptyLog(), weight: defaultState.weight || 70 }
        }
      };
    }
    return { ...defaultState, email: '', isOnboarded: false };
  });

  const [savedFlash, setSavedFlash] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const saveTimer = useRef(null);

  const persist = useCallback((next) => {
    if (!next.email) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const userKey = `titan_user_${next.email.toLowerCase()}`;
      const wrote = writeLocal(userKey, JSON.stringify(next));
      writeLocal('titan_last_email', next.email);
      // Storage can be full or blocked. Surface that rather than flashing
      // "saved" over a write that never happened.
      setStorageFailed(!wrote);
      if (wrote) {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1000);
      }
      // Cloud sync is best-effort and never blocks the (already-instant) local save.
      pushStateToSupabase(userKey, next);
    }, 300);
  }, []);

  const update = useCallback((updater) => {
    setState((prev) => updater(prev));
  }, []);

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
      ensureLog(state.currentDate);
      setState((prev) => {
        const nextLogs = pruneOldLogs(prev.logs, prev.currentDate);
        if (nextLogs !== prev.logs) {
          return { ...prev, logs: nextLogs };
        }
        return prev;
      });
    }
  }, [state.currentDate, state.email, state.isOnboarded, ensureLog]);

  // Pull this user's cloud copy once per login (covers "signed in on another
  // device" or "cleared browser data" cases). Runs after the instant
  // localStorage-backed state is already showing, and is a no-op if Supabase
  // isn't configured or has nothing saved for this user yet.
  const pulledForEmailRef = useRef(null);
  useEffect(() => {
    if (!state.email || pulledForEmailRef.current === state.email) return;
    pulledForEmailRef.current = state.email;
    const emailAtRequestTime = state.email;
    const userKey = `titan_user_${emailAtRequestTime.toLowerCase()}`;
    let cancelled = false;
    pullStateFromSupabase(userKey).then((cloudState) => {
      if (cancelled || !cloudState) return;
      setState((prev) => {
        if (prev.email !== emailAtRequestTime) return prev; // user logged out/switched while this was in flight
        return { ...defaultState, ...cloudState, email: emailAtRequestTime, isOnboarded: cloudState.isOnboarded ?? prev.isOnboarded };
      });
    });
    return () => { cancelled = true; };
  }, [state.email]);

  const login = (email) => {
    const lowerEmail = email.trim().toLowerCase();
    writeLocal('titan_last_email', lowerEmail);
    const loadedState = readLocalJSON(`titan_user_${lowerEmail}`);
    const finalState = loadedState
      ? { ...defaultState, ...loadedState, email: lowerEmail, isOnboarded: loadedState.isOnboarded ?? false }
      : {
        ...defaultState,
        email: lowerEmail,
        isOnboarded: false,
        name: lowerEmail.split('@')[0] || '',
        logs: {
          [defaultState.currentDate]: { ...createEmptyLog(), weight: defaultState.weight || 70 }
        }
      };

    recordUserLogin(lowerEmail, finalState);
    setState(finalState);
  };

  const logout = () => {
    removeLocal('titan_last_email');
    pulledForEmailRef.current = null;
    setState({ ...defaultState, email: '', isOnboarded: false });
  };

  const completeOnboarding = (details) => {
    setState((prev) => {
      const next = { ...prev, ...details, isOnboarded: true };
      next.logs = { ...(next.logs || {}) };
      const today = next.currentDate;
      // Merge rather than overwrite: anything already logged today (water, a
      // first meal) must survive finishing onboarding.
      next.logs[today] = { ...createEmptyLog(), ...next.logs[today], weight: next.weight };

      const bmr = calculateBMR(next.gender, next.age, next.weight, next.height);
      const tdee = calculateTDEE(bmr, next.activityLevel);
      const days = getRemainingDays(next.currentDate, next.goalTargetDate);
      next.calorieTarget = calculateDailyCalories(next.goal, tdee, next.weight, next.goalWeight, days);

      updateUserDirectoryRecord(next.email, {
        name: next.name,
        age: next.age,
        gender: next.gender,
        height: next.height,
        weight: next.weight,
        startWeight: next.startWeight,
        goalWeight: next.goalWeight,
        isOnboarded: true
      });

      return next;
    });
  };

  const clearLogsHistory = () => {
    setState((prev) => {
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

    setState((prev) => {
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
    setState((prev) => {
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
    setState((prev) => ({
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
    login,
    logout,
    completeOnboarding,
    clearLogsHistory,
    addAvailableFood,
    removeAvailableFood,
    applyPlanFilters
  };
}

