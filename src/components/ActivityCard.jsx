/* ---------------- components/ActivityCard.jsx ---------------- */

import { useRef } from 'react';
import { Scale, Dumbbell, Footprints, RotateCcw, Zap, ArrowRight, PersonStanding, Target } from 'lucide-react';
import { calculateWalkCalories } from '../lib/calculations.js';
import { walkingKmForDay } from '../lib/activity.js';
import { createEmptyLog } from '../lib/useAppState.js';

export function ActivityCard({ state, update, health = null, onEditProfile }) {
  const log = state.logs[state.currentDate];
  const walkInputRef = useRef(null);

  // Walk (km) and gym (minutes) for the viewed day. Weight is no longer
  // edited here — it belongs to the profile editor (one source of truth).
  // Bounds stop typos and pasted junk from corrupting totals (a negative
  // walk used to make "calories burned" negative).
  const LIMITS = { walk: 200, gym: 1440 }; // km, minutes per day
  const setField = (field, value) => {
    const n = parseFloat(value);
    const val = value === '' ? '' : Math.min(LIMITS[field] ?? Infinity, Math.max(0, Number.isFinite(n) ? n : 0));
    update((prev) => {
      const date = prev.currentDate;
      const currentLog = prev.logs[date] || createEmptyLog();
      return { ...prev, logs: { ...prev.logs, [date]: { ...currentLog, [field]: val } } };
    });
  };

  // Distance from steps (estimated from height) and the walking distance
  // used for calories: steps or a manual walk, whichever is larger.
  const steps = log?.steps || 0;
  const walking = walkingKmForDay(log, state);
  const walkBurn = calculateWalkCalories(walking.km, state.weight ?? 70);

  return (
    <div className="panel-card h-full rounded-[var(--radius-card)] p-[var(--space-card)] flex flex-col text-left">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          <Zap size={15} style={{ color: 'var(--primary)' }} />
          Activity &amp; Gym
        </div>
        {state.gymStarted && (
          <button
            onClick={() => update((prev) => ({ ...prev, gymStarted: false }))}
            className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition hover:scale-105"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          >
            <RotateCcw size={10} /> Reset
          </button>
        )}
      </div>

      {!state.gymStarted ? (
        <button
          onClick={() => update((prev) => ({ ...prev, gymStarted: true }))}
          className="mb-4 flex items-center justify-center gap-2.5 rounded-[14px] py-4 text-[15px] font-bold text-white transition hover:brightness-105 active:scale-[0.99]"
          style={{ background: 'linear-gradient(90deg, #0F6B55 0%, #2AA37F 100%)' }}
        >
          <Dumbbell size={18} /> Start Gym Journey <ArrowRight size={16} />
        </button>
      ) : (
        <div className="mb-4 rounded-2xl border p-4" style={{ background: 'var(--primary-soft)', borderColor: 'var(--primary)' }}>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--primary)' }}>
            <Dumbbell size={13} /> Gym Burn (kcal)
          </label>
          <input
            type="number"
            value={log?.gym || ''}
            onChange={(e) => setField('gym', e.target.value)}
            placeholder="0"
            className="w-full rounded-xl border bg-transparent px-3 py-2.5 text-lg font-bold outline-none"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-3.5 flex-1">
        <div className="rounded-[16px] border p-4 flex flex-col" style={{ background: 'var(--surface-solid)', borderColor: 'var(--border)' }}>
          <div className="mb-3 flex items-center gap-2">
            <PersonStanding size={17} style={{ color: 'var(--primary)' }} />
            <span className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>Today&apos;s Activity</span>
          </div>

          <label className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--text-dim)' }}>
            <Footprints size={15} style={{ color: 'var(--m-water)' }} /> Walking
          </label>
          <input
            type="number"
            step="0.1"
            value={log?.walk || ''}
            onChange={(e) => setField('walk', e.target.value)}
            placeholder="0"
            ref={walkInputRef}
            aria-label="Walking distance in kilometres"
            className="w-full bg-transparent text-[28px] font-bold outline-none"
            style={{ color: 'var(--text)' }}
          />
          <div className="mt-0.5 flex items-center justify-between text-[12px]" style={{ color: 'var(--text-dim)' }}>
            <span>km logged by hand</span>
            {walkBurn > 0 && <span style={{ color: 'var(--m-water-ink)' }}>~{walkBurn} kcal</span>}
          </div>
          {walking.fromSteps > 0 && (
            <p className="mt-1.5 text-[12px] leading-snug" style={{ color: 'var(--text-dim)' }}>
              {walking.source === 'steps'
                ? <>Using <strong style={{ color: 'var(--text)' }}>{walking.fromSteps} km</strong> from your steps for calories.</>
                : <>Steps ≈ {walking.fromSteps} km; your logged walk is longer, so that is used.</>}
            </p>
          )}

          <button
            type="button"
            onClick={() => walkInputRef.current?.focus()}
            className="mt-auto flex items-center justify-center gap-1.5 rounded-[12px] py-2.5 text-[13px] font-bold transition hover:brightness-[0.97] active:scale-[0.99]"
            style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
          >
            Log Activity <ArrowRight size={14} />
          </button>
        </div>

        <div className="rounded-[16px] border p-4 flex gap-4" style={{ background: 'var(--surface-solid)', borderColor: 'var(--border)' }}>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <Scale size={17} style={{ color: 'var(--primary)' }} />
              <span className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>Today&apos;s Stats</span>
            </div>

            <label className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--text-dim)' }}>
              <Scale size={15} style={{ color: 'var(--m-steps)' }} /> Weight
            </label>
            <p className="text-[28px] font-bold leading-tight" style={{ color: (log?.weight || state.weight) ? 'var(--text)' : 'var(--text-faint)' }}>
              {log?.weight || state.weight || '—'}
            </p>
            <div className="mt-0.5 text-[12px]" style={{ color: 'var(--text-dim)' }}>kg{log?.weight ? ' today' : ' (profile)'}</div>
            {onEditProfile && (
              <button type="button" onClick={onEditProfile} className="mt-2 w-fit min-h-[36px] rounded-lg px-3 text-[12px] font-bold" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                Update weight
              </button>
            )}
          </div>

          <div
            className="relative hidden sm:flex w-[46%] shrink-0 flex-col justify-center overflow-hidden rounded-[14px] p-3.5"
            style={{ background: 'var(--primary-soft)' }}
          >
            <Target size={18} style={{ color: 'var(--primary)' }} className="mb-2" />
            <p className="text-[12.5px] font-semibold leading-snug" style={{ color: 'var(--text)' }}>
              Small steps every day lead to big results!
            </p>
            <img
              src="/assets/decor/leaf.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-3 -right-4 w-[64%] object-contain opacity-70"
            />
          </div>
        </div>
      </div>

      <StepsPanel steps={steps} km={walking.fromSteps} health={health} />
    </div>
  );
}

/** Today's steps, the distance they add up to, and — on Android — what
 *  Health Connect last returned, so a problem is visible rather than silent. */
function StepsPanel({ steps, km, health }) {
  const status = health?.status;
  const read = health?.lastRead || {};
  const timeLabel = read.at ? new Date(read.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
  const onAndroid = status && status !== 'unsupported';

  let note = null;
  if (onAndroid) {
    if (status === 'connected' && read.steps === 0) {
      note = 'Health Connect has no steps for today yet. Make sure an app that counts steps (Google Fit, Samsung Health, Fitbit or your phone’s fitness app) is set to share steps with Health Connect.';
    } else if (status === 'error') {
      note = `Couldn’t read steps: ${read.error || 'Health Connect did not answer.'}`;
    } else if (status === 'needs_permission') {
      note = 'TitanTrack doesn’t have permission to read your steps yet.';
    } else if (status === 'not_installed') {
      note = 'Health Connect isn’t installed on this phone.';
    }
  }

  return (
    <section className="mt-3.5 rounded-[16px] border p-4" style={{ background: 'var(--m-steps-wash)', borderColor: 'var(--m-steps-edge, var(--border))' }} aria-label="Steps today">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[13px] font-bold" style={{ color: 'var(--m-steps-ink)' }}>
            <Footprints size={15} /> Steps today
          </p>
          <p className="mt-1 text-[26px] font-extrabold leading-none tabular-nums" style={{ color: 'var(--text)' }}>{steps.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-semibold" style={{ color: 'var(--text-dim)' }}>Distance (est.)</p>
          <p className="text-[20px] font-extrabold leading-tight tabular-nums" style={{ color: 'var(--text)' }}>{km} km</p>
        </div>
      </div>

      {onAndroid && (
        <p className="mt-2 text-[12px]" style={{ color: 'var(--text-dim)' }}>
          Health Connect: {status === 'connected' ? 'connected' : status.replace('_', ' ')}
          {timeLabel ? ` · last read ${timeLabel}` : ''}
          {read.steps != null ? ` · ${read.steps.toLocaleString()} steps found` : ''}
        </p>
      )}
      {note && <p className="mt-1.5 text-[12.5px] leading-snug" style={{ color: 'var(--text)' }}>{note}</p>}

      {onAndroid && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {status === 'needs_permission' && (
            <button type="button" onClick={health.requestAccess} className="min-h-[40px] rounded-lg px-3 text-[12.5px] font-bold text-white" style={{ background: 'var(--m-steps)' }}>Allow steps</button>
          )}
          {status === 'not_installed' && (
            <button type="button" onClick={health.install} className="min-h-[40px] rounded-lg px-3 text-[12.5px] font-bold text-white" style={{ background: 'var(--m-steps)' }}>Install Health Connect</button>
          )}
          <button type="button" onClick={health.refresh} className="min-h-[40px] rounded-lg border px-3 text-[12.5px] font-bold" style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--surface-solid)' }}>Refresh steps</button>
          <button type="button" onClick={health.openSettings} className="min-h-[40px] rounded-lg border px-3 text-[12.5px] font-bold" style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--surface-solid)' }}>Open Health Connect</button>
        </div>
      )}
    </section>
  );
}
