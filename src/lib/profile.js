/* ---------------- lib/profile.js ----------------
 * User information has exactly one editor (ProfileDrawer), which edits a
 * DRAFT and only changes the real profile when the user presses Save.
 * Everywhere else shows these values read-only.
 *
 * Empty fields stay empty (null) — never replaced by made-up defaults like
 * "42 years / 175 cm / 97.5 kg", which used to appear in the editors.
 */
import { calculateBMR, calculateTDEE, getRemainingDays, calculateDailyCaloriesForAge } from './calculations.js';
import { getLocalDateString } from './date.js';

const NUMBER_FIELDS = ['age', 'height', 'weight', 'startWeight', 'goalWeight'];

export const LIMITS = {
  age: { min: 10, max: 100, label: 'Age', unit: 'years' },
  height: { min: 100, max: 250, label: 'Height', unit: 'cm' },
  weight: { min: 25, max: 350, label: 'Current weight', unit: 'kg' },
  startWeight: { min: 25, max: 350, label: 'Starting weight', unit: 'kg' },
  goalWeight: { min: 25, max: 350, label: 'Goal weight', unit: 'kg' },
};

const toInput = (v) => (v === null || v === undefined || v === '' || v === 0 ? '' : String(v));

/** The editable copy shown in the form. */
export function draftFromState(state) {
  return {
    name: state.name || '',
    gender: state.gender || '',
    age: toInput(state.age),
    height: toInput(state.height),
    weight: toInput(state.weight),
    startWeight: toInput(state.startWeight),
    goalWeight: toInput(state.goalWeight),
    goalTargetDate: state.goalTargetDate || '',
    goal: state.goal || '',
    activityLevel: state.activityLevel || 'Moderate',
    trackWeight: Boolean(state.trackWeight),
    showBodyComposition: Boolean(state.showBodyComposition),
    trackWellbeing: state.trackWellbeing !== false,
    cycleEnabled: Boolean(state.cycle?.enabled),
    accent: state.accent || '',
  };
}

const parseNum = (v) => {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

/** Field → message for anything that can't be saved. Empty is allowed. */
export function validateProfile(draft) {
  const errors = {};
  for (const f of NUMBER_FIELDS) {
    const n = parseNum(draft[f]);
    if (n === null) continue;
    const { min, max, label, unit } = LIMITS[f];
    if (Number.isNaN(n)) errors[f] = `${label} must be a number`;
    else if (n < min || n > max) errors[f] = `${label} should be between ${min} and ${max} ${unit}`;
  }
  if (draft.goalTargetDate && !/^\d{4}-\d{2}-\d{2}$/.test(draft.goalTargetDate)) {
    errors.goalTargetDate = 'Pick a valid date';
  }
  return errors;
}

/** True when the draft differs from what is saved (for "unsaved changes"). */
export function isDirty(state, draft) {
  return JSON.stringify(draftFromState(state)) !== JSON.stringify(draft);
}

/**
 * Applies a validated draft to the state (pure). The current weight is the
 * user's weight *today*: it also becomes today's weigh-in, which is what
 * builds the weight trend over time. Other days' logs are never touched.
 */
export function applyProfile(state, draft, today = getLocalDateString()) {
  const num = (f) => {
    const n = parseNum(draft[f]);
    return n === null || Number.isNaN(n) ? null : n;
  };
  const next = {
    ...state,
    name: draft.name.trim(),
    gender: draft.gender,
    age: num('age'),
    height: num('height'),
    weight: num('weight'),
    startWeight: num('startWeight'),
    goalWeight: num('goalWeight'),
    goalTargetDate: draft.goalTargetDate || null,
    goal: draft.goal || state.goal,
    activityLevel: draft.activityLevel,
    trackWeight: draft.trackWeight,
    showBodyComposition: draft.showBodyComposition,
    trackWellbeing: draft.trackWellbeing,
    cycle: { ...(state.cycle || {}), enabled: draft.cycleEnabled },
    accent: draft.accent || state.accent,
  };

  if (next.weight !== null && next.weight !== state.weight) {
    const day = (state.logs && state.logs[today]) || { foods: [], walk: 0, gym: 0, weight: 0, water: 0 };
    next.logs = { ...state.logs, [today]: { ...day, weight: next.weight } };
  }

  const bmr = calculateBMR(next.gender, next.age, next.weight, next.height);
  const tdee = calculateTDEE(bmr, next.activityLevel);
  const days = getRemainingDays(today, next.goalTargetDate);
  next.calorieTarget = calculateDailyCaloriesForAge(next.age, next.goal, tdee, next.weight, next.goalWeight, days);
  return next;
}
