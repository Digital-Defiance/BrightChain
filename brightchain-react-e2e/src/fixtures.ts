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
 * Password always includes a letter, digit, and special character to satisfy PasswordRegex.
 */
export function generateCredentials(): {
  username: string;
  email: string;
  password: string;
} {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    username: `e2e${id}`,
    email: `e2e_${id}@test.brightchain.local`,
    password: `T3st!Pass${id}`,
  };
}

/**
 * Register a new user via the API and return the auth result.
 * Retries up to 3 times with exponential backoff to handle transient
 * server overload (socket hang up, ECONNRESET) during heavy test concurrency.
 */
export async function registerViaApi(
  baseURL: string,
  retries = 3,
): Promise<AuthResult> {
  const creds = generateCredentials();
  const url = `${baseURL.replace(/\/$/, '')}/api/user/register`;

  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await axios.post(
        url,
        {
          username: creds.username,
          email: creds.email,
          password: creds.password,
        },
        { timeout: 30_000 },
      );

      return {
        token: res.data.data?.token as string,
        memberId: res.data.data?.memberId as string,
        username: creds.username,
        email: creds.email,
        password: creds.password,
      };
    } catch (err: unknown) {
      lastError = err;
      if (axios.isAxiosError(err) && err.response) {
        // Non-retryable HTTP error (4xx) — fail immediately
        if (err.response.status >= 400 && err.response.status < 500) {
          const body =
            typeof err.response.data === 'string'
              ? err.response.data
              : JSON.stringify(err.response.data);
          throw new Error(
            `Registration failed with status ${err.response.status}: ${body}`,
          );
        }
      }
      // Retryable error (socket hang up, 5xx, timeout) — wait and retry
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    }
  }
  // All retries exhausted — format a descriptive error if we have a response
  if (axios.isAxiosError(lastError) && lastError.response) {
    const body =
      typeof lastError.response.data === 'string'
        ? lastError.response.data
        : JSON.stringify(lastError.response.data);
    throw new Error(
      `Registration failed with status ${lastError.response.status}: ${body}`,
    );
  }
  throw lastError;
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
    // Navigate to a neutral page to establish the origin so localStorage is accessible.
    // Retry on transient ERR_ABORTED / ERR_EMPTY_RESPONSE under heavy concurrency.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto('/login', { timeout: 30_000 });
        break;
      } catch {
        if (attempt === 2)
          throw new Error('Failed to navigate to /login after 3 attempts');
        await page.waitForTimeout(2000 * (attempt + 1));
      }
    }
    await page.waitForLoadState('domcontentloaded');

    // Inject JWT into localStorage
    await page.evaluate((token: string) => {
      localStorage.setItem('authToken', token);
    }, authResult.token);

    // Reload so the AuthProvider picks up the token on its initial checkAuth().
    // Use 'domcontentloaded' instead of 'networkidle' — under heavy test
    // concurrency the server can be slow and 'networkidle' may never fire
    // within the test timeout.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
        break;
      } catch {
        if (attempt === 2)
          throw new Error('Failed to reload page after 3 attempts');
        await page.waitForTimeout(2000 * (attempt + 1));
      }
    }
    await page.waitForLoadState('networkidle').catch(() => {});

    // Wait for the auth state to propagate — the Dashboard button only renders
    // when isAuthenticated is true in the TopMenu.
    await page
      .getByRole('link', { name: /dashboard/i })
      .waitFor({
        state: 'visible',
        timeout: 15_000,
      })
      .catch(() => {
        // Fallback: wait a bit longer for auth to settle
      });

    await use(page);
  },
});

export { expect } from '@playwright/test';

/**
 * Wait for React Suspense to resolve after navigating to a lazy-loaded route.
 *
 * The problem: `waitForLoadState('networkidle')` fires before React triggers
 * the lazy chunk request, so the chunk never loads within the idle window.
 *
 * The fix: We wait for meaningful DOM content that can only exist AFTER the
 * lazy chunk has loaded and the route component has rendered. We poll for
 * the disappearance of the top-level Suspense spinner OR the appearance of
 * route-specific content.
 */
export async function waitForSuspense(
  page: Page,
  timeout = 30_000,
): Promise<void> {
  // The app.tsx wraps routes in <Suspense fallback={<CircularProgress />}>.
  // We need the lazy chunk to load before looking for page content.
  //
  // Strategy:
  // 1. Wait for network to settle (lazy chunk is a JS file fetch)
  // 2. Then wait for route-specific content that only exists after the chunk loads
  await page.waitForLoadState('networkidle').catch(() => {});

  const routeContentSelector = [
    // BrightHub layout markers (only exist after brighthub-routes chunk loads)
    '[aria-label="Messaging inbox"]',
    '[data-testid="empty-state"]',
    '[data-testid="email-list"]',
    '[data-testid="inbox-empty"]',
    '[data-testid="inbox-loading"]',
    '[data-testid="compose-modal"]',
    '[data-testid="filter-tabs"]',
    '[data-testid="notification-preferences"]',
    '[role="feed"]',
    '[role="article"]',
    '[role="form"]',
    'form:not([role="search"])',
    'textarea',
    '[contenteditable]',
    // BrightHub inner layout (has "Messages" button — NOT in top menu)
    'button:has-text("Messages")',
    // BrightMail markers
    '[data-testid="thread-view"]',
    // Profile markers
    '[aria-label*="Profile of"]',
    // Login page (for auth guard tests)
    'h1:has-text("Sign In")',
  ].join(', ');

  await page.waitForSelector(routeContentSelector, { timeout }).catch(() => {
    // Chunk may still be loading — continue and let test assertions handle it
  });
}

/**
 * Wait for a page-level loading spinner to disappear.
 *
 * Many BrightHub pages render a CircularProgress while fetching data.
 * waitForSuspense resolves when the outer Suspense boundary clears, but
 * the inner page component may still be showing its own spinner.
 * This helper waits for ALL progressbar/CircularProgress elements to
 * either disappear or for real content to appear.
 */
export async function waitForPageContent(
  page: Page,
  timeout = 15_000,
): Promise<void> {
  // Wait until there are no visible progressbar elements, OR until
  // meaningful non-spinner content appears.
  await page
    .waitForFunction(
      () => {
        const spinners = document.querySelectorAll('[role="progressbar"]');
        const visibleSpinners = Array.from(spinners).filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        if (visibleSpinners.length === 0) return true;
        // Also check if real content appeared alongside the spinner
        const hasContent = document.querySelector(
          'textarea, [contenteditable], [role="feed"], [data-testid="empty-state"], [role="article"], [data-testid="email-list"], [data-testid="inbox-empty"]',
        );
        return !!hasContent;
      },
      { timeout },
    )
    .catch(() => {
      // If we time out, continue anyway — the test assertions will catch the real issue
    });
}
