/* ---------------- lib/healthSteps.js ----------------
 * Today's step count from Android Health Connect (capacitor-health plugin).
 * Android only — on the web every function reports 'unsupported' and the
 * app keeps its normal behaviour.
 *
 * Only the READ_STEPS permission is ever requested; the manifest strips the
 * other health permissions the plugin declares.
 */
import { Health } from 'capacitor-health';
import { isNativeApp } from './platform.js';
import { getLocalDateString } from './date.js';

export const STEP_PERMISSION = 'READ_STEPS';

/** 'unsupported' (web / old Android), 'not_installed', 'needs_permission',
 *  'connected', or 'error'. */
export async function getStepAccess(plugin = Health, native = isNativeApp()) {
  if (!native) return 'unsupported';
  try {
    const { available } = await plugin.isHealthAvailable();
    if (!available) return 'not_installed';
    const res = await plugin.checkHealthPermissions({ permissions: [STEP_PERMISSION] });
    return isGranted(res) ? 'connected' : 'needs_permission';
  } catch {
    return 'error';
  }
}

/** The plugin's types say `permissions` is an array of {name: bool}, but on
 *  Android it resolves a plain object {READ_STEPS: true}. Accept both. */
export function isGranted(response) {
  const p = response && response.permissions;
  if (!p) return false;
  if (Array.isArray(p)) return p.some((entry) => entry && entry[STEP_PERMISSION] === true);
  return p[STEP_PERMISSION] === true;
}

export async function requestStepAccess(plugin = Health) {
  try {
    const res = await plugin.requestHealthPermissions({ permissions: [STEP_PERMISSION] });
    return isGranted(res) ? 'connected' : 'needs_permission';
  } catch {
    return 'error';
  }
}

/** Local midnight → now, as UTC instants (the plugin converts them back to
 *  the phone's zone). One 'day' bucket covers today; sum defensively in case
 *  the range is split. */
export function todayRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { startDate: start.toISOString(), endDate: now.toISOString() };
}

export async function readTodaySteps(plugin = Health, now = new Date()) {
  const res = await plugin.queryAggregated({ ...todayRange(now), dataType: 'steps', bucket: 'day' });
  const total = (res?.aggregatedData || []).reduce((s, b) => s + (Number(b?.value) || 0), 0);
  return Math.max(0, Math.round(total));
}

/**
 * State transform: writes today's steps into logs[today] (the real local
 * date — not the day being viewed) and marks where they came from. Returns
 * the same state when nothing changed, so it doesn't trigger a sync.
 */
export function applyTodaySteps(state, steps, today = getLocalDateString()) {
  const day = (state.logs && state.logs[today]) || { foods: [], walk: 0, gym: 0, weight: 0, water: 0 };
  if (day.steps === steps && day.stepsSource === 'health_connect') return state;
  return { ...state, logs: { ...state.logs, [today]: { ...day, steps, stepsSource: 'health_connect' } } };
}

export const openHealthConnectInstall = (plugin = Health) => plugin.showHealthConnectInPlayStore().catch(() => {});
export const openHealthConnectSettings = (plugin = Health) => plugin.openHealthConnectSettings().catch(() => {});
