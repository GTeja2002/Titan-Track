/* ---------------- components/Dashboard.jsx ---------------- */
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Flame, Droplet, Footprints, Check, Play, ChevronLeft, ChevronRight,
  TrendingDown, TrendingUp, Trophy, ArrowRight, Bell, Search, Star,
  Plus, Trash2, Edit, X, CalendarDays, ChevronDown, Zap, Utensils, Database,
  Scale, User, Dumbbell, BarChart3, Activity, Heart, Clock, Leaf, Target
} from 'lucide-react';
import { calculateBMI, calculateBodyFat, calculateLeanMass, getBMICategory, calculateProteinTarget, normalizeWaterMl, FOOD_DB } from '../lib/calculations.js';
import { getLocalDateString, shiftDateString } from '../lib/date.js';
import { createEmptyLog } from '../lib/useAppState.js';
import { recipes, tips } from '../lib/wellnessContent.js';
import { PersonalizedPlanCard } from './PersonalizedPlanCard.jsx';
import WaterTrackerCard from './WaterTrackerCard.jsx';
import { MetricCard } from './MetricCard.jsx';
import { AchievementsCard } from './AchievementsCard.jsx';

/** Metric hue per meal slot, cycled down the daily list so the rows read as a
 *  sequence rather than four identical cards. */
/** Body-stat rows. Kept beside the component so the list is data rather than
 *  four near-identical blocks of markup, and each row names the metric hue its
 *  icon and badge are drawn from. */
const BODY_STAT_ROWS = ({ activeWeight, weightDiffStr, bodyFatPercent, bfDiffStr, leanMass, leanDiffStr, bmi, bmiCategoryLabel }) => [
  { label: 'Weight', icon: Scale, hue: 'steps', value: `${activeWeight} kg`, badge: weightDiffStr },
  { label: 'Body Fat', icon: Activity, hue: 'calories', value: `${bodyFatPercent}%`, badge: bfDiffStr },
  { label: 'Muscle Mass', icon: Dumbbell, hue: 'streak', value: `${leanMass} kg`, badge: leanDiffStr },
  {
    label: 'BMI', icon: BarChart3, hue: 'protein',
    value: bmi > 0 ? bmi.toFixed(1) : '——',
    badge: bmiCategoryLabel,
    alert: /obese|over|under/i.test(bmiCategoryLabel || ''),
  },
];

const MEAL_SLOTS = ['calories', 'steps', 'protein', 'water'];

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

  // Y-axis ticks for the weight chart, derived from the same scale the points
  // are plotted on so the labels line up with the line.
  const chartAxis = useMemo(() => {
    if (weightHistory.length === 0) return { ticks: [] };
    const weights = weightHistory.map((h) => h.weight);
    let minW = Math.min(...weights);
    let maxW = Math.max(...weights);
    if (minW === maxW) { minW -= 2; maxW += 2; }
    else {
      const pad = (maxW - minW) * 0.15 || 1;
      minW -= pad; maxW += pad;
    }
    const ticks = [];
    for (let i = 0; i <= 4; i++) {
      const value = minW + ((maxW - minW) * i) / 4;
      ticks.push({ value: Math.round(value), y: 90 - (i / 4) * 60 });
    }
    return { ticks, minW, maxW };
  }, [weightHistory]);

  // Closing the line back along the baseline gives a shape the gradient can
  // fill, which is what reads as "progress" rather than a bare stroke.
  const areaD = useMemo(() => {
    if (chartPoints.length < 2) return '';
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    return `${pathD} L ${last.x} 112 L ${first.x} 112 Z`;
  }, [chartPoints, pathD]);

  const latestPoint = chartPoints.length ? chartPoints[chartPoints.length - 1] : null;

  // Personalized greeting name
  const displayName = state.name || (state.email ? state.email.split('@')[0] : 'Teja');

  // Today's Goal completeness calculation (percent of calories + water + steps accomplished)
  const caloriesPct = Math.min(100, Math.round((totalCal / calorieTarget) * 100));
  const waterPct = Math.min(100, Math.round((waterLog / 8) * 100));
  const stepsPct = Math.min(100, Math.round((dailySteps / stepsTarget) * 100));
  const goalOverallProgress = Math.round((caloriesPct + waterPct + stepsPct) / 3) || 0;

  // The hero shows "n / 4 completed", so count targets actually met rather
  // than reusing the averaged percentage.
  const goalsCompleted = [
    totalCal >= calorieTarget,
    totalProtein >= proteinTarget,
    normalizeWaterMl(waterLog) >= waterTarget,
    dailySteps >= stepsTarget,
  ].filter(Boolean).length;

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

  // Saved recipes live in app state so a heart survives a reload, rather than
  // being local-only decoration.
  const recipeScrollRef = useRef(null);

  // The arrows were previously wired to a scrollRecipes that was never
  // defined, so clicking either one threw a ReferenceError and nothing moved.
  const scrollRecipes = (direction) => {
    const el = recipeScrollRef.current;
    if (!el) return;
    const step = Math.max(240, Math.round(el.clientWidth * 0.8));
    el.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' });
  };

  const savedRecipes = state.savedRecipes || [];
  const toggleSavedRecipe = (name) => {
    update((prev) => {
      const current = prev.savedRecipes || [];
      return {
        ...prev,
        savedRecipes: current.includes(name)
          ? current.filter((n) => n !== name)
          : [...current, name],
      };
    });
  };
  const [activeTipModal, setActiveTipModal] = useState(null);



  // Achievements
  const achievements = [
    { title: 'First Step', desc: 'Complete your first workout', bg: 'bg-primary-soft', text: 'text-primary' },
    { title: '7 Days Streak', desc: 'Workout 7 days in a row', bg: 'bg-warning-soft', text: 'text-warning' },
    { title: 'Hydration Hero', desc: 'Drink 8 glasses of water', bg: 'bg-water-soft', text: 'text-water' },
    { title: 'Weight Loss', desc: 'Lose 2 kg milestone', bg: 'bg-primary-soft', text: 'text-primary' },
    { title: 'Healthy Eater', desc: 'Log healthy meals', bg: 'bg-success-soft', text: 'text-success' },
  ];

  // Greeting follows the actual clock, so the header is not stuck saying
  // "Good morning" at 9pm.
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return { label: 'Good morning', emoji: '☀️' };
    if (h < 17) return { label: 'Good afternoon', emoji: '🌤️' };
    return { label: 'Good evening', emoji: '🌙' };
  })();

  const longDate = new Date((currentDate || '') + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });

  // Dynamic progress indicators from logs

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 1. Greeting header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none mt-0.5" aria-hidden="true">{greeting.emoji}</span>
          <div>
            <h1 className="text-[21px] sm:text-[23px] font-black tracking-tight leading-tight" style={{ color: 'var(--text)' }}>
              {greeting.label},
            </h1>
            <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
              Keep going! Your healthy habits are making a difference.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>
            <CalendarDays size={18} style={{ color: 'var(--text-faint)' }} />
            {longDate}
          </span>
          <span className="hidden sm:block h-6 w-px" style={{ background: 'var(--border)' }} />
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-black/5"
            aria-label="Notifications"
          >
            <Bell size={19} style={{ color: 'var(--text-dim)' }} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full" style={{ background: 'var(--danger)' }} />
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('Settings')}
            className="flex items-center gap-1.5"
            aria-label="Your profile"
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white"
              style={{ background: 'var(--grad-primary-cta)' }}
            >
              {(displayName || 'U').charAt(0).toUpperCase()}
            </span>
            <ChevronDown size={16} style={{ color: 'var(--text-faint)' }} />
          </button>
        </div>
      </header>

      {/* 2. Hero, with the streak and body stats beside it */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        <div className="lg:col-span-8 panel-card relative overflow-hidden rounded-[18px] p-6">
          {/* Soft green field behind the hero, and the leaf artwork bleeding in
              from the right behind the bowl. */}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ background: 'linear-gradient(115deg, var(--w-body-tint) 0%, var(--surface-solid) 68%)' }}
          />
          <img
            src="/assets/decor/leaf.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 top-0 z-0 h-full w-[58%] object-contain opacity-60"
          />

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
            <div className="sm:col-span-7">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={{ background: 'var(--w-body-disc)', color: 'var(--w-body-ink)' }}
              >
                <Leaf size={12} /> Healthy Living
              </span>

              <h1 className="mt-2.5 text-[22px] sm:text-[26px] font-black tracking-tight leading-[1.15]" style={{ color: 'var(--text)' }}>
                You&apos;re building a better,<br />
                <span style={{ color: 'var(--primary)' }}>healthier</span> you.
              </h1>

              <p className="mt-2 max-w-[300px] text-[12.5px] leading-snug" style={{ color: 'var(--text-dim)' }}>
                Stay consistent, stay focused. Small steps today, big changes tomorrow.
              </p>

              <div className="mt-4 flex flex-wrap gap-2.5">
                <button
                  onClick={() => goToTab('Nutrition')}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-white transition hover:brightness-105 active:scale-95"
                  style={{ background: 'var(--grad-primary-cta)', boxShadow: '0 6px 16px var(--primary-glow)' }}
                >
                  <Utensils size={15} />
                  Log Your Meal
                </button>
                <button
                  onClick={() => goToTab('Workouts')}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition hover:brightness-95 active:scale-95"
                  style={{ background: 'var(--surface-solid)', color: 'var(--text)', border: '1px solid var(--border)' }}
                >
                  <Play size={13} className="fill-current" />
                  Start Workout
                </button>
              </div>
            </div>

            <div className="relative sm:col-span-5 flex items-center justify-center">
              <img
                src="/assets/homepage/healthy_bowl.png"
                alt=""
                aria-hidden="true"
                className="h-[168px] w-[168px] object-contain"
                style={{ filter: 'drop-shadow(0 12px 22px rgba(0,0,0,0.16))' }}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/assets/placeholders/food.png"; }}
              />
            </div>
          </div>

          {/* Today's goal, pinned to the lower right of the hero */}
          <button
            type="button"
            onClick={() => goToTab('Progress')}
            className="relative z-10 mt-3 ml-auto flex w-fit items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:brightness-[0.98] active:scale-95 sm:absolute sm:bottom-5 sm:right-5 sm:mt-0"
            style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)', boxShadow: '0 6px 18px rgba(20,35,50,0.10)' }}
          >
            <div className="relative flex h-10 w-10 items-center justify-center shrink-0">
              <svg className="h-10 w-10 -rotate-90">
                <circle cx="20" cy="20" r="16" stroke="var(--color-border-subtle)" strokeWidth="3.5" fill="none" />
                <circle
                  cx="20" cy="20" r="16"
                  stroke="var(--primary)" strokeWidth="3.5" strokeLinecap="round" fill="none"
                  strokeDasharray={2 * Math.PI * 16}
                  strokeDashoffset={2 * Math.PI * 16 * (1 - Math.max(0.02, goalOverallProgress / 100))}
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute text-[10px] font-black" style={{ color: 'var(--text)' }}>{goalOverallProgress}%</span>
            </div>
            <div>
              <span className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-[0.08em]" style={{ color: 'var(--text-dim)' }}>
                <Target size={10} /> Today&apos;s Goal
              </span>
              <p className="mt-0.5 text-[11.5px] font-bold" style={{ color: 'var(--text)' }}>
                {goalsCompleted} / 4 completed
              </p>
            </div>
            <ChevronRight size={15} style={{ color: 'var(--text-faint)' }} />
          </button>
        </div>

        {/* Right column: streak, then body stats */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div
            className="rounded-[18px] p-5"
            style={{ background: 'var(--m-streak-soft)', border: '1px solid var(--m-streak-edge, var(--border))' }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.07em]" style={{ color: 'var(--m-streak-ink)' }}>
                <Flame size={14} /> Current Streak
              </span>
              <CalendarDays size={16} style={{ color: 'var(--m-streak-ink)' }} />
            </div>
            <p className="mt-2 text-[28px] font-black leading-none tracking-tight" style={{ color: 'var(--text)' }}>
              {streakDays} <span className="text-[15px] font-bold" style={{ color: 'var(--text-dim)' }}>day{streakDays === 1 ? '' : 's'}</span>
            </p>
            <p className="mt-1 text-[12px] font-medium" style={{ color: 'var(--text-dim)' }}>Keep it going!</p>
          </div>

          <div className="panel-card flex-1 rounded-[18px] p-5">
            <h3 className="text-[15px] font-black tracking-tight leading-tight" style={{ color: 'var(--text)' }}>Body Stats</h3>
            <p className="text-[11.5px] font-medium mt-0.5 mb-1" style={{ color: 'var(--text-dim)' }}>Keep pushing!</p>

            {BODY_STAT_ROWS({ activeWeight, weightDiffStr, bodyFatPercent, bfDiffStr, leanMass, leanDiffStr, bmi, bmiCategoryLabel }).map((row, i, arr) => {
              const Icon = row.icon;
              return (
                <button
                  key={row.label}
                  type="button"
                  onClick={() => goToTab('Progress')}
                  aria-label={`${row.label}: ${row.value}. Open Progress`}
                  className="flex w-full items-center gap-2.5 py-2.5 text-left transition hover:opacity-80"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <Icon size={16} style={{ color: `var(--m-${row.hue}-ink)` }} strokeWidth={2.3} className="shrink-0" />
                  <span className="flex-1 text-[12.5px] font-semibold" style={{ color: 'var(--text)' }}>{row.label}</span>
                  <span className="text-[13px] font-black" style={{ color: 'var(--text)' }}>{row.value}</span>
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap"
                    style={{
                      background: row.alert ? 'var(--danger-soft)' : 'var(--primary-soft)',
                      color: row.alert ? 'var(--danger)' : 'var(--primary)',
                    }}
                  >
                    {row.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>


      {/* 3. The four headline numbers. No section heading above them: they
          are the first thing under the greeting and label themselves. */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          metric="calories"
          icon={Flame}
          label="Calories"
          value={totalCal}
          target={calorieTarget}
          footnote={totalCal >= calorieTarget ? 'Target met!' : `Remaining: ${Math.max(0, calorieTarget - totalCal)} kcal`}
          progress={(totalCal / calorieTarget) * 100}
          onOpen={() => goToTab('Nutrition')}
        />

        <MetricCard
          metric="protein"
          icon={Zap}
          label="Protein"
          value={totalProtein}
          target={proteinTarget}
          unit="g"
          footnote={totalProtein >= proteinTarget ? 'Target hit!' : `Remaining: ${Math.max(0, proteinTarget - totalProtein)}g`}
          progress={(totalProtein / proteinTarget) * 100}
          onOpen={() => goToTab('Nutrition')}
        />

        <MetricCard
          metric="water"
          icon={Droplet}
          label="Water"
          value={normalizeWaterMl(waterLog)}
          target={waterTarget}
          unit=" ml"
          footnote={normalizeWaterMl(waterLog) >= waterTarget ? 'Hydrated!' : `Remaining: ${Math.max(0, waterTarget - normalizeWaterMl(waterLog)).toLocaleString()} ml`}
          progress={(normalizeWaterMl(waterLog) / waterTarget) * 100}
          onOpen={() => goToTab('Nutrition')}
        />

        <MetricCard
          metric="steps"
          icon={Footprints}
          label="Steps"
          value={dailySteps}
          target={stepsTarget}
          footnote={dailySteps >= stepsTarget ? 'Goal reached!' : 'Keep going!'}
          progress={(dailySteps / stepsTarget) * 100}
          onOpen={() => goToTab('Workouts')}
        />
      </section>

      {/* 4. Daily meals, motivation and hydration */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">

        {/* Left Column: Your Daily Meal Plan (Connected to Nutrition & Food Log) */}
        <div className="lg:col-span-7 panel-card rounded-[18px] p-5 text-left">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
            <div className="flex items-start gap-3">
              <Utensils size={28} style={{ color: 'var(--primary)' }} className="mt-1 shrink-0" strokeWidth={2.2} />
              <div>
                <h3 className="text-[19px] font-black tracking-tight leading-tight" style={{ color: 'var(--text)' }}>Your Daily Meals</h3>
                <p className="text-[13.5px] font-medium mt-1" style={{ color: 'var(--text-dim)' }}>
                  Planned meals for your day. Logged meals sync directly with your Nutrition target.
                </p>
              </div>
            </div>
            <button
              onClick={() => goToTab('Nutrition')}
              className="flex items-center gap-2 text-[13.5px] font-bold px-4 py-2.5 rounded-full transition hover:brightness-[0.97] active:scale-95 shrink-0"
              style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
            >
              <span>Customize in Nutrition</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Weekday Selector Row */}
          <div className="flex flex-wrap gap-2 mb-5">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
              const isCurrentDay = day === getWeekdayName(state.currentDate);
              const isSelected = day === selectedPlanWeekday;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedPlanWeekday(day)}
                  aria-current={isSelected ? 'true' : undefined}
                  className="day-pill text-[12px] font-bold px-[15px] py-1.5 rounded-full transition"
                  style={isSelected
                    ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 4px 12px var(--primary-glow)' }
                    : {
                      background: 'var(--chip-bg)',
                      color: 'var(--text-dim)',
                      outline: isCurrentDay ? '1.5px solid var(--primary)' : 'none',
                      outlineOffset: '-1.5px',
                    }}
                >
                  {day.substring(0, 3)}
                </button>
              );
            })}
          </div>

          {/* Meals List for Selected Weekday */}
          <div className="space-y-3">
            {defaultMeals.length === 0 ? (
              <p className="text-xs text-[var(--text-dim)] py-6 text-center">No meals planned for this day. Click "Customize in Nutrition" to add meals.</p>
            ) : (
              defaultMeals.map((meal, mealIndex) => {
                const logged = isMealIncluded(meal.name);
                // A colour per slot, cycling the metric hues, so the list reads
                // as a sequence of meals rather than four identical rows.
                const slot = MEAL_SLOTS[mealIndex % MEAL_SLOTS.length];
                const dot = `var(--m-${slot})`;
                return (
                  <div
                    key={meal.name}
                    onClick={() => handleToggleMeal(meal)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={logged}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggleMeal(meal); }
                    }}
                    className="meal-row flex items-center gap-3.5 rounded-[14px] px-3.5 py-2.5 transition cursor-pointer"
                    style={{
                      background: 'var(--surface-solid)',
                      border: `1px solid ${logged ? 'var(--primary)' : 'var(--border)'}`,
                    }}
                  >
                    {/* Square thumbnail with a thin ring in the slot's hue. The
                        ring is a box-shadow rather than a border so it does not
                        eat into the image box. */}
                    <img
                      src={meal.image || '/assets/placeholders/food.png'}
                      alt={meal.name}
                      className="h-[50px] w-[50px] rounded-[11px] object-cover shrink-0"
                      style={{ boxShadow: `0 0 0 2px ${dot}` }}
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/assets/placeholders/food.png"; }}
                    />

                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: dot }} aria-hidden="true" />

                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold truncate leading-snug" style={{ color: 'var(--text)' }}>
                        {meal.name}
                      </p>
                      <p className="text-[12px] font-medium mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        {meal.cal} kcal
                      </p>
                    </div>

                    {/* Logged state */}
                    <span
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-full shrink-0 transition"
                      style={{
                        background: logged ? 'var(--primary)' : 'var(--surface-solid)',
                        border: `1.5px solid ${logged ? 'var(--primary)' : 'var(--border-strong)'}`,
                        color: '#fff',
                      }}
                    >
                      {logged && <Check size={16} strokeWidth={3} />}
                    </span>

                    {/* Open in Nutrition. Stops propagation so it does not also
                        toggle the row it sits in. */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); goToTab('Nutrition'); }}
                      aria-label={`Open ${meal.name} in Nutrition`}
                      className="flex h-[32px] w-[32px] items-center justify-center rounded-full shrink-0 transition hover:brightness-95 active:scale-95"
                      style={{ background: 'var(--chip-bg)' }}
                    >
                      <ChevronRight size={19} style={{ color: 'var(--text)' }} />
                    </button>
                  </div>
                );
              })
            )}

            <button
              onClick={() => setIsFullMenuExpanded(!isFullMenuExpanded)}
              aria-expanded={isFullMenuExpanded}
              className="mt-3 flex h-[40px] w-full items-center justify-center gap-2.5 rounded-[13px] text-[13px] font-semibold transition hover:brightness-[0.97] active:scale-[0.99]"
              style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
            >
              <Database size={18} />
              <span>{isFullMenuExpanded ? 'Collapse Full Food Database' : 'View Quick Add Food Database'}</span>
              <ArrowRight size={16} />
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
          {/* The photo is the card, not a thumbnail beside it: it bleeds to
              the edges and a dark gradient runs in from the left so the text
              keeps its contrast over the bright sunrise. */}
          <div className="motivation-card relative overflow-hidden rounded-[18px] min-h-[150px] group">
            <img
              src="/assets/homepage/running.png"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-right transition-transform duration-[900ms] group-hover:scale-105"
            />
            <div className="motivation-scrim absolute inset-0" />

            <div className="relative z-10 flex h-full flex-col justify-center gap-2 p-6 max-w-[64%]">
              <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: 'var(--rail-gold)' }}>
                <Star size={15} className="fill-current" />
                Daily Motivation
              </span>
              <h4 className="text-[22px] font-black leading-[1.15] text-white">
                Discipline today, freedom tomorrow.
              </h4>
              <p className="text-[13px] leading-snug text-white/80">
                You're not just losing weight, you're gaining a new life.
              </p>
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

      {/* 5. Your Progress */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">

        {/* Weight trend */}
        <div className="lg:col-span-12 panel-card rounded-[18px] p-5 text-left">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full shrink-0" style={{ background: 'var(--primary-soft)' }}>
                <TrendingUp size={17} style={{ color: 'var(--primary)' }} strokeWidth={2.4} />
              </span>
              <div>
                <h3 className="text-[17px] font-black tracking-tight leading-tight" style={{ color: 'var(--text)' }}>Your Progress</h3>
                <p className="text-[12.5px] font-medium mt-0.5" style={{ color: 'var(--text-dim)' }}>
                  You&apos;re doing great! Last 30 Days
                </p>
              </div>
            </div>
            <button
              onClick={() => goToTab('Progress')}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition hover:brightness-[0.97] active:scale-95 shrink-0"
              style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
            >
              Last 30 Days
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Chart panel */}
          <div className="rounded-[16px] p-4" style={{ background: 'var(--bg-2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0" style={{ background: 'var(--surface-solid)' }}>
                <Scale size={14} style={{ color: 'var(--primary)' }} />
              </span>
              <span className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>Weight</span>
            </div>

            <div className="relative w-full" style={{ height: 168 }}>
              <svg className="w-full h-full" viewBox="0 0 500 130" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="weight-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Gridlines, aligned to the value ticks */}
                {chartAxis.ticks.map((t) => (
                  <line
                    key={t.y}
                    x1="46" y1={t.y} x2="490" y2={t.y}
                    stroke="var(--color-border-subtle)" strokeWidth="1"
                  />
                ))}

                {areaD && <path d={areaD} fill="url(#weight-area)" />}

                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )}

                {latestPoint && (
                  <circle
                    cx={latestPoint.x} cy={latestPoint.y} r="5"
                    fill="var(--primary)" stroke="var(--surface-solid)" strokeWidth="2.5"
                  />
                )}
              </svg>

              {/* Value ticks, as HTML so they keep their type size regardless of
                  the SVG's non-uniform scaling. */}
              <div className="pointer-events-none absolute inset-0">
                {chartAxis.ticks.map((t) => (
                  <span
                    key={t.value}
                    className="absolute text-[11px] font-semibold"
                    style={{ left: 0, top: `${(t.y / 130) * 100}%`, transform: 'translateY(-50%)', color: 'var(--text-faint)' }}
                  >
                    {t.value}
                  </span>
                ))}

                {/* Latest reading, pinned to the end of the line */}
                {latestPoint && (
                  <span
                    className="absolute rounded-lg px-2.5 py-1 text-[12px] font-bold text-white whitespace-nowrap"
                    style={{
                      left: `${(latestPoint.x / 500) * 100}%`,
                      top: `${(latestPoint.y / 130) * 100}%`,
                      transform: 'translate(-86%, -190%)',
                      background: 'var(--primary)',
                    }}
                  >
                    {latestPoint.weight} kg
                  </span>
                )}
              </div>
            </div>

            {/* First and last date only, as the reference shows */}
            {chartPoints.length > 0 && (
              <div className="mt-1 flex justify-between text-[11px] font-semibold" style={{ color: 'var(--text-faint)' }}>
                <span>{chartPoints[0].dateLabel}</span>
                <span>{chartPoints[chartPoints.length - 1].dateLabel}</span>
              </div>
            )}
          </div>
        </div>

      </section>


      {/* 6. Healthy Recipes Carousel for You */}
      <section className="space-y-4 text-left">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Utensils size={26} style={{ color: 'var(--primary)' }} className="shrink-0" strokeWidth={2.2} />
            <div>
              <h2 className="text-[18px] font-black tracking-tight leading-tight" style={{ color: 'var(--text)' }}>
                Healthy Recipes for You
              </h2>
              <p className="text-[12.5px] font-medium mt-0.5" style={{ color: 'var(--text-dim)' }}>
                Fresh, nutritious and delicious meals for your goals.
              </p>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => scrollRecipes('left')}
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:brightness-95 active:scale-95"
              style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)' }}
              aria-label="Previous recipes"
            >
              <ChevronLeft size={17} style={{ color: 'var(--text)' }} />
            </button>
            <button
              onClick={() => scrollRecipes('right')}
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:brightness-95 active:scale-95"
              style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)' }}
              aria-label="Next recipes"
            >
              <ChevronRight size={17} style={{ color: 'var(--text)' }} />
            </button>
          </div>
        </div>

        {/* Carousel Grid. A scroll container on narrow screens so the arrows
            have something to move; it still lays out as a four-up grid once
            there is room for all of them. */}
        <div
          ref={recipeScrollRef}
          className="grid grid-flow-col auto-cols-[minmax(230px,1fr)] gap-4 overflow-x-auto scroll-smooth pb-1 xl:grid-flow-row xl:auto-cols-auto xl:grid-cols-4 xl:overflow-visible"
          style={{ scrollbarWidth: 'thin' }}
        >
          {recipes.map((item, idx) => {
            // Same hue cycle as the meal list, so a recipe and its meal slot
            // read as the same colour language.
            const hue = MEAL_SLOTS[idx % MEAL_SLOTS.length];
            const saved = savedRecipes.includes(item.name);
            return (
              <div
                key={item.name}
                onClick={() => setActiveRecipeModal(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveRecipeModal(item); }
                }}
                className="recipe-card group flex flex-col overflow-hidden rounded-[18px] transition duration-300 hover:-translate-y-1 cursor-pointer"
                style={{
                  background: 'var(--surface-solid)',
                  border: '1px solid var(--border)',
                  borderLeft: `4px solid var(--m-${hue})`,
                }}
              >
                {/* shrink-0 matters: this is a flex child with a fixed height,
                    and flex children shrink by default — without it the photo
                    is squeezed and crops through the dish, and the text below
                    gets pushed against the card edge. */}
                <div className="relative h-[124px] shrink-0 overflow-hidden">
                  <img
                    src={item.image}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/assets/placeholders/food.png"; }}
                  />

                  <span
                    className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full px-2 py-1 text-[9.5px] font-black uppercase tracking-[0.08em] text-white"
                    style={{ background: `var(--m-${hue})` }}
                  >
                    <Star size={10} className="fill-current" />
                    Recipe
                  </span>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleSavedRecipe(item.name); }}
                    aria-label={saved ? `Remove ${item.name} from saved` : `Save ${item.name}`}
                    aria-pressed={saved}
                    className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full transition hover:scale-110 active:scale-95"
                    style={{ background: 'var(--surface-solid)', boxShadow: '0 2px 8px rgba(0,0,0,0.14)' }}
                  >
                    <Heart
                      size={14}
                      className={saved ? 'fill-current' : ''}
                      style={{ color: saved ? 'var(--danger)' : 'var(--text-faint)' }}
                    />
                  </button>
                </div>

                <div className="flex flex-1 flex-col gap-1 p-3.5 min-w-0">
                  <p className="text-[14.5px] font-bold leading-snug" style={{ color: 'var(--text)' }}>{item.name}</p>
                  {item.desc && (
                    <p className="text-[12px] font-medium leading-snug" style={{ color: 'var(--text-dim)' }}>{item.desc}</p>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-2.5 text-[11.5px] font-bold">
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--m-water-ink)' }}>
                      <Flame size={13} />
                      {item.cal} kcal
                    </span>
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--m-protein-ink)' }}>
                      <Clock size={13} />
                      {item.time}
                    </span>
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

      {/* 7. Tips & Knowledge Section */}
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

      {/* 8. Achievements & Gamification Section */}
      <AchievementsCard state={state} update={update} />

      {/* 9. CTA Banner bottom */}
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

      {/* 10. Weekly Plan Editor Modal */}
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
