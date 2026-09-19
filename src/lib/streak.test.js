import { describe, it, expect } from 'vitest';
import { computeStreak, dayHadActivity, isRestDay, activeDaysInLastWeek } from './streak.js';

const meal = { foods: [{ name: 'x', cal: 100 }] };
const empty = { foods: [], walk: 0, gym: 0, weight: 0, water: 0 };

describe('dayHadActivity', () => {
    it('counts any kind of logging', () => {
        expect(dayHadActivity(meal)).toBe(true);
        expect(dayHadActivity({ water: 500 })).toBe(true);
        expect(dayHadActivity({ walk: 2 })).toBe(true);
        expect(dayHadActivity({ gym: 1 })).toBe(true);
        expect(dayHadActivity({ weight: 70 })).toBe(true);
        expect(dayHadActivity({ sleep: 7 })).toBe(true);
        expect(dayHadActivity({ mood: 'good' })).toBe(true);
    });

    it('does not count an empty or missing day', () => {
        expect(dayHadActivity(empty)).toBe(false);
        expect(dayHadActivity(undefined)).toBe(false);
    });
});

describe('computeStreak', () => {
    it('counts consecutive logged days', () => {
        const logs = {
            '2026-09-19': meal, '2026-09-18': meal, '2026-09-17': meal,
        };
        expect(computeStreak(logs, '2026-09-19', { restDays: [] }).streak).toBe(3);
    });

    it('does not break the streak just because today is not logged yet', () => {
        const logs = { '2026-09-18': meal, '2026-09-17': meal };
        const r = computeStreak(logs, '2026-09-19', { restDays: [], freezesAvailable: 0 });
        expect(r.streak).toBe(2);
        expect(r.loggedToday).toBe(false);
    });

    it('stops at a real gap when no freezes are available', () => {
        const logs = { '2026-09-19': meal, '2026-09-17': meal, '2026-09-16': meal };
        expect(computeStreak(logs, '2026-09-19', { restDays: [], freezesAvailable: 0 }).streak).toBe(1);
    });

    it('spends a freeze to bridge a single missed day', () => {
        const logs = { '2026-09-19': meal, '2026-09-17': meal, '2026-09-16': meal };
        const r = computeStreak(logs, '2026-09-19', { restDays: [], freezesAvailable: 1 });
        expect(r.streak).toBe(3);
        expect(r.freezesUsed).toBe(1);
    });

    it('runs out of freezes rather than bridging forever', () => {
        const logs = {
            '2026-09-19': meal,   // logged
            // 18th missed -> freeze 1
            // 17th missed -> freeze 2
            // 16th missed -> no freezes left, stop
            '2026-09-15': meal,
        };
        const r = computeStreak(logs, '2026-09-19', { restDays: [], freezesAvailable: 2 });
        expect(r.freezesUsed).toBe(2);
        expect(r.streak).toBe(1);
    });

    it('treats a declared rest day as not breaking the run', () => {
        // 2026-09-20 is a Sunday; 2026-09-19 a Saturday.
        const logs = { '2026-09-21': meal, '2026-09-19': meal, '2026-09-18': meal };
        const r = computeStreak(logs, '2026-09-21', { restDays: [0], freezesAvailable: 0 });
        expect(r.streak).toBe(3);
        expect(r.restDaysCredited).toBe(1);
        expect(r.freezesUsed).toBe(0);
    });

    it('reports whether today is a rest day', () => {
        expect(computeStreak({}, '2026-09-20', { restDays: [0] }).todayIsRest).toBe(true);
        expect(computeStreak({}, '2026-09-21', { restDays: [0] }).todayIsRest).toBe(false);
    });

    it('returns a zero streak for an empty history', () => {
        expect(computeStreak({}, '2026-09-19', { restDays: [], freezesAvailable: 0 }).streak).toBe(0);
    });
});

describe('isRestDay', () => {
    it('matches by weekday index', () => {
        expect(isRestDay('2026-09-20', [0])).toBe(true);   // Sunday
        expect(isRestDay('2026-09-21', [0])).toBe(false);  // Monday
    });
});

describe('activeDaysInLastWeek', () => {
    it('counts logged days within the trailing week only', () => {
        const logs = {
            '2026-09-19': meal, '2026-09-18': meal, '2026-09-14': meal,
            '2026-09-10': meal, // 9 days back, outside the window
        };
        expect(activeDaysInLastWeek(logs, '2026-09-19')).toBe(3);
    });
});
