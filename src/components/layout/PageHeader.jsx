/* ---------------- components/layout/PageHeader.jsx ----------------
 * The one page title used by every tab, so headings share size, spacing and
 * weight instead of each page inventing its own (one was 30px, one a card,
 * one had none).
 */
export function PageHeader({ title, subtitle, icon: Icon, action }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--primary-soft)' }}
            aria-hidden="true"
          >
            <Icon size={20} style={{ color: 'var(--primary)' }} strokeWidth={2.2} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-[22px] lg:text-[26px] font-black leading-tight tracking-tight" style={{ color: 'var(--text)' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-[13px] font-medium leading-snug" style={{ color: 'var(--text-dim)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
