/* ---------------- components/TodayCard.jsx ----------------
 * The phone home screen's "what do I do now" card: three one-tap actions and
 * what has actually been eaten today, by meal. Everything shown comes from
 * the day's log — no placeholder meals or invented numbers.
 */
import { Utensils, Droplet, Footprints, ChevronRight } from 'lucide-react';
import { MEAL_TYPES, groupByMeal, sumEntries } from '../lib/nutrition.js';

function Action({ icon: Icon, label, sub, onClick, metric }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] px-2 py-2.5 text-center transition active:scale-95"
      style={{ background: `var(--m-${metric}-wash)`, border: `1px solid var(--m-${metric}-edge, var(--border))` }}
    >
      <Icon size={19} style={{ color: `var(--m-${metric}-ink)` }} aria-hidden="true" />
      <span className="text-[12.5px] font-bold leading-tight" style={{ color: 'var(--text)' }}>{label}</span>
      {sub && <span className="text-[11px] leading-tight" style={{ color: 'var(--text-dim)' }}>{sub}</span>}
    </button>
  );
}

export function TodayCard({ foods = [], onLogMeal, onAddWater, onLogActivity }) {
  const groups = groupByMeal(foods);
  const rows = [...MEAL_TYPES, { id: 'other', label: 'Earlier entries' }]
    .map((m) => ({ ...m, items: groups[m.id], totals: sumEntries(groups[m.id]) }))
    .filter((m) => m.id !== 'other' || m.items.length > 0);

  return (
    <section className="m-card" aria-label="Today">
      <div className="grid grid-cols-3 gap-2">
        <Action icon={Utensils} label="Log meal" onClick={onLogMeal} metric="calories" />
        <Action icon={Droplet} label="+250 ml" sub="water" onClick={onAddWater} metric="water" />
        <Action icon={Footprints} label="Activity" onClick={onLogActivity} metric="steps" />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h2 className="section-title">Today's meals</h2>
        <button type="button" onClick={onLogMeal} className="flex min-h-[44px] items-center gap-0.5 text-[13px] font-bold" style={{ color: 'var(--primary)' }}>
          Open <ChevronRight size={16} />
        </button>
      </div>

      <ul className="mt-1 flex flex-col">
        {rows.map((m, i) => (
          <li key={m.id} style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <button type="button" onClick={onLogMeal} className="flex w-full min-h-[48px] items-center gap-3 py-2 text-left">
              <span className="w-[84px] shrink-0 text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>{m.label}</span>
              <span className="min-w-0 flex-1 truncate text-[12.5px]" style={{ color: m.items.length ? 'var(--text-dim)' : 'var(--text-faint)' }}>
                {m.items.length ? m.items.map((f) => f.name).join(', ') : 'Nothing yet'}
              </span>
              <span className="shrink-0 text-[13px] font-bold tabular-nums" style={{ color: m.items.length ? 'var(--text)' : 'var(--text-faint)' }}>
                {m.items.length ? `${m.totals.cal}${m.totals.unknownCount ? '+' : ''} kcal` : '—'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
