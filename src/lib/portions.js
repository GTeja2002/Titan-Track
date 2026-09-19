/* ---------------- lib/portions.js ----------------
 * Household portions, so logging a meal does not require a kitchen scale.
 *
 * The food log used to ask for a quantity in grams. Almost nobody knows what
 * 150g of poha looks like, and being asked to guess a number before you can
 * log anything is the single biggest reason food tracking gets abandoned.
 * These presets turn that into one tap: "1 bowl", "2 rotis", "a handful".
 *
 * Gram values are deliberately ordinary-serving approximations, not precise
 * measures — the point is a good-enough number entered in one tap rather than
 * a precise number that never gets entered at all.
 */

/** Presets by food name, where a specific food has an obvious serving. */
const BY_NAME = {
  'Cooked Rice': [
    { label: '½ bowl', qty: 75 },
    { label: '1 bowl', qty: 150 },
    { label: '1 plate', qty: 250 },
  ],
  'Dal (cooked)': [
    { label: '½ bowl', qty: 100 },
    { label: '1 bowl', qty: 200 },
    { label: '2 bowls', qty: 400 },
  ],
  'Poha': [
    { label: 'small', qty: 120 },
    { label: '1 plate', qty: 200 },
    { label: 'large', qty: 300 },
  ],
  'Upma': [
    { label: 'small', qty: 120 },
    { label: '1 plate', qty: 200 },
    { label: 'large', qty: 300 },
  ],
  'Chicken Biryani': [
    { label: '½ plate', qty: 150 },
    { label: '1 plate', qty: 300 },
    { label: 'large', qty: 450 },
  ],
  'Chicken Curry': [
    { label: 'small', qty: 100 },
    { label: '1 bowl', qty: 200 },
    { label: 'large', qty: 300 },
  ],
  'Mutton Curry': [
    { label: 'small', qty: 100 },
    { label: '1 bowl', qty: 200 },
  ],
  'Mixed Vegetable Curry': [
    { label: 'small', qty: 100 },
    { label: '1 bowl', qty: 200 },
  ],
  'Multigrain Oats': [
    { label: '½ cup', qty: 40 },
    { label: '1 cup', qty: 80 },
  ],
  'Milk': [
    { label: '1 glass', qty: 250 },
    { label: '½ glass', qty: 125 },
    { label: '1 cup', qty: 200 },
  ],
  'Curd / Yogurt': [
    { label: '1 katori', qty: 150 },
    { label: '1 cup', qty: 200 },
  ],
  'Paneer': [
    { label: 'small', qty: 50 },
    { label: '1 serving', qty: 100 },
  ],
  'Peanuts (roasted)': [
    { label: 'handful', qty: 30 },
    { label: '2 handfuls', qty: 60 },
  ],
};

/** Fallback presets by unit, used when a food has no entry above. */
const BY_UNIT = {
  piece: [
    { label: '1', qty: 1 },
    { label: '2', qty: 2 },
    { label: '3', qty: 3 },
  ],
  g: [
    { label: 'handful', qty: 30 },
    { label: 'small', qty: 100 },
    { label: '1 bowl', qty: 200 },
    { label: 'large', qty: 300 },
  ],
  ml: [
    { label: '½ glass', qty: 125 },
    { label: '1 glass', qty: 250 },
    { label: 'large', qty: 400 },
  ],
  tbsp: [
    { label: '1 tbsp', qty: 1 },
    { label: '2 tbsp', qty: 2 },
  ],
};

/** Tap-sized portion options for a food. Always returns at least one. */
export function portionsFor(food) {
  if (!food) return [];
  return BY_NAME[food.name] || BY_UNIT[food.unit] || BY_UNIT.g;
}

/** Short human label for a logged amount, e.g. "2 pc" or "150g". */
export function describeAmount(qty, unit) {
  if (!Number.isFinite(qty) || qty <= 0) return '';
  if (unit === 'piece') return `${qty} pc`;
  if (!unit) return String(qty);
  return `${qty}${unit}`;
}
