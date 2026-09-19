import { describe, it, expect } from 'vitest';
import { portionsFor, describeAmount } from './portions.js';
import { frequentFoods, yesterdaysFoods } from './recentFoods.js';
import { FOOD_DB } from './calculations.js';

describe('portionsFor', () => {
    it('gives every food in the database at least one tappable portion', () => {
        const without = FOOD_DB.filter((f) => portionsFor(f).length === 0).map((f) => f.name);
        expect(without).toEqual([]);
    });

    it('offers whole counts for per-piece foods', () => {
        const roti = FOOD_DB.find((f) => f.name === 'Chapati');
        expect(portionsFor(roti).map((p) => p.qty)).toContain(2);
    });

    it('prefers a food-specific serving over the unit fallback', () => {
        const rice = FOOD_DB.find((f) => f.name === 'Cooked Rice');
        expect(portionsFor(rice).map((p) => p.label)).toContain('1 bowl');
    });

    it('returns nothing for no food', () => {
        expect(portionsFor(null)).toEqual([]);
    });

    it('gives every portion a label and a positive quantity', () => {
        for (const food of FOOD_DB) {
            for (const p of portionsFor(food)) {
                expect(typeof p.label).toBe('string');
                expect(p.label.length).toBeGreaterThan(0);
                expect(p.qty).toBeGreaterThan(0);
            }
        }
    });
});

describe('describeAmount', () => {
    it('abbreviates pieces', () => expect(describeAmount(2, 'piece')).toBe('2 pc'));
    it('suffixes the unit', () => expect(describeAmount(150, 'g')).toBe('150g'));
    it('is empty for no amount', () => expect(describeAmount(0, 'g')).toBe(''));
});

const f = (name, qty = 100) => ({ name, qty, unit: 'g', cal: 100 });

describe('frequentFoods', () => {
    const logs = {
        '2026-09-19': { foods: [f('Dal (cooked)'), f('Cooked Rice')] },
        '2026-09-18': { foods: [f('Cooked Rice')] },
        '2026-09-17': { foods: [f('Cooked Rice'), f('Poha')] },
    };

    it('ranks by how often a food was logged', () => {
        const out = frequentFoods(logs, '2026-09-19', 5);
        expect(out[0].name).toBe('Cooked Rice');
        expect(out[0].timesLogged).toBe(3);
    });

    it('respects the limit', () => {
        expect(frequentFoods(logs, '2026-09-19', 2)).toHaveLength(2);
    });

    it('ignores days outside the 30-day window', () => {
        const old = { '2026-01-01': { foods: [f('Biryani')] } };
        expect(frequentFoods(old, '2026-09-19', 5)).toEqual([]);
    });

    it('treats different portions of the same food separately', () => {
        const mixed = { '2026-09-19': { foods: [f('Cooked Rice', 100), f('Cooked Rice', 200)] } };
        expect(frequentFoods(mixed, '2026-09-19', 5)).toHaveLength(2);
    });

    it('copes with an empty history', () => {
        expect(frequentFoods({}, '2026-09-19')).toEqual([]);
    });
});

describe('yesterdaysFoods', () => {
    it('returns the previous day only', () => {
        const logs = {
            '2026-09-19': { foods: [f('Today')] },
            '2026-09-18': { foods: [f('Yesterday')] },
        };
        const out = yesterdaysFoods(logs, '2026-09-19');
        expect(out).toHaveLength(1);
        expect(out[0].name).toBe('Yesterday');
    });

    it('is empty when yesterday had nothing', () => {
        expect(yesterdaysFoods({ '2026-09-19': { foods: [f('x')] } }, '2026-09-19')).toEqual([]);
    });
});
