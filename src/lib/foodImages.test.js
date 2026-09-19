import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FOOD_DB } from './calculations.js';

// public/ is served at the web root, so an image path of /assets/food/x.png
// resolves to public/assets/food/x.png on disk.
const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../public');
const onDisk = (webPath) => existsSync(resolve(PUBLIC_DIR, '.' + webPath));

describe('FOOD_DB images', () => {
    it('has at least one entry', () => {
        expect(FOOD_DB.length).toBeGreaterThan(0);
    });

    it('gives every food an image', () => {
        const missing = FOOD_DB.filter((f) => !f.image).map((f) => f.name);
        expect(missing).toEqual([]);
    });

    it('points every image at a file that exists', () => {
        const broken = FOOD_DB
            .filter((f) => f.image && !onDisk(f.image))
            .map((f) => `${f.name} -> ${f.image}`);
        expect(broken).toEqual([]);
    });

    it('serves every image from /assets/', () => {
        const odd = FOOD_DB
            .filter((f) => f.image && !f.image.startsWith('/assets/'))
            .map((f) => `${f.name} -> ${f.image}`);
        expect(odd).toEqual([]);
    });

    it('keeps the shared fallback placeholder on disk', () => {
        // Every image-rendering call site falls back to this path on error.
        expect(onDisk('/assets/placeholders/food.png')).toBe(true);
    });
});
