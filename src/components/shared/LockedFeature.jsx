/* ---------------- components/shared/LockedFeature.jsx ----------------
 * What a feature-flagged section shows while it is switched off. Deliberately
 * has no buttons: a locked section with a clickable "Join" that does nothing
 * is worse than one that says plainly it is not open yet.
 */
import { Lock } from 'lucide-react';

export function LockedFeature({ title, description, compact = false }) {
  return (
    <section
      data-testid="locked-feature"
      aria-label={`${title} — coming soon`}
      className={`panel-card rounded-[20px] text-left ${compact ? 'p-5' : 'p-8'}`}
    >
      <div className="flex items-start gap-4">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: 'var(--primary-soft)' }}
        >
          <Lock size={20} style={{ color: 'var(--primary)' }} strokeWidth={2.2} />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[16px] font-black tracking-tight" style={{ color: 'var(--text)' }}>{title}</h3>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
              style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
            >
              Coming soon
            </span>
          </div>
          <p className="mt-1.5 max-w-xl text-[13px] font-medium leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            {description}
          </p>
          <p className="mt-2 text-[12px]" style={{ color: 'var(--text-faint)' }}>
            This opens up once more people are using TitanTrack.
          </p>
        </div>
      </div>
    </section>
  );
}
