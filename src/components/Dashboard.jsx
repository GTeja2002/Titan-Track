/* ---------------- components/Dashboard.jsx ---------------- */
import { useState, useMemo, useEffect } from 'react';
import {
  Flame, Droplet, Footprints, Check, Play, ChevronLeft, ChevronRight,
  TrendingDown, TrendingUp, Trophy, ArrowRight, Bell, Search, Star,
  Plus, Trash2, Edit, X
} from 'lucide-react';
import { calculateBMI, calculateBodyFat, calculateLeanMass, getBMICategory, calculateProteinTarget, normalizeWaterMl, FOOD_DB } from '../lib/calculations.js';
import { getLocalDateString, shiftDateString } from '../lib/date.js';
import { createEmptyLog } from '../lib/useAppState.js';
import { recipes, tips } from '../lib/wellnessContent.js';
import { PersonalizedPlanCard } from './PersonalizedPlanCard.jsx';
import WaterTrackerCard from './WaterTrackerCard.jsx';
import { AchievementsCard } from './AchievementsCard.jsx';

export function Dashboard({
  state,
  update,
  onNavigate,
  addAvailableFood,
  removeAvailableFood,
  applyPlanFilters
}) {
  // Navigation helper to switch parent tabs
  const goToTab = (tabName) => {
    if (onNavigate) onNavigate(tabName);
  };

  const currentDate = state.currentDate;
  const log = state.logs[currentDate] || { ...createEmptyLog(), weight: state.weight || 70 };
  const foods = log.foods || [];

  // Logged metrics calculations
  const totalCal = foods.reduce((s, f) => s + (f.cal || 0), 0);
  const totalProtein = Math.round(foods.reduce((s, f) => s + (f.protein || 0), 0));
  const waterLog = log.water || 0;

  // Steps metric: read state.logs[currentDate].steps path or fallback
  const stepsTarget = 10000;
  const dailySteps = log.steps || 0;

  // Weight composition details
  const activeWeight = log.weight > 0 ? log.weight : (state.weight || 70);
  const proteinTarget = calculateProteinTarget(activeWeight, state.goal, state.activityLevel);
  const calorieTarget = state.calorieTarget || 2000;

  // Custom / Dynamic Water Target persistence
  const [waterTarget, setWaterTarget] = useState(() => {
    try {
      const saved = localStorage.getItem('titantrack_water_target');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 500 && parsed <= 10000) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return Math.round(activeWeight * 35);
  });

  const handleWaterChange = (mlDelta) => {
    update((prev) => {
      const today = prev.currentDate;
      const existingLog = prev.logs[today] || { ...createEmptyLog(), weight: prev.weight || 70 };
      const currentWaterMl = normalizeWaterMl(existingLog.water);
      const newWaterMl = Math.max(0, currentWaterMl + mlDelta);
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [today]: {
            ...existingLog,
            water: newWaterMl
          }
        }
      };
    });
  };

  const handleWaterTargetChange = (newTargetMl) => {
    try {
      localStorage.setItem('titantrack_water_target', newTargetMl.toString());
    } catch (err) {
      console.error('Failed to save water target:', err);
    }
    setWaterTarget(newTargetMl);
  };

  const bfRatio = calculateBodyFat(activeWeight, state.height, state.overrideBodyFat, state.manualBodyFat, state.age, state.gender);
  const bodyFatPercent = Math.round(bfRatio * 100);
  const bmi = calculateBMI(activeWeight, state.height);
  const bmiCategoryLabel = getBMICategory(bmi);

  const startW = state.startWeight || activeWeight;
  const weightDiff = activeWeight - startW;
  const weightDiffStr = weightDiff === 0 ? '0 kg' : `${weightDiff > 0 ? '+' : ''}${weightDiff.toFixed(1)} kg`;

  const startBfRatio = calculateBodyFat(startW, state.height, state.overrideBodyFat, state.manualBodyFat, state.age, state.gender);
  const bfDiffPercent = (bfRatio - startBfRatio) * 100;
  const bfDiffStr = bfDiffPercent === 0 ? '0%' : `${bfDiffPercent > 0 ? '+' : ''}${bfDiffPercent.toFixed(1)}%`;

  const leanMass = calculateLeanMass(activeWeight, bfRatio);
  const startLeanMass = calculateLeanMass(startW, startBfRatio);
  const leanDiff = leanMass - startLeanMass;
  const leanDiffStr = leanDiff === 0 ? '0 kg' : `${leanDiff > 0 ? '+' : ''}${leanDiff.toFixed(1)} kg`;

  const streakDays = useMemo(() => {
    const logs = state.logs || {};
    if (Object.keys(logs).length === 0) return 0;
    let streak = 0;
    let dateStr = state.currentDate || getLocalDateString();
    for (let i = 0; i < 365; i++) {
      const dayLog = logs[dateStr];
      const hasActivity = dayLog && ((dayLog.foods && dayLog.foods.length > 0) || dayLog.walk > 0 || dayLog.gym > 0 || dayLog.water > 0 || dayLog.weight > 0);
      if (hasActivity) {
        streak++;
        dateStr = shiftDateString(dateStr, -1);
      } else {
        // Today not logged yet is not a broken streak — skip back once.
        if (i === 0) {
          dateStr = shiftDateString(dateStr, -1);
          continue;
        }
        break;
      }
    }
    return streak;
  }, [state.logs, state.currentDate]);

  const weightHistory = useMemo(() => {
    const history = [];
    const logDates = Object.keys(state.logs || {}).sort();
    logDates.forEach((dateStr) => {
      const l = state.logs[dateStr];
      if (l && l.weight > 0) {
        if (!history.some(h => h.date === dateStr)) {
          history.push({ date: dateStr, weight: l.weight });
        }
      }
    });

    // Ensure activeWeight is included for the current date
    const todayStr = state.currentDate;
    if (!history.some(h => h.date === todayStr)) {
      history.push({ date: todayStr, weight: activeWeight });
    }

    // Sort history chronologically
    history.sort((a, b) => a.date.localeCompare(b.date));

    // If only 1 point, seed a starting point for trend visual baseline
    if (history.length === 1) {
      const startW = state.startWeight || (history[0].weight + 2);
      const prevDateStr = shiftDateString(history[0].date, -7);
      history.unshift({ date: prevDateStr, weight: startW });
    }

    // Keep last 5 points
    return history.slice(-5);
  }, [state.logs, state.currentDate, activeWeight, state.startWeight]);

  const chartPoints = useMemo(() => {
    if (weightHistory.length === 0) return [];
    const weights = weightHistory.map(h => h.weight);
    let minW = Math.min(...weights);
    let maxW = Math.max(...weights);
    if (minW === maxW) {
      minW -= 2;
      maxW += 2;
    } else {
      const padding = (maxW - minW) * 0.15 || 1;
      minW -= padding;
      maxW += padding;
    }

    const width = 500;
    const height = 120;
    const paddingX = 50;
    const chartWidth = width - paddingX * 2; // 400

    return weightHistory.map((h, i) => {
      const x = paddingX + (i * (chartWidth / (weightHistory.length - 1)));
      const ratio = (h.weight - minW) / (maxW - minW);
      const y = 90 - (ratio * 60); // plot between y=30 and y=90
      return {
        x,
        y,
        weight: h.weight,
        dateLabel: (() => {
          try {
            const d = new Date(h.date + 'T00:00:00');
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } catch {
            return h.date;
          }
        })()
      };
    });
  }, [weightHistory]);

  const pathD = useMemo(() => {
    if (chartPoints.length < 2) return '';
    return chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [chartPoints]);

  // Personalized greeting name
  const displayName = state.name || (state.email ? state.email.split('@')[0] : 'Teja');

  // Today's Goal completeness calculation (percent of calories + water + steps accomplished)
  const caloriesPct = Math.min(100, Math.round((totalCal / calorieTarget) * 100));
  const waterPct = Math.min(100, Math.round((waterLog / 8) * 100));
  const stepsPct = Math.min(100, Math.round((dailySteps / stepsTarget) * 100));
  const goalOverallProgress = Math.round((caloriesPct + waterPct + stepsPct) / 3) || 0;

  // Personalized Plan Tab
  const [activePlanTab, setActivePlanTab] = useState('meals'); // 'meals' | 'workouts'

  const getWeekdayName = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const [selectedPlanWeekday, setSelectedPlanWeekday] = useState(() => getWeekdayName(state.currentDate));
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editorWeekday, setEditorWeekday] = useState('Monday');
  const [mealSearch, setMealSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isFullMenuExpanded, setIsFullMenuExpanded] = useState(false);

  // Synchronize weekday display with date picker updates
  useEffect(() => {
    setSelectedPlanWeekday(getWeekdayName(state.currentDate));
  }, [state.currentDate]);

  // weeklyPlan is two levels deep, so every write has to clone both levels.
  // Writing into prev.weeklyPlan[weekday] directly would mutate previous state
  // in place and leave state.weeklyPlan reference-equal, staling anything
  // memoised on it.
  const planDay = (s, weekday) => {
    const day = (s.weeklyPlan && s.weeklyPlan[weekday]) || {};
    return { meals: day.meals || [], workouts: day.workouts || [] };
  };

  const withPlanDay = (s, weekday, day) => ({
    ...s,
    weeklyPlan: { ...(s.weeklyPlan || {}), [weekday]: day },
  });

  // Handle plan updates
  const handleDeletePlannedMeal = (weekday, mealIndex) => {
    update((prev) => {
      const day = planDay(prev, weekday);
      const newMeals = [...day.meals];
      newMeals.splice(mealIndex, 1);
      return withPlanDay(prev, weekday, { ...day, meals: newMeals });
    });
  };

  const handleAddPlannedMeal = (weekday, food) => {
    const cal = food.unit === 'piece' ? (food.calPerPiece ?? 70) : (food.calPer100 ?? 100);
    const newMeal = {
      name: food.name,
      cal,
      protein: food.unit === 'piece' ? (food.proteinPerPiece ?? 0) : (food.proteinPer100 ?? 0),
      carbs: food.unit === 'piece' ? (food.carbsPerPiece ?? 0) : (food.carbsPer100 ?? 0),
      fat: food.unit === 'piece' ? (food.fatPerPiece ?? 0) : (food.fatPer100 ?? 0),
      fiber: food.unit === 'piece' ? (food.fiberPerPiece ?? 0) : (food.fiberPer100 ?? 0),
      image: food.image || '/assets/placeholders/food.png'
    };
    update((prev) => {
      const day = planDay(prev, weekday);
      return withPlanDay(prev, weekday, { ...day, meals: [...day.meals, newMeal] });
    });
  };

  const handleTogglePlannedWorkout = (weekday, template) => {
    update((prev) => {
      const day = planDay(prev, weekday);
      const isPlanned = day.workouts.some((w) => w.id === template.id);
      const workouts = isPlanned
        ? day.workouts.filter((w) => w.id !== template.id)
        : [...day.workouts, template];
      return withPlanDay(prev, weekday, { ...day, workouts });
    });
  };

  // Check if a specific meal plan is logged (by matching food name)
  const isMealIncluded = (mealName) => {
    return foods.some((f) => f.name.toLowerCase().includes(mealName.toLowerCase()));
  };

  // Toggle meal logging directly
  const handleToggleMeal = (meal) => {
    const isLogged = isMealIncluded(meal.name);
    update((prev) => {
      const currentLog = prev.logs[prev.currentDate] || { ...createEmptyLog(), weight: prev.weight || 70 };
      let newFoods = [...(currentLog.foods || [])];

      if (isLogged) {
        newFoods = newFoods.filter((f) => !f.name.toLowerCase().includes(meal.name.toLowerCase()));
      } else {
        newFoods.push({
          name: meal.name,
          cal: meal.cal,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          fiber: meal.fiber,
          qty: 1,
          unit: 'serving',
          image: meal.image
        });
      }

      return {
        ...prev,
        logs: {
          ...prev.logs,
          [prev.currentDate]: { ...currentLog, foods: newFoods }
        }
      };
    });
  };

  const plansForDay = (state.weeklyPlan && state.weeklyPlan[selectedPlanWeekday]) || { meals: [], workouts: [] };
  const defaultMeals = plansForDay.meals || [];
  const activeWorkouts = plansForDay.workouts || [];

  // Workout state tracking
  const workoutsMock = activeWorkouts.map((w) => {
    let done = false;
    if (w.id === 'walk') done = log.walk > 0;
    else if (w.id === 'cardio') done = log.gym > 0;
    else if (w.id === 'strength') done = log.gym > 1;
    else if (w.id === 'core') done = log.gym > 2;
    return { ...w, done };
  });

  const handleToggleWorkout = (workout) => {
    update((prev) => {
      const currentLog = prev.logs[prev.currentDate] || { ...createEmptyLog(), weight: prev.weight || 70 };
      if (workout.id === 'walk') {
        const nextWalk = currentLog.walk > 0 ? 0 : 3;
        return {
          ...prev,
          logs: {
            ...prev.logs,
            [prev.currentDate]: { ...currentLog, walk: nextWalk }
          }
        };
      } else {
        let nextGym = currentLog.gym || 0;
        if (workout.id === 'cardio') nextGym = nextGym >= 1 ? 0 : 1;
        if (workout.id === 'strength') nextGym = nextGym >= 2 ? 0 : 2;
        if (workout.id === 'core') nextGym = nextGym >= 3 ? 0 : 3;
        return {
          ...prev,
          logs: {
            ...prev.logs,
            [prev.currentDate]: { ...currentLog, gym: nextGym }
          }
        };
      }
    });
  };

  // Recipe Slider Carousel controls
  const [recipeIdx, setRecipeIdx] = useState(0);
  const [activeRecipeModal, setActiveRecipeModal] = useState(null);
  const [activeTipModal, setActiveTipModal] = useState(null);



  // Achievements
  const achievements = [
    { title: 'First Step', desc: 'Complete your first workout', bg: 'bg-primary-soft', text: 'text-primary' },
    { title: '7 Days Streak', desc: 'Workout 7 days in a row', bg: 'bg-warning-soft', text: 'text-warning' },
    { title: 'Hydration Hero', desc: 'Drink 8 glasses of water', bg: 'bg-water-soft', text: 'text-water' },
    { title: 'Weight Loss', desc: 'Lose 2 kg milestone', bg: 'bg-primary-soft', text: 'text-primary' },
    { title: 'Healthy Eater', desc: 'Log healthy meals', bg: 'bg-success-soft', text: 'text-success' },
  ];

  // Dynamic progress indicators from logs

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 1. Hero / Header Greeting Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center rounded-3xl p-6 sm:p-8 glass border border-[var(--border)] shadow-sm relative overflow-hidden">
        {/* Three separated washes rather than one green glow, so the hero has
            some colour depth behind it without anything competing with the
            text. Each is keyed to a metric hue already used below. */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-60"
          style={{
            background:
              'radial-gradient(circle at 88% 12%, var(--m-streak-soft), transparent 42%),' +
              'radial-gradient(circle at 62% 92%, var(--m-water-soft), transparent 38%),' +
              'radial-gradient(circle at 8% 40%, var(--primary-soft), transparent 45%)',
          }}
        />

        {/* relative z-10: the wash above is absolutely positioned, and
            positioned elements paint after non-positioned inline content, so
            without this it sits on top of the headline and button and washes
            them out. */}
        <div className="relative z-10 lg:col-span-6 space-y-4">
          <span className="inline-block text-xs font-semibold px-3 py-1 bg-primary-soft text-primary rounded-full">
            Welcome back, {displayName}! 👋
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text)] tracking-tight leading-[1.1]">
            You're building a <span className="text-flow">better, healthier</span> you.
          </h1>
          <p className="text-sm text-[var(--text-dim)] max-w-md">
            Stay consistent, stay focused. Small steps today, big changes tomorrow.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => goToTab('Nutrition')}
              className="flex items-center gap-2 rounded-2xl py-3 px-5 text-sm font-bold text-white transition hover:scale-105 active:scale-95 shadow-md"
              style={{ background: 'var(--grad-primary-cta)', boxShadow: '0 8px 20px var(--primary-glow)' }}
            >
              Log Your Meal
            </button>
            <button
              onClick={() => goToTab('Workouts')}
              className="flex items-center gap-2 rounded-2xl py-3 px-5 text-sm font-bold border justify-center transition hover:scale-105 active:scale-95 bg-[var(--surface-solid)] border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/5"
            >
              <Play size={14} className="fill-current text-[var(--text-dim)]" />
              <span>Start Workout</span>
            </button>
          </div>
        </div>

        {/* Hero Banner Images & Overlay Floating widgets
            The two badges used to be anchored to the same box as the bowl, so
            they sat on top of the food and the right-hand one was clipped by
            this section's overflow-hidden. The frame below is deliberately
            wider than the bowl: the bowl centres inside it and the badges sit
            in the margin, overlapping the artwork only slightly and never
            leaving the card. */}
        <div className="relative z-10 lg:col-span-6 flex justify-center items-center mt-6 lg:mt-0">
          <div className="relative w-full max-w-md px-10 sm:px-14 py-10 flex justify-center items-center">
            {/* Main Salad Bowl image from projects assets */}
            <div className="relative w-52 h-52 sm:w-64 sm:h-64 rounded-full flex items-center justify-center p-3 animate-scale-in"
              style={{ background: 'var(--grad-primary-soft)' }}>
              <img
                src="/assets/homepage/healthy_bowl.png"
                alt="Healthy food selection"
                className="w-full h-full object-contain rounded-full shadow-2xl transition hover:rotate-12 duration-1000"
                style={{ filter: 'drop-shadow(0 15px 25px rgba(0, 0, 0, 0.15))' }}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/assets/placeholders/food.png";
                }}
              />
            </div>

            {/* Streak — amber, its own hue rather than another green card */}
            <div
              className="absolute top-0 left-0 rounded-2xl p-3.5 flex flex-col shadow-lg hover:scale-105 transition duration-300 border"
              style={{
                background: 'var(--surface-solid)',
                borderColor: 'var(--m-streak-soft)',
                boxShadow: '0 10px 26px rgba(224, 149, 47, 0.18)',
              }}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1" style={{ color: 'var(--m-streak-ink)' }}>
                🔥 Streak
              </span>
              <span className="text-3xl font-extrabold tracking-tight mt-0.5" style={{ color: 'var(--m-streak-ink)' }}>{streakDays}</span>
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-dim)' }}>Days Active</span>
            </div>

            {/* Today's goal — sits in the frame's bottom margin, fully inside
                the card, with the ring running the accent gradient. */}
            <div
              className="absolute bottom-0 right-0 rounded-2xl p-3.5 flex items-center gap-2.5 shadow-lg hover:scale-105 transition duration-300 border"
              style={{
                background: 'var(--surface-solid)',
                borderColor: 'var(--border)',
                boxShadow: '0 10px 26px rgba(0, 0, 0, 0.10)',
              }}
            >
              <div className="relative flex items-center justify-center">
                <svg className="w-12 h-12 -rotate-90">
                  <defs>
                    <linearGradient id="hero-goal-flow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--primary)" />
                      <stop offset="100%" stopColor="var(--primary-lift)" />
                    </linearGradient>
                  </defs>
                  <circle cx="24" cy="24" r="20" stroke="var(--color-border-subtle)" strokeWidth="4" fill="transparent" />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="url(#hero-goal-flow)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 20}
                    strokeDashoffset={2 * Math.PI * 20 * (1 - Math.max(0.05, goalOverallProgress / 100))}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute text-[11px] font-black" style={{ color: 'var(--text)' }}>{goalOverallProgress}%</div>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-dim)' }}>Today's Goal</span>
                <p className="text-xs font-extrabold mt-0.5" style={{ color: 'var(--text)' }}>Completed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Today's Overview Grid Status Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2 border-[#E7E6E0] dark:border-[#2C332E]">
          <h2 className="text-lg font-black tracking-tight text-[#171817] dark:text-[#F4F5F2]">Today's Overview</h2>
          <button onClick={() => goToTab('Nutrition')} className="text-xs font-bold text-primary hover:underline hover:text-primary-hover">
            View All &gt;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card: Calories */}
          <div className="bg-white dark:bg-[#1C211E] border border-[#E7E6E0] dark:border-[#2C332E] rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-1 transition duration-300 shadow-[0_4px_18px_rgba(30,35,30,0.05)] relative overflow-hidden group"
            style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, var(--m-calories-soft), transparent 58%)' }}>
            <div className="space-y-1 z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#555954] dark:text-[#B3BAB4] flex items-center gap-1.5">
                <Flame size={12} style={{ color: 'var(--m-calories-ink)' }} />
                Calories
              </span>
              <div className="text-2xl font-black tracking-tight text-[#171817] dark:text-[#F4F5F2]">
                {totalCal.toLocaleString()} <span className="text-xs font-semibold text-[#858982] dark:text-[#818982]">/ {calorieTarget}</span>
              </div>
              <span className="text-[10px] block text-[#858982] dark:text-[#818982]">
                {totalCal >= calorieTarget ? 'Target met! 🎉' : `Remaining: ${Math.max(0, calorieTarget - totalCal)} kcal`}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full mt-4 overflow-hidden" style={{ background: 'var(--m-calories-soft)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalCal / calorieTarget) * 100)}%`, background: 'var(--grad-calories)' }}
              />
            </div>
          </div>

          {/* Card: Protein */}
          <div className="bg-white dark:bg-[#1C211E] border border-[#E7E6E0] dark:border-[#2C332E] rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-1 transition duration-300 shadow-[0_4px_18px_rgba(30,35,30,0.05)] relative overflow-hidden group"
            style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, var(--m-protein-soft), transparent 58%)' }}>
            <div className="space-y-1 z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#555954] dark:text-[#B3BAB4] flex items-center gap-1.5">
                <Star size={12} style={{ color: 'var(--m-protein-ink)' }} />
                Protein
              </span>
              <div className="text-2xl font-black tracking-tight text-[#171817] dark:text-[#F4F5F2]">
                {totalProtein}g <span className="text-xs font-semibold text-[#858982] dark:text-[#818982]">/ {proteinTarget}g</span>
              </div>
              <span className="text-[10px] block text-[#858982] dark:text-[#818982]">
                {totalProtein >= proteinTarget ? 'Target hit! 💪' : `Remaining: ${Math.max(0, proteinTarget - totalProtein)}g`}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full mt-4 overflow-hidden" style={{ background: 'var(--m-protein-soft)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalProtein / proteinTarget) * 100)}%`, background: 'var(--grad-metric-protein)' }}
              />
            </div>
          </div>

          {/* Card: Water (Interactive Merged Card with Clean Overview UI & Custom mL Modal) */}
          <WaterTrackerCard
            water={waterLog}
            target={waterTarget}
            weight={activeWeight}
            onWaterChange={handleWaterChange}
            onTargetChange={handleWaterTargetChange}
          />

          {/* Card: Steps */}
          <div className="bg-white dark:bg-[#1C211E] border border-[#E7E6E0] dark:border-[#2C332E] rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-1 transition duration-300 shadow-[0_4px_18px_rgba(30,35,30,0.05)] relative overflow-hidden group"
            style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, var(--m-steps-soft), transparent 58%)' }}>
            <div className="space-y-1 z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#555954] dark:text-[#B3BAB4] flex items-center gap-1.5">
                <Footprints size={12} style={{ color: 'var(--m-steps-ink)' }} />
                Steps
              </span>
              <div className="text-2xl font-black tracking-tight text-[#171817] dark:text-[#F4F5F2]">
                {dailySteps.toLocaleString()} <span className="text-xs font-semibold text-[#858982] dark:text-[#818982]">/ {stepsTarget.toLocaleString()}</span>
              </div>
              <span className="text-[10px] block text-[#858982] dark:text-[#818982]">
                {dailySteps >= stepsTarget ? 'Step goal met! 🏃‍♂️' : 'Keep going!'}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full mt-4 overflow-hidden" style={{ background: 'var(--m-steps-soft)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (dailySteps / stepsTarget) * 100)}%`, background: 'var(--grad-steps)' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Your Personalized Plan & Water Tracker Interactive Block */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">

        {/* Left Column: Your Daily Meal Plan (Connected to Nutrition & Food Log) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#1C211E] rounded-3xl p-6 border border-[#E7E6E0] dark:border-[#2C332E] shadow-sm space-y-4 text-left">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#E7E6E0] dark:border-[#2C332E] pb-3">
            <div>
              <h3 className="font-extrabold text-[#171817] dark:text-[#F4F5F2]">Your Daily Meals</h3>
              <p className="text-xs text-[#555954] dark:text-[#B3BAB4] font-medium mt-0.5">
                Planned meals for your day. Logged meals sync directly with your Nutrition target.
              </p>
            </div>
            <button
              onClick={() => goToTab('Nutrition')}
              className="flex items-center gap-1.5 text-xs font-extrabold text-primary hover:underline bg-primary-soft hover:bg-primary-soft/80 px-3 py-1.5 rounded-xl duration-150 shrink-0"
            >
              <span>Customize in Nutrition</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Weekday Selector Row */}
          <div className="flex flex-wrap gap-1 border-b border-[#E7E6E0] dark:border-[#2C332E] pb-3">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
              const isCurrentDay = day === getWeekdayName(state.currentDate);
              const isSelected = day === selectedPlanWeekday;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedPlanWeekday(day)}
                  className={`text-[10px] font-extrabold px-3 py-1.5 rounded-xl transition ${isSelected ? 'bg-primary text-white shadow-sm' : 'bg-[#F4F3ED] dark:bg-[#222825] border border-transparent text-[#555954] dark:text-[#B3BAB4] hover:bg-[#EBEAE3] dark:hover:bg-[#2B322E]'} ${isCurrentDay ? 'border-primary border border-solid' : ''}`}
                >
                  {day.substring(0, 3)}
                </button>
              );
            })}
          </div>

          {/* Meals List for Selected Weekday */}
          <div className="space-y-3 pt-1">
            {defaultMeals.length === 0 ? (
              <p className="text-xs text-[var(--text-dim)] py-6 text-center">No meals planned for this day. Click "Customize in Nutrition" to add meals.</p>
            ) : (
              defaultMeals.map((meal) => {
                const logged = isMealIncluded(meal.name);
                return (
                  <div
                    key={meal.name}
                    onClick={() => handleToggleMeal(meal)}
                    className={`flex items-center justify-between rounded-2xl p-3 border transition cursor-pointer bg-white dark:bg-[#1C211E] ${logged ? 'border-success' : 'border-[#E7E6E0] dark:border-[#2C332E] hover:border-primary/40'}`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={meal.image || '/assets/placeholders/food.png'}
                        alt={meal.name}
                        className="h-11 w-11 rounded-xl object-cover"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/assets/placeholders/food.png"; }}
                      />
                      <div>
                        <p className="text-xs font-black text-[#171817] dark:text-[#F4F5F2]">{meal.name}</p>
                        <p className="text-[10px] text-[#555954] dark:text-[#B3BAB4] font-medium mt-0.5">{meal.cal} kcal</p>
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${logged ? 'bg-success border-success text-white' : 'border-[#E7E6E0] dark:border-[#2C332E]'}`}
                    >
                      {logged && <Check size={14} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })
            )}

            <button
              onClick={() => setIsFullMenuExpanded(!isFullMenuExpanded)}
              className="w-full text-center py-2.5 rounded-xl border border-[#E2E1DB] dark:border-[#2C332E] bg-[#F6F5EF] dark:bg-[#171B18] hover:bg-[#EBEAE3] dark:hover:bg-[#222823] transition text-xs font-bold text-[#555954] dark:text-[#B3BAB4] mt-2"
            >
              {isFullMenuExpanded ? "Collapse Full Food Database" : "View Quick Add Food Database"}
            </button>

            {isFullMenuExpanded && (
              <div className="mt-3 p-3 rounded-2xl bg-[#FAF9F5] dark:bg-[#161B18] border border-[#E7E6E0] dark:border-[#2C332E] space-y-2 text-left">
                <span className="text-[10px] font-extrabold text-[#555954] dark:text-[#B3BAB4] uppercase block mb-1">Food Database</span>
                <div className="max-h-52 overflow-y-auto space-y-1.5 scrollbar-thin">
                  {FOOD_DB.map((food) => {
                    const logged = isMealIncluded(food.name);
                    return (
                      <div
                        key={food.name}
                        onClick={() => {
                          const cal = food.unit === 'piece' ? (food.calPerPiece ?? 70) : (food.calPer100 ?? 100);
                          const meal = {
                            name: food.name,
                            cal,
                            protein: food.unit === 'piece' ? (food.proteinPerPiece ?? 0) : (food.proteinPer100 ?? 0),
                            carbs: food.unit === 'piece' ? (food.carbsPerPiece ?? 0) : (food.carbsPer100 ?? 0),
                            fat: food.unit === 'piece' ? (food.fatPerPiece ?? 0) : (food.fatPer100 ?? 0),
                            fiber: food.unit === 'piece' ? (food.fiberPerPiece ?? 0) : (food.fiberPer100 ?? 0),
                            image: food.image || '/assets/placeholders/food.png'
                          };
                          handleToggleMeal(meal);
                        }}
                        className={`flex items-center justify-between rounded-xl p-2 border transition cursor-pointer text-xs bg-white dark:bg-[#1C211E] ${logged ? 'border-success' : 'border-[#E7E6E0] dark:border-[#2C332E] hover:border-primary/40'}`}
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={food.image || '/assets/placeholders/food.png'}
                            alt={food.name}
                            className="h-8 w-8 rounded-lg object-cover"
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/assets/placeholders/food.png"; }}
                          />
                          <div>
                            <p className="font-extrabold text-[#171817] dark:text-[#F4F5F2] leading-tight">{food.name}</p>
                            <p className="text-[9px] text-[#555954] dark:text-[#B3BAB4] font-medium mt-0.5">{food.unit === 'piece' ? `${food.calPerPiece || 70} kcal/piece` : `${food.calPer100 || 100} kcal/100g`}</p>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${logged ? 'bg-success border-success text-white' : 'border-[#E7E6E0] dark:border-[#2C332E]'}`}
                        >
                          {logged && <Check size={11} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Daily Motivation Banner + Water Tracker Cup interface */}
        <div className="lg:col-span-5 flex flex-col gap-5 lg:gap-6">
          {/* Motivation card widget */}
          <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-[#1C211E] border border-[#E7E6E0] dark:border-[#2C332E] shadow-sm flex flex-col sm:flex-row justify-between p-5 min-h-[160px] group gap-4">
            <div className="relative z-10 flex flex-col justify-center text-left py-2 sm:max-w-[50%]">
              <span className="text-[10px] uppercase font-bold text-[#D9A441] dark:text-[#E0B04C] tracking-wider flex items-center gap-1.5 mb-1.5">
                <Star size={11} className="fill-current text-[#D9A441] dark:text-[#E0B04C]" />
                Daily Motivation
              </span>
              <h4 className="text-sm font-black text-[#171817] dark:text-[#F4F5F2] leading-tight mb-2">
                Discipline today, freedom tomorrow.
              </h4>
              <p className="text-[10px] text-[#555954] dark:text-[#B3BAB4] leading-relaxed">
                You're not just losing weight, you're gaining a new life.
              </p>
            </div>
            <div className="relative h-32 sm:h-auto sm:w-[45%] rounded-2xl overflow-hidden shrink-0">
              <img
                src="/assets/homepage/running.png"
                alt="Motivation running banner"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/assets/homepage/running.png"; }}
              />
            </div>
          </div>

          {/* Dedicated Hydration Tracker Widget Card */}
          <WaterTrackerCard
            variant="widget"
            water={waterLog}
            target={waterTarget}
            weight={activeWeight}
            onWaterChange={handleWaterChange}
            onTargetChange={handleWaterTargetChange}
          />
        </div>

      </section>

      {/* 4. Your Progress Section: SVG Chart + Stats */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2 border-[#E7E6E0] dark:border-[#2C332E]">
          <h2 className="text-lg font-black tracking-tight text-[#171817] dark:text-[#F4F5F2]">Your Progress</h2>
          <button onClick={() => goToTab('Progress')} className="text-xs font-bold text-primary hover:underline hover:text-primary-hover">
            View Progress &gt;
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
          {/* Left: Line chart plotting Weight progress */}
          <div className="lg:col-span-7 bg-white dark:bg-[#1C211E] rounded-3xl p-6 border border-[#E7E6E0] dark:border-[#2C332E] shadow-sm text-left space-y-4">
            <div>
              <p className="text-xs font-bold text-[#171817] dark:text-[#F4F5F2]">Weight Progress</p>
              <p className="text-[10px] text-[#5E8F83] dark:text-[#70A497] font-semibold flex items-center gap-1.5 mt-0.5">
                <TrendingDown size={12} />
                You're doing great! Last 30 Days
              </p>
            </div>

            {/* Custom SVG line Chart */}
            <div className="w-full h-44 relative bg-transparent rounded-2xl border border-[#EEEEEA] dark:border-[#2C332E] p-4 flex flex-col justify-end">
              <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                {/* Horizontal gridlines */}
                <line x1="0" y1="20" x2="500" y2="20" stroke="var(--color-border-subtle)" strokeWidth="1" />
                <line x1="0" y1="60" x2="500" y2="60" stroke="var(--color-border-subtle)" strokeWidth="1" />
                <line x1="0" y1="100" x2="500" y2="100" stroke="var(--color-border-subtle)" strokeWidth="1" />

                {/* Line graph fitting path */}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Dots on points */}
                {chartPoints.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    fill="var(--color-primary)"
                    stroke="var(--color-bg)"
                    strokeWidth="1.5"
                  />
                ))}

                {/* Labels floating */}
                {chartPoints.map((pt, i) => (
                  <text
                    key={i}
                    x={pt.x}
                    y={pt.y + 18}
                    fill="#858982"
                    fontSize="8.5"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {pt.weight} kg
                  </text>
                ))}
              </svg>

              {/* x-axis date labels */}
              <div className="flex justify-between items-center text-[8.5px] font-bold text-[#858982] dark:text-[#818982] mt-2 px-6">
                {chartPoints.map((pt, i) => (
                  <span key={i}>{pt.dateLabel}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Body stats listing matches details */}
          <div className="lg:col-span-5 bg-white dark:bg-[#1C211E] rounded-3xl p-6 border border-[#E7E6E0] dark:border-[#2C332E] shadow-sm text-left flex flex-col justify-between space-y-4">
            <div>
              <p className="text-xs font-bold text-[#171817] dark:text-[#F4F5F2]">Body Stats</p>
              <p className="text-[10px] text-[#858982] dark:text-[#818982] font-medium mt-0.5">Keep pushing!</p>
            </div>

            <div className="space-y-3 flex-1 flex flex-col justify-center">
              {/* Weight row */}
              <div className="flex items-center justify-between text-xs py-2 border-b border-[#EEEEEA] dark:border-[#2C332E]">
                <span className="font-semibold text-[#555954] dark:text-[#B3BAB4] flex items-center gap-1.5">⚖️ Weight</span>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#171817] dark:text-[#F4F5F2]">{activeWeight} kg</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-primary-soft text-primary rounded">{weightDiffStr}</span>
                </div>
              </div>

              {/* Body Fat row */}
              <div className="flex items-center justify-between text-xs py-2 border-b border-[#EEEEEA] dark:border-[#2C332E]">
                <span className="font-semibold text-[#555954] dark:text-[#B3BAB4] flex items-center gap-1.5">🧬 Body Fat</span>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#171817] dark:text-[#F4F5F2]">{bodyFatPercent}%</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-primary-soft text-primary rounded">{bfDiffStr}</span>
                </div>
              </div>

              {/* Muscle Mass row */}
              <div className="flex items-center justify-between text-xs py-2 border-b border-[#EEEEEA] dark:border-[#2C332E]">
                <span className="font-semibold text-[#555954] dark:text-[#B3BAB4] flex items-center gap-1.5">💪 Muscle Mass</span>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#171817] dark:text-[#F4F5F2]">{leanMass} kg</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-success-soft text-success rounded">{leanDiffStr}</span>
                </div>
              </div>

              {/* BMI row */}
              <div className="flex items-center justify-between text-xs py-2">
                <span className="font-semibold text-[#555954] dark:text-[#B3BAB4] flex items-center gap-1.5">📊 BMI</span>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#171817] dark:text-[#F4F5F2]">{bmi > 0 ? bmi.toFixed(1) : '——'}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-success-soft text-success rounded">{bmiCategoryLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Healthy Recipes Carousel for You */}
      <section className="space-y-4 text-left">
        <div className="flex items-center justify-between border-b pb-2 border-[#E7E6E0] dark:border-[#2C332E]">
          <h2 className="text-lg font-black tracking-tight text-[#171817] dark:text-[#F4F5F2]">Healthy Recipes for You</h2>
          <div className="flex gap-2">
            <button
              onClick={() => scrollRecipes('left')}
              className="p-1.5 rounded-xl bg-white dark:bg-[#1C211E] border border-[#E7E6E0] dark:border-[#2C332E] text-[#171817] dark:text-[#F4F5F2] hover:bg-[#F7F7F3] dark:hover:bg-[#222823] transition"
              aria-label="Previous recipes"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scrollRecipes('right')}
              className="p-1.5 rounded-xl bg-white dark:bg-[#1C211E] border border-[#E7E6E0] dark:border-[#2C332E] text-[#171817] dark:text-[#F4F5F2] hover:bg-[#F7F7F3] dark:hover:bg-[#222823] transition"
              aria-label="Next recipes"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Carousel Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recipes.map((item, idx) => {
            return (
              <div
                key={item.name}
                onClick={() => setActiveRecipeModal(item)}
                className="bg-white dark:bg-[#1C211E] flex flex-col group hover:-translate-y-1 transition duration-300 rounded-2xl overflow-hidden border border-[#E7E6E0] dark:border-[#2C332E] shadow-sm cursor-pointer"
              >
                <div className="relative aspect-[16/10] overflow-hidden p-2">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/assets/placeholders/food.png"; }}
                  />
                  <div className="absolute top-4 left-4 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-lg text-[8px] font-bold text-white tracking-widest uppercase">
                    ⭐ RECIPE
                  </div>
                </div>

                <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                  <p className="text-xs font-black text-[#171817] dark:text-[#F4F5F2] leading-tight">{item.name}</p>
                  <div className="flex justify-between items-center text-[10px] text-[#858982] dark:text-[#818982] font-semibold pt-1">
                    <span className="flex items-center gap-1"><span className="text-[#D9A441]">🥣</span> {item.cal} kcal</span>
                    <span className="flex items-center gap-1"><span className="text-[#D9A441]">⏱️</span> {item.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Inline Recipe Detail Box */}
        {activeRecipeModal && (
          <div className="mt-4 p-5 rounded-3xl bg-[#FAF9F5] dark:bg-[#161B18] border border-[#E7E6E0] dark:border-[#2C332E] space-y-4 animate-fade-in text-left relative">
            <button
              onClick={() => setActiveRecipeModal(null)}
              className="absolute top-4 right-4 p-1.5 px-3 rounded-xl text-xs font-extrabold bg-[#EBEAE3] dark:bg-[#2B322D] hover:bg-[#DCDCD5] dark:hover:bg-[#38423B] transition text-[#171817] dark:text-[#F4F5F2]"
            >
              ✕ Close Details
            </button>
            <div className="flex flex-col md:flex-row gap-5">
              <div className="md:w-1/3 shrink-0">
                <img
                  src={activeRecipeModal.image}
                  alt={activeRecipeModal.name}
                  className="w-full h-44 object-cover rounded-2xl border border-[var(--border)]"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/assets/placeholders/food.png"; }}
                />
                <div className="grid grid-cols-3 gap-1 bg-white dark:bg-[#1C211E] p-2.5 rounded-xl text-center font-bold border border-[#E7E6E0] dark:border-[#2C332E] mt-3">
                  <div>
                    <span className="block text-[8px] text-[#858982] uppercase">Calories</span>
                    <span className="text-[10px] text-primary">{activeRecipeModal.cal} kcal</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-[#858982] uppercase">Time</span>
                    <span className="text-[10px] text-[var(--text)]">{activeRecipeModal.time}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-[#858982] uppercase">Macros</span>
                    <span className="text-[9px] text-[var(--text)] leading-tight">{activeRecipeModal.protein}g P / {activeRecipeModal.carbs}g C / {activeRecipeModal.fat}g F</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-3.5 text-xs text-[#555954] dark:text-[#B3BAB4]">
                <div>
                  <h3 className="text-sm font-black text-[#171817] dark:text-[#F4F5F2]">{activeRecipeModal.name}</h3>
                  <span className="text-[9px] text-[#939C96] font-bold block mt-0.5">🥣 Healthy Recipe Breakdown</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-[10px] uppercase font-black tracking-wider text-[#BD6034]">Ingredients</h4>
                  <ul className="list-disc pl-4 space-y-0.5 font-medium leading-relaxed">
                    {activeRecipeModal.ingredients.map((ing, i) => (
                      <li key={i}>{ing}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1">
                  <h4 className="text-[10px] uppercase font-black tracking-wider text-[#BD6034]">Instruction Steps</h4>
                  <ol className="list-decimal pl-4 space-y-1 font-medium leading-relaxed">
                    {activeRecipeModal.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 6. Tips & Knowledge Section */}
      <section className="space-y-4 text-left">
        <div className="flex items-center justify-between border-b pb-2 border-[#E7E6E0] dark:border-[#2C332E]">
          <h2 className="text-lg font-black tracking-tight text-[#171817] dark:text-[#F4F5F2]">Tips & Knowledge</h2>
          <button onClick={() => goToTab('Nutrition')} className="text-xs font-bold text-primary hover:underline hover:text-primary-hover">
            View All Articles &gt;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tips.map((tip) => (
            <div
              key={tip.title}
              onClick={() => setActiveTipModal(tip)}
              className="bg-white dark:bg-[#1C211E] rounded-2xl overflow-hidden border border-[#E7E6E0] dark:border-[#2C332E] hover:-translate-y-1 transition duration-300 flex flex-col text-left group shadow-sm cursor-pointer"
            >
              <div className="h-28 overflow-hidden relative">
                <img
                  src={tip.image}
                  alt={tip.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/assets/onboarding-bg.webp"; }}
                />
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <p className="text-xs font-extrabold text-[#171817] dark:text-[#F4F5F2] leading-snug">{tip.title}</p>
                <div className="flex items-center gap-1.5 text-[9px] text-[#858982] dark:text-[#818982] font-bold">
                  <span className="text-[#D97745] dark:text-[#E08450]">📜</span> {tip.readTime}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Inline Tip Detail Box */}
        {activeTipModal && (
          <div className="mt-4 p-5 rounded-3xl bg-[#FAF9F5] dark:bg-[#161B18] border border-[#E7E6E0] dark:border-[#2C332E] space-y-4 animate-fade-in text-left relative col-span-full">
            <button
              onClick={() => setActiveTipModal(null)}
              className="absolute top-4 right-4 p-1.5 px-3 rounded-xl text-xs font-extrabold bg-[#EBEAE3] dark:bg-[#2B322D] hover:bg-[#DCDCD5] dark:hover:bg-[#38423B] transition text-[#171817] dark:text-[#F4F5F2]"
            >
              ✕ Close Reader
            </button>
            <div className="flex flex-col md:flex-row gap-5">
              <div className="md:w-1/4 shrink-0">
                <img
                  src={activeTipModal.image}
                  alt={activeTipModal.title}
                  className="w-full h-32 object-cover rounded-2xl border border-[var(--border)]"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/assets/onboarding-bg.webp"; }}
                />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-sm font-black text-[#171817] dark:text-[#F4F5F2] leading-snug">{activeTipModal.title}</h3>
                  <span className="text-[9px] text-[#939C96] font-bold block mt-0.5">📜 Health & Wellness Advice • {activeTipModal.readTime}</span>
                </div>
                <div className="space-y-2 text-xs text-[#555954] dark:text-[#B3BAB4] font-medium leading-relaxed">
                  {activeTipModal.content.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 7. Achievements & Gamification Section */}
      <AchievementsCard state={state} update={update} />

      {/* 8. CTA Banner bottom */}
      < section
        className="rounded-3xl p-6 sm:p-8 border border-primary/20 shadow-md relative overflow-hidden bg-cover bg-center flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(217,119,69,0.95) 0%, rgba(189,96,52,0.9) 100%), url('/assets/homepage/green-banner.png')` }
        }
      >
        <div className="space-y-1 max-w-lg">
          <h3 className="text-lg font-black text-white">You've come so far. Don't stop now! 🧡</h3>
          <p className="text-xs text-white/80 font-medium font-sans">
            Every healthy choice brings you closer to your best self.
          </p>
        </div>
        <button
          onClick={() => goToTab('Workouts')}
          className="flex items-center gap-1.5 py-3 px-5 rounded-2xl bg-white text-[#BD6034] font-bold hover:scale-105 active:scale-95 transition text-xs shadow-md cursor-pointer"
        >
          <span>Keep Going Strong</span>
          <ArrowRight size={14} />
        </button>
      </section >

      {/* 9. Weekly Plan Editor Modal */}
      {
        isPlanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div
              className="w-full max-w-3xl rounded-3xl p-6 glass text-left shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden"
              style={{ borderColor: 'var(--border)' }}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-4 border-b border-[#E7E6E0] dark:border-[#2C332E] shrink-0">
                <h3 className="text-lg font-black text-[#171817] dark:text-[#F4F5F2]">Weekly Schedule Editor</h3>
                <button
                  onClick={() => setIsPlanModalOpen(false)}
                  className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--bg-2)] transition"
                >
                  <X size={15} style={{ color: 'var(--text)' }} />
                </button>
              </div>

              {/* Modal Day Selector Row */}
              <div className="flex gap-1 overflow-x-auto py-3 border-b border-[#E7E6E0] dark:border-[#2C332E] shrink-0 scrollbar-none">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setEditorWeekday(day);
                      setMealSearch('');
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${editorWeekday === day ? 'bg-primary text-white shadow-sm' : 'bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)]'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Modal Two-Column Content Area */}
              <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 py-4">

                {/* Column 1: Planned Meals */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-dim)]">Meals Planned for {editorWeekday}</h4>
                  <div className="space-y-2">
                    {((state.weeklyPlan && state.weeklyPlan[editorWeekday] && state.weeklyPlan[editorWeekday].meals) || []).map((meal, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-2xl p-2.5 border border-[#E7E6E0] dark:border-[#2C332E] bg-[var(--surface)] text-[var(--text)]"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={meal.image}
                            alt={meal.name}
                            className="h-8 w-8 rounded-lg object-cover"
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/assets/placeholders/food.png"; }}
                          />
                          <div className="text-left">
                            <p className="text-xs font-extrabold leading-tight">{meal.name}</p>
                            <p className="text-[9px] text-[var(--text-faint)] font-bold mt-0.5">{meal.cal} kcal</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeletePlannedMeal(editorWeekday, index)}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {((state.weeklyPlan && state.weeklyPlan[editorWeekday]?.meals) || []).length === 0 && (
                      <p className="text-xs text-[var(--text-faint)] py-2">No meals planned. Add some below!</p>
                    )}
                  </div>

                  {/* Add Meal Search Box */}
                  <div className="pt-2 border-t border-[#E7E6E0] dark:border-[#2C332E] space-y-2 relative">
                    <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase block">Add a Meal</span>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search or select recipes..."
                        value={mealSearch}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        onChange={(e) => setMealSearch(e.target.value)}
                        className="w-full text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-2)] text-[var(--text)] px-3 py-2 outline-none"
                      />
                      {(isSearchFocused || mealSearch.trim() !== '') && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[var(--surface-solid)] border border-[var(--border)] rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1 text-left flex flex-col gap-0.5">
                          {(mealSearch.trim() === ''
                            ? FOOD_DB
                            : FOOD_DB.filter(f => f.name.toLowerCase().includes(mealSearch.toLowerCase()))
                          ).map(food => (
                            <div
                              key={food.name}
                              onClick={() => {
                                handleAddPlannedMeal(editorWeekday, food);
                                setMealSearch('');
                              }}
                              className="flex items-center justify-between text-xs p-2 rounded-xl cursor-pointer hover:bg-primary-soft hover:text-primary transition"
                            >
                              <span className="font-extrabold">{food.name}</span>
                              <span className="text-[10px] text-[var(--text-faint)] font-mono">{food.calPerPiece || food.calPer100} kcal</span>
                            </div>
                          ))}
                          {mealSearch.trim() !== '' && FOOD_DB.filter(f => f.name.toLowerCase().includes(mealSearch.toLowerCase())).length === 0 && (
                            <span className="text-xs text-[var(--text-faint)] p-2">No matching foods found.</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 2: Planned Workouts */}
                <div className="space-y-4 border-t pt-4 md:border-t-0 md:pt-0 md:border-l md:pl-6 border-[#E7E6E0] dark:border-[#2C332E]">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-dim)]">Workouts Planned for {editorWeekday}</h4>
                  <div className="space-y-3">
                    {[
                      { id: 'cardio', name: 'Cardiff Cardio', desc: '30 mins endurance run' },
                      { id: 'strength', name: 'Strength Training', desc: '45 mins full body lift' },
                      { id: 'core', name: 'Core Workout', desc: '15 mins abdominal reps' },
                      { id: 'walk', name: 'Evening Walk', desc: '30 mins recovery stroll' }
                    ].map((tpl) => {
                      const isPlanned = ((state.weeklyPlan && state.weeklyPlan[editorWeekday] && state.weeklyPlan[editorWeekday].workouts) || []).some(w => w.id === tpl.id);
                      return (
                        <div
                          key={tpl.id}
                          onClick={() => handleTogglePlannedWorkout(editorWeekday, tpl)}
                          className={`flex items-center justify-between rounded-2xl p-3 border transition cursor-pointer ${isPlanned ? 'border-primary bg-primary-soft/50 text-[var(--text)]' : 'border-[#E7E6E0] dark:border-[#2C332E] hover:border-[#DCDCD5] dark:hover:border-[#38423B] text-[var(--text-dim)]'}`}
                        >
                          <div className="text-left">
                            <p className="text-xs font-extrabold">{tpl.name}</p>
                            <p className="text-[9px] text-[var(--text-faint)] mt-0.5">{tpl.desc}</p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isPlanned ? 'bg-primary border-primary text-white' : 'border-[var(--border)]'}`}
                          >
                            {isPlanned && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-[#E7E6E0] dark:border-[#2C332E] flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-black shadow-lg shadow-[var(--primary-glow)] hover:scale-105 active:scale-95 transition"
                >
                  Done Editing
                </button>
              </div>

            </div>
          </div>
        )
      }
    </div >
  );
}
