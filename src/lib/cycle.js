/* ---------------- lib/cycle.js ----------------
 * Menstrual cycle phase, for the people who want it alongside their logs.
 *
 * Energy, appetite, sleep and training capacity all move with the cycle, so a
 * wellbeing tracker that ignores it is missing an obvious explanation for
 * "why was this week harder?" for roughly half its potential users. This is
 * opt-in and purely informational — a calendar estimate from the user's own
 * stated dates, not a prediction, a diagnosis or contraception.
 */
import { shiftDateString, getLocalDateString } from './date.js';

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;

export const PHASES = {
  menstrual: { id: 'menstrual', label: 'Period', blurb: 'Energy is often lowest. Rest is not slacking.' },
  follicular: { id: 'follicular', label: 'Follicular', blurb: 'Energy usually climbing. Good week to push.' },
  ovulation: { id: 'ovulation', label: 'Ovulation', blurb: 'Often the strongest few days.' },
  luteal: { id: 'luteal', label: 'Luteal', blurb: 'Appetite often up, energy tapering. Both are normal.' },
};

function daysBetween(fromStr, toStr) {
  const a = new Date(fromStr + 'T00:00:00');
  const b = new Date(toStr + 'T00:00:00');
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/**
 * Where a date falls in the cycle.
 * @returns {null|{ day: number, phase: object, nextPeriodDate: string, daysToNextPeriod: number }}
 *          null when tracking is off or no start date has been given.
 */
export function cycleStatus(cycle, currentDate) {
  if (!cycle || !cycle.enabled || !cycle.lastPeriodStart) return null;

  const today = currentDate || getLocalDateString();
  const length = Number(cycle.avgCycleLength) || DEFAULT_CYCLE_LENGTH;
  const periodLength = Number(cycle.avgPeriodLength) || DEFAULT_PERIOD_LENGTH;

  const elapsed = daysBetween(cycle.lastPeriodStart, today);
  if (elapsed === null || elapsed < 0) return null;

  // Day 1 is the first day of the period. Cycles repeat, so a start date from
  // several cycles ago still gives a usable day number.
  const day = (elapsed % length) + 1;

  let phase;
  if (day <= periodLength) phase = PHASES.menstrual;
  else if (day < Math.round(length / 2) - 1) phase = PHASES.follicular;
  else if (day <= Math.round(length / 2) + 1) phase = PHASES.ovulation;
  else phase = PHASES.luteal;

  const daysToNextPeriod = length - day + 1;
  const nextPeriodDate = shiftDateString(today, daysToNextPeriod);

  return { day, phase, nextPeriodDate, daysToNextPeriod };
}
