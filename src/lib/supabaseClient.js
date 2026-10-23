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

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      })
    : null;
