/* ---------------- lib/auth.js ----------------
 * Real sign-in through Supabase Auth. Identity is verified by Supabase, never
 * by the browser:
 *   - Email: Supabase emails a one-time 6-digit code; verifyOtp checks it.
 *   - Google: the Google Identity Services credential (a signed ID token) is
 *     handed to Supabase, which verifies its signature and audience
 *     server-side (signInWithIdToken). Where the GIS button cannot run (the
 *     Android WebView), signInWithOAuth does a redirect flow instead.
 *
 * The old version decoded the Google JWT in the browser without checking the
 * signature and generated the "verification code" locally, so anyone could
 * open anyone's profile. Both are gone.
 */
import { supabase } from './supabaseClient.js';
import { AUTH_REDIRECT_URL } from './config.js';
import { isNativeApp } from './platform.js';
import { nativeGoogleSignIn, NATIVE_AUTH_REDIRECT } from './nativeShell.js';

const redirectUrl = () => (isNativeApp() ? NATIVE_AUTH_REDIRECT : AUTH_REDIRECT_URL);

export const cloudAuthEnabled = !!supabase;

const friendly = (error) => {
  if (!error) return null;
  const m = error.message || String(error);
  if (/rate limit|too many/i.test(m)) return 'Too many attempts — wait a minute and try again.';
  if (/expired|invalid.*(otp|token)|token.*invalid/i.test(m)) return 'That code is wrong or has expired. Request a new one.';
  if (/fetch|network/i.test(m)) return 'No connection. Check your internet and try again.';
  return m;
};

export async function sendEmailCode(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: redirectUrl() },
  });
  return { error: friendly(error) };
}

export async function verifyEmailCode(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  return { session: data?.session ?? null, error: friendly(error) };
}

/** For the Google Identity Services button: Supabase verifies the token. */
export async function signInWithGoogleIdToken(credential) {
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: credential });
  return { session: data?.session ?? null, error: friendly(error) };
}

/** Redirect-based Google sign-in (used where the GIS button can't run). */
export async function signInWithGoogleRedirect() {
  if (isNativeApp()) return nativeGoogleSignIn();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl() },
  });
  return { error: friendly(error) };
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

export function onAuthChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data?.subscription?.unsubscribe();
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** Permanently deletes the signed-in account and all of its cloud data. */
export async function deleteMyAccount() {
  const { error } = await supabase.rpc('delete_my_account');
  return { error: friendly(error) };
}
