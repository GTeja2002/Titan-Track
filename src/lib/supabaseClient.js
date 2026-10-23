/* ---------------- lib/supabaseClient.js ----------------
 * The one Supabase client. Null when VITE_SUPABASE_URL / _ANON_KEY are unset,
 * in which case the app runs in local-only mode (no account, no cloud sync).
 *
 * The anon key is public by design. What protects user data is Row Level
 * Security on every table (supabase/migrations) plus Supabase Auth: requests
 * carry the signed-in user's JWT and Postgres only returns that user's rows.
 * Never put the service_role key in this app.
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

/** True for an http(s) URL. A placeholder or typo in .env used to make
 *  createClient throw while the module loaded, leaving a blank white page. */
function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function makeClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!isHttpUrl(SUPABASE_URL)) {
    console.error(
      'TitanTrack: VITE_SUPABASE_URL in .env is not a valid URL (expected https://<project-ref>.supabase.co). ' +
      'Running in local-only mode until it is fixed.'
    );
    return null;
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
}

export const supabase = makeClient();
