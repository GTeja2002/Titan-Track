/* ---------------- components/PersonalizedPlanCard.jsx ---------------- */
import { useState, useMemo } from 'react';
import {
    Flame, Plus, Trash2, Check, Filter, Edit3, Sparkles, Clock, AlertCircle, Search, X
} from 'lucide-react';
import { recipes } from '../lib/wellnessContent.js';
import { FOOD_DB, calculateProteinTarget } from '../lib/calculations.js';
import { generatePersonalizedPlan } from '../lib/personalizedPlanEngine.js';

export function PersonalizedPlanCard({
    state,
    update,
    addAvailableFood,
    removeAvailableFood,
    applyPlanFilters,
    onEditProfile
}) {
    const currentDate = state.currentDate;
    const currentLog = state.logs[currentDate] || { foods: [], walk: 0, gym: 0, weight: state.weight || 70 };
    const foodsLogged = currentLog.foods || [];

    // Single Source of Truth: Calorie & Protein Targets from Fitness State
    const calorieTarget = state.calorieTarget || 0;
    const activeWeight = currentLog.weight > 0 ? currentLog.weight : (state.weight || 70);
    const proteinTarget = calculateProteinTarget(activeWeight, state.goal, state.activityLevel);

    // Today's consumed calories
    const totalCal = foodsLogged.reduce((sum, f) => sum + (f.cal || 0), 0);
    const remainingCal = Math.max(0, calorieTarget - totalCal);

    // Available foods & applied filters state
    const availableFoods = state.availableFoods || [];
    const appliedFilters = state.appliedPlanFilters || {
        trainingFocus: 'General Fitness',
        workoutIntensity: 'Moderate',
        mealType: 'All',
        nutritionFocus: 'Balanced'
    };

    // Pending filter selections (does NOT trigger plan re-generation until Apply Filters is clicked!)
    const [pendingFilters, setPendingFilters] = useState(appliedFilters);
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

    // Add Available Food Modal / Input State
    const [isAddFoodModalOpen, setIsAddFoodModalOpen] = useState(false);
    const [foodSearchQuery, setFoodSearchQuery] = useState('');
    const [customFoodInput, setCustomFoodInput] = useState('');

    // Filtered FOOD_DB suggestions for available foods modal
    const filteredFoodSuggestions = useMemo(() => {
        if (!foodSearchQuery.trim()) return FOOD_DB.slice(0, 10);
        const q = foodSearchQuery.trim().toLowerCase();
        return FOOD_DB.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 12);
    }, [foodSearchQuery]);

    // Check if pending filters differ from active applied filters
    const hasPendingFilterChanges = useMemo(() => {
        return JSON.stringify(pendingFilters) !== JSON.stringify(appliedFilters);
    }, [pendingFilters, appliedFilters]);

    // Generate Personalized Plan based strictly on APPLIED filters, Fitness calories, Food Log remaining calories, and available foods
    const planData = useMemo(() => {
        if (!calorieTarget) return null;
        return generatePersonalizedPlan({
            calorieTarget,
            consumedCalories: totalCal,
            proteinTarget,
            availableFoods,
            appliedFilters,
            recipesList: recipes,
            foodDb: FOOD_DB
        });
    }, [calorieTarget, totalCal, proteinTarget, availableFoods, appliedFilters]);

    // Handle logging a recommended meal to today's Food Log
    const handleLogRecommendedMeal = (meal) => {
        const newFoodEntry = {
            name: meal.name,
            cal: meal.cal,
            protein: meal.protein || 0,
            carbs: meal.carbs || 0,
            fat: meal.fat || 0,
            fiber: meal.fiber || 0,
            qty: 1,
            unit: 'serving',
            image: meal.image || '/assets/placeholders/food.png'
        };

        update((prev) => {
            const today = prev.currentDate;
            const existingLog = prev.logs[today] || { foods: [], walk: 0, gym: 0, weight: prev.weight || 70 };
            const updatedFoods = [...(existingLog.foods || []), newFoodEntry];

            return {
                ...prev,
                logs: {
                    ...prev.logs,
                    [today]: {
                        ...existingLog,
                        foods: updatedFoods
                    }
                }
            };
        });
    };

    // Helper to check if meal is already logged today
    const isMealLoggedToday = (mealName) => {
        return foodsLogged.some((f) => f.name.toLowerCase().includes(mealName.toLowerCase()));
    };

    // If fitness profile missing / not onboarded
    if (!state.isOnboarded || !calorieTarget) {
        return (
            <div className="bg-white dark:bg-[#1C211E] rounded-3xl p-6 border border-[#E7E6E0] dark:border-[#2C332E] shadow-sm text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                    <AlertCircle size={24} />
                </div>
                <h3 className="text-lg font-black text-[#171817] dark:text-[#F4F5F2]">Fitness Profile Required</h3>
                <p className="text-xs text-[var(--text-dim)] max-w-md mx-auto">
                    Complete your fitness profile to get a calorie-aware personalized plan tailored to your goals.
                </p>
                <button
                    onClick={onEditProfile}
                    className="py-2.5 px-5 rounded-2xl bg-primary text-white font-bold text-xs hover:scale-105 transition shadow-md shadow-primary/20"
                >
                    Complete Fitness Profile
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#1C211E] rounded-3xl p-6 border border-[#E7E6E0] dark:border-[#2C332E] shadow-sm space-y-6 animate-fade-in text-left">

            {/* HEADER & CALORIE SUMMARY */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#E7E6E0] dark:border-[#2C332E] pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Sparkles size={18} className="text-[#BD6034]" />
                            <h3 className="text-lg font-black tracking-tight text-[#171817] dark:text-[#F4F5F2]">Personalized Plan</h3>
                        </div>
                        <p className="text-xs text-[#555954] dark:text-[#B3BAB4] font-medium mt-0.5">
                            Calorie-aware meal recommendations based on your Fitness targets and available foods.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#BD6034] bg-primary-soft hover:bg-primary-soft/80 px-3 py-2 rounded-xl transition duration-150 shrink-0"
                    >
                        <Filter size={14} />
                        <span>{isFilterDrawerOpen ? 'Close Filters' : 'Training Filters'}</span>
                    </button>
                </div>

                {/* CALORIE SUMMARY HUD */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F6F5EF] dark:bg-[#171B18] border border-[#E7E6E0] dark:border-[#2C332E]">
                    <div className="space-y-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#555954] dark:text-[#B3BAB4]">Daily Target</span>
                        <div className="text-base sm:text-lg font-black text-[#171817] dark:text-[#F4F5F2]">
                            {calorieTarget.toLocaleString()} <span className="text-[10px] font-semibold text-[var(--text-dim)]">kcal</span>
                        </div>
                    </div>

                    <div className="space-y-0.5 border-x border-[#E7E6E0] dark:border-[#2C332E] px-3">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#555954] dark:text-[#B3BAB4]">Consumed</span>
                        <div className="text-base sm:text-lg font-black text-primary">
                            {totalCal.toLocaleString()} <span className="text-[10px] font-semibold text-[var(--text-dim)]">kcal</span>
                        </div>
                    </div>

                    <div className="space-y-0.5 pl-3">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#555954] dark:text-[#B3BAB4]">Remaining</span>
                        <div className="text-base sm:text-lg font-black text-success">
                            {remainingCal.toLocaleString()} <span className="text-[10px] font-semibold text-[var(--text-dim)]">kcal</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 1: MY AVAILABLE FOODS */}
            <div className="p-4 rounded-2xl border border-[#E7E6E0] dark:border-[#2C332E] bg-white dark:bg-[#1C211E] space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#BD6034]">My Available Foods</h4>
                        <p className="text-[11px] text-[#555954] dark:text-[#B3BAB4] font-medium">
                            Tell TitanTrack foods you currently have access to (Optional).
                        </p>
                    </div>

                    <button
                        onClick={() => setIsAddFoodModalOpen(true)}
                        className="flex items-center gap-1 text-xs font-extrabold px-3 py-1.5 rounded-xl bg-primary text-white hover:scale-105 active:scale-95 transition"
                    >
                        <Plus size={14} />
                        <span>Add Food</span>
                    </button>
                </div>

                {/* FOOD CHIPS CONTAINER */}
                <div className="flex flex-wrap gap-2 pt-1">
                    {availableFoods.length === 0 ? (
                        <span className="text-xs italic text-[var(--text-dim)] py-1">
                            No available foods added yet. Plan will recommend standard recipes matching your filters.
                        </span>
                    ) : (
                        availableFoods.map((food) => (
                            <span
                                key={food}
                                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-[#F4F3ED] dark:bg-[#222825] border border-[#E7E6E0] dark:border-[#2C332E] text-[#171817] dark:text-[#F4F5F2]"
                            >
                                <span>{food}</span>
                                <button
                                    type="button"
                                    onClick={() => removeAvailableFood(food)}
                                    className="text-[var(--text-dim)] hover:text-rose-500 transition ml-0.5"
                                    aria-label={`Remove ${food}`}
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        ))
                    )}
                </div>
            </div>

            {/* ADD AVAILABLE FOOD MODAL */}
            {isAddFoodModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-[#1C211E] border border-[#E7E6E0] dark:border-[#2C332E] rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-scale-in text-left">
                        <div className="flex items-center justify-between border-b border-[#E7E6E0] dark:border-[#2C332E] pb-3">
                            <h4 className="text-sm font-black text-[#171817] dark:text-[#F4F5F2]">Add Available Food</h4>
                            <button
                                onClick={() => setIsAddFoodModalOpen(false)}
                                className="p-1 rounded-lg text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/5"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search food (e.g. Milk, Rice, Eggs, Chicken)..."
                                value={foodSearchQuery}
                                onChange={(e) => setFoodSearchQuery(e.target.value)}
                                className="w-full rounded-2xl px-4 py-2.5 text-xs bg-[#F6F5EF] dark:bg-[#171B18] border border-[#E7E6E0] dark:border-[#2C332E] outline-none text-[var(--text)] focus:border-primary transition"
                            />
                            <Search size={14} className="absolute right-3.5 top-3 text-[var(--text-dim)]" />
                        </div>

                        {/* Search Suggestions List */}
                        <div className="max-h-48 overflow-y-auto space-y-1.5 border-y border-[#E7E6E0] dark:border-[#2C332E] py-2">
                            {filteredFoodSuggestions.map((item) => (
                                <button
                                    key={item.name}
                                    type="button"
                                    onClick={() => {
                                        addAvailableFood(item.name);
                                        setIsAddFoodModalOpen(false);
                                        setFoodSearchQuery('');
                                    }}
                                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#F4F3ED] dark:hover:bg-[#222825] text-xs font-bold text-[#171817] dark:text-[#F4F5F2] transition text-left"
                                >
                                    <span>{item.name}</span>
                                    <Plus size={14} className="text-primary" />
                                </button>
                            ))}
                        </div>

                        {/* Custom food entry option */}
                        <div className="flex gap-2 pt-1">
                            <input
                                type="text"
                                placeholder="Or type custom item..."
                                value={customFoodInput}
                                onChange={(e) => setCustomFoodInput(e.target.value)}
                                className="flex-1 rounded-xl px-3 py-2 text-xs bg-[#F6F5EF] dark:bg-[#171B18] border border-[#E7E6E0] dark:border-[#2C332E] outline-none text-[var(--text)]"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (customFoodInput.trim()) {
                                        addAvailableFood(customFoodInput.trim());
                                        setCustomFoodInput('');
                                        setIsAddFoodModalOpen(false);
                                    }
                                }}
                                className="py-2 px-4 rounded-xl bg-primary text-white font-bold text-xs hover:scale-105 transition"
                            >
                                Add Custom
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 2: TRAINING-RELATED FILTERS (Drawer / Toggleable) */}
            {(isFilterDrawerOpen || hasPendingFilterChanges) && (
                <div className="p-5 rounded-2xl bg-[#F6F5EF] dark:bg-[#171B18] border border-[#E7E6E0] dark:border-[#2C332E] space-y-4 animate-slide-in-down">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#BD6034]">Training & Nutrition Filters</h4>
                        <span className="text-[10px] text-[var(--text-dim)] font-medium">Select options then press Apply Filters</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Filter 1: Training Focus */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-[#555954] dark:text-[#B3BAB4]">Training Focus</label>
                            <select
                                value={pendingFilters.trainingFocus || 'General Fitness'}
                                onChange={(e) => setPendingFilters((prev) => ({ ...prev, trainingFocus: e.target.value }))}
                                className="w-full rounded-xl p-2.5 text-xs font-bold bg-white dark:bg-[#1C211E] border border-[#E7E6E0] dark:border-[#2C332E] text-[#171817] dark:text-[#F4F5F2] outline-none focus:border-primary"
                            >
                                <option value="Strength">Strength</option>
                                <option value="Muscle Building">Muscle Building</option>
                                <option value="Endurance">Endurance</option>
                                <option value="Recovery">Recovery</option>
                                <option value="General Fitness">General Fitness</option>
                            </select>
                        </div>

                        {/* Filter 2: Workout Intensity */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-[#555954] dark:text-[#B3BAB4]">Workout Intensity</label>
                            <select
                                value={pendingFilters.workoutIntensity || 'Moderate'}
                                onChange={(e) => setPendingFilters((prev) => ({ ...prev, workoutIntensity: e.target.value }))}
                                className="w-full rounded-xl p-2.5 text-xs font-bold bg-white dark:bg-[#1C211E] border border-[#E7E6E0] dark:border-[#2C332E] text-[#171817] dark:text-[#F4F5F2] outline-none focus:border-primary"
                            >
                                <option value="Light">Light</option>
                                <option value="Moderate">Moderate</option>
                                <option value="Heavy">Heavy</option>
                                <option value="Rest Day">Rest Day</option>
                            </select>
                        </div>

                        {/* Filter 3: Meal Type */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-[#555954] dark:text-[#B3BAB4]">Meal Type</label>
                            <select
                                value={pendingFilters.mealType || 'All'}
                                onChange={(e) => setPendingFilters((prev) => ({ ...prev, mealType: e.target.value }))}
                                className="w-full rounded-xl p-2.5 text-xs font-bold bg-white dark:bg-[#1C211E] border border-[#E7E6E0] dark:border-[#2C332E] text-[#171817] dark:text-[#F4F5F2] outline-none focus:border-primary"
                            >
                                <option value="All">All Meal Types</option>
                                <option value="Breakfast">Breakfast</option>
                                <option value="Lunch">Lunch</option>
                                <option value="Dinner">Dinner</option>
                                <option value="Pre-Workout">Pre-Workout</option>
                                <option value="Post-Workout">Post-Workout</option>
                                <option value="Snack">Snack</option>
                            </select>
                        </div>

                        {/* Filter 4: Nutrition Focus */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-[#555954] dark:text-[#B3BAB4]">Nutrition Focus</label>
                            <select
                                value={pendingFilters.nutritionFocus || 'Balanced'}
                                onChange={(e) => setPendingFilters((prev) => ({ ...prev, nutritionFocus: e.target.value }))}
                                className="w-full rounded-xl p-2.5 text-xs font-bold bg-white dark:bg-[#1C211E] border border-[#E7E6E0] dark:border-[#2C332E] text-[#171817] dark:text-[#F4F5F2] outline-none focus:border-primary"
                            >
                                <option value="Balanced">Balanced</option>
                                <option value="High Protein">High Protein</option>
                                <option value="High Energy">High Energy</option>
                                <option value="Light Meal">Light Meal</option>
                                <option value="Quick Meal">Quick Meal (&lt;15 mins)</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* EXPLICIT APPLY FILTERS BUTTON */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-primary-soft/50 border border-primary/20">
                <div className="text-xs font-semibold text-[#BD6034]">
                    <span className="font-extrabold">Applied: </span>
                    {appliedFilters.trainingFocus} • {appliedFilters.workoutIntensity} • {appliedFilters.mealType} • {appliedFilters.nutritionFocus}
                </div>

                <button
                    type="button"
                    onClick={() => {
                        applyPlanFilters(pendingFilters);
                        setIsFilterDrawerOpen(false);
                    }}
                    className={`py-2.5 px-6 rounded-xl font-bold text-xs transition duration-200 shadow-md ${hasPendingFilterChanges
                        ? 'bg-primary text-white scale-105 shadow-primary/30 animate-pulse'
                        : 'bg-primary hover:bg-primary-hover text-white'
                        }`}
                >
                    {hasPendingFilterChanges ? 'APPLY FILTERS (Pending Changes)' : 'APPLY FILTERS'}
                </button>
            </div>

            {/* SECTION 3: RECOMMENDED MEALS DISPLAY */}
            <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-[#171817] dark:text-[#F4F5F2]">Recommended Plan & Meals</h4>
                    <span className="text-[10px] text-[var(--text-dim)] font-medium">Ranked by Fitness target & available foods</span>
                </div>

                {!planData || !planData.mealSlots || planData.mealSlots.length === 0 ? (
                    <p className="text-xs text-[var(--text-dim)] py-6 text-center">No exact matches found. Showing general fallback options.</p>
                ) : (
                    planData.mealSlots.map((slot) => (
                        <div key={slot.slotName} className="space-y-3">
                            <span className="text-[11px] font-black uppercase tracking-wider text-[#BD6034] block">
                                {slot.slotName}
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {slot.meals.map((meal) => {
                                    const logged = isMealLoggedToday(meal.name);
                                    const hasMatchedFoods = meal.matchedFoods && meal.matchedFoods.length > 0;

                                    return (
                                        <div
                                            key={meal.id || meal.name}
                                            className={`rounded-2xl p-4 border transition flex flex-col justify-between space-y-3 bg-white dark:bg-[#1C211E] ${logged ? 'border-success' : 'border-[#E7E6E0] dark:border-[#2C332E] hover:border-primary/40'}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <img
                                                    src={meal.image}
                                                    alt={meal.name}
                                                    className="w-14 h-14 rounded-2xl object-cover shrink-0"
                                                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/assets/placeholders/food.png"; }}
                                                />

                                                <div className="space-y-1 overflow-hidden">
                                                    <h5 className="text-xs font-black text-[#171817] dark:text-[#F4F5F2] truncate">{meal.name}</h5>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#555954] dark:text-[#B3BAB4]">
                                                        <span className="text-primary">{meal.cal} kcal</span>
                                                        <span>•</span>
                                                        <span>{meal.protein}g Protein</span>
                                                    </div>

                                                    {/* AVAILABLE FOOD MATCH BADGE */}
                                                    {hasMatchedFoods && (
                                                        <div className="inline-flex items-center gap-1 text-[9px] font-extrabold text-success bg-success-soft px-2 py-0.5 rounded-md">
                                                            <Check size={10} strokeWidth={3} />
                                                            <span>Uses: {meal.matchedFoods.join(', ')}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* LOG MEAL ACTION BUTTON */}
                                            <button
                                                type="button"
                                                onClick={() => handleLogRecommendedMeal(meal)}
                                                disabled={logged}
                                                className={`w-full py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${logged
                                                    ? 'bg-success-soft text-success cursor-default'
                                                    : 'bg-[#F4F3ED] dark:bg-[#222825] text-[#171817] dark:text-[#F4F5F2] hover:bg-primary hover:text-white'
                                                    }`}
                                            >
                                                {logged ? (
                                                    <>
                                                        <Check size={14} strokeWidth={3} />
                                                        <span>Logged to Today's Meals</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={14} />
                                                        <span>+ Log to Today's Meals</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

        </div>
    );
}
