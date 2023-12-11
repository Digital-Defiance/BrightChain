/**
 * BrightChat Navigation UX — E2E Tests
 *
 * Tests the two features implemented in the brightchat-navigation-ux spec:
 * 1. Dynamic server menu items in the sidebar
 * 2. DM creation flow via the CreateDMDialog
 *
 * All tests hit real services — no mocks. The authenticated user is
 * created by global-setup and reused via the shared auth fixture.
 *
 * Requirements: 2.1–2.5, 3.1–3.3, 4.1–4.4
 */
import { expect, test, waitForSuspense } from './fixtures';

const DESKTOP_VIEWPORT = { width: 1200, height: 800 };

// ─── BrightChat Navigation — Menu & Sidebar ────────────────────────────────

test.describe('BrightChat Navigation — Menu Items', () => {
  test('BrightChat layout renders with server navigation and channel sidebar', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/brightchat');
    await waitForSuspense(page);

    // BrightChat uses its own layout with ServerRail + ChannelSidebar/DMSidebar
    // (not the standard MuiDrawer sidebar used by other dApps)
    const serverNav = page.locator('[data-testid="server-rail"]');
    await expect(serverNav).toBeVisible({ timeout: 15_000 });

    // The sidebar column should be present — on the home route (no active server)
    // the DMSidebar renders instead of ChannelSidebar.
    const sidebar = page.locator('[data-testid="channel-sidebar"], [data-testid="dm-sidebar"]');
    await expect(sidebar.first()).toBeVisible({ timeout: 15_000 });

    // Home button should be in the server rail
    const homeBtn = page.getByRole('button', { name: /home/i });
    await expect(homeBtn).toBeVisible({ timeout: 5_000 });
  });

  test('BrightChat home page loads without errors', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/brightchat');
    await waitForSuspense(page);

    // Should not show an unhandled error
    const hasError = await page
      .getByText(/unhandled.*error|something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(hasError).toBeFalsy();

    // The URL should still be /brightchat
    await expect(page).toHaveURL(/\/brightchat/);
  });
});

// ─── BrightChat Navigation — Server Route ──────────────────────────────────

test.describe('BrightChat Navigation — Server Route', () => {
  test('server/:serverId route loads without crashing (Req 3.1)', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    // Navigate to a server route with a fake ID — should not crash
    await page.goto('/brightchat/server/test-server-id');
    await waitForSuspense(page);

    // Should not show an unhandled error
    const hasError = await page
      .getByText(/unhandled.*error|something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(hasError).toBeFalsy();

    // URL should contain the server path
    await expect(page).toHaveURL(/\/brightchat\/server\/test-server-id/);
  });
});

// ─── BrightChat Navigation — DM Creation Flow ─────────────────────────────

test.describe('BrightChat Navigation — DM Creation', () => {
  test('+ New Message button is visible on the conversations page (Req 4.1)', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/brightchat');
    await waitForSuspense(page);

    // Look for the "+ New Message" button (may be a Button or IconButton)
    const newMessageBtn = page
      .getByRole('button', { name: /new message/i })
      .or(page.getByText(/new message/i))
      .first();

    await expect(newMessageBtn).toBeVisible({ timeout: 15_000 });
  });

  test('clicking + New Message opens the CreateDMDialog (Req 4.1, 4.3)', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/brightchat');
    await waitForSuspense(page);

    // Click the "+ New Message" button
    const newMessageBtn = page
      .getByRole('button', { name: /new message/i })
      .or(page.getByText(/new message/i))
      .first();

    await newMessageBtn.click();

    // The CreateDMDialog should open — look for dialog markers
    // MUI Dialog renders with role="dialog" or role="presentation"
    const dialog = page.locator('[role="dialog"]').or(
      page.locator('.MuiDialog-root'),
    );

    await expect(dialog.first()).toBeVisible({ timeout: 10_000 });
  });

  test('CreateDMDialog can be closed (Req 4.4)', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/brightchat');
    await waitForSuspense(page);

    // Open the dialog
    const newMessageBtn = page
      .getByRole('button', { name: /new message/i })
      .or(page.getByText(/new message/i))
      .first();

    await newMessageBtn.click();

    const dialog = page.locator('[role="dialog"]').or(
      page.locator('.MuiDialog-root'),
    );
    await expect(dialog.first()).toBeVisible({ timeout: 10_000 });

    // Close the dialog — look for Cancel button or close icon
    const closeBtn = page
      .getByRole('button', { name: /cancel/i })
      .or(page.getByRole('button', { name: /close/i }))
      .or(page.locator('[aria-label="close"]'))
      .first();

    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      // Dialog should be hidden after closing
      await expect(dialog.first()).not.toBeVisible({ timeout: 5_000 });
    } else {
      // Press Escape as fallback
      await page.keyboard.press('Escape');
      await expect(dialog.first()).not.toBeVisible({ timeout: 5_000 });
    }
  });

  test('+ New Message does NOT navigate to /brightchat/conversation/new (Req 4.1)', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/brightchat');
    await waitForSuspense(page);

    const newMessageBtn = page
      .getByRole('button', { name: /new message/i })
      .or(page.getByText(/new message/i))
      .first();

    await newMessageBtn.click();

    // Wait a moment for any navigation to occur
    await page.waitForTimeout(1000);

    // URL should NOT have changed to /brightchat/conversation/new
    const url = page.url();
    expect(url).not.toContain('/brightchat/conversation/new');
  });
});
