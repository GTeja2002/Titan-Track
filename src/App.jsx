/* ---------------- App.jsx ---------------- */
import { useState } from 'react';
import {
  Moon, Sun, Check, Activity, Scale, Dumbbell, User, LogOut,
  Bell, Heart, MessageSquare, Share2, Compass, Settings as SettingsIcon,
  ChevronRight, Calendar, Sparkles, HelpCircle, Utensils, Search,
  Menu, X
} from 'lucide-react';
import { useAppState } from './lib/useAppState.js';
import { supabase } from './lib/supabaseClient.js';
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
import { getLocalDateString } from './lib/date.js';

/** The one definition of the app's sections. The sidebar, the mobile drawer
 *  and the bottom tab bar all read from this. */
const NAV_TABS = [
  { id: 'Dashboard', label: 'Dashboard', icon: Activity },
  { id: 'Nutrition', label: 'Nutrition', icon: Utensils },
  { id: 'Workouts', label: 'Workouts', icon: Dumbbell },
  { id: 'Progress', label: 'Progress', icon: Scale },
  { id: 'Community', label: 'Community', icon: Compass },
  { id: 'Settings', label: 'Settings', icon: SettingsIcon },
];

/** Phones get five thumb-sized destinations; Settings stays in the drawer. */
const BOTTOM_TABS = NAV_TABS.filter((t) => t.id !== 'Settings');

export default function App() {
  const {
    state,
    update,
    savedFlash,
    storageFailed,
    login,
    logout,
    completeOnboarding,
    clearLogsHistory,
    addAvailableFood,
    removeAvailableFood,
    applyPlanFilters
  } = useAppState();
  // Default to the first new tab 'Dashboard' matching the design mockup screens
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleTheme = () => update((prev) => ({ ...prev, isDarkMode: !prev.isDarkMode }));
  const onSelectDate = (date) => update((prev) => ({ ...prev, currentDate: date }));

  const todayLabel = state.email && state.isOnboarded && state.currentDate === getLocalDateString()
    ? 'Today'
    : new Date((state.currentDate || getLocalDateString()) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // The indicator has to reflect what actually happened, not just whether
  // Supabase is configured: storage can be blocked or full, in which case
  // nothing was saved anywhere and the user needs to know.
  const saveStatusLabel = storageFailed
    ? 'could not save — storage full or blocked'
    : supabase
      ? 'synced to cloud'
      : 'auto-saved locally';

  // Community Feed State & Mock data
  const [likes, setLikes] = useState({ 1: 24, 2: 15, 3: 42 });
  const [hasLiked, setHasLiked] = useState({ 1: false, 2: false, 3: false });
  const handleLike = (id) => {
    setHasLiked(prev => {
      const nextLiked = !prev[id];
      setLikes(l => ({ ...l, [id]: l[id] + (nextLiked ? 1 : -1) }));
      return { ...prev, [id]: nextLiked };
    });
  };

  if (!state.email) {
    return <LoginScreen onLogin={login} />;
  }

  if (!state.isOnboarded) {
    return <OnboardingScreen email={state.email} initialState={state} onComplete={completeOnboarding} onLogout={logout} />;
  }

  const username = state.name || (state.email || '').split('@')[0] || 'Teja';

  return (
    <div className="min-h-screen flex text-[var(--text)] transition-all duration-300" style={{ background: 'var(--bg)' }}>

      {/* 1. PERSISTENT SIDEBAR FOR DESKTOP */}
      <aside className="hidden lg:flex flex-col fixed top-0 bottom-0 left-0 w-64 glass border-r z-50 p-6 flex-shrink-0 animate-fade-in" style={{ borderColor: 'var(--border)' }}>
        {/* Brand logo lockup */}
        <div className="flex items-center gap-2.5 mb-10 cursor-pointer" onClick={() => setActiveTab('Dashboard')}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--grad-primary-cta)', boxShadow: '0 4px 14px var(--primary-glow)' }}>
            <Activity size={18} color="#fff" />
          </div>
          <span className="text-sm font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--primary)' }}>TitanTrack</span>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 space-y-2 overflow-y-auto drawer-scroll">
          {[
            ...NAV_TABS,
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition duration-150 border text-left ${active
                  ? 'bg-primary-soft text-primary border-primary/25 shadow-sm'
                  : 'text-[var(--text-dim)] border-transparent hover:text-[var(--text)] hover:bg-white/5'
                  }`}
              >
                <Icon size={16} className={active ? 'text-primary' : 'text-[var(--text-faint)]'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Profile Info Badge */}
        <div
          onClick={() => setIsProfileOpen(true)}
          className="mt-auto flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition active:scale-95 text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-xs font-black text-white shrink-0">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-black truncate text-[var(--text)]">{username}</p>
            <p className="text-[8px] font-bold text-primary tracking-wider uppercase mt-0.5">Premium</p>
          </div>
        </div>
      </aside>

      {/* 2. MOBILE DRAWER SIDEBAR */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden animate-fade-in">
          {/* Backdrop overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
          {/* Panel */}
          <aside className="absolute top-0 bottom-0 left-0 w-64 glass border-r p-6 flex flex-col z-10 animate-slide-in-left" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => { setActiveTab('Dashboard'); setIsMobileSidebarOpen(false); }}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
                  <Activity size={16} color="#fff" />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">TitanTrack</span>
              </div>
              <button onClick={() => setIsMobileSidebarOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] active:scale-95 bg-white/5">
                <X size={14} />
              </button>
            </div>

            <nav className="flex-1 space-y-1.5">
              {[
                ...NAV_TABS,
              ].map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsMobileSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition duration-150 border text-left ${active
                      ? 'bg-primary-soft text-primary border-primary/25 shadow-sm'
                      : 'text-[var(--text-dim)] border-transparent hover:text-[var(--text)] hover:bg-white/5'
                      }`}
                  >
                    <Icon size={15} className={active ? 'text-primary' : 'text-[var(--text-faint)]'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div
              onClick={() => { setIsProfileOpen(true); setIsMobileSidebarOpen(false); }}
              className="mt-auto flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition active:scale-95 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-xs font-black text-white shrink-0">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black truncate text-[var(--text)]">{username}</p>
                <p className="text-[8px] font-bold text-primary uppercase">Premium</p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* 3. MAIN CONTENT LAYER */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
        <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col w-full mx-auto">

          {/* SIMPLIFIED TOP HEADER */}
          <header className="mb-6 flex items-center justify-between gap-4 p-3 sm:px-6 rounded-3xl glass border shadow-sm animate-fade-in" style={{ borderColor: 'var(--border)' }}>

            {/* Left: Mobile hamburger menu toggler (hidden on Desktop) */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-[var(--text)] hover:bg-white/10 transition active:scale-95"
                style={{ borderColor: 'var(--border)' }}
              >
                <Menu size={16} />
              </button>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">TitanTrack</span>
            </div>

            {/* Left: Breadcrumbs or Active view name (Desktop) */}
            <div className="hidden lg:flex items-center gap-2 text-xs font-bold">
              <span className="text-[var(--text-faint)]">Workspace</span>
              <span className="text-[var(--text-faint)]">/</span>
              <span className="text-[var(--text)]">{activeTab}</span>
            </div>

            {/* Right: Search, Notifications, Calendar togglers */}
            <div className="flex items-center gap-3 ml-auto">
              {/* Search mock bar */}
              <div className="relative hidden sm:block">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-40 rounded-xl px-3.5 py-1.5 text-xs bg-white/5 border border-white/10 outline-none text-[var(--text)] placeholder-white/25 focus:w-48 transition-all"
                />
                <Search size={12} className="absolute right-3.5 top-2.5 text-[var(--text-dim)]" />
              </div>

              {/* Notification bell */}
              <button className="relative w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-[var(--text)] hover:bg-white/10 transition active:scale-95" style={{ borderColor: 'var(--border)' }}>
                <Bell size={14} />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500" />
              </button>

              {/* Theme & Calendar picker */}
              <div className="flex items-center gap-1.5 border-l pl-3 border-white/10">
                <CalendarModal state={state} onSelectDate={onSelectDate} />
                <button
                  onClick={toggleTheme}
                  className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-[var(--text)] hover:text-amber-500 transition active:scale-95"
                  aria-label="Toggle theme"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {state.isDarkMode ? <Moon size={14} /> : <Sun size={14} />}
                </button>
              </div>
            </div>

          </header>

          {/* TAB RENDERING VIEWPORT */}
          <main className="tab-viewport flex-grow">

            {/* TAB 1: DASHBOARD (Home Page) */}
            {activeTab === 'Dashboard' && (
              <Dashboard
                state={state}
                update={update}
                onNavigate={setActiveTab}
                addAvailableFood={addAvailableFood}
                removeAvailableFood={removeAvailableFood}
                applyPlanFilters={applyPlanFilters}
              />
            )}

            {/* TAB 2: NUTRITION */}
            {activeTab === 'Nutrition' && (
              <div className="space-y-6 animate-scale-in">
                <div className="grid grid-cols-12 gap-5">
                  <div className="col-span-12 lg:col-span-5 flex flex-col gap-5">
                    {/* A "% to goal weight" ring is meaningless for a goal
                        that is not about the scale, so those goals get a
                        consistency streak as their headline instead. */}
                    {isScaleGoal(state.goal) || state.trackWeight
                      ? <GoalCard state={state} update={update} />
                      : <ConsistencyCard state={state} />}
                    <EnergyCard state={state} />
                  </div>
                  <div className="col-span-12 lg:col-span-7">
                    <FoodLogCard state={state} update={update} />
                  </div>
                </div>

                {/* Personalized Plan Viewport in Nutrition Tab */}
                <PersonalizedPlanCard
                  state={state}
                  update={update}
                  addAvailableFood={addAvailableFood}
                  removeAvailableFood={removeAvailableFood}
                  applyPlanFilters={applyPlanFilters}
                  onEditProfile={() => setActiveTab('Progress')}
                />
              </div>
            )}

            {/* TAB 3: WORKOUTS */}
            {activeTab === 'Workouts' && (
              <div className="grid grid-cols-12 gap-5 animate-scale-in">
                <div className="col-span-12 lg:col-span-8">
                  <ActivityCard state={state} update={update} />
                </div>
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
                  <EnergyCard state={state} />
                  <div className="glass rounded-3xl p-6 border border-white/5 shadow-sm text-left">
                    <h4 className="font-extrabold text-[var(--text)] text-sm mb-3">Suggested Warmups</h4>
                    <ul className="space-y-3 text-xs text-[var(--text-dim)] font-semibold">
                      <li className="flex items-center gap-2 p-2 rounded-xl bg-white/5"><span className="text-primary font-bold">1</span> Dynamic Stretching (5m)</li>
                      <li className="flex items-center gap-2 p-2 rounded-xl bg-white/5"><span className="text-primary font-bold">2</span> Joint Mobility Prep (5m)</li>
                      <li className="flex items-center gap-2 p-2 rounded-xl bg-white/5"><span className="text-primary font-bold">3</span> Light Jogging on Spot (3m)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PROGRESS */}
            {activeTab === 'Progress' && (
              <div className="space-y-6 animate-scale-in">
                {/* The body-fat silhouette viewer is opt-in. Showing a gallery
                    of bodies by fat percentage to someone who did not ask for
                    it is the most harmful thing this app could do by default,
                    and this audience skews young. */}
                {state.showBodyComposition ? (
                  <BodyCompositionDashboard state={state} update={update} />
                ) : (
                  <div
                    className="rounded-3xl border p-6 text-left"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                  >
                    <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>
                      Body composition is off
                    </h3>
                    <p className="mt-1.5 max-w-xl text-xs" style={{ color: 'var(--text-dim)' }}>
                      Body-fat estimates and the body reference photos are hidden unless you
                      ask for them. Your streaks, food log, activity and wellbeing all work
                      without this.
                    </p>
                    <button
                      onClick={() => update((prev) => ({ ...prev, showBodyComposition: true }))}
                      className="mt-3 rounded-xl px-3.5 py-2 text-xs font-bold text-white transition hover:scale-105 active:scale-95"
                      style={{ background: 'var(--primary)' }}
                    >
                      Turn on body composition
                    </button>
                  </div>
                )}
                {state.trackWellbeing !== false && (
                  <WellbeingCard state={state} update={update} />
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <TrendCard state={state} />
                  <HealthWellnessInsights state={state} update={update} />
                </div>
              </div>
            )}

            {/* TAB 5: COMMUNITY */}
            {activeTab === 'Community' && (
              <div className="grid grid-cols-12 gap-5 animate-scale-in text-left">
                {/* Main Community feed */}
                <div className="col-span-12 lg:col-span-8 space-y-5">
                  <h3 className="text-lg font-black tracking-tight text-[var(--text)] mb-2">Community challenges & feed</h3>

                  {/* Challenge Card */}
                  <div className="bg-white dark:bg-[#1C211E] rounded-3xl p-6 border border-[#E7E6E0] dark:border-[#2C332E] shadow-sm relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#BD6034] bg-primary-soft px-2 py-0.5 rounded-full inline-block">Active Challenge</span>
                      <h4 className="text-sm font-black text-[#171817] dark:text-[#F4F5F2]">Hydration Hero Weekend! 💦</h4>
                      <p className="text-xs text-[#555954] dark:text-[#B3BAB4] font-medium max-w-md">Log 8 glasses of water daily this Saturday & Sunday to unlock the Weekend Hydrator badge + 100 points.</p>
                    </div>
                    <button className="py-2.5 px-4 rounded-xl bg-primary text-white font-bold text-xs hover:scale-105 transition shadow-md shadow-primary/10">
                      Join Challenge
                    </button>
                  </div>

                  {/* Feed item 1 */}
                  <div className="glass rounded-3xl p-5 border border-white/5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">S</div>
                      <div>
                        <p className="text-xs font-black text-[var(--text)]">Sarah Connor</p>
                        <p className="text-[9px] text-[var(--text-dim)] font-bold">2 hours ago</p>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-dim)] font-semibold">
                      Crushed my weight goals this week! Lost 1.5kg and logged my breakfast oats every day. Keep going everyone! 🏃‍♀️✨
                    </p>
                    <div className="flex items-center gap-4 text-xs font-bold text-[var(--text-dim)] pt-2 border-t border-white/5">
                      <button onClick={() => handleLike(1)} className={`flex items-center gap-1.5 transition ${hasLiked[1] ? 'text-primary' : 'hover:text-primary'}`}>
                        <Heart size={14} className={hasLiked[1] ? 'fill-primary' : ''} />
                        <span>{likes[1]} Likes</span>
                      </button>
                      <span className="flex items-center gap-1.5"><MessageSquare size={14} /> <span>3 Comments</span></span>
                    </div>
                  </div>

                  {/* Feed item 2 */}
                  <div className="glass rounded-3xl p-5 border border-white/5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-white">A</div>
                      <div>
                        <p className="text-xs font-black text-[var(--text)]">Alex Mercer</p>
                        <p className="text-[9px] text-[var(--text-dim)] font-bold">5 hours ago</p>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-dim)] font-semibold">
                      Finished a 45-minute strength builder workout. My muscles are feeling it! Protein target hit for the day! 💪🥩
                    </p>
                    <div className="flex items-center gap-4 text-xs font-bold text-[var(--text-dim)] pt-2 border-t border-white/5">
                      <button onClick={() => handleLike(2)} className={`flex items-center gap-1.5 transition ${hasLiked[2] ? 'text-primary' : 'hover:text-primary'}`}>
                        <Heart size={14} className={hasLiked[2] ? 'fill-primary' : ''} />
                        <span>{likes[2]} Likes</span>
                      </button>
                      <span className="flex items-center gap-1.5"><MessageSquare size={14} /> <span>1 Comments</span></span>
                    </div>
                  </div>
                </div>

                {/* Sidebar Leaderboard */}
                <div className="col-span-12 lg:col-span-4 space-y-5">
                  <h3 className="text-lg font-black tracking-tight text-[var(--text)] mb-2">Weekly Leaderboard</h3>
                  <div className="glass rounded-3xl p-5 border border-white/5 shadow-sm space-y-4">
                    {[
                      { rank: 1, name: 'Teja (You)', points: '14,200 pts', active: true },
                      { rank: 2, name: 'Alex Mercer', points: '13,800 pts', active: false },
                      { rank: 3, name: 'Sarah Connor', points: '12,100 pts', active: false },
                      { rank: 4, name: 'Mike Miller', points: '10,950 pts', active: false },
                      { rank: 5, name: 'Emily Rose', points: '9,800 pts', active: false }
                    ].map((user) => (
                      <div
                        key={user.rank}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition ${user.active ? 'bg-primary-soft border border-primary/20' : 'bg-transparent border-white/5'}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black ${user.rank === 1 ? 'bg-amber-400 text-black' : user.rank === 2 ? 'bg-slate-300 text-black' : 'bg-white/10 text-[var(--text-dim)]'}`}>
                            {user.rank}
                          </span>
                          <span className="text-xs font-extrabold text-[var(--text)]">{user.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-primary">{user.points}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: SETTINGS */}
            {activeTab === 'Settings' && (
              <div className="max-w-2xl mx-auto glass rounded-3xl p-6 border border-white/5 shadow-sm text-left space-y-6 animate-scale-in">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-[var(--text)]">Settings</h3>
                  <p className="text-xs text-[var(--text-dim)] font-medium mt-0.5">Manage your preferences and local profile data.</p>
                </div>

                {/* Theme Settings block */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-dim)]">Preferences</h4>
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--text)]">
                    <span>Display Dark Mode</span>
                    <button onClick={toggleTheme} className="py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition">
                      {state.isDarkMode ? 'Disable Dark Mode' : 'Enable Dark Mode'}
                    </button>
                  </div>
                </div>

                {/* User settings edit profile button */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-dim)]">Profile Information</h4>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-bold text-[var(--text)]">
                    <div>
                      <p className="font-extrabold text-[var(--text)]">{state.email}</p>
                      <p className="text-[10px] text-[var(--text-dim)] mt-0.5 font-medium">Logged in via local storage</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => update((prev) => ({ ...prev, isOnboarded: false }))}
                        className="py-2 px-3.5 rounded-xl border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition"
                      >
                        Re-run Onboarding
                      </button>
                      <button
                        onClick={() => setIsProfileOpen(true)}
                        className="py-2 px-4 rounded-xl bg-primary text-white font-bold hover:scale-105 active:scale-95 transition"
                      >
                        Edit Profile / Biometrics
                      </button>
                    </div>
                  </div>
                </div>

                {/* Clear history option */}
                <div className="p-4 rounded-2xl bg-warning-soft border border-warning/10 space-y-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-black text-warning">Clear Logs History</p>
                    <p className="text-[10px] text-[var(--text-dim)] mt-0.5 font-medium">Purge all logged activities, food logs, weights tracking, and water data (keeps today's active values).</p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to purge all historical logs? This action is permanent and cannot be undone.")) {
                        clearLogsHistory();
                        window.alert("Historical logs have been cleared successfully!");
                      }
                    }}
                    className="py-2 px-4 rounded-xl bg-[#D9A441] text-white font-bold hover:scale-105 active:scale-95 transition"
                  >
                    Clear History
                  </button>
                </div>

                {/* Logout button */}
                <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 space-y-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-black text-rose-400">Sign Out</p>
                    <p className="text-[10px] text-[var(--text-dim)] mt-0.5 font-medium">This will clear your active session credentials</p>
                  </div>
                  <button
                    onClick={logout}
                    className="py-2 px-4 rounded-xl bg-rose-500 text-white font-bold hover:scale-105 active:scale-95 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}

          </main>

          {/* BOTTOM FOOTER CUSTOM STYLED */}
          <footer className="mt-16 pt-8 border-t border-white/5 animate-fade-in text-left">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: 'var(--primary)' }}>
                    <Activity size={14} color="#fff" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--primary)' }}>TitanTrack</span>
                </div>
                <p className="text-[10px] text-[var(--text-dim)] font-medium leading-relaxed">
                  Your Health, Our Priority. TitanTrack helps you track workouts, optimize nutrition, and visually analyze your body composition metrics in real-time.
                </p>
              </div>

              <div>
                <h5 className="text-[10px] font-black uppercase tracking-wider text-[var(--text)] mb-3">Quick Links</h5>
                <ul className="space-y-2 text-[10px] text-[var(--text-dim)] font-bold">
                  <li><button onClick={() => setActiveTab('Dashboard')} className="hover:text-primary transition">Dashboard</button></li>
                  <li><button onClick={() => setActiveTab('Nutrition')} className="hover:text-primary transition">Nutrition</button></li>
                  <li><button onClick={() => setActiveTab('Workouts')} className="hover:text-primary transition">Workouts</button></li>
                  <li><button onClick={() => setActiveTab('Progress')} className="hover:text-primary transition">Progress</button></li>
                </ul>
              </div>

              <div>
                <h5 className="text-[10px] font-black uppercase tracking-wider text-[var(--text)] mb-3">Resources</h5>
                <ul className="space-y-2 text-[10px] text-[var(--text-dim)] font-bold">
                  <li><a href="#" className="hover:text-primary transition">Blog</a></li>
                  <li><a href="#" className="hover:text-primary transition">Recipes</a></li>
                  <li><a href="#" className="hover:text-primary transition">Guides</a></li>
                  <li><a href="#" className="hover:text-primary transition">Support</a></li>
                </ul>
              </div>

              <div className="space-y-3 text-left">
                <h5 className="text-[10px] font-black uppercase tracking-wider text-[var(--text)]">Stay Updated</h5>
                <p className="text-[10px] text-[var(--text-dim)] font-medium">Get tips, recipes & updates straight to your inbox.</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="rounded-xl px-3 py-2 text-xs bg-white/5 border border-white/10 outline-none text-[var(--text)] w-full"
                  />
                  <button className="py-2 px-3 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-hover transition">
                    Subscribe
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 py-4 border-t border-white/5 text-[9px] text-[var(--text-faint)] font-bold">
              <span>© 2026 TitanTrack. All rights reserved.</span>
              <div className="flex gap-4">
                <a href="#" className="hover:text-primary transition">Privacy Policy</a>
                <a href="#" className="hover:text-primary transition">Terms of Service</a>
              </div>
            </div>
          </footer>

          {/* Sync notification banner */}
          <footer className="mt-4 flex items-center justify-center gap-2 text-xs" style={{ color: storageFailed ? 'var(--danger)' : 'var(--text-faint)' }}>
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse-dot"
              style={{ background: storageFailed ? 'var(--danger)' : 'var(--primary)' }}
            />
            <span>{todayLabel} · {saveStatusLabel}</span>
          </footer>

          {/* Bottom tab bar — phones only. A left sidebar behind a hamburger
              puts every destination two taps and a reach away; this audience is
              phone-first, so the sections belong under the thumb. The spacer
              below keeps content clear of the fixed bar, and the safe-area
              inset keeps it clear of the home indicator on notched phones. */}
          <div className="h-20 lg:hidden" aria-hidden="true" />

          <nav
            className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t lg:hidden"
            style={{
              background: 'var(--surface-solid)',
              borderColor: 'var(--border)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
            }}
          >
            {BOTTOM_TABS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition active:scale-95"
                  style={{ color: active ? 'var(--primary)' : 'var(--text-faint)' }}
                >
                  <Icon size={19} />
                  <span className="text-[9px] font-bold tracking-wide">{item.label}</span>
                  <span
                    className="h-0.5 w-6 rounded-full transition"
                    style={{ background: active ? 'var(--grad-primary)' : 'transparent' }}
                  />
                </button>
              );
            })}
          </nav>

          {/* Drawer Overlay for Profile Entry */}
          <ProfileDrawer
            state={state}
            update={update}
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
