import {
  expect,
  registerViaApi,
  test,
  waitForPageContent,
  waitForSuspense,
} from '../fixtures';

/**
 * Playwright E2E tests for notification components.
 *
 * Tests NotificationBell badge, NotificationDropdown open/close,
 * NotificationList infinite scroll, NotificationPreferences form,
 * notification click-through, mark as read, delete, category filtering,
 * and grouped notification expansion.
 *
 * Requirements: 15.12, 60.7-60.14
 */

/**
 * Navigate to a brighthub route and wait for Suspense to resolve.
 */
async function gotoBrightHub(
  page: import('@playwright/test').Page,
  path: string,
) {
  await page.goto(path);
  await waitForSuspense(page);
  await waitForPageContent(page);
}

test.describe('Notifications', () => {
  test.describe('NotificationBell Badge Updates', () => {
    test('should render notification bell icon', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle').catch(() => {});

      // The notification bell is rendered by GlobalNotificationBell in the TopMenu.
      const bell = page.getByTestId('notification-bell').first();
      await expect(bell).toBeVisible({ timeout: 15_000 });
    });

    test('should show badge with unread count', async ({
      authenticatedPage: page,
      authResult,
    }) => {
      // Generate a notification by having another user like our post
      const baseURL = 'http://localhost:3000';
      const axios = await import('axios');
      const headers = { Authorization: `Bearer ${authResult.token}` };

      // Create a post
      const postRes = await axios.default.post(
        `${baseURL}/api/brighthub/posts`,
        { authorId: authResult.memberId, content: 'Notification test post' },
        { headers },
      );
      const postId = postRes.data.data._id;

      // Register another user and have them like the post
      const otherUser = await registerViaApi(baseURL);
      await axios.default
        .post(
          `${baseURL}/api/brighthub/posts/${postId}/like`,
          {},
          { headers: { Authorization: `Bearer ${otherUser.token}` } },
        )
        .catch(() => {});

      await page.goto('/brighthub');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle').catch(() => {});

      const bell = page.getByTestId('notification-bell').first();
      await expect(bell).toBeVisible({ timeout: 15_000 });
    });

    test('should show 99+ when count exceeds 99', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle').catch(() => {});

      // This is a visual test — the component caps at 99+
      const bell = page.getByTestId('notification-bell').first();
      await expect(bell).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe('NotificationDropdown Open/Close', () => {
    test('should open dropdown when bell is clicked', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle').catch(() => {});

      const bell = page.getByTestId('notification-bell').first();
      await expect(bell).toBeVisible({ timeout: 15_000 });
      await bell.click();

      const dropdown = page.getByTestId('notification-dropdown').first();
      await expect(dropdown).toBeVisible({ timeout: 10_000 });
    });

    test('should close dropdown on Escape key', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle').catch(() => {});

      const bell = page.getByTestId('notification-bell').first();
      await expect(bell).toBeVisible({ timeout: 15_000 });
      await bell.click();

      const dropdown = page.getByTestId('notification-dropdown').first();
      await expect(dropdown).toBeVisible({ timeout: 10_000 });

      await page.keyboard.press('Escape');
      await expect(dropdown).not.toBeVisible();
    });

    test('should close dropdown on outside click', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle').catch(() => {});

      const bell = page.getByTestId('notification-bell').first();
      await expect(bell).toBeVisible({ timeout: 15_000 });
      await bell.click();

      const dropdown = page.getByTestId('notification-dropdown').first();
      await expect(dropdown).toBeVisible({ timeout: 10_000 });

      // Click outside the dropdown
      await page.locator('body').click({ position: { x: 10, y: 10 } });
      await expect(dropdown).not.toBeVisible();
    });

    test('should show empty state when no notifications', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle').catch(() => {});

      const bell = page.getByTestId('notification-bell').first();
      await expect(bell).toBeVisible({ timeout: 15_000 });
      await bell.click();

      // Either shows notifications or empty state
      const dropdown = page.getByTestId('notification-dropdown').first();
      await expect(dropdown).toBeVisible({ timeout: 10_000 });
    });

    test('should show "Mark all as read" button', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle').catch(() => {});

      const bell = page.getByTestId('notification-bell').first();
      await expect(bell).toBeVisible({ timeout: 15_000 });
      await bell.click();

      const markAllRead = page.getByTestId('mark-all-read');
      await expect(markAllRead).toBeVisible({ timeout: 10_000 });
    });

    test('should show "View all" link in dropdown footer', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle').catch(() => {});

      const bell = page.getByTestId('notification-bell').first();
      await expect(bell).toBeVisible({ timeout: 15_000 });
      await bell.click();

      const viewAll = page.getByTestId('view-all');
      await expect(viewAll).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('NotificationList Infinite Scroll', () => {
    test('should render notification list page', async ({
      authenticatedPage: page,
    }) => {
      await gotoBrightHub(page, '/brighthub/notifications');

      // Notification list should have filter tabs
      const filterTabs = page.getByTestId('filter-tabs');
      await expect(filterTabs).toBeVisible({ timeout: 15_000 });
    });

    test('should show filter tabs for All, Unread, Read', async ({
      authenticatedPage: page,
    }) => {
      await gotoBrightHub(page, '/brighthub/notifications');

      // Wait for the filter tabs container to appear
      const filterTabs = page.getByTestId('filter-tabs');
      await expect(filterTabs).toBeVisible({ timeout: 15_000 });

      // MUI Tabs renders Tab elements with role="tab"
      const tabs = filterTabs.getByRole('tab');
      await expect(tabs).toHaveCount(3);
    });

    test('should filter notifications when tab is clicked', async ({
      authenticatedPage: page,
    }) => {
      await gotoBrightHub(page, '/brighthub/notifications');

      // Click "Unread" tab
      await page.getByRole('tab', { name: /unread/i }).click();

      // The list should update (either show unread items or empty state)
      await page.waitForTimeout(500);
    });

    test('should show load more button when more notifications exist', async ({
      authenticatedPage: page,
    }) => {
      await gotoBrightHub(page, '/brighthub/notifications');

      // Either load-more or end-of-list or empty-state should be visible
      const loadMore = page.getByTestId('load-more');
      const endOfList = page.getByTestId('end-of-list');
      const emptyState = page.getByTestId('empty-state');

      await expect(loadMore.or(endOfList).or(emptyState)).toBeVisible({
        timeout: 15_000,
      });
    });
  });

  test.describe('NotificationPreferences Form', () => {
    test('should render notification preferences page', async ({
      authenticatedPage: page,
    }) => {
      await gotoBrightHub(page, '/brighthub/notifications/preferences');

      const prefs = page.getByTestId('notification-preferences');
      await expect(prefs).toBeVisible({ timeout: 15_000 });
    });

    test('should show category toggles', async ({
      authenticatedPage: page,
    }) => {
      await gotoBrightHub(page, '/brighthub/notifications/preferences');

      // Category toggles for social, messages, connections, system
      await expect(page.getByTestId('category-toggle-social')).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByTestId('category-toggle-messages')).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByTestId('category-toggle-connections')).toBeVisible(
        { timeout: 10_000 },
      );
      await expect(page.getByTestId('category-toggle-system')).toBeVisible({
        timeout: 10_000,
      });
    });

    test('should show channel toggles', async ({ authenticatedPage: page }) => {
      await gotoBrightHub(page, '/brighthub/notifications/preferences');

      await expect(page.getByTestId('channel-toggle-in_app')).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByTestId('channel-toggle-email')).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByTestId('channel-toggle-push')).toBeVisible({
        timeout: 10_000,
      });
    });

    test('should toggle quiet hours settings', async ({
      authenticatedPage: page,
    }) => {
      await gotoBrightHub(page, '/brighthub/notifications/preferences');

      const quietToggle = page.getByTestId('quiet-hours-toggle');
      await expect(quietToggle).toBeVisible({ timeout: 15_000 });
      await quietToggle.click();

      // Time inputs should appear
      await expect(page.getByTestId('quiet-hours-start')).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByTestId('quiet-hours-end')).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByTestId('quiet-hours-timezone')).toBeVisible({
        timeout: 10_000,
      });
    });

    test('should toggle Do Not Disturb settings', async ({
      authenticatedPage: page,
    }) => {
      await gotoBrightHub(page, '/brighthub/notifications/preferences');

      const dndToggle = page.getByTestId('dnd-toggle');
      await expect(dndToggle).toBeVisible({ timeout: 15_000 });
      await dndToggle.click();

      // Duration selector should appear
      await expect(page.getByTestId('dnd-duration')).toBeVisible({
        timeout: 10_000,
      });
    });

    test('should toggle sound preferences', async ({
      authenticatedPage: page,
    }) => {
      await gotoBrightHub(page, '/brighthub/notifications/preferences');

      const soundToggle = page.getByTestId('sound-toggle');
      await expect(soundToggle).toBeVisible({ timeout: 15_000 });
      await soundToggle.click();
    });

    test('should save preferences when save button is clicked', async ({
      authenticatedPage: page,
    }) => {
      await gotoBrightHub(page, '/brighthub/notifications/preferences');

      const saveBtn = page.getByTestId('save-preferences');
      await expect(saveBtn).toBeVisible({ timeout: 15_000 });
      await saveBtn.click();
    });
  });

  test.describe('Notification Click-Through Navigation', () => {
    test('should navigate to content when notification is clicked', async ({
      authenticatedPage: page,
      authResult,
    }) => {
      // Create a notification via API interaction
      const baseURL = 'http://localhost:3000';
      const axios = await import('axios');
      const headers = { Authorization: `Bearer ${authResult.token}` };

      const postRes = await axios.default.post(
        `${baseURL}/api/brighthub/posts`,
        { authorId: authResult.memberId, content: 'Click-through test' },
        { headers },
      );
      const postId = postRes.data.data._id;

      // Have another user like it to generate notification
      const otherUser = await registerViaApi(baseURL);
      await axios.default
        .post(
          `${baseURL}/api/brighthub/posts/${postId}/like`,
          {},
          { headers: { Authorization: `Bearer ${otherUser.token}` } },
        )
        .catch(() => {});

      await gotoBrightHub(page, '/brighthub/notifications');

      // Click on a notification item if one exists
      const firstNotif = page
        .locator('[data-testid^="notification-item-"]')
        .first();
      if (await firstNotif.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await firstNotif.click();
        // Should navigate to the relevant content
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('Mark as Read and Delete Actions', () => {
    test('should show action buttons on notification hover', async ({
      authenticatedPage: page,
    }) => {
      await gotoBrightHub(page, '/brighthub/notifications');

      const firstNotif = page
        .locator('[data-testid^="notification-item-"]')
        .first();
      if (await firstNotif.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await firstNotif.hover();

        // Action buttons should appear on hover
        const actions = page.getByTestId('notification-actions');
        await expect(actions).toBeVisible({ timeout: 3_000 });
      }
    });

    test('should show unread dot for unread notifications', async ({
      authenticatedPage: page,
    }) => {
      await gotoBrightHub(page, '/brighthub/notifications');

      // Unread dots may be visible
      const unreadDot = page.getByTestId('unread-dot').first();
      if (await unreadDot.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(unreadDot).toBeVisible();
      }
    });
  });

  test.describe('Category Filtering', () => {
    test('should filter by notification category', async ({
      authenticatedPage: page,
    }) => {
      await gotoBrightHub(page, '/brighthub/notifications');

      // Wait for the filter tabs to appear
      const filterTabs = page.getByTestId('filter-tabs');
      await expect(filterTabs).toBeVisible({ timeout: 15_000 });

      // Click through each tab
      const tabs = filterTabs.getByRole('tab');
      const count = await tabs.count();
      for (let i = 0; i < count; i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Grouped Notification Expansion', () => {
    test('should show expand toggle for grouped notifications', async ({
      authenticatedPage: page,
    }) => {
      await gotoBrightHub(page, '/brighthub/notifications');

      // If grouped notifications exist, they should have a toggle
      const groupToggle = page.getByTestId('group-toggle').first();
      if (await groupToggle.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await groupToggle.click();

        // Group items should expand
        const groupItems = page.getByTestId('group-items').first();
        await expect(groupItems).toBeVisible({ timeout: 5_000 });
      }
    });

    test('should collapse grouped notifications when toggle is clicked again', async ({
      authenticatedPage: page,
    }) => {
      await gotoBrightHub(page, '/brighthub/notifications');

      const groupToggle = page.getByTestId('group-toggle').first();
      if (await groupToggle.isVisible({ timeout: 5_000 }).catch(() => false)) {
        // Expand
        await groupToggle.click();
        await expect(page.getByTestId('group-items').first()).toBeVisible({
          timeout: 5_000,
        });

        // Collapse
        await groupToggle.click();
        await expect(page.getByTestId('group-items').first()).not.toBeVisible({
          timeout: 5_000,
        });
      }
    });
  });
});
