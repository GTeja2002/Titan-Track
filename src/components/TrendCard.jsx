/* ---------------- components/TrendCard.jsx ---------------- */

import { useState, useMemo } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { calculateBMR, calculateTDEE, getRemainingDays, calculateDailyCalories, getWeightHistory, movingAverage, simulateWeightProjection } from '../lib/calculations.js';

export function TrendCard({ state }) {
  const [avgWindow, setAvgWindow] = useState(7);

  const history = useMemo(() => getWeightHistory(state.logs), [state.logs]);
  const trend = useMemo(() => movingAverage(history, avgWindow), [history, avgWindow]);

  const activeWeight = history.length ? history[history.length - 1].weight : (state.weight ?? 70);
  const goalWeight = state.goalWeight ?? activeWeight;

  const bmr = calculateBMR(state.gender, state.age, activeWeight, state.height);
  const tdee = calculateTDEE(bmr, state.activityLevel);
  const days = getRemainingDays(state.currentDate, state.goalTargetDate);
  const calorieTarget = calculateDailyCalories(state.goal, tdee, activeWeight, goalWeight, days);

  const projection = useMemo(() => simulateWeightProjection({
    startWeight: activeWeight, goalWeight, gender: state.gender, age: state.age,
    heightCm: state.height, activityLevel: state.activityLevel, calorieTarget,
  }), [activeWeight, goalWeight, state.gender, state.age, state.height, state.activityLevel, calorieTarget]);

  const todayDate = new Date(state.currentDate + 'T00:00:00');
  const toOffset = (dateStr) => Math.round((new Date(dateStr + 'T00:00:00') - todayDate) / 86400000);

  const historyPts = history.map((p) => ({ x: toOffset(p.date), y: p.weight }));
  const trendPts = trend.map((p) => ({ x: toOffset(p.date), y: p.weight }));
  const projPts = projection.points.map((p) => ({ x: p.day, y: p.weight }));

  const allPts = [...historyPts, ...trendPts, ...projPts, { x: 0, y: activeWeight }];
  const xs = allPts.map((p) => p.x);
  const ys = [...allPts.map((p) => p.y), goalWeight];
  const minX = Math.min(-1, ...xs);
  const maxX = Math.max(7, ...xs);
  const minY = Math.min(...ys) - 1;
  const maxY = Math.max(...ys) + 1;

  const W = 640, H = 220, padL = 42, padR = 16, padT = 16, padB = 26;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const sx = (x) => padL + ((x - minX) / (maxX - minX || 1)) * plotW;
  const sy = (y) => padT + (1 - (y - minY) / (maxY - minY || 1)) * plotH;
  const toPolyline = (pts) => pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ');

  const yTicks = 4;
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => minY + ((maxY - minY) * i) / yTicks);

  const projectionLine = [{ x: 0, y: activeWeight }, ...projPts];
  const hasEnoughHistory = history.length >= 2;

  return (
    <div className="glass card-lift card-edge h-full rounded-3xl p-6 flex flex-col" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          <TrendingDown size={14} style={{ color: 'var(--primary)' }} />
          Weight Trend &amp; Projection
        </div>
        <div className="flex items-center gap-1 rounded-full border p-0.5" style={{ borderColor: 'var(--border)' }}>
          {[7, 14].map((w) => (
            <button
              key={w}
              onClick={() => setAvgWindow(w)}
              className="rounded-full px-2.5 py-1 text-[10px] font-bold transition"
              style={avgWindow === w
                ? { background: 'var(--primary)', color: '#04120c' }
                : { color: 'var(--text-dim)' }}
            >
              {w}-day avg
            </button>
          ))}
        </div>
      </div>

      {!hasEnoughHistory ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <TrendingUp size={24} style={{ color: 'var(--text-faint)' }} />
          <p className="mt-2 text-xs" style={{ color: 'var(--text-faint)' }}>
            Log your weight on a few different days to see a real trend line here.
          </p>
        </div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }}>
            {tickVals.map((v, i) => (
              <g key={i}>
                <line x1={padL} x2={W - padR} y1={sy(v)} y2={sy(v)} stroke="var(--border)" strokeWidth="1" />
                <text x={padL - 8} y={sy(v)} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="var(--text-faint)" fontFamily="var(--font-mono)">
                  {v.toFixed(0)}
                </text>
              </g>
            ))}

            {/* Goal weight reference line */}
            <line x1={padL} x2={W - padR} y1={sy(goalWeight)} y2={sy(goalWeight)} stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3,4" opacity="0.7" />

            {/* Today marker */}
            <line x1={sx(0)} x2={sx(0)} y1={padT} y2={H - padB} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="2,3" />
            <text x={sx(0)} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--text-faint)">today</text>

            {/* Raw logged weight (muted dots + thin line) */}
            <polyline points={toPolyline(historyPts)} fill="none" stroke="var(--text-faint)" strokeWidth="1.5" opacity="0.5" />
            {historyPts.map((p, i) => (
              <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="2" fill="var(--text-faint)" />
            ))}

            {/* Moving average trend (bold) */}
            <polyline points={toPolyline(trendPts)} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Adaptive projection (dashed) */}
            <polyline points={toPolyline(projectionLine)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5,4" strokeLinecap="round" />
            <circle cx={sx(0)} cy={sy(activeWeight)} r="3.5" fill="var(--accent)" />
          </svg>

          <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            {projection.reached
              ? <>At your current target of <strong style={{ color: 'var(--text)' }}>{calorieTarget} kcal/day</strong>, a day-by-day estimate (which re-checks your metabolic rate as your weight changes, instead of assuming a constant weekly rate) projects you'll reach <strong style={{ color: 'var(--text)' }}>{goalWeight}kg</strong> in about <strong style={{ color: 'var(--text)' }}>{Math.round(projection.daysToGoal / 7)} weeks</strong>.</>
              : <>At your current target of <strong style={{ color: 'var(--text)' }}>{calorieTarget} kcal/day</strong>, this estimate doesn't reach your goal within a year — consider adjusting your target or goal date.</>}
            {' '}This is still an estimate, not a guarantee — real results vary.
          </p>
        </>
      )}
    </div>
  );
}
