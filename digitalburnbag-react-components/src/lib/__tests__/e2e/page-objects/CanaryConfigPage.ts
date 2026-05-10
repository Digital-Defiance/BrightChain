/**
 * Page Object Model for the CanaryConfigPanel component.
 *
 * Accessed via the "Canary" sidebar section on BurnbagPage.
 */
import { Locator, Page } from '@playwright/test';

export class CanaryConfigPage {
  readonly page: Page;
  readonly bindingRows: Locator;
  readonly dryRunButtons: Locator;
  readonly deleteButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.bindingRows = page.locator(
      '[data-testid="canary-binding"], table tbody tr',
    );
    this.dryRunButtons = page.getByRole('button', {
      name: /dry.*run|simulate/i,
    });
    this.deleteButtons = page.getByRole('button', {
      name: /delete.*binding|remove.*binding/i,
    });
  }

  async getBindingCount(): Promise<number> {
    return this.bindingRows.count();
  }

  async clickDryRun(index = 0) {
    await this.dryRunButtons.nth(index).click();
  }

  async clickDelete(index = 0) {
    await this.deleteButtons.nth(index).click();
  }
}
