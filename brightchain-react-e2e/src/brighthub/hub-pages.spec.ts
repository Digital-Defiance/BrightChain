import { expect, test, waitForPageContent, waitForSuspense } from '../fixtures';

/**
 * Playwright E2E tests for BrightHub community hub pages.
 *
 * Tests the home page, explore page, create hub flow, and hub detail page.
 */

test.describe('BrightHub Home Page', () => {
  test('should render the home page with welcome or feed content', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/brighthub');
    await waitForSuspense(page);
    await waitForPageContent(page);

    // Should show either the welcome banner or the feed
    const welcome = page.getByRole('heading', { name: /welcome/i });
    const feed = page.getByRole('feed');

    await expect(welcome.or(feed)).toBeVisible({ timeout: 15_000 });
  });

  test('should show trending hubs section when hubs exist', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/brighthub');
    await waitForSuspense(page);
    await waitForPageContent(page);

    // The trending hubs section or the explore button should be visible
    const trending = page.getByText(/trending/i);
    const exploreBtn = page.getByRole('button', { name: /explore/i });

    await expect(trending.or(exploreBtn)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('BrightHub Explore Page', () => {
  test('should render the explore page with search and tabs', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/brighthub/explore');
    await waitForSuspense(page);
    await waitForPageContent(page);

    // Should show the explore title
    const title = page.getByRole('heading', { name: /explore/i });
    await expect(title).toBeVisible({ timeout: 15_000 });

    // Should show search input
    const search = page.getByPlaceholder(/search/i);
    await expect(search).toBeVisible({ timeout: 10_000 });

    // Should show sort tabs (Trending / New)
    const trendingTab = page.getByRole('tab', { name: /trending/i });
    await expect(trendingTab).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('BrightHub Create Hub Page', () => {
  test('should render the create hub form', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/brighthub/h/create');
    await waitForSuspense(page);
    await waitForPageContent(page);

    // Should show the create hub title
    const title = page.getByRole('heading', { name: /create.*hub/i });
    await expect(title).toBeVisible({ timeout: 15_000 });

    // Should show name input
    const nameInput = page.getByLabel(/hub name/i);
    await expect(nameInput).toBeVisible({ timeout: 10_000 });

    // Should show slug input
    const slugInput = page.getByLabel(/url slug/i);
    await expect(slugInput).toBeVisible({ timeout: 10_000 });

    // Should show description input
    const descInput = page.getByLabel(/description/i);
    await expect(descInput).toBeVisible({ timeout: 10_000 });

    // Should show trust tier selector
    const trustSelect = page.getByLabel(/trust tier/i);
    await expect(trustSelect).toBeVisible({ timeout: 10_000 });

    // Should show submit button
    const submitBtn = page.getByRole('button', { name: /create hub/i });
    await expect(submitBtn).toBeVisible({ timeout: 10_000 });
  });

  test('should auto-generate slug from name', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/brighthub/h/create');
    await waitForSuspense(page);
    await waitForPageContent(page);

    const nameInput = page.getByLabel(/hub name/i);
    await expect(nameInput).toBeVisible({ timeout: 15_000 });
    await nameInput.fill('My Test Hub');

    // Slug should auto-populate
    const slugInput = page.getByLabel(/url slug/i);
    await expect(slugInput).toHaveValue('my-test-hub', { timeout: 5_000 });
  });
});

test.describe('BrightHub Hub Settings Page', () => {
  test('should show permission denied for non-owners', async ({
    authenticatedPage: page,
  }) => {
    // Navigate to a settings page for a hub that doesn't exist or user doesn't own
    await page.goto('/brighthub/h/nonexistent-hub/settings');
    await waitForSuspense(page);
    await waitForPageContent(page);

    // Should show either "Hub not found" or "permission" message
    const notFound = page.getByText(/not found|permission/i);
    await expect(notFound).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('BrightHub Post Composer', () => {
  test('should render the post composer on the home page', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/brighthub');
    await waitForSuspense(page);
    await waitForPageContent(page);

    // The post composer textarea should be visible
    const textarea = page.getByRole('textbox');
    await expect(textarea).toBeVisible({ timeout: 15_000 });
  });

  test('should show character count when typing', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/brighthub');
    await waitForSuspense(page);
    await waitForPageContent(page);

    const textarea = page.getByRole('textbox');
    await expect(textarea).toBeVisible({ timeout: 15_000 });
    await textarea.fill('Hello BrightHub!');

    // Character remaining indicator should be visible (280 - 16 = 264)
    await expect(page.getByText('264')).toBeVisible({ timeout: 5_000 });
  });

  test('should have a submit button', async ({ authenticatedPage: page }) => {
    await page.goto('/brighthub');
    await waitForSuspense(page);
    await waitForPageContent(page);

    const submitBtn = page.getByRole('button', { name: /post/i });
    await expect(submitBtn).toBeVisible({ timeout: 15_000 });
  });
});
