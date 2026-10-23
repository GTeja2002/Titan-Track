/* ---------------- lib/useHealthSteps.js ----------------
 * Keeps today's step count in sync with Android Health Connect: reads on app
 * start and every time the app returns to the foreground, and writes the
 * total into state.logs[today].steps through update() (so it syncs to the
 * account like any other change). Does nothing on the web.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { isNativeApp } from './platform.js';
import { readLocal, writeLocal } from './storage.js';
import {
  getStepAccess, requestStepAccess, readTodaySteps, applyTodaySteps,
  openHealthConnectInstall, openHealthConnectSettings,
} from './healthSteps.js';

const ASKED_KEY = 'titan_health_steps_asked';

export function useHealthSteps({ enabled, update }) {
  const native = isNativeApp();
  const active = native && enabled;
  const [status, setStatus] = useState(native ? 'checking' : 'unsupported');
  // What the last read actually returned, shown on the Activity card so a
  // "0 steps" or a Health Connect error is visible instead of silent.
  const [lastRead, setLastRead] = useState({ at: null, steps: null, error: null });
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (!active || busy.current) return;
    busy.current = true;
    try {
      const access = await getStepAccess();
      setStatus(access);
      if (access === 'error') {
        setLastRead({ at: new Date().toISOString(), steps: null, error: 'Could not reach Health Connect.' });
      }
      if (access === 'connected') {
        const steps = await readTodaySteps();
        setLastRead({ at: new Date().toISOString(), steps, error: null });
        update((prev) => applyTodaySteps(prev, steps));
      }
    } catch (err) {
      setStatus('error');
      setLastRead({ at: new Date().toISOString(), steps: null, error: err?.message || String(err) });
    } finally {
      busy.current = false;
    }
  }, [active, update]);

  const requestAccess = useCallback(async () => {
    writeLocal(ASKED_KEY, '1');
    const result = await requestStepAccess();
    setStatus(result);
    if (result === 'connected') await refresh();
    return result;
  }, [refresh]);

  /** The Dashboard calls this: asks for permission automatically the first
   *  time only. After that the user decides via the card's button. */
  const askOnce = useCallback(() => {
    if (status === 'needs_permission' && !readLocal(ASKED_KEY)) requestAccess();
  }, [status, requestAccess]);

  useEffect(() => {
    if (!active) return undefined;
    refresh();
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    let handle;
    CapApp.addListener('resume', refresh).then((h) => { handle = h; }).catch(() => {});
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      handle?.remove?.();
    };
  }, [active, refresh]);

  return {
    status,
    lastRead,
    refresh,
    requestAccess,
    askOnce,
    install: () => openHealthConnectInstall(),
    openSettings: () => openHealthConnectSettings(),
  };
}
