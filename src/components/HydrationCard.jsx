/* ---------------- components/HydrationCard.jsx ----------------
 * The full water tracker (custom amounts, undo, target) with its own state
 * logic, so it can live on the Meals page. Home keeps the one-tap +250 ml.
 */
import WaterTrackerCard from './WaterTrackerCard.jsx';
import { normalizeWaterMl } from '../lib/calculations.js';
import { getDailyTotals } from '../lib/dailyTotals.js';
import { createEmptyLog } from '../lib/useAppState.js';

/** A target set before it became a synced setting lived in a device-wide
 *  localStorage key; read it once as a fallback so nobody loses it. */
function legacyWaterTarget() {
  try {
    const n = parseInt(localStorage.getItem('titantrack_water_target'), 10);
    return n >= 500 && n <= 10000 ? n : null;
  } catch {
    return null;
  }
}

export function HydrationCard({ state, update }) {
  const log = (state.logs && state.logs[state.currentDate]) || {};
  const activeWeight = log.weight > 0 ? log.weight : (state.weight || 70);
  const waterTarget = state.waterTargetMl || legacyWaterTarget() || getDailyTotals(state).waterTarget;

  const handleWaterChange = (mlDelta) => {
    update((prev) => {
      const date = prev.currentDate;
      const day = prev.logs[date] || createEmptyLog();
      const next = Math.max(0, normalizeWaterMl(day.water) + mlDelta);
      return { ...prev, logs: { ...prev.logs, [date]: { ...day, water: next } } };
    });
  };

  const handleTargetChange = (ml) => update((prev) => ({ ...prev, waterTargetMl: ml }));

  return (
    <WaterTrackerCard
      variant="widget"
      water={log.water || 0}
      target={waterTarget}
      weight={activeWeight}
      onWaterChange={handleWaterChange}
      onTargetChange={handleTargetChange}
    />
  );
}
