/* ---------------- lib/storage.js ----------------
 * Safe localStorage access.
 *
 * Touching localStorage is not guaranteed to succeed: browsers with site data
 * blocked (and Safari in private mode) throw a SecurityError on plain access,
 * and setItem throws QuotaExceededError once the origin's storage is full —
 * which matters here because a year of daily logs with food arrays is not a
 * trivial payload. An unguarded read in a useState initialiser takes the whole
 * app down with a blank screen; an unguarded write inside a timer throws where
 * nothing can catch it and the user loses data with no indication.
 *
 * Every helper degrades instead of throwing. Writes report success so callers
 * can tell the user the truth about whether their data was saved.
 */

export function readLocal(key) {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`localStorage read failed for "${key}":`, err.message);
    return null;
  }
}

export function readLocalJSON(key, fallback = null) {
  const raw = readLocal(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Returns true when the value was actually written. */
export function writeLocal(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`localStorage write failed for "${key}":`, err.message);
    return false;
  }
}

export function removeLocal(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.warn(`localStorage remove failed for "${key}":`, err.message);
    return false;
  }
}
