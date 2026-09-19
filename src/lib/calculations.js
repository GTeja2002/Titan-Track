/* ---------------- lib/calculations.js ----------------
 * Pure calculation + data helpers — no React, no side effects (aside from
 * console usage none), safe to unit test in isolation.
 */

export function calculateBMI(weightKg, heightCm) {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || weightKg <= 0 || heightCm <= 0) return 0;
  const heightMeters = heightCm / 100;
  return Number((weightKg / (heightMeters * heightMeters)).toFixed(1));
}

export function calculateBodyFat(weightKg, heightCm, useManual, manualBodyFat, age, gender) {
  if (useManual && Number.isFinite(manualBodyFat) && manualBodyFat > 0) {
    return Math.min(0.5, Math.max(0.05, manualBodyFat / 100));
  }
  const bmi = calculateBMI(weightKg, heightCm);
  const genderFactor = gender === 'female' ? 0 : 1;
  const estimatedPercent = 1.2 * bmi + 0.23 * age - 10.8 * genderFactor - 5.4;
  return Math.min(0.5, Math.max(0.05, estimatedPercent / 100));
}

export function calculateLeanMass(weightKg, bodyFatRatio) {
  if (!Number.isFinite(weightKg) || !Number.isFinite(bodyFatRatio) || weightKg <= 0) return 0;
  return Number((weightKg * (1 - bodyFatRatio)).toFixed(1));
}

export function calculateFatMass(weightKg, bodyFatRatio) {
  if (!Number.isFinite(weightKg) || !Number.isFinite(bodyFatRatio) || weightKg <= 0) return 0;
  return Number((weightKg * bodyFatRatio).toFixed(1));
}

export function calculateBMR(gender, age, weightKg, heightCm) {
  if (!Number.isFinite(age) || !Number.isFinite(weightKg) || !Number.isFinite(heightCm)) return 0;
  if (gender === 'female') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  }
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
}

export function calculateTDEE(bmr, activityLevel) {
  const factors = {
    Sedentary: 1.2,
    Light: 1.375,
    Moderate: 1.55,
    Active: 1.725,
    Athlete: 1.9,
  };
  const factor = factors[activityLevel] || 1.55;
  return Math.round(bmr * factor);
}

export function getRemainingDays(currentDateStr, targetDateStr) {
  const curDate = new Date((currentDateStr || '2026-08-10') + 'T00:00:00');
  const tarDate = new Date((targetDateStr || '2026-12-31') + 'T00:00:00');
  const timeDiff = tarDate.getTime() - curDate.getTime();
  return Math.max(1, Math.round(timeDiff / (1000 * 3600 * 24)));
}

export function calculateDailyCalories(goal, tdee, weight = 70, goalWeight = 70, days = 90) {
  // Derive the calorie target from the ACTUAL weight → goal-weight direction
  // first, not just from which goal chip is selected. This ensures weight-gain
  // math is always applied whenever the goal weight is above current weight —
  // even if `goal` is still 'lose-fat' or 'maintain' (e.g. the goal-weight
  // slider was moved without also updating the goal chip) — instead of
  // silently applying a deficit to someone who's trying to gain weight.
  const diff = goalWeight - weight; // positive = needs to gain, negative = needs to lose

  if (diff > 0.1) {
    const reqSurplus = days > 0 ? Math.round((diff * 7700) / days) : 250;
    const surplus = Math.max(250, Math.min(800, reqSurplus));
    return Math.round(tdee + surplus);
  }

  if (diff < -0.1) {
    const reqDeficit = days > 0 ? Math.round((Math.abs(diff) * 7700) / days) : 300;
    const deficit = Math.max(300, Math.min(1000, reqDeficit));
    return Math.max(1200, Math.round(tdee - deficit));
  }

  // Goal weight ≈ current weight: fall back to the declared goal's default nudge.
  if (goal === 'lose-fat') return Math.max(1200, Math.round(tdee - 300));
  if (goal === 'gain-muscle') return Math.round(tdee + 250);
  return Math.round(tdee);
}

/**
 * Calculates evidence-based daily protein target (in grams) based on body weight,
 * fitness goal, and daily activity level.
 * 
 * - Baseline RDA (0.8g/kg): For general health, routine daily life, and standard fat-loss pace (e.g. 95 kg * 0.8 = 76g)
 * - Moderate (1.0g - 1.2g/kg): For active fat loss and recovery
 * - Athletic/Gain Muscle (1.2g - 1.6g/kg): For resistance training and intense muscle hypertrophy
 */
export function calculateProteinTarget(weightKg, goal = 'maintain', activityLevel = 'Sedentary') {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return 60;

  let multiplier = 0.8; // Baseline RDA for everyday routine / fat loss

  if (goal === 'lose-fat') {
    if (activityLevel === 'Active' || activityLevel === 'Athlete') {
      multiplier = 1.2;
    } else if (activityLevel === 'Moderate') {
      multiplier = 1.0;
    } else {
      multiplier = 0.8; // Standard RDA for routine/sedentary fat loss (e.g. 95kg * 0.8 = 76g)
    }
  } else if (goal === 'gain-muscle') {
    if (activityLevel === 'Active' || activityLevel === 'Athlete') {
      multiplier = 1.6;
    } else {
      multiplier = 1.2;
    }
  } else {
    // maintain / general wellness
    if (activityLevel === 'Active' || activityLevel === 'Athlete') {
      multiplier = 1.0;
    } else {
      multiplier = 0.8;
    }
  }

  return Math.round(weightKg * multiplier);
}

export function calculateWalkCalories(distanceKm, weightKg) {
  if (!Number.isFinite(distanceKm) || !Number.isFinite(weightKg) || distanceKm <= 0 || weightKg <= 0) return 0;
  // ~0.53 kcal per kg of bodyweight per km at a moderate walking pace (MET ≈ 3.5),
  // instead of one flat kcal/km figure applied to every body weight.
  return Math.round(distanceKm * weightKg * 0.53);
}

/** Sorted {date, weight} points pulled from the logs object, skipping days with no weigh-in. */
export function getWeightHistory(logs) {
  return Object.keys(logs || {})
    .filter((d) => logs[d]?.weight > 0)
    .sort()
    .map((d) => ({ date: d, weight: logs[d].weight }));
}

/** Trailing simple moving average over the last `windowSize` logged entries (not calendar days). */
export function movingAverage(points, windowSize) {
  return points.map((p, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const slice = points.slice(start, i + 1);
    const avg = slice.reduce((s, q) => s + q.weight, 0) / slice.length;
    return { date: p.date, weight: Number(avg.toFixed(2)) };
  });
}

/**
 * Projects future weight day-by-day instead of assuming a fixed weekly rate.
 * Unlike the static "7,700 kcal ≈ 1 kg, applied once" shortcut, this re-derives
 * BMR/TDEE from the *simulated* weight on every simulated day, so the pace
 * naturally slows down as weight changes (a lighter body burns less at rest) —
 * closer to how real weight loss/gain decelerates, without needing a full
 * clinical energy-balance model. Still an estimate, not a guarantee.
 */
export function simulateWeightProjection({ startWeight, goalWeight, gender, age, heightCm, activityLevel, calorieTarget, maxDays = 365 }) {
  const points = [{ day: 0, weight: Number(startWeight.toFixed(1)) }];
  if (!Number.isFinite(startWeight) || !Number.isFinite(goalWeight) || startWeight <= 0) {
    return { points, daysToGoal: null, reached: false };
  }
  const losing = goalWeight < startWeight;
  let simWeight = startWeight;
  let daysToGoal = null;

  for (let day = 1; day <= maxDays; day++) {
    const bmrToday = calculateBMR(gender, age, simWeight, heightCm);
    const tdeeToday = calculateTDEE(bmrToday, activityLevel);
    const netBalance = calorieTarget - tdeeToday;
    simWeight = simWeight + netBalance / 7700;
    if (losing) simWeight = Math.max(simWeight, goalWeight);
    else simWeight = Math.min(simWeight, goalWeight);

    if (day % 7 === 0 || day === maxDays) {
      points.push({ day, weight: Number(simWeight.toFixed(1)) });
    }
    if (daysToGoal === null && Math.abs(simWeight - goalWeight) < 0.1) {
      daysToGoal = day;
      if (day % 7 !== 0) points.push({ day, weight: Number(simWeight.toFixed(1)) });
      break;
    }
  }
  return { points, daysToGoal, reached: daysToGoal !== null };
}

export function calculateIdealWeight(heightCm) {
  if (!Number.isFinite(heightCm) || heightCm <= 0) return { min: 0, max: 0 };
  const base = 22 * (heightCm / 100) ** 2;
  const min = Math.round(base - 2);
  const max = Math.round(base + 5);
  return { min, max };
}

// Small inline tag used everywhere a value carries an estimated/measured
// status, so the person can tell at a glance whether it's an app-side
// estimate or their own real number. Intentionally muted (no red) — this
// communicates uncertainty, not an emergency.
export function getBMICategory(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export function getHealthSummary(bmi, bodyFatRatio, activityLevel) {
  let title = 'Healthy BMI';
  const recommendations = [];

  if (bmi < 18.5) {
    title = 'Underweight';
    recommendations.push('Add healthy calories');
  } else if (bmi < 25) {
    title = 'Healthy BMI';
    recommendations.push('Maintain active life');
  } else if (bmi < 30) {
    title = 'BMI Slightly High';
    recommendations.push('Increase daily movement');
  } else {
    title = 'BMI Elevated';
    recommendations.push('Reduce calorie intake');
  }

  if (bodyFatRatio > 0.28) {
    recommendations.push('Increase protein intake');
  } else if (bodyFatRatio < 0.12) {
    recommendations.push('Add balanced fats');
  } else {
    recommendations.push('Keep consistent meals');
  }

  if (activityLevel === 'Sedentary') {
    recommendations.unshift('Add light movement');
  }

  return {
    title,
    recommendations: recommendations.slice(0, 3),
  };
}

export function getNearestBodyImage(gender, bodyFatPercent, useManual, manualBodyFat, viewName = 'Front') {
  const normalizedView = String(viewName || 'Front').toLowerCase();
  const viewMap = {
    front: 'front',
    left: 'left',
    right: 'right',
    back: 'back',
  };
  const selectedView = viewMap[normalizedView] || 'front';
  const percent = useManual ? manualBodyFat : bodyFatPercent;
  const options = gender === 'female'
    ? [15, 20, 25, 30, 35, 40, 45]
    : [5, 10, 15, 20, 25, 30, 35];

  const closest = options.reduce((best, option) => {
    const bestDiff = Math.abs(best - percent);
    const optionDiff = Math.abs(option - percent);
    return optionDiff < bestDiff ? option : best;
  }, options[0]);

  const folderLabel = String(closest).padStart(2, '0');

  return `/assets/${gender}/${folderLabel}/${selectedView}.png`;
}

/* ---------------- data/foods.js ---------------- */
export const FOOD_DB = [
  { name: 'Multigrain Oats', unit: 'g', calPer100: 389, proteinPer100: 13, carbsPer100: 66, fatPer100: 7, fiberPer100: 10 },
  { name: 'Milk', unit: 'ml', calPer100: 61, proteinPer100: 3.2, carbsPer100: 4.8, fatPer100: 3.3, fiberPer100: 0, image: '/assets/food/milk.jpg' },
  { name: 'Egg White', unit: 'piece', calPerPiece: 17, proteinPerPiece: 3.6, carbsPerPiece: 0.2, fatPerPiece: 0.1, fiberPerPiece: 0 },
  { name: 'Boiled Egg (whole)', unit: 'piece', calPerPiece: 78, proteinPerPiece: 6.3, carbsPerPiece: 0.6, fatPerPiece: 5.3, fiberPerPiece: 0 },
  { name: 'Cooked Rice', unit: 'g', calPer100: 130, proteinPer100: 2.7, carbsPer100: 28, fatPer100: 0.3, fiberPer100: 0.4 },
  { name: 'Dal (cooked)', unit: 'g', calPer100: 116, proteinPer100: 9, carbsPer100: 20, fatPer100: 0.4, fiberPer100: 8 },
  { name: 'Mixed Vegetable Curry', unit: 'g', calPer100: 90, proteinPer100: 2, carbsPer100: 10, fatPer100: 5, fiberPer100: 3, image: '/assets/food/vegetable-curry.png' },
  { name: 'Chapati', unit: 'piece', calPerPiece: 70, proteinPerPiece: 2.5, carbsPerPiece: 15, fatPerPiece: 0.5, fiberPerPiece: 2, image: '/assets/food/roti.png' },
  { name: 'Chicken Curry', unit: 'g', calPer100: 165, proteinPer100: 16, carbsPer100: 4, fatPer100: 10, fiberPer100: 0.5 },
  { name: 'Mutton Curry', unit: 'g', calPer100: 250, proteinPer100: 18, carbsPer100: 4, fatPer100: 18, fiberPer100: 0.5, image: '/assets/food/mutton-curry.png' },
  { name: 'Chicken Biryani', unit: 'g', calPer100: 200, proteinPer100: 9, carbsPer100: 24, fatPer100: 7, fiberPer100: 1, image: '/assets/food/biryani.png' },
  { name: 'Paneer', unit: 'g', calPer100: 265, proteinPer100: 18, carbsPer100: 3.5, fatPer100: 20, fiberPer100: 0, image: '/assets/food/cottage-cheese.png' },
  { name: 'Curd / Yogurt', unit: 'g', calPer100: 60, proteinPer100: 3.5, carbsPer100: 4.7, fatPer100: 3.3, fiberPer100: 0, image: '/assets/food/yogurt.png' },
  { name: 'Banana', unit: 'piece', calPerPiece: 105, proteinPerPiece: 1.3, carbsPerPiece: 27, fatPerPiece: 0.4, fiberPerPiece: 3.1 },
  { name: 'Apple', unit: 'piece', calPerPiece: 95, proteinPerPiece: 0.5, carbsPerPiece: 25, fatPerPiece: 0.3, fiberPerPiece: 4.4 },
  { name: 'Brown Bread Slice', unit: 'piece', calPerPiece: 80, proteinPerPiece: 4, carbsPerPiece: 14, fatPerPiece: 1, fiberPerPiece: 2 },
  { name: 'Peanut Butter (tbsp)', unit: 'piece', calPerPiece: 95, proteinPerPiece: 4, carbsPerPiece: 3, fatPerPiece: 8, fiberPerPiece: 1 },
  { name: 'Tea with Milk & Sugar', unit: 'piece', calPerPiece: 40, proteinPerPiece: 1, carbsPerPiece: 6, fatPerPiece: 1.3, fiberPerPiece: 0, image: '/assets/food/tea.jpg' },
  { name: 'Black Coffee', unit: 'piece', calPerPiece: 5, proteinPerPiece: 0.3, carbsPerPiece: 0, fatPerPiece: 0, fiberPerPiece: 0, image: '/assets/food/black-coffee.jpg' },
  { name: 'Idli', unit: 'piece', calPerPiece: 39, proteinPerPiece: 2, carbsPerPiece: 8, fatPerPiece: 0.2, fiberPerPiece: 0.5 },
  { name: 'Plain Dosa', unit: 'piece', calPerPiece: 133, proteinPerPiece: 3, carbsPerPiece: 21, fatPerPiece: 4, fiberPerPiece: 1 },
  { name: 'Sambar', unit: 'g', calPer100: 65, proteinPer100: 3, carbsPer100: 9, fatPer100: 2, fiberPer100: 2.5, image: '/assets/food/sambar.png' },
  { name: 'Poha', unit: 'g', calPer100: 130, proteinPer100: 2.5, carbsPer100: 27, fatPer100: 1.5, fiberPer100: 1 },
  { name: 'Upma', unit: 'g', calPer100: 120, proteinPer100: 3, carbsPer100: 20, fatPer100: 3, fiberPer100: 1.5 },
  { name: 'Samosa', unit: 'piece', calPerPiece: 260, proteinPerPiece: 4, carbsPerPiece: 28, fatPerPiece: 15, fiberPerPiece: 2, image: '/assets/food/samosa.jpg' },
  { name: 'Biscuits (2 pcs)', unit: 'piece', calPerPiece: 90, proteinPerPiece: 1.5, carbsPerPiece: 14, fatPerPiece: 3, fiberPerPiece: 0.5, image: '/assets/food/biscuits.jpg' },
  { name: 'Peanuts (roasted)', unit: 'g', calPer100: 567, proteinPer100: 26, carbsPer100: 16, fatPer100: 49, fiberPer100: 8.5 },
  { name: 'French Fries', unit: 'g', calPer100: 312, proteinPer100: 3.4, carbsPer100: 41, fatPer100: 15, fiberPer100: 3.8, image: '/assets/food/french-fries.jpg' },
  { name: 'Pizza Slice', unit: 'piece', calPerPiece: 285, proteinPerPiece: 12, carbsPerPiece: 36, fatPerPiece: 10, fiberPerPiece: 2.5 },
  { name: 'Ice Cream', unit: 'g', calPer100: 207, proteinPer100: 3.5, carbsPer100: 24, fatPer100: 11, fiberPer100: 0.7, image: '/assets/food/ice-cream.jpg' },
  { name: 'Bread Slice (white)', unit: 'piece', calPerPiece: 75, proteinPerPiece: 2.6, carbsPerPiece: 14, fatPerPiece: 1, fiberPerPiece: 0.8, image: '/assets/food/bread.png' },
  { name: 'Buttermilk', unit: 'ml', calPer100: 40, proteinPer100: 1.5, carbsPer100: 4.8, fatPer100: 1.5, fiberPer100: 0, image: '/assets/food/buttermilk.jpg' },
  { name: 'Cake Slice', unit: 'piece', calPerPiece: 235, proteinPerPiece: 3.5, carbsPerPiece: 35, fatPerPiece: 9, fiberPerPiece: 0.7, image: '/assets/food/cake.jpg' },
  { name: 'Cashews', unit: 'g', calPer100: 553, proteinPer100: 18, carbsPer100: 30, fatPer100: 44, fiberPer100: 3.3, image: '/assets/food/cashews.png' },
  { name: 'Chicken Sandwich', unit: 'piece', calPerPiece: 320, proteinPerPiece: 22, carbsPerPiece: 30, fatPerPiece: 12, fiberPerPiece: 2.5, image: '/assets/food/chicken-sandwich.jpg' },
  { name: 'Chicken Soup', unit: 'g', calPer100: 45, proteinPer100: 4.5, carbsPer100: 3, fatPer100: 1.5, fiberPer100: 0.3, image: '/assets/food/chicken-soup.jpg' },
  { name: 'Chicken Wrap', unit: 'piece', calPerPiece: 350, proteinPerPiece: 24, carbsPerPiece: 32, fatPerPiece: 13, fiberPerPiece: 2.5, image: '/assets/food/chicken-wrap.jpg' },
  { name: 'Chocolate Bar', unit: 'g', calPer100: 546, proteinPer100: 4.9, carbsPer100: 61, fatPer100: 31, fiberPer100: 3.4, image: '/assets/food/chocolate.jpg' },
  { name: 'Chole (Chickpea Curry)', unit: 'g', calPer100: 145, proteinPer100: 7.5, carbsPer100: 20, fatPer100: 4.5, fiberPer100: 6, image: '/assets/food/chole.png' },
  { name: 'Coconut Water', unit: 'ml', calPer100: 19, proteinPer100: 0.7, carbsPer100: 3.7, fatPer100: 0.2, fiberPer100: 1.1, image: '/assets/food/coconut-water.jpg' },
  { name: 'Boiled Corn', unit: 'g', calPer100: 96, proteinPer100: 3.4, carbsPer100: 21, fatPer100: 1.5, fiberPer100: 2.4, image: '/assets/food/corn.jpg' },
  { name: 'Cornflakes with Milk', unit: 'g', calPer100: 150, proteinPer100: 4.5, carbsPer100: 28, fatPer100: 2, fiberPer100: 1, image: '/assets/food/cornflakes.png' },
  { name: 'Dates (dried)', unit: 'piece', calPerPiece: 20, proteinPerPiece: 0.2, carbsPerPiece: 5.3, fatPerPiece: 0, fiberPerPiece: 0.6, image: '/assets/food/dates.jpg' },
  { name: 'Egg Omelette', unit: 'piece', calPerPiece: 155, proteinPerPiece: 11, carbsPerPiece: 1.5, fatPerPiece: 12, fiberPerPiece: 0, image: '/assets/food/egg-omelette.png' },
  { name: 'Fish Curry', unit: 'g', calPer100: 130, proteinPer100: 15, carbsPer100: 4, fatPer100: 6, fiberPer100: 0.5, image: '/assets/food/fish-curry.png' },
  { name: 'Fruit Juice', unit: 'ml', calPer100: 45, proteinPer100: 0.5, carbsPer100: 11, fatPer100: 0.1, fiberPer100: 0.2, image: '/assets/food/fruit-juice.jpg' },
  { name: 'Grapes', unit: 'g', calPer100: 69, proteinPer100: 0.7, carbsPer100: 18, fatPer100: 0.2, fiberPer100: 0.9, image: '/assets/food/grapes.png' },
  { name: 'Green Tea', unit: 'piece', calPerPiece: 2, proteinPerPiece: 0, carbsPerPiece: 0, fatPerPiece: 0, fiberPerPiece: 0, image: '/assets/food/green-tea.jpg' },
  { name: 'Grilled Chicken Breast', unit: 'g', calPer100: 165, proteinPer100: 31, carbsPer100: 0, fatPer100: 3.6, fiberPer100: 0, image: '/assets/food/grilled-chicken.png' },
  { name: 'Grilled Fish', unit: 'g', calPer100: 140, proteinPer100: 24, carbsPer100: 0, fatPer100: 4.5, fiberPer100: 0, image: '/assets/food/grilled-fish.png' },
  { name: 'Guava', unit: 'piece', calPerPiece: 68, proteinPerPiece: 2.6, carbsPerPiece: 14, fatPerPiece: 1, fiberPerPiece: 5.4, image: '/assets/food/guava.png' },
  { name: 'Honey (tbsp)', unit: 'piece', calPerPiece: 64, proteinPerPiece: 0.1, carbsPerPiece: 17, fatPerPiece: 0, fiberPerPiece: 0, image: '/assets/food/honey.jpg' },
  { name: 'Hummus', unit: 'g', calPer100: 166, proteinPer100: 8, carbsPer100: 14, fatPer100: 10, fiberPer100: 6, image: '/assets/food/hummus.png' },
  { name: 'Kiwi', unit: 'piece', calPerPiece: 42, proteinPerPiece: 0.8, carbsPerPiece: 10, fatPerPiece: 0.4, fiberPerPiece: 2.1, image: '/assets/food/kiwi.png' },
  { name: 'Mango', unit: 'piece', calPerPiece: 150, proteinPerPiece: 1.4, carbsPerPiece: 38, fatPerPiece: 0.9, fiberPerPiece: 3.7, image: '/assets/food/mango.png' },
  { name: 'Mixed Nuts', unit: 'g', calPer100: 607, proteinPer100: 20, carbsPer100: 21, fatPer100: 54, fiberPer100: 7, image: '/assets/food/mixed-nuts.png' },
  { name: 'Momos (steamed)', unit: 'piece', calPerPiece: 45, proteinPerPiece: 2, carbsPerPiece: 6, fatPerPiece: 1.3, fiberPerPiece: 0.4, image: '/assets/food/momos.jpg' },
  { name: 'Muesli', unit: 'g', calPer100: 360, proteinPer100: 10, carbsPer100: 66, fatPer100: 6, fiberPer100: 8, image: '/assets/food/muesli.png' },
  { name: 'Mushroom Soup', unit: 'g', calPer100: 55, proteinPer100: 1.8, carbsPer100: 5, fatPer100: 3, fiberPer100: 0.8, image: '/assets/food/mushroom-soup.jpg' },
  { name: 'Noodles (Hakka)', unit: 'g', calPer100: 190, proteinPer100: 5, carbsPer100: 32, fatPer100: 5, fiberPer100: 1.5, image: '/assets/food/noodles.jpg' },
  { name: 'Orange', unit: 'piece', calPerPiece: 62, proteinPerPiece: 1.2, carbsPerPiece: 15, fatPerPiece: 0.2, fiberPerPiece: 3.1, image: '/assets/food/orange.png' },
  { name: 'Pakora', unit: 'piece', calPerPiece: 90, proteinPerPiece: 2.5, carbsPerPiece: 8, fatPerPiece: 5.5, fiberPerPiece: 1.2, image: '/assets/food/pakora.jpg' },
  { name: 'Pancakes', unit: 'piece', calPerPiece: 90, proteinPerPiece: 2.5, carbsPerPiece: 11, fatPerPiece: 3.5, fiberPerPiece: 0.5, image: '/assets/food/pancakes.png' },
  { name: 'Papaya', unit: 'g', calPer100: 43, proteinPer100: 0.5, carbsPer100: 11, fatPer100: 0.3, fiberPer100: 1.7, image: '/assets/food/papaya.png' },
  { name: 'Paratha (plain)', unit: 'piece', calPerPiece: 260, proteinPerPiece: 5.5, carbsPerPiece: 32, fatPerPiece: 12, fiberPerPiece: 2.5, image: '/assets/food/paratha.png' },
  { name: 'Pasta (white sauce)', unit: 'g', calPer100: 160, proteinPer100: 5, carbsPer100: 22, fatPer100: 6, fiberPer100: 1.5, image: '/assets/food/pasta.jpg' },
  { name: 'Pav Bhaji', unit: 'g', calPer100: 150, proteinPer100: 3.5, carbsPer100: 18, fatPer100: 7, fiberPer100: 3, image: '/assets/food/pav-bhaji.jpg' },
  { name: 'Pineapple', unit: 'g', calPer100: 50, proteinPer100: 0.5, carbsPer100: 13, fatPer100: 0.1, fiberPer100: 1.4, image: '/assets/food/pineapple.png' },
  { name: 'Pomegranate', unit: 'g', calPer100: 83, proteinPer100: 1.7, carbsPer100: 19, fatPer100: 1.2, fiberPer100: 4, image: '/assets/food/pomegranate.png' },
  { name: 'Protein Bar', unit: 'piece', calPerPiece: 200, proteinPerPiece: 20, carbsPerPiece: 20, fatPerPiece: 7, fiberPerPiece: 3, image: '/assets/food/protein-bar.jpg' },
  { name: 'Rajma (Kidney Bean Curry)', unit: 'g', calPer100: 140, proteinPer100: 8, carbsPer100: 20, fatPer100: 3, fiberPer100: 6.5, image: '/assets/food/rajma.png' },
  { name: 'Roasted Chana', unit: 'g', calPer100: 364, proteinPer100: 20, carbsPer100: 61, fatPer100: 5, fiberPer100: 17, image: '/assets/food/roasted-chana.png' },
  { name: 'Fruit Smoothie', unit: 'ml', calPer100: 70, proteinPer100: 1.5, carbsPer100: 15, fatPer100: 0.8, fiberPer100: 1, image: '/assets/food/smoothie.jpg' },
  { name: 'Sprouts Salad', unit: 'g', calPer100: 100, proteinPer100: 7, carbsPer100: 17, fatPer100: 0.8, fiberPer100: 5, image: '/assets/food/sprouts.png' },
  { name: 'Strawberry', unit: 'g', calPer100: 32, proteinPer100: 0.7, carbsPer100: 7.7, fatPer100: 0.3, fiberPer100: 2, image: '/assets/food/strawberry.png' },
  { name: 'Sweet Corn Soup', unit: 'g', calPer100: 60, proteinPer100: 2, carbsPer100: 10, fatPer100: 1.2, fiberPer100: 1, image: '/assets/food/sweet-corn-soup.jpg' },
  { name: 'Sweet Potato (boiled)', unit: 'g', calPer100: 86, proteinPer100: 1.6, carbsPer100: 20, fatPer100: 0.1, fiberPer100: 3, image: '/assets/food/sweet-potato.jpg' },
  { name: 'Tomato Soup', unit: 'g', calPer100: 35, proteinPer100: 1, carbsPer100: 7, fatPer100: 0.5, fiberPer100: 1, image: '/assets/food/tomato-soup.jpg' },
  { name: 'Medu Vada', unit: 'piece', calPerPiece: 143, proteinPerPiece: 4, carbsPerPiece: 15, fatPerPiece: 8, fiberPerPiece: 1.5, image: '/assets/food/vada.jpg' },
  { name: 'Veg Sandwich', unit: 'piece', calPerPiece: 250, proteinPerPiece: 7, carbsPerPiece: 34, fatPerPiece: 9, fiberPerPiece: 3, image: '/assets/food/veg-sandwich.jpg' },
  { name: 'Vegetable Bowl', unit: 'g', calPer100: 70, proteinPer100: 2.5, carbsPer100: 12, fatPer100: 1.5, fiberPer100: 3.5, image: '/assets/food/vegetable-bowl.png' },
  { name: 'Vegetable Soup', unit: 'g', calPer100: 40, proteinPer100: 1.5, carbsPer100: 7, fatPer100: 0.8, fiberPer100: 1.5, image: '/assets/food/vegetable-soup.jpg' },
  { name: 'Walnuts', unit: 'g', calPer100: 654, proteinPer100: 15, carbsPer100: 14, fatPer100: 65, fiberPer100: 6.7, image: '/assets/food/walnuts.png' },
  { name: 'Watermelon', unit: 'g', calPer100: 30, proteinPer100: 0.6, carbsPer100: 8, fatPer100: 0.2, fiberPer100: 0.4, image: '/assets/food/watermelon.png' },
  { name: 'Veg Wrap', unit: 'piece', calPerPiece: 260, proteinPerPiece: 7, carbsPerPiece: 36, fatPerPiece: 9, fiberPerPiece: 3.5, image: '/assets/food/wrap.jpg' },
  { name: 'Potato Chips', unit: 'g', calPer100: 536, proteinPer100: 7, carbsPer100: 53, fatPer100: 35, fiberPer100: 4.5, image: '/assets/food/chips.jpg' },
  { name: 'Oats & Berry Bowl', unit: 'g', calPer100: 150, proteinPer100: 4.5, carbsPer100: 27, fatPer100: 3, fiberPer100: 4, image: '/assets/food/oats-and-berry-bowl.png' },
];

export const QUICK_CHIPS = [
  { label: 'Oats 150g', food: 'Multigrain Oats', qty: 150 },
  { label: 'Milk 250ml', food: 'Milk', qty: 250 },
  { label: '2 Egg Whites', food: 'Egg White', qty: 2 },
  { label: 'Rice 100g', food: 'Cooked Rice', qty: 100 },
  { label: 'Dal 100g', food: 'Dal (cooked)', qty: 100 },
  { label: 'Veg Curry 100g', food: 'Mixed Vegetable Curry', qty: 100 },
  { label: '2 Chapatis', food: 'Chapati', qty: 2 },
  { label: 'Chicken 250g', food: 'Chicken Curry', qty: 250 },
  { label: 'Biryani 300g', food: 'Chicken Biryani', qty: 300 },
];

export function findFood(name) {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  return FOOD_DB.find((f) => f.name.toLowerCase() === n) ?? null;
}

export function calcCal(food, qty) {
  if (!food || !qty) return 0;
  if (food.unit === 'piece') return Math.round((food.calPerPiece ?? 0) * qty);
  return Math.round((qty / 100) * (food.calPer100 ?? 0));
}

export function calcMacros(food, qty) {
  if (!food || !qty) return { protein: 0, carbs: 0, fat: 0, fiber: 0 };
  const scale = food.unit === 'piece' ? qty : qty / 100;
  const suffix = food.unit === 'piece' ? 'PerPiece' : 'Per100';
  return {
    protein: Number((scale * (food[`protein${suffix}`] ?? 0)).toFixed(1)),
    carbs: Number((scale * (food[`carbs${suffix}`] ?? 0)).toFixed(1)),
    fat: Number((scale * (food[`fat${suffix}`] ?? 0)).toFixed(1)),
    fiber: Number((scale * (food[`fiber${suffix}`] ?? 0)).toFixed(1)),
  };
}
