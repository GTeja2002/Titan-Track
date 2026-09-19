/* ---------------- lib/config.js ----------------
 * All environment-specific values come from Vite env vars (see .env.example).
 * Every one of these is optional — the app degrades gracefully with each left
 * unset: Google sign-in shows as not-yet-configured, cloud sync just doesn't
 * happen (localStorage still works), and the login video falls back to an
 * animated gradient. Nothing throws or breaks if you run this with no .env
 * at all.
 *
 * Vite only exposes env vars prefixed with VITE_ to client code, and inlines
 * them at build time — so set these in a untracked `.env` file (see
 * .env.example), never commit real values, and remember client-side "secrets"
 * (the Supabase anon key, the Google client ID) are both meant to be public;
 * real protection comes from Supabase Row Level Security policies, not from
 * hiding this key.
 */

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const LOGIN_VIDEO_SRC = import.meta.env.VITE_LOGIN_VIDEO_SRC || '/assets/login-loop.mp4';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
