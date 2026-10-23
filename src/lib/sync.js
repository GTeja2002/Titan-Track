/* ---------------- lib/sync.js ----------------
 * Two-way sync between the local state (localStorage, instant, works offline)
 * and the per-user Supabase tables (see supabase/migrations).
 *
 * How changes are found — a derived outbox:
 *   The app state is flattened into records (one per meal entry, day, custom
 *   food, plus the profile). A "snapshot" remembers a hash of each record as
 *   last confirmed by the server. Anything whose hash differs is pushed;
 *   anything in the snapshot but gone from the state is pushed as a deletion.
 *   If a push fails (offline, server down), the snapshot is not advanced, so
 *   the same changes are simply retried later. Upserts are keyed by ids made
 *   on the device, so a retry can never create a duplicate.
 *
 * Conflicts: last write wins per record, using the device's updatedAt. The
 * server's own updated_at is only used as the pull cursor (it is immune to a
 * device with a wrong clock skipping rows).
 *
 * Safety: deletions are only inferred when the snapshot provably belongs to
 * this exact local copy (matching syncEpoch). If local storage was cleared
 * but the snapshot survived, the snapshot is discarded instead — otherwise an
 * empty local state would look like "the user deleted everything".
 */
import { readLocalJSON, writeLocal, removeLocal } from './storage.js';
import { newId } from './nutrition.js';

const TABLES = ['meal_entries', 'daily_logs', 'custom_foods', 'profiles'];
const PAGE = 1000;
const CHUNK = 500;

/** Top-level state keys that are device/session-only and never synced. */
const LOCAL_ONLY_KEYS = new Set(['logs', 'customFoods', 'currentDate', 'email', 'userId', 'syncEpoch', 'settingsUpdatedAt']);

/* ------------------------------------------------------------------ */
/* Pure helpers (exported for tests)                                   */
/* ------------------------------------------------------------------ */

/** Stable JSON (sorted keys) so equal records always hash equal. */
export function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
}

export function hashRecord(rec) {
  const s = stableStringify(rec);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * Sent as client_updated_at when a record has no local timestamp (days the
 * app creates on its own, entries logged before timestamps existed, a
 * profile whose settings were never edited). The column is NOT NULL, and a
 * database default only applies when the column is omitted — an explicit
 * null is rejected and aborts the whole push. The epoch is exactly how the
 * conflict check (`newer`) already treats a missing timestamp, so this keeps
 * the rule unchanged: an unknown time is the oldest, and any genuine local
 * edit (which always carries a real timestamp) wins.
 */
export const UNKNOWN_CLIENT_TIME = '1970-01-01T00:00:00.000Z';
const clientTime = (...candidates) => candidates.find(Boolean) || UNKNOWN_CLIENT_TIME;

export function entryToRow(e, logDate) {
  return {
    id: e.id,
    log_date: logDate,
    meal_type: ['breakfast', 'lunch', 'dinner', 'snacks'].includes(e.mealType) ? e.mealType : null,
    name: String(e.name || 'Food').slice(0, 120),
    qty: e.qty === '' || e.qty == null ? null : num(e.qty),
    unit: e.unit || null,
    cal: Math.max(0, num(e.cal)),
    protein: num(e.protein),
    carbs: num(e.carbs),
    fat: num(e.fat),
    fiber: num(e.fiber),
    cal_unknown: !!e.calUnknown,
    source: e.source || null,
    food_id: e.foodId || null,
    consumed_at: e.consumedAt || null,
    snapshot: e,
    client_updated_at: clientTime(e.updatedAt, e.createdAt),
  };
}

export function rowToEntry(row) {
  return { ...(row.snapshot || {}), id: row.id };
}

export function dayToRow(date, day) {
  const { foods: _foods, updatedAt, ...data } = day || {};
  return { log_date: date, data, client_updated_at: clientTime(updatedAt) };
}

export function foodToRow(f) {
  return {
    id: f.id,
    name: f.name,
    unit: f.unit,
    basis: f.basis,
    calories: f.calories ?? null,
    protein: f.protein ?? null,
    carbs: f.carbs ?? null,
    fat: f.fat ?? null,
    fiber: f.fiber ?? null,
    source: f.source === 'builtin' ? 'verified' : (f.source || 'user_entered'),
    client_updated_at: clientTime(f.updatedAt),
    deleted_at: f.deletedAt || null,
  };
}

export function rowToFood(row) {
  const n = (v) => (v === null || v === undefined ? null : Number(v));
  return {
    id: row.id, name: row.name, unit: row.unit, basis: row.basis,
    calories: n(row.calories), protein: n(row.protein), carbs: n(row.carbs), fat: n(row.fat), fiber: n(row.fiber),
    source: row.source,
    createdAt: row.created_at ?? null,
    updatedAt: row.client_updated_at ?? row.updated_at ?? null,
    deletedAt: row.deleted_at ?? null,
  };
}

export function profileSettings(state) {
  const out = {};
  for (const [k, v] of Object.entries(state)) if (!LOCAL_ONLY_KEYS.has(k)) out[k] = v;
  return out;
}

/** Flattens state into keyed records, ready to hash and push. */
export function toRecords(state) {
  const meals = {}, days = {}, foods = {};
  for (const [date, day] of Object.entries(state.logs || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day) continue;
    days[date] = dayToRow(date, day);
    for (const e of day.foods || []) if (e && e.id) meals[e.id] = entryToRow(e, date);
  }
  for (const f of state.customFoods || []) if (f && f.id) foods[f.id] = foodToRow(f);
  const profile = {
    settings: profileSettings(state),
    timezone: safeTimezone(),
    client_updated_at: clientTime(state.settingsUpdatedAt),
  };
  return { meals, days, foods, profile };
}

function safeTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; }
}

export function emptySnapshot(epoch) {
  return { epoch, meals: {}, days: {}, foods: {}, profile: null, cursor: {} };
}

/** What needs pushing: changed/new records, and deletions (meals and days
 *  that were in the snapshot but are no longer in the state). Custom foods
 *  are soft-deleted in state, so they never disappear and need no tombstone. */
export function diff(snapshot, records) {
  const changed = (group) => Object.entries(records[group])
    .filter(([k, rec]) => snapshot[group][k] !== hashRecord(rec))
    .map(([k, rec]) => ({ key: k, rec }));
  const removed = (group) => Object.keys(snapshot[group]).filter((k) => !(k in records[group]));
  return {
    meals: changed('meals'),
    days: changed('days'),
    foods: changed('foods'),
    profile: snapshot.profile !== hashRecord(records.profile) ? records.profile : null,
    deletedMeals: removed('meals'),
    deletedDays: removed('days'),
  };
}

export function pendingCount(d) {
  return d.meals.length + d.days.length + d.foods.length + (d.profile ? 1 : 0) + d.deletedMeals.length + d.deletedDays.length;
}

// A missing or unparseable timestamp is the oldest possible time (0). Note
// Date.parse(0) is NOT 0: it parses "0" as the year 2000, which made a record
// with no local timestamp look newer than a server row at the epoch.
const timeOf = (t) => {
  const ms = t ? Date.parse(t) : 0;
  return Number.isFinite(ms) ? ms : 0;
};
const newer = (a, b) => timeOf(a) > timeOf(b);

/**
 * Applies pulled rows to a state (pure). Remote wins unless the local copy of
 * that record is strictly newer. Returns the new state and the keys where the
 * remote version was accepted (so the snapshot can be advanced for them).
 */
export function mergeRemote(state, remote) {
  const logs = { ...(state.logs || {}) };
  const accepted = { meals: [], days: [], foods: [], profile: false };
  const findEntry = (id) => {
    for (const [date, day] of Object.entries(logs)) {
      const i = (day?.foods || []).findIndex((f) => f.id === id);
      if (i !== -1) return { date, i, entry: day.foods[i] };
    }
    return null;
  };
  const dayFor = (date) => logs[date] || { foods: [], walk: 0, gym: 0, weight: 0, water: 0 };

  for (const row of remote.daily_logs || []) {
    const date = typeof row.log_date === 'string' ? row.log_date.slice(0, 10) : row.log_date;
    const local = logs[date];
    if (local && newer(local.updatedAt, row.client_updated_at)) continue;
    const base = dayFor(date);
    if (row.deleted_at) {
      logs[date] = { foods: base.foods || [], walk: 0, gym: 0, weight: 0, water: 0 };
    } else {
      logs[date] = { ...base, ...(row.data || {}), foods: base.foods || [], updatedAt: row.client_updated_at || undefined };
    }
    accepted.days.push(date);
  }

  for (const row of remote.meal_entries || []) {
    const date = typeof row.log_date === 'string' ? row.log_date.slice(0, 10) : row.log_date;
    const found = findEntry(row.id);
    if (found && newer(found.entry.updatedAt, row.client_updated_at)) continue;
    if (found) {
      const day = logs[found.date];
      logs[found.date] = { ...day, foods: day.foods.filter((f) => f.id !== row.id) };
    }
    if (!row.deleted_at) {
      const day = dayFor(date);
      logs[date] = { ...day, foods: [...(day.foods || []), rowToEntry(row)] };
    }
    accepted.meals.push(row.id);
  }

  let customFoods = [...(state.customFoods || [])];
  for (const row of remote.custom_foods || []) {
    const i = customFoods.findIndex((f) => f.id === row.id);
    if (i !== -1 && newer(customFoods[i].updatedAt, row.client_updated_at)) continue;
    const food = rowToFood(row);
    customFoods = i === -1 ? [...customFoods, food] : customFoods.map((f, j) => (j === i ? food : f));
    accepted.foods.push(row.id);
  }

  let next = { ...state, logs, customFoods };
  const prof = (remote.profiles || [])[0];
  if (prof && !newer(state.settingsUpdatedAt, prof.client_updated_at)) {
    next = { ...next, ...(prof.settings || {}), logs, customFoods, settingsUpdatedAt: prof.client_updated_at };
    accepted.profile = true;
  }
  return { state: next, accepted };
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

const snapKey = (userId) => `titan_sync_${userId}`;

export function loadSnapshot(userId, epoch) {
  const s = readLocalJSON(snapKey(userId));
  // A snapshot from a different local copy must not be used to infer deletions.
  if (!s || s.epoch !== epoch) return emptySnapshot(epoch);
  return { ...emptySnapshot(epoch), ...s };
}

export function saveSnapshot(userId, snap) {
  writeLocal(snapKey(userId), JSON.stringify(snap));
}

export function clearSnapshot(userId) {
  removeLocal(snapKey(userId));
}

export function newSyncEpoch() {
  return newId();
}

async function inChunks(rows, fn) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await fn(rows.slice(i, i + CHUNK));
    if (error) throw new Error(error.message || 'sync failed');
  }
}

/**
 * Pushes everything that differs from the snapshot. Advances the snapshot
 * group by group, so partial progress survives a mid-push failure.
 */
export async function pushChanges(client, userId, state, snapshot) {
  const records = toRecords(state);
  const d = diff(snapshot, records);
  const snap = { ...snapshot, meals: { ...snapshot.meals }, days: { ...snapshot.days }, foods: { ...snapshot.foods } };
  const withUser = (rows) => rows.map(({ rec }) => ({ ...rec, user_id: userId }));

  if (d.profile) {
    const { error } = await client.from('profiles').upsert({ ...d.profile, user_id: userId }, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
    snap.profile = hashRecord(d.profile);
  }
  if (d.foods.length) {
    const { error } = await client.from('custom_foods').upsert(withUser(d.foods), { onConflict: 'id' });
    if (!error) {
      for (const { key, rec } of d.foods) snap.foods[key] = hashRecord(rec);
    } else if (error.code === '23505') {
      // Another device already saved a live food with the same name + unit.
      // Push the rest one by one and leave the clashing one local-only rather
      // than letting one food block every future sync.
      for (const item of d.foods) {
        const r = await client.from('custom_foods').upsert({ ...item.rec, user_id: userId }, { onConflict: 'id' });
        if (!r.error) snap.foods[item.key] = hashRecord(item.rec);
        else if (r.error.code !== '23505') throw new Error(r.error.message);
      }
    } else {
      throw new Error(error.message);
    }
  }
  if (d.days.length) {
    await inChunks(withUser(d.days).map((r) => ({ ...r, deleted_at: null })), (rows) => client.from('daily_logs').upsert(rows, { onConflict: 'user_id,log_date' }));
    for (const { key, rec } of d.days) snap.days[key] = hashRecord(rec);
  }
  if (d.meals.length) {
    await inChunks(withUser(d.meals).map((r) => ({ ...r, deleted_at: null })), (rows) => client.from('meal_entries').upsert(rows, { onConflict: 'id' }));
    for (const { key, rec } of d.meals) snap.meals[key] = hashRecord(rec);
  }
  const now = new Date().toISOString();
  if (d.deletedMeals.length) {
    await inChunks(d.deletedMeals, (ids) => client.from('meal_entries').update({ deleted_at: now, client_updated_at: now }).in('id', ids));
    for (const id of d.deletedMeals) delete snap.meals[id];
  }
  if (d.deletedDays.length) {
    await inChunks(d.deletedDays, (dates) => client.from('daily_logs').update({ deleted_at: now, client_updated_at: now }).eq('user_id', userId).in('log_date', dates));
    for (const date of d.deletedDays) delete snap.days[date];
  }
  return { snapshot: snap, pushed: pendingCount(d) };
}

/** Fetches every row changed since the snapshot's cursors. RLS limits this to
 *  the signed-in user; the explicit user_id filter is belt and braces. */
export async function pullChanges(client, userId, snapshot) {
  const out = {};
  const cursor = { ...snapshot.cursor };
  for (const table of TABLES) {
    out[table] = [];
    for (;;) {
      let q = client.from(table).select('*').eq('user_id', userId).order('updated_at', { ascending: true }).limit(PAGE);
      if (cursor[table]) q = q.gt('updated_at', cursor[table]);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      out[table].push(...(data || []));
      if (data && data.length) cursor[table] = data[data.length - 1].updated_at;
      if (!data || data.length < PAGE) break;
    }
  }
  return { remote: out, cursor };
}

/** After a merge, record the accepted remote versions as "in sync". */
export function advanceSnapshot(snapshot, mergedState, accepted, cursor) {
  const records = toRecords(mergedState);
  const snap = { ...snapshot, meals: { ...snapshot.meals }, days: { ...snapshot.days }, foods: { ...snapshot.foods }, cursor };
  for (const id of accepted.meals) {
    if (records.meals[id]) snap.meals[id] = hashRecord(records.meals[id]);
    else delete snap.meals[id];
  }
  for (const date of accepted.days) if (records.days[date]) snap.days[date] = hashRecord(records.days[date]);
  for (const id of accepted.foods) if (records.foods[id]) snap.foods[id] = hashRecord(records.foods[id]);
  if (accepted.profile) snap.profile = hashRecord(records.profile);
  return snap;
}

/** One-time import of the caller's old single-blob row (verified email only). */
export async function claimLegacyState(client) {
  try {
    const { data, error } = await client.rpc('claim_legacy_state');
    if (error) return null;
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

/** Adds an updatedAt to days and a settingsUpdatedAt to the profile whenever
 *  a user action changes them, so last-write-wins has a clock to compare. */
export function stampChanges(prev, next, now = new Date().toISOString()) {
  if (prev === next) return next;
  let out = next;
  if (next.logs && next.logs !== prev.logs) {
    let logs = null;
    for (const [date, day] of Object.entries(next.logs)) {
      if (day && day !== prev.logs?.[date]) {
        logs = logs || { ...next.logs };
        logs[date] = { ...day, updatedAt: now };
      }
    }
    if (logs) out = { ...out, logs };
  }
  for (const k of Object.keys(next)) {
    if (!LOCAL_ONLY_KEYS.has(k) && next[k] !== prev[k]) {
      out = { ...out, settingsUpdatedAt: now };
      break;
    }
  }
  return out;
}

/**
 * Folds the user's old single-blob cloud copy into the current state, once,
 * on their first sign-in with a real account. Never overwrites anything the
 * current state already has: days, entries and foods are only added.
 */
export function importLegacyState(state, legacy) {
  if (!legacy || typeof legacy !== 'object') return state;
  const logs = { ...(state.logs || {}) };
  for (const [date, day] of Object.entries(legacy.logs || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day) continue;
    if (!logs[date]) { logs[date] = day; continue; }
    const have = new Set((logs[date].foods || []).map((f) => f.id).filter(Boolean));
    const extra = (day.foods || []).filter((f) => f && (!f.id || !have.has(f.id)));
    if ((logs[date].foods || []).length === 0 && extra.length) logs[date] = { ...logs[date], foods: extra };
  }
  const haveFoods = new Set((state.customFoods || []).map((f) => f.id));
  const customFoods = [...(state.customFoods || []), ...(legacy.customFoods || []).filter((f) => f && f.id && !haveFoods.has(f.id))];
  // Profile settings from the legacy copy only fill a profile that has not
  // been set up on this account yet.
  const settings = state.isOnboarded ? {} : profileSettings(legacy);
  return { ...state, ...settings, logs, customFoods };
}
