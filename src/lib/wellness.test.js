import { describe, it, expect } from 'vitest';
import {
    getFitnessAgeEstimate,
    getRecoveryScore,
    getWeeklyActivitySummary,
    getNutritionConsistency,
    getTodayMacroProgress,
    appendBpReading,
} from './wellness.js';
import { pruneOldLogs } from './useAppState.js';
import { calculateProteinTarget } from './calculations.js';

describe('wellness.js unit tests', () => {
    describe('getFitnessAgeEstimate', () => {
        it('estimates correct fitness age based on level and BMI', () => {
            // Chronological age = 30
            // Male, weight 70kg, height 175cm => BMI = 22.9
            // Activity = Athlete => -4 adjustment
            // BMI in [0, 25] range => -1 adjustment
            // Total adjustment = -5. Chrono = 30 => Estimate = 25
            const ageAthlete = getFitnessAgeEstimate({
                age: 30,
                activityLevel: 'Athlete',
                weight: 70,
                height: 175,
            });
            expect(ageAthlete).toBe(25);

            // Activity = Sedentary => +3 adjustment
            // Weight = 100kg, height 175cm => BMI = 32.7 (Obese) => BMI adjustment = +2
            // Total adjustment = +5. Chrono = 30 => Estimate = 35
            const ageSedentaryObese = getFitnessAgeEstimate({
                age: 30,
                activityLevel: 'Sedentary',
                weight: 100,
                height: 175,
            });
            expect(ageSedentaryObese).toBe(35);
        });

        it('returns minimum age of 16', () => {
            // Chronological age = 18
            // Athlete (-4), Normal BMI (-1) => 13, should be capped at 16
            const ageYoungAthlete = getFitnessAgeEstimate({
                age: 18,
                activityLevel: 'Athlete',
                weight: 72,
                height: 180,
            });
            expect(ageYoungAthlete).toBe(16);
        });
    });

    describe('getRecoveryScore', () => {
        it('calculates score based on gym/walk workouts and activity level', () => {
            // Let's mock a log with 3 active days in the last 7
            // 3/7 * 70 = 30 points
            // Moderate baseline activity = 18 points
            // Total = 48 points
            const logs = {
                '2026-08-30': { walk: 3, gym: 0 },
                '2026-08-29': { walk: 0, gym: 1 },
                '2026-08-28': { walk: 0, gym: 0 },
                '2026-08-27': { walk: 4, gym: 0 },
                '2026-08-26': { walk: 0, gym: 0 },
                '2026-08-25': { walk: 0, gym: 0 },
                '2026-08-24': { walk: 0, gym: 0 },
            };

            const score = getRecoveryScore({
                logs,
                currentDate: '2026-08-30',
                activityLevel: 'Moderate',
            });
            expect(score).toBe(48);
        });

        it('limits recovery score to max 100', () => {
            const logs = {
                '2026-08-30': { walk: 3, gym: 1 },
                '2026-08-29': { walk: 2, gym: 1 },
                '2026-08-28': { walk: 1, gym: 1 },
                '2026-08-27': { walk: 4, gym: 1 },
                '2026-08-26': { walk: 1, gym: 1 },
                '2026-08-25': { walk: 2, gym: 1 },
                '2026-08-24': { walk: 3, gym: 1 },
            };

            const score = getRecoveryScore({
                logs,
                currentDate: '2026-08-30',
                activityLevel: 'Athlete',
            });
            expect(score).toBe(100);
        });
    });

    describe('getWeeklyActivitySummary', () => {
        it('returns exact weekly walking km, gym session counts and estimated minutes', () => {
            const logs = {
                '2026-08-30': { walk: 2.5, gym: 1 }, // 2.5 * 12 + 1 * 45 = 75 mins
                '2026-08-29': { walk: 5.0, gym: 0 }, // 5.0 * 12 + 0 * 45 = 60 mins
                '2026-08-28': { walk: 0, gym: 2 }, // 0.0 * 12 + 2 * 45 = 90 mins (gym is binary flag for session presence in weekly tracker)
            };

            const summary = getWeeklyActivitySummary({
                logs,
                currentDate: '2026-08-30',
            });

            expect(summary.activeDays).toBe(3);
            expect(summary.totalWalkKm).toBe(7.5);
            expect(summary.gymSessions).toBe(2);
            expect(summary.estimatedMinutes).toBe(180); // 7.5 * 12 + 2 * 45 = 90 + 90 = 180
        });
    });

    describe('getNutritionConsistency', () => {
        it('reports how many days out of last 7 had meals logged', () => {
            const logs = {
                '2026-08-30': { foods: [{ name: 'Oats' }] },
                '2026-08-29': { foods: [] },
                '2026-08-28': { foods: [{ name: 'Rice' }, { name: 'Dal' }] },
            };

            const consistency = getNutritionConsistency({
                logs,
                currentDate: '2026-08-30',
            });

            expect(consistency.loggedDays).toBe(2);
            expect(consistency.totalDays).toBe(7);
        });
    });

    describe('getTodayMacroProgress', () => {
        it('summarizes total logged protein and fiber vs dynamic targets', () => {
            const logs = {
                '2026-08-30': {
                    foods: [
                        { protein: 20, fiber: 5 },
                        { protein: 45.5, fiber: 12.3 },
                    ],
                },
            };

            const progress = getTodayMacroProgress({
                logs,
                currentDate: '2026-08-30',
                weight: 90,
                gender: 'male',
                goal: 'lose-fat',
                activityLevel: 'Sedentary',
            });

            expect(progress.protein).toBe(65.5);
            expect(progress.fiber).toBe(17.3);
            // Was a flat weight * 1.6 (144g). That disagreed with the target the
            // food log and metric cards show for the same person, so this now
            // defers to calculateProteinTarget: 90kg * 0.8 for sedentary fat
            // loss.
            expect(progress.proteinTarget).toBe(calculateProteinTarget(90, 'lose-fat', 'Sedentary'));
            expect(progress.proteinTarget).toBe(72);
            expect(progress.fiberTarget).toBe(30); // Male fiber target
        });

        it('matches the protein target the rest of the app shows', () => {
            // The regression this replaces: two different targets for one
            // person, 152g in the wellness card against 76g in the food log.
            for (const [weight, goal, activity] of [
                [95, 'lose-fat', 'Sedentary'],
                [70, 'gain-muscle', 'Athlete'],
                [80, 'maintain', 'Moderate'],
            ]) {
                const progress = getTodayMacroProgress({
                    logs: {}, currentDate: '2026-08-30', weight, gender: 'male', goal, activityLevel: activity,
                });
                expect(progress.proteinTarget).toBe(calculateProteinTarget(weight, goal, activity));
            }
        });
    });

    describe('appendBpReading', () => {
        it('adds fresh BP reading to top of history log and slices window to max 20 entries', () => {
            const bpHistory = Array.from({ length: 25 }, (_, i) => ({
                systolic: 120 + i,
                diastolic: 80,
                date: '2026-08-01',
            }));

            const nextHistory = appendBpReading(bpHistory, 115, 75);

            expect(nextHistory.length).toBe(20);
            expect(nextHistory[0].systolic).toBe(115);
            expect(nextHistory[0].diastolic).toBe(75);
        });
    });

    describe('pruneOldLogs', () => {
        it('prunes daily logs older than 365 days relative to current date', () => {
            const currentDate = '2026-08-30';
            const logs = {
                '2026-08-30': { walk: 2 }, // today (keep)
                '2025-08-31': { walk: 3 }, // 364 days ago (keep)
                '2025-08-30': { walk: 1 }, // 365 days ago (keep)
                '2025-08-29': { walk: 4 }, // 366 days ago (prune)
                '2024-05-12': { walk: 5 }, // legacy (prune)
            };

            const result = pruneOldLogs(logs, currentDate);

            expect(result['2026-08-30']).toBeDefined();
            expect(result['2025-08-31']).toBeDefined();
            expect(result['2025-08-30']).toBeDefined();
            expect(result['2025-08-29']).toBeUndefined();
            expect(result['2024-05-12']).toBeUndefined();
            expect(Object.keys(result).length).toBe(3);
        });
    });
});
