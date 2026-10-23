import { describe, it, expect } from 'vitest';
import * as appState from './useAppState.js';
import {
  ensureEntryIds, legacyEntryId, addEntries, removeEntry, replaceEntry,
  upsertCustomFood, deleteCustomFood, liveCustomFoods,
} from './mealLog.js';
import { createMealEntry, createCustomFood } from './nutrition.js';

const food = { id: 'f1', name: 'Paneer', unit: 'g', basis: 'per100', calories: 265, source: 'user_entered' };

describe('retention', () => {
  it('no longer exports a log-pruning function (history is kept indefinitely)', () => {
    expect(appState.pruneOldLogs).toBeUndefined();
  });

  it('keeps logs older than 365 days when normalising', () => {
    const logs = { '2024-01-01': { foods: [{ name: 'old', qty: 1, unit: 'g', cal: 5 }] }, '2026-10-23': { foods: [] } };
    const out = ensureEntryIds(logs);
    expect(Object.keys(out).sort()).toEqual(['2024-01-01', '2026-10-23']);
  });
});

describe('ensureEntryIds', () => {
  it('assigns deterministic ids to legacy entries so two devices agree', () => {
    const logs = { '2026-10-01': { foods: [{ name: 'Rice', qty: 100, unit: 'g', cal: 130 }] } };
    const a = ensureEntryIds(logs)['2026-10-01'].foods[0].id;
    const b = ensureEntryIds(structuredClone(logs))['2026-10-01'].foods[0].id;
    expect(a).toBe(b);
    expect(a).toBe(legacyEntryId('2026-10-01', 0, logs['2026-10-01'].foods[0]));
  });

  it('gives identical entries on the same day different ids', () => {
    const f = { name: 'Chapati', qty: 1, unit: 'piece', cal: 70 };
    const out = ensureEntryIds({ d: { foods: [f, { ...f }] } }).d.foods;
    expect(out[0].id).not.toBe(out[1].id);
  });

  it('returns the same object when every entry already has an id', () => {
    const logs = { d: { foods: [{ id: 'x', name: 'a' }] } };
    expect(ensureEntryIds(logs)).toBe(logs);
  });
});

describe('entries', () => {
  const base = { weight: 70, logs: {} };

  it('adds entries and ignores a duplicate submit of the same entry', () => {
    const e = createMealEntry({ food, qty: 100, mealType: 'lunch' });
    const once = addEntries(base, '2026-10-23', [e]);
    const twice = addEntries(once, '2026-10-23', [e]);
    expect(twice).toBe(once);
    expect(twice.logs['2026-10-23'].foods).toHaveLength(1);
  });

  it('creates the day if it did not exist, carrying the profile weight', () => {
    const out = addEntries(base, '2026-10-23', [createMealEntry({ food, qty: 1, mealType: 'lunch' })]);
    expect(out.logs['2026-10-23'].weight).toBe(70);
  });

  it('removes and replaces by id', () => {
    const e = createMealEntry({ food, qty: 100, mealType: 'lunch' });
    const s1 = addEntries(base, 'd', [e]);
    const s2 = replaceEntry(s1, 'd', { ...e, qty: 200 });
    expect(s2.logs.d.foods[0].qty).toBe(200);
    expect(removeEntry(s2, 'd', e.id).logs.d.foods).toHaveLength(0);
    expect(removeEntry(s2, 'd', 'nope')).toBe(s2);
  });
});

describe('custom foods', () => {
  it('upserts and soft-deletes without touching past entries', () => {
    const cf = createCustomFood({ name: 'Paneer', unit: 'g', basis: 'per100', calories: 265, source: 'user_entered' });
    let s = upsertCustomFood({ customFoods: [], logs: {} }, cf);
    const entry = createMealEntry({ food: cf, qty: 100, mealType: 'lunch' });
    s = addEntries(s, 'd', [entry]);
    s = upsertCustomFood(s, { ...cf, calories: 300 });
    expect(s.customFoods).toHaveLength(1);
    expect(s.customFoods[0].calories).toBe(300);
    s = deleteCustomFood(s, cf.id);
    expect(liveCustomFoods(s)).toHaveLength(0);
    expect(s.customFoods[0].deletedAt).toBeTruthy();
    expect(s.logs.d.foods[0].cal).toBe(265);
  });
});
