import { describe, it, expect } from 'vitest';
import {
  calcNutrition, validateCustomFood, validateQuantity, createMealEntry, cloneMealEntry,
  completeEntryCalories, sumEntries, groupByMeal, normalizeFoodName, findDuplicateCustomFood,
  createCustomFood, explainCalculation, fromBuiltin, defaultMealForTime,
} from './nutrition.js';

const per100 = { id: 'a', name: 'Paneer Tikka', unit: 'g', basis: 'per100', calories: 200, protein: 18, carbs: 4, fat: 12, fiber: 1, source: 'user_entered' };
const perSlice = { id: 'b', name: 'Banana Bread', unit: 'slice', basis: 'perServing', calories: 80, protein: 2, carbs: 14, fat: 2, fiber: 1, source: 'estimated' };

describe('calcNutrition', () => {
  it('applies the per-100 rule to grams: 200 kcal/100g × 150g = 300 kcal', () => {
    expect(calcNutrition(per100, 150).cal).toBe(300);
    expect(calcNutrition(per100, 150).protein).toBe(27);
  });

  it('applies per-serving values to pieces/slices, never the per-100 rule', () => {
    expect(calcNutrition(perSlice, 2).cal).toBe(160);
    expect(calcNutrition(perSlice, 1.5).cal).toBe(120);
  });

  it('handles decimals and rounds macros to one decimal', () => {
    const r = calcNutrition(per100, 33.3);
    expect(r.cal).toBe(67);
    expect(r.protein).toBe(6);
  });

  it('returns zeros for zero, negative or non-numeric quantity', () => {
    for (const q of [0, -5, NaN, 'abc', null]) expect(calcNutrition(per100, q).cal).toBe(0);
  });

  it('flags unknown calories instead of inventing a number', () => {
    const r = calcNutrition({ ...per100, calories: null }, 100);
    expect(r).toMatchObject({ cal: 0, calUnknown: true });
  });

  it('matches the legacy built-in calculation for FOOD_DB rows', () => {
    expect(calcNutrition({ name: 'Rice', unit: 'g', calPer100: 130 }, 150).cal).toBe(195);
    expect(calcNutrition({ name: 'Idli', unit: 'piece', calPerPiece: 39 }, 3).cal).toBe(117);
  });
});

describe('validateQuantity', () => {
  it('accepts decimals', () => expect(validateQuantity('1.5', 'cup')).toBeNull());
  it('accepts a comma decimal', () => expect(validateQuantity('2,5', 'piece')).toBeNull());
  it('rejects empty, zero, negative and text', () => {
    expect(validateQuantity('', 'g')).toMatch(/how much/);
    expect(validateQuantity('0', 'g')).toMatch(/more than 0/);
    expect(validateQuantity('-1', 'g')).toMatch(/more than 0/);
    expect(validateQuantity('lots', 'g')).toMatch(/number/);
  });
  it('rejects obviously-mistyped amounts', () => {
    expect(validateQuantity('50000', 'g')).toMatch(/check the quantity/);
    expect(validateQuantity('500', 'piece')).toMatch(/check the quantity/);
  });
});

describe('validateCustomFood', () => {
  it('cleans the name and accepts unicode', () => {
    const r = validateCustomFood({ name: '  పెసరట్టు   dosa ', unit: 'piece', calories: '120' });
    expect(r.ok).toBe(true);
    expect(r.value).toMatchObject({ name: 'పెసరట్టు dosa', basis: 'perServing', calories: 120, source: 'user_entered' });
  });

  it('allows unknown calories and labels the source', () => {
    const r = validateCustomFood({ name: 'Grandma soup', unit: 'bowl', calories: '' });
    expect(r.ok).toBe(true);
    expect(r.value).toMatchObject({ calories: null, source: 'unknown' });
  });

  it('labels an estimate as an estimate', () => {
    expect(validateCustomFood({ name: 'Thali', unit: 'serving', calories: 700, isEstimate: true }).value.source).toBe('estimated');
  });

  it('rejects empty names, missing units and too-long names', () => {
    expect(validateCustomFood({ name: '   ', unit: 'g' }).errors.name).toBeTruthy();
    expect(validateCustomFood({ name: 'x', unit: 'handful' }).errors.unit).toBeTruthy();
    expect(validateCustomFood({ name: 'x'.repeat(81), unit: 'g' }).errors.name).toBeTruthy();
  });

  it('rejects negative, non-numeric and impossible calorie values', () => {
    expect(validateCustomFood({ name: 'a', unit: 'g', calories: -1 }).errors.calories).toBeTruthy();
    expect(validateCustomFood({ name: 'a', unit: 'g', calories: 'abc' }).errors.calories).toBeTruthy();
    expect(validateCustomFood({ name: 'a', unit: 'g', calories: 2000 }).errors.calories).toMatch(/per 100/);
    expect(validateCustomFood({ name: 'a', unit: 'piece', calories: 2000 }).ok).toBe(true);
  });

  it('rejects macros that weigh more than the food', () => {
    const r = validateCustomFood({ name: 'a', unit: 'g', calories: 100, protein: 60, carbs: 50 });
    expect(r.errors.macros).toBeTruthy();
  });
});

describe('duplicates', () => {
  const foods = [createCustomFood({ name: 'Paneer Tikka', unit: 'g', basis: 'per100', calories: 200 })];
  it('normalises case and whitespace', () => expect(normalizeFoodName('  PANEER   tikka ')).toBe('paneer tikka'));
  it('finds a duplicate with the same name and unit', () => {
    expect(findDuplicateCustomFood(foods, 'paneer  TIKKA', 'g')).toBeTruthy();
  });
  it('treats a different unit as a different food', () => {
    expect(findDuplicateCustomFood(foods, 'Paneer Tikka', 'piece')).toBeNull();
  });
  it('ignores deleted foods and the food being edited', () => {
    expect(findDuplicateCustomFood([{ ...foods[0], deletedAt: 'x' }], 'Paneer Tikka', 'g')).toBeNull();
    expect(findDuplicateCustomFood(foods, 'Paneer Tikka', 'g', foods[0].id)).toBeNull();
  });
});

describe('meal entries', () => {
  it('snapshots the nutrition so editing the food later does not change history', () => {
    const food = { ...per100 };
    const entry = createMealEntry({ food, qty: 150, mealType: 'lunch' });
    food.calories = 999;
    expect(entry).toMatchObject({ cal: 300, calPerUnit: 200, mealType: 'lunch', source: 'user_entered', foodId: 'a' });
    expect(entry.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('gives cloned entries a fresh id but the same snapshot', () => {
    const entry = createMealEntry({ food: per100, qty: 100, mealType: 'dinner' });
    const copy = cloneMealEntry({ ...entry, timesLogged: 4 }, { mealType: 'lunch' });
    expect(copy.id).not.toBe(entry.id);
    expect(copy).toMatchObject({ cal: entry.cal, mealType: 'lunch' });
    expect(copy.timesLogged).toBeUndefined();
  });

  it('completes an unknown-calorie entry later', () => {
    const entry = createMealEntry({ food: { ...perSlice, calories: null }, qty: 3, mealType: 'snacks' });
    expect(entry).toMatchObject({ cal: 0, calUnknown: true, source: 'unknown' });
    const fixed = completeEntryCalories(entry, 90, { isEstimate: true });
    expect(fixed).toMatchObject({ cal: 270, calUnknown: false, source: 'estimated', id: entry.id });
  });

  it('refuses invalid completion values', () => {
    const entry = createMealEntry({ food: perSlice, qty: 1, mealType: 'snacks' });
    expect(completeEntryCalories(entry, -5)).toBeNull();
    expect(completeEntryCalories(entry, 'x')).toBeNull();
  });

  it('sums entries and counts the ones missing calories', () => {
    const a = createMealEntry({ food: per100, qty: 150, mealType: 'lunch' });
    const b = createMealEntry({ food: { ...perSlice, calories: null }, qty: 1, mealType: 'lunch' });
    expect(sumEntries([a, b])).toMatchObject({ cal: 300, unknownCount: 1 });
  });

  it('groups legacy entries without a meal under "other"', () => {
    const g = groupByMeal([{ name: 'old', cal: 10 }, createMealEntry({ food: per100, qty: 1, mealType: 'breakfast' })]);
    expect(g.other).toHaveLength(1);
    expect(g.breakfast).toHaveLength(1);
  });
});

describe('helpers', () => {
  it('explains the arithmetic for both bases', () => {
    expect(explainCalculation(per100, 150)).toBe('200 kcal per 100 g × 150 g ÷ 100 = 300 kcal');
    expect(explainCalculation(perSlice, 2)).toBe('80 kcal per slice × 2 = 160 kcal');
  });

  it('adapts built-in rows', () => {
    expect(fromBuiltin({ name: 'Idli', unit: 'piece', calPerPiece: 39, proteinPerPiece: 2 })).toMatchObject({ basis: 'perServing', calories: 39, protein: 2, source: 'builtin' });
  });

  it('picks a meal from the time of day', () => {
    const at = (h) => new Date(2026, 0, 1, h);
    expect(defaultMealForTime(at(8))).toBe('breakfast');
    expect(defaultMealForTime(at(13))).toBe('lunch');
    expect(defaultMealForTime(at(17))).toBe('snacks');
    expect(defaultMealForTime(at(21))).toBe('dinner');
    expect(defaultMealForTime(at(2))).toBe('dinner');
  });
});
