/* ---------------- components/OnboardingScreen.jsx ---------------- */
import { useState } from 'react';
import { Activity, Scale, Target, Flame, Calendar, User, Sparkles, Users, Ruler, ArrowRight } from 'lucide-react';

export function OnboardingScreen({ email, initialState = {}, onComplete, onLogout }) {
  const [name, setName] = useState(initialState.name || '');
  const [gender, setGender] = useState(initialState.gender || 'male');
  const [age, setAge] = useState(initialState.age || 42);
  const [height, setHeight] = useState(initialState.height || 175);
  const [startingWeight, setStartingWeight] = useState(initialState.startWeight || initialState.weight || 96);
  const [goalWeight, setGoalWeight] = useState(initialState.goalWeight || 90);
  const [goal, setGoal] = useState(initialState.goal || 'lose-fat');
  const [activityLevel, setActivityLevel] = useState(initialState.activityLevel || 'Moderate');

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete({
      name: name.trim() || (email || '').split('@')[0] || 'User',
      gender,
      age: parseInt(age) || 42,
      height: parseInt(height) || 175,
      startWeight: parseFloat(startingWeight) || 96,
      weight: parseFloat(startingWeight) || 96,
      goalWeight: parseFloat(goalWeight) || 90,
      goal,
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
            <h2 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>Let's set up your profile</h2>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-dim)' }}>Signing in as <strong style={{ color: 'var(--text)' }}>{email}</strong></p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="shrink-0 text-[11px] transition px-2.5 py-1.5 rounded-lg font-bold border"
            style={{ color: 'var(--text-dim)', borderColor: 'var(--border)', background: 'rgba(255,255,255,0.03)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            Change Email
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Section 1: who you are */}
          <div className="onboard-section animate-fade-in" style={{ animationDelay: '0.05s' }}>
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
                placeholder="e.g. John"
                className="login-input rounded-2xl px-3.5 py-2.5 text-sm outline-none"
                style={{ color: 'var(--text)' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-group flex flex-col gap-1.5 font-bold">
                <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider pl-1" style={{ color: 'var(--text-faint)' }}>
                  <Users size={10} /> Sex
                </label>
                <div className="segmented-group">
                  <button
                    type="button"
                    className={`segment-card ${gender === 'male' ? 'active' : ''}`}
                    onClick={() => setGender('male')}
                  >
                    Male
                  </button>
                  <button
                    type="button"
                    className={`segment-card ${gender === 'female' ? 'active' : ''}`}
                    onClick={() => setGender('female')}
                  >
                    Female
                  </button>
                </div>
              </div>

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
                  className="login-input rounded-2xl px-3.5 py-2.5 text-sm outline-none font-bold"
                  style={{ color: 'var(--text)' }}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: body metrics */}
          <div className="onboard-section animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="onboard-field-icon"><Ruler size={13} /></span>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Body metrics</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="form-group flex flex-col gap-1.5 font-bold">
                <div className="flex justify-between items-center pl-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Height</label>
                  <span className="text-xs font-bold text-[var(--primary)]">{height} cm</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="250"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value))}
                  className="w-full accent-[var(--primary)] h-6 mt-1"
                />
              </div>

              <div className="form-group flex flex-col gap-1.5 font-bold">
                <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider pl-1" style={{ color: 'var(--text-faint)' }} htmlFor="onboard-startweight-input">
                  <Scale size={10} /> Starting weight (kg)
                </label>
                <input
                  id="onboard-startweight-input"
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  value={startingWeight}
                  onChange={(e) => setStartingWeight(e.target.value)}
                  className="login-input rounded-2xl px-3.5 py-2.5 text-sm outline-none font-bold"
                  style={{ color: 'var(--text)' }}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: goal */}
          <div className="onboard-section animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="onboard-field-icon"><Target size={13} /></span>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Your goal</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="form-group flex flex-col gap-1.5 font-bold">
                <div className="flex justify-between items-center pl-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Goal weight</label>
                  <span className="text-xs font-bold text-[var(--primary)]">{goalWeight} kg</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="250"
                  step="0.5"
                  value={goalWeight}
                  onChange={(e) => setGoalWeight(parseFloat(e.target.value))}
                  className="w-full accent-[var(--primary)] h-6 mt-1"
                />
              </div>

              <div className="form-group flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider pl-1" style={{ color: 'var(--text-faint)' }}>Fitness goal</label>
                <div className="chip-grid">
                  <button
                    type="button"
                    className={`chip-card ${goal === 'lose-fat' ? 'active' : ''}`}
                    onClick={() => setGoal('lose-fat')}
                  >
                    Lose Fat
                  </button>
                  <button
                    type="button"
                    className={`chip-card ${goal === 'maintain' ? 'active' : ''}`}
                    onClick={() => setGoal('maintain')}
                  >
                    Maintain
                  </button>
                  <button
                    type="button"
                    className={`chip-card ${goal === 'gain-muscle' ? 'active' : ''}`}
                    onClick={() => setGoal('gain-muscle')}
                  >
                    Gain Muscle
                  </button>
                </div>
              </div>
            </div>
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
            You can update these later in your profile settings.
          </p>
        </form>
      </div>
    </div>
  );
}
