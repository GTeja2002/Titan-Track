/* ---------------- components/ProfileDrawer.jsx ---------------- */

import { useState } from 'react';
import { X, Users } from 'lucide-react';
import { calculateBMR, calculateTDEE, getRemainingDays, calculateDailyCalories } from '../lib/calculations.js';
import { getLocalDateString } from '../lib/date.js';
import { UserDirectoryModal } from './UserDirectoryModal.jsx';
import { createEmptyLog } from '../lib/useAppState.js';
import { goalsForAge } from '../lib/goals.js';

/** A labelled on/off row. Used for the display and privacy switches, which
 *  are the controls that decide how much of this app is about your body. */
function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition"
      style={{ background: 'var(--surface)', borderColor: checked ? 'var(--primary)' : 'var(--border)' }}
    >
      <span className="flex flex-col">
        <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{label}</span>
        {hint && <span className="mt-0.5 text-[10px]" style={{ color: 'var(--text-dim)' }}>{hint}</span>}
      </span>
      <span
        className="relative h-5 w-9 shrink-0 rounded-full transition"
        style={{ background: checked ? 'var(--primary)' : 'var(--border-strong)' }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
          style={{ left: checked ? 18 : 2 }}
        />
      </span>
    </button>
  );
}

export function ProfileDrawer({ state, update, isOpen, onClose }) {
  const [isUserDirectoryOpen, setIsUserDirectoryOpen] = useState(false);

  if (!isOpen) return null;

  const handleFieldChange = (field, val) => {
    update((prev) => {
      // Clone logs too: a shallow { ...prev } shares the same logs object, so
      // writing into it mutates previous state in place and leaves state.logs
      // reference-equal — silently staling every useMemo keyed on it.
      const next = { ...prev, logs: { ...prev.logs } };

      // NOTE: this used to call guessDiagnosticStats(next) here on every
      // age/weight/height/gender/lifestyle edit — that whole fake-medical-data
      // system (LDL, blood pressure, biological age, genetic markers, disease
      // percentiles) has been removed. See src/lib/wellness.js for what
      // replaced it.

      if (field === 'weight') {
        // Same date-guard as GoalCard/ActivityCard/BodyCompositionDashboard:
        // this drawer is always editing whatever day is currently selected,
        // so only treat the edit as the new "current" weight when that day
        // is actually today. Editing here while browsing a past date must
        // only update that day's log entry.
        const todayStr = getLocalDateString();
        if (next.currentDate === todayStr) next.weight = val;
        const date = next.currentDate;
        if (!next.logs[date]) {
          next.logs[date] = createEmptyLog();
        }
        next.logs[date] = { ...next.logs[date], weight: val };
      } else {
        next[field] = val;
      }

      // trigger calculations if vital fields change
      if (field === 'age' || field === 'goalWeight' || field === 'height' || field === 'gender' || field === 'activityLevel' || field === 'goal') {
        const bmr = calculateBMR(next.gender, next.age, next.weight, next.height);
        const tdee = calculateTDEE(bmr, next.activityLevel);
        const days = getRemainingDays(next.currentDate, next.goalTargetDate);
        next.calorieTarget = calculateDailyCalories(next.goal, tdee, next.weight, next.goalWeight, days);
      }

      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden text-slate-800" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        {/* Background tint overlay */}
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="pointer-events-auto w-screen max-w-md transform transition ease-in-out duration-300">
            <div className="flex h-full flex-col overflow-y-auto bg-white/95 backdrop-blur-xl shadow-2xl border-l border-slate-200">
              {/* Header */}
              <div className="px-6 py-5 bg-slate-50/80 border-b border-slate-200/60 flex items-center justify-between shrink-0">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  👤 Edit Profile
                </h2>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 drawer-scroll">
                {/* General Settings */}
                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-1">
                    🎯 General Metrics
                  </h4>

                  {/* Name field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" htmlFor="drawer-name">Name</label>
                    <input
                      id="drawer-name"
                      type="text"
                      value={state.name || ''}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      placeholder="e.g. John"
                      className="rounded-xl border bg-slate-50 border-slate-200 px-3 py-2 text-sm outline-none w-full"
                    />
                  </div>

                  {/* Weight rows */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" htmlFor="drawer-weight">Current Weight (kg)</label>
                      <input
                        id="drawer-weight"
                        type="number"
                        step="0.1"
                        value={state.weight === 0 || state.weight === '' || state.weight === null || state.weight === undefined ? '' : state.weight}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFieldChange('weight', val === '' ? '' : (parseFloat(val) || 0));
                        }}
                        className="rounded-xl border bg-slate-50 border-slate-200 px-3 py-2 text-sm outline-none w-full text-slate-800 font-bold"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" htmlFor="drawer-start-weight">Starting Weight (kg)</label>
                      <input
                        id="drawer-start-weight"
                        type="number"
                        step="0.1"
                        value={state.startWeight === 0 || state.startWeight === '' || state.startWeight === null || state.startWeight === undefined ? '' : state.startWeight}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFieldChange('startWeight', val === '' ? '' : (parseFloat(val) || 0));
                        }}
                        className="rounded-xl border bg-slate-50 border-slate-200 px-3 py-2 text-sm outline-none w-full text-slate-800 font-bold"
                      />
                    </div>
                  </div>

                  {/* Goal Weight & Goal Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" htmlFor="drawer-goal-weight">Goal Weight (kg)</label>
                      <input
                        id="drawer-goal-weight"
                        type="number"
                        step="0.5"
                        value={state.goalWeight === 0 || state.goalWeight === '' || state.goalWeight === null || state.goalWeight === undefined ? '' : state.goalWeight}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFieldChange('goalWeight', val === '' ? '' : (parseFloat(val) || 0));
                        }}
                        className="rounded-xl border bg-slate-50 border-slate-200 px-3 py-2 text-sm outline-none w-full text-slate-800 font-bold"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" htmlFor="drawer-height">Height (cm)</label>
                      <input
                        id="drawer-height"
                        type="number"
                        value={state.height || 175}
                        onChange={(e) => handleFieldChange('height', parseInt(e.target.value) || 0)}
                        className="rounded-xl border bg-slate-50 border-slate-200 px-3 py-2 text-sm outline-none w-full"
                      />
                    </div>
                  </div>

                  {/* Goal — the list is age-filtered, so weight-loss goals
                      are simply not offered to under-18s. */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Goal</label>
                    <div className="chip-grid">
                      {goalsForAge(state.age).map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          className={`chip-card ${state.goal === g.id ? 'active' : ''}`}
                          onClick={() => handleFieldChange('goal', g.id)}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* What the app is allowed to show about your body. */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Privacy &amp; display</label>
                    <div className="flex flex-col gap-1.5">
                      <ToggleRow
                        label="Track weight"
                        hint="Show weight, goal weight and the trend chart."
                        checked={Boolean(state.trackWeight)}
                        onChange={(v) => handleFieldChange('trackWeight', v)}
                      />
                      <ToggleRow
                        label="Body composition"
                        hint="Body-fat estimates and the body reference photos."
                        checked={Boolean(state.showBodyComposition)}
                        onChange={(v) => handleFieldChange('showBodyComposition', v)}
                      />
                      <ToggleRow
                        label="Wellbeing check-in"
                        hint="Daily sleep, mood and energy."
                        checked={state.trackWellbeing !== false}
                        onChange={(v) => handleFieldChange('trackWellbeing', v)}
                      />
                      <ToggleRow
                        label="Cycle tracking"
                        hint="Period and cycle phase alongside your logs."
                        checked={Boolean(state.cycle?.enabled)}
                        onChange={(v) => handleFieldChange('cycle', { ...(state.cycle || {}), enabled: v })}
                      />
                    </div>
                  </div>

                  {/* Gender selection */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender</label>
                    <div className="segmented-group">
                      <button
                        type="button"
                        className={`segment-card py-2 ${state.gender === 'male' ? 'active' : ''}`}
                        onClick={() => handleFieldChange('gender', 'male')}
                      >
                        Male
                      </button>
                      <button
                        type="button"
                        className={`segment-card py-2 ${state.gender === 'female' ? 'active' : ''}`}
                        onClick={() => handleFieldChange('gender', 'female')}
                      >
                        Female
                      </button>
                    </div>
                  </div>

                  {/* Activity Level — set once during onboarding and easy to miss;
                      editable here so a wrong/accidental pick isn't permanent. */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activity Level</label>
                    <div className="segmented-group flex-wrap">
                      {['Sedentary', 'Light', 'Moderate', 'Active', 'Athlete'].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          className={`segment-card py-2 ${state.activityLevel === lvl ? 'active' : ''}`}
                          onClick={() => handleFieldChange('activityLevel', lvl)}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">
                      Used for your calorie target — Sedentary (little/no exercise) through Athlete (very intense daily training).
                    </p>
                  </div>

                  {/* Age */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" htmlFor="drawer-age">Age</label>
                    <input
                      id="drawer-age"
                      type="number"
                      value={state.age || 42}
                      onChange={(e) => handleFieldChange('age', parseInt(e.target.value) || 0)}
                      className="rounded-xl border bg-slate-50 border-slate-200 px-3 py-2 text-sm outline-none w-full"
                    />
                  </div>

                  {/* User Directory & Login Audit Logs Button */}
                  <div className="pt-2 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setIsUserDirectoryOpen(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-200"
                    >
                      <Users size={16} className="text-blue-600" />
                      View Registered User Directory & Logs
                    </button>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/60 flex justify-end gap-3 shrink-0">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition shadow-md active:scale-95 w-full"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UserDirectoryModal
        isOpen={isUserDirectoryOpen}
        onClose={() => setIsUserDirectoryOpen(false)}
      />
    </div>
  );
}
