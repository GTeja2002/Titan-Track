import { describe, it, expect } from 'vitest';
import { strideLengthM, stepsToKm, walkingKmForDay } from './activity.js';

describe('stride and distance from steps', () => {
  it('estimates stride from height and sex', () => {
    expect(strideLengthM(172, 'male')).toBeCloseTo(0.7138, 3);
    expect(strideLengthM(160, 'female')).toBeCloseTo(0.6608, 3);
  });

  it('falls back to an average stride without a believable height', () => {
    expect(strideLengthM(null)).toBe(0.76);
    expect(strideLengthM(20)).toBe(0.76);
  });

  it('converts steps to km', () => {
    expect(stepsToKm(10000, 172, 'male')).toBe(7.14);
    expect(stepsToKm(0, 172, 'male')).toBe(0);
    expect(stepsToKm(-5, 172)).toBe(0);
    expect(stepsToKm('abc', 172)).toBe(0);
  });
});

describe('walkingKmForDay', () => {
  const profile = { height: 172, gender: 'male' };
  it('uses steps distance when it is larger than a manual walk (no double counting)', () => {
    expect(walkingKmForDay({ steps: 10000, walk: 2 }, profile)).toMatchObject({ km: 7.14, source: 'steps' });
  });
  it('uses a manual walk when there are no steps', () => {
    expect(walkingKmForDay({ walk: 3 }, profile)).toMatchObject({ km: 3, source: 'manual' });
  });
  it('is zero for an empty day', () => {
    expect(walkingKmForDay({}, profile)).toMatchObject({ km: 0, source: 'none' });
    expect(walkingKmForDay(undefined, profile).km).toBe(0);
  });
});
