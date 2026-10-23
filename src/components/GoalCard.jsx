/* ---------------- components/GoalCard.jsx ---------------- */

import { TrendingDown, Scale, Target, Pencil } from 'lucide-react';
import { DEFAULT_GOAL_HORIZON_DAYS } from '../lib/calculations.js';
import { getLocalDateString, shiftDateString } from '../lib/date.js';

/** Read-only: weight and goal are edited only in the profile editor
 *  (onEditProfile), so values here can never drift from the profile. */
export function GoalCard({ state, onEditProfile }) {
  const activeWeight = (state.logs[state.currentDate]?.weight !== undefined && state.logs[state.currentDate]?.weight !== null && state.logs[state.currentDate]?.weight !== '') ? state.logs[state.currentDate].weight : (state.weight ?? 70);
  const startW = state.startWeight || activeWeight;
  const goalW = state.goalWeight || activeWeight;
  let latestWeight = activeWeight || 70;
  const sortedDates = Object.keys(state.logs).sort().reverse();
  for (const d of sortedDates) {
    if (state.logs[d].weight > 0) {
      latestWeight = state.logs[d].weight;
      break;
    }
  }

  const diff = startW - latestWeight;
  const totalNeeded = startW - goalW;
  const percent = totalNeeded !== 0 ? Math.max(0, Math.min(100, Math.round((diff / totalNeeded) * 100))) : 100;

  const size = 180;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (percent / 100) * circ;

  // Handle default target date dynamically (90 days from currentDate) if not defined
  const targetDateStr = state.goalTargetDate
    || shiftDateString(state.currentDate || getLocalDateString(), DEFAULT_GOAL_HORIZON_DAYS);

  // Parse dates for remaining day count
  const curDate = new Date(state.currentDate + 'T00:00:00');
  const tarDate = new Date(targetDateStr + 'T00:00:00');
  const timeDiff = tarDate.getTime() - curDate.getTime();
  const days = Math.round(timeDiff / (1000 * 3600 * 24));

  const weightDiff = Math.abs((typeof activeWeight === 'number' ? activeWeight : 70) - goalW);
  const ratePerWeek = days > 0 ? (weightDiff / (days / 7)) : 0;

  let isAchievableColor = '#ef4444'; // Red (Extreme)
  let paceText = 'Extreme Pace';

  if (weightDiff === 0) {
    isAchievableColor = '#5E8F83'; // Muted Teal
    paceText = 'Goal Met';
  } else if (days <= 0) {
    isAchievableColor = '#ef4444';
    paceText = 'Date Passed';
  } else if (ratePerWeek <= 0.8) {
    isAchievableColor = '#5E8F83'; // Muted Teal (Safe/Achievable Pace <= 0.8kg per week)
    paceText = 'Safe Pace';
  } else if (ratePerWeek <= 1.5) {
    isAchievableColor = '#f59e0b'; // Yellow (Challenging Pace <= 1.5kg per week)
    paceText = 'Challenging';
  }

  return (
    <div className="nutrition-panel h-full rounded-[var(--radius-card)] p-[var(--space-card)] flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          <TrendingDown size={14} style={{ color: 'var(--primary)' }} />
          Goal Progress
        </div>
        {onEditProfile ? (
          <button type="button" onClick={onEditProfile} className="flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 text-[12px] font-bold" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
            <Pencil size={13} /> Edit
          </button>
        ) : (
          <Scale size={16} style={{ color: 'var(--text-faint)' }} />
        )}
      </div>

      <div className="my-4 flex flex-col items-center justify-center flex-1">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            {/* The progress arc runs through the accent gradient rather than a
                flat fill, so the ring picks up whatever theme is active. */}
            <defs>
              <linearGradient id="goal-ring-flow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--primary-lift)" />
              </linearGradient>
            </defs>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#goal-ring-flow)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ '--circumference': circ, filter: 'drop-shadow(0 0 8px var(--primary-glow))' }}
              className="animate-ring"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold text-flow">{percent}%</span>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>complete</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center items-end border-t border-[var(--border)] pt-4 mt-auto">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider mb-2" style={{ color: 'var(--text-faint)' }}>Start</div>
          <div className="text-sm font-extrabold pb-1.5" style={{ color: 'var(--text-dim)' }}>
            {state.startWeight ? <>{state.startWeight} <span className="text-[10px] font-normal">kg</span></> : '—'}
          </div>
        </div>
        <div className="rounded-xl py-1 px-1" style={{ background: 'var(--primary-soft)' }}>
          <div className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--primary)' }}>Current</div>
          <div className="flex items-center justify-center gap-0.5">
            <span className="text-base font-extrabold" style={{ color: 'var(--primary)' }}>{activeWeight || '—'}</span>
            <span className="text-[10px] font-bold" style={{ color: 'var(--primary)' }}>kg</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--text-faint)' }}>Target</div>
          <div className="flex items-center justify-center gap-0.5">
            <span className="text-base font-bold" style={{ color: 'var(--text)' }}>{state.goalWeight || '—'}</span>
            <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>kg</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Target Date</span>
          <span className="font-bold text-xs text-[var(--text)]">
            {state.goalTargetDate
              ? new Date(`${state.goalTargetDate}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Not set'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-[var(--border)]">
          <span
            className="h-2 w-2 rounded-full animate-pulse transition-all duration-300"
            style={{
              background: isAchievableColor,
              boxShadow: `0 0 8px ${isAchievableColor}`
            }}
          />
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text)' }}>
            {days > 0 ? `${days}d` : '0d'} ({paceText})
          </span>
        </div>
      </div>
    </div>
  );
}
