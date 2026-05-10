import { workspaceRoot } from '@nx/devkit';
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Digital Burnbag E2E tests.
 *
 * Tests run against the real BrightChain API server (which serves both
 * the React app and the /api/burnbag/* endpoints).
 *
 * The webServer block auto-starts the equivalent of `yarn serve:api:dev`
 * (serve-full builds both API + React frontend).
 *
 * Or set BASE_URL to point at a running instance.
 */
const baseURL = process.env['BASE_URL'] || 'http://localhost:3002';

export default defineConfig({
  testDir: './src/lib/__tests__/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  workers: 1, // serial — tests share server state
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  globalSetup: './src/lib/__tests__/e2e/global-setup.ts',
  globalTeardown: './src/lib/__tests__/e2e/global-teardown.ts',
  /* Auto-start the built API + React server directly (builds are handled by
     the e2e target's dependsOn in project.json, so we skip the Nx executor
     overhead and just run the compiled output). */
  webServer: {
    command: 'node --import tsx --no-warnings dist/brightchain-api/main.js',
    env: {
      /* Prevent the dev .env file (which hardcodes PORT=3000) from overriding
         our PORT. BRIGHTCHAIN_ENV_FILE=/dev/null skips .env loading entirely. */
      BRIGHTCHAIN_ENV_FILE: '/dev/null',
      NODE_OPTIONS: '--max-old-space-size=16384',
      NODE_ENV: 'development',
      DEV_DATABASE: 'e2e-burnbag-pool',
      HOST: 'localhost',
      PORT: '3002',
      SERVER_URL: 'http://localhost:3002',
      DEBUG: 'false',
      LETS_ENCRYPT_ENABLED: 'false',
      UPNP_ENABLED: 'false',
      USE_TRANSACTIONS: 'false',
      DISABLE_EMAIL_SEND: 'true',
      JWT_SECRET:
        'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
      MNEMONIC_HMAC_SECRET:
        '809ec1ae1ded0d2e89fabec3f9de33d26e3bb56871c3de91b035fd4671b90795',
      MNEMONIC_ENCRYPTION_KEY:
        '0fddee346b813a97483ee05939edba64dfb7dced822b42b9059f890b86ab496d',
      SYSTEM_MNEMONIC:
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      ENABLED_FEATURES:
        'BrightChat,BrightHub,BrightMail,BrightPass,DigitalBurnbag,BrightChart',
      REACT_DIST_DIR: `${workspaceRoot}/dist/brightchain-react`,
      API_DIST_DIR: `${workspaceRoot}/dist/brightchain-api`,
    },
    url: 'http://localhost:3002/api/health',
    reuseExistingServer: !process.env.CI,
    cwd: workspaceRoot,
    /* Server init includes crypto setup, DB seeding, and FEC initialization */
    timeout: 300_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
