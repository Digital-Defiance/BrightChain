import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';

import { workspaceRoot } from '@nx/devkit';

// The API server serves both REST endpoints and the React SPA on port 3000.
const baseURL = process.env['BASE_URL'] || 'http://localhost:3000';

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  /* Generous timeout — first run builds assets */
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  /* Start the BrightChain API server which also serves the React app */
  webServer: {
    command: 'npx nx serve-full brightchain-api',
    env: {
      DEV_DATABASE: 'e2e-react-pool',
      HOST: 'localhost',
      PORT: '3000',
      SERVER_URL: 'http://localhost:3000',
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
      REACT_DIST_DIR: `${workspaceRoot}/dist/brightchain-react`,
      API_DIST_DIR: `${workspaceRoot}/dist/brightchain-api`,
    },
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    cwd: workspaceRoot,
    /* Increased timeout to allow for build time (serve-full builds both API and React) */
    timeout: 300_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
