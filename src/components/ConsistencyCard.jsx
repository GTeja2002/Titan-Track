/* ---------------- components/ConsistencyCard.jsx ----------------
 * The headline card for goals that are not about the scale.
 *
 * GoalCard answers "how far to your goal weight?", which is meaningless — and
 * for some people actively unhelpful — when the goal is consistency, strength
 * or feeling better. This card answers "did you show up?" instead: a streak
 * with rest days and freezes, and the last seven days at a glance.
 */
import { useMemo } from 'react';
import { Flame, Snowflake, Check, Moon } from 'lucide-react';
import { computeStreak, activeDaysInLastWeek, dayHadActivity, isRestDay, MAX_FREEZES } from '../lib/streak.js';
import { shiftDateString } from '../lib/date.js';
import { goalLabel } from '../lib/goals.js';

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function ConsistencyCard({ state }) {
  const logs = state.logs || {};
  const currentDate = state.currentDate;
  const restDays = state.restDays || [];
  const freezesAvailable = state.streakFreezes ?? MAX_FREEZES;

  const { streak, freezesUsed, loggedToday, todayIsRest } = useMemo(
    () => computeStreak(logs, currentDate, { restDays, freezesAvailable }),
    [logs, currentDate, restDays, freezesAvailable]
  );

  const activeDays = useMemo(
    () => activeDaysInLastWeek(logs, currentDate),
    [logs, currentDate]
  );

  // Last seven days, oldest first, so the row reads left-to-right like a week.
  const week = useMemo(() => {
    const out = [];
    let d = currentDate;
    for (let i = 0; i < 7; i++) {
      out.unshift({
        date: d,
        active: dayHadActivity(logs[d]),
        rest: isRestDay(d, restDays),
        isToday: i === 0,
        initial: DAY_INITIALS[new Date(d + 'T00:00:00').getDay()] || '?',
      });
      d = shiftDateString(d, -1);
    }
    return out;
  }, [logs, currentDate, restDays]);

  const freezesLeft = Math.max(0, freezesAvailable - freezesUsed);

  const message = todayIsRest
    ? 'Rest day. Nothing needed today.'
    : loggedToday
      ? 'Logged today. Nice.'
      : streak > 0
        ? 'Log anything today to keep it going.'
        : 'Log anything to start a streak.';

  return (
    <div className="glass card-lift card-edge h-full rounded-3xl p-6 flex flex-col" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          <Flame size={14} style={{ color: 'var(--primary)' }} />
          Consistency
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          {goalLabel(state.goal)}
        </span>
      </div>

      <div className="my-5 flex flex-1 flex-col items-center justify-center">
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full ${loggedToday || todayIsRest ? 'flow-pulse' : ''}`}
          style={{ background: 'var(--grad-primary-soft)' }}
        >
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-extrabold leading-none text-flow">{streak}</span>
          </div>
        </div>
        <span className="mt-3 text-sm font-bold" style={{ color: 'var(--text-dim)' }}>
          day{streak === 1 ? '' : 's'} running
        </span>
        <span className="mt-1 text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>{message}</span>
      </div>

      {/* Last seven days */}
      <div className="flex items-center justify-between gap-1.5">
        {week.map((d) => {
          const filled = d.active;
          const rest = d.rest && !d.active;
          return (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="flex h-8 w-full items-center justify-center rounded-xl border transition"
                style={{
                  background: filled ? 'var(--grad-primary-cta)' : rest ? 'var(--bg-2)' : 'transparent',
                  borderColor: d.isToday ? 'var(--primary)' : 'var(--border)',
                  borderWidth: d.isToday ? 2 : 1,
                }}
                title={d.date}
              >
                {filled ? (
                  <Check size={13} color="#fff" />
                ) : rest ? (
                  <Moon size={12} style={{ color: 'var(--text-faint)' }} />
                ) : null}
              </div>
              <span className="text-[9px] font-bold" style={{ color: 'var(--text-faint)' }}>{d.initial}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-dim)' }}>
          {activeDays} of the last 7 days
        </span>
        <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--text-dim)' }}>
          <Snowflake size={12} style={{ color: 'var(--info)' }} />
          {freezesLeft} freeze{freezesLeft === 1 ? '' : 's'} left
        </span>
      </div>
    </div>
  );
}
