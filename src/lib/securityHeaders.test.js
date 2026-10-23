import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHeaders, renderNetlify, renderVercel, inlineScriptHashes } from '../../scripts/security-headers.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

describe('web security headers', () => {
  it('generated files are up to date with index.html (run `npm run headers` if this fails)', () => {
    const headers = buildHeaders(html);
    expect(readFileSync(resolve(root, 'public/_headers'), 'utf8')).toBe(renderNetlify(headers));
    expect(readFileSync(resolve(root, 'vercel.json'), 'utf8')).toBe(renderVercel(headers));
  });

  it('allows every inline script in index.html by hash, and nothing inline otherwise', () => {
    const csp = buildHeaders(html)['Content-Security-Policy'];
    for (const h of inlineScriptHashes(html)) expect(csp).toContain(h);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).not.toMatch(/'unsafe-eval'/);
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
