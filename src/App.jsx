/* ---------------- App.jsx ---------------- */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Moon, Sun, Activity, Dumbbell, Settings as SettingsIcon, User,
  Calendar, Utensils, Home, BarChart3, Users, Flame, Lightbulb,
} from 'lucide-react';
import { useAppState } from './lib/useAppState.js';
import { LoginScreen } from './components/LoginScreen.jsx';
import { OnboardingScreen } from './components/OnboardingScreen.jsx';
import { GoalCard } from './components/GoalCard.jsx';
import { ConsistencyCard } from './components/ConsistencyCard.jsx';
import { WellbeingCard } from './components/WellbeingCard.jsx';
import { isScaleGoal } from './lib/goals.js';
import { EnergyCard } from './components/EnergyCard.jsx';
import { FoodLogCard } from './components/FoodLogCard.jsx';
import { TrendCard } from './components/TrendCard.jsx';
import { ActivityCard } from './components/ActivityCard.jsx';
import { CalendarModal } from './components/CalendarModal.jsx';
import { BodyCompositionDashboard } from './components/BodyCompositionDashboard.jsx';
import { HealthWellnessInsights } from './components/HealthWellnessInsights.jsx';
import { ProfileDrawer } from './components/ProfileDrawer.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { PersonalizedPlanCard } from './components/PersonalizedPlanCard.jsx';
import { NutritionOverview } from './components/NutritionOverview.jsx';
import { getLocalDateString } from './lib/date.js';
import { computeStreak, MAX_FREEZES } from './lib/streak.js';
import { MetricRow } from './components/MetricRow.jsx';
import { CommunityPage } from './components/CommunityPage.jsx';
import { LockedFeature } from './components/shared/LockedFeature.jsx';
import { useFeatureFlags } from './lib/useFeatureFlags.js';
import { FullScreenMessage } from './components/shared/FullScreenMessage.jsx';
import { HistoryCard } from './components/HistoryCard.jsx';
import { SettingsPage } from './components/SettingsPage.jsx';
import { PageHeader } from './components/layout/PageHeader.jsx';
import { OfflineBanner } from './components/shared/OfflineBanner.jsx';
import { startNativeShell, applyStatusBar } from './lib/nativeShell.js';
import { useKeyboardAware } from './lib/useKeyboardAware.js';
import { useHealthSteps } from './lib/useHealthSteps.js';

/**
 * The app's sections. `label` is the desktop sidebar name; `short` is the
 * phone tab-bar label. `phone: false` sections are not in the tab bar —
 * five destinations is the most a phone bar holds comfortably — and are
 * reached from Profile instead.
 */
const NAV_TABS = [
  { id: 'Dashboard', label: 'Dashboard', short: 'Home', icon: Home },
  { id: 'Nutrition', label: 'Nutrition', short: 'Meals', icon: Utensils },
  { id: 'Workouts', label: 'Workouts', short: 'Activity', icon: Dumbbell },
  { id: 'Progress', label: 'Progress', short: 'Progress', icon: BarChart3 },
  { id: 'Community', label: 'Community', short: 'Community', icon: Users, phone: false },
  { id: 'Settings', label: 'Settings', short: 'Profile', icon: SettingsIcon, phoneIcon: User },
];
const PHONE_TABS = NAV_TABS.filter((t) => t.phone !== false);

/** Warmups suggested on the Workouts page. Static guidance, not a plan. */
const WARMUPS = [
  'Dynamic Stretching (5m)',
  'Joint Mobility Prep (5m)',
  'Light Jogging on Spot (3m)',
];

/** The footer/settings sync line. Says what actually happened, never just
 *  "synced" because Supabase happens to be configured. */
function syncStatusLabel(sync, cloud) {
  if (!cloud) return 'auto-saved on this device';
  switch (sync.phase) {
    case 'synced': return 'saved to your account';
    case 'syncing': return 'syncing…';
    case 'pending': return `saved on this device · ${sync.pending} change${sync.pending === 1 ? '' : 's'} waiting to sync`;
    case 'offline': return 'offline — saved on this device, will sync when back online';
    case 'error': return 'saved on this device · cloud sync failed, will retry';
    default: return 'saved on this device';
  }
}

/** On phones every card stacks in one column, in order of how often it is
 *  used; on desktop the same cards sit in two columns. `display: contents`
 *  on the column wrappers lets their children take part in the phone order. */
// Literal class strings: Tailwind only generates classes it can see in source.
const PHONE_ORDER = {
  1: 'order-1 lg:order-none',
  2: 'order-2 lg:order-none',
  3: 'order-3 lg:order-none',
  4: 'order-4 lg:order-none',
  5: 'order-5 lg:order-none',
};
const phoneOrder = (n) => PHONE_ORDER[n];

export default function App() {
  const {
    state,
    update,
    storageFailed,
    cloud,
    authReady,
    restoring,
    syncStatus,
    syncNow,
    login,
    logout,
    deleteAccount,
    completeOnboarding,
    clearLogsHistory,
    addAvailableFood,
    removeAvailableFood,
    applyPlanFilters
  } = useAppState();
  const [activeTab, setActiveTabRaw] = useState('Dashboard');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Tab history, so Android back retraces the user's steps instead of
  // always jumping home.
  const tabHistory = useRef([]);
  const setActiveTab = useCallback((id) => {
    setActiveTabRaw((prev) => {
      if (prev !== id) tabHistory.current = [...tabHistory.current, prev].slice(-10);
      return id;
    });
  }, []);

  // A new tab starts at its top, like a native screen.
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }, [activeTab]);

  // Android back: overlays close first (lib/dismiss.js), then the previous
  // tab, then the app is backgrounded.
  useEffect(() => {
    startNativeShell({
      onBack: () => {
        const prev = tabHistory.current.pop();
        if (prev) {
          setActiveTabRaw(prev);
          return true;
        }
        return false;
      },
      onAuthError: (msg) => window.alert(`Sign-in failed: ${msg}`),
    });
  }, []);

  useKeyboardAware();
  // Android: today's steps from Health Connect (no-op on the web).
  const health = useHealthSteps({ enabled: !!state.email && !!state.isOnboarded, update });
  useEffect(() => { applyStatusBar(!!state.isDarkMode); }, [state.isDarkMode]);

  const toggleTheme = () => update((prev) => ({ ...prev, isDarkMode: !prev.isDarkMode }));
  const onSelectDate = (date) => update((prev) => ({ ...prev, currentDate: date }));

  const isToday = state.currentDate === getLocalDateString();
  const todayLabel = state.email && state.isOnboarded && isToday
    ? 'Today'
    : new Date((state.currentDate || getLocalDateString()) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // The indicator has to reflect what actually happened, not just whether
  // Supabase is configured: storage can be blocked or full, in which case
  // nothing was saved anywhere and the user needs to know.
  const saveStatusLabel = storageFailed
    ? 'could not save — storage full or blocked'
    : syncStatusLabel(syncStatus, cloud);
  const statusIsBad = storageFailed || syncStatus.phase === 'error';

  const flags = useFeatureFlags();

  if (!authReady) {
    return <FullScreenMessage title="TitanTrack" body="Checking your sign-in…" />;
  }

  if (!state.email) {
    return <LoginScreen cloud={cloud} onLocalLogin={login} />;
  }

  if (restoring) {
    return <FullScreenMessage title="Restoring your data" body="Fetching your logs from the cloud. This only happens the first time on a new device." />;
  }

  if (!state.isOnboarded) {
    return <OnboardingScreen email={state.email} initialState={state} onComplete={completeOnboarding} onLogout={logout} />;
  }

  const username = state.name || (state.email || '').split('@')[0];

  // The workouts page shows the same streak as the dashboard, read from the
  // one implementation rather than counted again here.
  const workoutStreak = computeStreak(state.logs, state.currentDate, {
    restDays: state.restDays || [],
    freezesAvailable: state.streakFreezes ?? MAX_FREEZES,
  }).streak;

  const iconButton = 'flex h-11 w-11 items-center justify-center rounded-xl border transition active:scale-95';

  return (
    <div className="min-h-screen flex text-[var(--text)]" style={{ background: 'var(--bg)' }}>

      {/* Desktop: persistent sidebar */}
      <aside className="sidebar-rail hidden lg:flex flex-col fixed top-0 bottom-0 left-0 w-[268px] z-50 flex-shrink-0 animate-fade-in">
        <img
          src="/assets/decor/leaf.png"
          alt=""
          aria-hidden="true"
          className="sidebar-leaf pointer-events-none select-none"
        />

        <div className="relative z-10 flex h-full flex-col px-5 pt-7 pb-6">
          <button type="button" className="mb-9 flex items-center gap-3 text-left" onClick={() => setActiveTab('Dashboard')}>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-lg shrink-0">
              <Activity size={22} style={{ color: 'var(--rail-accent)' }} />
            </span>
            <span className="leading-tight">
              <span className="block text-[17px] font-black tracking-[0.06em] text-white">TITANTRACK</span>
              <span className="block text-[10px] font-semibold mt-0.5" style={{ color: 'var(--rail-muted)' }}>
                Better Food &middot; Healthier You
              </span>
            </span>
          </button>

          <nav aria-label="Main" className="flex-1 space-y-1.5 overflow-y-auto drawer-scroll -mx-1 px-1">
            {NAV_TABS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`rail-link w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] font-bold text-left transition duration-150 ${active ? 'rail-link-active' : ''}`}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl px-1.5 py-2 text-left transition hover:bg-white/5 active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white shrink-0" style={{ background: 'var(--rail-avatar)' }}>
              {(username || 'U').charAt(0).toUpperCase()}
            </span>
            <span className="overflow-hidden">
              <span className="block truncate text-[13px] font-bold text-white">{username}</span>
              <span className="block text-[10px] font-bold tracking-[0.12em] uppercase mt-0.5" style={{ color: 'var(--rail-muted)' }}>
                View profile
              </span>
            </span>
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 lg:pl-[268px] flex flex-col min-h-screen">
        <OfflineBanner />

        {/* Phone: compact sticky top bar — brand, date, theme */}
        <header className="mobile-topbar lg:hidden px-[calc(var(--space-page)+var(--safe-left))]">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setActiveTab('Dashboard')} className="flex min-h-[44px] min-w-0 items-center gap-2" aria-label="TitanTrack home">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--primary)' }}>
                <Activity size={17} color="#fff" />
              </span>
              <span className="truncate text-[15px] font-black tracking-tight" style={{ color: 'var(--text)' }}>TitanTrack</span>
            </button>
            <div className="flex shrink-0 items-center gap-2">
              <CalendarModal state={state} onSelectDate={onSelectDate} />
              <button
                onClick={toggleTheme}
                className={iconButton}
                aria-label={state.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                style={{ borderColor: 'var(--border)', background: 'var(--surface-solid)', color: 'var(--text)' }}
              >
                {state.isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>
          </div>
        </header>

        <div className="app-content flex-1 flex flex-col w-full mx-auto pt-2 lg:pt-6 max-w-[1500px]">

          {/* Desktop top bar */}
          <header className="hidden lg:flex mb-6 items-center justify-between gap-4 p-3 px-6 rounded-3xl glass border shadow-sm animate-fade-in" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-[var(--text-faint)]">Workspace</span>
              <span className="text-[var(--text-faint)]">/</span>
              <span className="text-[var(--text)]">{NAV_TABS.find((t) => t.id === activeTab)?.label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarModal state={state} onSelectDate={onSelectDate} />
              <button
                onClick={toggleTheme}
                className="w-9 h-9 rounded-xl border flex items-center justify-center text-[var(--text)] hover:text-amber-500 transition active:scale-95"
                aria-label={state.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                style={{ borderColor: 'var(--border)' }}
              >
                {state.isDarkMode ? <Moon size={15} /> : <Sun size={15} />}
              </button>
            </div>
          </header>

          {!isToday && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <span>Viewing {todayLabel} — changes apply to that day</span>
              <button onClick={() => onSelectDate(getLocalDateString())} className="min-h-[36px] shrink-0 rounded-lg px-3 font-bold underline">Back to today</button>
            </div>
          )}

          <main className="tab-viewport flex-grow min-w-0">

            {activeTab === 'Dashboard' && (
              <Dashboard
                state={state}
                update={update}
                onNavigate={setActiveTab}
                addAvailableFood={addAvailableFood}
                removeAvailableFood={removeAvailableFood}
                applyPlanFilters={applyPlanFilters}
                flags={flags}
                health={health}
              />
            )}

            {activeTab === 'Nutrition' && (
              <div className="page-stack animate-fade-in">
                <PageHeader icon={Utensils} title="Meals" subtitle="Log what you eat and keep an eye on your targets." />

                <div className="flex flex-col gap-[var(--space-section)] lg:grid lg:grid-cols-12 lg:items-start">
                  <div className="contents lg:flex lg:col-span-5 lg:flex-col lg:gap-[var(--space-section)]">
                    {/* A "% to goal weight" ring is meaningless for a goal
                        that is not about the scale, so those goals get a
                        consistency streak as their headline instead. */}
                    <div className={phoneOrder(4)}>
                      {isScaleGoal(state.goal) || state.trackWeight
                        ? <GoalCard state={state} update={update} />
                        : <ConsistencyCard state={state} />}
                    </div>
                    <div className={phoneOrder(3)}><EnergyCard state={state} /></div>
                  </div>
                  <div className="contents lg:flex lg:col-span-7 lg:flex-col lg:gap-[var(--space-section)]">
                    <div className={phoneOrder(1)}><FoodLogCard state={state} update={update} /></div>
                    <div className={phoneOrder(2)}><NutritionOverview state={state} onViewDetails={() => setActiveTab('Progress')} /></div>
                  </div>
                </div>

                <PersonalizedPlanCard
                  state={state}
                  update={update}
                  addAvailableFood={addAvailableFood}
                  removeAvailableFood={removeAvailableFood}
                  applyPlanFilters={applyPlanFilters}
                  onEditProfile={() => setIsProfileOpen(true)}
                />
              </div>
            )}

            {activeTab === 'Workouts' && (
              <div className="page-stack animate-fade-in">
                <PageHeader icon={Dumbbell} title="Activity" subtitle="Walks, workouts and how today is adding up." />

                <div className="flex flex-col gap-[var(--space-section)] lg:grid lg:grid-cols-12 lg:items-start">
                  <div className="contents lg:flex lg:col-span-8 lg:flex-col lg:gap-[var(--space-section)]">
                    <div className={phoneOrder(1)}><ActivityCard state={state} update={update} /></div>
                    <div className={phoneOrder(3)}>
                      <MetricRow
                        state={state}
                        onOpenNutrition={() => setActiveTab('Nutrition')}
                        onOpenWorkouts={() => setActiveTab('Workouts')}
                      />
                    </div>
                  </div>

                  <div className="contents lg:flex lg:col-span-4 lg:flex-col lg:gap-[var(--space-section)]">
                    <div className={`${phoneOrder(2)} m-card flex items-center justify-between gap-3`} style={{ background: 'var(--m-streak-wash)', borderColor: 'var(--m-streak-edge, #F1E3C7)' }}>
                      <div>
                        <span className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: 'var(--m-streak-ink)' }}>
                          <Flame size={15} /> Current streak
                        </span>
                        <p className="mt-1.5 text-[26px] font-extrabold leading-none tracking-tight" style={{ color: 'var(--text)' }}>
                          {workoutStreak} <span className="text-[14px] font-bold" style={{ color: 'var(--text-dim)' }}>day{workoutStreak === 1 ? '' : 's'}</span>
                        </p>
                      </div>
                      <Calendar size={22} style={{ color: 'var(--m-streak-ink)' }} aria-hidden="true" />
                    </div>

                    <div className={phoneOrder(4)}><EnergyCard state={state} /></div>

                    <section className={`${phoneOrder(5)} m-card`} aria-label="Suggested warmups">
                      <div className="mb-2 flex items-center gap-2.5">
                        <Lightbulb size={18} style={{ color: 'var(--primary)' }} strokeWidth={2.2} />
                        <h2 className="section-title">Suggested warmups</h2>
                      </div>
                      <ul className="flex flex-col">
                        {WARMUPS.map((w, i) => (
                          <li
                            key={w}
                            className="flex items-center gap-3 py-2.5"
                            style={{ borderBottom: i < WARMUPS.length - 1 ? '1px solid var(--border)' : 'none' }}
                          >
                            <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white shrink-0" style={{ background: 'var(--primary)' }}>
                              {i + 1}
                            </span>
                            <span className="flex-1 text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Progress' && (
              <div className="page-stack animate-fade-in">
                <PageHeader icon={BarChart3} title="Progress" subtitle="Your history, trends and how you're feeling." />
                {state.trackWellbeing !== false && (
                  <WellbeingCard state={state} update={update} />
                )}
                <HistoryCard
                  state={state}
                  onOpenDay={(date) => { onSelectDate(date); setActiveTab('Nutrition'); }}
                />
                <TrendCard state={state} />
                {/* The body-fat silhouette viewer is opt-in. Showing a gallery
                    of bodies by fat percentage to someone who did not ask for
                    it is the most harmful thing this app could do by default,
                    and this audience skews young. */}
                {state.showBodyComposition ? (
                  <BodyCompositionDashboard state={state} update={update} />
                ) : (
                  <section className="m-card" aria-label="Body composition">
                    <h2 className="section-title">Body composition is off</h2>
                    <p className="mt-1.5 max-w-xl text-[13px] leading-snug" style={{ color: 'var(--text-dim)' }}>
                      Body-fat estimates and the body reference photos are hidden unless you
                      ask for them. Your streaks, food log, activity and wellbeing all work
                      without this.
                    </p>
                    <button
                      onClick={() => update((prev) => ({ ...prev, showBodyComposition: true }))}
                      className="mt-3 min-h-[44px] rounded-xl px-4 text-[13px] font-bold text-white transition active:scale-95"
                      style={{ background: 'var(--primary)' }}
                    >
                      Turn on body composition
                    </button>
                  </section>
                )}
                <HealthWellnessInsights state={state} update={update} />
              </div>
            )}

            {/* Community — behind the competitions flag (lib/features.js) */}
            {activeTab === 'Community' && (
              <div className="page-stack animate-fade-in">
                <PageHeader icon={Users} title="Community" />
                {flags.competitions
                  ? <CommunityPage />
                  : (
                    <LockedFeature
                      title="Community & Competitions"
                      description="Daily challenges, small-group competitions and a weekly leaderboard with your friends."
                    />
                  )}
              </div>
            )}

            {activeTab === 'Settings' && (
              <SettingsPage
                state={state}
                cloud={cloud}
                flags={flags}
                syncStatus={syncStatus}
                saveStatusLabel={saveStatusLabel}
                statusIsBad={statusIsBad}
                onToggleTheme={toggleTheme}
                onSyncNow={syncNow}
                onEditProfile={() => setIsProfileOpen(true)}
                onRerunOnboarding={() => {
                  if (window.confirm('Go through setup again? Your logs are kept.')) {
                    update((prev) => ({ ...prev, isOnboarded: false }));
                  }
                }}
                onOpenCommunity={() => setActiveTab('Community')}
                onClearHistory={() => {
                  if (window.confirm('Delete all past days of logs? Today is kept. This cannot be undone.')) {
                    clearLogsHistory();
                  }
                }}
                onLogout={logout}
                onDeleteAccount={deleteAccount}
              />
            )}
          </main>

          {/* Desktop footer only; on a phone it was a screen of marketing
              text between the content and the tab bar. */}
          <footer className="hidden lg:block mt-16 pt-8 border-t animate-fade-in text-left" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between gap-6 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: 'var(--primary)' }}>
                  <Activity size={14} color="#fff" />
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--primary)' }}>TitanTrack</span>
              </div>
              <span className="text-[11px] text-[var(--text-faint)] font-bold">© {new Date().getFullYear()} TitanTrack</span>
            </div>
          </footer>

          {/* Save / sync status */}
          <p
            role="status"
            className="mt-6 flex items-center justify-center gap-2 text-center text-[12px]"
            style={{ color: statusIsBad ? 'var(--danger)' : 'var(--text-faint)' }}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full animate-pulse-dot" style={{ background: statusIsBad ? 'var(--danger)' : 'var(--primary)' }} />
            <span>{todayLabel} · {saveStatusLabel}</span>
          </p>
        </div>

        {/* Phone: bottom tab bar. The five most-used destinations under the
            thumb; Community lives in Profile. */}
        <nav aria-label="Main" className="bottom-nav fixed bottom-0 left-0 right-0 z-40 flex items-stretch lg:hidden">
          {PHONE_TABS.map((item) => {
            const Icon = item.phoneIcon || item.icon;
            const active = activeTab === item.id || (item.id === 'Settings' && activeTab === 'Community');
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-current={active ? 'page' : undefined}
                aria-label={item.short}
                className="bottom-nav-item flex flex-1 flex-col items-center justify-center gap-0.5 transition active:scale-95"
                style={{ color: active ? 'var(--primary)' : 'var(--text-dim)' }}
              >
                <span className="bottom-nav-pill flex h-7 w-14 items-center justify-center rounded-full transition">
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="text-[11px] font-bold leading-tight">{item.short}</span>
              </button>
            );
          })}
        </nav>

        <ProfileDrawer
          state={state}
          update={update}
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      </div>
    </div>
  );
}
