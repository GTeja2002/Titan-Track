/* ---------------- components/BodyCompositionDashboard.jsx ---------------- */

import { useMemo } from 'react';
import { Activity, Scale, User, TrendingUp, Pencil } from 'lucide-react';
import { calculateBMI, calculateBodyFat, calculateLeanMass, calculateFatMass, calculateBMR, calculateTDEE, getRemainingDays, calculateDailyCalories, calculateIdealWeight, getBMICategory, getHealthSummary, getNearestBodyImage } from '../lib/calculations.js';

export function BodyCompositionDashboard({ state, update, onEditProfile }) {
  const activeWeight = (state.logs[state.currentDate]?.weight !== undefined && state.logs[state.currentDate]?.weight !== null && state.logs[state.currentDate]?.weight !== '') ? state.logs[state.currentDate].weight : (state.weight ?? 70);

  // Only the body-composition display settings are changed here (view angle,
  // known body-fat %). User information is edited in the profile editor.
  const handleFieldChange = (field, value) => {
    update((prev) => ({ ...prev, [field]: value }));
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

  return (
    <div className="grid grid-cols-12 gap-4 lg:gap-5">
      {/* USER INFO PANEL */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 animate-fade-in">
        <div className="panel-card rounded-[22px] p-6 flex flex-col gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <User size={18} style={{ color: 'var(--primary)' }} />
            User Information
          </h2>

          <dl className="flex flex-col">
            {[
              ['Gender', state.gender === 'male' ? 'Male' : state.gender === 'female' ? 'Female' : 'Not set'],
              ['Age', state.age ? `${state.age} years` : 'Not set'],
              ['Height', state.height ? `${state.height} cm` : 'Not set'],
              ['Starting weight', state.startWeight ? `${state.startWeight} kg` : 'Not set'],
              ['Current weight', activeWeight ? `${activeWeight} kg` : 'Not set'],
              ['Goal weight', state.goalWeight ? `${state.goalWeight} kg` : 'Not set'],
              ['Activity level', state.activityLevel || 'Not set'],
            ].map(([label, value], i) => (
              <div key={label} className="flex items-center justify-between gap-3 py-2" style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <dt className="text-[13px]" style={{ color: 'var(--text-dim)' }}>{label}</dt>
                <dd className="text-[13.5px] font-bold" style={{ color: value === 'Not set' ? 'var(--text-faint)' : 'var(--text)' }}>{value}</dd>
              </div>
            ))}
          </dl>
          {onEditProfile && (
            <button
              type="button"
              onClick={onEditProfile}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold"
              style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
            >
              <Pencil size={14} /> Edit profile
            </button>
          )}

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
        <div className="panel-card rounded-[22px] p-6 flex flex-col justify-between flex-1 gap-4">
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
        <div className="panel-card rounded-[22px] p-6 flex flex-col gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
            Statistics
          </h2>

          <div className="stats-grid-composition gap-3">
            <div className="stat-tile rounded-2xl p-3 flex flex-col justify-between" style={{ background: `var(--m-protein-soft)`, border: `1px solid var(--m-protein-edge)` }}>
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">BMI</span>
              <div className="mt-1 flex items-baseline gap-1">
                <strong className="text-lg font-black">{stats.bmi.toFixed(1)}</strong>
                <span className="text-[9px] text-[var(--text-faint)]">kg/m²</span>
              </div>
            </div>

            <div className="stat-tile rounded-2xl p-3 flex flex-col justify-between" style={{ background: `var(--m-calories-soft)`, border: `1px solid var(--m-calories-edge)` }}>
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">{state.overrideBodyFat ? 'Manual' : 'Est.'} Body Fat</span>
              <div className="mt-1 flex items-baseline gap-1">
                <strong className="text-lg font-black">{stats.bfPercent}%</strong>
              </div>
            </div>

            <div className="stat-tile rounded-2xl p-3 flex flex-col justify-between" style={{ background: `var(--m-steps-soft)`, border: `1px solid var(--m-steps-edge)` }}>
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">Lean Mass</span>
              <div className="mt-1 flex items-baseline gap-1">
                <strong className="text-lg font-black">{stats.leanMass.toFixed(1)}</strong>
                <span className="text-[9px] text-[var(--text-faint)]">kg</span>
              </div>
            </div>

            <div className="stat-tile rounded-2xl p-3 flex flex-col justify-between" style={{ background: `var(--m-calories-soft)`, border: `1px solid var(--m-calories-edge)` }}>
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">Fat Mass</span>
              <div className="mt-1 flex items-baseline gap-1">
                <strong className="text-lg font-black">{stats.fatMass.toFixed(1)}</strong>
                <span className="text-[9px] text-[var(--text-faint)]">kg</span>
              </div>
            </div>

            <div className="stat-tile rounded-2xl p-3 flex flex-col justify-between" style={{ background: `var(--m-water-soft)`, border: `1px solid var(--m-water-edge)` }}>
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">Ideal Range</span>
              <div className="mt-1 flex items-baseline gap-0.5">
                <strong className="text-sm font-black">{stats.idealWeight.min}–{stats.idealWeight.max}</strong>
                <span className="text-[9px] text-[var(--text-faint)]">kg</span>
              </div>
            </div>

            <div className="stat-tile rounded-2xl p-3 flex flex-col justify-between" style={{ background: `var(--m-protein-soft)`, border: `1px solid var(--m-protein-edge)` }}>
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">BMI Category</span>
              <div className="mt-1">
                {/* Obese, overweight and underweight were all rendered in the
                    primary green, which read as reassuring regardless of the
                    reading. */}
                <strong
                  className="text-sm font-black truncate block"
                  style={{ color: /obese|over|under/i.test(stats.bmiCategory || '') ? 'var(--danger)' : 'var(--primary)' }}
                >
                  {stats.bmiCategory}
                </strong>
              </div>
            </div>

            <div className="stat-tile rounded-2xl p-3 flex flex-col justify-between col-span-2 md:col-span-1" style={{ background: `var(--m-streak-soft)`, border: `1px solid var(--m-streak-edge)` }}>
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">BMR Baseline</span>
              <div className="mt-1 flex items-baseline gap-1">
                <strong className="text-lg font-black">{stats.bmr.toLocaleString()}</strong>
                <span className="text-[9px] text-[var(--text-faint)]">kcal/d</span>
              </div>
            </div>

            <div className="stat-tile rounded-2xl p-3 flex flex-col justify-between col-span-2 md:col-span-2 lg:col-span-1" style={{ background: `var(--m-steps-soft)`, border: `1px solid var(--m-steps-edge)` }}>
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)] tracking-wider">Daily calories</span>
              <div className="mt-1 flex items-baseline gap-1">
                <strong className="text-lg font-black text-[var(--accent)]">{stats.dailyCalories.toLocaleString()}</strong>
                <span className="text-[9px] text-[var(--text-faint)]">kcal/d</span>
              </div>
            </div>
          </div>

          {/* Health Summary list */}
          <div className="health-summary rounded-2xl p-4 mt-2" style={{ background: 'var(--w-body-tint)', border: '1px solid var(--w-body-disc)' }}>
            <span className="text-[10px] uppercase font-bold tracking-wider block mb-1" style={{ color: 'var(--w-body-ink)' }}>Health Summary</span>
            <strong className="text-base font-extrabold text-[var(--text)] block">{stats.summary.title}</strong>
            <p className="text-xs text-[var(--text-dim)] mt-0.5 mb-2">Based on calculations, we recommend:</p>
            <ul className="text-xs font-semibold space-y-1.5">
              {stats.summary.recommendations.map((item, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: 'var(--w-body-accent)' }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
