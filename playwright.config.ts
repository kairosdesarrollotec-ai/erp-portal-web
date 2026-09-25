import { defineConfig, devices } from '@playwright/test';

/**
 * E2E Playwright — erp-portal-web.
 *
 * La app se construye antes de correr los tests con variables Firebase
 * simuladas (ver apps/web/.env.e2e). Las llamadas reales a Firebase y al
 * backend son interceptadas por page.route() en e2e/helpers/routes.ts.
 *
 * CI: npm run build:web:e2e → npm run test:e2e (playwright inicia vite preview).
 * Local: misma secuencia, o reusar un preview ya corriendo en 4173.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run preview:web',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
