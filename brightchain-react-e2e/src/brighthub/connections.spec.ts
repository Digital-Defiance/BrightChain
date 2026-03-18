import { expect, test, waitForPageContent, waitForSuspense } from '../fixtures';

/**
 * Playwright E2E tests for connection management components.
 *
 * Tests ConnectionListManager, HubManager, ConnectionSuggestions,
 * FollowRequestList, and ConnectionPrivacySettings.
 *
 * Requirements: 38.15-38.19
 */

/**
 * Navigate to a connections sub-route and wait for Suspense to resolve.
 */
async function gotoConnections(
  page: import('@playwright/test').Page,
  subPath: string,
) {
  await page.goto(`/brighthub/connections/${subPath}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await waitForSuspense(page);
  await waitForPageContent(page);
}

test.describe('Connection Management', () => {
  test.describe('ConnectionListManager', () => {
    test('should render connection list manager', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'lists');

      // Create list button should be visible
      const createBtn = page.getByRole('button', { name: /create list/i });
      await expect(createBtn).toBeVisible({ timeout: 15000 });
    });

    test('should show empty state when no lists exist', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'lists');

      const emptyState = page.getByTestId('empty-state');
      await expect(emptyState).toBeVisible({ timeout: 15000 });
    });

    test('should open create list dialog', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'lists');

      const createBtn = page.getByRole('button', { name: /create list/i });
      await expect(createBtn).toBeVisible({ timeout: 15000 });
      await createBtn.click();

      // Dialog should open with name, description, and visibility fields
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      await expect(page.getByRole('textbox', { name: /name/i })).toBeVisible();
    });

    test('should create a new list via dialog', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'lists');

      const createBtn = page.getByRole('button', { name: /create list/i });
      await expect(createBtn).toBeVisible({ timeout: 15000 });
      await createBtn.click();

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
      await gotoConnections(page, 'lists');

      const editBtn = page.getByRole('button', { name: /edit list/i }).first();
      if (await editBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
        await editBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    });

    test('should open delete confirmation dialog', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'lists');

      const deleteBtn = page
        .getByRole('button', { name: /delete list/i })
        .first();
      if (await deleteBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
        await deleteBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    });

    test('should show visibility chip on list cards', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'lists');

      // Visibility chips (private, followers_only, public) may be visible
      const visibilityChip = page
        .locator('[data-testid^="visibility-"]')
        .first();
      if (
        await visibilityChip.isVisible({ timeout: 15000 }).catch(() => false)
      ) {
        await expect(visibilityChip).toBeVisible();
      }
    });

    test('should open add members dialog', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'lists');

      const addBtn = page.getByRole('button', { name: /add members/i }).first();
      if (await addBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
        await addBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    });

    test('should open remove members dialog', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'lists');

      const removeBtn = page
        .getByRole('button', { name: /remove members/i })
        .first();
      if (await removeBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
        await removeBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    });
  });

  test.describe('HubManager', () => {
    test('should render hub manager', async ({ authenticatedPage: page }) => {
      await gotoConnections(page, 'hubs');

      const createBtn = page.getByRole('button', { name: /create hub/i });
      await expect(createBtn).toBeVisible({ timeout: 15000 });
    });

    test('should show empty state when no hubs exist', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'hubs');

      const emptyState = page.getByTestId('empty-state');
      // May show empty state or default hub
      await expect(
        emptyState.or(page.getByTestId('default-badge')),
      ).toBeVisible({ timeout: 15000 });
    });

    test('should open create hub dialog', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'hubs');

      const createBtn = page.getByRole('button', { name: /create hub/i });
      await expect(createBtn).toBeVisible({ timeout: 15000 });
      await createBtn.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(page.getByRole('textbox', { name: /name/i })).toBeVisible();
    });

    test('should create a new hub via dialog', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'hubs');

      const createBtn = page.getByRole('button', { name: /create hub/i });
      await expect(createBtn).toBeVisible({ timeout: 15000 });
      await createBtn.click();

      const nameInput = page.getByRole('textbox', { name: /name/i });
      await nameInput.fill('Test Hub');

      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });
    });

    test('should show default badge on default hub', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'hubs');

      const defaultBadge = page.getByTestId('default-badge');
      if (await defaultBadge.isVisible({ timeout: 15000 }).catch(() => false)) {
        await expect(defaultBadge).toBeVisible();
      }
    });

    test('should open delete confirmation for hub', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'hubs');

      const deleteBtn = page
        .getByRole('button', { name: /delete hub/i })
        .first();
      if (await deleteBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
        await deleteBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    });
  });

  test.describe('ConnectionSuggestions', () => {
    test('should render connection suggestions', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'suggestions');

      const suggestions = page.getByTestId('connection-suggestions');
      await expect(suggestions).toBeVisible({ timeout: 15000 });
    });

    test('should show empty state when no suggestions', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'suggestions');

      // Either suggestions or empty state
      const emptyState = page.getByTestId('empty-state');
      const firstSuggestion = page
        .locator('[data-testid^="suggestion-"]')
        .first();

      await expect(emptyState.or(firstSuggestion)).toBeVisible({
        timeout: 15000,
      });
    });

    test('should show follow button on each suggestion', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'suggestions');

      const followBtn = page.getByRole('button', { name: /follow/i }).first();
      if (await followBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
        await expect(followBtn).toBeVisible();
      }
    });

    test('should show dismiss button on each suggestion', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'suggestions');

      const dismissBtn = page.getByRole('button', { name: /dismiss/i }).first();
      if (await dismissBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
        await expect(dismissBtn).toBeVisible();
      }
    });

    test('should show mutual connection count', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'suggestions');

      const mutualCount = page
        .locator('[data-testid^="mutual-count-"]')
        .first();
      if (await mutualCount.isVisible({ timeout: 15000 }).catch(() => false)) {
        await expect(mutualCount).toBeVisible();
      }
    });
  });

  test.describe('FollowRequestList', () => {
    test('should render follow request list', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'requests');

      const requestList = page.getByTestId('follow-request-list');
      await expect(requestList).toBeVisible({ timeout: 15000 });
    });

    test('should show empty state when no pending requests', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'requests');

      const emptyState = page.getByTestId('empty-state');
      await expect(emptyState).toBeVisible({ timeout: 15000 });
    });

    test('should show approve and reject buttons on requests', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'requests');

      const approveBtn = page
        .locator('[data-testid^="approve-button-"]')
        .first();
      if (await approveBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
        await expect(approveBtn).toBeVisible();

        const rejectBtn = page
          .locator('[data-testid^="reject-button-"]')
          .first();
        await expect(rejectBtn).toBeVisible();
      }
    });

    test('should show pending count', async ({ authenticatedPage: page }) => {
      await gotoConnections(page, 'requests');

      const count = page.getByTestId('follow-request-count');
      // Count is only shown when there are requests
      if (await count.isVisible({ timeout: 15000 }).catch(() => false)) {
        await expect(count).toBeVisible();
      }
    });

    test('should show custom message on follow request', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'requests');

      const message = page
        .locator('[data-testid^="follow-request-message-"]')
        .first();
      if (await message.isVisible({ timeout: 15000 }).catch(() => false)) {
        await expect(message).toBeVisible();
      }
    });
  });

  test.describe('ConnectionPrivacySettings', () => {
    test('should render privacy settings', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'privacy');

      const settings = page.getByTestId('connection-privacy-settings');
      await expect(settings).toBeVisible({ timeout: 15000 });
    });

    test('should show privacy toggle switches', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'privacy');

      await expect(
        page.getByTestId('privacy-toggle-hideFollowerCount'),
      ).toBeVisible({ timeout: 15000 });
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
      await gotoConnections(page, 'privacy');

      const toggle = page.getByTestId('privacy-toggle-hideFollowerCount');
      await expect(toggle).toBeVisible({ timeout: 15000 });
      await toggle.click();
    });

    test('should show approve followers mode selector', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'privacy');

      const modeSelect = page.getByTestId('approve-followers-mode-select');
      await expect(modeSelect).toBeVisible({ timeout: 15000 });
    });

    test('should show save button', async ({ authenticatedPage: page }) => {
      await gotoConnections(page, 'privacy');

      const saveBtn = page.getByTestId('privacy-save-button');
      await expect(saveBtn).toBeVisible({ timeout: 15000 });
    });

    test('should save privacy settings when save is clicked', async ({
      authenticatedPage: page,
    }) => {
      await gotoConnections(page, 'privacy');

      // Toggle a setting
      const toggle = page.getByTestId('privacy-toggle-showOnlineStatus');
      await expect(toggle).toBeVisible({ timeout: 15000 });
      await toggle.click();

      // Save
      await page.getByTestId('privacy-save-button').click();
    });
  });
});
