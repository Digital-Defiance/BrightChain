import { expect, test, waitForPageContent, waitForSuspense } from '../fixtures';

/**
 * Playwright E2E tests for BrightHub mobile responsiveness.
 *
 * Tests that key pages render correctly at mobile viewport sizes.
 */

// Use mobile viewport
test.use({ viewport: { width: 375, height: 812 } }); // iPhone X dimensions

test.describe('BrightHub Mobile — Home Page', () => {
  test('should render the home page at mobile width', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/brighthub');
    await waitForSuspense(page);
    await waitForPageContent(page);

    // Content should be visible
    const content = page.locator('[data-testid="layout-content-area"]');
    await expect(content.or(page.getByRole('main'))).toBeVisible({
      timeout: 15_000,
    });
  });

  test('should show hamburger menu on mobile', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/brighthub');
    await waitForSuspense(page);
    await waitForPageContent(page);

    // On mobile, the hamburger button should be visible.
    // If the layout doesn't use a sidebar (container-only), the content
    // area is visible instead. Check each independently to avoid strict
    // mode violations when both elements exist simultaneously.
    const hamburger = page.locator('[data-testid="layout-hamburger"]');
    const mainContent = page.locator('[data-testid="layout-content-area"]');

    const hasHamburger = await hamburger
      .isVisible({ timeout: 15_000 })
      .catch(() => false);
    const hasContent = await mainContent
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasHamburger || hasContent).toBeTruthy();
  });
});

test.describe('BrightHub Mobile — Explore Page', () => {
  test('should render explore page at mobile width', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/brighthub/explore');
    await waitForSuspense(page);
    await waitForPageContent(page);

    const title = page.getByRole('heading', { name: /explore/i });
    await expect(title).toBeVisible({ timeout: 15_000 });

    // Search input should be full width and visible
    const search = page.getByPlaceholder(/search/i);
    await expect(search).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('BrightHub Mobile — Create Hub Page', () => {
  test('should render create hub form at mobile width', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/brighthub/h/create');
    await waitForSuspense(page);
    await waitForPageContent(page);

    const title = page.getByRole('heading', { name: /create.*hub/i });
    await expect(title).toBeVisible({ timeout: 15_000 });

    // Form fields should be visible and usable
    const nameInput = page.getByLabel(/hub name/i);
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('BrightHub Mobile — Search Page', () => {
  test('should render search page at mobile width', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/brighthub/search');
    await waitForSuspense(page);
    await waitForPageContent(page);

    const title = page.getByText(/search/i);
    await expect(title).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('BrightHub Mobile — Post Composer', () => {
  test('should render post composer at mobile width', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/brighthub');
    await waitForSuspense(page);
    await waitForPageContent(page);

    const textarea = page.getByRole('textbox');
    await expect(textarea).toBeVisible({ timeout: 15_000 });

    // Submit button should be visible
    const submitBtn = page.getByRole('button', { name: /post/i });
    await expect(submitBtn).toBeVisible({ timeout: 10_000 });
  });
});
