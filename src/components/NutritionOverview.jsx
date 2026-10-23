/* ---------------- components/NutritionOverview.jsx ----------------
 * Today's four headline numbers, on the Meals tab.
 *
 * A thin wrapper around MetricRow so the numbers come from lib/dailyTotals
 * like everywhere else. It used to recompute them itself, and ignored the
 * user's custom water target as a result.
 */
import { ArrowRight } from 'lucide-react';
import { MetricRow } from './MetricRow.jsx';

export function NutritionOverview({ state, onViewDetails }) {
  return (
    <section className="m-card text-left" aria-label="Today's totals">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="section-title">Today's totals</h2>
        <button
          type="button"
          onClick={onViewDetails}
          className="flex min-h-[40px] items-center gap-1.5 text-[13px] font-bold transition hover:opacity-80 shrink-0"
          style={{ color: 'var(--primary)' }}
        >
          History
          <ArrowRight size={14} />
        </button>
      </div>
      <MetricRow state={state} />
    </section>
  );
}
