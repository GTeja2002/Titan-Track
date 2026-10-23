/* ---------------- components/SettingsPage.jsx ----------------
 * Profile & settings. On phones this is the "Profile" tab of the bottom bar,
 * so it also holds the less-frequent destinations (Community) that do not
 * earn a slot in the tab bar. Laid out as grouped rows with full-width touch
 * targets, the Android settings pattern.
 */
import { ChevronRight, Moon, RefreshCw, Users, UserCog, RotateCcw, Trash2, LogOut, Lock } from 'lucide-react';
import { PageHeader } from './layout/PageHeader.jsx';
import { DataExportCard, DeleteAccountCard } from './AccountCards.jsx';

function Group({ title, children }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 px-1 text-[12px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--text-faint)' }}>{title}</h2>
      <div className="m-card !p-0 overflow-hidden">{children}</div>
    </section>
  );
}

function Row({ icon: Icon, label, detail, onClick, right, danger, first }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="flex w-full min-h-[56px] items-center gap-3 px-4 py-3 text-left transition active:bg-black/5"
      style={{ borderTop: first ? 'none' : '1px solid var(--border)' }}
    >
      {Icon && <Icon size={19} className="shrink-0" style={{ color: danger ? 'var(--danger)' : 'var(--text-dim)' }} />}
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold leading-snug" style={{ color: danger ? 'var(--danger)' : 'var(--text)' }}>{label}</span>
        {detail && <span className="mt-0.5 block text-[12px] leading-snug" style={{ color: 'var(--text-dim)' }}>{detail}</span>}
      </span>
      {right ?? (onClick ? <ChevronRight size={18} style={{ color: 'var(--text-faint)' }} /> : null)}
    </Tag>
  );
}

function Switch({ on, label }) {
  return (
    <span
      role="switch"
      aria-checked={on}
      aria-label={label}
      className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition"
      style={{ background: on ? 'var(--primary)' : 'var(--border-strong)' }}
    >
      <span className="absolute h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: on ? 24 : 4 }} />
    </span>
  );
}

export function SettingsPage({
  state, cloud, flags, syncStatus, saveStatusLabel, statusIsBad,
  onToggleTheme, onSyncNow, onEditProfile, onRerunOnboarding, onOpenCommunity,
  onClearHistory, onLogout, onDeleteAccount,
}) {
  const name = state.name || (state.email || '').split('@')[0];
  return (
    <div className="page-stack animate-fade-in">
      <PageHeader title="Profile" subtitle="Your account, preferences and data." />

      <div className="m-card flex items-center gap-3.5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[20px] font-black text-white" style={{ background: 'var(--grad-primary-cta)' }}>
          {(name || 'U').charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-extrabold" style={{ color: 'var(--text)' }}>{name}</p>
          <p className="truncate text-[12.5px]" style={{ color: 'var(--text-dim)' }}>{state.email}</p>
          <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-faint)' }}>
            {cloud ? 'Cloud account · syncs across devices' : 'Local profile · this browser only'}
          </p>
        </div>
      </div>

      <Group title="Profile">
        <Row first icon={UserCog} label="Edit profile & body stats" detail="Age, height, weight, goal" onClick={onEditProfile} />
        <Row icon={RotateCcw} label="Re-run setup" detail="Go through onboarding again" onClick={onRerunOnboarding} />
      </Group>

      <Group title="Preferences">
        <Row first icon={Moon} label="Dark mode" onClick={onToggleTheme} right={<Switch on={!!state.isDarkMode} label="Dark mode" />} />
      </Group>

      {cloud && (
        <Group title="Cloud sync">
          <Row
            first
            icon={RefreshCw}
            label={syncStatus.phase === 'syncing' ? 'Syncing…' : 'Sync now'}
            detail={
              <span style={{ color: statusIsBad ? 'var(--danger)' : undefined }}>
                {saveStatusLabel}
                {syncStatus.lastSyncedAt ? ` · last synced ${new Date(syncStatus.lastSyncedAt).toLocaleString()}` : ''}
              </span>
            }
            onClick={syncStatus.phase === 'syncing' ? undefined : onSyncNow}
          />
        </Group>
      )}

      <Group title="More">
        <Row
          first
          icon={Users}
          label="Community & Competitions"
          detail={flags.competitions ? 'Challenges and leaderboard' : 'Coming soon'}
          onClick={onOpenCommunity}
          right={flags.competitions ? undefined : <Lock size={16} style={{ color: 'var(--text-faint)' }} />}
        />
      </Group>

      <DataExportCard state={state} />

      <Group title="Account">
        <Row
          first
          icon={Trash2}
          label="Clear log history"
          detail={`Deletes all past days, keeps today${cloud ? ' — also removed from your account on every device' : ''}.`}
          onClick={onClearHistory}
          danger
        />
        <Row
          icon={LogOut}
          label="Sign out"
          detail={cloud ? 'Your data stays in your account and is removed from this device.' : 'Closes this local profile; its data stays in this browser.'}
          onClick={onLogout}
          danger
        />
      </Group>

      {cloud && <DeleteAccountCard onDelete={onDeleteAccount} />}
    </div>
  );
}
