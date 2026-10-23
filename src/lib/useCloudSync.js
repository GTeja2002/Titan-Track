/* ---------------- lib/useCloudSync.js ----------------
 * Runs the sync engine (lib/sync.js) for the signed-in user:
 *   - on sign-in / app start: pull, merge, then push,
 *   - after every change: a debounced push,
 *   - when the network comes back, the app returns to the foreground, and
 *     every few minutes: pull + push again.
 * Local state is always saved first (instantly, offline-safe); the cloud
 * catches up whenever it can.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient.js';
import {
  loadSnapshot, saveSnapshot, pullChanges, pushChanges, mergeRemote, advanceSnapshot,
  claimLegacyState, importLegacyState, diff, toRecords, pendingCount,
} from './sync.js';

const PUSH_DEBOUNCE_MS = 1500;
const PERIODIC_MS = 5 * 60 * 1000;

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
const tick = () => new Promise((r) => setTimeout(r, 0));

export function useCloudSync(state, setRawState) {
  const enabled = !!supabase && !!state.userId && !!state.syncEpoch;
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const [status, setStatus] = useState({
    phase: supabase ? 'idle' : 'disabled', // disabled | idle | syncing | synced | pending | offline | error
    lastSyncedAt: null,
    pending: 0,
    error: null,
    firstSyncDone: false,
  });

  const running = useRef(false);
  const queued = useRef(null);
  const pushTimer = useRef(null);

  const run = useCallback(async ({ pull = true } = {}) => {
    const s0 = stateRef.current;
    if (!supabase || !s0.userId || !s0.syncEpoch) return null;
    if (running.current) {
      queued.current = { pull: pull || queued.current?.pull };
      return null;
    }
    const uid = s0.userId;
    const pendingNow = () => pendingCount(diff(loadSnapshot(uid, stateRef.current.syncEpoch), toRecords(stateRef.current)));
    if (isOffline()) {
      setStatus((p) => ({ ...p, phase: 'offline', pending: pendingNow(), firstSyncDone: true }));
      return pendingNow();
    }
    running.current = true;
    setStatus((p) => ({ ...p, phase: 'syncing' }));
    try {
      let snap = loadSnapshot(uid, s0.syncEpoch);
      if (pull) {
        const firstEver = Object.keys(snap.cursor || {}).length === 0;
        const { remote, cursor } = await pullChanges(supabase, uid, snap);

        // First sign-in with a real account: bring over the old blob, if any.
        if (firstEver && remote.profiles.length === 0) {
          const legacy = await claimLegacyState(supabase);
          if (legacy) setRawState((prev) => (prev.userId === uid ? importLegacyState(prev, legacy) : prev));
        }

        let merged = null;
        setRawState((prev) => {
          if (prev.userId !== uid) return prev;
          merged = mergeRemote(prev, remote);
          return merged.state;
        });
        for (let i = 0; i < 20 && merged === null; i++) await tick();
        if (stateRef.current.userId !== uid) return null;
        if (merged) snap = advanceSnapshot(snap, merged.state, merged.accepted, cursor);
        saveSnapshot(uid, snap);
        await tick();
      }
      const { snapshot } = await pushChanges(supabase, uid, stateRef.current, snap);
      saveSnapshot(uid, snapshot);
      const left = pendingCount(diff(snapshot, toRecords(stateRef.current)));
      setStatus({ phase: left ? 'pending' : 'synced', lastSyncedAt: new Date().toISOString(), pending: left, error: null, firstSyncDone: true });
      return left;
    } catch (err) {
      setStatus((p) => ({
        ...p,
        phase: isOffline() ? 'offline' : 'error',
        error: err?.message || 'Sync failed',
        pending: pendingNow(),
        firstSyncDone: true,
      }));
      return pendingNow();
    } finally {
      running.current = false;
      if (queued.current) {
        const next = queued.current;
        queued.current = null;
        setTimeout(() => run(next), 500);
      }
    }
  }, [setRawState]);

  // Start (and restart on account switch).
  useEffect(() => {
    if (!enabled) return;
    setStatus((p) => ({ ...p, firstSyncDone: false }));
    run({ pull: true });
  }, [enabled, state.userId, run]);

  // Debounced push after changes.
  useEffect(() => {
    if (!enabled) return;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => run({ pull: false }), PUSH_DEBOUNCE_MS);
    return () => clearTimeout(pushTimer.current);
  }, [state, enabled, run]);

  // Reconnect, foreground, and a slow periodic pull for changes from other devices.
  useEffect(() => {
    if (!enabled) return;
    const onOnline = () => run({ pull: true });
    const onVisible = () => { if (document.visibilityState === 'visible') run({ pull: true }); };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    const iv = setInterval(() => run({ pull: true }), PERIODIC_MS);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(iv);
    };
  }, [enabled, run]);

  /** Pushes immediately; resolves to the number of changes still not in the
   *  cloud (0 = everything is safe). Used before signing out. */
  const flush = useCallback(async () => {
    clearTimeout(pushTimer.current);
    for (let i = 0; i < 50 && running.current; i++) await new Promise((r) => setTimeout(r, 100));
    const left = await run({ pull: false });
    return left ?? 0;
  }, [run]);

  return { syncStatus: status, syncNow: () => run({ pull: true }), flushSync: flush };
}
