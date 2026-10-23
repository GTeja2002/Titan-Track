/* ---------------- lib/mealLog.js ----------------
 * Pure state transforms for a day's food entries and the user's custom foods.
 * Components call these through update(); keeping them pure keeps React 18
 * StrictMode's double-invoked updaters harmless and makes them testable.
 */
import { createEmptyLogShape } from './logShape.js';
import { newId } from './nutrition.js';

/** Small stable string hash (FNV-1a) — for deterministic legacy ids only. */
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Entries logged before entries had ids get one derived from their content
 * and position. Deterministic on purpose: two devices upgrading the same
 * cloud copy must assign the SAME id, or sync would see two different records
 * and duplicate them.
 */
export function legacyEntryId(date, index, f) {
  return `legacy-${date}-${index}-${hash(`${f.name}|${f.qty}|${f.unit}|${f.cal}`)}`;
}

/** Gives every food entry an id. Returns the same `logs` object when nothing
 *  needed changing, so it is safe to run on every state update. */
export function ensureEntryIds(logs) {
  if (!logs) return logs;
  let changed = false;
  const next = {};
  for (const [date, day] of Object.entries(logs)) {
    const foods = day?.foods;
    if (!Array.isArray(foods) || foods.every((f) => f && f.id)) {
      next[date] = day;
      continue;
    }
    changed = true;
    next[date] = {
      ...day,
      foods: foods.filter(Boolean).map((f, i) => (f.id ? f : { ...f, id: legacyEntryId(date, i, f) })),
    };
  }
  return changed ? next : logs;
}

function dayOf(state, date) {
  return (state.logs && state.logs[date]) || createEmptyLogShape(state.weight);
}

function withDay(state, date, day) {
  return { ...state, logs: { ...state.logs, [date]: day } };
}

/** Appends entries to a day. Entries whose id is already present are skipped,
 *  so a double-tap or a retried action never logs the same thing twice. */
export function addEntries(state, date, entries) {
  const day = dayOf(state, date);
  const foods = day.foods || [];
  const existing = new Set(foods.map((f) => f.id));
  const fresh = entries.filter((e) => e && !existing.has(e.id));
  if (fresh.length === 0) return state;
  return withDay(state, date, { ...day, foods: [...foods, ...fresh] });
}

export function removeEntry(state, date, entryId) {
  const day = dayOf(state, date);
  const foods = (day.foods || []).filter((f) => f.id !== entryId);
  if (foods.length === (day.foods || []).length) return state;
  return withDay(state, date, { ...day, foods });
}

export function replaceEntry(state, date, entry) {
  const day = dayOf(state, date);
  let found = false;
  const foods = (day.foods || []).map((f) => {
    if (f.id !== entry.id) return f;
    found = true;
    return entry;
  });
  return found ? withDay(state, date, { ...day, foods }) : state;
}

/* ---- custom foods ---- */

export function upsertCustomFood(state, food) {
  const list = state.customFoods || [];
  const i = list.findIndex((f) => f.id === food.id);
  const next = i === -1 ? [...list, food] : list.map((f) => (f.id === food.id ? food : f));
  return { ...state, customFoods: next };
}

/** Soft delete: the definition leaves the picker, but the row stays so sync
 *  can propagate the deletion. Past meal entries keep their own snapshot. */
export function deleteCustomFood(state, foodId, now = new Date()) {
  const ts = now.toISOString();
  return {
    ...state,
    customFoods: (state.customFoods || []).map((f) => (f.id === foodId ? { ...f, deletedAt: ts, updatedAt: ts } : f)),
  };
}

export function liveCustomFoods(state) {
  return (state.customFoods || []).filter((f) => !f.deletedAt);
}

export { newId };
