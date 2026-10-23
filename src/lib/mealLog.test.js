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

describe('favourite meals', async () => {
  const { saveFavoriteMeal, removeFavoriteMeal } = await import('./mealLog.js');
  const { cloneMealEntry } = await import('./nutrition.js');
  const breakfast = [
    createMealEntry({ food: { id: 'f1', name: 'Idli', unit: 'piece', basis: 'perServing', calories: 39, source: 'builtin' }, qty: 3, mealType: 'breakfast' }),
    createMealEntry({ food: { id: 'f2', name: 'Sambar', unit: 'g', basis: 'per100', calories: 65, source: 'builtin' }, qty: 150, mealType: 'breakfast' }),
  ];

  it('stores item snapshots without ids or timestamps', () => {
    const s = saveFavoriteMeal({ favoriteMeals: [] }, { name: ' My breakfast ', mealType: 'breakfast', entries: breakfast });
    expect(s.favoriteMeals).toHaveLength(1);
    expect(s.favoriteMeals[0]).toMatchObject({ name: 'My breakfast', mealType: 'breakfast' });
    expect(s.favoriteMeals[0].items[0]).toMatchObject({ name: 'Idli', cal: 117 });
    expect(s.favoriteMeals[0].items[0].id).toBeUndefined();
    expect(s.favoriteMeals[0].items[0].consumedAt).toBeUndefined();
  });

  it('logging a favourite creates fresh entries with new ids and the same numbers', () => {
    const s = saveFavoriteMeal({}, { name: 'B', mealType: 'breakfast', entries: breakfast });
    const logged = s.favoriteMeals[0].items.map((it) => cloneMealEntry(it, { mealType: 'lunch' }));
    expect(logged[0].id).toBeTruthy();
    expect(logged[0].id).not.toBe(breakfast[0].id);
    expect(logged.map((e) => e.cal)).toEqual([117, 98]);
    expect(logged[0].mealType).toBe('lunch');
  });

  it('replaces a favourite with the same name, ignores empty saves, and removes', () => {
    let s = saveFavoriteMeal({}, { name: 'B', entries: breakfast });
    s = saveFavoriteMeal(s, { name: 'b', entries: breakfast.slice(0, 1) });
    expect(s.favoriteMeals).toHaveLength(1);
    expect(s.favoriteMeals[0].items).toHaveLength(1);
    expect(saveFavoriteMeal(s, { name: '', entries: breakfast })).toBe(s);
    expect(saveFavoriteMeal(s, { name: 'X', entries: [] })).toBe(s);
    expect(removeFavoriteMeal(s, s.favoriteMeals[0].id).favoriteMeals).toHaveLength(0);
  });
});
