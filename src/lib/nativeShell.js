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
import { supabase } from './supabaseClient.js';
import { isNativeApp } from './platform.js';
import { dismissTop } from './dismiss.js';

export const NATIVE_AUTH_REDIRECT = 'com.titantrack.app://auth-callback';

export async function nativeGoogleSignIn() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: NATIVE_AUTH_REDIRECT, skipBrowserRedirect: true },
  });
  if (error) return { error: error.message };
  await Browser.open({ url: data.url });
  return { error: null };
}

/** Handles the deep link back from Google. Returns an error message or null. */
export async function handleAuthCallbackUrl(url) {
  if (!url || !url.startsWith(NATIVE_AUTH_REDIRECT)) return null;
  await Browser.close().catch(() => {});
  let params;
  try {
    params = new URL(url).searchParams;
  } catch {
    return 'Sign-in link was malformed.';
  }
  const err = params.get('error_description') || params.get('error');
  if (err) return err;
  const code = params.get('code');
  if (!code) return 'Sign-in did not return a code.';
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? error.message : null;
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
