import { defineConfig, devices } from '@playwright/test';

// Extra confidence check, not required by the capstone spec ("no automated e2e required").
// Needs the backend on :8080 with seeded dev data. Run: npx playwright test
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1, // specs share one seeded DB (and its seats); run strictly one at a time
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
