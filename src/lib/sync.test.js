import { describe, it, expect, beforeEach } from 'vitest';
import {
  toRecords, diff, hashRecord, emptySnapshot, pushChanges, pullChanges, mergeRemote,
  advanceSnapshot, stampChanges, stableStringify, pendingCount, loadSnapshot, saveSnapshot,
} from './sync.js';
import { createMealEntry, createCustomFood } from './nutrition.js';
import { addEntries, removeEntry, upsertCustomFood, deleteCustomFood } from './mealLog.js';

import { fakeSupabase } from '../test/fakeSupabase.js';

const UID = 'user-1';
const food = { id: 'f1', name: 'Paneer', unit: 'g', basis: 'per100', calories: 265, source: 'user_entered' };
const baseState = () => ({ goal: 'consistency', weight: 70, logs: {}, customFoods: [], syncEpoch: 'ep1' });

async function syncOnce(client, state, snap) {
  const pushed = await pushChanges(client, UID, state, snap);
  const pulled = await pullChanges(client, UID, pushed.snapshot);
  const merged = mergeRemote(state, pulled.remote);
  return { state: merged.state, snapshot: advanceSnapshot(pushed.snapshot, merged.state, merged.accepted, pulled.cursor) };
}

describe('hashing', () => {
  it('is independent of key order', () => {
    expect(stableStringify({ b: 1, a: [1, { d: 2, c: 3 }] })).toBe(stableStringify({ a: [1, { c: 3, d: 2 }], b: 1 }));
    expect(hashRecord({ a: 1, b: 2 })).toBe(hashRecord({ b: 2, a: 1 }));
  });
});

describe('diff', () => {
  it('reports everything as new against an empty snapshot, then nothing once synced', async () => {
    let s = addEntries(baseState(), '2026-10-23', [createMealEntry({ food, qty: 100, mealType: 'lunch' })]);
    const d = diff(emptySnapshot('ep1'), toRecords(s));
    expect(d.meals).toHaveLength(1);
    expect(d.days).toHaveLength(1);
    expect(d.profile).toBeTruthy();

    const { client } = fakeSupabase();
    const r = await syncOnce(client, s, emptySnapshot('ep1'));
    expect(pendingCount(diff(r.snapshot, toRecords(r.state)))).toBe(0);
  });

  it('turns a removed entry into a deletion', async () => {
    const e = createMealEntry({ food, qty: 100, mealType: 'lunch' });
    const s = addEntries(baseState(), 'd', [e]);
    const { client } = fakeSupabase();
    const r = await syncOnce(client, { ...s, logs: { '2026-10-23': s.logs.d } }, emptySnapshot('ep1'));
    const removed = removeEntry(r.state, '2026-10-23', e.id);
    expect(diff(r.snapshot, toRecords(removed)).deletedMeals).toEqual([e.id]);
  });
});

describe('push + pull round trip (two devices)', () => {
  let fake;
  beforeEach(() => { fake = fakeSupabase(); });

  it('data entered on the phone appears on the web app', async () => {
    const entry = createMealEntry({ food, qty: 150, mealType: 'dinner' });
    let phone = addEntries(baseState(), '2026-10-23', [entry]);
    phone = upsertCustomFood(phone, createCustomFood({ name: 'Paneer', unit: 'g', basis: 'per100', calories: 265, source: 'user_entered' }));
    await syncOnce(fake.client, phone, emptySnapshot('ep1'));

    const web = await syncOnce(fake.client, { ...baseState(), syncEpoch: 'ep2' }, emptySnapshot('ep2'));
    expect(web.state.logs['2026-10-23'].foods[0]).toMatchObject({ id: entry.id, cal: 398, mealType: 'dinner' });
    expect(web.state.customFoods[0].name).toBe('Paneer');
    expect(web.state.goal).toBe('consistency');
  });

  it('a retried push never duplicates rows', async () => {
    const s = addEntries(baseState(), '2026-10-23', [createMealEntry({ food, qty: 100, mealType: 'lunch' })]);
    await pushChanges(fake.client, UID, s, emptySnapshot('ep1'));
    await pushChanges(fake.client, UID, s, emptySnapshot('ep1')); // as if the first ack was lost
    expect(fake.server.tables.meal_entries).toHaveLength(1);
    expect(fake.server.tables.daily_logs).toHaveLength(1);
  });

  it('offline: nothing is lost, the snapshot does not advance, and it all goes up on reconnect', async () => {
    const s = addEntries(baseState(), '2026-10-23', [createMealEntry({ food, qty: 100, mealType: 'lunch' })]);
    fake.server.offline = true;
    await expect(pushChanges(fake.client, UID, s, emptySnapshot('ep1'))).rejects.toThrow(/fetch/);
    expect(fake.server.tables.meal_entries).toHaveLength(0);

    fake.server.offline = false;
    const r = await pushChanges(fake.client, UID, s, emptySnapshot('ep1'));
    expect(r.pushed).toBeGreaterThan(0);
    expect(fake.server.tables.meal_entries).toHaveLength(1);
  });

  it('a deletion on one device removes the entry on the other', async () => {
    const e = createMealEntry({ food, qty: 100, mealType: 'lunch' });
    const a1 = await syncOnce(fake.client, addEntries(baseState(), '2026-10-23', [e]), emptySnapshot('ep1'));
    const b1 = await syncOnce(fake.client, { ...baseState(), syncEpoch: 'ep2' }, emptySnapshot('ep2'));
    expect(b1.state.logs['2026-10-23'].foods).toHaveLength(1);

    await syncOnce(fake.client, removeEntry(a1.state, '2026-10-23', e.id), a1.snapshot);
    const b2 = await syncOnce(fake.client, b1.state, b1.snapshot);
    expect(b2.state.logs['2026-10-23'].foods).toHaveLength(0);
  });

  it('custom food soft-deletes propagate and past entries keep their snapshot', async () => {
    const cf = createCustomFood({ name: 'Shake', unit: 'serving', basis: 'perServing', calories: 120, source: 'user_entered' });
    let a = upsertCustomFood(baseState(), cf);
    a = addEntries(a, '2026-10-23', [createMealEntry({ food: cf, qty: 1, mealType: 'snacks' })]);
    const a1 = await syncOnce(fake.client, a, emptySnapshot('ep1'));
    await syncOnce(fake.client, deleteCustomFood(a1.state, cf.id), a1.snapshot);
    const b = await syncOnce(fake.client, { ...baseState(), syncEpoch: 'ep2' }, emptySnapshot('ep2'));
    expect(b.state.customFoods[0].deletedAt).toBeTruthy();
    expect(b.state.logs['2026-10-23'].foods[0].cal).toBe(120);
  });

  it('last write wins: a newer local edit is not overwritten by an older remote row', async () => {
    const e = createMealEntry({ food, qty: 100, mealType: 'lunch' });
    const a1 = await syncOnce(fake.client, addEntries(baseState(), '2026-10-23', [e]), emptySnapshot('ep1'));
    // Local edit made later than the server copy, not yet pushed.
    const edited = { ...a1.state, logs: { '2026-10-23': { ...a1.state.logs['2026-10-23'], foods: [{ ...e, qty: 300, updatedAt: '2099-01-01T00:00:00.000Z' }] } } };
    const pulled = await pullChanges(fake.client, UID, emptySnapshot('ep1'));
    const merged = mergeRemote(edited, pulled.remote);
    expect(merged.state.logs['2026-10-23'].foods[0].qty).toBe(300);
    expect(merged.accepted.meals).not.toContain(e.id);
  });

  it('only pulls rows changed since the last cursor', async () => {
    const a1 = await syncOnce(fake.client, addEntries(baseState(), '2026-10-23', [createMealEntry({ food, qty: 1, mealType: 'lunch' })]), emptySnapshot('ep1'));
    const again = await pullChanges(fake.client, UID, a1.snapshot);
    expect(Object.values(again.remote).flat()).toHaveLength(0);
  });
});

describe('snapshot safety', () => {
  it('discards a snapshot that belongs to a different local copy (no mass deletions)', () => {
    const store = {};
    globalThis.localStorage = {
      getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; },
    };
    saveSnapshot(UID, { ...emptySnapshot('old-epoch'), meals: { x: 'h' } });
    expect(loadSnapshot(UID, 'old-epoch').meals).toEqual({ x: 'h' });
    expect(loadSnapshot(UID, 'new-epoch').meals).toEqual({});
  });
});

describe('stampChanges', () => {
  it('stamps only the days and settings that changed', () => {
    const prev = { goal: 'a', logs: { d1: { water: 0 }, d2: { water: 0 } } };
    const next = { ...prev, logs: { ...prev.logs, d1: { water: 250 } } };
    const out = stampChanges(prev, next, 'T');
    expect(out.logs.d1.updatedAt).toBe('T');
    expect(out.logs.d2.updatedAt).toBeUndefined();
    expect(out.settingsUpdatedAt).toBeUndefined();
    expect(stampChanges(prev, { ...prev, goal: 'b' }, 'T').settingsUpdatedAt).toBe('T');
  });

  it('ignores local-only keys like currentDate', () => {
    const prev = { currentDate: '2026-10-22', logs: {} };
    expect(stampChanges(prev, { ...prev, currentDate: '2026-10-23' }, 'T').settingsUpdatedAt).toBeUndefined();
  });
});

describe('importLegacyState', () => {
  it('adds legacy days and settings without overwriting existing data', async () => {
    const { importLegacyState } = await import('./sync.js');
    const current = { isOnboarded: false, logs: { '2026-10-23': { foods: [{ id: 'new', name: 'x' }] } }, customFoods: [] };
    const legacy = { isOnboarded: true, goal: 'get-stronger', logs: { '2025-01-01': { foods: [{ name: 'old' }], water: 500 }, '2026-10-23': { foods: [{ name: 'dup' }] } } };
    const out = importLegacyState(current, legacy);
    expect(out.logs['2025-01-01'].water).toBe(500);
    expect(out.logs['2026-10-23'].foods.map((f) => f.name)).toEqual(['x']);
    expect(out.goal).toBe('get-stronger');
    expect(out.isOnboarded).toBe(true);
  });

  it('does not replace the profile of an already set-up account', async () => {
    const { importLegacyState } = await import('./sync.js');
    const out = importLegacyState({ isOnboarded: true, goal: 'a', logs: {}, customFoods: [] }, { goal: 'b', logs: {} });
    expect(out.goal).toBe('a');
  });
});

describe('mergeRemote safety', () => {
  it('ignores device/account-only keys inside downloaded profile settings', () => {
    const local = { email: 'me@x.com', userId: 'u-me', syncEpoch: 'ep', logs: {}, customFoods: [], goal: 'a' };
    const remote = { profiles: [{ settings: { goal: 'b', email: 'attacker@x.com', userId: 'u-other', syncEpoch: 'evil', logs: { x: 1 } }, client_updated_at: '2030-01-01T00:00:00Z' }] };
    const { state } = mergeRemote(local, remote);
    expect(state.goal).toBe('b');
    expect(state.email).toBe('me@x.com');
    expect(state.userId).toBe('u-me');
    expect(state.syncEpoch).toBe('ep');
    expect(state.logs).toEqual({});
  });
});
