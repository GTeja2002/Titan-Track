/* ---------------- lib/streak.js ----------------
 * Streak counting, with forgiveness.
 *
 * A streak that dies the first time someone has a bad day punishes exactly the
 * people it is meant to encourage: the usual failure mode is that one missed
 * day makes the number worthless, so the app gets abandoned. Two mechanisms
 * soften that without making the streak meaningless:
 *
 *  - Rest days. Days the user has declared off do not need activity and do not
 *    break the run.
 *  - Freezes. A limited number of missed days can be absorbed, oldest first,
 *    so a single slip does not reset the count.
 *
 * Today never breaks a streak on its own — the day is not over yet.
 */
import { shiftDateString, getLocalDateString } from './date.js';

export const MAX_FREEZES = 2;
const LOOKBACK_DAYS = 400;

export function dayHadActivity(dayLog) {
  if (!dayLog) return false;
  return Boolean(
    (dayLog.foods && dayLog.foods.length > 0) ||
    dayLog.water > 0 ||
    dayLog.walk > 0 ||
    dayLog.gym > 0 ||
    dayLog.weight > 0 ||
    dayLog.sleep > 0 ||
    dayLog.mood
  );
}

/** JS day index (0 = Sunday) for a 'YYYY-MM-DD' string, in local time. */
export function weekdayIndex(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? -1 : d.getDay();
}

export function isRestDay(dateStr, restDays = []) {
  return restDays.includes(weekdayIndex(dateStr));
}

/**
 * @returns {{ streak: number, freezesUsed: number, restDaysCredited: number,
 *             loggedToday: boolean, todayIsRest: boolean }}
 */
export function computeStreak(logs = {}, currentDate, options = {}) {
  const { restDays = [], freezesAvailable = MAX_FREEZES } = options;
  const today = currentDate || getLocalDateString();

  let streak = 0;
  let freezesUsed = 0;
  let restDaysCredited = 0;
  let dateStr = today;

  const loggedToday = dayHadActivity(logs[today]);
  const todayIsRest = isRestDay(today, restDays);

  for (let i = 0; i < LOOKBACK_DAYS; i++) {
    const active = dayHadActivity(logs[dateStr]);

    if (active) {
      streak++;
    } else if (isRestDay(dateStr, restDays)) {
      // A planned rest day keeps the run alive but is not itself a day of work.
      restDaysCredited++;
    } else if (i === 0) {
      // Today is not over — an empty today is not yet a miss.
    } else if (freezesUsed < freezesAvailable) {
      freezesUsed++;
    } else {
      break;
    }

    dateStr = shiftDateString(dateStr, -1);
  }

  return { streak, freezesUsed, restDaysCredited, loggedToday, todayIsRest };
}

/** How many of the last 7 days (including today) had activity. */
export function activeDaysInLastWeek(logs = {}, currentDate) {
  let dateStr = currentDate || getLocalDateString();
  let count = 0;
  for (let i = 0; i < 7; i++) {
    if (dayHadActivity(logs[dateStr])) count++;
    dateStr = shiftDateString(dateStr, -1);
  }
  return count;
}
