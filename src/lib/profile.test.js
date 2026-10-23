import { describe, it, expect } from 'vitest';
import { draftFromState, validateProfile, applyProfile, isDirty } from './profile.js';

const TODAY = '2026-10-24';
const base = {
  name: 'Teja', gender: 'male', age: 24, height: 172, weight: 70, startWeight: 72, goalWeight: 68,
  goal: 'lose-fat', activityLevel: 'Moderate', currentDate: '2026-10-20',
  logs: { '2026-10-20': { weight: 71, foods: [] }, [TODAY]: { water: 500, foods: [] } },
};

describe('draftFromState', () => {
  it('never invents values for empty fields', () => {
    const d = draftFromState({ name: '', logs: {} });
    expect(d).toMatchObject({ age: '', height: '', weight: '', startWeight: '', goalWeight: '' });
  });
  it('round-trips saved values without changes', () => {
    expect(isDirty(base, draftFromState(base))).toBe(false);
  });
});

describe('validateProfile', () => {
  it('allows empty fields and accepts decimals', () => {
    expect(validateProfile({ ...draftFromState(base), goalWeight: '', weight: '70.5' })).toEqual({});
  });
  it('rejects out-of-range and non-numeric values with a clear message', () => {
    const e = validateProfile({ ...draftFromState(base), weight: '3', age: 'abc', height: '400' });
    expect(e.weight).toMatch(/between 25 and 350/);
    expect(e.age).toMatch(/number/);
    expect(e.height).toMatch(/between 100 and 250/);
  });
});

describe('applyProfile', () => {
  it('changing the goal weight does not change the current weight', () => {
    const next = applyProfile(base, { ...draftFromState(base), goalWeight: '65' }, TODAY);
    expect(next.goalWeight).toBe(65);
    expect(next.weight).toBe(70);
    expect(next.logs).toBe(base.logs); // no weigh-in written
  });

  it('a new current weight becomes today\'s weigh-in, even while viewing another day', () => {
    const next = applyProfile(base, { ...draftFromState(base), weight: '69.4' }, TODAY);
    expect(next.weight).toBe(69.4);
    expect(next.logs[TODAY]).toMatchObject({ weight: 69.4, water: 500 });
    expect(next.logs['2026-10-20'].weight).toBe(71); // viewed day untouched
  });

  it('clearing a field saves it as empty, not as a fallback number', () => {
    const next = applyProfile(base, { ...draftFromState(base), goalWeight: '', startWeight: '' }, TODAY);
    expect(next.goalWeight).toBeNull();
    expect(next.startWeight).toBeNull();
  });

  it('recomputes the calorie target, age-safe for under-18s', () => {
    const adult = applyProfile(base, draftFromState(base), TODAY);
    expect(adult.calorieTarget).toBeGreaterThan(1200);
    const teen = applyProfile(base, { ...draftFromState(base), age: '16' }, TODAY);
    const teenMaintain = applyProfile(base, { ...draftFromState(base), age: '16', goalWeight: '' , goal: 'maintain' }, TODAY);
    expect(teen.calorieTarget).toBeGreaterThanOrEqual(teenMaintain.calorieTarget);
  });

  it('does not mutate the original state', () => {
    const copy = structuredClone(base);
    applyProfile(base, { ...draftFromState(base), weight: '60', name: 'X' }, TODAY);
    expect(base).toEqual(copy);
  });
});
