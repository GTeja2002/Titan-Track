/* ---------------- components/WellbeingCard.jsx ----------------
 * A daily check-in for the things that explain a hard week better than a
 * weight number does: sleep, mood and energy — plus cycle phase for anyone
 * who turns it on.
 *
 * Health for this audience is not only body metrics, and none of these need a
 * scale or a measurement. Every control is one tap, because a check-in that
 * takes effort does not get filled in.
 */
import { useMemo } from 'react';
import { Moon, Smile, Zap, Droplets, Check } from 'lucide-react';
import { cycleStatus } from '../lib/cycle.js';
import { createEmptyLog } from '../lib/useAppState.js';

const MOODS = [
  { id: 'rough', label: 'Rough', emoji: '😞' },
  { id: 'meh', label: 'Meh', emoji: '😐' },
  { id: 'ok', label: 'OK', emoji: '🙂' },
  { id: 'good', label: 'Good', emoji: '😄' },
  { id: 'great', label: 'Great', emoji: '🤩' },
];

const SLEEP_OPTIONS = [4, 5, 6, 7, 8, 9];
const ENERGY_LEVELS = [1, 2, 3, 4, 5];

export function WellbeingCard({ state, update }) {
  const date = state.currentDate;
  const log = state.logs?.[date] || {};

  const setField = (field, value) => {
    update((prev) => {
      const day = prev.logs[prev.currentDate] || createEmptyLog();
      // Tapping the active value clears it, so a mis-tap is undoable.
      const next = day[field] === value ? null : value;
      return {
        ...prev,
        logs: { ...prev.logs, [prev.currentDate]: { ...day, [field]: next } },
      };
    });
  };

  const cycle = useMemo(() => cycleStatus(state.cycle, date), [state.cycle, date]);

  const startPeriodToday = () => {
    update((prev) => ({
      ...prev,
      cycle: { ...(prev.cycle || {}), enabled: true, lastPeriodStart: prev.currentDate },
    }));
  };

  return (
    <div className="glass h-full rounded-3xl p-6 flex flex-col" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          <Smile size={14} style={{ color: 'var(--primary)' }} />
          How are you doing?
        </div>
        {(log.sleep || log.mood || log.energy) && (
          <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: 'var(--primary)' }}>
            <Check size={12} /> Checked in
          </span>
        )}
      </div>

      {/* Mood */}
      <div className="mb-4">
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Mood</span>
        <div className="flex gap-1.5">
          {MOODS.map((m) => {
            const active = log.mood === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setField('mood', m.id)}
                aria-pressed={active}
                aria-label={m.label}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-xl border py-2 transition hover:scale-105 active:scale-95"
                style={{
                  background: active ? 'var(--primary-soft)' : 'var(--surface)',
                  borderColor: active ? 'var(--primary)' : 'var(--border)',
                }}
              >
                <span className="text-base leading-none">{m.emoji}</span>
                <span className="text-[9px] font-bold" style={{ color: active ? 'var(--primary)' : 'var(--text-faint)' }}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sleep */}
      <div className="mb-4">
        <span className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          <Moon size={10} /> Sleep {log.sleep ? `· ${log.sleep}h` : ''}
        </span>
        <div className="flex gap-1.5">
          {SLEEP_OPTIONS.map((h) => {
            const active = log.sleep === h;
            return (
              <button
                key={h}
                onClick={() => setField('sleep', h)}
                className="flex-1 rounded-xl border py-2 text-[11px] font-bold transition hover:scale-105 active:scale-95"
                style={{
                  background: active ? 'var(--primary)' : 'var(--surface)',
                  borderColor: active ? 'var(--primary)' : 'var(--border)',
                  color: active ? '#fff' : 'var(--text-dim)',
                }}
              >
                {h === 9 ? '9+' : h}h
              </button>
            );
          })}
        </div>
      </div>

      {/* Energy */}
      <div className="mb-4">
        <span className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          <Zap size={10} /> Energy
        </span>
        <div className="flex gap-1.5">
          {ENERGY_LEVELS.map((lvl) => {
            const active = (log.energy || 0) >= lvl;
            return (
              <button
                key={lvl}
                onClick={() => setField('energy', lvl)}
                aria-label={`Energy ${lvl} of 5`}
                className="h-7 flex-1 rounded-lg border transition hover:scale-105 active:scale-95"
                style={{
                  background: active ? 'var(--primary)' : 'var(--surface)',
                  borderColor: active ? 'var(--primary)' : 'var(--border)',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Cycle — only for people who turned it on */}
      {state.cycle?.enabled && (
        <div className="mt-auto rounded-2xl border p-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
              <Droplets size={11} style={{ color: 'var(--danger)' }} /> Cycle
            </span>
            <button
              onClick={startPeriodToday}
              className="rounded-full border px-2.5 py-1 text-[10px] font-bold transition hover:scale-105 active:scale-95"
              style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
            >
              Period started today
            </button>
          </div>
          {cycle ? (
            <div className="mt-2">
              <p className="text-xs font-black" style={{ color: 'var(--text)' }}>
                Day {cycle.day} · {cycle.phase.label}
              </p>
              <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-dim)' }}>{cycle.phase.blurb}</p>
              <p className="mt-1 text-[10px]" style={{ color: 'var(--text-faint)' }}>
                Next period in about {cycle.daysToNextPeriod} day{cycle.daysToNextPeriod === 1 ? '' : 's'} — an estimate from your own dates.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-[10px]" style={{ color: 'var(--text-dim)' }}>
              Mark the first day of your period to start tracking phases.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
