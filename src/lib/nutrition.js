/* ---------------- lib/nutrition.js ----------------
 * The one place that knows how a food definition plus a quantity turns into
 * calories and macros, what a valid custom food looks like, and what gets
 * stored on a meal entry.
 *
 * Two calculation bases, and they must never be mixed:
 *   - per100:     g and ml. Values are per 100 g/ml.
 *                 200 kcal/100 g × 150 g = 200 × 150 / 100 = 300 kcal.
 *   - perServing: piece, cup, bowl, tbsp, tsp, slice, serving. Values are per
 *                 ONE of that unit. 2 slices × 80 kcal = 160 kcal.
 * Applying a per-100 rule to "3 pieces" would give 3% of the value, which is
 * the bug this split exists to prevent.
 *
 * Every meal entry carries a SNAPSHOT of the numbers it was logged with.
 * Editing or deleting a custom food later never changes a past day's totals.
 */

export const UNITS = {
  g:       { label: 'grams (g)',        short: 'g',     basis: 'per100',     maxQty: 5000 },
  ml:      { label: 'millilitres (ml)', short: 'ml',    basis: 'per100',     maxQty: 5000 },
  piece:   { label: 'pieces',           short: 'pc',    basis: 'perServing', maxQty: 100 },
  cup:     { label: 'cups',             short: 'cup',   basis: 'perServing', maxQty: 50 },
  bowl:    { label: 'bowls',            short: 'bowl',  basis: 'perServing', maxQty: 50 },
  slice:   { label: 'slices',           short: 'slice', basis: 'perServing', maxQty: 100 },
  tbsp:    { label: 'tablespoons',      short: 'tbsp',  basis: 'perServing', maxQty: 100 },
  tsp:     { label: 'teaspoons',        short: 'tsp',   basis: 'perServing', maxQty: 200 },
  serving: { label: 'servings',         short: 'srv',   basis: 'perServing', maxQty: 50 },
};

export const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch',     label: 'Lunch' },
  { id: 'dinner',    label: 'Dinner' },
  { id: 'snacks',    label: 'Snacks' },
];

/** Where an entry's numbers came from. Shown next to the entry so a guess is
 *  never presented as a measured fact. */
export const NUTRITION_SOURCES = {
  builtin:      'TitanTrack list (typical values)',
  user_entered: 'Entered by you',
  estimated:    'Your estimate',
  verified:     'Verified nutrition database',
  unknown:      'Calories not known yet',
};

/** Upper bounds that catch typos (an extra zero) without rejecting real food.
 *  Pure fat is ~900 kcal/100 g; a single serving above 3000 kcal is almost
 *  certainly a mistake. */
const MAX_CAL_PER100 = 950;
const MAX_CAL_PER_SERVING = 3000;
const MAX_NAME_LENGTH = 80;
const MACROS = ['protein', 'carbs', 'fat', 'fiber'];

export function basisFor(unit) {
  return UNITS[unit]?.basis ?? null;
}

/** "Paneer  Tikka " and "paneer tikka" are the same food. */
export function normalizeFoodName(name) {
  return String(name ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Breakfast before 11, lunch until 4pm, snacks until 7pm, then dinner. */
export function defaultMealForTime(date = new Date()) {
  const h = date.getHours();
  if (h >= 4 && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 16 && h < 19) return 'snacks';
  return 'dinner';
}

function toNumberOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

const round1 = (n) => Math.round(n * 10) / 10;

/** Validates a quantity for a unit. Decimals are fine (1.5 cups). */
export function validateQuantity(qty, unit) {
  const n = toNumberOrNull(qty);
  if (n === null) return 'Enter how much you ate';
  if (Number.isNaN(n)) return 'Quantity must be a number';
  if (n <= 0) return 'Quantity must be more than 0';
  const max = UNITS[unit]?.maxQty;
  if (max && n > max) return `That's more than ${max} ${UNITS[unit].short} — check the quantity`;
  return null;
}

/**
 * Validates a custom food definition. `calories` may be null (unknown — can be
 * filled in later). Returns { ok, errors, value } where value is the cleaned
 * definition fields.
 */
export function validateCustomFood(input) {
  const errors = {};
  const name = String(input?.name ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
  if (!name) errors.name = 'Give the food a name';
  else if (name.length > MAX_NAME_LENGTH) errors.name = `Keep the name under ${MAX_NAME_LENGTH} characters`;

  const unit = input?.unit;
  const basis = basisFor(unit);
  if (!basis) errors.unit = 'Pick a unit';

  const calories = toNumberOrNull(input?.calories);
  if (Number.isNaN(calories)) errors.calories = 'Calories must be a number';
  else if (calories !== null && calories < 0) errors.calories = 'Calories cannot be negative';
  else if (calories !== null && basis === 'per100' && calories > MAX_CAL_PER100) {
    errors.calories = `No food has more than ${MAX_CAL_PER100} kcal per 100 ${unit} — check the value`;
  } else if (calories !== null && basis === 'perServing' && calories > MAX_CAL_PER_SERVING) {
    errors.calories = `${MAX_CAL_PER_SERVING}+ kcal for one ${UNITS[unit].short} looks like a typo`;
  }

  const macros = {};
  for (const m of MACROS) {
    const v = toNumberOrNull(input?.[m]);
    if (Number.isNaN(v)) errors[m] = 'Must be a number';
    else if (v !== null && v < 0) errors[m] = 'Cannot be negative';
    else macros[m] = v;
  }
  if (basis === 'per100' && !errors.protein && !errors.carbs && !errors.fat && !errors.fiber) {
    const sum = MACROS.reduce((s, m) => s + (macros[m] || 0), 0);
    if (sum > 100) errors.macros = `Macros add up to ${round1(sum)} g per 100 ${unit} — that's more than the food weighs`;
  }

  const source = calories === null
    ? 'unknown'
    : input?.isEstimate ? 'estimated' : (input?.source === 'verified' ? 'verified' : 'user_entered');

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    value: ok ? { name, unit, basis, calories, ...macros, source } : null,
  };
}

/**
 * Calories and macros for `qty` of a food definition. Accepts both the new
 * definition shape ({ basis, calories, protein, … }) and the built-in FOOD_DB
 * shape ({ unit, calPer100 | calPerPiece, proteinPer100 | … }).
 */
export function calcNutrition(food, qty) {
  const empty = { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, calUnknown: false };
  const q = Number(qty);
  if (!food || !Number.isFinite(q) || q <= 0) return empty;

  const def = food.basis ? food : fromBuiltin(food);
  const factor = def.basis === 'per100' ? q / 100 : q;
  const calUnknown = def.calories === null || def.calories === undefined;
  return {
    cal: calUnknown ? 0 : Math.round(def.calories * factor),
    protein: round1((def.protein || 0) * factor),
    carbs: round1((def.carbs || 0) * factor),
    fat: round1((def.fat || 0) * factor),
    fiber: round1((def.fiber || 0) * factor),
    calUnknown,
  };
}

/** The arithmetic behind an entry, spelled out for the preview. */
export function explainCalculation(food, qty) {
  const def = food.basis ? food : fromBuiltin(food);
  if (def.calories === null || def.calories === undefined) return 'Calories unknown — you can fill them in later.';
  const short = UNITS[def.unit]?.short ?? def.unit;
  const { cal } = calcNutrition(def, qty);
  if (def.basis === 'per100') {
    return `${def.calories} kcal per 100 ${short} × ${qty} ${short} ÷ 100 = ${cal} kcal`;
  }
  return `${def.calories} kcal per ${short} × ${qty} = ${cal} kcal`;
}

/** Adapts a FOOD_DB row to the definition shape. Built-in "piece" foods are
 *  per-serving; g/ml foods are per 100. */
export function fromBuiltin(f) {
  const perPiece = f.unit === 'piece';
  const k = perPiece ? 'PerPiece' : 'Per100';
  return {
    id: `builtin:${normalizeFoodName(f.name)}`,
    name: f.name,
    unit: f.unit,
    basis: perPiece ? 'perServing' : 'per100',
    calories: f[`cal${k}`] ?? null,
    protein: f[`protein${k}`] ?? 0,
    carbs: f[`carbs${k}`] ?? 0,
    fat: f[`fat${k}`] ?? 0,
    fiber: f[`fiber${k}`] ?? 0,
    source: 'builtin',
    image: f.image ?? null,
  };
}

/** A recipe/plan meal (one serving with fixed numbers) as a definition. */
export function planMealAsFood(meal) {
  return {
    id: null,
    name: meal.name,
    unit: 'serving',
    basis: 'perServing',
    calories: meal.cal ?? null,
    protein: meal.protein || 0,
    carbs: meal.carbs || 0,
    fat: meal.fat || 0,
    fiber: meal.fiber || 0,
    source: 'builtin',
    image: meal.image ?? null,
  };
}

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // RFC4122-shaped fallback for old WebViews.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** A new custom food definition from validated fields. */
export function createCustomFood(value, now = new Date()) {
  const ts = now.toISOString();
  return { id: newId(), ...value, createdAt: ts, updatedAt: ts, deletedAt: null };
}

/** Live (not deleted) custom food with the same name + unit, if any. */
export function findDuplicateCustomFood(customFoods = [], name, unit, ignoreId = null) {
  const key = normalizeFoodName(name);
  return customFoods.find((f) => !f.deletedAt && f.id !== ignoreId && f.unit === unit && normalizeFoodName(f.name) === key) ?? null;
}

/**
 * A meal entry: the snapshot stored in a day's log. `consumedAt` is a UTC ISO
 * timestamp; the day it belongs to is the log's local date key, never derived
 * from consumedAt (see lib/date.js on why toISOString dates are wrong).
 */
export function createMealEntry({ food, qty, mealType, consumedAt = new Date() }) {
  const def = food.basis ? food : fromBuiltin(food);
  const n = calcNutrition(def, qty);
  const ts = new Date().toISOString();
  return {
    id: newId(),
    foodId: def.id ?? null,
    name: def.name,
    qty: Number(qty),
    unit: def.unit,
    basis: def.basis,
    // Per-unit values used for this entry, so it can be re-derived or
    // corrected later without looking up a definition that may have changed.
    calPerUnit: def.calories ?? null,
    cal: n.cal,
    protein: n.protein,
    carbs: n.carbs,
    fat: n.fat,
    fiber: n.fiber,
    calUnknown: n.calUnknown,
    source: n.calUnknown ? 'unknown' : (def.source ?? 'user_entered'),
    mealType: MEAL_TYPES.some((m) => m.id === mealType) ? mealType : defaultMealForTime(),
    consumedAt: new Date(consumedAt).toISOString(),
    image: def.image ?? null,
    createdAt: ts,
    updatedAt: ts,
  };
}

/** Copies an existing entry (e.g. "log again", "repeat yesterday") as a new
 *  record with its own id and timestamp, keeping the original snapshot. */
export function cloneMealEntry(entry, { mealType, consumedAt = new Date() } = {}) {
  const ts = new Date().toISOString();
  const { timesLogged: _ignored, ...rest } = entry;
  return {
    ...rest,
    id: newId(),
    mealType: mealType ?? entry.mealType ?? defaultMealForTime(),
    consumedAt: new Date(consumedAt).toISOString(),
    createdAt: ts,
    updatedAt: ts,
  };
}

/** Fills in calories on an entry that was logged as unknown (or corrects one).
 *  `calPerUnit` follows the entry's basis. */
export function completeEntryCalories(entry, calPerUnit, { isEstimate = false } = {}) {
  const v = toNumberOrNull(calPerUnit);
  if (v === null || Number.isNaN(v) || v < 0) return null;
  const basis = entry.basis ?? basisFor(entry.unit) ?? 'perServing';
  const factor = basis === 'per100' ? entry.qty / 100 : entry.qty;
  return {
    ...entry,
    basis,
    calPerUnit: v,
    cal: Math.round(v * factor),
    calUnknown: false,
    source: isEstimate ? 'estimated' : 'user_entered',
    updatedAt: new Date().toISOString(),
  };
}

/** Totals for a list of entries, with a count of entries missing calories so
 *  the UI can say the day's total is incomplete rather than silently low. */
export function sumEntries(entries = []) {
  const t = { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, unknownCount: 0 };
  for (const e of entries) {
    t.cal += e.cal || 0;
    t.protein += e.protein || 0;
    t.carbs += e.carbs || 0;
    t.fat += e.fat || 0;
    t.fiber += e.fiber || 0;
    if (e.calUnknown) t.unknownCount += 1;
  }
  for (const k of ['protein', 'carbs', 'fat', 'fiber']) t[k] = round1(t[k]);
  return t;
}

/** Groups a day's entries by meal. Entries logged before meal categories
 *  existed have no mealType and land in 'other'. */
export function groupByMeal(entries = []) {
  const groups = Object.fromEntries([...MEAL_TYPES.map((m) => [m.id, []]), ['other', []]]);
  for (const e of entries) (groups[e.mealType] ?? groups.other).push(e);
  return groups;
}
