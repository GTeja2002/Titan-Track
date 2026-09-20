/* ---------------- components/MetricRow.jsx ----------------
 * The row of four headline metric cards, shown on both the dashboard and the
 * workouts page. Values come from lib/dailyTotals so the two pages cannot
 * drift apart.
 */
import { Flame, Zap, Droplet, Footprints } from 'lucide-react';
import { MetricCard } from './MetricCard.jsx';
import { getDailyTotals } from '../lib/dailyTotals.js';

export function MetricRow({ state, onOpenNutrition, onOpenWorkouts }) {
  const t = getDailyTotals(state);

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
      <MetricCard
        metric="calories"
        icon={Flame}
        label="Calories"
        value={t.calories}
        target={t.calorieTarget}
        footnote={t.calories >= t.calorieTarget ? 'Target met!' : `Remaining: ${Math.max(0, t.calorieTarget - t.calories).toLocaleString()} kcal`}
        progress={t.caloriesPct}
        onOpen={onOpenNutrition}
      />

      <MetricCard
        metric="protein"
        icon={Zap}
        label="Protein"
        value={t.protein}
        target={t.proteinTarget}
        unit="g"
        footnote={t.protein >= t.proteinTarget ? 'Target hit!' : `Remaining: ${Math.max(0, t.proteinTarget - t.protein)}g`}
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
        footnote={t.water >= t.waterTarget ? 'Hydrated!' : `Remaining: ${Math.max(0, t.waterTarget - t.water).toLocaleString()} ml`}
        progress={t.waterPct}
        onOpen={onOpenNutrition}
      />

      <MetricCard
        metric="steps"
        icon={Footprints}
        label="Steps"
        value={t.steps}
        target={t.stepsTarget}
        footnote={t.steps >= t.stepsTarget ? 'Goal reached!' : 'Keep going!'}
        progress={t.stepsPct}
        onOpen={onOpenWorkouts}
      />
    </section>
  );
}
