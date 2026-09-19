import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readLocal, readLocalJSON, writeLocal, removeLocal } from './storage.js';

const realLocalStorage = globalThis.localStorage;

function installStorage(impl) {
    Object.defineProperty(globalThis, 'localStorage', {
        value: impl,
        configurable: true,
        writable: true,
    });
}

function workingStorage() {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k),
    };
}

// Site data blocked, or Safari private mode: every access throws.
function throwingStorage(message = 'access denied') {
    return {
        getItem: () => { throw new Error(message); },
        setItem: () => { throw new Error(message); },
        removeItem: () => { throw new Error(message); },
    };
}

describe('storage helpers', () => {
    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        installStorage(realLocalStorage);
        vi.restoreAllMocks();
    });

    describe('when storage works', () => {
        beforeEach(() => installStorage(workingStorage()));

        it('round-trips a value', () => {
            expect(writeLocal('k', 'v')).toBe(true);
            expect(readLocal('k')).toBe('v');
        });

        it('returns null for a missing key', () => {
            expect(readLocal('nope')).toBe(null);
        });

        it('round-trips JSON', () => {
            writeLocal('j', JSON.stringify({ a: 1 }));
            expect(readLocalJSON('j')).toEqual({ a: 1 });
        });

        it('returns the fallback for malformed JSON', () => {
            writeLocal('bad', '{not json');
            expect(readLocalJSON('bad', { safe: true })).toEqual({ safe: true });
        });

        it('returns the fallback for a missing key', () => {
            expect(readLocalJSON('missing', 'fb')).toBe('fb');
        });

        it('removes a value', () => {
            writeLocal('k', 'v');
            expect(removeLocal('k')).toBe(true);
            expect(readLocal('k')).toBe(null);
        });
    });

    describe('when storage is blocked or full', () => {
        beforeEach(() => installStorage(throwingStorage('QuotaExceededError')));

        it('reads degrade to null instead of throwing', () => {
            expect(() => readLocal('k')).not.toThrow();
            expect(readLocal('k')).toBe(null);
        });

        it('JSON reads degrade to the fallback', () => {
            expect(readLocalJSON('k', 'fb')).toBe('fb');
        });

        it('writes report failure instead of throwing', () => {
            expect(() => writeLocal('k', 'v')).not.toThrow();
            expect(writeLocal('k', 'v')).toBe(false);
        });

        it('removes report failure instead of throwing', () => {
            expect(() => removeLocal('k')).not.toThrow();
            expect(removeLocal('k')).toBe(false);
        });
    });
});
