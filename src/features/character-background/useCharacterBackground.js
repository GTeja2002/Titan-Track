import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEY, isBackgroundActive, normalizePreferences, readPreferences, savePreferences } from './preferences.js';

function localStorageOrNull() {
  try { return window.localStorage; } catch { return null; }
}

export function useCharacterBackground(isDarkMode, storageKey = STORAGE_KEY) {
  const [preferences, setPreferences] = useState(() => readPreferences(localStorageOrNull(), storageKey));
  const [storageFailed, setStorageFailed] = useState(false);

  useEffect(() => {
    setStorageFailed(!savePreferences(localStorageOrNull(), preferences, storageKey));
  }, [preferences, storageKey]);

  const updatePreferences = useCallback((patch) => {
    setPreferences((previous) => normalizePreferences({ ...previous, ...patch }));
  }, []);

  return {
    preferences,
    updatePreferences,
    isActive: isBackgroundActive(preferences, isDarkMode),
    storageFailed,
  };
}
