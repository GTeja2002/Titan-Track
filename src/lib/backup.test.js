import { describe, it, expect } from 'vitest';
import { buildBackup, parseBackup, describeBackup, backupFilename, BACKUP_VERSION } from './backup.js';
import { ACCENTS, DEFAULT_ACCENT, isValidAccent, accentAttribute } from './accents.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const sampleState = {
    email: 'someone@example.com',
    name: 'Sam',
    goal: 'stay-consistent',
    logs: { '2026-09-19': { foods: [{ name: 'Poha', cal: 250 }], water: 1500 } },
};

describe('buildBackup', () => {
    it('wraps the data with app, version and timestamp', () => {
        const b = buildBackup(sampleState);
        expect(b.app).toBe('titantrack');
        expect(b.version).toBe(BACKUP_VERSION);
        expect(typeof b.exportedAt).toBe('string');
    });

    it('excludes the signed-in email', () => {
        expect(buildBackup(sampleState).data.email).toBeUndefined();
    });

    it('keeps the logs and profile', () => {
        const d = buildBackup(sampleState).data;
        expect(d.name).toBe('Sam');
        expect(d.logs['2026-09-19'].foods).toHaveLength(1);
    });

    it('survives an empty state', () => {
        expect(buildBackup({}).data).toEqual({});
        expect(buildBackup(undefined).data).toEqual({});
    });
});

describe('parseBackup', () => {
    const good = JSON.stringify(buildBackup(sampleState));

    it('accepts a backup it produced', () => {
        const r = parseBackup(good);
        expect(r.ok).toBe(true);
        expect(r.data.name).toBe('Sam');
    });

    it('accepts an already-parsed object', () => {
        expect(parseBackup(buildBackup(sampleState)).ok).toBe(true);
    });

    it('rejects malformed JSON', () => {
        const r = parseBackup('{not json');
        expect(r.ok).toBe(false);
        expect(r.error).toMatch(/JSON/);
    });

    it('rejects a file from another app', () => {
        expect(parseBackup(JSON.stringify({ app: 'other', data: {} })).ok).toBe(false);
    });

    it('rejects a backup from a newer version', () => {
        const r = parseBackup(JSON.stringify({ app: 'titantrack', version: BACKUP_VERSION + 1, data: {} }));
        expect(r.ok).toBe(false);
        expect(r.error).toMatch(/newer/);
    });

    it('rejects a backup with no data', () => {
        expect(parseBackup(JSON.stringify({ app: 'titantrack', version: 1 })).ok).toBe(false);
    });

    it('rejects unreadable logs', () => {
        const r = parseBackup(JSON.stringify({ app: 'titantrack', version: 1, data: { logs: 'nope' } }));
        expect(r.ok).toBe(false);
    });

    it('rejects null and non-objects', () => {
        expect(parseBackup('null').ok).toBe(false);
        expect(parseBackup('42').ok).toBe(false);
    });
});

describe('describeBackup', () => {
    it('counts days and logged items', () => {
        expect(describeBackup(buildBackup(sampleState).data)).toEqual({ days: 1, meals: 1 });
    });
    it('copes with no logs', () => {
        expect(describeBackup({})).toEqual({ days: 0, meals: 0 });
    });
});

describe('backupFilename', () => {
    it('includes the date and a .json extension', () => {
        expect(backupFilename('2026-09-19')).toBe('titantrack-backup-2026-09-19.json');
    });
});

describe('accents', () => {
    it('includes the default', () => {
        expect(isValidAccent(DEFAULT_ACCENT)).toBe(true);
    });
    it('rejects an unknown accent', () => {
        expect(isValidAccent('chartreuse')).toBe(false);
    });
    it('sets no attribute for the default, since the stylesheet already is it', () => {
        expect(accentAttribute(DEFAULT_ACCENT)).toBe(null);
        expect(accentAttribute('nonsense')).toBe(null);
    });
    it('sets the attribute for a non-default accent', () => {
        expect(accentAttribute('ocean')).toBe('ocean');
    });
    it('gives every accent a label and a hex swatch', () => {
        for (const a of ACCENTS) {
            expect(a.label.length).toBeGreaterThan(0);
            expect(a.swatch).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
    });

    it('has a stylesheet rule for every non-default accent', () => {
        // An accent in the list with no CSS behind it is a swatch that silently
        // does nothing when tapped.
        const css = readFileSync(
            resolve(dirname(fileURLToPath(import.meta.url)), '../index.css'), 'utf8'
        );
        const missing = ACCENTS
            .filter((a) => a.id !== DEFAULT_ACCENT)
            .filter((a) => !css.includes(`body[data-accent='${a.id}']`))
            .map((a) => a.id);
        expect(missing).toEqual([]);
    });
});
