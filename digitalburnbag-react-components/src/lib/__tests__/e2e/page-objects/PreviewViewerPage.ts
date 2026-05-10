/**
 * Page Object Model for the PreviewViewer component.
 *
 * Opens as a dialog when a file is previewed from the file browser.
 */
import { Locator, Page } from '@playwright/test';

export class PreviewViewerPage {
  readonly page: Page;
  readonly previewContainer: Locator;
  readonly downloadButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.previewContainer = page.locator(
      '[data-testid="preview-container"], [role="dialog"]',
    );
    this.downloadButton = page.getByRole('button', { name: /download/i });
    this.closeButton = page.getByRole('button', { name: 'Close preview' });
  }

  async isVisible(): Promise<boolean> {
    return this.previewContainer.isVisible();
  }

  async close() {
    await this.closeButton.click();
  }
}
