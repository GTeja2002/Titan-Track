import { describe, it, expect } from 'vitest';
import { weeklySummary } from './weeklySummary.js';

const profile = { gender: 'male', age: 24, height: 172, weight: 70, activityLevel: 'Moderate', goal: 'stay-consistent', goalWeight: null };

describe('weeklySummary', () => {
  it('covers the 7 days ending on the viewed day', () => {
    const s = weeklySummary({ ...profile, currentDate: '2026-10-24', logs: {} });
    expect(s.days[0]).toBe('2026-10-18');
    expect(s.days[6]).toBe('2026-10-24');
  });

  it('averages only over days with data (empty days are missing, not zero)', () => {
    const s = weeklySummary({
      ...profile, currentDate: '2026-10-24',
      logs: {
        '2026-10-23': { foods: [{ id: 'a', cal: 2000, protein: 60 }], water: 2000, steps: 8000 },
        '2026-10-24': { foods: [{ id: 'b', cal: 1000, protein: 40 }], steps: 4000 },
      },
    });
    expect(s.avgCalories).toBe(1500);
    expect(s.avgProtein).toBe(50);
    expect(s.avgWater).toBe(2000);
    expect(s.totalSteps).toBe(12000);
    expect(s.totalKm).toBeCloseTo(8.57, 1);
    expect(s.daysLogged).toBe(2);
  });

  it('reports weight change from first to last weigh-in of the week', () => {
    const s = weeklySummary({
      ...profile, currentDate: '2026-10-24',
      logs: { '2026-10-19': { weight: 71.2 }, '2026-10-22': { weight: 70.8 }, '2026-10-24': { weight: 70.4 } },
    });
    expect(s.weightChange).toBe(-0.8);
  });

  it('has no weight change with fewer than two weigh-ins, and nulls for an empty week', () => {
    const s = weeklySummary({ ...profile, currentDate: '2026-10-24', logs: { '2026-10-24': { weight: 70 } } });
    expect(s.weightChange).toBeNull();
    expect(s.avgCalories).toBeNull();
    expect(s.totalSteps).toBe(0);
  });

  it('counts days that hit the steps target', () => {
    const s = weeklySummary({ ...profile, currentDate: '2026-10-24', logs: { '2026-10-23': { steps: 12000 }, '2026-10-24': { steps: 3000 } } });
    expect(s.targetsHit.steps).toBe(1);
  });
});
