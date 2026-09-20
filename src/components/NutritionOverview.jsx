/* ---------------- components/NutritionOverview.jsx ----------------
 * Today's four headline numbers, on the Nutrition tab.
 *
 * Same values as the dashboard's metric row, laid out as compact tiles rather
 * than full cards, and reading from the same --m-* token family so a metric is
 * the same colour wherever it appears.
 */
import { Flame, Zap, Droplet, Footprints, ArrowRight } from 'lucide-react';
import { normalizeWaterMl, calculateProteinTarget, calculateBMR, calculateTDEE, getRemainingDays, calculateDailyCalories } from '../lib/calculations.js';

function Tile({ metric, icon: Icon, label, value, target, unit = '' }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div
      className="rounded-[14px] p-3.5"
      style={{
        background: `var(--m-${metric}-soft)`,
        border: `1px solid var(--m-${metric}-edge)`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full shrink-0"
          style={{ background: 'var(--surface-solid)' }}
        >
          <Icon size={14} style={{ color: `var(--m-${metric}-ink)` }} strokeWidth={2.4} />
        </span>
        <span className="text-[12.5px] font-bold" style={{ color: 'var(--text)' }}>{label}</span>
      </div>

      <p className="mt-2 text-[15px] font-black tracking-tight" style={{ color: 'var(--text)' }}>
        {value.toLocaleString()} <span className="font-semibold" style={{ color: 'var(--text-dim)' }}>/ {target.toLocaleString()}{unit}</span>
      </p>

      <div className="mt-2 h-1.5 w-full rounded-full overflow-hidden" style={{ background: `var(--m-${metric}-track)` }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `var(--grad-${metric === 'protein' ? 'metric-protein' : metric})` }}
        />
      </div>

      <p className="mt-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-dim)' }}>{pct}%</p>
    </div>
  );
}

export function NutritionOverview({ state, onViewDetails }) {
  const log = state.logs?.[state.currentDate] || {};
  const foods = log.foods || [];
  const activeWeight = log.weight > 0 ? log.weight : (state.weight ?? 70);

  const totalCal = foods.reduce((sum, f) => sum + (f.cal || 0), 0);

  const bmr = calculateBMR(state.gender, state.age, activeWeight, state.height);
  const tdee = calculateTDEE(bmr, state.activityLevel);
  const days = getRemainingDays(state.currentDate, state.goalTargetDate);
  const calorieTarget = calculateDailyCalories(state.goal, tdee, activeWeight, state.goalWeight, days);

  const totalProtein = Number(foods.reduce((sum, f) => sum + (f.protein || 0), 0).toFixed(1));
  const proteinTarget = calculateProteinTarget(activeWeight, state.goal, state.activityLevel);

  const waterMl = normalizeWaterMl(log.water);
  const waterTarget = Math.max(500, Math.round(activeWeight * 35));

  const steps = log.steps || 0;
  const stepsTarget = 10000;

  return (
    <div className="panel-card rounded-[16px] p-4 text-left">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
            style={{ background: 'var(--primary-soft)' }}
          >
            <Zap size={16} style={{ color: 'var(--primary)' }} strokeWidth={2.3} />
          </span>
          <div>
            <h3 className="text-[13px] font-black uppercase tracking-[0.06em]" style={{ color: 'var(--text)' }}>
              Nutrition Overview
            </h3>
            <p className="text-[11.5px] font-medium mt-0.5" style={{ color: 'var(--text-dim)' }}>
              Your macronutrient intake for today
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewDetails}
          className="flex items-center gap-1.5 text-[12px] font-bold transition hover:opacity-80 shrink-0"
          style={{ color: 'var(--primary)' }}
        >
          View Details
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile metric="calories" icon={Flame} label="Calories" value={totalCal} target={calorieTarget} />
        <Tile metric="protein" icon={Zap} label="Protein" value={totalProtein} target={proteinTarget} unit="g" />
        <Tile metric="water" icon={Droplet} label="Water" value={waterMl} target={waterTarget} unit="ml" />
        <Tile metric="steps" icon={Footprints} label="Steps" value={steps} target={stepsTarget} />
      </div>
    </div>
  );
}
