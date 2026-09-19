/* ---------------- components/shared/MacroBar.jsx ----------------
 * One macro's progress toward its target.
 *
 * The fill is a gradient that runs from the given colour to a lighter
 * companion, so the four bars read as one family rather than four unrelated
 * blocks of colour, and a bar that is over target says so instead of silently
 * capping at 100%.
 */

export function MacroBar({ label, value, target, color, gradient }) {
  const ratio = target > 0 ? value / target : 0;
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  const over = ratio > 1.05;

  // Callers pass a --grad-* token; `color` remains the flat hue used for the
  // label and glow. Falling back to the flat colour keeps older call sites
  // working rather than rendering an empty bar.
  const fill = gradient || color;

  return (
    <div className="flex-1 min-w-[90px]">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          {label}
        </span>
        <span
          className="text-[10px] font-semibold"
          style={{ color: over ? color : 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}
        >
          {value}/{target}g
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: fill,
            // Past target the bar keeps its own colour but picks up a glow,
            // so "hit it" and "well past it" are not the same full bar.
            boxShadow: over ? `0 0 8px ${color}` : 'none',
          }}
        />
      </div>
    </div>
  );
}
