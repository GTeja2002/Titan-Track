/* ---------------- lib/personalizedPlanEngine.js ----------------
 * Pure calculation & recommendation engine for TitanTrack Personalized Plan.
 * Reuses existing Fitness calorie targets, Food Log consumed metrics,
 * available foods, and training-related filters.
 */

export function calculateRemainingCalories(calorieTarget, consumedCalories) {
    const target = Math.max(0, Number(calorieTarget) || 0);
    const consumed = Math.max(0, Number(consumedCalories) || 0);
    return Math.max(0, target - consumed);
}

/**
 * Normalizes strings and checks if a recipe matches user's available foods.
 * Returns array of matched available food items.
 */
export function matchIngredients(recipe, availableFoods) {
    if (!recipe || !Array.isArray(availableFoods) || availableFoods.length === 0) {
        return [];
    }

    const recipeText = [
        recipe.name || '',
        ...(recipe.ingredients || []),
        recipe.category || '',
        recipe.mealType || ''
    ].join(' ').toLowerCase();

    const matched = [];

    availableFoods.forEach((foodItem) => {
        if (!foodItem || typeof foodItem !== 'string') return;
        const cleanFood = foodItem.trim().toLowerCase();
        if (!cleanFood) return;

        // Check direct substring match (e.g. "chicken" matches "Grilled Chicken Salad" or "100g Chicken")
        if (recipeText.includes(cleanFood)) {
            matched.push(foodItem);
        } else {
            // Common food alias checks (e.g. "egg" / "eggs", "oat" / "oats", "curd" / "yogurt")
            const rootWord = cleanFood.replace(/(s|es)$/i, '');
            if (rootWord.length >= 3 && recipeText.includes(rootWord)) {
                matched.push(foodItem);
            }
        }
    });

    return Array.from(new Set(matched));
}

/**
 * Weighted recommendation score for a candidate recipe.
 */
export function scoreRecipe(recipe, context) {
    const {
        calorieTarget = 2000,
        remainingCalories = 2000,
        proteinTarget = 100,
        availableFoods = [],
        filters = {}
    } = context;

    let score = 50; // base score

    const recipeCal = recipe.cal || recipe.calories || 300;
    const recipeProtein = recipe.protein || 0;
    const recipeCarbs = recipe.carbs || 0;
    const recipeFat = recipe.fat || 0;

    // 1. Calorie Budget Fit
    // Ideal meal size is roughly 20-35% of remaining budget, or <= remaining calories
    if (remainingCalories > 0) {
        if (recipeCal <= remainingCalories + 150) {
            score += 25; // fits nicely in budget
        } else {
            // Penalize heavily if meal far exceeds remaining budget
            const excess = recipeCal - remainingCalories;
            score -= Math.min(40, Math.round(excess / 20));
        }
    } else {
        // If remaining budget is 0 (target already reached), prefer lighter snack options (<250 kcal)
        if (recipeCal <= 250) score += 15;
        else score -= 20;
    }

    // 2. Training Focus Alignment
    const focus = filters.trainingFocus || 'General Fitness';
    if (focus === 'Strength' || focus === 'Muscle Building') {
        if (recipeProtein >= 25) score += 20;
        else if (recipeProtein >= 15) score += 10;
    } else if (focus === 'Endurance') {
        if (recipeCarbs >= 35) score += 15;
    } else if (focus === 'Recovery') {
        if (recipeProtein >= 15 && recipeCarbs >= 25) score += 15;
    }

    // 3. Workout Intensity
    const intensity = filters.workoutIntensity || 'Moderate';
    if (intensity === 'Heavy') {
        if (recipeCal >= 400 && recipeProtein >= 20) score += 15;
    } else if (intensity === 'Light' || intensity === 'Rest Day') {
        if (recipeCal <= 450) score += 10;
    }

    // 4. Nutrition Focus
    const nutrition = filters.nutritionFocus || 'Balanced';
    if (nutrition === 'High Protein') {
        const proteinRatio = (recipeProtein * 4) / (recipeCal || 1);
        if (proteinRatio >= 0.25) score += 25;
        else if (recipeProtein >= 20) score += 15;
    } else if (nutrition === 'High Energy') {
        if (recipeCal >= 450 || recipeCarbs >= 50) score += 15;
    } else if (nutrition === 'Light Meal') {
        if (recipeCal <= 350) score += 20;
        else score -= 15;
    } else if (nutrition === 'Quick Meal') {
        // If prep time <= 15 mins
        const timeStr = recipe.time || '15 mins';
        const mins = parseInt(timeStr, 10) || 15;
        if (mins <= 15) score += 20;
    }

    // 5. Meal Type Filter
    const selectedMealType = filters.mealType || 'All';
    if (selectedMealType !== 'All') {
        const recipeMealType = (recipe.mealType || recipe.category || '').toLowerCase();
        const nameLower = (recipe.name || '').toLowerCase();

        const isMatch = recipeMealType.includes(selectedMealType.toLowerCase()) ||
            nameLower.includes(selectedMealType.toLowerCase()) ||
            (selectedMealType === 'Breakfast' && (nameLower.includes('oat') || nameLower.includes('egg') || nameLower.includes('smoothie') || nameLower.includes('pancake') || nameLower.includes('dosa') || nameLower.includes('idli'))) ||
            (selectedMealType === 'Post-Workout' && (recipeProtein >= 20 || nameLower.includes('shake') || nameLower.includes('chicken') || nameLower.includes('protein'))) ||
            (selectedMealType === 'Pre-Workout' && (recipeCarbs >= 25 || nameLower.includes('banana') || nameLower.includes('oat') || nameLower.includes('bread'))) ||
            (selectedMealType === 'Snack' && recipeCal <= 300);

        if (isMatch) score += 30;
        else score -= 15;
    }

    // 6. Available Foods Overlap (Only applies if user has entered available foods!)
    const matchedAvailable = matchIngredients(recipe, availableFoods);
    if (availableFoods.length > 0) {
        if (matchedAvailable.length > 0) {
            // Big boost for matching available ingredients
            score += 40 + (matchedAvailable.length * 15);
        }
    }

    return {
        score: Math.max(1, score),
        matchedFoods: matchedAvailable
    };
}

/**
 * Combines static recipes and FOOD_DB items into a rich candidate pool for recommendation ranking.
 */
export function buildCandidatePool(recipesList = [], foodDb = []) {
    const pool = [];

    // 1. Add structured recipes
    recipesList.forEach((r, idx) => {
        pool.push({
            id: `recipe_${idx}_${r.name}`,
            name: r.name,
            cal: r.cal,
            protein: r.protein || 0,
            carbs: r.carbs || 0,
            fat: r.fat || 0,
            time: r.time || '15 mins',
            image: r.image || '/assets/placeholders/food.png',
            ingredients: r.ingredients || [],
            steps: r.steps || [],
            isRecipe: true,
            category: r.category || 'Recipe'
        });
    });

    // 2. Add composite meals from FOOD_DB (e.g. Chicken Curry, Egg Omelette, Paneer, Oats, etc.)
    foodDb.forEach((f, idx) => {
        const isPiece = f.unit === 'piece';
        const cal = isPiece ? (f.calPerPiece || 100) : (f.calPer100 ? Math.round(f.calPer100 * 2) : 200); // ~200g portion default
        const mult = isPiece ? 1 : 2;

        pool.push({
            id: `food_${idx}_${f.name}`,
            name: f.name,
            cal,
            protein: Math.round((isPiece ? (f.proteinPerPiece || 0) : (f.proteinPer100 || 0)) * mult),
            carbs: Math.round((isPiece ? (f.carbsPerPiece || 0) : (f.carbsPer100 || 0)) * mult),
            fat: Math.round((isPiece ? (f.fatPerPiece || 0) : (f.fatPer100 || 0)) * mult),
            time: '10 mins',
            image: f.image || '/assets/placeholders/food.png',
            ingredients: [f.name],
            isRecipe: false,
            category: 'Food Item'
        });
    });

    return pool;
}

/**
 * Ranks all candidate recipes/meals based on Fitness calorie target, food log remaining calories, available foods, and applied filters.
 */
export function rankRecipes({ candidates, context }) {
    if (!candidates || candidates.length === 0) return [];

    const scored = candidates.map((item) => {
        const { score, matchedFoods } = scoreRecipe(item, context);
        return {
            ...item,
            recommendationScore: score,
            matchedFoods
        };
    });

    // Sort descending by score
    scored.sort((a, b) => b.recommendationScore - a.recommendationScore);
    return scored;
}

/**
 * Generates a complete daily plan or category-specific list fitting within remaining calorie budget.
 */
export function generatePersonalizedPlan({
    calorieTarget = 2000,
    consumedCalories = 0,
    proteinTarget = 100,
    availableFoods = [],
    appliedFilters = {},
    recipesList = [],
    foodDb = []
}) {
    const remainingCalories = calculateRemainingCalories(calorieTarget, consumedCalories);

    const context = {
        calorieTarget,
        consumedCalories,
        remainingCalories,
        proteinTarget,
        availableFoods,
        filters: appliedFilters
    };

    const pool = buildCandidatePool(recipesList, foodDb);
    const ranked = rankRecipes({ candidates: pool, context });

    // Categorize meals into slots or top list
    const selectedMealType = appliedFilters.mealType || 'All';

    if (selectedMealType !== 'All') {
        // Top 4 matching meals for specific meal type
        const topMatches = ranked.slice(0, 4);
        return {
            summary: { calorieTarget, consumedCalories, remainingCalories, proteinTarget },
            appliedFilters,
            availableFoods,
            mealSlots: [
                { slotName: selectedMealType, meals: topMatches }
            ]
        };
    }

    // General multi-slot daily plan distribution with strict uniqueness to ensure meal diversity
    const usedMealNames = new Set();

    const pickUniqueMeal = (candidatesList, defaultCategory = '') => {
        // 1. Try to find top candidate from category-specific list that is not yet used
        for (const meal of candidatesList) {
            const nameKey = (meal.name || '').toLowerCase();
            if (!usedMealNames.has(nameKey)) {
                usedMealNames.add(nameKey);
                return meal;
            }
        }

        // 2. Fallback to top unselected meal from overall ranked list
        for (const meal of ranked) {
            const nameKey = (meal.name || '').toLowerCase();
            if (!usedMealNames.has(nameKey)) {
                usedMealNames.add(nameKey);
                return meal;
            }
        }

        // 3. Ultimate safety fallback
        return candidatesList[0] || ranked[0];
    };

    const breakfastCandidates = ranked.filter(m => {
        const n = m.name.toLowerCase();
        return n.includes('oat') || n.includes('egg') || n.includes('berry') || n.includes('smoothie') || n.includes('idli') || n.includes('dosa') || n.includes('bread') || n.includes('pancake');
    });

    const lunchCandidates = ranked.filter(m => {
        const n = m.name.toLowerCase();
        return n.includes('rice') || n.includes('salad') || n.includes('curry') || n.includes('bowl') || n.includes('dal') || n.includes('biryani') || n.includes('chickpea') || n.includes('quinoa');
    });

    const workoutCandidates = ranked.filter(m => {
        const n = m.name.toLowerCase();
        return m.protein >= 15 || n.includes('protein') || n.includes('yogurt') || n.includes('nuts') || n.includes('banana') || n.includes('sandwich') || n.includes('wrap');
    });

    const dinnerCandidates = ranked.filter(m => {
        const n = m.name.toLowerCase();
        return n.includes('soup') || n.includes('lentil') || n.includes('chapati') || n.includes('grilled') || n.includes('paneer') || n.includes('veg') || n.includes('curry');
    });

    const snackCandidates = ranked.filter(m => {
        const n = m.name.toLowerCase();
        return m.cal <= 300 || n.includes('snack') || n.includes('fruit') || n.includes('nuts') || n.includes('milk') || n.includes('almond');
    });

    const breakfast = pickUniqueMeal(breakfastCandidates);
    const lunch = pickUniqueMeal(lunchCandidates);
    const workoutMeal = pickUniqueMeal(workoutCandidates);
    const dinner = pickUniqueMeal(dinnerCandidates);
    const snack = pickUniqueMeal(snackCandidates);

    const slots = [
        { slotName: 'Breakfast', meals: [breakfast] },
        { slotName: 'Lunch', meals: [lunch] },
        { slotName: 'Pre / Post-Workout', meals: [workoutMeal] },
        { slotName: 'Dinner', meals: [dinner] },
        { slotName: 'Snacks & Hydration', meals: [snack] }
    ];

    return {
        summary: { calorieTarget, consumedCalories, remainingCalories, proteinTarget },
        appliedFilters,
        availableFoods,
        mealSlots: slots
    };
}
