/* ---------------- components/ActivityCard.jsx ---------------- */

import { Activity, Scale, Flame, Dumbbell, Footprints, RotateCcw } from 'lucide-react';
import { calculateBMR, calculateTDEE, getRemainingDays, calculateDailyCalories, calculateWalkCalories } from '../lib/calculations.js';
import { getLocalDateString } from '../lib/date.js';
import { createEmptyLog } from '../lib/useAppState.js';

export function ActivityCard({ state, update }) {
  const log = state.logs[state.currentDate];

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
    <div className="glass h-full rounded-3xl p-6 flex flex-col" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          <Dumbbell size={14} style={{ color: 'var(--accent)' }} />
          Activity & Gym
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
          className="mb-4 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white transition hover:scale-[1.02] active:scale-95"
          style={{ background: 'var(--primary)', boxShadow: '0 4px 14px var(--primary-glow)' }}
        >
          <Flame size={18} /> Start Gym Journey
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

      <div className="grid grid-cols-2 gap-3 flex-1">
        <div className="rounded-2xl border p-4 flex flex-col" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>
            <Footprints size={14} style={{ color: 'var(--info)' }} /> Walking
          </label>
          <input
            type="number"
            step="0.1"
            value={log?.walk || ''}
            onChange={(e) => setField('walk', e.target.value)}
            placeholder="0"
            className="w-full bg-transparent text-2xl font-bold outline-none"
            style={{ color: 'var(--text)' }}
          />
          <div className="mt-1 flex items-center justify-between text-[11px]" style={{ color: 'var(--text-faint)' }}>
            <span>km</span>
            {walkBurn > 0 && <span style={{ color: 'var(--info)' }}>~{walkBurn} kcal</span>}
          </div>
        </div>

        <div className="rounded-2xl border p-4 flex flex-col" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>
            <Scale size={14} style={{ color: 'var(--accent)' }} /> Weight
          </label>
          <input
            type="number"
            step="0.1"
            value={log?.weight || ''}
            onChange={(e) => setField('weight', e.target.value)}
            placeholder="0"
            className="w-full bg-transparent text-2xl font-bold outline-none"
            style={{ color: 'var(--text)' }}
          />
          <div className="mt-1 text-[11px]" style={{ color: 'var(--text-faint)' }}>kg today</div>
        </div>
      </div>
    </div>
  );
}
