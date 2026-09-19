import { describe, it, expect } from 'vitest';
import { getLocalDateString, shiftDateString } from './date.js';

describe('getLocalDateString', () => {
    it('formats a date as local YYYY-MM-DD', () => {
        expect(getLocalDateString(new Date(2026, 8, 19))).toBe('2026-09-19');
    });

    it('zero-pads single-digit months and days', () => {
        expect(getLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
    });

    it('uses the local calendar day, not the UTC one', () => {
        // Local midnight. In any timezone east of UTC this instant is still
        // the previous day in UTC — the bug toISOString() would introduce.
        const localMidnight = new Date(2026, 8, 19, 0, 0, 0);
        expect(getLocalDateString(localMidnight)).toBe('2026-09-19');
    });
});

describe('shiftDateString', () => {
    it('steps backwards a day', () => {
        expect(shiftDateString('2026-09-19', -1)).toBe('2026-09-18');
    });

    it('steps forwards a day', () => {
        expect(shiftDateString('2026-09-19', 1)).toBe('2026-09-20');
    });

    it('returns the same date for a zero shift', () => {
        expect(shiftDateString('2026-09-19', 0)).toBe('2026-09-19');
    });

    it('crosses month boundaries', () => {
        expect(shiftDateString('2026-09-01', -1)).toBe('2026-08-31');
        expect(shiftDateString('2026-08-31', 1)).toBe('2026-09-01');
    });

    it('crosses year boundaries', () => {
        expect(shiftDateString('2026-01-01', -1)).toBe('2025-12-31');
    });

    it('handles leap days', () => {
        expect(shiftDateString('2028-02-28', 1)).toBe('2028-02-29');
        expect(shiftDateString('2027-02-28', 1)).toBe('2027-03-01');
    });

    it('shifts a 90-day goal horizon without drifting a day', () => {
        expect(shiftDateString('2026-09-19', 90)).toBe('2026-12-18');
    });

    it('returns the input unchanged when given an unparseable date', () => {
        expect(shiftDateString('not-a-date', -1)).toBe('not-a-date');
    });

    it('round-trips: shifting back then forward returns the original', () => {
        const start = '2026-03-15';
        expect(shiftDateString(shiftDateString(start, -30), 30)).toBe(start);
    });
});
