/* ---------------- lib/goals.js ----------------
 * Goal definitions, and the rules for how much of the app is allowed to be
 * about the scale.
 *
 * The app previously offered only weight-shaped goals (lose fat / maintain /
 * gain muscle) and defaulted every new profile to losing fat. That makes a
 * weight number the emotional centre of the product for everyone, including
 * people whose goal has nothing to do with the scale. Goals are now split into
 * scale-based and non-scale; a non-scale goal demotes weight to an optional
 * metric rather than the headline, and never shows a "% to goal weight" ring.
 */

export const GOALS = [
  {
    id: 'stay-consistent',
    label: 'Stay Consistent',
    blurb: 'Build the habit. Show up most days.',
    scaleBased: false,
    energy: 'maintain',
  },
  {
    id: 'get-stronger',
    label: 'Get Stronger',
    blurb: 'Train hard, eat enough, progress your lifts.',
    scaleBased: false,
    energy: 'slight-surplus',
  },
  {
    id: 'feel-better',
    label: 'Feel Better',
    blurb: 'Sleep, energy and mood over numbers.',
    scaleBased: false,
    energy: 'maintain',
  },
  {
    id: 'eat-better',
    label: 'Eat Better',
    blurb: 'More protein, more fibre, fewer gaps.',
    scaleBased: false,
    energy: 'maintain',
  },
  {
    id: 'maintain',
    label: 'Maintain',
    blurb: 'Hold steady where you are.',
    scaleBased: false,
    energy: 'maintain',
  },
  {
    id: 'gain-muscle',
    label: 'Build Muscle',
    blurb: 'Gain weight deliberately, mostly as muscle.',
    scaleBased: true,
    energy: 'surplus',
  },
  {
    id: 'lose-fat',
    label: 'Lose Fat',
    blurb: 'Lose weight at a sustainable pace.',
    scaleBased: true,
    energy: 'deficit',
  },
];

export const DEFAULT_GOAL = 'stay-consistent';

export function getGoal(id) {
  return GOALS.find((g) => g.id === id) || GOALS.find((g) => g.id === DEFAULT_GOAL);
}

/** True when the goal is defined by a target weight, so scale UI is the point. */
export function isScaleGoal(goalId) {
  return Boolean(getGoal(goalId).scaleBased);
}

export function goalLabel(goalId) {
  return getGoal(goalId).label;
}

/* ---- Age-appropriate safety ----------------------------------------------
 * Some of this app's users are teenagers. A calorie deficit aimed at an adult
 * is not appropriate for someone still growing, and a body-fat silhouette
 * gallery is the last thing a 15-year-old needs in front of them. These two
 * helpers are the single place those rules live.
 */

export const ADULT_AGE = 18;

export function isMinor(age) {
  const a = Number(age);
  return Number.isFinite(a) && a > 0 && a < ADULT_AGE;
}

/** Weight-loss goals and deficits are not offered to under-18s. */
export function allowsDeficit(age) {
  return !isMinor(age);
}

/** Goals a given age is allowed to pick. */
export function goalsForAge(age) {
  return allowsDeficit(age) ? GOALS : GOALS.filter((g) => g.energy !== 'deficit');
}
