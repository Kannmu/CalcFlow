import { defineConfig, devices } from '@playwright/test'

const basePath = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  testDir: './tests/e2e',
  reporter: [['html'], ['json']],
  use: {
    baseURL: `http://localhost:4173${basePath}`,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ],
  webServer: {
    command: 'npm run preview -- --host',
    url: `http://localhost:4173${basePath}`,
    reuseExistingServer: !process.env.CI
  }
})
