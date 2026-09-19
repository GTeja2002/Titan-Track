/* ---------------- lib/wellness.js ----------------
 * Lifestyle/wellness metrics for the "Health & Wellness Insights" section.
 *
 * Hard rule for every function in this file: nothing here may estimate,
 * calculate, or guess a medical measurement (blood pressure, cholesterol,
 * disease probability, genetic risk, biological/methylation age, etc).
 * Everything below is derived only from things the app actually tracks —
 * logged activity, logged food, and profile basics (age/weight/height/
 * activity level) — and is framed as a lifestyle estimate, never a
 * diagnosis. Blood pressure in particular is never computed anywhere in
 * this file; it only ever comes from what the user manually types in (see
 * bpHistory in useAppState.js).
 */

import { calculateBMI } from './calculations.js';
import { getLocalDateString } from './date.js';

/** Every date string in the trailing `days`-day window ending on `endDateStr`
 * (inclusive), oldest first. */
function trailingDateWindow(endDateStr, days) {
  const end = new Date(endDateStr + 'T00:00:00');
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    dates.push(getLocalDateString(d));
  }
  return dates;
}

/** A lifestyle-only "fitness age" — nudges chronological age up or down a
 * little based on activity level and BMI band. Explicitly not a biological-
 * age or aging-rate claim, just a friendly, transparent framing of "how
 * active/fit-for-your-age does your logged lifestyle look." */
export function getFitnessAgeEstimate({ age, activityLevel, weight, height }) {
  const chronoAge = age ?? 30;
  const bmi = calculateBMI(weight, height);

  const activityAdjust = {
    Sedentary: 3,
    Light: 1,
    Moderate: 0,
    Active: -2,
    Athlete: -4,
  }[activityLevel] ?? 0;

  const bmiAdjust = bmi > 0 && bmi < 25 ? -1 : bmi >= 30 ? 2 : 0;

  const estimate = Math.round(chronoAge + activityAdjust + bmiAdjust);
  return Math.max(16, estimate);
}

/** 0–100 "recovery & lifestyle" score from how many of the last 7 days had
 * any logged activity (walk or gym), blended lightly with declared activity
 * level. This is a consistency score, not a physiological recovery
 * measurement — there's no wearable/HRV data behind it. */
export function getRecoveryScore({ logs, currentDate, activityLevel }) {
  const dates = trailingDateWindow(currentDate, 7);
  const activeDays = dates.filter((d) => (logs[d]?.walk > 0) || (logs[d]?.gym > 0)).length;

  const consistencyScore = (activeDays / 7) * 70; // up to 70 pts from consistency
  const levelScore = {
    Sedentary: 5,
    Light: 12,
    Moderate: 18,
    Active: 24,
    Athlete: 30,
  }[activityLevel] ?? 15; // up to 30 pts from declared baseline activity

  return Math.round(Math.min(100, consistencyScore + levelScore));
}

/** Trailing-7-day activity summary: active days, total walking distance, and
 * gym session count — all directly from logged data, nothing inferred.
 * `estimatedMinutes` is a clearly-labeled rough estimate (average walking
 * pace + a typical session length) for display purposes only, never
 * presented as measured. */
export function getWeeklyActivitySummary({ logs, currentDate }) {
  const dates = trailingDateWindow(currentDate, 7);
  let totalWalkKm = 0;
  let gymSessions = 0;
  let activeDays = 0;

  for (const d of dates) {
    const log = logs[d];
    if (!log) continue;
    const walked = log.walk > 0;
    const gymmed = log.gym > 0;
    if (walked) totalWalkKm += log.walk;
    if (gymmed) gymSessions += 1;
    if (walked || gymmed) activeDays += 1;
  }

  // Rough, clearly-labeled estimate only: ~12 min/km walking + 45 min/gym session.
  const estimatedMinutes = Math.round(totalWalkKm * 12 + gymSessions * 45);
  const weeklyGoalMinutes = 150; // WHO's general weekly-activity guideline — a benchmark, not a prescription

  return {
    activeDays,
    totalWalkKm: Number(totalWalkKm.toFixed(1)),
    gymSessions,
    estimatedMinutes,
    weeklyGoalMinutes,
  };
}

/** Trailing-7-day nutrition *tracking* consistency (days with at least one
 * food logged) — a consistency signal, not a diet-quality or metabolic
 * assessment. */
export function getNutritionConsistency({ logs, currentDate }) {
  const dates = trailingDateWindow(currentDate, 7);
  const loggedDays = dates.filter((d) => (logs[d]?.foods?.length ?? 0) > 0).length;
  return { loggedDays, totalDays: 7 };
}

/** Today's protein/fiber totals against simple, standard nutrition targets
 * (protein ~1.6g/kg bodyweight, fiber ~25-30g/day) — general nutrition
 * guidance, not a metabolic or lab-based calculation. */
export function getTodayMacroProgress({ logs, currentDate, weight, gender }) {
  const foods = logs[currentDate]?.foods ?? [];
  const protein = Number(foods.reduce((s, f) => s + (f.protein || 0), 0).toFixed(1));
  const fiber = Number(foods.reduce((s, f) => s + (f.fiber || 0), 0).toFixed(1));
  const proteinTarget = Math.round((weight ?? 70) * 1.6);
  const fiberTarget = gender === 'female' ? 25 : 30;
  return { protein, proteinTarget, fiber, fiberTarget };
}

/** Appends a manually-entered blood pressure reading. This is the ONLY way
 * a blood pressure value ever enters app state — there is no calculation
 * path that produces one. */
export function appendBpReading(bpHistory, systolic, diastolic) {
  const reading = {
    systolic,
    diastolic,
    date: getLocalDateString(),
  };
  return [reading, ...(bpHistory ?? [])].slice(0, 20); // keep the most recent 20
}
