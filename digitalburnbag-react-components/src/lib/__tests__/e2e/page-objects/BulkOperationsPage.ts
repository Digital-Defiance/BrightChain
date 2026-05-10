/**
 * Page Object Model for the BulkOperationsToolbar component.
 *
 * Appears when multiple files are selected in the file browser.
 */
import { Locator, Page } from '@playwright/test';

export class BulkOperationsPage {
  readonly page: Page;
  readonly toolbar: Locator;
  readonly selectedCount: Locator;
  readonly deleteButton: Locator;
  readonly moveButton: Locator;
  readonly shareButton: Locator;
  readonly clearButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toolbar = page.locator(
      '[data-testid="bulk-toolbar"], [class*="BulkOperations"]',
    );
    this.selectedCount = page.getByText(/\d+\s.*selected/i);
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.moveButton = page.getByRole('button', { name: /move/i });
    this.shareButton = page.getByRole('button', { name: /share/i });
    this.clearButton = page.getByRole('button', {
      name: /clear|deselect/i,
    });
  }

  async isVisible(): Promise<boolean> {
    return this.toolbar.isVisible().catch(() => false);
  }

  async getSelectedCount(): Promise<string | null> {
    return this.selectedCount.textContent();
  }

  async clickDelete() {
    await this.deleteButton.click();
  }

  async clickClear() {
    await this.clearButton.click();
  }
}
