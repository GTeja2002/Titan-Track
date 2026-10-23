/* ---------------- components/HistoryCard.jsx ----------------
 * Browse every past day that has anything logged, newest first. Opening a
 * day switches the whole app to that date, where its meals, water and
 * activity can be edited or deleted with the normal controls.
 */
import { useMemo, useState } from 'react';
import { History, ChevronRight } from 'lucide-react';
import { sumEntries } from '../lib/nutrition.js';
import { normalizeWaterMl } from '../lib/calculations.js';

const PAGE = 14;

function hasAnything(day) {
  return day && ((day.foods && day.foods.length > 0) || day.water > 0 || day.walk > 0 || day.gym > 0 || day.steps > 0 || day.weight > 0);
}

export function HistoryCard({ state, onOpenDay }) {
  const [shown, setShown] = useState(PAGE);
  const days = useMemo(() => Object.entries(state.logs || {})
    .filter(([date, day]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && hasAnything(day))
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, day]) => {
      const t = sumEntries(day.foods || []);
      return { date, cal: t.cal, unknown: t.unknownCount, items: (day.foods || []).length, water: normalizeWaterMl(day.water), steps: day.steps || 0 };
    }), [state.logs]);

  return (
    <section className="panel-card rounded-[var(--radius-card)] p-[var(--space-card)] text-left" aria-label="History">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[15px] font-black" style={{ color: 'var(--text)' }}>
          <History size={17} style={{ color: 'var(--primary)' }} /> History
        </h3>
        <span className="text-[11px] font-bold" style={{ color: 'var(--text-faint)' }}>
          {days.length} day{days.length === 1 ? '' : 's'} logged
        </span>
      </div>
      {days.length === 0 ? (
        <p className="py-4 text-center text-[13px]" style={{ color: 'var(--text-faint)' }}>Days you log will appear here.</p>
      ) : (
        <ul className="flex flex-col">
          {days.slice(0, shown).map((d, i) => (
            <li key={d.date} style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <button onClick={() => onOpenDay(d.date)} className="flex w-full items-center gap-3 py-2.5 text-left">
                <span className="w-24 shrink-0 text-[12.5px] font-bold" style={{ color: 'var(--text)' }}>
                  {new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}
                </span>
                <span className="flex-1 text-[12px]" style={{ color: 'var(--text-dim)' }}>
                  {d.items > 0 ? `${d.cal}${d.unknown ? '+' : ''} kcal · ${d.items} item${d.items === 1 ? '' : 's'}` : 'No meals'}
                  {d.water > 0 ? ` · ${d.water} ml water` : ''}
                  {d.steps > 0 ? ` · ${d.steps.toLocaleString()} steps` : ''}
                </span>
                <ChevronRight size={16} style={{ color: 'var(--text-faint)' }} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {days.length > shown && (
        <button onClick={() => setShown((n) => n + PAGE * 2)} className="mt-2 w-full rounded-xl border py-2 text-[12px] font-bold" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
          Show older days
        </button>
      )}
    </section>
  );
}
