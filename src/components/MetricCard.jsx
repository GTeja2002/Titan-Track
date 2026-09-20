/* ---------------- components/MetricCard.jsx ----------------
 * One of the four headline numbers on the dashboard.
 *
 * Each metric owns a hue, carried through a tinted card, a solid icon disc and
 * the progress bar, so the row reads as four different things at a glance
 * rather than four white boxes. Colours come from the --m-* token family, so a
 * card never hardcodes one.
 */
import { ChevronRight } from 'lucide-react';

export function MetricCard({
  metric,          // 'calories' | 'protein' | 'water' | 'steps'
  icon: Icon,
  label,
  value,
  target,
  unit = '',
  footnote,
  progress = 0,    // 0-100
  onOpen,
}) {
  const v = (n) => (typeof n === 'number' ? n.toLocaleString() : n);

  return (
    <div
      className="metric-card relative rounded-[18px] p-5 overflow-hidden transition duration-300 hover:-translate-y-1"
      style={{
        // A flat, very light tint. The colour belongs in the icon, the label
        // and the bar — not spread across the whole card, which made four
        // metrics compete with the hero.
        background: `var(--m-${metric}-wash)`,
        border: `1px solid var(--m-${metric}-edge)`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
            style={{ background: `var(--m-${metric})` }}
          >
            <Icon size={19} color="#fff" strokeWidth={2.4} />
          </span>
          <span
            className="text-[10px] font-black uppercase tracking-[0.07em]"
            style={{ color: `var(--m-${metric}-ink)` }}
          >
            {label}
          </span>
        </div>

        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Open ${label}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition hover:scale-110 active:scale-95"
            style={{ background: 'var(--surface-solid)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          >
            <ChevronRight size={14} style={{ color: `var(--m-${metric}-ink)` }} />
          </button>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="text-[26px] font-bold leading-none tracking-tight" style={{ color: 'var(--text)' }}>
          {v(value)}
        </span>
        <span className="text-[12.5px] font-semibold" style={{ color: 'var(--text-dim)' }}>
          / {v(target)}{unit}
        </span>
      </div>

      <p className="mt-1 text-[11.5px] font-medium" style={{ color: 'var(--text-dim)' }}>
        {footnote}
      </p>

      <div
        className="mt-3 h-1.5 w-full rounded-full overflow-hidden"
        style={{ background: 'var(--m-' + metric + '-track)' }}
      >
        {progress > 0 && (
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, progress)}%`,
              background: `var(--m-${metric})`,
            }}
          />
        )}
      </div>
    </div>
  );
}
