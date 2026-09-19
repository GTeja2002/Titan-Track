/* ---------------- components/HealthWellnessInsights.jsx ----------------
 * Replaces the old "ClyHealthDashboard" (biological age / methylation /
 * disease percentiles / genetic markers). Nothing in this file estimates,
 * predicts, or displays a medical diagnosis, disease probability, or
 * genetic risk. Every number here is either directly logged by the user
 * (activity, food, blood pressure) or a clearly-labeled lifestyle estimate
 * — see src/lib/wellness.js for the calculations themselves.
 */

import { useState } from 'react';
import {
  Activity, Moon, HeartPulse, Brain, Sparkles, Utensils, HeartHandshake,
  Footprints, Plus, ShieldAlert, PersonStanding,
} from 'lucide-react';
import { getLocalDateString } from '../lib/date.js';
import { calculateBMI, calculateBodyFat, getNearestBodyImage } from '../lib/calculations.js';
import {
  getFitnessAgeEstimate, getRecoveryScore, getWeeklyActivitySummary,
  getNutritionConsistency, getTodayMacroProgress, appendBpReading,
} from '../lib/wellness.js';

function WellnessCard({ icon, title, children }) {
  return (
    <div className="glass h-full rounded-3xl p-6 flex flex-col" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
      <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
        <span style={{ color: 'var(--primary)' }}>{icon}</span>
        {title}
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}

function ProgressBar({ value, max, color = 'var(--primary)' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full rounded-full" style={{ background: 'var(--surface)' }}>
      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function HealthWellnessInsights({ state, update }) {
  const [systolicInput, setSystolicInput] = useState('');
  const [diastolicInput, setDiastolicInput] = useState('');

  const weight = (state.logs[state.currentDate]?.weight > 0) ? state.logs[state.currentDate].weight : (state.weight ?? 70);

  const fitnessAge = getFitnessAgeEstimate({ age: state.age, activityLevel: state.activityLevel, weight, height: state.height });
  const recoveryScore = getRecoveryScore({ logs: state.logs, currentDate: state.currentDate, activityLevel: state.activityLevel });
  const weekly = getWeeklyActivitySummary({ logs: state.logs, currentDate: state.currentDate });
  const nutritionConsistency = getNutritionConsistency({ logs: state.logs, currentDate: state.currentDate });
  const macros = getTodayMacroProgress({ logs: state.logs, currentDate: state.currentDate, weight, gender: state.gender });

  const bfRatio = calculateBodyFat(weight, state.height, state.overrideBodyFat, state.manualBodyFat, state.age, state.gender);
  const bodyFatPercent = Math.round(bfRatio * 100);
  const bmi = calculateBMI(weight, state.height);
  const bodySnapshotImg = getNearestBodyImage(state.gender, bfRatio * 100, state.overrideBodyFat, state.manualBodyFat, state.currentView);

  const bpHistory = state.bpHistory ?? [];

  const handleAddBpReading = (e) => {
    e.preventDefault();
    const systolic = parseInt(systolicInput, 10);
    const diastolic = parseInt(diastolicInput, 10);
    if (!Number.isFinite(systolic) || !Number.isFinite(diastolic) || systolic <= 0 || diastolic <= 0) return;
    update((prev) => ({ ...prev, bpHistory: appendBpReading(prev.bpHistory, systolic, diastolic) }));
    setSystolicInput('');
    setDiastolicInput('');
  };

  const activityMessage = weekly.activeDays >= 5
    ? "Great — you're staying consistently active this week."
    : weekly.activeDays >= 3
      ? "Good progress — a couple more active days would round out the week."
      : "Try to fit in a bit more movement this week.";

  const nutritionMessage = nutritionConsistency.loggedDays >= 5
    ? 'Your nutrition tracking has been consistent this week.'
    : nutritionConsistency.loggedDays >= 3
      ? 'Your tracking is fairly consistent — keep it up.'
      : 'Logging your meals more consistently will give you a clearer picture.';

  return (
    <div className="space-y-6 animate-fade-in pb-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text)' }}>Health & Wellness Insights</h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
          General lifestyle estimates based on your activity, nutrition, and profile — not medical measurements.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
        {/* Body Snapshot — the real photo from Body Composition, shown here for
            context. No risk badges, no percentages: purely visual. */}
        <div className="lg:col-span-4 glass rounded-3xl p-6 flex flex-col items-center justify-center" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest self-start" style={{ color: 'var(--text-dim)' }}>
            <PersonStanding size={14} style={{ color: 'var(--primary)' }} />
            Body Snapshot
          </div>
          <div className="relative">
            <img
              src={bodySnapshotImg}
              alt="Body composition reference"
              className="max-h-72 w-auto object-contain"
              style={{ filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.3))' }}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `/assets/placeholders/${state.gender}.png`; }}
            />
            <span
              className="pulse-glow-primary absolute top-6 -right-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-lg"
              style={{ background: 'var(--primary)', color: '#fff' }}
            >
              {bodyFatPercent}% <span className="font-medium opacity-80">fat</span>
            </span>
            <span
              className="pulse-glow-primary absolute bottom-10 -left-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-lg"
              style={{ background: 'var(--surface-solid)', color: 'var(--text)', border: '1px solid var(--primary)', animationDelay: '0.4s' }}
            >
              {bmi > 0 ? bmi.toFixed(1) : '—'} <span className="font-medium" style={{ color: 'var(--text-dim)' }}>BMI</span>
            </span>
          </div>
          <p className="text-[10px] leading-relaxed text-center mt-3" style={{ color: 'var(--text-faint)' }}>
            From your Body Composition profile — see that tab to adjust view or gender.
          </p>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
          {/* 1. Fitness Age Estimate */}
          <WellnessCard icon={<Sparkles size={14} />} title="Fitness Age Estimate">
            <div className="flex-1 flex flex-col justify-center items-center text-center py-2">
              <div className="text-5xl font-extrabold tracking-tight" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                {fitnessAge}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>years</div>
            </div>
            <p className="text-[10px] leading-relaxed text-center mt-2" style={{ color: 'var(--text-faint)' }}>
              Lifestyle-based estimate, not a medical measurement.
            </p>
          </WellnessCard>

          {/* 2. Recovery & Lifestyle */}
          <WellnessCard icon={<Moon size={14} />} title="Recovery & Lifestyle">
            <div className="flex-1 flex flex-col justify-center py-2">
              <div className="flex items-baseline gap-1 justify-center">
                <span className="text-5xl font-extrabold tracking-tight" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{recoveryScore}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>/100</span>
              </div>
              <div className="mt-3">
                <ProgressBar value={recoveryScore} max={100} />
              </div>
            </div>
            <p className="text-[10px] leading-relaxed text-center mt-2" style={{ color: 'var(--text-faint)' }}>
              Reflects activity consistency, not biological aging or genetics.
            </p>
          </WellnessCard>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        {/* 3. Heart-Healthy Activity */}
        <WellnessCard icon={<HeartPulse size={14} />} title="Heart-Healthy Activity">
          <div className="flex-1 flex flex-col justify-center py-2">
            <div className="text-2xl font-extrabold tracking-tight text-center" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
              {weekly.estimatedMinutes} <span className="text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>/ {weekly.weeklyGoalMinutes} min</span>
            </div>
            <div className="mt-3">
              <ProgressBar value={weekly.estimatedMinutes} max={weekly.weeklyGoalMinutes} />
            </div>
          </div>
          <p className="text-[10px] leading-relaxed text-center mt-2" style={{ color: 'var(--text-faint)' }}>
            {activityMessage} (minutes estimated from logged activity)
          </p>
        </WellnessCard>

        {/* 4. Cognitive Wellness */}
        <WellnessCard icon={<Brain size={14} />} title="Cognitive Wellness">
          <div className="flex-1 flex items-center justify-center py-2">
            <p className="text-sm leading-relaxed text-center" style={{ color: 'var(--text-dim)' }}>
              Stay active, maintain regular sleep, and keep your mind engaged.
            </p>
          </div>
          <p className="text-[10px] leading-relaxed text-center mt-2" style={{ color: 'var(--text-faint)' }}>
            General wellness suggestion, not a cognitive assessment.
          </p>
        </WellnessCard>

        {/* 5. Metabolic Wellness */}
        <WellnessCard icon={<HeartHandshake size={14} />} title="Metabolic Wellness">
          <div className="flex-1 flex flex-col justify-center py-2 gap-2">
            <p className="text-sm leading-relaxed text-center" style={{ color: 'var(--text-dim)' }}>
              {nutritionMessage}
            </p>
            <div className="text-center text-xs font-semibold" style={{ color: 'var(--primary)' }}>
              Logged {nutritionConsistency.loggedDays}/{nutritionConsistency.totalDays} days this week
            </div>
          </div>
          <p className="text-[10px] leading-relaxed text-center mt-2" style={{ color: 'var(--text-faint)' }}>
            Based on tracking consistency, not a metabolic or lab test.
          </p>
        </WellnessCard>

        {/* 6. Nutrition Balance */}
        <WellnessCard icon={<Utensils size={14} />} title="Nutrition Balance">
          <div className="flex-1 flex flex-col justify-center gap-4 py-2">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span style={{ color: 'var(--text-dim)' }}>Protein</span>
                <strong style={{ color: 'var(--text)' }}>{macros.protein}g / {macros.proteinTarget}g</strong>
              </div>
              <ProgressBar value={macros.protein} max={macros.proteinTarget} color="var(--info)" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span style={{ color: 'var(--text-dim)' }}>Fiber</span>
                <strong style={{ color: 'var(--text)' }}>{macros.fiber}g / {macros.fiberTarget}g</strong>
              </div>
              <ProgressBar value={macros.fiber} max={macros.fiberTarget} color="var(--primary)" />
            </div>
          </div>
          <p className="text-[10px] leading-relaxed text-center mt-2" style={{ color: 'var(--text-faint)' }}>
            From today's logged food, not a lab estimate.
          </p>
        </WellnessCard>

        {/* 7. Blood Pressure Tracking */}
        <WellnessCard icon={<ShieldAlert size={14} />} title="Blood Pressure Tracking">
          <form onSubmit={handleAddBpReading} className="flex gap-2 mb-3">
            <input
              type="number"
              inputMode="numeric"
              placeholder="Sys"
              value={systolicInput}
              onChange={(e) => setSystolicInput(e.target.value)}
              className="w-full rounded-xl border bg-transparent px-2.5 py-2 text-sm text-center outline-none"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            <input
              type="number"
              inputMode="numeric"
              placeholder="Dia"
              value={diastolicInput}
              onChange={(e) => setDiastolicInput(e.target.value)}
              className="w-full rounded-xl border bg-transparent px-2.5 py-2 text-sm text-center outline-none"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            <button
              type="submit"
              className="shrink-0 flex items-center justify-center rounded-xl px-3 transition hover:scale-105 active:scale-95"
              style={{ background: 'var(--primary)' }}
              aria-label="Add blood pressure reading"
            >
              <Plus size={16} color="#fff" />
            </button>
          </form>
          <div className="flex-1 overflow-y-auto max-h-24 space-y-1.5">
            {bpHistory.length === 0 ? (
              <p className="text-xs italic" style={{ color: 'var(--text-faint)' }}>No readings yet.</p>
            ) : (
              bpHistory.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5" style={{ background: 'var(--surface)' }}>
                  <span style={{ color: 'var(--text-dim)' }}>{r.date}</span>
                  <strong style={{ color: 'var(--text)' }}>{r.systolic}/{r.diastolic}</strong>
                </div>
              ))
            )}
          </div>
          <p className="text-[10px] leading-relaxed text-center mt-2" style={{ color: 'var(--text-faint)' }}>
            User-entered reading — not measured by TitanTrack.
          </p>
        </WellnessCard>

        {/* 8. Cardio Activity Progress */}
        <WellnessCard icon={<Footprints size={14} />} title="Cardio Activity Progress">
          <div className="flex-1 flex flex-col justify-center gap-3 py-1">
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-dim)' }}>Walking distance</span>
              <strong style={{ color: 'var(--text)' }}>{weekly.totalWalkKm} km</strong>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-dim)' }}>Gym sessions</span>
              <strong style={{ color: 'var(--text)' }}>{weekly.gymSessions}</strong>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span style={{ color: 'var(--text-dim)' }}>Active minutes</span>
                <strong style={{ color: 'var(--text)' }}>{weekly.estimatedMinutes} / {weekly.weeklyGoalMinutes}</strong>
              </div>
              <ProgressBar value={weekly.estimatedMinutes} max={weekly.weeklyGoalMinutes} color="var(--accent)" />
            </div>
          </div>
          <p className="text-[10px] leading-relaxed text-center mt-2" style={{ color: 'var(--text-faint)' }}>
            From your logged walking & gym activity this week.
          </p>
        </WellnessCard>
      </div>

      <div className="rounded-2xl border px-4 py-3 text-xs leading-relaxed text-center" style={{ borderColor: 'var(--border)', color: 'var(--text-faint)', background: 'var(--surface)' }}>
        Health & Wellness Insights are general lifestyle estimates based on information you provide. They
        are not medical diagnoses, clinical tests, or a substitute for professional medical advice.
      </div>
    </div>
  );
}
