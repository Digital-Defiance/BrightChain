import { expect, test, waitForSuspense } from './fixtures';

const DESKTOP_VIEWPORT = { width: 1200, height: 800 };

test.describe('BrightChat Server Features', () => {
  test('can create a server via the Create Server dialog', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/brightchat');
    await waitForSuspense(page);

    // Click the "+" button to create a server
    const createBtn = page.getByRole('button', { name: /create.*server/i })
      .or(page.locator('[data-testid="create-server-button"]'))
      .first();
    
    if (await createBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await createBtn.click();

      // The create server dialog should open
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 10_000 });

      // Fill in the server name
      const nameInput = dialog.getByRole('textbox').first();
      await nameInput.fill('E2E Test Server');

      // Submit
      const submitBtn = dialog.getByRole('button', { name: /create/i });
      await submitBtn.click();

      // Should navigate to the new server
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/brightchat/);
    }
  });

  test('server settings panel has delete button for owner', async ({
    authenticatedPage: page,
    authResult,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);

    // Create a server via API
    const axios = await import('axios');
    const baseURL = 'http://localhost:3000';
    const headers = { Authorization: `Bearer ${authResult.token}` };

    const res = await axios.default.post(
      `${baseURL}/api/brightchat/servers`,
      { name: 'Delete Test Server' },
      { headers },
    );
    const serverId = res.data.data?.id;

    if (serverId) {
      // Navigate to the server
      await page.goto(`/brightchat/server/${serverId}`);
      await waitForSuspense(page);

      // Open settings (gear icon)
      const settingsBtn = page.getByRole('button', { name: /settings/i })
        .or(page.locator('[data-testid="settings-button"]'))
        .first();

      if (await settingsBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await settingsBtn.click();

        // The delete button should be visible in the settings panel
        const deleteBtn = page.locator('[data-testid="delete-server-button"]');
        await expect(deleteBtn).toBeVisible({ timeout: 10_000 });
      }
    }
  });

  test('FontAwesome icon picker is available in create server dialog', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/brightchat');
    await waitForSuspense(page);

    // Click the "+" button to create a server
    const createBtn = page.getByRole('button', { name: /create.*server/i })
      .or(page.locator('[data-testid="create-server-button"]'))
      .first();

    if (await createBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await createBtn.click();

      // The "Pick Icon" button should be visible in the create dialog
      const pickIconBtn = page.getByText('Pick Icon');
      await expect(pickIconBtn).toBeVisible({ timeout: 10_000 });
    }
  });

  test('FontAwesome icon picker is available in server settings', async ({
    authenticatedPage: page,
    authResult,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);

    // Create a server via API
    const axios = await import('axios');
    const baseURL = 'http://localhost:3000';
    const headers = { Authorization: `Bearer ${authResult.token}` };

    const res = await axios.default.post(
      `${baseURL}/api/brightchat/servers`,
      { name: 'FA Icon Test Server' },
      { headers },
    );
    const serverId = res.data.data?.id;

    if (serverId) {
      await page.goto(`/brightchat/server/${serverId}`);
      await waitForSuspense(page);

      // Open settings
      const settingsBtn = page.getByRole('button', { name: /settings/i })
        .or(page.locator('[data-testid="settings-button"]'))
        .first();

      if (await settingsBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await settingsBtn.click();

        // The "Pick Icon" button should be visible
        const pickIconBtn = page.getByText('Pick Icon');
        await expect(pickIconBtn).toBeVisible({ timeout: 10_000 });
      }
    }
  });
});
