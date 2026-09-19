/* ---------------- components/LoginScreen.jsx ---------------- */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, ArrowLeft, LogIn, Mail, Phone, ShieldCheck, Sparkles } from 'lucide-react';
import { GoogleLogo } from './shared/GoogleLogo.jsx';
import { decodeGoogleCredential } from '../lib/auth.js';
import { GOOGLE_CLIENT_ID, LOGIN_VIDEO_SRC } from '../lib/config.js';

export function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('email'); // 'email' | 'phone'
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const googleBtnRef = useRef(null);
  const bgVideoRef = useRef(null);

  // OTP Verification System states
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [userInputOtp, setUserInputOtp] = useState('');
  const [timer, setTimer] = useState(30);
  const [verificationError, setVerificationError] = useState('');

  // Countdown timer for OTP resend
  useEffect(() => {
    if (!isVerifying || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isVerifying, timer]);

  // Let the video breathe on its own for a moment before the sign-in card
  // appears, so the background actually gets seen instead of being covered
  // instantly. Tapping/clicking anywhere skips straight to the card.
  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 2600);
    return () => clearTimeout(timer);
  }, []);
  const skipIntro = useCallback(() => setRevealed(true), []);

  // The video has an end-card/logo frame built into its last second or so.
  // Instead of `loop` (which snaps straight back to frame 0 with no pause),
  // let it play through to that end card, hold there for 5s, then restart.
  const handleVideoEnded = useCallback(() => {
    const el = bgVideoRef.current;
    if (!el) return;
    setTimeout(() => {
      if (!bgVideoRef.current) return; // component may have unmounted (e.g. user logged in) during the wait
      bgVideoRef.current.currentTime = 0;
      bgVideoRef.current.play().catch(() => { });
    }, 5000);
  }, []);

  const handleGoogleCredential = useCallback((response) => {
    const payload = decodeGoogleCredential(response.credential);
    if (payload?.email) {
      onLogin(payload.email);
    } else {
      setError('Could not read your Google account email — try email/phone below instead.');
    }
  }, [onLogin]);

  // Renders the real Google button once both the GSI script and the target div
  // are ready. Polls briefly because the script tag loads with async/defer, so
  // it isn't guaranteed to be ready the instant this component mounts.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    let attempts = 0;
    const tryInit = () => {
      if (cancelled) return;
      if (window.google?.accounts?.id && googleBtnRef.current) {
        window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline', size: 'large', shape: 'pill', width: 320, text: 'continue_with',
        });
        return;
      }
      attempts += 1;
      if (attempts < 25) setTimeout(tryInit, 200);
    };
    tryInit();
    return () => { cancelled = true; };
  }, [handleGoogleCredential]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = identifier.trim();
    if (!trimmed) {
      setError(mode === 'email' ? 'Email is required' : 'Phone number is required');
      return;
    }
    if (mode === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setError('Please enter a valid email address');
        return;
      }
    } else {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        setError('Please enter a valid phone number');
        return;
      }
    }
    setError('');

    // Generate a secure 6-digit mock OTP code for verification
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(generatedOtp);
    setUserInputOtp('');
    setVerificationError('');
    setTimer(30);
    setIsVerifying(true);
  };

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    if (userInputOtp.trim() === otpCode) {
      setVerificationError('');
      setIsVerifying(false);
      onLogin(identifier.trim());
    } else {
      setVerificationError('Invalid verification code. Please try again.');
    }
  };

  const handleResendCode = () => {
    if (timer > 0) return;
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(generatedOtp);
    setUserInputOtp('');
    setVerificationError('');
    setTimer(30);
  };

  const handleBack = () => {
    setIsVerifying(false);
    setUserInputOtp('');
    setVerificationError('');
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center lg:justify-end p-5 sm:p-8 lg:pr-16 xl:pr-24"
      onClick={skipIntro}
    >
      {/* Full-bleed background: video if configured, else animated gradient */}
      <div className="login-bg">
        {LOGIN_VIDEO_SRC ? (
          <video ref={bgVideoRef} src={LOGIN_VIDEO_SRC} autoPlay muted playsInline onEnded={handleVideoEnded} />
        ) : (
          <div className="login-bg-gradient" />
        )}
        <div className="login-bg-overlay" />
        <div className="login-noise" />
      </div>

      <div className="fixed top-6 left-6 sm:top-8 sm:left-8 z-10 flex items-center gap-2.5 animate-fade-in">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
          <Activity size={22} color="#fff" />
        </div>
        <div className="text-left">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary block">TitanTrack</span>
          <span className="text-lg font-bold tracking-tight text-white">Goal Evolution</span>
        </div>
      </div>

      {/* "Tap to continue" hint — only shown during the intro, fades out once revealed */}
      <div
        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 lg:left-auto lg:right-1/2 lg:translate-x-1/2"
        style={{
          opacity: revealed ? 0 : 1,
          transition: 'opacity 0.5s ease',
          pointerEvents: 'none',
        }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Tap to continue</span>
        <div className="h-8 w-5 rounded-full border border-white/40 flex items-start justify-center p-1">
          <div className="h-1.5 w-1.5 rounded-full bg-white/70" style={{ animation: 'loginHintBounce 1.6s ease-in-out infinite' }} />
        </div>
      </div>

      {/* Tagline, bottom-left, floating over the video — fades in once revealed */}
      <div
        className="fixed bottom-8 left-6 sm:left-8 z-10 max-w-md hidden md:block"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1)',
          pointerEvents: revealed ? 'auto' : 'none',
        }}
      >
        <p className="text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg">Consistency compounds.</p>
        <p className="mt-2.5 text-sm text-white/70 leading-relaxed">Track every rep, every meal, every step — and watch the trend line do the rest.</p>
        <div className="mt-5 flex items-center gap-2 login-chip rounded-full px-3.5 py-2 w-fit">
          <ShieldCheck size={13} className="text-primary" />
          <span className="text-[11px] font-semibold text-white/80">Your data stays on your device</span>
        </div>
      </div>

      {/* Sign-in card — fades/slides in once revealed, slightly after the tagline */}
      <div
        className="relative z-10 w-full max-w-sm"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.98)',
          transition: 'opacity 0.9s cubic-bezier(0.22,1,0.36,1) 0.15s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.15s',
          pointerEvents: revealed ? 'auto' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isVerifying ? (
          <div className="login-card p-7 sm:p-8 animate-scale-in">
            <div className="mb-1 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Verification</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Verify Your Account</h2>
            <p className="text-xs mb-4 leading-relaxed text-white/50">
              We have sent a 6-digit confirmation code to your {mode === 'email' ? 'email' : 'phone'}:
            </p>
            <div className="mb-4 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center">
              <span className="text-xs font-black text-primary break-all">{identifier}</span>
            </div>

            {/* Test Helper box */}
            <div className="mb-5 p-3.5 rounded-2xl bg-primary-soft border border-primary/20 text-center animate-pulse">
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary block mb-1">🛠️ Developer Test OTP</span>
              <span className="text-2xl font-mono font-black tracking-[0.25em] text-white pl-[0.25em]">{otpCode}</span>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5 font-bold">
                <label className="text-[10px] font-bold uppercase tracking-wider pl-1 text-white/40">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={userInputOtp}
                  onChange={(e) => {
                    setUserInputOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setVerificationError('');
                  }}
                  placeholder="000000"
                  className="login-input w-full rounded-2xl px-4 py-3.5 text-lg font-mono text-center tracking-[0.2em] outline-none text-white placeholder-white/20"
                  required
                />
              </div>

              {verificationError && (
                <p className="text-xs font-bold text-rose-400 pl-1 text-center bg-rose-500/10 py-2 rounded-xl border border-rose-500/20">
                  {verificationError}
                </p>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-white transition hover:scale-[1.02] active:scale-95 text-sm"
                style={{ background: 'var(--primary)', boxShadow: '0 8px 24px var(--primary-glow)' }}
              >
                <ShieldCheck size={16} /> <span>Verify & Continue</span>
              </button>
            </form>

            <div className="flex items-center justify-between text-xs font-bold pt-5 mt-5 border-t border-white/5">
              <button
                type="button"
                onClick={handleBack}
                className="text-white/40 hover:text-white/80 transition flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Change {mode === 'email' ? 'Email' : 'Phone'}
              </button>

              {timer > 0 ? (
                <span className="text-white/30">Resend in {timer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-primary hover:text-primary-hover transition"
                >
                  Resend Code
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="login-card p-7 sm:p-8">
            <div className="mb-1 flex items-center gap-1.5">
              <Sparkles size={13} className="text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Welcome back</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Sign in to continue</h2>
            <p className="text-xs mb-6 leading-relaxed text-white/50">
              This isn't a real account system — there's no password, and nothing leaves
              your browser except the optional Google sign-in below.
            </p>

            {/* Real Google button when configured; an honestly-disabled state when not */}
            <div className="mb-5">
              {GOOGLE_CLIENT_ID ? (
                <div ref={googleBtnRef} className="w-full flex justify-center" />
              ) : (
                <button
                  type="button"
                  disabled
                  title="Add a Google OAuth Client ID in the code (GOOGLE_CLIENT_ID) to enable this"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold cursor-not-allowed opacity-70 login-input text-white/70"
                >
                  <GoogleLogo size={16} />
                  Continue with Google
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] uppercase tracking-wider font-bold text-white/30">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="segmented-group mb-4" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
              <button
                type="button"
                className={`segment-card py-2 flex items-center justify-center gap-1.5 ${mode === 'email' ? 'active' : ''}`}
                onClick={() => { setMode('email'); setIdentifier(''); setError(''); }}
              >
                <Mail size={14} /> Email
              </button>
              <button
                type="button"
                className={`segment-card py-2 flex items-center justify-center gap-1.5 ${mode === 'phone' ? 'active' : ''}`}
                onClick={() => { setMode('phone'); setIdentifier(''); setError(''); }}
              >
                <Phone size={14} /> Phone
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5 font-bold">
                <label className="text-[10px] font-bold uppercase tracking-wider pl-1 text-white/40">
                  {mode === 'email' ? 'Email address' : 'Phone number'}
                </label>
                <input
                  type={mode === 'email' ? 'email' : 'tel'}
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                  placeholder={mode === 'email' ? 'yourname@example.com' : '+1 555 123 4567'}
                  className="login-input w-full rounded-2xl px-4 py-3.5 text-sm outline-none text-white placeholder-white/25"
                  required
                />
                {mode === 'phone' && (
                  <p className="text-[10px] pl-1 leading-relaxed text-white/35">
                    No code is sent — like the email option, this just labels your local profile.
                  </p>
                )}
              </div>

              {error && (
                <p className="text-xs font-bold text-rose-400 pl-1 text-center bg-rose-500/10 py-2 rounded-xl border border-rose-500/20">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-white transition hover:scale-[1.02] active:scale-95 text-sm"
                style={{ background: 'var(--primary)', boxShadow: '0 8px 24px var(--primary-glow)' }}
              >
                <LogIn size={16} /> <span>Load My Profile</span>
              </button>
            </form>
          </div>
        )}

        <p className="mt-5 text-center text-[11px] text-white/35 md:hidden">
          Consistency compounds — track every rep, every meal, every step.
        </p>
      </div>
    </div>
  );
}
