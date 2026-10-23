/* ---------------- lib/activity.js ----------------
 * Distance from steps, and the one walking distance used for calories.
 *
 * Stride length is estimated from height — the common rule of thumb is
 * ~41.5% of height for men and ~41.3% for women. Without a height we fall
 * back to an average adult stride (0.76 m). This is an estimate, and the UI
 * says so.
 */

const DEFAULT_STRIDE_M = 0.76;

export function strideLengthM(heightCm, gender) {
  const h = Number(heightCm);
  if (!Number.isFinite(h) || h < 100 || h > 250) return DEFAULT_STRIDE_M;
  const ratio = gender === 'male' ? 0.415 : gender === 'female' ? 0.413 : 0.414;
  return (h * ratio) / 100;
}

/** Kilometres walked for a number of steps, to 2 decimals. */
export function stepsToKm(steps, heightCm, gender) {
  const s = Number(steps);
  if (!Number.isFinite(s) || s <= 0) return 0;
  return Math.round(s * strideLengthM(heightCm, gender) / 10) / 100;
}

/**
 * The walking distance used for "calories burned": the larger of the
 * distance from counted steps and a walk logged by hand. Steps already
 * include any walk the phone counted, so adding both would count it twice.
 */
export function walkingKmForDay(log, profile = {}) {
  const manual = Number(log?.walk) > 0 ? Number(log.walk) : 0;
  const fromSteps = stepsToKm(log?.steps, profile.height, profile.gender);
  return {
    km: Math.max(manual, fromSteps),
    source: fromSteps > manual ? 'steps' : manual > 0 ? 'manual' : 'none',
    fromSteps,
    manual,
  };
}
