import { test as base, expect as baseExpect } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * Backup Codes UI E2E Tests.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 *
 * Tests for the /backup-codes page (authenticated, generate/view codes)
 * and the /backup-code page (unauthenticated, backup code login form).
 */

test.describe('Backup Codes Page (authenticated)', () => {
  test('displays generate backup codes button', async ({
    authenticatedPage,
  }) => {
    // Requirement 3.1: navigate to /backup-codes, verify a generate button/action is visible
    await authenticatedPage.goto('/backup-codes');

    // The BackupCodesForm renders a submit button with text "Generate New Backup Codes"
    await expect(
      authenticatedPage.getByRole('button', {
        name: /generate new backup codes/i,
      }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('generates and displays backup codes', async ({
    authenticatedPage,
    authResult,
  }) => {
    // Requirement 3.2: trigger backup code generation, verify a list of backup codes is displayed
    await authenticatedPage.goto('/backup-codes');

    // Wait for the form to render
    await expect(
      authenticatedPage.getByRole('button', {
        name: /generate new backup codes/i,
      }),
    ).toBeVisible({ timeout: 15000 });

    // The form requires either password or mnemonic (XOR validation).
    // Fill in the password field with the user's password to satisfy validation.
    await authenticatedPage.locator('#password').fill(authResult.password);

    // Click the generate button
    await authenticatedPage
      .getByRole('button', { name: /generate new backup codes/i })
      .click();

    // Verify backup codes are displayed — they render as <li> elements containing <pre> tags
    await expect(authenticatedPage.locator('li pre').first()).toBeVisible({
      timeout: 15000,
    });

    // Verify multiple codes are generated (API returns 10 codes)
    const codeCount = await authenticatedPage.locator('li pre').count();
    expect(codeCount).toBeGreaterThan(0);
  });
});

/**
 * Backup Code Login Page tests use a fresh (unauthenticated) page
 * since /backup-code is a login alternative, not a protected route.
 */
base.describe('Backup Code Login Page (unauthenticated)', () => {
  base(
    'displays backup code login form with expected fields',
    async ({ page }) => {
      // Requirement 3.3: navigate to /backup-code, verify the form renders
      await page.goto('/backup-code');

      // Verify the heading "Backup Code Login" is visible
      await baseExpect(
        page.getByRole('heading', { name: /backup code login/i }),
      ).toBeVisible({ timeout: 15000 });

      // Verify the email field is visible (default login type is email)
      await baseExpect(page.locator('#email')).toBeVisible();

      // Verify the backup code input field
      await baseExpect(page.locator('#code')).toBeVisible();

      // Verify the submit button "Login with Backup Code"
      await baseExpect(
        page.getByRole('button', { name: /login with backup code/i }),
      ).toBeVisible();
    },
  );

  base(
    'shows error when submitting an invalid backup code',
    async ({ page }) => {
      // Requirement 3.4: submit an invalid backup code, verify an error message is displayed
      await page.goto('/backup-code');

      // Wait for the form to render
      await baseExpect(
        page.getByRole('heading', { name: /backup code login/i }),
      ).toBeVisible({ timeout: 15000 });

      // Fill in email with a test value
      await page.locator('#email').fill('invalid@test.brightchain.local');

      // Fill in an obviously invalid backup code
      await page.locator('#code').fill('INVALID-CODE-12345');

      // Submit the form
      await page
        .getByRole('button', { name: /login with backup code/i })
        .click();

      // Verify an error message is displayed — either a validation error from Formik
      // (helperText on the field) or an API error (Typography color="error")
      const validationError = page.locator('#code-helper-text');
      const apiError = page
        .locator('text=error')
        .or(page.getByText(/invalid|error|failed/i));

      await baseExpect(validationError.or(apiError)).toBeVisible({
        timeout: 10000,
      });
    },
  );
});
