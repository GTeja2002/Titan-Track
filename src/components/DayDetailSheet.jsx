/* ---------------- components/DayDetailSheet.jsx ----------------
 * Read-only look at one past day — meals by type, water, steps, distance,
 * activity and weight — without switching the whole app to that date.
 * "Edit this day" does that switch when the user actually wants to change it.
 */
import { createPortal } from 'react-dom';
import { useDismiss } from '../lib/dismiss.js';
import { MEAL_TYPES, groupByMeal, sumEntries } from '../lib/nutrition.js';
import { normalizeWaterMl } from '../lib/calculations.js';
import { stepsToKm } from '../lib/activity.js';

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2" style={{ borderTop: '1px solid var(--border)' }}>
      <span className="text-[13.5px]" style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span className="text-[14px] font-bold tabular-nums" style={{ color: value === '—' ? 'var(--text-faint)' : 'var(--text)' }}>{value}</span>
    </div>
  );
}

export function DayDetailSheet({ state, date, onClose, onEditDay }) {
  useDismiss(Boolean(date), onClose);
  if (!date) return null;

  const log = (state.logs && state.logs[date]) || {};
  const foods = log.foods || [];
  const groups = groupByMeal(foods);
  const totals = sumEntries(foods);
  const water = normalizeWaterMl(log.water);
  const title = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const sections = [...MEAL_TYPES, { id: 'other', label: 'Earlier entries' }].filter((m) => groups[m.id].length);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <article
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${title}`}
        onClick={(e) => e.stopPropagation()}
        className="sheet w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl text-left overflow-hidden animate-scale-in"
        style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)' }}
      >
        <span aria-hidden="true" className="mx-auto mt-2 block h-1 w-10 rounded-full sm:hidden" style={{ background: 'var(--border-strong)' }} />
        <div className="sheet-body px-5 pb-4 pt-3 sm:p-6">
          <h2 className="text-[17px] font-black" style={{ color: 'var(--text)' }}>{title}</h2>

          <h3 className="mt-4 text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
            Meals · {totals.cal}{totals.unknownCount ? '+' : ''} kcal · {totals.protein} g protein
          </h3>
          {sections.length === 0 ? (
            <p className="mt-2 text-[13.5px]" style={{ color: 'var(--text-faint)' }}>No meals logged.</p>
          ) : sections.map((m) => (
            <div key={m.id} className="mt-2.5">
              <p className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>{m.label}</p>
              <ul className="mt-1 flex flex-col gap-1">
                {groups[m.id].map((f) => (
                  <li key={f.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="min-w-0 break-words" style={{ color: 'var(--text-dim)' }}>
                      {f.name}{f.qty ? ` · ${f.qty}${f.unit === 'piece' ? ' pc' : ` ${f.unit || ''}`}` : ''}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums" style={{ color: 'var(--text)' }}>{f.calUnknown ? '? kcal' : `${f.cal} kcal`}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="mt-4">
            <Row label="Water" value={water ? `${water.toLocaleString()} ml` : '—'} />
            <Row label="Steps" value={log.steps ? `${log.steps.toLocaleString()} (≈ ${stepsToKm(log.steps, state.height, state.gender)} km)` : '—'} />
            <Row label="Walk logged" value={log.walk ? `${log.walk} km` : '—'} />
            <Row label="Gym" value={log.gym ? `${log.gym} min` : '—'} />
            <Row label="Weight" value={log.weight ? `${log.weight} kg` : '—'} />
          </div>
        </div>
        <div className="sheet-actions flex gap-2.5 px-5 py-3 sm:px-6">
          <button type="button" onClick={onClose} className="min-h-[48px] flex-1 rounded-xl border text-sm font-bold" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>Close</button>
          <button type="button" onClick={() => onEditDay(date)} className="min-h-[48px] flex-[2] rounded-xl text-sm font-bold text-white" style={{ background: 'var(--grad-primary-cta)' }}>Edit this day</button>
        </div>
      </article>
    </div>,
    document.body
  );
}
