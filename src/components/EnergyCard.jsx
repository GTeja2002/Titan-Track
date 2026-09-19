/* ---------------- components/EnergyCard.jsx ---------------- */

import { Zap, ArrowDownCircle, ArrowUpCircle, Target, Flame } from 'lucide-react';
import { calculateBMR, calculateTDEE, getRemainingDays, calculateDailyCalories, calculateWalkCalories } from '../lib/calculations.js';

export function StatRow({ icon, label, value, unit, color }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--surface)', color }}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{label}</div>
      </div>
      <div className="text-right">
        <span className="text-lg font-bold" style={{ color }}>{value}</span>
        <span className="ml-1 text-xs" style={{ color: 'var(--text-dim)' }}>{unit}</span>
      </div>
    </div>
  );
}

/** Compact macro progress bar against a general (non-personalized) guideline target. */

export function EnergyCard({ state }) {
  const activeWeight = (state.logs[state.currentDate]?.weight > 0) ? state.logs[state.currentDate].weight : (state.weight ?? 70);
  const bmr = calculateBMR(state.gender, state.age, activeWeight, state.height);
  const tdee = calculateTDEE(bmr, state.activityLevel);
  const days = getRemainingDays(state.currentDate, state.goalTargetDate);
  const calorieTarget = calculateDailyCalories(state.goal, tdee, activeWeight, state.goalWeight, days);

  const log = state.logs[state.currentDate];
  const intake = log ? log.foods.reduce((s, f) => s + (f.cal || 0), 0) : 0;
  const walkBurn = calculateWalkCalories(log?.walk || 0, activeWeight);
  const totalBurned = walkBurn + (log?.gym || 0);
  const remaining = calorieTarget - (intake - totalBurned);
  const pct = Math.max(0, Math.min(100, Math.round((intake / calorieTarget) * 100)));
  const over = remaining < 0;

  const size = 140;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(100, pct) / 100) * circ;

  return (
    <div className="glass h-full rounded-3xl p-6 flex flex-col" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          <Zap size={14} style={{ color: 'var(--accent)' }} />
          Energy Balance
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{ background: over ? 'var(--danger-soft)' : 'var(--primary-soft)', color: over ? 'var(--danger)' : 'var(--primary)' }}
        >
          {over ? 'Over budget' : 'On track'}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-6 flex-1">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={over ? 'var(--danger)' : 'var(--primary)'}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ '--circumference': circ, filter: `drop-shadow(0 0 6px ${over ? 'var(--danger-soft)' : 'var(--primary-glow)'})` }}
              className="animate-ring"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Flame size={18} style={{ color: over ? 'var(--danger)' : 'var(--accent)' }} />
            <span className="text-2xl font-extrabold">{Math.abs(remaining)}</span>
            <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{over ? 'over' : 'left'}</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <StatRow icon={<ArrowDownCircle size={16} />} label="Intake" value={intake} unit="kcal" color="var(--primary)" />
          <div className="h-px" style={{ background: 'var(--border)' }} />
          <StatRow icon={<ArrowUpCircle size={16} />} label="Burned" value={totalBurned} unit="kcal" color="var(--danger)" />
          <div className="h-px" style={{ background: 'var(--border)' }} />
          <StatRow icon={<Target size={16} />} label="Target (est.)" value={calorieTarget} unit="kcal" color="var(--text-dim)" />
        </div>
      </div>
    </div>
  );
}
