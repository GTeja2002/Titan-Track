/* ---------------- components/WeeklySummaryCard.jsx ----------------
 * "Your week": the last 7 days from real logs (lib/weeklySummary). Empty
 * days show as gaps, not zeros, and nothing is shown that wasn't logged.
 */
import { useMemo } from 'react';
import { CalendarRange } from 'lucide-react';
import { weeklySummary } from '../lib/weeklySummary.js';

function Stat({ label, value, sub }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-control)] border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-solid)' }}>
      <p className="text-[12px] font-semibold" style={{ color: 'var(--text-dim)' }}>{label}</p>
      <p className="mt-1 text-[19px] font-extrabold leading-none tabular-nums" style={{ color: value === '—' ? 'var(--text-faint)' : 'var(--text)' }}>{value}</p>
      {sub && <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-faint)' }}>{sub}</p>}
    </div>
  );
}

export function WeeklySummaryCard({ state, onOpenDay }) {
  const s = useMemo(() => weeklySummary(state), [state]);
  const dayName = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' });
  const wc = s.weightChange;

  return (
    <section className="m-card text-left" aria-label="Your week">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 section-title">
          <CalendarRange size={16} style={{ color: 'var(--primary)' }} /> Your week
        </h2>
        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-faint)' }}>{s.daysLogged} of 7 days logged</span>
      </div>

      {/* Which days have anything logged; tap to open that day. */}
      <div className="mt-3 grid grid-cols-7 gap-1.5" role="list" aria-label="Days logged this week">
        {s.perDay.map((d) => (
          <button
            key={d.date}
            type="button"
            role="listitem"
            onClick={() => onOpenDay && onOpenDay(d.date)}
            aria-label={`${new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}${d.logged ? ', logged' : ', nothing logged'}`}
            className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-lg"
            style={{ background: d.logged ? 'var(--primary-soft)' : 'var(--bg-2, var(--surface))' }}
          >
            <span className="text-[11px] font-bold" style={{ color: 'var(--text-dim)' }}>{dayName(d.date)}</span>
            <span className="h-2 w-2 rounded-full" style={{ background: d.logged ? 'var(--primary)' : 'var(--border-strong)' }} />
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Avg calories" value={s.avgCalories !== null ? s.avgCalories.toLocaleString() : '—'} sub={`target hit ${s.targetsHit.calories}/7`} />
        <Stat label="Avg protein" value={s.avgProtein !== null ? `${s.avgProtein} g` : '—'} sub={`target hit ${s.targetsHit.protein}/7`} />
        <Stat label="Avg water" value={s.avgWater !== null ? `${(s.avgWater / 1000).toFixed(1)} L` : '—'} sub={`target hit ${s.targetsHit.water}/7`} />
        <Stat label="Steps" value={s.totalSteps ? s.totalSteps.toLocaleString() : '—'} sub={s.totalSteps ? `≈ ${s.totalKm} km` : null} />
        <Stat label="Step goal days" value={`${s.targetsHit.steps}/7`} />
        <Stat
          label="Weight change"
          value={wc === null ? '—' : `${wc > 0 ? '+' : ''}${wc} kg`}
          sub={wc === null ? 'needs 2 weigh-ins' : null}
        />
      </div>
    </section>
  );
}
