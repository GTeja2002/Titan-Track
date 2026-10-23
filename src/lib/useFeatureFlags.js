/* ---------------- lib/useFeatureFlags.js ---------------- */
import { useEffect, useState } from 'react';
import { resolveFlags, fetchRemoteFlags } from './features.js';
import { supabase } from './supabaseClient.js';

/** Flags start from the build-time values so the first paint is already
 *  correct, then the remote row (if any) is applied once it arrives. */
export function useFeatureFlags() {
  const [flags, setFlags] = useState(() => resolveFlags());
  useEffect(() => {
    let cancelled = false;
    fetchRemoteFlags(supabase).then((remote) => {
      if (!cancelled && remote) setFlags(resolveFlags({ remote }));
    });
    return () => { cancelled = true; };
  }, []);
  return flags;
}
