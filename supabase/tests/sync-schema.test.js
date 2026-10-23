/* Sync against the real schema (PGlite + supabase/migrations), not the
 * in-memory fake. Regression for client_updated_at: records without a local
 * timestamp used to send an explicit null into a NOT NULL column, which
 * PostgreSQL rejects — aborting the whole push.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createDatabase, clientFor } from './pgliteSupabase.js';
import {
  toRecords, pushChanges, pullChanges, mergeRemote, advanceSnapshot, emptySnapshot, UNKNOWN_CLIENT_TIME,
} from '../../src/lib/sync.js';

const A = { id: 'aaaaaaaa-0000-4000-8000-000000000001', email: 'a@example.com' };
const B = { id: 'bbbbbbbb-0000-4000-8000-000000000002', email: 'b@example.com' };
const DAY = '2026-10-23';

/** State exactly as the app produces it before anything has been stamped:
 *  a day created by ensureLog (no updatedAt), a meal entry logged before
 *  entries had timestamps, a custom food without updatedAt, and a profile
 *  whose settings were never edited (no settingsUpdatedAt). */
function unstampedState() {
  return {
    goal: 'stay-consistent',
    weight: 70,
    syncEpoch: 'ep-a',
    logs: {
      [DAY]: {
        water: 500, walk: 0, gym: 0, weight: 70,
        foods: [{ id: 'legacy-2026-10-23-0-abcd1234', name: 'Idli', qty: 3, unit: 'piece', cal: 117, protein: 6 }],
      },
    },
    customFoods: [{ id: '11111111-2222-4333-8444-555555555555', name: 'Pesarattu', unit: 'piece', basis: 'perServing', calories: 110, source: 'user_entered', deletedAt: null }],
  };
}

/** One sync cycle in the same order as useCloudSync: pull and merge first,
 *  then push whatever is still different. */
async function sync(client, userId, state, snapshot) {
  const pulled = await pullChanges(client, userId, snapshot);
  const merged = mergeRemote(state, pulled.remote);
  const snap = advanceSnapshot(snapshot, merged.state, merged.accepted, pulled.cursor);
  const pushed = await pushChanges(client, userId, merged.state, snap);
  return { state: merged.state, snapshot: pushed.snapshot };
}

let db;
beforeEach(async () => {
  db = await createDatabase([A, B]);
}, 60000);

describe('client_updated_at against the real NOT NULL schema', () => {
  it('control: PostgreSQL rejects an explicit null (what the old code sent)', async () => {
    const client = clientFor(db, A);
    const { error } = await client.from('daily_logs').upsert(
      { user_id: A.id, log_date: DAY, data: {}, client_updated_at: null },
      { onConflict: 'user_id,log_date' },
    );
    expect(error?.code).toBe('23502');
    expect(error?.message).toMatch(/client_updated_at/);
  });

  it('never builds a record with a null client_updated_at', () => {
    const r = toRecords(unstampedState());
    const all = [...Object.values(r.meals), ...Object.values(r.days), ...Object.values(r.foods), r.profile];
    for (const rec of all) expect(rec.client_updated_at).toBe(UNKNOWN_CLIENT_TIME);
  });

  it('pushes a fully unstamped state without errors, into every table', async () => {
    const client = clientFor(db, A);
    const { pushed } = await pushChanges(client, A.id, unstampedState(), emptySnapshot('ep-a'));
    expect(pushed).toBe(4); // profile, custom food, day, meal entry

    for (const table of ['profiles', 'daily_logs', 'meal_entries', 'custom_foods']) {
      const r = await db.query(`select client_updated_at from public.${table} where user_id = $1`, [A.id]);
      expect(r.rows, table).toHaveLength(1);
      expect(r.rows[0].client_updated_at.toISOString(), table).toBe(UNKNOWN_CLIENT_TIME);
    }
  });

  it('a genuine local edit still wins over a remote row with an unknown time', async () => {
    const a = clientFor(db, A);
    const first = await sync(a, A.id, unstampedState(), emptySnapshot('ep-a'));

    // Another device has the epoch-stamped copy; this device edits the day for real.
    const edited = {
      ...first.state,
      logs: { [DAY]: { ...first.state.logs[DAY], water: 1500, updatedAt: '2026-10-23T09:00:00.000Z' } },
    };
    const pulled = await pullChanges(a, A.id, emptySnapshot('ep-a'));
    const merged = mergeRemote(edited, pulled.remote);
    expect(merged.state.logs[DAY].water).toBe(1500);
    expect(merged.accepted.days).not.toContain(DAY);

    // And the real edit then reaches the server and replaces the epoch row.
    await pushChanges(a, A.id, edited, first.snapshot);
    const r = await db.query('select data, client_updated_at from public.daily_logs where user_id = $1', [A.id]);
    expect(r.rows[0].data.water).toBe(1500);
    expect(r.rows[0].client_updated_at.toISOString()).toBe('2026-10-23T09:00:00.000Z');
  });

  it('a device with no local timestamp accepts a real remote edit', async () => {
    const a = clientFor(db, A);
    await pushChanges(a, A.id, { ...unstampedState(), logs: { [DAY]: { water: 2000, foods: [], updatedAt: '2026-10-23T10:00:00.000Z' } } }, emptySnapshot('ep-a'));

    const otherDevice = { ...unstampedState(), syncEpoch: 'ep-b', logs: { [DAY]: { water: 0, foods: [] } } };
    const pulled = await pullChanges(a, A.id, emptySnapshot('ep-b'));
    const merged = mergeRemote(otherDevice, pulled.remote);
    expect(merged.state.logs[DAY].water).toBe(2000);
  });

  it('round trip to a second device, and another user sees none of it (RLS)', async () => {
    const a = clientFor(db, A);
    await sync(a, A.id, unstampedState(), emptySnapshot('ep-a'));

    const fresh = { syncEpoch: 'ep-a2', logs: {}, customFoods: [] };
    const restored = await sync(a, A.id, fresh, emptySnapshot('ep-a2'));
    expect(restored.state.logs[DAY].foods[0]).toMatchObject({ name: 'Idli', cal: 117 });
    expect(restored.state.customFoods[0].name).toBe('Pesarattu');
    expect(restored.state.goal).toBe('stay-consistent');

    const b = clientFor(db, B);
    const seenByB = await pullChanges(b, B.id, emptySnapshot('ep-b'));
    expect(Object.values(seenByB.remote).flat()).toHaveLength(0);
  });
});
