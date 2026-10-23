import { defineConfig, devices } from '@playwright/test';

// Runs against the Vite dev server in local-only mode (Supabase vars blanked
// so a developer's .env never points E2E at a real account). Cloud sync and
// RLS are covered by the Vitest suites (src/lib/sync.test.js,
// supabase/tests/rls.test.js).
export default defineConfig({
  testDir: 'e2e',
  timeout: 30000,
  retries: 0,
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npx vite --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 60000,
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', VITE_GOOGLE_CLIENT_ID: '' },
  },
});
