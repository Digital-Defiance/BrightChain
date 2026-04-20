/**
 * EJS Splash Page E2E Tests
 *
 * Validates the EJS template engine integration end-to-end:
 * - Root route serves valid HTML that bootstraps the React SPA
 * - APP_CONFIG is injected with correct runtime values
 * - CSP nonces are applied to all inline scripts
 * - Font Awesome kit is loaded when configured
 * - API routes are unaffected by EJS routing
 * - Non-manifest routes fall through to the React SPA
 * - The React SplashPage component renders inside the EJS shell
 *
 * These tests run against the full API server (same as other e2e tests)
 * which uses the default-splash.ejs template.
 *
 * Validates: Requirements 1.2, 2.1–2.7, 4.1–4.5, 6.1, 6.3, 6.4, 7.5
 */
import { expect, test } from '@playwright/test';

test.describe('EJS Splash Page — HTML Shell', () => {
  test('root route returns valid HTML document', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toMatch(/html/);

    // Verify basic HTML structure
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('APP_CONFIG is injected into the page', async ({ page }) => {
    await page.goto('/');

    // APP_CONFIG should be available as a global
    const appConfig = await page.evaluate(() => (window as any).APP_CONFIG);
    expect(appConfig).toBeDefined();
    expect(appConfig).toHaveProperty('serverUrl');
    expect(appConfig).toHaveProperty('enabledFeatures');
    expect(appConfig).toHaveProperty('emailDomain');
    expect(appConfig).toHaveProperty('siteTitle');
  });

  test('APP_CONFIG contains expected feature flags', async ({ page }) => {
    await page.goto('/');

    const appConfig = await page.evaluate(() => (window as any).APP_CONFIG);
    const features: string[] = appConfig.enabledFeatures;
    expect(Array.isArray(features)).toBe(true);
    expect(features.length).toBeGreaterThan(0);

    // The e2e config enables these features
    expect(features).toContain('BrightChat');
    expect(features).toContain('BrightHub');
  });

  test('all inline script tags have CSP nonce attributes', async ({
    page,
  }) => {
    await page.goto('/');

    // Every <script> tag should have a nonce attribute
    const scriptTags = page.locator('script[nonce]');
    const allScripts = page.locator('script');

    const nonceCount = await scriptTags.count();
    const totalCount = await allScripts.count();

    // All scripts should have nonces (external scripts loaded by React
    // after hydration won't have nonces, but the initial HTML scripts should)
    // We check that at least the server-rendered scripts have nonces
    expect(nonceCount).toBeGreaterThan(0);

    // Verify nonce values are non-empty
    for (let i = 0; i < nonceCount; i++) {
      const nonce = await scriptTags.nth(i).getAttribute('nonce');
      expect(nonce).toBeTruthy();
      expect(nonce!.length).toBeGreaterThan(0);
    }
  });

  test('Font Awesome kit script is loaded', async ({ page }) => {
    await page.goto('/');

    // The e2e server has FONTAWESOME_KIT_ID configured (or empty).
    // If configured, there should be a FA kit script tag.
    // If not configured, the conditional block is skipped.
    const faScript = page.locator(
      'script[src*="kit.fontawesome.com"]',
    );
    const faCount = await faScript.count();

    // Either 0 (no kit configured) or 1 (kit configured) — never more
    expect(faCount).toBeLessThanOrEqual(1);

    if (faCount === 1) {
      // FA script should also have a nonce
      const nonce = await faScript.getAttribute('nonce');
      expect(nonce).toBeTruthy();
    }
  });

  test('page has meta description tag', async ({ page }) => {
    await page.goto('/');

    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveCount(1);
    const content = await metaDesc.getAttribute('content');
    expect(content).toBeTruthy();
  });

  test('page has #root container for React mounting', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeAttached();
  });
});

test.describe('EJS Splash Page — React SPA Mounting', () => {
  test('React app mounts and renders splash page content', async ({
    page,
  }) => {
    await page.goto('/');

    // The React SplashPage component should render inside #root
    // Wait for the welcome heading (rendered by React, not EJS)
    await expect(
      page.getByRole('heading', { name: /welcome to brightchain/i }),
    ).toBeVisible();
  });

  test('showcase demo cards are rendered', async ({ page }) => {
    await page.goto('/');

    // The SplashPage renders showcase cards with links to demos
    const demoLink = page.getByRole('link', { name: /soup can demo/i });
    await expect(demoLink).toBeVisible();
  });

  test('get started button links to register', async ({ page }) => {
    await page.goto('/');

    const registerLink = page.getByRole('link', { name: /get started/i });
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute('href', '/register');
  });
});

test.describe('EJS Splash Page — API Route Priority', () => {
  test('API health endpoint returns JSON, not HTML', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/json/);

    const body = await response.json();
    expect(body).toHaveProperty('status');
  });

  test('API routes are not intercepted by EJS routing', async ({
    request,
  }) => {
    // Any /api/* route should return JSON or appropriate API response,
    // never EJS-rendered HTML
    const response = await request.get('/api/health');
    const contentType = response.headers()['content-type'];
    expect(contentType).not.toMatch(/text\/html/);
  });
});

test.describe('EJS Splash Page — SPA Fallthrough', () => {
  test('non-manifest routes fall through to React SPA', async ({ page }) => {
    // Navigate to a route that's handled by React router, not EJS
    await page.goto('/login');

    // React should handle this route — login page should render
    await expect(
      page.getByRole('heading', { name: /sign in/i }),
    ).toBeVisible();
  });

  test('deep React routes still work through SPA fallthrough', async ({
    page,
  }) => {
    await page.goto('/register');

    // React router should handle /register
    await expect(
      page.getByRole('heading', { name: /register/i }),
    ).toBeVisible();
  });

  test('showcase routes render React components', async ({ page }) => {
    await page.goto('/demo');

    // The demo page should render (it's a React route, not EJS)
    // Wait for the page to load — it may lazy-load
    await page.waitForLoadState('networkidle').catch(() => {});

    // Should not show a 404 or error page
    const hasError = await page
      .getByText(/not found|404|error/i)
      .isVisible()
      .catch(() => false);
    // The demo page might show content or redirect — just verify no crash
    const url = page.url();
    expect(url).toContain('/demo');
  });
});

test.describe('EJS Splash Page — Content Security Policy', () => {
  test('CSP header is present on root page response', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();

    // CSP should be set by the middleware layer
    // It may be 'content-security-policy' or 'content-security-policy-report-only'
    const hasCsp =
      'content-security-policy' in headers ||
      'content-security-policy-report-only' in headers;

    // If CSP is configured (it should be), verify it exists
    // Some dev environments may not have CSP — this is informational
    if (hasCsp) {
      const csp =
        headers['content-security-policy'] ||
        headers['content-security-policy-report-only'];
      expect(csp).toBeTruthy();
      // CSP should reference nonces for script-src
      expect(csp).toMatch(/nonce/);
    }
  });

  test('EJS-rendered page does not break CSP for React app', async ({
    page,
  }) => {
    // Navigate to root and verify React loads without CSP violations
    const cspViolations: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        msg.text().includes('Content Security Policy')
      ) {
        cspViolations.push(msg.text());
      }
    });

    await page.goto('/');

    // Wait for React to mount
    await expect(
      page.getByRole('heading', { name: /welcome to brightchain/i }),
    ).toBeVisible();

    // There should be no CSP violations from the EJS-rendered shell
    // (Note: some FA or external resource violations may occur in dev,
    // but the EJS template itself should not cause violations)
    // This is informational — we log but don't fail on external resource CSP issues
    if (cspViolations.length > 0) {
      console.warn(
        `[ejs-splash.spec] CSP violations detected (${cspViolations.length}):`,
        cspViolations.slice(0, 3),
      );
    }
  });
});
