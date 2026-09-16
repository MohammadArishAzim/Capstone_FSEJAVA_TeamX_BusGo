import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for BusGo e2e happy-path tests.
 *
 * These are NOT required by the capstone spec (page 12: "No automated
 * regression/e2e required" at Foundation level) — they exist as an extra
 * confidence check you can re-run after future changes. They need both the
 * backend (mvn spring-boot:run, port 8080) and the frontend dev server
 * (npm start, port 4200) running against the seeded dev data.
 *
 * Run with: npx playwright test
 * (first time: npx playwright install chromium)
 *
 * If Playwright's bundled browser download isn't reachable (e.g. a
 * locked-down network), point PLAYWRIGHT_LAUNCH_OPTIONS_EXECUTABLE_PATH or
 * set launchOptions.executablePath to a system Chromium instead of running
 * `npx playwright install`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // tests share seeded schedules/seats; run serially to avoid seat conflicts
  workers: 1, // fullyParallel:false only serializes within a file; multiple spec files still get
  // separate workers by default, which races against the same shared DB/seats -- force one worker
  // total so every test across every file runs strictly one at a time.
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
