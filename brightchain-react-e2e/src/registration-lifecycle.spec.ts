import { test as base, expect as baseExpect } from '@playwright/test';
import axios from 'axios';
import { expect, generateCredentials, test } from './fixtures';

/**
 * Registration Lifecycle UI E2E Tests.
 *
 * Requirements: 6.1, 6.2, 6.3
 *
 * These tests verify the full registration lifecycle: form submission,
 * authenticated dashboard access, and password change flow.
 */

base.describe('Registration Form Submission', () => {
  base(
    'fills registration form with valid credentials and submits successfully',
    async ({ page }) => {
      // Requirement 6.1: fill registration form, submit, verify success or navigation away
      const creds = generateCredentials();

      await page.goto('/register');
      await baseExpect(
        page.getByRole('heading', { name: /register/i }),
      ).toBeVisible({ timeout: 15000 });

      // Fill the registration form fields
      await page.locator('#username').fill(creds.username);
      await page.locator('#email').fill(creds.email);
      await page.locator('#password').fill(creds.password);
      await page.locator('#confirmPassword').fill(creds.password);

      // Submit the form
      await page.getByRole('button', { name: /register/i }).click();

      // After submission, the form should either:
      // - Navigate away from /register (to /verify-email or /login)
      // - Show a success alert on the page
      // - Show a "Registering…" indicator followed by success
      //
      // Race: wait for a success alert OR a URL change away from /register.
      const successAlert = page
        .getByRole('alert')
        .filter({ hasText: /success/i });

      await Promise.race([
        baseExpect(successAlert).toBeVisible({ timeout: 30000 }),
        page.waitForURL(/\/(verify-email|login|dashboard)/, { timeout: 30000 }),
      ]);

      // Confirm we either left the registration page or see a success alert
      const hasSuccessAlert = await successAlert.isVisible().catch(() => false);
      const leftRegister = !page.url().includes('/register');

      baseExpect(hasSuccessAlert || leftRegister).toBeTruthy();
    },
  );
});

test.describe('Authenticated Dashboard Access', () => {
  test('registered user can access dashboard with authenticated content', async ({
    authenticatedPage,
    authResult,
  }) => {
    // Requirement 6.2: after auth helper registration, navigate to dashboard,
    // verify authenticated content including the correct username
    await authenticatedPage.goto('/dashboard');

    // Verify the dashboard heading is visible (authenticated content)
    await expect(
      authenticatedPage.getByRole('heading', { name: /dashboard/i }).first(),
    ).toBeVisible({ timeout: 15000 });

    // Verify authenticated content is present — the dashboard shows energy
    // balance cards which are only rendered for authenticated users
    await expect(
      authenticatedPage.getByText(/energy balance|reputation|loading/i).first(),
    ).toBeVisible({ timeout: 10000 });

    // Verify the username is present via the profile API — the dashboard
    // itself doesn't render the username, but we can confirm the authenticated
    // session belongs to the correct user by calling the profile endpoint
    const baseURL = authenticatedPage.url().replace(/\/dashboard.*$/, '');
    const profileRes = await axios.get(`${baseURL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${authResult.token}` },
    });
    expect(profileRes.status).toBe(200);
    expect(profileRes.data.data.username).toBe(authResult.username);
  });
});

test.describe('Password Change Lifecycle', () => {
  test('change password succeeds and new password works for login', async ({
    authenticatedPage,
    authResult,
  }) => {
    // Requirement 6.3: navigate to /change-password, submit valid current and
    // new passwords, verify success, then verify login works with the new password
    const newPassword = `NewPass!${Date.now().toString(36)}`;

    await authenticatedPage.goto('/change-password');

    // Verify the change password form renders
    await expect(
      authenticatedPage.getByRole('heading', { name: /change password/i }),
    ).toBeVisible({ timeout: 15000 });

    // Fill in the change password form
    await authenticatedPage
      .locator('#currentPassword')
      .fill(authResult.password);
    await authenticatedPage.locator('#newPassword').fill(newPassword);
    await authenticatedPage.locator('#confirmPassword').fill(newPassword);

    // Submit the form
    await authenticatedPage
      .getByRole('button', { name: /change password/i })
      .click();

    // Verify success message appears
    await expect(
      authenticatedPage.getByRole('alert').filter({ hasText: /success/i }),
    ).toBeVisible({ timeout: 15000 });

    // Verify the new password works by calling the login API directly.
    // BrightChain uses ECIES key derivation so browser-based password login
    // isn't reliable in Playwright — we verify via the API instead.
    const baseURL = authenticatedPage.url().replace(/\/change-password.*$/, '');
    const loginRes = await axios.post(
      `${baseURL}/api/user/login`,
      {
        email: authResult.email,
        password: newPassword,
      },
      { validateStatus: () => true },
    );

    // The login should succeed (200) or return a token
    expect(loginRes.status).toBe(200);
    expect(loginRes.data.data?.token).toBeTruthy();
  });
});
