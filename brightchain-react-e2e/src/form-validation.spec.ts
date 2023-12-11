import { expect, test } from '@playwright/test';

test.describe('Form Validation', () => {
  test('login form does not submit with empty fields', async ({ page }) => {
    await page.goto('/login');
    // Click sign in with empty fields
    await page.getByRole('button', { name: /sign in/i }).click();
    // Should stay on login page (not navigate to dashboard)
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/login/);
    // The sign-in heading should still be visible
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('login form shows invalid email error', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('not-an-email');
    await page.locator('#password').fill('somepassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Email validation
    await expect(page.locator('text=/invalid email|valid email/i')).toBeVisible(
      { timeout: 5000 },
    );
  });

  test('register form shows validation errors on empty submit', async ({
    page,
  }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /register/i }).click();
    // Multiple required field errors
    const requiredErrors = page.locator('text=Required');
    await expect(requiredErrors.first()).toBeVisible({ timeout: 5000 });
  });

  test('register form validates password mismatch', async ({ page }) => {
    await page.goto('/register');
    await page.locator('#username').fill('testuser');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('TestPass123!');
    await page.locator('#confirmPassword').fill('DifferentPass123!');
    await page.getByRole('button', { name: /register/i }).click();
    await expect(page.locator('text=/passwords must match/i')).toBeVisible({
      timeout: 5000,
    });
  });

  test('forgot password form validates email', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByRole('button', { name: /send reset link/i }).click();
    await expect(page.locator('text=Required')).toBeVisible({ timeout: 5000 });
  });

  test('forgot password form validates invalid email', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.locator('#email').fill('not-an-email');
    await page.getByRole('button', { name: /send reset link/i }).click();
    await expect(page.locator('text=/invalid email|valid email/i')).toBeVisible(
      { timeout: 5000 },
    );
  });

  test('login form can toggle to username mode', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /use username/i }).click();
    await expect(page.locator('#username')).toBeVisible();
  });
});
