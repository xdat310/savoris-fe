import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'list',
  outputDir: 'test-results/playwright',
  use: { baseURL: 'http://127.0.0.1:5173', ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
  webServer: [
    {
      command: './mvnw -q spring-boot:run',
      cwd: '../DineChain',
      url: 'http://localhost:8080/api/v1/health',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        ...process.env,
        DB_URL: `jdbc:postgresql://localhost:${process.env.POSTGRES_PORT ?? '5433'}/savoris`,
        DB_USERNAME: 'savoris', DB_PASSWORD: 'savoris123', BOOTSTRAP_ENABLED: 'true', BOOTSTRAP_PASSWORD: 'savoris123',
        AUTH_COOKIE_SECURE: 'false', AUTH_COOKIE_SAME_SITE: 'Lax', CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:5173,http://localhost:5173',
      },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173',
      url: 'http://127.0.0.1:5173/admin/login',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
})
