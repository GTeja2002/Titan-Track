/* ---------------- components/shared/MacroBar.jsx ---------------- */

export function MacroBar({ label, value, target, color }) {
  const pct = target > 0 ? Math.max(0, Math.min(100, Math.round((value / target) * 100))) : 0;
  return (
    <div className="flex-1 min-w-[90px]">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>{label}</span>
        <span className="text-[10px] font-semibold" style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{value}/{target}g</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

