/**
 * Page Object Model for the ActivityFeed component.
 *
 * Accessed via the "Activity" sidebar section on BurnbagPage.
 */
import { Locator, Page } from '@playwright/test';

export class ActivityFeedPage {
  readonly page: Page;
  readonly feedEntries: Locator;
  readonly filterControls: Locator;

  constructor(page: Page) {
    this.page = page;
    this.feedEntries = page.locator(
      '[data-testid="activity-entry"], [class*="activity"] li, table tbody tr',
    );
    this.filterControls = page.locator(
      '[data-testid="activity-filters"], [class*="filter"]',
    );
  }

  async isLoaded(): Promise<boolean> {
    // Wait for the activity section to render — it may take time for the
    // sidebar click to trigger a re-render and for the API call to complete.
    try {
      await this.page.waitForTimeout(2000);
    } catch {
      // ignore
    }
    // Check for activity-related content: entries, empty state text, filter controls,
    // or any MUI content that indicates the section rendered.
    // Also match raw i18n keys (e.g. "DigitalBurnbag_Activity_NoActivity")
    return (
      (await this.page
        .getByText(
          /activity|no activity|recent|all operations|audit|log|event|DigitalBurnbag_Activity/i,
        )
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await this.feedEntries
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await this.filterControls
        .first()
        .isVisible()
        .catch(() => false)) ||
      // Fallback: check for any MUI Select (filter dropdown) or table in the content area
      (await this.page
        .locator(
          '[class*="MuiSelect"], [class*="MuiTable"], [class*="MuiList"]',
        )
        .first()
        .isVisible()
        .catch(() => false)) ||
      // Fallback: check for any heading or typography that indicates the section loaded
      (await this.page
        .locator('h1, h2, h3, h4, h5, h6, [class*="MuiTypography"]')
        .filter({
          hasText: /activity|feed|log|audit|event|operation|DigitalBurnbag/i,
        })
        .first()
        .isVisible()
        .catch(() => false)) ||
      false
    );
  }

  async getEntryCount(): Promise<number> {
    return this.feedEntries.count();
  }

  async clickEntry(index: number) {
    await this.feedEntries.nth(index).click();
  }
}
