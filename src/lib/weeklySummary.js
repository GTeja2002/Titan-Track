/* ---------------- lib/weeklySummary.js ----------------
 * The last 7 days (ending on the day being viewed), from real logs only:
 * averages over days that have data, totals, weight change, and how many
 * days hit each target. Days with nothing logged are counted as missing,
 * never as zeros that drag averages down.
 */
import { shiftDateString } from './date.js';
import { normalizeWaterMl } from './calculations.js';
import { getDailyTotals } from './dailyTotals.js';
import { stepsToKm } from './activity.js';

const round1 = (n) => Math.round(n * 10) / 10;
const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

export function weeklySummary(state, endDate = state.currentDate) {
  const days = Array.from({ length: 7 }, (_, i) => shiftDateString(endDate, i - 6));
  const logs = state.logs || {};

  const perDay = days.map((date) => {
    const log = logs[date] || {};
    const foods = log.foods || [];
    const t = getDailyTotals({ ...state, currentDate: date });
    return {
      date,
      calories: foods.length ? t.calories : null,
      protein: foods.length ? t.protein : null,
      water: normalizeWaterMl(log.water) || null,
      steps: log.steps > 0 ? log.steps : null,
      weight: log.weight > 0 ? log.weight : null,
      hit: {
        calories: foods.length > 0 && t.calories <= t.calorieTarget * 1.1 && t.calories >= t.calorieTarget * 0.8,
        protein: foods.length > 0 && t.protein >= t.proteinTarget,
        water: t.water >= t.waterTarget,
        steps: t.steps >= t.stepsTarget,
      },
      logged: foods.length > 0 || log.water > 0 || log.steps > 0 || log.walk > 0 || log.gym > 0 || log.weight > 0,
    };
  });

  const vals = (k) => perDay.map((d) => d[k]).filter((v) => v !== null);
  const weights = perDay.filter((d) => d.weight !== null);
  const totalSteps = vals('steps').reduce((s, x) => s + x, 0);

  return {
    days,
    perDay,
    daysLogged: perDay.filter((d) => d.logged).length,
    avgCalories: avg(vals('calories')) === null ? null : Math.round(avg(vals('calories'))),
    avgProtein: avg(vals('protein')) === null ? null : round1(avg(vals('protein'))),
    avgWater: avg(vals('water')) === null ? null : Math.round(avg(vals('water'))),
    totalSteps,
    totalKm: stepsToKm(totalSteps, state.height, state.gender),
    weightChange: weights.length >= 2 ? round1(weights[weights.length - 1].weight - weights[0].weight) : null,
    targetsHit: {
      calories: perDay.filter((d) => d.hit.calories).length,
      protein: perDay.filter((d) => d.hit.protein).length,
      water: perDay.filter((d) => d.hit.water).length,
      steps: perDay.filter((d) => d.hit.steps).length,
    },
  };
}
