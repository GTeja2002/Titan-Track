/* ---------------- components/MetricCard.jsx ----------------
 * One headline daily number (calories, protein, water, steps).
 *
 * Built for a phone first: compact enough that four fit as a 2×2 grid on a
 * 320px screen, the value is the largest thing on the card, the target sits
 * on its own line so long numbers never collide with it, and the whole card
 * is one touch target that opens the related screen. Each metric owns a hue
 * (the --m-* tokens) used only on the icon, label and bar.
 */
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
  const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : n);
  const pct = Math.max(0, Math.min(100, Math.round(progress || 0)));
  const unitText = unit ? ` ${unit}` : '';
  const Tag = onOpen ? 'button' : 'div';

  return (
    <Tag
      type={onOpen ? 'button' : undefined}
      onClick={onOpen}
      aria-label={`${label}: ${fmt(value)} of ${fmt(target)}${unitText}. ${footnote || ''}`}
      className="metric-card flex min-w-0 flex-col rounded-[var(--radius-card)] p-3.5 text-left transition active:scale-[0.98]"
      style={{
        background: `var(--m-${metric}-wash)`,
        border: `1px solid var(--m-${metric}-edge, var(--border))`,
      }}
    >
      <span className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `var(--m-${metric})` }}
          aria-hidden="true"
        >
          <Icon size={15} color="#fff" strokeWidth={2.4} />
        </span>
        <span className="text-[13px] font-bold leading-tight" style={{ color: `var(--m-${metric}-ink)` }}>
          {label}
        </span>
      </span>

      <span className="mt-2.5 block text-[24px] font-extrabold leading-none tracking-tight tabular-nums" style={{ color: 'var(--text)' }}>
        {fmt(value)}
      </span>
      <span className="mt-1 block text-[12px] font-semibold leading-tight" style={{ color: 'var(--text-dim)' }}>
        of {fmt(target)}{unitText}
      </span>

      <span
        className="mt-2.5 block h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: `var(--m-${metric}-track)` }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${label} progress`}
      >
        <span
          className="block h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `var(--m-${metric})` }}
        />
      </span>

      {footnote && (
        <span className="mt-1.5 block text-[11.5px] font-medium leading-snug" style={{ color: 'var(--text-dim)' }}>
          {footnote}
        </span>
      )}
    </Tag>
  );
}
