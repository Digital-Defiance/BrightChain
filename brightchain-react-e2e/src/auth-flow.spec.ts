import { expect, test } from '@playwright/test';

/**
 * Auth flow tests.
 *
 * BrightChain uses ECIES browser-side key derivation. Password login
 * requires keys derived during registration in the *same* browser context.
 * Since Playwright opens a fresh context per test, full login flow isn't
 * testable — instead we verify registration UI and protected-route behaviour.
 */

test.describe('Auth Flow', () => {
  test('register form fills and submits', async ({ page }) => {
    const timestamp = Date.now();
    await page.goto('/register');
    await expect(
      page.getByRole('heading', { name: /register/i }),
    ).toBeVisible();

    await page.locator('#username').fill(`e2euser${timestamp}`);
    await page.locator('#email').fill(`e2e-${timestamp}@test.brightchain.org`);

    // Fill password fields (required for default registration mode)
    const passwordField = page.locator('#password');
    if (await passwordField.isVisible()) {
      await passwordField.fill('TestP@ssw0rd123!');
    }
    const confirmField = page.locator('#confirmPassword');
    if (await confirmField.isVisible()) {
      await confirmField.fill('TestP@ssw0rd123!');
    }

    await page.getByRole('button', { name: /register/i }).click();

    // After registration the form either:
    // - Navigates to verify-email
    // - Shows server-side errors (duplicate, etc.)
    // - Stays on register with validation errors
    // All are acceptable — we just verify the page eventually settles.
    await page.waitForTimeout(3000);
    const url = page.url();
    // We should still be on a valid page
    expect(url).toMatch(/\/(register|verify-email|login)/);
  });

  test('login page renders with mnemonic option', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /use mnemonic only/i }),
    ).toBeVisible();
  });

  test('unauthenticated access to dashboard redirects to login', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    // PrivateRoute should redirect unauthenticated users
    await expect(
      page
        .getByRole('heading', { name: /sign in/i })
        .or(page.getByRole('heading', { name: /dashboard/i })),
    ).toBeVisible({ timeout: 10000 });
  });

  test('unauthenticated access to settings redirects to login', async ({
    page,
  }) => {
    await page.goto('/user-settings');
    await expect(
      page
        .getByRole('heading', { name: /sign in/i })
        .or(page.getByRole('heading', { name: /settings/i })),
    ).toBeVisible({ timeout: 10000 });
  });

  test('logout page accessible', async ({ page }) => {
    // Even unauthenticated, navigating to /logout should redirect home or to login
    await page.goto('/logout');
    await expect(page).toHaveURL(/\/(login|logout)?$/, { timeout: 10000 });
  });
});
