import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  outputDir: process.env.MEDIA_REAL === '1' ? 'test-results-media' : 'test-results',
  fullyParallel: true,
  grepInvert: process.env.MEDIA_REAL === '1' ? undefined : /@real-media/,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:5173',
    ...devices['Desktop Chrome'],
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    env: { VITE_MEDIA_BASE_URL: '', VITE_USE_LOCAL_MEDIA: 'true', MEDIA_TEST_FIXTURES: process.env.MEDIA_REAL === '1' ? '0' : '1' },
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
  },
})
