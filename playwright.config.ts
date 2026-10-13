// Browser tests for Invoicer (drills D13 and D14). Starts the
// real app with a demo client, then drives Chromium against it.
// Run with: npm run e2e
import { defineConfig } from '@playwright/test';

const PORT = 4319;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const NODE = 'node --disable-warning=ExperimentalWarning';
const APP = `app/src/main.ts --port ${PORT} --seed-demo`;

export default defineConfig({
  testDir: 'app/e2e',
  reporter: 'list',
  timeout: 15_000,
  expect: { timeout: 3_000 },
  use: { baseURL: BASE_URL, browserName: 'chromium' },
  webServer: {
    command: `${NODE} ${APP}`,
    url: `${BASE_URL}/health`,
    reuseExistingServer: false,
  },
});
