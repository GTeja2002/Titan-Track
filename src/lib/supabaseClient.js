/* ---------------- lib/supabaseClient.js ---------------- */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/** Saves the full app state for one user to the `titan_track_state` table.
 * Silently no-ops (and only warns, never throws) if Supabase isn't configured
 * or the request fails — localStorage already has the data either way. */
export async function pushStateToSupabase(userKey, state) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('titan_track_state')
      .upsert({ user_key: userKey, state, updated_at: new Date().toISOString() }, { onConflict: 'user_key' });
    if (error) console.warn('Supabase sync (push) failed:', error.message);
  } catch (err) {
    console.warn('Supabase sync (push) failed:', err.message);
  }
}

/** Fetches saved state for one user from Supabase. Returns null on any failure
 * (not configured, offline, row not found, etc.) so callers can fall back to
 * whatever's already in localStorage without any special-casing. */
export async function pullStateFromSupabase(userKey) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('titan_track_state')
      .select('state, updated_at')
      .eq('user_key', userKey)
      .maybeSingle();
    if (error) {
      console.warn('Supabase sync (pull) failed:', error.message);
      return null;
    }
    return data ? data.state : null;
  } catch (err) {
    console.warn('Supabase sync (pull) failed:', err.message);
    return null;
  }
}
