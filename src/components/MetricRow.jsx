/* ---------------- components/MetricRow.jsx ----------------
 * The row of four headline metric cards, shown on both the dashboard and the
 * workouts page. Values come from lib/dailyTotals so the two pages cannot
 * drift apart.
 */
import { Flame, Zap, Droplet, Footprints } from 'lucide-react';
import { MetricCard } from './MetricCard.jsx';
import { getDailyTotals } from '../lib/dailyTotals.js';

export function MetricRow({ state, onOpenNutrition, onOpenWorkouts }) {
  // Protein is shown to one decimal at most; long floats read as noise.
  const t = getDailyTotals(state);

  return (
    <section className="metric-grid" aria-label="Today's totals">
      <MetricCard
        metric="calories"
        icon={Flame}
        label="Calories"
        value={t.calories}
        target={t.calorieTarget}
        unit="kcal"
        footnote={t.calories >= t.calorieTarget ? 'Target met' : `${Math.max(0, t.calorieTarget - t.calories).toLocaleString()} kcal left`}
        progress={t.caloriesPct}
        onOpen={onOpenNutrition}
      />

      <MetricCard
        metric="protein"
        icon={Zap}
        label="Protein"
        value={Math.round(t.protein * 10) / 10}
        target={t.proteinTarget}
        unit="g"
        footnote={t.protein >= t.proteinTarget ? 'Target met' : `${Math.round(Math.max(0, t.proteinTarget - t.protein) * 10) / 10} g left`}
        progress={t.proteinPct}
        onOpen={onOpenNutrition}
      />

      <MetricCard
        metric="water"
        icon={Droplet}
        label="Water"
        value={t.water}
        target={t.waterTarget}
        unit="ml"
        footnote={t.water >= t.waterTarget ? 'Target met' : `${Math.max(0, t.waterTarget - t.water).toLocaleString()} ml left`}
        progress={t.waterPct}
        onOpen={onOpenNutrition}
      />

      <MetricCard
        metric="steps"
        icon={Footprints}
        label="Steps"
        value={t.steps}
        target={t.stepsTarget}
        unit="steps"
        footnote={`${t.steps >= t.stepsTarget ? 'Target met' : `${Math.max(0, t.stepsTarget - t.steps).toLocaleString()} to go`}${t.stepsSource === 'health_connect' ? ' · Health Connect' : ''}`}
        progress={t.stepsPct}
        onOpen={onOpenWorkouts}
      />
    </section>
  );
}
