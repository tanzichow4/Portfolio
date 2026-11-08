import { defineConfig, devices } from '@playwright/test';

const viewport = { width: 1280, height: 720 }; // minimum supported desktop size
const devUrl = 'http://localhost:5173';
const previewUrl = 'http://localhost:4173';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { trace: 'on-first-retry' },
  projects: [
    {
      // Dev server specs. Preview specs are excluded.
      name: 'chromium',
      testMatch: '**/*.spec.ts',
      testIgnore: '**/*.preview.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport, baseURL: devUrl },
    },
    {
      // Runs against a production build served by `vite preview`.
      name: 'chromium-preview',
      testMatch: '**/*.preview.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport, baseURL: previewUrl },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: devUrl,
      reuseExistingServer: true,
    },
    {
      // Fresh build on every run. Never reuse a server, so a busy port 4173
      // fails loudly instead of testing a stale build.
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: previewUrl,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
