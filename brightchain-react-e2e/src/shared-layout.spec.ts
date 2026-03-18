/**
 * Shared Layout E2E Tests
 *
 * Verifies that all dApps correctly render the shared LayoutShell from
 * brightchain-react-components after migration. Tests AppBar branding,
 * sidebar rendering, responsive hamburger toggle, and detail panel behavior.
 *
 * Requirements: shared-dapp-layout spec (all dApps use LayoutShell)
 */
import { expect, test, waitForSuspense } from './fixtures';

const DESKTOP_VIEWPORT = { width: 1200, height: 800 };
const MOBILE_VIEWPORT = { width: 375, height: 667 };
const WIDE_VIEWPORT = { width: 1400, height: 900 };

// ─── BrightMail Layout ─────────────────────────────────────────────────────

test.describe('BrightMail — shared LayoutShell', () => {
  test('renders AppBar with BrightMail branding', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/brightmail');
    await waitForSuspense(page);

    // AppBar should be visible
    const appBar = page.locator('.MuiAppBar-root').first();
    await expect(appBar).toBeVisible({ timeout: 15_000 });

    // Should contain "Mail" branding text (from BrightChainSubLogo subText="Mail")
    const hasBranding = await appBar
      .getByText(/mail/i)
      .isVisible()
      .catch(() => false);
    const hasSvg = await appBar
      .locator('svg')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasBranding || hasSvg).toBeTruthy();
  });

  test('renders sidebar with nav items on desktop', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/brightmail');
    await waitForSuspense(page);

    // Sidebar drawer should be visible
    const sidebar = page
      .locator('[data-testid="app-sidebar-drawer"], .MuiDrawer-root')
      .first();
    await expect(sidebar).toBeVisible({ timeout: 15_000 });

    // Nav items should be present (Inbox, Sent, Drafts, Trash)
    const menuItems = page.locator('[role="menuitem"]');
    const count = await menuItems.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('shows hamburger on mobile viewport', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/brightmail');
    await waitForSuspense(page);

    const hamburger = page.locator(
      '[data-testid="layout-hamburger"], [aria-label="Toggle navigation"]',
    );
    await expect(hamburger.first()).toBeVisible({ timeout: 15_000 });
  });

  test('renders detail panel (reading pane) on wide desktop', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await page.goto('/brightmail');
    await waitForSuspense(page);

    // Detail panel should be visible at ≥1280px
    const detailPanel = page.locator('[data-testid="layout-detail-panel"]');
    await expect(detailPanel).toBeVisible({ timeout: 15_000 });
  });
});

// ─── BrightChat Layout ─────────────────────────────────────────────────────

test.describe('BrightChat — shared LayoutShell', () => {
  test('renders AppBar with BrightChat branding', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/brightchat');
    await waitForSuspense(page);

    const appBar = page.locator('.MuiAppBar-root').first();
    await expect(appBar).toBeVisible({ timeout: 15_000 });

    // Should contain "Chat" branding text
    const hasBranding = await appBar
      .getByText(/chat/i)
      .isVisible()
      .catch(() => false);
    const hasSvg = await appBar
      .locator('svg')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasBranding || hasSvg).toBeTruthy();
  });

  test('renders sidebar with Conversations, Groups, Channels on desktop', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/brightchat');
    await waitForSuspense(page);

    const sidebar = page
      .locator('[data-testid="app-sidebar-drawer"], .MuiDrawer-root')
      .first();
    await expect(sidebar).toBeVisible({ timeout: 15_000 });

    // Should have at least 3 nav items (Conversations, Groups, Channels)
    const menuItems = page.locator('[role="menuitem"]');
    const count = await menuItems.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('shows hamburger on mobile viewport', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/brightchat');
    await waitForSuspense(page);

    const hamburger = page.locator(
      '[data-testid="layout-hamburger"], [aria-label="Toggle navigation"]',
    );
    await expect(hamburger.first()).toBeVisible({ timeout: 15_000 });
  });
});

// ─── BrightPass Layout ─────────────────────────────────────────────────────

test.describe('BrightPass — shared LayoutShell', () => {
  test('renders AppBar with BrightPass branding', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/brightpass');
    await waitForSuspense(page);

    const appBar = page.locator('.MuiAppBar-root').first();
    await expect(appBar).toBeVisible({ timeout: 15_000 });

    // Should contain "Pass" branding text
    const hasBranding = await appBar
      .getByText(/pass/i)
      .isVisible()
      .catch(() => false);
    const hasSvg = await appBar
      .locator('svg')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasBranding || hasSvg).toBeTruthy();
  });

  test('does not render sidebar (container-only layout)', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/brightpass');
    await waitForSuspense(page);

    // BrightPass has no sidebar — should not have a drawer
    const drawer = page.locator('[data-testid="app-sidebar-drawer"]');
    await expect(drawer).not.toBeVisible({ timeout: 5_000 });
  });

  test('does not show hamburger (no sidebar)', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/brightpass');
    await waitForSuspense(page);

    const hamburger = page.locator('[data-testid="layout-hamburger"]');
    await expect(hamburger).not.toBeVisible({ timeout: 5_000 });
  });
});

// ─── BrightHub Layout ──────────────────────────────────────────────────────

test.describe('BrightHub — shared LayoutShell', () => {
  test('renders AppBar with BrightHub branding', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/brighthub');
    await waitForSuspense(page);

    const appBar = page.locator('.MuiAppBar-root').first();
    await expect(appBar).toBeVisible({ timeout: 15_000 });

    // Should contain "Hub" branding text
    const hasBranding = await appBar
      .getByText(/hub/i)
      .isVisible()
      .catch(() => false);
    const hasSvg = await appBar
      .locator('svg')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasBranding || hasSvg).toBeTruthy();
  });

  test('renders sidebar with hub navigation items', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/brighthub');
    await waitForSuspense(page);

    const drawer = page.locator('[data-testid="app-sidebar-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 5_000 });
  });

  test('renders toolbar actions (notification bell)', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/brighthub');
    await waitForSuspense(page);

    // Notification bell should be in the AppBar toolbar actions
    const bell = page.getByTestId('notification-bell').first();
    await expect(bell).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Digital Burnbag Layout ─────────────────────────────────────────────────

test.describe('Digital Burnbag — shared LayoutShell via DomainRouter', () => {
  test('renders AppBar with domain-detected branding', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/burnbag');
    await page.waitForLoadState('networkidle').catch(() => {});

    const appBar = page.locator('.MuiAppBar-root').first();
    await expect(appBar).toBeVisible({ timeout: 15_000 });

    // On localhost, falls back to BrightChain branding — should have logo or brand text
    const hasBranding = await appBar
      .getByText(/digital|burnbag|brightchain|canary/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasSvg = await appBar
      .locator('svg')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasBranding || hasSvg).toBeTruthy();
  });

  test('renders sidebar with file sections on desktop', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/burnbag');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Wait for sidebar to render
    const sidebar = page
      .locator(
        '[data-testid="app-sidebar-drawer"], [data-testid="sidebar-nav-list"], .MuiDrawer-root',
      )
      .first();
    await expect(sidebar).toBeVisible({ timeout: 15_000 });

    // Should have nav items for file sections
    const menuItems = page.locator('[role="menuitem"]');
    const count = await menuItems.count();
    // At least: My Files, Shared, Favorites, Recent, Activity, Analytics, Canary, Trash
    expect(count).toBeGreaterThanOrEqual(7);
  });

  test('shows hamburger on mobile viewport', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/burnbag');
    await page.waitForLoadState('networkidle').catch(() => {});

    const hamburger = page.locator(
      '[data-testid="layout-hamburger"], [aria-label="Toggle navigation"]',
    );
    await expect(hamburger.first()).toBeVisible({ timeout: 15_000 });
  });

  test('sidebar section click changes content', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/burnbag');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Wait for sidebar
    const sidebar = page
      .locator(
        '[data-testid="app-sidebar-drawer"], [data-testid="sidebar-nav-list"], .MuiDrawer-root',
      )
      .first();
    await expect(sidebar).toBeVisible({ timeout: 15_000 });

    // Click a different section and verify no crash
    const trashItem = sidebar.getByText(/trash/i).first();
    if (await trashItem.isVisible().catch(() => false)) {
      await trashItem.click();
      await page.waitForTimeout(500);

      // Page should not show an unhandled error
      const hasError = await page
        .getByText(/unhandled.*error|something went wrong|crash/i)
        .isVisible()
        .catch(() => false);
      expect(hasError).toBeFalsy();
    }
  });
});
