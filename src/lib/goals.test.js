import { describe, it, expect } from 'vitest';
import { GOALS, DEFAULT_GOAL, getGoal, isScaleGoal, goalsForAge, isMinor, allowsDeficit } from './goals.js';
import { calculateDailyCalories, calculateDailyCaloriesForAge, calculateBMR } from './calculations.js';

describe('goals', () => {
    it('defaults to a goal that is not about the scale', () => {
        expect(isScaleGoal(DEFAULT_GOAL)).toBe(false);
    });

    it('offers more non-scale goals than scale goals', () => {
        const scale = GOALS.filter((g) => g.scaleBased).length;
        expect(GOALS.length - scale).toBeGreaterThan(scale);
    });

    it('falls back to the default for an unknown goal', () => {
        expect(getGoal('nonsense').id).toBe(DEFAULT_GOAL);
    });

    it('marks only weight-target goals as scale-based', () => {
        expect(isScaleGoal('lose-fat')).toBe(true);
        expect(isScaleGoal('gain-muscle')).toBe(true);
        expect(isScaleGoal('stay-consistent')).toBe(false);
        expect(isScaleGoal('feel-better')).toBe(false);
    });
});

describe('age-appropriate safety', () => {
    it('treats under-18 as a minor', () => {
        expect(isMinor(15)).toBe(true);
        expect(isMinor(17)).toBe(true);
        expect(isMinor(18)).toBe(false);
        expect(isMinor(30)).toBe(false);
    });

    it('does not treat a missing or invalid age as a minor', () => {
        expect(isMinor(null)).toBe(false);
        expect(isMinor(undefined)).toBe(false);
        expect(isMinor('abc')).toBe(false);
        expect(isMinor(0)).toBe(false);
    });

    it('withholds deficit goals from minors', () => {
        expect(allowsDeficit(15)).toBe(false);
        const teenGoals = goalsForAge(15).map((g) => g.id);
        expect(teenGoals).not.toContain('lose-fat');
        expect(teenGoals).toContain('stay-consistent');
        expect(teenGoals).toContain('get-stronger');
    });

    it('offers every goal to adults', () => {
        expect(goalsForAge(25).map((g) => g.id)).toContain('lose-fat');
    });

    it('never gives a minor a calorie target below maintenance', () => {
        const tdee = 2200;
        // An adult asking to lose weight does get a deficit...
        const adult = calculateDailyCaloriesForAge(25, 'lose-fat', tdee, 80, 70, 90);
        expect(adult).toBeLessThan(tdee);
        // ...the same request from a 15-year-old does not.
        const teen = calculateDailyCaloriesForAge(15, 'lose-fat', tdee, 80, 70, 90);
        expect(teen).toBeGreaterThanOrEqual(tdee);
    });

    it('still allows a minor a surplus for building muscle', () => {
        const tdee = 2200;
        expect(calculateDailyCaloriesForAge(15, 'gain-muscle', tdee, 60, 65, 90)).toBeGreaterThan(tdee);
    });
});

describe('non-scale goals do not force a deficit', () => {
    const tdee = 2000;
    it('maintains for a consistency goal', () => {
        expect(calculateDailyCalories('stay-consistent', tdee, 70, 70, 90)).toBe(tdee);
    });
    it('maintains for a feel-better goal', () => {
        expect(calculateDailyCalories('feel-better', tdee, 70, 70, 90)).toBe(tdee);
    });
    it('gives a slight surplus for getting stronger', () => {
        expect(calculateDailyCalories('get-stronger', tdee, 70, 70, 90)).toBeGreaterThan(tdee);
    });
});

describe('calculateBMR sex handling', () => {
    it('uses the midpoint constant when sex is unstated', () => {
        const female = calculateBMR('female', 25, 70, 170);
        const male = calculateBMR('male', 25, 70, 170);
        const unstated = calculateBMR('unspecified', 25, 70, 170);
        expect(unstated).toBeGreaterThan(female);
        expect(unstated).toBeLessThan(male);
    });

    it('still returns 0 for incomplete input', () => {
        expect(calculateBMR('female', null, 70, 170)).toBe(0);
    });
});
