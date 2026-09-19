/* ---------------- lib/recentFoods.js ----------------
 * Most people eat the same twenty-odd things on rotation, so the fastest food
 * log is one that already knows what you eat. These helpers derive that from
 * the log history rather than needing any new stored state.
 */
import { shiftDateString, getLocalDateString } from './date.js';

const HISTORY_DAYS = 30;

/** A stable key for "the same food at the same portion". */
function entryKey(food) {
  return `${(food.name || '').toLowerCase()}|${food.qty || 0}|${food.unit || ''}`;
}

/**
 * Foods logged most often over the last 30 days, most frequent first, with
 * ties broken by how recently they were eaten.
 */
export function frequentFoods(logs = {}, currentDate, limit = 6) {
  const today = currentDate || getLocalDateString();
  const seen = new Map();
  let dateStr = today;

  for (let i = 0; i < HISTORY_DAYS; i++) {
    const foods = (logs[dateStr] && logs[dateStr].foods) || [];
    for (const f of foods) {
      if (!f || !f.name) continue;
      const key = entryKey(f);
      const existing = seen.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        // i is days-ago, so a smaller i is more recent.
        seen.set(key, { food: f, count: 1, daysAgo: i });
      }
    }
    dateStr = shiftDateString(dateStr, -1);
  }

  return [...seen.values()]
    .sort((a, b) => (b.count - a.count) || (a.daysAgo - b.daysAgo))
    .slice(0, limit)
    .map((e) => ({ ...e.food, timesLogged: e.count }));
}

/** Everything logged on the previous day, for a one-tap repeat. */
export function yesterdaysFoods(logs = {}, currentDate) {
  const prev = shiftDateString(currentDate || getLocalDateString(), -1);
  return ((logs[prev] && logs[prev].foods) || []).filter((f) => f && f.name);
}
