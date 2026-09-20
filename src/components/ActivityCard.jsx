/* ---------------- components/ActivityCard.jsx ---------------- */

import { useRef } from 'react';
import { Scale, Dumbbell, Footprints, RotateCcw, Zap, ArrowRight, PersonStanding, Target } from 'lucide-react';
import { calculateBMR, calculateTDEE, getRemainingDays, calculateDailyCalories, calculateWalkCalories } from '../lib/calculations.js';
import { getLocalDateString } from '../lib/date.js';
import { createEmptyLog } from '../lib/useAppState.js';

export function ActivityCard({ state, update }) {
  const log = state.logs[state.currentDate];
  const walkInputRef = useRef(null);

  const setField = (field, value) => {
    const val = value === '' ? '' : (parseFloat(value) || 0);
    update((prev) => {
      const date = prev.currentDate;
      const currentLog = prev.logs[date] || createEmptyLog();
      const updatedLog = { ...currentLog, [field]: val };
      const next = { ...prev, logs: { ...prev.logs, [date]: updatedLog } };

      if (field === 'weight' && typeof val === 'number' && val > 0) {
        const todayStr = getLocalDateString();
        if (date === todayStr) {
          next.weight = val;
          const bmr = calculateBMR(next.gender, next.age, next.weight, next.height);
          const tdee = calculateTDEE(bmr, next.activityLevel);
          const days = getRemainingDays(next.currentDate, next.goalTargetDate);
          next.calorieTarget = calculateDailyCalories(next.goal, tdee, next.weight, next.goalWeight, days);
        }
      }
      return next;
    });
  };

  const walkBurn = calculateWalkCalories(log?.walk || 0, state.weight ?? 70);

  return (
    <div className="panel-card h-full rounded-[20px] p-5 flex flex-col text-left">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          <Zap size={15} style={{ color: 'var(--primary)' }} />
          Activity &amp; Gym
        </div>
        {state.gymStarted && (
          <button
            onClick={() => update((prev) => ({ ...prev, gymStarted: false }))}
            className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition hover:scale-105"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          >
            <RotateCcw size={10} /> Reset
          </button>
        )}
      </div>

      {!state.gymStarted ? (
        <button
          onClick={() => update((prev) => ({ ...prev, gymStarted: true }))}
          className="mb-4 flex items-center justify-center gap-2.5 rounded-[14px] py-4 text-[15px] font-bold text-white transition hover:brightness-105 active:scale-[0.99]"
          style={{ background: 'linear-gradient(90deg, #0F6B55 0%, #2AA37F 100%)' }}
        >
          <Dumbbell size={18} /> Start Gym Journey <ArrowRight size={16} />
        </button>
      ) : (
        <div className="mb-4 rounded-2xl border p-4" style={{ background: 'var(--primary-soft)', borderColor: 'var(--primary)' }}>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--primary)' }}>
            <Dumbbell size={13} /> Gym Burn (kcal)
          </label>
          <input
            type="number"
            value={log?.gym || ''}
            onChange={(e) => setField('gym', e.target.value)}
            placeholder="0"
            className="w-full rounded-xl border bg-transparent px-3 py-2.5 text-lg font-bold outline-none"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-3.5 flex-1">
        <div className="rounded-[16px] border p-4 flex flex-col" style={{ background: 'var(--surface-solid)', borderColor: 'var(--border)' }}>
          <div className="mb-3 flex items-center gap-2">
            <PersonStanding size={17} style={{ color: 'var(--primary)' }} />
            <span className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>Today&apos;s Activity</span>
          </div>

          <label className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--text-dim)' }}>
            <Footprints size={15} style={{ color: 'var(--m-water)' }} /> Walking
          </label>
          <input
            type="number"
            step="0.1"
            value={log?.walk || ''}
            onChange={(e) => setField('walk', e.target.value)}
            placeholder="0"
            ref={walkInputRef}
            aria-label="Walking distance in kilometres"
            className="w-full bg-transparent text-[28px] font-bold outline-none"
            style={{ color: 'var(--text)' }}
          />
          <div className="mt-0.5 flex items-center justify-between text-[12px]" style={{ color: 'var(--text-dim)' }}>
            <span>km</span>
            {walkBurn > 0 && <span style={{ color: 'var(--m-water-ink)' }}>~{walkBurn} kcal</span>}
          </div>

          <button
            type="button"
            onClick={() => walkInputRef.current?.focus()}
            className="mt-auto flex items-center justify-center gap-1.5 rounded-[12px] py-2.5 text-[13px] font-bold transition hover:brightness-[0.97] active:scale-[0.99]"
            style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
          >
            Log Activity <ArrowRight size={14} />
          </button>
        </div>

        <div className="rounded-[16px] border p-4 flex gap-4" style={{ background: 'var(--surface-solid)', borderColor: 'var(--border)' }}>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <Scale size={17} style={{ color: 'var(--primary)' }} />
              <span className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>Today&apos;s Stats</span>
            </div>

            <label className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--text-dim)' }}>
              <Scale size={15} style={{ color: 'var(--m-steps)' }} /> Weight
            </label>
            <input
              type="number"
              step="0.1"
              value={log?.weight || ''}
              onChange={(e) => setField('weight', e.target.value)}
              placeholder="0"
              aria-label="Weight in kilograms"
              className="w-full bg-transparent text-[28px] font-bold outline-none"
              style={{ color: 'var(--text)' }}
            />
            <div className="mt-0.5 text-[12px]" style={{ color: 'var(--text-dim)' }}>kg today</div>
          </div>

          <div
            className="relative hidden sm:flex w-[46%] shrink-0 flex-col justify-center overflow-hidden rounded-[14px] p-3.5"
            style={{ background: 'var(--primary-soft)' }}
          >
            <Target size={18} style={{ color: 'var(--primary)' }} className="mb-2" />
            <p className="text-[12.5px] font-semibold leading-snug" style={{ color: 'var(--text)' }}>
              Small steps every day lead to big results!
            </p>
            <img
              src="/assets/decor/leaf.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-3 -right-4 w-[64%] object-contain opacity-70"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
