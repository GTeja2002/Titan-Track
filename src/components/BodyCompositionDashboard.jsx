/* ---------------- components/BodyCompositionDashboard.jsx ---------------- */

import { useMemo } from 'react';
import { Activity, Scale, User, TrendingUp } from 'lucide-react';
import { calculateBMI, calculateBodyFat, calculateLeanMass, calculateFatMass, calculateBMR, calculateTDEE, getRemainingDays, calculateDailyCalories, calculateIdealWeight, getBMICategory, getHealthSummary, getNearestBodyImage } from '../lib/calculations.js';
import { getLocalDateString } from '../lib/date.js';

export function BodyCompositionDashboard({ state, update }) {
  const activeWeight = (state.logs[state.currentDate]?.weight !== undefined && state.logs[state.currentDate]?.weight !== null && state.logs[state.currentDate]?.weight !== '') ? state.logs[state.currentDate].weight : (state.weight ?? 70);

  const handleFieldChange = (field, value) => {
    update((prev) => {
      const next = { ...prev };

      if (field === 'weight') {
        const todayStr = getLocalDateString();
        if (next.currentDate === todayStr) next.weight = value;
        const date = next.currentDate;
        if (!next.logs[date]) {
          next.logs[date] = { foods: [], walk: 0, gym: 0, weight: 0 };
        }
        next.logs[date] = { ...next.logs[date], weight: value };
      } else {
        next[field] = value;
      }

      const w = typeof next.weight === 'number' && next.weight > 0 ? next.weight : 70;
      const gw = typeof next.goalWeight === 'number' && next.goalWeight > 0 ? next.goalWeight : 70;
      const bmr = calculateBMR(next.gender, next.age, w, next.height);
      const tdee = calculateTDEE(bmr, next.activityLevel);
      const days = getRemainingDays(next.currentDate, next.goalTargetDate);
      next.calorieTarget = calculateDailyCalories(next.goal, tdee, w, gw, days);
      return next;
    });
  };

  const stats = useMemo(() => {
    const numericWeight = typeof activeWeight === 'number' && activeWeight > 0 ? activeWeight : 70;
    const bmi = calculateBMI(numericWeight, state.height);
    const bfRatio = calculateBodyFat(numericWeight, state.height, state.overrideBodyFat, state.manualBodyFat, state.age, state.gender);
    const bfPercent = Number((bfRatio * 100).toFixed(1));
    const leanMass = calculateLeanMass(numericWeight, bfRatio);
    const fatMass = calculateFatMass(numericWeight, bfRatio);
    const bmr = calculateBMR(state.gender, state.age, numericWeight, state.height);
    const tdee = calculateTDEE(bmr, state.activityLevel);
    const days = getRemainingDays(state.currentDate, state.goalTargetDate);
    const dailyCalories = calculateDailyCalories(state.goal, tdee, numericWeight, state.goalWeight, days);
    const idealWeight = calculateIdealWeight(state.height);
    const summary = getHealthSummary(bmi, bfRatio, state.activityLevel);
    const bmiCategory = getBMICategory(bmi);
    const imgPath = getNearestBodyImage(state.gender, bfPercent, state.overrideBodyFat, state.manualBodyFat, state.currentView);

    return { bmi, bfPercent, leanMass, fatMass, bmr, tdee, dailyCalories, idealWeight, summary, bmiCategory, imgPath };
  }, [state.gender, state.age, state.height, activeWeight, state.goal, state.activityLevel, state.overrideBodyFat, state.manualBodyFat, state.currentView, state.goalWeight, state.currentDate, state.goalTargetDate]);

  const handleReset = () => {
    update((prev) => {
      const next = {
        ...prev,
        gender: 'male',
        age: 42,
        height: 175,
        weight: 97.5,
        goalWeight: 90,
        startWeight: 96,
        goal: 'lose-fat',
        activityLevel: 'Moderate',
        overrideBodyFat: false,
        manualBodyFat: 18,
        currentView: 'Front',
      };
      const bmr = calculateBMR(next.gender, next.age, next.weight, next.height);
      const tdee = calculateTDEE(bmr, next.activityLevel);
      const days = getRemainingDays(next.currentDate, next.goalTargetDate);
      next.calorieTarget = calculateDailyCalories(next.goal, tdee, next.weight, next.goalWeight, days);
      return next;
    });
  };

  return (
    <div className="grid grid-cols-12 gap-4 lg:gap-5">
      {/* USER INFO PANEL */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 animate-fade-in">
        <div className="glass rounded-3xl p-6 flex flex-col gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <User size={18} style={{ color: 'var(--primary)' }} />
            User Information
          </h2>

          <div className="form-group flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">Gender</label>
            <div className="segmented-group">
              <div
                className={`segment-card ${state.gender === 'male' ? 'active' : ''}`}
                onClick={() => handleFieldChange('gender', 'male')}
              >
                Male
              </div>
              <div
                className={`segment-card ${state.gender === 'female' ? 'active' : ''}`}
                onClick={() => handleFieldChange('gender', 'female')}
              >
                Female
              </div>
            </div>
          </div>

          <div className="form-group flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]" htmlFor="age-input">Age</label>
            <input
              id="age-input"
              type="number"
              min="10"
              max="100"
              value={state.age}
              onChange={(e) => handleFieldChange('age', parseInt(e.target.value) || 0)}
              className="rounded-xl border px-3 py-2.5 text-sm bg-[var(--bg-2)] border-[var(--border)] text-[var(--text)] outline-none"
            />
          </div>

          <div className="form-group flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">Height</label>
              <span className="text-sm font-bold text-[var(--primary)]">{state.height} cm</span>
            </div>
            <div className="input-with-unit">
              <input
                type="range"
                min="100"
                max="250"
                value={state.height}
                onChange={(e) => handleFieldChange('height', parseInt(e.target.value) || 100)}
                className="w-full accent-[var(--primary)]"
              />
            </div>
          </div>

          <div className="form-group flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]" htmlFor="start-weight-input">Starting Weight</label>
            <div className="input-with-unit">
              <input
                id="start-weight-input"
                type="number"
                min="30"
                max="250"
                value={state.startWeight || activeWeight}
                onChange={(e) => handleFieldChange('startWeight', parseFloat(e.target.value) || 0)}
                className="rounded-xl border px-3 py-2.5 text-sm bg-[var(--bg-2)] border-[var(--border)] text-[var(--text)] outline-none w-full"
              />
              <span>kg</span>
            </div>
          </div>

          <div className="form-group flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">Current Weight</label>
              <span className="text-sm font-bold text-[var(--primary)]">{activeWeight} kg</span>
            </div>
            <input
              type="range"
              min="30"
              max="250"
              value={activeWeight}
              onChange={(e) => handleFieldChange('weight', parseFloat(e.target.value) || 30)}
              className="w-full accent-[var(--primary)]"
            />
          </div>

          <div className="form-group flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">Goal Weight</label>
              <span className="text-sm font-bold text-[var(--primary)]">{state.goalWeight} kg</span>
            </div>
            <input
              type="range"
              min="30"
              max="250"
              value={state.goalWeight}
              onChange={(e) => handleFieldChange('goalWeight', parseFloat(e.target.value) || 30)}
              className="w-full accent-[var(--primary)]"
            />
          </div>

          <div className="form-group flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">Fitness Goal</label>
            <div className="chip-grid">
              <div
                className={`chip-card ${state.goal === 'lose-fat' ? 'active' : ''}`}
                onClick={() => handleFieldChange('goal', 'lose-fat')}
              >
                Lose Fat
              </div>
              <div
                className={`chip-card ${state.goal === 'maintain' ? 'active' : ''}`}
                onClick={() => handleFieldChange('goal', 'maintain')}
              >
                Maintain
              </div>
              <div
                className={`chip-card ${state.goal === 'gain-muscle' ? 'active' : ''}`}
                onClick={() => handleFieldChange('goal', 'gain-muscle')}
              >
                Gain Muscle
              </div>
            </div>
          </div>

          <div className="form-group flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]" htmlFor="activity-compose">Activity Level</label>
            <select
              id="activity-compose"
              value={state.activityLevel}
              onChange={(e) => handleFieldChange('activityLevel', e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm bg-[var(--bg-2)] border-[var(--border)] text-[var(--text)] outline-none"
            >
              <option value="Sedentary">Sedentary</option>
              <option value="Light">Light</option>
              <option value="Moderate">Moderate</option>
              <option value="Active">Active</option>
              <option value="Athlete">Athlete</option>
            </select>
          </div>

          <div className="form-group flex flex-col pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={state.overrideBodyFat}
                onChange={(e) => handleFieldChange('overrideBodyFat', e.target.checked)}
                className="rounded accent-[var(--primary)] w-4 h-4 cursor-pointer"
              />
              <span>I know my Body Fat %</span>
            </label>
          </div>

          {state.overrideBodyFat && (
            <div className="form-group flex flex-col">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">Manual Body Fat</label>
                <span className="text-sm font-bold text-[var(--primary)]">{state.manualBodyFat}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                value={state.manualBodyFat}
                onChange={(e) => handleFieldChange('manualBodyFat', parseInt(e.target.value) || 5)}
                className="w-full accent-[var(--primary)]"
              />
            </div>
          )}
        </div>
      </div>

      {/* INDEX IMAGE VISUALIZER */}
      <div className="col-span-12 md:col-span-6 lg:col-span-4 flex flex-col gap-4 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="glass rounded-3xl p-6 flex flex-col justify-between flex-1 gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Scale size={18} style={{ color: 'var(--primary)' }} />
              Current Body
            </h2>
            <span className="badge">
              {state.overrideBodyFat ? 'Manual' : 'Estimated'} BF: {stats.bfPercent}%
            </span>
          </div>

          <div className="viewer-stage relative rounded-2xl flex items-center justify-center p-3 select-none overflow-hidden my-1 flex-1" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(0,0,0,0.18) 100%)', minHeight: 330 }}>
            <img
              src={stats.imgPath}
              alt={`${state.gender} body composition visualizer`}
              className="max-h-[350px] object-contain transition-all duration-300 pointer-events-none"
              onError={(e) => {
                e.target.src = `assets/${state.gender === 'female' ? 'female' : 'male'}/20/front.png`;
              }}
            />
          </div>

          <div className="direction-compass grid grid-cols-4 gap-2">
            {['Front', 'Left', 'Right', 'Back'].map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => handleFieldChange('currentView', view)}
                className={`text-xs py-2 px-1 rounded-xl border text-center transition font-semibold ${state.currentView.toLowerCase() === view.toLowerCase() ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-lg shadow-[var(--primary-glow)] font-bold' : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)]'}`}
              >
                {view}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center mt-2">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl py-2 px-1">
              <div className="text-[9px] uppercase tracking-wider text-[var(--text-faint)]">View</div>
              <strong className="text-[11px] truncate block">{state.currentView}</strong>
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl py-2 px-1">
              <div className="text-[9px] uppercase tracking-wider text-[var(--text-faint)]">{state.overrideBodyFat ? 'Manual' : 'Est.'} Body Fat</div>
              <strong className="text-[11px] truncate block">{stats.bfPercent}%</strong>
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl py-2 px-1">
              <div className="text-[9px] uppercase tracking-wider text-[var(--text-faint)]">Gender</div>
              <strong className="text-[11px] truncate block capitalize">{state.gender}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* STATISTICS PANEL */}
      <div className="col-span-12 md:col-span-6 lg:col-span-4 flex flex-col gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="glass rounded-3xl p-6 flex flex-col gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
            Statistics
          </h2>

          <div className="stats-grid-composition gap-3">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">BMI</span>
              <div className="mt-1 flex items-baseline gap-1">
                <strong className="text-lg font-black">{stats.bmi.toFixed(1)}</strong>
                <span className="text-[9px] text-[var(--text-faint)]">kg/m²</span>
              </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">{state.overrideBodyFat ? 'Manual' : 'Est.'} Body Fat</span>
              <div className="mt-1 flex items-baseline gap-1">
                <strong className="text-lg font-black">{stats.bfPercent}%</strong>
              </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">Lean Mass</span>
              <div className="mt-1 flex items-baseline gap-1">
                <strong className="text-lg font-black">{stats.leanMass.toFixed(1)}</strong>
                <span className="text-[9px] text-[var(--text-faint)]">kg</span>
              </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">Fat Mass</span>
              <div className="mt-1 flex items-baseline gap-1">
                <strong className="text-lg font-black">{stats.fatMass.toFixed(1)}</strong>
                <span className="text-[9px] text-[var(--text-faint)]">kg</span>
              </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">Ideal Range</span>
              <div className="mt-1 flex items-baseline gap-0.5">
                <strong className="text-sm font-black">{stats.idealWeight.min}–{stats.idealWeight.max}</strong>
                <span className="text-[9px] text-[var(--text-faint)]">kg</span>
              </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">BMI Category</span>
              <div className="mt-1">
                <strong className="text-sm font-black text-[var(--primary)] truncate block">{stats.bmiCategory}</strong>
              </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 flex flex-col justify-between col-span-2 md:col-span-1">
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">BMR Baseline</span>
              <div className="mt-1 flex items-baseline gap-1">
                <strong className="text-lg font-black">{stats.bmr.toLocaleString()}</strong>
                <span className="text-[9px] text-[var(--text-faint)]">kcal/d</span>
              </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 flex flex-col justify-between col-span-2 md:col-span-2 lg:col-span-1">
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">Daily calories</span>
              <div className="mt-1 flex items-baseline gap-1">
                <strong className="text-lg font-black text-[var(--accent)]">{stats.dailyCalories.toLocaleString()}</strong>
                <span className="text-[9px] text-[var(--text-faint)]">kcal/d</span>
              </div>
            </div>
          </div>

          {/* Health Summary list */}
          <div className="health-summary bg-[var(--primary-soft)] border border-[var(--primary-glow)] rounded-2xl p-4 mt-2">
            <span className="text-[10px] uppercase font-bold text-[var(--primary)] tracking-wider block mb-1">Health Summary</span>
            <strong className="text-base font-extrabold text-[var(--text)] block">{stats.summary.title}</strong>
            <p className="text-xs text-[var(--text-dim)] mt-0.5 mb-2">Based on calculations, we recommend:</p>
            <ul className="text-xs font-semibold space-y-1.5">
              {stats.summary.recommendations.map((item, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2.5 mt-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl py-3 border border-[var(--border)] text-xs font-bold transition hover:scale-[1.03] active:scale-95 text-[var(--text-dim)] hover:text-white w-full"
              style={{ background: 'var(--surface)' }}
            >
              Reset Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
