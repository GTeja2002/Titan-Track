import { describe, it, expect } from 'vitest';
import {
    calculateBMI,
    calculateBodyFat,
    calculateLeanMass,
    calculateFatMass,
    calculateBMR,
    calculateTDEE,
    getRemainingDays,
    calculateDailyCalories,
    calculateWalkCalories,
    normalizeWaterMl,
    DEFAULT_GOAL_HORIZON_DAYS,
    simulateWeightProjection,
    calculateIdealWeight,
    getBMICategory,
    getHealthSummary,
} from './calculations.js';

describe('calculations.js unit tests', () => {
    describe('calculateBMI', () => {
        it('calculates BMI correctly with valid bounds', () => {
            expect(calculateBMI(70, 175)).toBe(22.9);
            expect(calculateBMI(100, 180)).toBe(30.9);
        });

        it('returns 0 for negative, zero, or non-finite values', () => {
            expect(calculateBMI(0, 170)).toBe(0);
            expect(calculateBMI(70, 0)).toBe(0);
            expect(calculateBMI(-70, 170)).toBe(0);
            expect(calculateBMI(70, -170)).toBe(0);
            expect(calculateBMI(NaN, 170)).toBe(0);
        });
    });

    describe('calculateBodyFat', () => {
        it('uses manual body fat if override body fat toggled', () => {
            expect(calculateBodyFat(70, 175, true, 18, 30, 'male')).toBe(0.18);
            expect(calculateBodyFat(70, 175, true, 4, 30, 'male')).toBe(0.05); // caps min body fat at 5%
            expect(calculateBodyFat(70, 175, true, 60, 30, 'male')).toBe(0.50); // caps max body fat at 50%
        });

        it('estimates body fat ratio correctly using BMI formula', () => {
            // BMI for 97.5kg and 175cm is 31.8
            // genderFactor = male = 1
            // estimated = 1.2 * 31.8 + 0.23 * 42 - 10.8 * 1 - 5.4 = 38.16 + 9.66 - 10.8 - 5.4 = 31.62%
            // 31.62 / 100 = 0.3162
            const estimatedRatioMale = calculateBodyFat(97.5, 175, false, 0, 42, 'male');
            expect(estimatedRatioMale).toBeCloseTo(0.316, 2);

            // genderFactor = female = 0
            // estimated = 1.2 * 31.8 + 0.23 * 42 - 10.8 * 0 - 5.4 = 42.42% -> 0.4242
            const estimatedRatioFemale = calculateBodyFat(97.5, 175, false, 0, 42, 'female');
            expect(estimatedRatioFemale).toBeCloseTo(0.424, 2);
        });
    });

    describe('calculateLeanMass and calculateFatMass', () => {
        it('calculates lean and fat mass correctly', () => {
            expect(calculateLeanMass(100, 0.2)).toBe(80);
            expect(calculateFatMass(100, 0.2)).toBe(20);
        });

        it('handles zero weight or invalid values safely', () => {
            expect(calculateLeanMass(0, 0.2)).toBe(0);
            expect(calculateFatMass(-10, 0.2)).toBe(0);
        });
    });

    describe('calculateBMR', () => {
        it('calculates male and female Rest BMR using Harris-Benedict scale', () => {
            // Male BMR: 10 * 80 + 6.25 * 180 - 5 * 30 + 5 = 800 + 1125 - 150 + 5 = 1780
            expect(calculateBMR('male', 30, 80, 180)).toBe(1780);

            // Female BMR: 10 * 60 + 6.25 * 165 - 5 * 25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 -> 1345
            expect(calculateBMR('female', 25, 60, 165)).toBe(1345);
        });

        it('returns 0 for NaN/undefined arguments safely', () => {
            expect(calculateBMR('male', NaN, 80, 180)).toBe(0);
        });
    });

    describe('calculateTDEE', () => {
        it('multiplies Rest BMR by activity level multipliers correctly', () => {
            // Sedentary BMR 1500 * 1.2 = 1800
            expect(calculateTDEE(1500, 'Sedentary')).toBe(1800);
            // Light BMR 1500 * 1.375 = 2062.5 -> 2063
            expect(calculateTDEE(1500, 'Light')).toBe(2063);
            // Active BMR 1500 * 1.725 = 2587.5 -> 2588
            expect(calculateTDEE(1500, 'Active')).toBe(2588);
        });
    });

    describe('getRemainingDays', () => {
        it('calculates remaining days correctly between start and target', () => {
            expect(getRemainingDays('2026-08-10', '2026-08-20')).toBe(10);
            expect(getRemainingDays('2026-08-10', '2026-08-10')).toBe(1); // Min days is 1
            expect(getRemainingDays('2026-08-30', '2026-08-10')).toBe(1);
        });
    });

    describe('calculateDailyCalories', () => {
        it('applies surplus math correctly if goal Weight is higher than current weight', () => {
            // Current weight 80kg, Goal weight 85kg (+5kg diff) over 50 days
            // diff * 7700 / days = 5 * 7700 / 50 = 770 kcal reqSurplus.
            // surplus is capped at [250, 800]. So surplus is 770.
            // calorieTarget = TDEE + surplus = 2000 + 770 = 2770.
            expect(calculateDailyCalories('lose-fat', 2000, 80, 85, 50)).toBe(2770);
        });

        it('applies deficit math correctly if goal Weight is lower than current weight', () => {
            // Current weight 90kg, Goal weight 80kg (-10kg diff) over 100 days
            // abs(diff) * 7700 / days = 10 * 7700 / 100 = 770 kcal reqDeficit.
            // deficit is capped at [300, 1000]. So deficit is 770.
            // calorieTarget = Max(1200, TDEE - deficit) = Max(1200, 2500 - 770) = 1730.
            expect(calculateDailyCalories('lose-fat', 2500, 90, 80, 100)).toBe(1730);
        });

        it('falls back to default goal nudge if current weight is close to goal weight', () => {
            // weight diff is 0, goal lose-fat: TDEE - 300
            expect(calculateDailyCalories('lose-fat', 2000, 80, 80, 30)).toBe(1700);
            // goal gain-muscle: TDEE + 250
            expect(calculateDailyCalories('gain-muscle', 2000, 80, 80, 30)).toBe(2250);
            // goal maintain: TDEE
            expect(calculateDailyCalories('maintain', 2000, 80, 80, 30)).toBe(2000);
        });
    });

    describe('calculateWalkCalories', () => {
        it('derives calorie burn using dynamic body weight logic', () => {
            // MET-style formula: distance * weight * 0.53
            // 5km walked * 100kg weight * 0.53 = 265 kcal
            expect(calculateWalkCalories(5, 100)).toBe(265);
        });

        it('returns 0 for negative distance or weight', () => {
            expect(calculateWalkCalories(0, 80)).toBe(0);
            expect(calculateWalkCalories(5, -10)).toBe(0);
        });
    });

    describe('simulateWeightProjection', () => {
        it('simulates weight projection day-by-day and returns projection points', () => {
            const projection = simulateWeightProjection({
                startWeight: 90,
                goalWeight: 80,
                gender: 'male',
                age: 30,
                heightCm: 180,
                activityLevel: 'Moderate',
                calorieTarget: 1800,
                maxDays: 30,
            });

            expect(projection.points.length).toBeGreaterThan(0);
            expect(projection.points[0].weight).toBe(90);
            expect(projection.reached).toBe(false); // shouldn't reach goal of 10kg loss in just 30 days
        });
    });

    describe('calculateIdealWeight', () => {
        it('gives ideal BMI weight range limits based on BMI=22 base', () => {
            // Base ideal = 22 * (1.8)**2 = 22 * 3.24 = 71.28
            // min = Math.round(71.28 - 2) = 69
            // max = Math.round(71.28 + 5) = 76
            const range = calculateIdealWeight(180);
            expect(range.min).toBe(69);
            expect(range.max).toBe(76);
        });
    });

    describe('getBMICategory', () => {
        it('returns correct category names matching standard limits', () => {
            expect(getBMICategory(17.5)).toBe('Underweight');
            expect(getBMICategory(22.0)).toBe('Normal');
            expect(getBMICategory(26.5)).toBe('Overweight');
            expect(getBMICategory(32.0)).toBe('Obese');
        });
    });

    describe('getHealthSummary', () => {
        it('gives healthy suggestions based on BMI, BF, and activity indices', () => {
            const summary = getHealthSummary(22.0, 0.15, 'Moderate');
            expect(summary.title).toBe('Healthy BMI');
            expect(summary.recommendations).toContain('Maintain active life');
        });
    });
});

describe('normalizeWaterMl', () => {
    it('treats a small number as a legacy count of 250ml glasses', () => {
        expect(normalizeWaterMl(8)).toBe(2000);
        expect(normalizeWaterMl(1)).toBe(250);
    });

    it('passes through values already in millilitres', () => {
        expect(normalizeWaterMl(2000)).toBe(2000);
        expect(normalizeWaterMl(50)).toBe(50);
    });

    it('returns 0 for missing, zero, negative or non-numeric input', () => {
        expect(normalizeWaterMl(undefined)).toBe(0);
        expect(normalizeWaterMl(null)).toBe(0);
        expect(normalizeWaterMl(0)).toBe(0);
        expect(normalizeWaterMl(-5)).toBe(0);
        expect(normalizeWaterMl('abc')).toBe(0);
        expect(normalizeWaterMl(NaN)).toBe(0);
    });

    it('coerces numeric strings', () => {
        expect(normalizeWaterMl('2000')).toBe(2000);
    });
});

describe('getRemainingDays fallback horizon', () => {
    it('falls back to a rolling horizon when no target date is set', () => {
        expect(getRemainingDays('2026-09-19', null)).toBe(DEFAULT_GOAL_HORIZON_DAYS);
    });

    it('does not collapse to 1 day for a far-future current date', () => {
        // A fixed fallback date would have gone stale and returned 1 here.
        expect(getRemainingDays('2030-01-01', null)).toBe(DEFAULT_GOAL_HORIZON_DAYS);
    });
});
