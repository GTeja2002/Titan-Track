/* ---------------- components/HealthConnectCard.jsx ----------------
 * Android only. Explains the state of step counting and offers the one
 * action that fixes it. Hidden once steps are connected, and on the web.
 */
import { useEffect } from 'react';
import { Footprints } from 'lucide-react';

const COPY = {
  not_installed: {
    title: 'Count your steps automatically',
    body: 'TitanTrack reads your steps from Health Connect, Google’s free health app. Install it, then come back here.',
    action: 'Install Health Connect',
  },
  needs_permission: {
    title: 'Allow step counting',
    body: 'Let TitanTrack read your step count from Health Connect. It only reads steps — nothing else.',
    action: 'Allow steps',
  },
  error: {
    title: 'Couldn’t read your steps',
    body: 'Health Connect didn’t answer. Open it to check TitanTrack has permission to read steps.',
    action: 'Open Health Connect',
  },
};

export function HealthConnectCard({ health }) {
  const { status, askOnce, requestAccess, install, openSettings } = health;

  // First visit to the Dashboard: ask once, automatically.
  useEffect(() => { askOnce(); }, [askOnce]);

  const copy = COPY[status];
  if (!copy) return null; // unsupported (web), checking, or connected

  const onClick = status === 'not_installed' ? install
    : status === 'needs_permission' ? requestAccess
      : openSettings;

  return (
    <section className="m-card flex items-start gap-3" aria-label="Step counting" style={{ background: 'var(--m-steps-wash)', borderColor: 'var(--m-steps-edge, var(--border))' }}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--m-steps)' }} aria-hidden="true">
        <Footprints size={20} color="#fff" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="section-title">{copy.title}</h2>
        <p className="mt-0.5 text-[13px] leading-snug" style={{ color: 'var(--text-dim)' }}>{copy.body}</p>
        <button
          type="button"
          onClick={onClick}
          className="mt-2.5 min-h-[44px] rounded-xl px-4 text-[13.5px] font-bold text-white transition active:scale-95"
          style={{ background: 'var(--m-steps)' }}
        >
          {copy.action}
        </button>
        {status === 'needs_permission' && (
          <button type="button" onClick={openSettings} className="ml-3 min-h-[44px] text-[12.5px] font-semibold underline" style={{ color: 'var(--text-dim)' }}>
            Open Health Connect
          </button>
        )}
      </div>
    </section>
  );
}
