/* ---------------- components/OnboardingScreen.jsx ---------------- */
import { useState, useMemo } from 'react';
import { Scale, Target, Flame, Calendar, User, Sparkles, Users, Ruler, ArrowRight, Info } from 'lucide-react';
import { DEFAULT_GOAL, goalsForAge, getGoal, isMinor } from '../lib/goals.js';

export function OnboardingScreen({ email, initialState = {}, onComplete, onLogout }) {
  const [name, setName] = useState(initialState.name || '');
  const [gender, setGender] = useState(initialState.gender || '');
  const [age, setAge] = useState(initialState.age ?? '');
  const [height, setHeight] = useState(initialState.height ?? 170);
  const [goal, setGoal] = useState(initialState.goal || DEFAULT_GOAL);
  const [activityLevel, setActivityLevel] = useState(initialState.activityLevel || 'Moderate');

  // Weight is asked for only when the chosen goal is actually about the scale,
  // or when someone opts into tracking it anyway. Nothing is pre-filled with a
  // stranger's body.
  const [trackWeight, setTrackWeight] = useState(Boolean(initialState.trackWeight));
  const [startingWeight, setStartingWeight] = useState(initialState.startWeight ?? initialState.weight ?? '');
  const [goalWeight, setGoalWeight] = useState(initialState.goalWeight ?? '');

  const numericAge = parseInt(age, 10);
  const availableGoals = useMemo(() => goalsForAge(numericAge), [numericAge]);
  const selectedGoal = getGoal(goal);
  const wantsScale = selectedGoal.scaleBased;
  const showWeight = wantsScale || trackWeight;

  // If the age entered removes the currently chosen goal, fall back rather than
  // leaving an unavailable goal selected.
  const effectiveGoal = availableGoals.some((g) => g.id === goal) ? goal : DEFAULT_GOAL;

  const handleSubmit = (e) => {
    e.preventDefault();
    const w = parseFloat(startingWeight);
    const gw = parseFloat(goalWeight);
    const hasWeight = showWeight && Number.isFinite(w) && w > 0;

    onComplete({
      name: name.trim() || (email || '').split('@')[0] || 'User',
      gender,
      age: Number.isFinite(numericAge) ? numericAge : null,
      height: parseInt(height, 10) || null,
      startWeight: hasWeight ? w : null,
      weight: hasWeight ? w : null,
      goalWeight: hasWeight && Number.isFinite(gw) && gw > 0 ? gw : null,
      goal: effectiveGoal,
      trackWeight: showWeight,
      activityLevel,
    });
  };

  return (
    <div className="h-screen overflow-hidden relative flex items-center justify-center lg:justify-end p-4 py-6 lg:pr-12 xl:pr-20">
      <div className="onboarding-bg">
        <div className="onboarding-bg-photo" />
        <div className="onboarding-bg-overlay" />
      </div>
      <div className="login-card onboard-card max-w-md w-full p-6 sm:p-7 shadow-2xl relative z-10 animate-scale-in max-h-[86vh] overflow-y-auto" style={{ borderRadius: '28px' }}>
        <header className="mb-4 flex justify-between items-start gap-3 pb-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <Sparkles size={11} className="text-primary" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Profile setup</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>What are you here for?</h2>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-dim)' }}>Signing in as <strong style={{ color: 'var(--text)' }}>{email}</strong></p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="shrink-0 text-[11px] transition px-2.5 py-1.5 rounded-lg font-bold border"
            style={{ color: 'var(--text-dim)', borderColor: 'var(--border)', background: 'rgba(255,255,255,0.03)' }}
          >
            Change Email
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Section 1: the goal, first — it decides what else is worth asking */}
          <div className="onboard-section animate-fade-in" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="onboard-field-icon"><Target size={13} /></span>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Your goal</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {availableGoals.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoal(g.id)}
                  className="flex items-start gap-2.5 rounded-2xl border p-3 text-left transition hover:scale-[1.01]"
                  style={{
                    borderColor: effectiveGoal === g.id ? 'var(--primary)' : 'var(--border)',
                    background: effectiveGoal === g.id ? 'var(--primary-soft)' : 'var(--surface)',
                  }}
                >
                  <span
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-[3px]"
                    style={{
                      borderColor: effectiveGoal === g.id ? 'var(--primary)' : 'var(--border-strong)',
                      background: effectiveGoal === g.id ? 'var(--primary)' : 'transparent',
                    }}
                  />
                  <span className="flex flex-col">
                    <span className="text-xs font-black" style={{ color: 'var(--text)' }}>{g.label}</span>
                    <span className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{g.blurb}</span>
                  </span>
                </button>
              ))}
            </div>

            {isMinor(numericAge) && (
              <p className="mt-2 flex items-start gap-1.5 text-[10px]" style={{ color: 'var(--text-dim)' }}>
                <Info size={11} className="mt-0.5 shrink-0" />
                <span>Weight-loss plans aren't offered under 18 — bodies are still growing. Everything else works the same.</span>
              </p>
            )}
          </div>

          {/* Section 2: who you are */}
          <div className="onboard-section animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="onboard-field-icon"><User size={13} /></span>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>About you</span>
            </div>

            <div className="form-group flex flex-col gap-1.5 font-bold mb-3">
              <label className="text-[10px] font-bold uppercase tracking-wider pl-1" style={{ color: 'var(--text-faint)' }}>What should we call you?</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="login-input rounded-2xl px-3.5 py-2.5 text-sm outline-none"
                style={{ color: 'var(--text)' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-group flex flex-col gap-1.5">
                <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider pl-1" style={{ color: 'var(--text-faint)' }} htmlFor="onboard-age-input">
                  <Calendar size={10} /> Age
                </label>
                <input
                  id="onboard-age-input"
                  type="number"
                  min="10"
                  max="100"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="—"
                  className="login-input rounded-2xl px-3.5 py-2.5 text-sm outline-none font-bold"
                  style={{ color: 'var(--text)' }}
                  required
                />
              </div>

              <div className="form-group flex flex-col gap-1.5 font-bold">
                <div className="flex justify-between items-center pl-1">
                  <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                    <Ruler size={10} /> Height
                  </label>
                  <span className="text-xs font-bold text-[var(--primary)]">{height} cm</span>
                </div>
                <input
                  type="range"
                  min="120"
                  max="220"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value, 10))}
                  className="w-full accent-[var(--primary)] h-6 mt-1"
                />
              </div>
            </div>

            <div className="form-group flex flex-col gap-1.5 font-bold mt-3">
              <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider pl-1" style={{ color: 'var(--text-faint)' }}>
                <Users size={10} /> Sex — used for energy estimates only
              </label>
              <div className="segmented-group">
                {[
                  { id: 'female', label: 'Female' },
                  { id: 'male', label: 'Male' },
                  { id: 'unspecified', label: 'Rather not say' },
                ].map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`segment-card ${gender === o.id ? 'active' : ''}`}
                    onClick={() => setGender(o.id)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: weight, only when it is actually part of the goal */}
          <div className="onboard-section animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="onboard-field-icon"><Scale size={13} /></span>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Weight</span>
              </div>
              {!wantsScale && (
                <button
                  type="button"
                  onClick={() => setTrackWeight((v) => !v)}
                  className="rounded-full border px-2.5 py-1 text-[10px] font-bold transition"
                  style={{
                    borderColor: trackWeight ? 'var(--primary)' : 'var(--border)',
                    background: trackWeight ? 'var(--primary-soft)' : 'var(--surface)',
                    color: trackWeight ? 'var(--primary)' : 'var(--text-dim)',
                  }}
                >
                  {trackWeight ? 'Tracking weight' : 'Track weight too'}
                </button>
              )}
            </div>

            {showWeight ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="form-group flex flex-col gap-1.5 font-bold">
                  <label className="text-[10px] font-bold uppercase tracking-wider pl-1" style={{ color: 'var(--text-faint)' }} htmlFor="onboard-startweight-input">
                    Current weight (kg)
                  </label>
                  <input
                    id="onboard-startweight-input"
                    type="number"
                    step="0.1"
                    min="25"
                    max="300"
                    value={startingWeight}
                    onChange={(e) => setStartingWeight(e.target.value)}
                    placeholder="—"
                    className="login-input rounded-2xl px-3.5 py-2.5 text-sm outline-none font-bold"
                    style={{ color: 'var(--text)' }}
                    required={wantsScale}
                  />
                </div>
                {wantsScale && (
                  <div className="form-group flex flex-col gap-1.5 font-bold">
                    <label className="text-[10px] font-bold uppercase tracking-wider pl-1" style={{ color: 'var(--text-faint)' }} htmlFor="onboard-goalweight-input">
                      Goal weight (kg)
                    </label>
                    <input
                      id="onboard-goalweight-input"
                      type="number"
                      step="0.5"
                      min="25"
                      max="300"
                      value={goalWeight}
                      onChange={(e) => setGoalWeight(e.target.value)}
                      placeholder="—"
                      className="login-input rounded-2xl px-3.5 py-2.5 text-sm outline-none font-bold"
                      style={{ color: 'var(--text)' }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                Not needed for this goal. You can turn it on any time, and turn it back off.
              </p>
            )}
          </div>

          {/* Section 4: activity level */}
          <div className="onboard-section animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="onboard-field-icon"><Flame size={13} /></span>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Activity level</span>
            </div>
            <div className="segmented-group flex-wrap">
              {['Sedentary', 'Light', 'Moderate', 'Active', 'Athlete'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  className={`segment-card ${activityLevel === lvl ? 'active' : ''}`}
                  onClick={() => setActivityLevel(lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-white transition hover:scale-[1.01] active:scale-95 text-sm animate-fade-in"
            style={{
              background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
              boxShadow: '0 8px 24px var(--primary-glow)',
              animationDelay: '0.25s',
            }}
          >
            <span>Continue</span>
            <ArrowRight size={16} />
          </button>
          <p className="text-center text-[11px] animate-fade-in" style={{ color: 'var(--text-faint)', animationDelay: '0.3s' }}>
            You can change any of this later in your profile.
          </p>
        </form>
      </div>
    </div>
  );
}
