import { test, expect } from './fixtures';

/**
 * User Settings UI E2E Tests.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 *
 * These tests verify that authenticated users can view and update their
 * preferences through the browser on the /user-settings page.
 */

test.describe('User Settings Page', () => {
  test('displays settings form with all expected fields', async ({
    authenticatedPage,
  }) => {
    // Requirement 2.1: navigate to /user-settings, verify the settings form renders
    await authenticatedPage.goto('/user-settings');

    // Verify the settings heading is visible
    await expect(
      authenticatedPage.getByRole('heading', { name: /settings/i }),
    ).toBeVisible({ timeout: 15000 });

    // Verify email field
    await expect(authenticatedPage.locator('#email')).toBeVisible();

    // Verify timezone select
    await expect(authenticatedPage.locator('#timezone')).toBeVisible();

    // Verify currency select
    await expect(authenticatedPage.locator('#currency')).toBeVisible();

    // Verify site language select
    await expect(authenticatedPage.locator('#siteLanguage')).toBeVisible();

    // Verify dark mode toggle
    await expect(authenticatedPage.locator('#darkMode')).toBeVisible();

    // Verify direct challenge toggle
    await expect(authenticatedPage.locator('#directChallenge')).toBeVisible();
  });

  test('modify timezone and submit shows success message', async ({
    authenticatedPage,
  }) => {
    // Requirement 2.2: modify the timezone field, submit, verify success message
    await authenticatedPage.goto('/user-settings');
    await expect(
      authenticatedPage.getByRole('heading', { name: /settings/i }),
    ).toBeVisible({ timeout: 15000 });

    // Open the timezone dropdown and select a different timezone
    await authenticatedPage.locator('#timezone').click();

    // Select "America/New_York" from the dropdown listbox
    const listbox = authenticatedPage.getByRole('listbox');
    await expect(listbox).toBeVisible();
    await listbox.getByRole('option', { name: 'America/New_York' }).click();

    // Submit the form
    await authenticatedPage
      .getByRole('button', { name: /save settings/i })
      .click();

    // Verify success message appears
    await expect(
      authenticatedPage.getByRole('alert').filter({ hasText: /saved successfully/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('toggle dark mode and submit shows success message', async ({
    authenticatedPage,
  }) => {
    // Requirement 2.3: toggle dark mode, submit, verify success message
    await authenticatedPage.goto('/user-settings');
    await expect(
      authenticatedPage.getByRole('heading', { name: /settings/i }),
    ).toBeVisible({ timeout: 15000 });

    // Toggle dark mode switch
    await authenticatedPage.locator('#darkMode').click();

    // Submit the form
    await authenticatedPage
      .getByRole('button', { name: /save settings/i })
      .click();

    // Verify success message appears
    await expect(
      authenticatedPage.getByRole('alert').filter({ hasText: /saved successfully/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('saved values persist after page reload', async ({
    authenticatedPage,
  }) => {
    // Requirement 2.4: reload after saving, verify previously saved values persist
    await authenticatedPage.goto('/user-settings');
    await expect(
      authenticatedPage.getByRole('heading', { name: /settings/i }),
    ).toBeVisible({ timeout: 15000 });

    // Change timezone to a known value
    await authenticatedPage.locator('#timezone').click();
    const listbox = authenticatedPage.getByRole('listbox');
    await expect(listbox).toBeVisible();
    await listbox.getByRole('option', { name: 'Pacific/Auckland' }).click();

    // Toggle dark mode to capture its new state
    const darkModeSwitch = authenticatedPage.locator('#darkMode');
    const darkModeBefore = await darkModeSwitch.isChecked();
    await darkModeSwitch.click();
    const darkModeAfter = !darkModeBefore;

    // Submit the form
    await authenticatedPage
      .getByRole('button', { name: /save settings/i })
      .click();

    // Wait for success message
    await expect(
      authenticatedPage.getByRole('alert').filter({ hasText: /saved successfully/i }),
    ).toBeVisible({ timeout: 10000 });

    // Reload the page
    await authenticatedPage.reload();
    await expect(
      authenticatedPage.getByRole('heading', { name: /settings/i }),
    ).toBeVisible({ timeout: 15000 });

    // Verify timezone persisted — the MUI Select renders the selected value as text
    await expect(authenticatedPage.locator('#timezone')).toHaveText(
      'Pacific/Auckland',
    );

    // Verify dark mode toggle persisted
    if (darkModeAfter) {
      await expect(darkModeSwitch).toBeChecked();
    } else {
      await expect(darkModeSwitch).not.toBeChecked();
    }
  });
});
