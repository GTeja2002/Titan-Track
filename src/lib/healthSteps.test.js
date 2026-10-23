import { describe, it, expect, vi } from 'vitest';
import {
  getStepAccess, requestStepAccess, isGranted, todayRange, readTodaySteps, applyTodaySteps,
} from './healthSteps.js';

const plugin = (over = {}) => ({
  isHealthAvailable: vi.fn(async () => ({ available: true })),
  checkHealthPermissions: vi.fn(async () => ({ permissions: { READ_STEPS: true } })),
  requestHealthPermissions: vi.fn(async () => ({ permissions: { READ_STEPS: true } })),
  queryAggregated: vi.fn(async () => ({ aggregatedData: [{ value: 4321 }] })),
  ...over,
});

describe('getStepAccess', () => {
  it('is unsupported on the web and never touches the plugin', async () => {
    const p = plugin();
    expect(await getStepAccess(p, false)).toBe('unsupported');
    expect(p.isHealthAvailable).not.toHaveBeenCalled();
  });

  it('reports Health Connect missing', async () => {
    expect(await getStepAccess(plugin({ isHealthAvailable: async () => ({ available: false }) }), true)).toBe('not_installed');
  });

  it('reports permission needed / connected', async () => {
    expect(await getStepAccess(plugin({ checkHealthPermissions: async () => ({ permissions: { READ_STEPS: false } }) }), true)).toBe('needs_permission');
    expect(await getStepAccess(plugin(), true)).toBe('connected');
  });

  it('reports an error instead of throwing', async () => {
    expect(await getStepAccess(plugin({ isHealthAvailable: async () => { throw new Error('boom'); } }), true)).toBe('error');
  });

  it('only ever asks for READ_STEPS', async () => {
    const p = plugin();
    await getStepAccess(p, true);
    await requestStepAccess(p);
    expect(p.checkHealthPermissions).toHaveBeenCalledWith({ permissions: ['READ_STEPS'] });
    expect(p.requestHealthPermissions).toHaveBeenCalledWith({ permissions: ['READ_STEPS'] });
  });
});

describe('isGranted', () => {
  it('accepts the object shape Android returns and the documented array shape', () => {
    expect(isGranted({ permissions: { READ_STEPS: true } })).toBe(true);
    expect(isGranted({ permissions: [{ READ_STEPS: true }] })).toBe(true);
    expect(isGranted({ permissions: { READ_STEPS: false } })).toBe(false);
    expect(isGranted({})).toBe(false);
    expect(isGranted(null)).toBe(false);
  });
});

describe('reading today\'s steps', () => {
  it('queries from local midnight to now', () => {
    const now = new Date(2026, 9, 23, 15, 30);
    const { startDate, endDate } = todayRange(now);
    expect(new Date(startDate).getTime()).toBe(new Date(2026, 9, 23, 0, 0, 0).getTime());
    expect(endDate).toBe(now.toISOString());
  });

  it('asks for steps in a day bucket and sums the result', async () => {
    const p = plugin({ queryAggregated: vi.fn(async () => ({ aggregatedData: [{ value: 1000.4 }, { value: 2000 }] })) });
    expect(await readTodaySteps(p, new Date(2026, 9, 23, 12))).toBe(3000);
    expect(p.queryAggregated.mock.calls[0][0]).toMatchObject({ dataType: 'steps', bucket: 'day' });
  });

  it('treats an empty or odd response as 0, never negative', async () => {
    expect(await readTodaySteps(plugin({ queryAggregated: async () => ({}) }))).toBe(0);
    expect(await readTodaySteps(plugin({ queryAggregated: async () => ({ aggregatedData: [{ value: -5 }, { value: null }] }) }))).toBe(0);
  });
});

describe('applyTodaySteps', () => {
  const state = { logs: { '2026-10-22': { steps: 9000, water: 1 }, '2026-10-23': { foods: [{ id: 'x' }], water: 500 } } };

  it('writes steps into today only, keeping the rest of the day', () => {
    const next = applyTodaySteps(state, 4321, '2026-10-23');
    expect(next.logs['2026-10-23']).toMatchObject({ steps: 4321, stepsSource: 'health_connect', water: 500, foods: [{ id: 'x' }] });
    expect(next.logs['2026-10-22']).toBe(state.logs['2026-10-22']);
  });

  it('creates today if it does not exist yet', () => {
    expect(applyTodaySteps({ logs: {} }, 10, '2026-10-24').logs['2026-10-24']).toMatchObject({ steps: 10, foods: [] });
  });

  it('returns the same object when nothing changed (no needless sync)', () => {
    const once = applyTodaySteps(state, 4321, '2026-10-23');
    expect(applyTodaySteps(once, 4321, '2026-10-23')).toBe(once);
  });
});
