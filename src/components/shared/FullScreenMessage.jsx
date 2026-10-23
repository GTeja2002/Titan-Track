/* ---------------- components/shared/FullScreenMessage.jsx ---------------- */
import { Activity, Loader2 } from 'lucide-react';

/** A calm full-screen state for "checking sign-in" / "restoring data". */
export function FullScreenMessage({ title, body }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-sm text-center" role="status" aria-live="polite">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'var(--primary)' }}>
          <Activity size={22} color="#fff" />
        </div>
        <h1 className="text-lg font-black" style={{ color: 'var(--text)' }}>{title}</h1>
        <p className="mt-1.5 text-[13px]" style={{ color: 'var(--text-dim)' }}>{body}</p>
        <Loader2 size={20} className="mx-auto mt-4 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    </div>
  );
}
