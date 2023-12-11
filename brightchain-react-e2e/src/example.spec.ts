import { expect, test } from '@playwright/test';

test.describe('Splash Page', () => {
  test('displays welcome heading', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /welcome to brightchain/i }),
    ).toBeVisible();
  });

  test('has navigation to demo', async ({ page }) => {
    await page.goto('/');
    const demoLink = page.getByRole('link', { name: /soup can demo/i });
    await expect(demoLink).toBeVisible();
  });

  test('has get started link to register', async ({ page }) => {
    await page.goto('/');
    const registerLink = page.getByRole('link', { name: /get started/i });
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute('href', '/register');
  });
});
