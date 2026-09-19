import { describe, it, expect } from 'vitest';
import {
    calculateRemainingCalories,
    matchIngredients,
    scoreRecipe,
    rankRecipes,
    generatePersonalizedPlan
} from './personalizedPlanEngine.js';

describe('personalizedPlanEngine unit tests', () => {
    describe('calculateRemainingCalories', () => {
        it('calculates remaining calories correctly', () => {
            expect(calculateRemainingCalories(2200, 1400)).toBe(800);
            expect(calculateRemainingCalories(2000, 0)).toBe(2000);
        });

        it('returns 0 when consumed calories exceed calorie target (no negative calories)', () => {
            expect(calculateRemainingCalories(2200, 2500)).toBe(0);
            expect(calculateRemainingCalories(1800, 1800)).toBe(0);
        });

        it('handles missing or non-numeric arguments safely', () => {
            expect(calculateRemainingCalories(null, 500)).toBe(0);
            expect(calculateRemainingCalories(2000, undefined)).toBe(2000);
        });
    });

    describe('matchIngredients', () => {
        it('identifies available food substring matches in recipes', () => {
            const recipe = {
                name: 'Grilled Chicken Salad',
                ingredients: ['Chicken Breast', 'Lettuce', 'Olive Oil', 'Cherry Tomatoes']
            };
            const available = ['Chicken', 'Rice', 'Milk'];
            const matches = matchIngredients(recipe, available);
            expect(matches).toContain('Chicken');
            expect(matches).not.toContain('Rice');
            expect(matches).not.toContain('Milk');
        });

        it('handles plural vs singular food names gracefully', () => {
            const recipe = {
                name: 'Egg Omelette Bowl',
                ingredients: ['Eggs', 'Onion', 'Spinach']
            };
            const available = ['Egg', 'Spinach'];
            const matches = matchIngredients(recipe, available);
            expect(matches).toContain('Egg');
            expect(matches).toContain('Spinach');
        });

        it('returns empty array when availableFoods is empty', () => {
            const recipe = { name: 'Chicken Rice Bowl', ingredients: ['Chicken', 'Rice'] };
            expect(matchIngredients(recipe, [])).toEqual([]);
            expect(matchIngredients(recipe, null)).toEqual([]);
        });
    });

    describe('scoreRecipe and rankRecipes', () => {
        it('boosts recipe rank when available foods match', () => {
            const recipeA = {
                id: '1',
                name: 'Chicken Rice Bowl',
                cal: 550,
                protein: 35,
                ingredients: ['Chicken', 'Rice']
            };

            const recipeB = {
                id: '2',
                name: 'Tofu Veggie Curry',
                cal: 550,
                protein: 20,
                ingredients: ['Tofu', 'Broccoli']
            };

            const contextWithFoods = {
                calorieTarget: 2200,
                remainingCalories: 800,
                availableFoods: ['Chicken', 'Rice'],
                filters: { trainingFocus: 'General Fitness' }
            };

            const ranked = rankRecipes({ candidates: [recipeA, recipeB], context: contextWithFoods });
            expect(ranked[0].id).toBe('1');
            expect(ranked[0].matchedFoods).toContain('Chicken');
        });

        it('works normally when availableFoods is empty (fallback behavior)', () => {
            const recipeA = { id: '1', name: 'Chicken Salad', cal: 400, protein: 30 };
            const recipeB = { id: '2', name: 'Oats Bowl', cal: 350, protein: 12 };

            const contextNoFoods = {
                calorieTarget: 2000,
                remainingCalories: 1500,
                availableFoods: [],
                filters: { trainingFocus: 'High Protein', nutritionFocus: 'High Protein' }
            };

            const ranked = rankRecipes({ candidates: [recipeA, recipeB], context: contextNoFoods });
            expect(ranked.length).toBe(2);
            expect(ranked[0].id).toBe('1'); // High protein selected first
        });
    });

    describe('generatePersonalizedPlan', () => {
        it('generates daily meal slots respecting calorie target and remaining calories', () => {
            const sampleRecipes = [
                { name: 'Oats Bowl', cal: 400, protein: 15, mealType: 'Breakfast' },
                { name: 'Chicken Salad', cal: 500, protein: 40, mealType: 'Lunch' },
                { name: 'Protein Shake', cal: 250, protein: 25, mealType: 'Post-Workout' },
                { name: 'Lentil Soup', cal: 450, protein: 18, mealType: 'Dinner' }
            ];

            const plan = generatePersonalizedPlan({
                calorieTarget: 2200,
                consumedCalories: 600,
                proteinTarget: 110,
                availableFoods: ['Chicken', 'Oats'],
                appliedFilters: { trainingFocus: 'Strength', workoutIntensity: 'Heavy', mealType: 'All', nutritionFocus: 'High Protein' },
                recipesList: sampleRecipes,
                foodDb: []
            });

            expect(plan.summary.calorieTarget).toBe(2200);
            expect(plan.summary.consumedCalories).toBe(600);
            expect(plan.summary.remainingCalories).toBe(1600);
            expect(plan.mealSlots.length).toBe(5);
        });
    });
});
