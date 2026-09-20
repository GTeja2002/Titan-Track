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
  Moon, HeartPulse, Brain, Sparkles, Utensils, HeartHandshake,
  Footprints, Plus, ShieldAlert, PersonStanding, Leaf, Flame, Salad,
} from 'lucide-react';
import { getLocalDateString } from '../lib/date.js';
import { calculateBMI, calculateBodyFat, getNearestBodyImage } from '../lib/calculations.js';
import {
  getFitnessAgeEstimate, getRecoveryScore, getWeeklyActivitySummary,
  getNutritionConsistency, getTodayMacroProgress, appendBpReading,
} from '../lib/wellness.js';

/** One insight card. `hue` selects a --w-* set: the tint it sits on, the disc
 *  behind its icon, and an ink solved to stay readable on that tint. */
function WellnessCard({ hue, icon, title, children, footnote }) {
  return (
    <div
      className="wellness-card h-full"
      style={{
        background: `var(--w-${hue}-tint)`,
        border: `1px solid var(--w-${hue}-disc)`,
      }}
    >
      <div className="mb-3 flex items-start gap-2.5">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
          style={{ background: `var(--w-${hue}-disc)`, color: `var(--w-${hue}-ink)` }}
        >
          {icon}
        </span>
        <span
          className="text-[11px] font-black uppercase tracking-[0.06em] leading-tight pt-1.5"
          style={{ color: `var(--w-${hue}-ink)` }}
        >
          {title}
        </span>
      </div>

      <div className="flex-1 flex flex-col">{children}</div>

      {footnote && (
        <p className="mt-3 text-[11px] leading-snug" style={{ color: 'var(--text-dim)' }}>
          {footnote}
        </p>
      )}
    </div>
  );
}

function ProgressBar({ value, max, hue = 'body' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: `var(--w-${hue}-disc)` }}>
      <div
        className="h-2 rounded-full transition-all"
        style={{ width: `${pct}%`, background: `var(--w-${hue}-accent)` }}
      />
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
    <div className="space-y-4 animate-fade-in pb-4">
      <div className="flex items-start gap-2.5">
        <Leaf size={20} style={{ color: 'var(--w-body-accent)' }} className="mt-0.5 shrink-0" strokeWidth={2.2} />
        <div>
          <h2 className="text-[17px] font-black tracking-tight leading-tight" style={{ color: 'var(--text)' }}>
            Health &amp; Wellness Insights
          </h2>
          <p className="mt-1 text-[13px] leading-snug" style={{ color: 'var(--text-dim)' }}>
            General lifestyle estimates based on your activity, nutrition, and profile — not medical measurements.
          </p>
        </div>
      </div>

      {/* Row 1: the three headline cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* Body Snapshot — the real photo from Body Composition, shown here for
            context. No risk badges: purely visual. */}
        <WellnessCard
          hue="body"
          icon={<PersonStanding size={18} strokeWidth={2.2} />}
          title={<>Body<br />Snapshot</>}
          footnote="From your Body Composition profile — see that tab to adjust view or gender."
        >
          <div className="relative flex flex-1 items-center justify-center py-1">
            <img
              src={bodySnapshotImg}
              alt=""
              aria-hidden="true"
              className="max-h-[150px] w-auto object-contain"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `/assets/placeholders/${state.gender || 'male'}.png`; }}
            />
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-[12px] font-black shadow-sm"
              style={{ background: 'var(--surface-solid)', color: 'var(--text)' }}
            >
              {bmi > 0 ? bmi.toFixed(1) : '—'} <span className="font-semibold" style={{ color: 'var(--text-dim)' }}>BMI</span>
            </span>
            <span
              className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-[12px] font-black text-white shadow-sm"
              style={{ background: 'var(--w-body-accent)' }}
            >
              {bodyFatPercent}% <span className="font-semibold opacity-85">fat</span>
            </span>
          </div>
        </WellnessCard>

        {/* Fitness Age */}
        <WellnessCard
          hue="fitness"
          icon={<Sparkles size={18} strokeWidth={2.2} />}
          title={<>Fitness Age<br />Estimate</>}
          footnote="Lifestyle-based estimate, not a medical measurement."
        >
          <div className="flex flex-1 flex-col items-center justify-center py-3">
            <span className="text-[42px] font-black leading-none tracking-tight" style={{ color: 'var(--text)' }}>
              {fitnessAge}
            </span>
            <span className="mt-1.5 text-[13px] font-medium" style={{ color: 'var(--text-dim)' }}>years</span>
          </div>
        </WellnessCard>

        {/* Recovery */}
        <WellnessCard
          hue="recovery"
          icon={<Moon size={18} strokeWidth={2.2} />}
          title={<>Recovery &amp;<br />Lifestyle</>}
          footnote="Reflects activity consistency, not biological aging or genetics."
        >
          <div className="flex flex-1 flex-col items-center justify-center py-3">
            <div className="flex items-baseline gap-1">
              <span className="text-[42px] font-black leading-none tracking-tight" style={{ color: 'var(--text)' }}>
                {recoveryScore}
              </span>
              <span className="text-[15px] font-semibold" style={{ color: 'var(--text-dim)' }}>/100</span>
            </div>
            <div className="mt-4 w-full">
              <ProgressBar value={recoveryScore} max={100} hue="recovery" />
            </div>
          </div>
        </WellnessCard>
      </div>

      {/* Row 2: the four supporting cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <WellnessCard
          hue="heart"
          icon={<HeartPulse size={18} strokeWidth={2.2} />}
          title={<>Heart-Healthy<br />Activity</>}
          footnote={activityMessage}
        >
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-2">
            <Footprints size={34} style={{ color: 'var(--w-heart-accent)' }} strokeWidth={1.8} />
            <div className="flex items-baseline gap-1">
              <span className="text-[26px] font-black leading-none" style={{ color: 'var(--text)' }}>
                {weekly.estimatedMinutes}
              </span>
              <span className="text-[14px] font-semibold" style={{ color: 'var(--text-dim)' }}>
                / {weekly.weeklyGoalMinutes} min
              </span>
            </div>
            <div className="w-full">
              <ProgressBar value={weekly.estimatedMinutes} max={weekly.weeklyGoalMinutes} hue="heart" />
            </div>
          </div>
        </WellnessCard>

        <WellnessCard
          hue="cognitive"
          icon={<Brain size={18} strokeWidth={2.2} />}
          title={<>Cognitive<br />Wellness</>}
          footnote="General wellness suggestion, not a cognitive assessment."
        >
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-2 text-center">
            <Brain size={34} style={{ color: 'var(--w-cognitive-accent)' }} strokeWidth={1.8} />
            <p className="text-[13px] leading-snug" style={{ color: 'var(--text-dim)' }}>
              Stay active, maintain regular sleep, and keep your mind engaged.
            </p>
          </div>
        </WellnessCard>

        <WellnessCard
          hue="metabolic"
          icon={<HeartHandshake size={18} strokeWidth={2.2} />}
          title={<>Metabolic<br />Wellness</>}
          footnote="Based on tracking consistency, not a metabolic or lab test."
        >
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-2 text-center">
            <Flame size={34} style={{ color: 'var(--w-metabolic-accent)' }} strokeWidth={1.8} />
            <p className="text-[13px] leading-snug" style={{ color: 'var(--text-dim)' }}>
              {nutritionMessage}
            </p>
            <span
              className="rounded-full px-3 py-1 text-[11.5px] font-bold"
              style={{ background: 'var(--w-cognitive-disc)', color: 'var(--w-cognitive-ink)' }}
            >
              Logged {nutritionConsistency.loggedDays}/{nutritionConsistency.totalDays} days this week
            </span>
          </div>
        </WellnessCard>

        <WellnessCard
          hue="nutrition"
          icon={<Utensils size={18} strokeWidth={2.2} />}
          title={<>Nutrition<br />Balance</>}
          footnote="From today's logged food, not a lab estimate."
        >
          <div className="flex flex-1 flex-col justify-center gap-3 py-2">
            <Salad size={34} style={{ color: 'var(--w-nutrition-accent)' }} strokeWidth={1.8} className="mx-auto" />
            <div>
              <div className="flex justify-between text-[12.5px] mb-1.5">
                <span style={{ color: 'var(--text-dim)' }}>Protein</span>
                <strong style={{ color: 'var(--text)' }}>{macros.protein}g / {macros.proteinTarget}g</strong>
              </div>
              <ProgressBar value={macros.protein} max={macros.proteinTarget} hue="nutrition" />
            </div>
            <div>
              <div className="flex justify-between text-[12.5px] mb-1.5">
                <span style={{ color: 'var(--text-dim)' }}>Fiber</span>
                <strong style={{ color: 'var(--text)' }}>{macros.fiber}g / {macros.fiberTarget}g</strong>
              </div>
              <ProgressBar value={macros.fiber} max={macros.fiberTarget} hue="nutrition" />
            </div>
          </div>
        </WellnessCard>
      </div>

      {/* Row 3: readings the user enters themselves */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <WellnessCard
          hue="recovery"
          icon={<ShieldAlert size={18} strokeWidth={2.2} />}
          title={<>Blood Pressure<br />Tracking</>}
          footnote="User-entered reading — not measured by TitanTrack."
        >
          <form onSubmit={handleAddBpReading} className="flex gap-2 mb-3">
            <input
              type="number"
              inputMode="numeric"
              placeholder="Sys"
              aria-label="Systolic"
              value={systolicInput}
              onChange={(e) => setSystolicInput(e.target.value)}
              className="w-full rounded-xl px-2.5 py-2 text-sm text-center outline-none"
              style={{ background: 'var(--surface-solid)', border: '1px solid var(--w-recovery-disc)', color: 'var(--text)' }}
            />
            <input
              type="number"
              inputMode="numeric"
              placeholder="Dia"
              aria-label="Diastolic"
              value={diastolicInput}
              onChange={(e) => setDiastolicInput(e.target.value)}
              className="w-full rounded-xl px-2.5 py-2 text-sm text-center outline-none"
              style={{ background: 'var(--surface-solid)', border: '1px solid var(--w-recovery-disc)', color: 'var(--text)' }}
            />
            <button
              type="submit"
              className="shrink-0 flex items-center justify-center rounded-xl px-3 transition hover:scale-105 active:scale-95"
              style={{ background: 'var(--w-recovery-accent)' }}
              aria-label="Add blood pressure reading"
            >
              <Plus size={16} color="#fff" />
            </button>
          </form>
          <div className="flex-1 overflow-y-auto max-h-24 space-y-1.5">
            {bpHistory.length === 0 ? (
              <p className="text-xs italic" style={{ color: 'var(--text-dim)' }}>No readings yet.</p>
            ) : (
              bpHistory.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5" style={{ background: 'var(--surface-solid)' }}>
                  <span style={{ color: 'var(--text-dim)' }}>{r.date}</span>
                  <strong style={{ color: 'var(--text)' }}>{r.systolic}/{r.diastolic}</strong>
                </div>
              ))
            )}
          </div>
        </WellnessCard>

        <WellnessCard
          hue="body"
          icon={<Footprints size={18} strokeWidth={2.2} />}
          title={<>Cardio Activity<br />Progress</>}
          footnote="From your logged walking & gym activity this week."
        >
          <div className="flex flex-1 flex-col justify-center gap-3 py-1">
            <div className="flex justify-between text-[12.5px]">
              <span style={{ color: 'var(--text-dim)' }}>Walking distance</span>
              <strong style={{ color: 'var(--text)' }}>{weekly.totalWalkKm} km</strong>
            </div>
            <div className="flex justify-between text-[12.5px]">
              <span style={{ color: 'var(--text-dim)' }}>Gym sessions</span>
              <strong style={{ color: 'var(--text)' }}>{weekly.gymSessions}</strong>
            </div>
            <div>
              <div className="flex justify-between text-[12.5px] mb-1.5">
                <span style={{ color: 'var(--text-dim)' }}>Active minutes</span>
                <strong style={{ color: 'var(--text)' }}>{weekly.estimatedMinutes} / {weekly.weeklyGoalMinutes}</strong>
              </div>
              <ProgressBar value={weekly.estimatedMinutes} max={weekly.weeklyGoalMinutes} hue="body" />
            </div>
          </div>
        </WellnessCard>
      </div>


      <div className="rounded-2xl border px-4 py-3 text-xs leading-relaxed text-center" style={{ borderColor: 'var(--border)', color: 'var(--text-faint)', background: 'var(--surface)' }}>
        Health & Wellness Insights are general lifestyle estimates based on information you provide. They
        are not medical diagnoses, clinical tests, or a substitute for professional medical advice.
      </div>
    </div>
  );
}
