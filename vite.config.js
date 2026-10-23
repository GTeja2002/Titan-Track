import { defineConfig, loadEnv } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** A production build (web or APK) must never point at the developer's
 *  machine — on a phone, "localhost" is the phone itself. Fail the build
 *  instead of shipping an app that silently can't reach its backend. */
function noLocalhostInProduction(mode) {
  return {
    name: 'titantrack-no-localhost-in-production',
    buildStart() {
      if (mode !== 'production') return;
      const env = loadEnv(mode, process.cwd(), 'VITE_');
      const bad = Object.entries(env).filter(([, v]) => /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2)(:|\/|$)/i.test(v));
      if (bad.length) {
        throw new Error(`Production build points at a local address: ${bad.map(([k]) => k).join(', ')}. Use your hosted URLs in .env.production.`);
      }
      if (env.VITE_SUPABASE_URL && !env.VITE_SUPABASE_URL.startsWith('https://')) {
        throw new Error('VITE_SUPABASE_URL must use https:// in production.');
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), noLocalhostInProduction(mode)],
  test: {
    // Playwright specs run in a real browser via `npm run test:e2e`.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
}));
