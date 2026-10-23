/* ---------------- components/TrendCard.jsx ----------------
 * Weight trend and projection.
 *
 * It used to show nothing until weight had been logged on two different
 * days, and plotted the projection up to a year ahead — squeezing the real
 * data into a sliver with labels too small to read on a phone. Now:
 *   - a chart appears as soon as there is any weight (profile or logs),
 *   - the x-axis covers the last 60 days of history and at most 12 weeks of
 *     projection,
 *   - labels are sized for a phone,
 *   - the calorie target is the app's shared one (lib/dailyTotals).
 */
import { useState, useMemo } from 'react';
import { TrendingDown, Pencil } from 'lucide-react';
import { getWeightHistory, movingAverage, simulateWeightProjection } from '../lib/calculations.js';
import { getCalorieTarget } from '../lib/dailyTotals.js';
import { shiftDateString } from '../lib/date.js';

const HISTORY_DAYS = 60;
const MAX_PROJECTION_DAYS = 84;

export function TrendCard({ state, onEditProfile }) {
  const [avgWindow, setAvgWindow] = useState(7);

  const allHistory = useMemo(() => getWeightHistory(state.logs), [state.logs]);
  const since = shiftDateString(state.currentDate, -HISTORY_DAYS);
  const history = allHistory.filter((p) => p.date >= since && p.date <= state.currentDate);
  const trend = useMemo(() => movingAverage(history, avgWindow), [history, avgWindow]);

  const activeWeight = history.length ? history[history.length - 1].weight : (Number(state.weight) || null);
  const goalWeight = Number(state.goalWeight) > 0 ? Number(state.goalWeight) : null;
  const calorieTarget = activeWeight ? getCalorieTarget(state, activeWeight) : null;

  const projection = useMemo(() => {
    if (!activeWeight || !goalWeight) return { points: [], reached: false };
    return simulateWeightProjection({
      startWeight: activeWeight, goalWeight, gender: state.gender, age: state.age,
      heightCm: state.height, activityLevel: state.activityLevel, calorieTarget,
    });
  }, [activeWeight, goalWeight, state.gender, state.age, state.height, state.activityLevel, calorieTarget]);

  if (!activeWeight) {
    return (
      <section className="m-card text-left" aria-label="Weight trend">
        <Header avgWindow={avgWindow} setAvgWindow={setAvgWindow} />
        <p className="mt-3 text-[13px] leading-snug" style={{ color: 'var(--text-dim)' }}>
          Add your current weight in your profile to start your weight trend.
        </p>
        {onEditProfile && <EditButton onClick={onEditProfile} label="Add weight" />}
      </section>
    );
  }

  const todayDate = new Date(state.currentDate + 'T00:00:00');
  const toOffset = (dateStr) => Math.round((new Date(dateStr + 'T00:00:00') - todayDate) / 86400000);

  const historyPts = history.map((p) => ({ x: toOffset(p.date), y: p.weight }));
  const trendPts = trend.map((p) => ({ x: toOffset(p.date), y: p.weight }));
  const horizon = projection.reached ? Math.min(MAX_PROJECTION_DAYS, projection.daysToGoal + 7) : MAX_PROJECTION_DAYS;
  const projPts = projection.points.filter((p) => p.day <= horizon).map((p) => ({ x: p.day, y: p.weight }));
  const projectionLine = projPts.length ? [{ x: 0, y: activeWeight }, ...projPts] : [];

  const allPts = [...historyPts, ...trendPts, ...projectionLine, { x: 0, y: activeWeight }];
  const xs = allPts.map((p) => p.x);
  const ys = [...allPts.map((p) => p.y), ...(goalWeight ? [goalWeight] : [])];
  const minX = Math.min(-7, ...xs);
  const maxX = Math.max(projPts.length ? 14 : 3, ...xs);
  const span = Math.max(...ys) - Math.min(...ys);
  const pad = Math.max(0.5, span * 0.15);
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;

  // A compact viewBox scales down less on a phone, so text stays readable.
  const W = 400, H = 240, padL = 40, padR = 12, padT = 14, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const sx = (x) => padL + ((x - minX) / (maxX - minX || 1)) * plotW;
  const sy = (y) => padT + (1 - (y - minY) / (maxY - minY || 1)) * plotH;
  const toPolyline = (pts) => pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ');
  const decimals = maxY - minY < 5 ? 1 : 0;
  const tickVals = Array.from({ length: 5 }, (_, i) => minY + ((maxY - minY) * i) / 4);
  const dayLabel = (offset) => new Date(todayDate.getTime() + offset * 86400000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  return (
    <section className="m-card text-left" aria-label="Weight trend">
      <Header avgWindow={avgWindow} setAvgWindow={setAvgWindow} />

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`Weight chart. Current ${activeWeight} kg${goalWeight ? `, goal ${goalWeight} kg` : ''}.`}>
        {tickVals.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={sy(v)} y2={sy(v)} stroke="var(--border)" strokeWidth="1" />
            <text x={padL - 6} y={sy(v)} textAnchor="end" dominantBaseline="middle" fontSize="12" fill="var(--text-faint)">{v.toFixed(decimals)}</text>
          </g>
        ))}

        {/* Start date only when there is room for it beside "Today". */}
        {sx(0) - sx(minX) > 70 && <text x={sx(minX)} y={H - 8} textAnchor="start" fontSize="12" fill="var(--text-faint)">{dayLabel(minX)}</text>}
        <text x={sx(0)} y={H - 8} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text-dim)">Today</text>
        {maxX > 3 && <text x={sx(maxX)} y={H - 8} textAnchor="end" fontSize="12" fill="var(--text-faint)">{dayLabel(maxX)}</text>}
        <line x1={sx(0)} x2={sx(0)} y1={padT} y2={H - padB} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3,3" />

        {goalWeight && (
          <>
            <line x1={padL} x2={W - padR} y1={sy(goalWeight)} y2={sy(goalWeight)} stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.8" />
            <text x={W - padR} y={sy(goalWeight) - 5} textAnchor="end" fontSize="11" fontWeight="700" fill="var(--accent)">Goal {goalWeight}</text>
          </>
        )}

        {historyPts.length > 1 && <polyline points={toPolyline(historyPts)} fill="none" stroke="var(--text-faint)" strokeWidth="1.5" opacity="0.6" />}
        {historyPts.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="3" fill="var(--text-faint)" />)}
        {trendPts.length > 1 && <polyline points={toPolyline(trendPts)} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        {projectionLine.length > 1 && <polyline points={toPolyline(projectionLine)} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeDasharray="6,5" strokeLinecap="round" />}
        <circle cx={sx(0)} cy={sy(activeWeight)} r="5" fill="var(--primary)" stroke="var(--surface-solid)" strokeWidth="2" />
      </svg>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]" style={{ color: 'var(--text-dim)' }}>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: 'var(--text-faint)' }} />Logged</span>
        <span><span className="mr-1 inline-block h-0.5 w-3 align-middle" style={{ background: 'var(--primary)' }} />{avgWindow}-day average</span>
        {projectionLine.length > 1 && <span><span className="mr-1 inline-block h-0.5 w-3 align-middle" style={{ background: 'var(--accent)' }} />Projection</span>}
      </div>

      <p className="mt-3 text-[13px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
        {history.length < 2 && 'Update your weight on a few different days (Profile → Edit) to see your trend line. '}
        {!goalWeight
          ? 'Set a goal weight in your profile to see a projection.'
          : projection.reached
            ? <>At your target of <strong style={{ color: 'var(--text)' }}>{calorieTarget} kcal/day</strong>, you’d reach <strong style={{ color: 'var(--text)' }}>{goalWeight} kg</strong> in about <strong style={{ color: 'var(--text)' }}>{Math.max(1, Math.round(projection.daysToGoal / 7))} week{Math.round(projection.daysToGoal / 7) === 1 ? '' : 's'}</strong>. An estimate, not a guarantee.</>
            : <>At your target of <strong style={{ color: 'var(--text)' }}>{calorieTarget} kcal/day</strong>, this estimate doesn’t reach your goal within a year — consider adjusting your goal or date.</>}
      </p>
      {(!goalWeight || history.length < 2) && onEditProfile && <EditButton onClick={onEditProfile} label="Edit profile" />}
    </section>
  );
}

function Header({ avgWindow, setAvgWindow }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 section-title">
        <TrendingDown size={16} style={{ color: 'var(--primary)' }} /> Weight trend &amp; projection
      </h2>
      <div className="flex items-center gap-1 rounded-full border p-0.5" style={{ borderColor: 'var(--border)' }}>
        {[7, 14].map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setAvgWindow(w)}
            aria-pressed={avgWindow === w}
            className="min-h-[32px] rounded-full px-3 text-[12px] font-bold transition"
            style={avgWindow === w ? { background: 'var(--primary)', color: '#fff' } : { color: 'var(--text-dim)' }}
          >
            {w}-day
          </button>
        ))}
      </div>
    </div>
  );
}

function EditButton({ onClick, label }) {
  return (
    <button type="button" onClick={onClick} className="mt-3 flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-bold" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
      <Pencil size={13} /> {label}
    </button>
  );
}
