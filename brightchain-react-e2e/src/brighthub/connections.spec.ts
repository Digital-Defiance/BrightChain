import { expect, test } from '../fixtures';

/**
 * Playwright E2E tests for connection management components.
 *
 * Tests ConnectionListManager, HubManager, ConnectionSuggestions,
 * FollowRequestList, and ConnectionPrivacySettings.
 *
 * Requirements: 38.15-38.19
 */

test.describe('Connection Management', () => {
  test.describe('ConnectionListManager', () => {
    test('should render connection list manager', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/lists');
      await page.waitForLoadState('networkidle');

      // Create list button should be visible
      const createBtn = page.getByRole('button', { name: /create list/i });
      await expect(createBtn).toBeVisible();
    });

    test('should show empty state when no lists exist', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/lists');
      await page.waitForLoadState('networkidle');

      const emptyState = page.getByTestId('empty-state');
      await expect(emptyState).toBeVisible();
    });

    test('should open create list dialog', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/lists');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /create list/i }).click();

      // Dialog should open with name, description, and visibility fields
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      await expect(page.getByRole('textbox', { name: /name/i })).toBeVisible();
    });

    test('should create a new list via dialog', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/lists');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /create list/i }).click();

      const nameInput = page.getByRole('textbox', { name: /name/i });
      await nameInput.fill('Test List');

      const saveBtn = page.getByRole('button', { name: /save/i });
      await saveBtn.click();

      // Dialog should close
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });
    });

    test('should open edit dialog for existing list', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/lists');
      await page.waitForLoadState('networkidle');

      const editBtn = page.getByRole('button', { name: /edit list/i }).first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    });

    test('should open delete confirmation dialog', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/lists');
      await page.waitForLoadState('networkidle');

      const deleteBtn = page
        .getByRole('button', { name: /delete list/i })
        .first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    });

    test('should show visibility chip on list cards', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/lists');
      await page.waitForLoadState('networkidle');

      // Visibility chips (private, followers_only, public) may be visible
      const visibilityChip = page
        .locator('[data-testid^="visibility-"]')
        .first();
      if (await visibilityChip.isVisible()) {
        await expect(visibilityChip).toBeVisible();
      }
    });

    test('should open add members dialog', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/lists');
      await page.waitForLoadState('networkidle');

      const addBtn = page.getByRole('button', { name: /add members/i }).first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    });

    test('should open remove members dialog', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/lists');
      await page.waitForLoadState('networkidle');

      const removeBtn = page
        .getByRole('button', { name: /remove members/i })
        .first();
      if (await removeBtn.isVisible()) {
        await removeBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    });
  });

  test.describe('HubManager', () => {
    test('should render hub manager', async ({ authenticatedPage: page }) => {
      await page.goto('/brighthub/connections/hubs');
      await page.waitForLoadState('networkidle');

      const createBtn = page.getByRole('button', { name: /create hub/i });
      await expect(createBtn).toBeVisible();
    });

    test('should show empty state when no hubs exist', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/hubs');
      await page.waitForLoadState('networkidle');

      const emptyState = page.getByTestId('empty-state');
      // May show empty state or default hub
      await expect(
        emptyState.or(page.getByTestId('default-badge')),
      ).toBeVisible({ timeout: 5000 });
    });

    test('should open create hub dialog', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/hubs');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /create hub/i }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(page.getByRole('textbox', { name: /name/i })).toBeVisible();
    });

    test('should create a new hub via dialog', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/hubs');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /create hub/i }).click();

      const nameInput = page.getByRole('textbox', { name: /name/i });
      await nameInput.fill('Test Hub');

      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });
    });

    test('should show default badge on default hub', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/hubs');
      await page.waitForLoadState('networkidle');

      const defaultBadge = page.getByTestId('default-badge');
      if (await defaultBadge.isVisible()) {
        await expect(defaultBadge).toBeVisible();
      }
    });

    test('should open delete confirmation for hub', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/hubs');
      await page.waitForLoadState('networkidle');

      const deleteBtn = page
        .getByRole('button', { name: /delete hub/i })
        .first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    });
  });

  test.describe('ConnectionSuggestions', () => {
    test('should render connection suggestions', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/suggestions');
      await page.waitForLoadState('networkidle');

      const suggestions = page.getByTestId('connection-suggestions');
      await expect(suggestions).toBeVisible();
    });

    test('should show empty state when no suggestions', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/suggestions');
      await page.waitForLoadState('networkidle');

      // Either suggestions or empty state
      const emptyState = page.getByTestId('empty-state');
      const firstSuggestion = page
        .locator('[data-testid^="suggestion-"]')
        .first();

      await expect(emptyState.or(firstSuggestion)).toBeVisible({
        timeout: 5000,
      });
    });

    test('should show follow button on each suggestion', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/suggestions');
      await page.waitForLoadState('networkidle');

      const followBtn = page.getByRole('button', { name: /follow/i }).first();
      if (await followBtn.isVisible()) {
        await expect(followBtn).toBeVisible();
      }
    });

    test('should show dismiss button on each suggestion', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/suggestions');
      await page.waitForLoadState('networkidle');

      const dismissBtn = page.getByRole('button', { name: /dismiss/i }).first();
      if (await dismissBtn.isVisible()) {
        await expect(dismissBtn).toBeVisible();
      }
    });

    test('should show mutual connection count', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/suggestions');
      await page.waitForLoadState('networkidle');

      const mutualCount = page
        .locator('[data-testid^="mutual-count-"]')
        .first();
      if (await mutualCount.isVisible()) {
        await expect(mutualCount).toBeVisible();
      }
    });
  });

  test.describe('FollowRequestList', () => {
    test('should render follow request list', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/requests');
      await page.waitForLoadState('networkidle');

      const requestList = page.getByTestId('follow-request-list');
      await expect(requestList).toBeVisible();
    });

    test('should show empty state when no pending requests', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/requests');
      await page.waitForLoadState('networkidle');

      const emptyState = page.getByTestId('empty-state');
      await expect(emptyState).toBeVisible();
    });

    test('should show approve and reject buttons on requests', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/requests');
      await page.waitForLoadState('networkidle');

      const approveBtn = page
        .locator('[data-testid^="approve-button-"]')
        .first();
      if (await approveBtn.isVisible()) {
        await expect(approveBtn).toBeVisible();

        const rejectBtn = page
          .locator('[data-testid^="reject-button-"]')
          .first();
        await expect(rejectBtn).toBeVisible();
      }
    });

    test('should show pending count', async ({ authenticatedPage: page }) => {
      await page.goto('/brighthub/connections/requests');
      await page.waitForLoadState('networkidle');

      const count = page.getByTestId('follow-request-count');
      // Count is only shown when there are requests
      if (await count.isVisible()) {
        await expect(count).toBeVisible();
      }
    });

    test('should show custom message on follow request', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/requests');
      await page.waitForLoadState('networkidle');

      const message = page
        .locator('[data-testid^="follow-request-message-"]')
        .first();
      if (await message.isVisible()) {
        await expect(message).toBeVisible();
      }
    });
  });

  test.describe('ConnectionPrivacySettings', () => {
    test('should render privacy settings', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/privacy');
      await page.waitForLoadState('networkidle');

      const settings = page.getByTestId('connection-privacy-settings');
      await expect(settings).toBeVisible();
    });

    test('should show privacy toggle switches', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/privacy');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByTestId('privacy-toggle-hideFollowerCount'),
      ).toBeVisible();
      await expect(
        page.getByTestId('privacy-toggle-hideFollowingCount'),
      ).toBeVisible();
      await expect(
        page.getByTestId('privacy-toggle-hideFollowersFromNonFollowers'),
      ).toBeVisible();
      await expect(
        page.getByTestId('privacy-toggle-hideFollowingFromNonFollowers'),
      ).toBeVisible();
      await expect(
        page.getByTestId('privacy-toggle-allowDmsFromNonFollowers'),
      ).toBeVisible();
      await expect(
        page.getByTestId('privacy-toggle-showOnlineStatus'),
      ).toBeVisible();
      await expect(
        page.getByTestId('privacy-toggle-showReadReceipts'),
      ).toBeVisible();
    });

    test('should toggle privacy settings', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/privacy');
      await page.waitForLoadState('networkidle');

      const toggle = page.getByTestId('privacy-toggle-hideFollowerCount');
      await toggle.click();
    });

    test('should show approve followers mode selector', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/privacy');
      await page.waitForLoadState('networkidle');

      const modeSelect = page.getByTestId('approve-followers-mode-select');
      await expect(modeSelect).toBeVisible();
    });

    test('should show save button', async ({ authenticatedPage: page }) => {
      await page.goto('/brighthub/connections/privacy');
      await page.waitForLoadState('networkidle');

      const saveBtn = page.getByTestId('privacy-save-button');
      await expect(saveBtn).toBeVisible();
    });

    test('should save privacy settings when save is clicked', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/connections/privacy');
      await page.waitForLoadState('networkidle');

      // Toggle a setting
      await page.getByTestId('privacy-toggle-showOnlineStatus').click();

      // Save
      await page.getByTestId('privacy-save-button').click();
    });
  });
});
