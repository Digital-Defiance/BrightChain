import { test as base, Page } from '@playwright/test';
import axios from 'axios';

/**
 * Shared Playwright fixtures for authenticated E2E tests.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.2
 */

export interface AuthResult {
  token: string;
  memberId: string;
  username: string;
  email: string;
  password: string;
}

/**
 * Generate unique credentials using Date.now() + random suffix.
 * Matches the existing `uniqueUser()` pattern from user-management.e2e.spec.ts.
 */
export function generateCredentials(): {
  username: string;
  email: string;
  password: string;
} {
  const id =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    username: `e2e_${id}`,
    email: `e2e_${id}@test.brightchain.local`,
    password: `TestPass!${id}`,
  };
}

/**
 * Register a new user via the API and return the auth result.
 * Throws a descriptive error on non-2xx responses.
 */
export async function registerViaApi(baseURL: string): Promise<AuthResult> {
  const creds = generateCredentials();
  const url = `${baseURL.replace(/\/$/, '')}/api/user/register`;

  let res;
  try {
    res = await axios.post(url, {
      username: creds.username,
      email: creds.email,
      password: creds.password,
    });
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      const body =
        typeof err.response.data === 'string'
          ? err.response.data
          : JSON.stringify(err.response.data);
      throw new Error(
        `Registration failed with status ${err.response.status}: ${body}`,
      );
    }
    throw err;
  }

  return {
    token: res.data.data?.token as string,
    memberId: res.data.data?.memberId as string,
    username: creds.username,
    email: creds.email,
    password: creds.password,
  };
}

/**
 * Custom Playwright test with `authenticatedPage` and `authResult` fixtures.
 *
 * `authenticatedPage` registers a fresh user via the API, navigates to a
 * neutral page to establish the origin, injects the JWT into localStorage
 * as `authToken`, and provides the Page for test use.
 */
export const test = base.extend<{
  authenticatedPage: Page;
  authResult: AuthResult;
}>({
  authResult: async ({ baseURL }, use) => {
    const result = await registerViaApi(baseURL ?? 'http://localhost:3000');
    await use(result);
  },

  authenticatedPage: async ({ page, authResult }, use) => {
    // Navigate to a neutral page to establish the origin so localStorage is accessible
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Inject JWT into localStorage
    await page.evaluate((token: string) => {
      localStorage.setItem('authToken', token);
    }, authResult.token);

    await use(page);
  },
});

export { expect } from '@playwright/test';
