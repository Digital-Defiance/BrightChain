/**
 * Page Object Model for the StorageAnalytics component.
 *
 * Accessed via the "Analytics" sidebar section on BurnbagPage.
 */
import { Locator, Page } from '@playwright/test';

export class StorageAnalyticsPage {
  readonly page: Page;
  readonly usageBar: Locator;
  readonly breakdownList: Locator;
  readonly largestItemsList: Locator;
  readonly staleFilesList: Locator;
  readonly moveToTrashButtons: Locator;
  readonly scheduleDestructionButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usageBar = page.getByRole('progressbar');
    this.breakdownList = page.locator(
      '[data-testid="storage-breakdown"], [class*="breakdown"]',
    );
    this.largestItemsList = page.locator(
      '[data-testid="largest-items"], [class*="largest"]',
    );
    this.staleFilesList = page.locator(
      '[data-testid="stale-files"], [class*="stale"]',
    );
    this.moveToTrashButtons = page.getByRole('button', {
      name: /move.*trash|trash/i,
    });
    this.scheduleDestructionButtons = page.getByRole('button', {
      name: /schedule.*destruct|destroy/i,
    });
  }

  async isLoaded(): Promise<boolean> {
    return (
      (await this.page
        .getByText(/storage|usage|quota|analytics/i)
        .first()
        .isVisible()
        .catch(() => false)) || false
    );
  }

  async getUsageText(): Promise<string | null> {
    return this.page
      .getByText(/used|quota|storage/i)
      .first()
      .textContent();
  }
}
