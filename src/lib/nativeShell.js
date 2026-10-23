/* ---------------- lib/nativeShell.js ----------------
 * Android-only behaviour (Capacitor). Everything here is a no-op in a browser.
 *
 *  - Google sign-in: the Google button cannot run inside the WebView, so the
 *    app opens Google in the system browser (Custom Tab). Supabase sends the
 *    user back to com.titantrack.app://auth-callback?code=…, Android hands
 *    that URL to the app, and we exchange the code for a session (PKCE — the
 *    verifier never left this device).
 *  - Back button: closes the topmost overlay, then returns to the Dashboard,
 *    then backgrounds the app (Android convention, keeps state).
 *  - Resume: the sync hook already listens for visibilitychange, which
 *    Capacitor fires when the app returns to the foreground.
 */
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { StatusBar, Style } from '@capacitor/status-bar';
import { supabase } from './supabaseClient.js';
import { isNativeApp } from './platform.js';
import { dismissTop } from './dismiss.js';

export const NATIVE_AUTH_REDIRECT = 'com.titantrack.app://auth-callback';

// A sign-in the user actually started, so the deep link is only honoured
// shortly after they tapped "Continue with Google". Stored in localStorage
// because Android may kill the app while the browser is in front.
const PENDING_KEY = 'titan_oauth_pending_at';
const PENDING_TTL_MS = 10 * 60 * 1000;

function markSignInPending() {
  try { localStorage.setItem(PENDING_KEY, String(Date.now())); } catch { /* storage blocked */ }
}

function consumeSignInPending(now = Date.now()) {
  try {
    const at = Number(localStorage.getItem(PENDING_KEY));
    localStorage.removeItem(PENDING_KEY);
    return Number.isFinite(at) && at > 0 && now - at <= PENDING_TTL_MS;
  } catch {
    return false;
  }
}

export async function nativeGoogleSignIn() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: NATIVE_AUTH_REDIRECT, skipBrowserRedirect: true },
  });
  if (error) return { error: error.message };
  markSignInPending();
  await Browser.open({ url: data.url });
  return { error: null };
}

/**
 * Handles the deep link back from Google. Returns a message to show, or null.
 *
 * Any app on the phone can open this URL, so: links that arrive when no
 * sign-in was started are ignored, and the text shown never comes from the
 * link itself (it could be made to say anything). PKCE already stops a
 * planted code from working — the exchange needs a verifier only this app
 * has.
 */
export async function handleAuthCallbackUrl(url) {
  if (!url || !url.startsWith(NATIVE_AUTH_REDIRECT)) return null;
  if (!consumeSignInPending()) return null;
  await Browser.close().catch(() => {});
  let params;
  try {
    params = new URL(url).searchParams;
  } catch {
    return 'Google sign-in failed. Please try again.';
  }
  if (params.get('error') || params.get('error_description')) {
    return params.get('error') === 'access_denied'
      ? 'Google sign-in was cancelled.'
      : 'Google sign-in failed. Please try again.';
  }
  const code = params.get('code');
  if (!code) return 'Google sign-in failed. Please try again.';
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? 'Google sign-in failed. Please try again.' : null;
}

let started = false;

/** Call once at startup. `onBack` returns true if it handled the press. */
export function startNativeShell({ onBack, onAuthError } = {}) {
  if (!isNativeApp() || started) return;
  started = true;
  CapApp.addListener('appUrlOpen', async ({ url }) => {
    const err = await handleAuthCallbackUrl(url);
    if (err && onAuthError) onAuthError(err);
  });
  CapApp.addListener('backButton', () => {
    if (dismissTop()) return;
    if (onBack && onBack()) return;
    CapApp.minimizeApp();
  });
}

/** Matches the Android status bar to the app theme. The WebView sits below
 *  the status bar (no overlay), so content never hides under it; the CSS
 *  safe-area insets cover devices that draw edge-to-edge anyway. */
export async function applyStatusBar(isDark) {
  if (!isNativeApp()) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: isDark ? '#0F1311' : '#F4F7F8' });
  } catch {
    /* plugin unavailable (older shell) — the default bar is fine */
  }
}
