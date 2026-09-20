/* ---------------- lib/dailyTotals.js ----------------
 * The four headline numbers for a given day: calories, protein, water and
 * steps, each with the target it is measured against.
 *
 * These were being recomputed inline wherever they were shown — the dashboard
 * metric row, the nutrition overview, the workouts page — which meant the
 * same arithmetic in three places and three chances for them to disagree.
 */
import {
  calculateBMR, calculateTDEE, getRemainingDays, calculateDailyCalories,
  calculateProteinTarget, normalizeWaterMl,
} from './calculations.js';

export const STEPS_TARGET = 10000;

/** Millilitres of water per kilogram of body weight, per day. */
const WATER_ML_PER_KG = 35;
const MIN_WATER_TARGET_ML = 500;

export function getDailyTotals(state) {
  const log = (state.logs && state.logs[state.currentDate]) || {};
  const foods = log.foods || [];
  const weight = log.weight > 0 ? log.weight : (state.weight ?? 70);

  const bmr = calculateBMR(state.gender, state.age, weight, state.height);
  const tdee = calculateTDEE(bmr, state.activityLevel);
  const days = getRemainingDays(state.currentDate, state.goalTargetDate);

  const calories = foods.reduce((sum, f) => sum + (f.cal || 0), 0);
  const calorieTarget = calculateDailyCalories(state.goal, tdee, weight, state.goalWeight, days);

  const protein = Number(foods.reduce((sum, f) => sum + (f.protein || 0), 0).toFixed(1));
  const proteinTarget = calculateProteinTarget(weight, state.goal, state.activityLevel);

  const water = normalizeWaterMl(log.water);
  const waterTarget = Math.max(MIN_WATER_TARGET_ML, Math.round(weight * WATER_ML_PER_KG));

  const steps = log.steps || 0;

  const pct = (value, target) => (target > 0 ? (value / target) * 100 : 0);

  return {
    weight,
    calories, calorieTarget, caloriesPct: pct(calories, calorieTarget),
    protein, proteinTarget, proteinPct: pct(protein, proteinTarget),
    water, waterTarget, waterPct: pct(water, waterTarget),
    steps, stepsTarget: STEPS_TARGET, stepsPct: pct(steps, STEPS_TARGET),
  };
}

/** How many of the four daily targets are met. */
export function countGoalsMet(totals) {
  return [
    totals.calories >= totals.calorieTarget,
    totals.protein >= totals.proteinTarget,
    totals.water >= totals.waterTarget,
    totals.steps >= totals.stepsTarget,
  ].filter(Boolean).length;
}
