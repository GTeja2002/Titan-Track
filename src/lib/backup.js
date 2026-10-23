/* ---------------- lib/backup.js ----------------
 * Full export and import of a user's data as JSON.
 *
 * Everything this app knows lives in one browser's localStorage. Clearing site
 * data, switching phone or reinstalling loses all of it, and cloud sync is
 * optional and off for most people. A file the user controls is the only
 * portability guarantee that does not depend on a backend.
 */
import { getLocalDateString } from './date.js';

export const BACKUP_VERSION = 1;

/** Keys that are session/account-scoped rather than user data, so never
 *  exported — importing another account's sync identity would confuse sync. */
const EXCLUDED = new Set(['email', 'userId', 'syncEpoch', 'settingsUpdatedAt']);

export function buildBackup(state) {
  const data = {};
  for (const [k, v] of Object.entries(state || {})) {
    if (!EXCLUDED.has(k)) data[k] = v;
  }
  return {
    app: 'titantrack',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function backupFilename(currentDate) {
  return `titantrack-backup-${currentDate || getLocalDateString()}.json`;
}

/**
 * Validates a parsed backup file.
 * @returns {{ ok: true, data: object } | { ok: false, error: string }}
 */
export function parseBackup(raw) {
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: "That file isn't a TitanTrack backup." };
  }
  if (parsed.app !== 'titantrack') {
    return { ok: false, error: "That file isn't a TitanTrack backup." };
  }
  if (Number(parsed.version) > BACKUP_VERSION) {
    return { ok: false, error: 'That backup came from a newer version of TitanTrack.' };
  }
  if (!parsed.data || typeof parsed.data !== 'object') {
    return { ok: false, error: 'That backup has no data in it.' };
  }
  for (const k of EXCLUDED) delete parsed.data[k];
  if (parsed.data.logs && typeof parsed.data.logs !== 'object') {
    return { ok: false, error: 'That backup’s daily logs are unreadable.' };
  }
  return { ok: true, data: parsed.data };
}

/** Days of history a backup contains, for the confirmation prompt. */
export function describeBackup(data) {
  const logs = (data && data.logs) || {};
  const days = Object.keys(logs).length;
  const meals = Object.values(logs).reduce((n, d) => n + ((d && d.foods) ? d.foods.length : 0), 0);
  return { days, meals };
}

const csvCell = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Every food entry ever logged, one row each — opens in Excel/Sheets. */
export function buildMealsCsv(state) {
  const header = ['date', 'meal', 'time_eaten_utc', 'food', 'quantity', 'unit', 'calories', 'calories_known', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'nutrition_source'];
  const rows = [header.join(',')];
  const logs = (state && state.logs) || {};
  for (const date of Object.keys(logs).sort()) {
    for (const f of (logs[date] && logs[date].foods) || []) {
      rows.push([
        date, f.mealType || '', f.consumedAt || '', f.name, f.qty, f.unit, f.cal,
        f.calUnknown ? 'no' : 'yes', f.protein, f.carbs, f.fat, f.fiber, f.source || '',
      ].map(csvCell).join(','));
    }
  }
  return rows.join('\r\n') + '\r\n';
}

/** One row per day: activity, water, weight and the day's calorie total. */
export function buildDailyCsv(state) {
  const header = ['date', 'calories', 'protein_g', 'water_ml', 'steps', 'walk_km', 'gym_min', 'weight_kg', 'items_logged'];
  const rows = [header.join(',')];
  const logs = (state && state.logs) || {};
  for (const date of Object.keys(logs).sort()) {
    const d = logs[date] || {};
    const foods = d.foods || [];
    rows.push([
      date,
      foods.reduce((n, f) => n + (Number(f.cal) || 0), 0),
      Math.round(foods.reduce((n, f) => n + (Number(f.protein) || 0), 0) * 10) / 10,
      d.water || 0, d.steps || 0, d.walk || 0, d.gym || 0, d.weight || '', foods.length,
    ].map(csvCell).join(','));
  }
  return rows.join('\r\n') + '\r\n';
}
