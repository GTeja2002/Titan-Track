import { describe, it, expect } from 'vitest';
import { resolveFlags, fetchRemoteFlags, FEATURES } from './features.js';

describe('resolveFlags', () => {
  it('defaults achievements and competitions to off', () => {
    const flags = resolveFlags({ env: {} });
    expect(flags.achievements).toBe(false);
    expect(flags.competitions).toBe(false);
  });

  it('lets a build-time env var turn a flag on', () => {
    const flags = resolveFlags({ env: { VITE_FEATURE_ACHIEVEMENTS: 'true' } });
    expect(flags.achievements).toBe(true);
    expect(flags.competitions).toBe(false);
  });

  it('lets the remote row override the env var in both directions', () => {
    const env = { VITE_FEATURE_ACHIEVEMENTS: 'true', VITE_FEATURE_COMPETITIONS: 'false' };
    const flags = resolveFlags({ env, remote: { achievements: false, competitions: true } });
    expect(flags).toEqual({ achievements: false, competitions: true });
  });

  it('ignores unparseable values instead of treating them as on', () => {
    const flags = resolveFlags({ env: { VITE_FEATURE_ACHIEVEMENTS: 'yes please' }, remote: { competitions: 'maybe' } });
    expect(flags).toEqual({ achievements: false, competitions: false });
  });

  it('covers every declared feature', () => {
    expect(Object.keys(resolveFlags({ env: {} }))).toEqual(Object.keys(FEATURES));
  });
});

describe('fetchRemoteFlags', () => {
  const clientReturning = (result) => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => result }) }) }),
  });

  it('returns null without a client', async () => {
    expect(await fetchRemoteFlags(null)).toBeNull();
  });

  it('returns null when the table is missing or errors', async () => {
    expect(await fetchRemoteFlags(clientReturning({ data: null, error: { message: 'relation does not exist' } }))).toBeNull();
  });

  it('returns null when the client throws', async () => {
    const throwing = { from: () => { throw new Error('offline'); } };
    expect(await fetchRemoteFlags(throwing)).toBeNull();
  });

  it('returns the stored value', async () => {
    const value = { achievements: true };
    expect(await fetchRemoteFlags(clientReturning({ data: { value }, error: null }))).toEqual(value);
  });
});
