/**
 * Playwright global setup — runs once before all tests.
 *
 * Verifies the API server is reachable and seeds test data by:
 * 1. Registering a test user via the API
 * 2. Storing auth token + browser state in shared files
 *
 * The real API server must be running at BASE_URL (default http://localhost:3000).
 */
import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3002';
const STATE_DIR = path.join(__dirname, '.auth');
export const AUTH_STATE_PATH = path.join(STATE_DIR, 'user.json');
export const TOKEN_PATH = path.join(STATE_DIR, 'token.json');
export const VAULT_PATH = path.join(STATE_DIR, 'vault.json');

// Generate unique credentials per run to avoid collisions with reused servers.
const RUN_ID = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const TEST_USER = {
  username: `e2e_bb_${RUN_ID}`,
  email: `e2e_bb_${RUN_ID}@test.brightchain.local`,
  password: `T3st!Pass${RUN_ID}`,
};

async function globalSetup(_config: FullConfig) {
  // Ensure state directory exists
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }

  // Wait for server to be reachable
  const maxRetries = 30;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) break;
    } catch {
      // Server not ready yet
    }
    if (i === maxRetries - 1) {
      throw new Error(
        `API server not reachable at ${BASE_URL} after ${maxRetries} retries. ` +
          'Start it with: yarn serve:api:dev',
      );
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Register a fresh test user via the API.
  let token: string | undefined;

  try {
    const registerRes = await fetch(`${BASE_URL}/api/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: TEST_USER.username,
        email: TEST_USER.email,
        password: TEST_USER.password,
      }),
    });
    const registerBody = await registerRes.json().catch(() => ({}));
    if (registerRes.ok) {
      token = (
        registerBody as Record<string, unknown> & { data?: { token?: string } }
      ).data?.token;
      console.log(
        `[global-setup] Registration succeeded for ${TEST_USER.username}, token=${token ? 'present' : 'missing'}`,
      );
    } else {
      console.warn(
        `[global-setup] Registration failed: ${registerRes.status}`,
        JSON.stringify(registerBody),
      );
    }
  } catch (err) {
    console.warn('[global-setup] Registration request error:', err);
  }

  // Fallback: try login with username (the API login endpoint expects username, not email)
  if (!token) {
    try {
      const loginRes = await fetch(`${BASE_URL}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_USER.username,
          password: TEST_USER.password,
        }),
      });
      const loginBody = await loginRes.json().catch(() => ({}));
      if (loginRes.ok) {
        token = (
          loginBody as Record<string, unknown> & { data?: { token?: string } }
        ).data?.token;
        console.log(
          `[global-setup] Login succeeded, token=${token ? 'present' : 'missing'}`,
        );
      } else {
        console.warn(
          `[global-setup] Login failed: ${loginRes.status}`,
          JSON.stringify(loginBody),
        );
      }
    } catch (err) {
      console.warn('[global-setup] Login request error:', err);
    }
  }

  if (!token) {
    console.error(
      '[global-setup] WARNING: No auth token obtained. Tests will run unauthenticated.',
    );
  }

  // Save the token for the API fixture
  fs.writeFileSync(TOKEN_PATH, JSON.stringify({ token: token ?? '' }), 'utf-8');

  // Create a default vault container for the test user so that
  // folder/upload operations have a valid container to work with.
  let vaultContainerId = '';
  if (token) {
    try {
      const vaultRes = await fetch(`${BASE_URL}/api/burnbag/vaults`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'E2E Default Vault' }),
      });
      if (vaultRes.ok) {
        const vaultBody = (await vaultRes.json()) as Record<string, unknown>;
        vaultContainerId = (vaultBody['id'] as string) ?? '';
        console.log(
          `[global-setup] Vault container created: ${vaultContainerId}`,
        );
      } else {
        console.warn(
          `[global-setup] Vault creation failed: ${vaultRes.status}`,
          await vaultRes.text(),
        );
      }
    } catch (err) {
      console.warn('[global-setup] Vault creation error:', err);
    }
  }
  fs.writeFileSync(VAULT_PATH, JSON.stringify({ vaultContainerId }), 'utf-8');

  // Use a browser to set up localStorage with the auth token
  // so the React app's AuthProvider picks it up.
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  try {
    // Navigate to establish origin
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    if (token) {
      // Inject JWT into localStorage
      await page.evaluate((t: string) => {
        localStorage.setItem('authToken', t);
      }, token);

      // Reload so AuthProvider picks up the token and verifies it
      await page.reload({ waitUntil: 'networkidle' });
    }

    await context.storageState({ path: AUTH_STATE_PATH });
  } catch (err) {
    console.warn(
      '[global-setup] Could not complete auth setup. Tests may run unauthenticated.',
      err,
    );
    await context.storageState({ path: AUTH_STATE_PATH });
  } finally {
    await browser.close();
  }
}

export default globalSetup;
