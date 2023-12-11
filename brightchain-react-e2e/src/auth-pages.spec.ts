import { expect, test } from '@playwright/test';

test.describe('Auth Pages Render', () => {
  test('login page renders sign in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('register page renders registration form', async ({ page }) => {
    await page.goto('/register');
    await expect(
      page.getByRole('heading', { name: /register/i }),
    ).toBeVisible();
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.getByRole('button', { name: /register/i })).toBeVisible();
  });

  test('forgot password page renders form', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(
      page.getByRole('heading', { name: /forgot password/i }),
    ).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /send reset link/i }),
    ).toBeVisible();
  });

  test('reset password page without token shows error', async ({ page }) => {
    await page.goto('/reset-password');
    // Without a token param, no heading is rendered — just an error alert
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/invalid|expired|token/i);
  });

  test('reset password page with token shows form fields', async ({ page }) => {
    await page.goto('/reset-password?token=fake-token');
    await expect(
      page.getByRole('heading', { name: /password reset/i }),
    ).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /reset password/i }),
    ).toBeVisible();
  });
});
