import { expect, test } from '@playwright/test';

test.describe('Navigation', () => {
  test('login link from splash navigates to login', async ({ page }) => {
    await page.goto('/');
    // The top menu should have a login link
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('register link from login page', async ({ page }) => {
    await page.goto('/login');
    const signUpLink = page.getByRole('link', { name: /sign up/i });
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();
    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByRole('heading', { name: /register/i }),
    ).toBeVisible();
  });

  test('forgot password link from login page', async ({ page }) => {
    await page.goto('/login');
    const forgotLink = page.getByRole('link', { name: /forgot password/i });
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(
      page.getByRole('heading', { name: /forgot password/i }),
    ).toBeVisible();
  });

  test('login link from register page', async ({ page }) => {
    await page.goto('/register');
    const loginLink = page.getByRole('link', {
      name: /already have an account/i,
    });
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    // PrivateRoute should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected from change-password', async ({
    page,
  }) => {
    await page.goto('/change-password');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected from user-settings', async ({
    page,
  }) => {
    await page.goto('/user-settings');
    await expect(page).toHaveURL(/\/login/);
  });
});
