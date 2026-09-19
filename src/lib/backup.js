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

/** Keys that are session-scoped rather than user data, so never exported. */
const EXCLUDED = new Set(['email']);

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
