/* ---------------- lib/calculations.js ----------------
 * Pure calculation + data helpers — no React, no side effects (aside from
 * console usage none), safe to unit test in isolation.
 */
import { getLocalDateString, shiftDateString } from './date.js';
import { getGoal, allowsDeficit } from './goals.js';

export function calculateBMI(weightKg, heightCm) {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || weightKg <= 0 || heightCm <= 0) return 0;
  const heightMeters = heightCm / 100;
  return Number((weightKg / (heightMeters * heightMeters)).toFixed(1));
}

export function calculateBodyFat(weightKg, heightCm, useManual, manualBodyFat, age, gender) {
  if (useManual && Number.isFinite(manualBodyFat) && manualBodyFat > 0) {
    return Math.min(0.5, Math.max(0.05, manualBodyFat / 100));
  }
  const bmi = calculateBMI(weightKg, heightCm);
  const genderFactor = gender === 'female' ? 0 : 1;
  const estimatedPercent = 1.2 * bmi + 0.23 * age - 10.8 * genderFactor - 5.4;
  return Math.min(0.5, Math.max(0.05, estimatedPercent / 100));
}

export function calculateLeanMass(weightKg, bodyFatRatio) {
  if (!Number.isFinite(weightKg) || !Number.isFinite(bodyFatRatio) || weightKg <= 0) return 0;
  return Number((weightKg * (1 - bodyFatRatio)).toFixed(1));
}

export function calculateFatMass(weightKg, bodyFatRatio) {
  if (!Number.isFinite(weightKg) || !Number.isFinite(bodyFatRatio) || weightKg <= 0) return 0;
  return Number((weightKg * bodyFatRatio).toFixed(1));
}

export function calculateBMR(gender, age, weightKg, heightCm) {
  if (!Number.isFinite(age) || !Number.isFinite(weightKg) || !Number.isFinite(heightCm)) return 0;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  // Mifflin-St Jeor's sex constants are +5 and -161. Someone who would rather
  // not state a sex gets the midpoint rather than being silently counted as
  // male, which is what an unrecognised value used to do.
  if (gender === 'female') return Math.round(base - 161);
  if (gender === 'male') return Math.round(base + 5);
  return Math.round(base - 78);
}

export function calculateTDEE(bmr, activityLevel) {
  const factors = {
    Sedentary: 1.2,
    Light: 1.375,
    Moderate: 1.55,
    Active: 1.725,
    Athlete: 1.9,
  };
  const factor = factors[activityLevel] || 1.55;
  return Math.round(bmr * factor);
}

export const DEFAULT_GOAL_HORIZON_DAYS = 90;

export function getRemainingDays(currentDateStr, targetDateStr) {
  const startStr = currentDateStr || getLocalDateString();
  // No target date set yet? Fall back to a rolling 90-day horizon rather than
  // a fixed calendar date — a hardcoded date silently collapses to 1 day once
  // it passes, which would distort every downstream calorie target.
  const endStr = targetDateStr || shiftDateString(startStr, DEFAULT_GOAL_HORIZON_DAYS);
  const curDate = new Date(startStr + 'T00:00:00');
  const tarDate = new Date(endStr + 'T00:00:00');
  const timeDiff = tarDate.getTime() - curDate.getTime();
  return Math.max(1, Math.round(timeDiff / (1000 * 3600 * 24)));
}

export function calculateDailyCalories(goal, tdee, weight = 70, goalWeight = 70, days = 90) {
  // Derive the calorie target from the ACTUAL weight → goal-weight direction
  // first, not just from which goal chip is selected. This ensures weight-gain
  // math is always applied whenever the goal weight is above current weight —
  // even if `goal` is still 'lose-fat' or 'maintain' (e.g. the goal-weight
  // slider was moved without also updating the goal chip) — instead of
  // silently applying a deficit to someone who's trying to gain weight.
  const diff = goalWeight - weight; // positive = needs to gain, negative = needs to lose

  if (diff > 0.1) {
    const reqSurplus = days > 0 ? Math.round((diff * 7700) / days) : 250;
    const surplus = Math.max(250, Math.min(800, reqSurplus));
    return Math.round(tdee + surplus);
  }

  if (diff < -0.1) {
    const reqDeficit = days > 0 ? Math.round((Math.abs(diff) * 7700) / days) : 300;
    const deficit = Math.max(300, Math.min(1000, reqDeficit));
    return Math.max(1200, Math.round(tdee - deficit));
  }

  // Goal weight ≈ current weight, or a non-scale goal: use the goal's own
  // energy stance rather than assuming a deficit.
  const energy = getGoal(goal).energy;
  if (energy === 'deficit') return Math.max(1200, Math.round(tdee - 300));
  if (energy === 'surplus') return Math.round(tdee + 250);
  if (energy === 'slight-surplus') return Math.round(tdee + 150);
  return Math.round(tdee);
}

/** calculateDailyCalories, with the under-18 rule applied.
 *
 * Growing bodies should not be handed an adult weight-loss deficit, so for a
 * minor the target never drops below maintenance. This wraps rather than
 * replaces the pure function so the underlying maths stays easy to test. */
export function calculateDailyCaloriesForAge(age, goal, tdee, weight, goalWeight, days) {
  const target = calculateDailyCalories(goal, tdee, weight, goalWeight, days);
  if (!allowsDeficit(age)) return Math.max(target, Math.round(tdee));
  return target;
}

/**
 * Calculates evidence-based daily protein target (in grams) based on body weight,
 * fitness goal, and daily activity level.
 * 
 * - Baseline RDA (0.8g/kg): For general health, routine daily life, and standard fat-loss pace (e.g. 95 kg * 0.8 = 76g)
 * - Moderate (1.0g - 1.2g/kg): For active fat loss and recovery
 * - Athletic/Gain Muscle (1.2g - 1.6g/kg): For resistance training and intense muscle hypertrophy
 */
export function calculateProteinTarget(weightKg, goal = 'maintain', activityLevel = 'Sedentary') {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return 60;

  let multiplier = 0.8; // Baseline RDA for everyday routine / fat loss

  if (goal === 'lose-fat') {
    if (activityLevel === 'Active' || activityLevel === 'Athlete') {
      multiplier = 1.2;
    } else if (activityLevel === 'Moderate') {
      multiplier = 1.0;
    } else {
      multiplier = 0.8; // Standard RDA for routine/sedentary fat loss (e.g. 95kg * 0.8 = 76g)
    }
  } else if (goal === 'gain-muscle') {
    if (activityLevel === 'Active' || activityLevel === 'Athlete') {
      multiplier = 1.6;
    } else {
      multiplier = 1.2;
    }
  } else {
    // maintain / general wellness
    if (activityLevel === 'Active' || activityLevel === 'Athlete') {
      multiplier = 1.0;
    } else {
      multiplier = 0.8;
    }
  }

  return Math.round(weightKg * multiplier);
}

export function calculateWalkCalories(distanceKm, weightKg) {
  if (!Number.isFinite(distanceKm) || !Number.isFinite(weightKg) || distanceKm <= 0 || weightKg <= 0) return 0;
  // ~0.53 kcal per kg of bodyweight per km at a moderate walking pace (MET ≈ 3.5),
  // instead of one flat kcal/km figure applied to every body weight.
  return Math.round(distanceKm * weightKg * 0.53);
}

/** Sorted {date, weight} points pulled from the logs object, skipping days with no weigh-in. */
export function getWeightHistory(logs) {
  return Object.keys(logs || {})
    .filter((d) => logs[d]?.weight > 0)
    .sort()
    .map((d) => ({ date: d, weight: logs[d].weight }));
}

/** Trailing simple moving average over the last `windowSize` logged entries (not calendar days). */
export function movingAverage(points, windowSize) {
  return points.map((p, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const slice = points.slice(start, i + 1);
    const avg = slice.reduce((s, q) => s + q.weight, 0) / slice.length;
    return { date: p.date, weight: Number(avg.toFixed(2)) };
  });
}

/**
 * Projects future weight day-by-day instead of assuming a fixed weekly rate.
 * Unlike the static "7,700 kcal ≈ 1 kg, applied once" shortcut, this re-derives
 * BMR/TDEE from the *simulated* weight on every simulated day, so the pace
 * naturally slows down as weight changes (a lighter body burns less at rest) —
 * closer to how real weight loss/gain decelerates, without needing a full
 * clinical energy-balance model. Still an estimate, not a guarantee.
 */
export function simulateWeightProjection({ startWeight, goalWeight, gender, age, heightCm, activityLevel, calorieTarget, maxDays = 365 }) {
  const points = [{ day: 0, weight: Number(startWeight.toFixed(1)) }];
  if (!Number.isFinite(startWeight) || !Number.isFinite(goalWeight) || startWeight <= 0) {
    return { points, daysToGoal: null, reached: false };
  }
  const losing = goalWeight < startWeight;
  let simWeight = startWeight;
  let daysToGoal = null;

  for (let day = 1; day <= maxDays; day++) {
    const bmrToday = calculateBMR(gender, age, simWeight, heightCm);
    const tdeeToday = calculateTDEE(bmrToday, activityLevel);
    const netBalance = calorieTarget - tdeeToday;
    simWeight = simWeight + netBalance / 7700;
    if (losing) simWeight = Math.max(simWeight, goalWeight);
    else simWeight = Math.min(simWeight, goalWeight);

    if (day % 7 === 0 || day === maxDays) {
      points.push({ day, weight: Number(simWeight.toFixed(1)) });
    }
    if (daysToGoal === null && Math.abs(simWeight - goalWeight) < 0.1) {
      daysToGoal = day;
      if (day % 7 !== 0) points.push({ day, weight: Number(simWeight.toFixed(1)) });
      break;
    }
  }
  return { points, daysToGoal, reached: daysToGoal !== null };
}

export function calculateIdealWeight(heightCm) {
  if (!Number.isFinite(heightCm) || heightCm <= 0) return { min: 0, max: 0 };
  const base = 22 * (heightCm / 100) ** 2;
  const min = Math.round(base - 2);
  const max = Math.round(base + 5);
  return { min, max };
}

// Small inline tag used everywhere a value carries an estimated/measured
// status, so the person can tell at a glance whether it's an app-side
// estimate or their own real number. Intentionally muted (no red) — this
// communicates uncertainty, not an emergency.
export function getBMICategory(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export function getHealthSummary(bmi, bodyFatRatio, activityLevel) {
  let title = 'Healthy BMI';
  const recommendations = [];

  if (bmi < 18.5) {
    title = 'Underweight';
    recommendations.push('Add healthy calories');
  } else if (bmi < 25) {
    title = 'Healthy BMI';
    recommendations.push('Maintain active life');
  } else if (bmi < 30) {
    title = 'BMI Slightly High';
    recommendations.push('Increase daily movement');
  } else {
    title = 'BMI Elevated';
    recommendations.push('Reduce calorie intake');
  }

  if (bodyFatRatio > 0.28) {
    recommendations.push('Increase protein intake');
  } else if (bodyFatRatio < 0.12) {
    recommendations.push('Add balanced fats');
  } else {
    recommendations.push('Keep consistent meals');
  }

  if (activityLevel === 'Sedentary') {
    recommendations.unshift('Add light movement');
  }

  return {
    title,
    recommendations: recommendations.slice(0, 3),
  };
}

export function getNearestBodyImage(gender, bodyFatPercent, useManual, manualBodyFat, viewName = 'Front') {
  const normalizedView = String(viewName || 'Front').toLowerCase();
  const viewMap = {
    front: 'front',
    left: 'left',
    right: 'right',
    back: 'back',
  };
  const selectedView = viewMap[normalizedView] || 'front';
  const percent = useManual ? manualBodyFat : bodyFatPercent;
  const options = gender === 'female'
    ? [15, 20, 25, 30, 35, 40, 45]
    : [5, 10, 15, 20, 25, 30, 35];

  const closest = options.reduce((best, option) => {
    const bestDiff = Math.abs(best - percent);
    const optionDiff = Math.abs(option - percent);
    return optionDiff < bestDiff ? option : best;
  }, options[0]);

  const folderLabel = String(closest).padStart(2, '0');

  return `/assets/${gender}/${folderLabel}/${selectedView}.png`;
}

/* Built-in food list. The data lives in src/data/foods.json so the list can
 * be edited (or later loaded from the database) without touching logic. Your
 * own foods are stored per account as custom foods — see lib/nutrition.js. */
import foodData from '../data/foods.json';
import { calcNutrition } from './nutrition.js';
export const FOOD_DB = foodData.foods;
export const QUICK_CHIPS = foodData.quickChips;

export function findFood(name) {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  return FOOD_DB.find((f) => f.name.toLowerCase() === n) ?? null;
}

// Thin wrappers kept for existing callers; the arithmetic lives in
// lib/nutrition.js so there is exactly one implementation of it.
export function calcCal(food, qty) {
  return calcNutrition(food, qty).cal;
}

export function calcMacros(food, qty) {
  const { protein, carbs, fat, fiber } = calcNutrition(food, qty);
  return { protein, carbs, fat, fiber };
}

/** Water logs have two historical shapes: older entries stored a count of
 * 250 ml glasses, newer ones store exact millilitres. Normalises either to
 * millilitres.
 *
 * The threshold is a heuristic on legacy data, so it is deliberately low:
 * anything under LEGACY_GLASS_THRESHOLD_ML is read as a glass count. A user
 * logging a genuine sip smaller than that would be over-counted, which is why
 * new writes should always store exact millilitres.
 */
export const LEGACY_GLASS_THRESHOLD_ML = 50;
export const ML_PER_GLASS = 250;

export function normalizeWaterMl(rawWater) {
  const raw = Number(rawWater);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw < LEGACY_GLASS_THRESHOLD_ML ? raw * ML_PER_GLASS : raw;
}
