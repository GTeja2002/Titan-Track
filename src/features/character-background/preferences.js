export const STORAGE_KEY = 'titantrack.character-background.v1';
export const CHARACTER_IDS = Object.freeze(['toji', 'goku', 'zoro', 'baki']);
export const DEFAULT_PREFERENCES = Object.freeze({
  version: 1,
  enabled: false,
  character: 'goku',
  layout: 'full',
  opacity: 30,
});

// Persist only these cosmetic settings. Never read or write health/profile data.
export function normalizePreferences(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value)
    && (value.version === undefined || value.version === 1) ? value : {};
  return {
    version: 1,
    enabled: input.enabled === true,
    character: CHARACTER_IDS.includes(input.character) ? input.character : DEFAULT_PREFERENCES.character,
    layout: input.layout === 'half' ? 'half' : 'full',
    opacity: typeof input.opacity === 'number' && Number.isFinite(input.opacity)
      ? Math.max(10, Math.min(50, Math.round(input.opacity))) : DEFAULT_PREFERENCES.opacity,
  };
}

export function readPreferences(storage, key = STORAGE_KEY) {
  try {
    return normalizePreferences(JSON.parse(storage.getItem(key)));
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(storage, preferences, key = STORAGE_KEY) {
  try {
    storage.setItem(key, JSON.stringify(normalizePreferences(preferences)));
    return true;
  } catch {
    return false;
  }
}

export function isBackgroundActive(preferences, isDarkMode) {
  return preferences.enabled === true && isDarkMode === true;
}
