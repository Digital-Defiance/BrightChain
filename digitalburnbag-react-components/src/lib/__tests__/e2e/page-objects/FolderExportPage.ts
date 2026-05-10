/**
 * Page Object Model for the FolderExportDialog component.
 *
 * Accessed via folder context menu → "Export to TCBL".
 */
import { Locator, Page } from '@playwright/test';

export class FolderExportPage {
  readonly page: Page;
  readonly dialog: Locator;
  readonly exportButton: Locator;
  readonly closeButton: Locator;
  readonly depthInput: Locator;
  readonly mimeFilterCheckboxes: Locator;
  readonly excludePatternsInput: Locator;
  readonly resultSummary: Locator;
  readonly skippedFilesList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole('dialog');
    this.exportButton = this.dialog.getByRole('button', {
      name: /export|start/i,
    });
    this.closeButton = this.dialog.getByRole('button', {
      name: /close|cancel/i,
    });
    this.depthInput = this.dialog.getByLabel(/depth/i);
    this.mimeFilterCheckboxes = this.dialog.locator('input[type="checkbox"]');
    this.excludePatternsInput = this.dialog.getByLabel(/exclude/i);
    this.resultSummary = this.dialog.getByText(/files exported|total size/i);
    this.skippedFilesList = this.dialog.getByText(/skipped/i);
  }

  async isOpen(): Promise<boolean> {
    return this.dialog.isVisible();
  }

  async close() {
    await this.closeButton.click();
  }

  async startExport() {
    await this.exportButton.click();
  }
}
