/* ---------------- lib/features.js ----------------
 * Feature flags for sections that are built but not released yet.
 *
 * Achievements and competitions (the Community tab's challenges, feed and
 * leaderboard) only make sense once there are enough people using the app —
 * a leaderboard of one is not a competition. Both are OFF until then.
 *
 * Where a flag's value comes from, highest priority first:
 *   1. The `app_settings` table in Supabase (key = 'feature_flags'), read once
 *      at startup — flip a flag there and every client picks it up on next
 *      launch, no rebuild or redeploy needed.
 *   2. A build-time env var: VITE_FEATURE_ACHIEVEMENTS / VITE_FEATURE_COMPETITIONS.
 *   3. The default below (off).
 *
 * Locked features keep their code; turning one on is a config change.
 */

export const FEATURES = {
  achievements: {
    label: 'Achievements',
    description: 'Badges and milestones for your streaks, hydration and logging.',
    envVar: 'VITE_FEATURE_ACHIEVEMENTS',
    default: false,
  },
  competitions: {
    label: 'Competitions',
    description: 'Daily challenges and leaderboards with friends.',
    envVar: 'VITE_FEATURE_COMPETITIONS',
    default: false,
  },
};

function parseBool(raw) {
  if (raw === true || raw === false) return raw;
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'on') return true;
  if (v === 'false' || v === '0' || v === 'off') return false;
  return undefined;
}

/** Resolves every flag from (remote → env → default). `env` and `remote` are
 *  injectable so this stays a pure function under test. */
export function resolveFlags({ env = import.meta.env, remote = null } = {}) {
  const out = {};
  for (const [name, def] of Object.entries(FEATURES)) {
    const fromRemote = remote ? parseBool(remote[name]) : undefined;
    const fromEnv = parseBool(env?.[def.envVar]);
    out[name] = fromRemote ?? fromEnv ?? def.default;
  }
  return out;
}

/** Reads the remote override row. Returns null (never throws) when Supabase is
 *  not configured, the table does not exist yet, or the network is down. */
export async function fetchRemoteFlags(supabase) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'feature_flags')
      .maybeSingle();
    if (error || !data || typeof data.value !== 'object') return null;
    return data.value;
  } catch {
    return null;
  }
}
