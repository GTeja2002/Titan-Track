import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACCENTS, DEFAULT_ACCENT } from './accents.js';

const css = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../index.css'), 'utf8'
);

function block(pattern) {
    const m = css.match(pattern);
    return m ? m[0] : null;
}

function token(blockText, name) {
    if (!blockText) return null;
    const m = blockText.match(new RegExp('--' + name + ':\\s*(#[0-9A-Fa-f]{6})'));
    return m ? m[1] : null;
}

function luminance(hex) {
    const n = hex.replace('#', '');
    const ch = (c) => {
        const v = parseInt(c, 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * ch(n.slice(0, 2)) + 0.7152 * ch(n.slice(2, 4)) + 0.0722 * ch(n.slice(4, 6));
}

const contrastWithWhite = (hex) => 1.05 / (luminance(hex) + 0.05);

const accentBlock = (id) =>
    new RegExp("body\\[data-accent='" + id + "'\\] \\{[\\s\\S]*?\\n\\}");

const darkAccentBlock = (id) =>
    new RegExp("body\\.dark\\[data-accent='" + id + "'\\] \\{[\\s\\S]*?\\n\\}");

const ROOT_BLOCK = new RegExp(":root \\{[\\s\\S]*?\\n\\}");
const DARK_BLOCK = new RegExp("body\\.dark \\{[\\s\\S]*?\\n\\}");

const lightBlocks = [
    [DEFAULT_ACCENT, /:root \{[\s\S]*?\n\}/],
    ...ACCENTS.filter((a) => a.id !== DEFAULT_ACCENT).map((a) => [a.id, accentBlock(a.id)]),
];

describe('theme gradient tokens', () => {
    // A plain loop rather than it.each, which does not pass a RegExp through
    // its argument spreading intact.
    for (const [id, pattern] of lightBlocks) {
        it(`${id} defines both gradient companions`, () => {
            const b = block(pattern);
            expect(b, `${id} block not found`).toBeTruthy();
            expect(token(b, 'color-primary-lift')).toMatch(/^#[0-9A-Fa-f]{6}$/);
            expect(token(b, 'color-primary-cta-lift')).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });

        // The whole point of the second token: white labels sit on
        // --grad-primary-cta, so both ends of that ramp have to stay readable.
        // The decorative ramp is deliberately allowed to be lighter.
        it(`${id} keeps white text readable across the CTA gradient`, () => {
            const b = block(pattern);
            expect(contrastWithWhite(token(b, 'color-primary'))).toBeGreaterThanOrEqual(4.5);
            expect(contrastWithWhite(token(b, 'color-primary-cta-lift'))).toBeGreaterThanOrEqual(4.5);
        });

        it(`${id} makes the decorative lift lighter than the primary`, () => {
            const b = block(pattern);
            expect(luminance(token(b, 'color-primary-lift')))
                .toBeGreaterThan(luminance(token(b, 'color-primary')));
        });
    }

    it('gives every non-default accent a dark-mode override', () => {
        // body[data-accent] and body.dark have equal specificity and the accent
        // blocks come later in the file, so without these the accent's light
        // soft colour wins in dark mode and soft backgrounds turn nearly white.
        const missing = ACCENTS
            .filter((a) => a.id !== DEFAULT_ACCENT)
            .filter((a) => !css.includes(`body.dark[data-accent='${a.id}']`))
            .map((a) => a.id);
        expect(missing).toEqual([]);
    });

    it('keeps dark-mode accent soft colours dark', () => {
        for (const a of ACCENTS.filter((x) => x.id !== DEFAULT_ACCENT)) {
            const b = block(darkAccentBlock(a.id));
            expect(b, `${a.id} dark block not found`).toBeTruthy();
            expect(luminance(token(b, 'color-primary-soft')), `${a.id} soft`).toBeLessThan(0.05);
        }
    });

    it('defines the gradient tokens components rely on', () => {
        for (const t of ['--grad-primary', '--grad-primary-cta', '--grad-primary-soft', '--grad-sheen', '--grad-edge']) {
            expect(css).toContain(`${t}:`);
        }
    });

    const METRICS = ['calories', 'protein', 'water', 'steps', 'streak'];

    it('gives every metric all three tokens', () => {
        const b = block(ROOT_BLOCK);
        for (const m of METRICS) {
            expect(token(b, `m-${m}`), `${m} base`).toMatch(/^#[0-9A-Fa-f]{6}$/);
            expect(token(b, `m-${m}-ink`), `${m} ink`).toMatch(/^#[0-9A-Fa-f]{6}$/);
            expect(token(b, `m-${m}-soft`), `${m} soft`).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
    });

    it('keeps every metric ink readable as text on white', () => {
        // Amber and gold at their vivid value are around 2.5:1 on white, which
        // is why text and icons use the ink token rather than the base.
        const b = block(ROOT_BLOCK);
        for (const m of METRICS) {
            expect(contrastWithWhite(token(b, `m-${m}-ink`)), `${m} ink`).toBeGreaterThanOrEqual(4.5);
        }
    });

    const contrast = (a, b) => {
        const la = luminance(a);
        const lb = luminance(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };

    it('keeps every metric ink readable on its own tinted surfaces', () => {
        // The cases that actually ship: labels sit on the card wash, and the
        // hydration quick-add buttons sit on the soft tint. Checking only
        // ink-on-white missed water at 4.01:1 on its tint.
        const b = block(ROOT_BLOCK);
        for (const m of METRICS) {
            const ink = token(b, `m-${m}-ink`);
            expect(contrast(ink, token(b, `m-${m}-soft`)), `${m} ink on soft`).toBeGreaterThanOrEqual(4.5);
            expect(contrast(ink, token(b, `m-${m}-wash`)), `${m} ink on wash`).toBeGreaterThanOrEqual(4.5);
        }
    });

    it('keeps each card wash tinted, but barely', () => {
        // This threshold was 1.12 when the cards were meant to read as strongly
        // coloured. The design direction then changed: the card background is
        // now deliberately near-white, with the colour carried by the icon,
        // the label and the bar instead. The check is kept only to catch a
        // wash going fully white, which would lose the tint altogether.
        const b = block(ROOT_BLOCK);
        for (const m of METRICS) {
            const wash = token(b, `m-${m}-wash`);
            expect(wash, `${m} wash`).toMatch(/^#[0-9A-Fa-f]{6}$/);
            expect(contrast(wash, '#FFFFFF'), `${m} wash vs white`).toBeGreaterThan(1.03);
        }
    });

    it('keeps every metric soft tint pale enough to sit under content', () => {
        const b = block(ROOT_BLOCK);
        for (const m of METRICS) {
            expect(luminance(token(b, `m-${m}-soft`)), `${m} soft`).toBeGreaterThan(0.75);
        }
    });

    it('gives the metrics distinct hues rather than five greens', () => {
        const b = block(ROOT_BLOCK);
        const seen = new Set(METRICS.map((m) => token(b, `m-${m}`)));
        expect(seen.size).toBe(METRICS.length);
    });

    it('defines a dark-mode value for every metric token', () => {
        const b = block(DARK_BLOCK);
        for (const m of METRICS) {
            expect(token(b, `m-${m}`), `${m} dark base`).toBeTruthy();
            expect(token(b, `m-${m}-ink`), `${m} dark ink`).toBeTruthy();
            expect(token(b, `m-${m}-soft`), `${m} dark soft`).toBeTruthy();
        }
    });

    const WELLNESS = ['body', 'fitness', 'recovery', 'heart', 'cognitive', 'metabolic', 'nutrition'];

    it('gives every wellness card a full token set', () => {
        for (const c of WELLNESS) {
            for (const part of ['tint', 'disc', 'ink', 'accent']) {
                expect(css, `--w-${c}-${part}`).toContain(`--w-${c}-${part}:`);
            }
        }
    });

    /** First value of a token anywhere in the sheet. The wellness tokens live
     *  in their own :root block near the end, not the main one. */
    const cssToken = (name) => {
        const m = css.match(new RegExp('--' + name + ':\\s*(#[0-9A-Fa-f]{6})'));
        return m ? m[1] : null;
    };

    it('keeps every wellness label readable on its own card tint', () => {
        // The label and icon are printed on the tint, not on white, so that is
        // the pairing that has to pass.
        for (const c of WELLNESS) {
            const ink = cssToken(`w-${c}-ink`);
            const tint = cssToken(`w-${c}-tint`);
            expect(ink, `${c} ink`).toBeTruthy();
            expect(tint, `${c} tint`).toBeTruthy();
            expect(contrast(ink, tint), `${c} ink on tint`).toBeGreaterThanOrEqual(4.5);
        }
    });

    it('makes every wellness tint clearly coloured rather than near-white', () => {
        for (const c of WELLNESS) {
            expect(contrast(cssToken(`w-${c}-tint`), '#FFFFFF'), `${c} tint vs white`).toBeGreaterThan(1.1);
        }
    });

    it('gives every wellness card a dark-mode tint', () => {
        const dark = block(DARK_BLOCK) || '';
        const rest = css.slice(css.indexOf('body.dark'));
        for (const c of WELLNESS) {
            expect(dark.includes(`--w-${c}-tint`) || rest.includes(`--w-${c}-tint`), `${c} dark tint`).toBe(true);
        }
    });

    it('never declares position on .glass', () => {
        // This file's rules come after @tailwind utilities, so a `position` on
        // .glass has the same specificity as Tailwind's .fixed / .absolute but
        // wins on source order. That silently un-fixed the desktop sidebar and
        // the mobile drawer, which both combine .glass with a positioning
        // utility. Anything needing a containing block declares it on its own
        // opt-in class.
        const glassRules = css.match(/\.glass\s*\{[^}]*\}/g) || [];
        expect(glassRules.length).toBeGreaterThan(0);
        for (const rule of glassRules) {
            expect(rule, 'position must not be set on .glass').not.toMatch(/position\s*:/);
        }
    });

    it('honours prefers-reduced-motion', () => {
        expect(css).toContain('prefers-reduced-motion');
    });
});
