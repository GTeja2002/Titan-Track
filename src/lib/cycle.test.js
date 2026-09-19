import { describe, it, expect } from 'vitest';
import { cycleStatus, PHASES, DEFAULT_CYCLE_LENGTH } from './cycle.js';

const on = (lastPeriodStart, extra = {}) => ({
    enabled: true, lastPeriodStart, avgCycleLength: 28, avgPeriodLength: 5, ...extra,
});

describe('cycleStatus', () => {
    it('returns null when tracking is off', () => {
        expect(cycleStatus({ enabled: false, lastPeriodStart: '2026-09-01' }, '2026-09-10')).toBe(null);
    });

    it('returns null when no start date has been given', () => {
        expect(cycleStatus({ enabled: true, lastPeriodStart: null }, '2026-09-10')).toBe(null);
    });

    it('returns null for a start date in the future', () => {
        expect(cycleStatus(on('2026-09-20'), '2026-09-10')).toBe(null);
    });

    it('counts the first day of the period as day 1', () => {
        const r = cycleStatus(on('2026-09-10'), '2026-09-10');
        expect(r.day).toBe(1);
        expect(r.phase.id).toBe('menstrual');
    });

    it('stays in the menstrual phase through the period length', () => {
        expect(cycleStatus(on('2026-09-10'), '2026-09-14').phase.id).toBe('menstrual');
    });

    it('moves to follicular after the period', () => {
        expect(cycleStatus(on('2026-09-10'), '2026-09-16').phase.id).toBe('follicular');
    });

    it('identifies ovulation around mid-cycle', () => {
        // Day 14 of a 28-day cycle.
        expect(cycleStatus(on('2026-09-10'), '2026-09-23').phase.id).toBe('ovulation');
    });

    it('moves to luteal in the second half', () => {
        expect(cycleStatus(on('2026-09-10'), '2026-09-28').phase.id).toBe('luteal');
    });

    it('wraps around for a start date several cycles ago', () => {
        // Three full 28-day cycles later is day 1 again.
        const r = cycleStatus(on('2026-06-10'), '2026-09-02');
        expect(r.day).toBe(1);
    });

    it('counts down to the next period and never goes negative', () => {
        for (let i = 0; i < DEFAULT_CYCLE_LENGTH; i++) {
            const d = new Date(2026, 8, 10 + i);
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const r = cycleStatus(on('2026-09-10'), ds);
            expect(r.daysToNextPeriod).toBeGreaterThan(0);
            expect(r.daysToNextPeriod).toBeLessThanOrEqual(DEFAULT_CYCLE_LENGTH);
        }
    });

    it('honours a custom cycle length', () => {
        const r = cycleStatus(on('2026-09-10', { avgCycleLength: 35 }), '2026-10-14');
        expect(r.day).toBe(35);
    });

    it('exposes a label and blurb for every phase', () => {
        for (const p of Object.values(PHASES)) {
            expect(p.label.length).toBeGreaterThan(0);
            expect(p.blurb.length).toBeGreaterThan(0);
        }
    });
});
