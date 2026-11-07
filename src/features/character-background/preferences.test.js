import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, STORAGE_KEY, isBackgroundActive, normalizePreferences, readPreferences, savePreferences } from './preferences.js';

describe('character background preferences', () => {
  it('shows decoration only when both the feature and dark mode are enabled', () => {
    expect(isBackgroundActive({ enabled: true }, true)).toBe(true);
    expect(isBackgroundActive({ enabled: true }, false)).toBe(false);
    expect(isBackgroundActive({ enabled: false }, true)).toBe(false);
    expect(isBackgroundActive({ enabled: 'true' }, true)).toBe(false);
  });
  it('recovers from missing, corrupted or inaccessible storage without enabling itself', () => {
    for (const raw of [null, '{broken', 'null', '[]', '"text"']) {
      expect(readPreferences({ getItem: () => raw })).toEqual(DEFAULT_PREFERENCES);
    }
    expect(readPreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(readPreferences({ getItem() { throw new Error('blocked'); } })).toEqual(DEFAULT_PREFERENCES);
  });
  it('validates stored IDs and refuses future schemas', () => {
    expect(normalizePreferences({ character: '../../other', layout: 'oversized', enabled: 'false' })).toEqual(DEFAULT_PREFERENCES);
    expect(normalizePreferences({ version: 99, enabled: true, character: 'zoro' })).toEqual(DEFAULT_PREFERENCES);
  });
  it('bounds visibility and rejects non-finite or non-numeric values', () => {
    expect(normalizePreferences({ opacity: 1000 }).opacity).toBe(50);
    expect(normalizePreferences({ opacity: -1 }).opacity).toBe(10);
    for (const opacity of [NaN, Infinity, '40', null]) {
      expect(normalizePreferences({ opacity }).opacity).toBe(30);
    }
  });
  it.each(['toji', 'goku', 'zoro', 'baki'])('restores %s and half-page preferences without touching health data', (character) => {
    const values = new Map([['titantrack_state', 'health-data']]);
    const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const settings = { ...DEFAULT_PREFERENCES, enabled: true, character, layout: 'half', opacity: 42 };
    expect(savePreferences(storage, { ...settings, logs: { private: true } })).toBe(true);
    expect(readPreferences(storage)).toEqual(settings);
    expect(values.get('titantrack_state')).toBe('health-data');
    expect(values.size).toBe(2);
    expect(values.get(STORAGE_KEY)).not.toContain('private');
  });
  it('reports failed persistence instead of claiming success', () => {
    expect(savePreferences(null, DEFAULT_PREFERENCES)).toBe(false);
    expect(savePreferences({ setItem() { throw new Error('quota'); } }, DEFAULT_PREFERENCES)).toBe(false);
  });
});
