/**
 * Page Object Model for the ShareDialog component.
 *
 * The share dialog opens when a user clicks "share" from the file context menu.
 */
import { Locator, Page } from '@playwright/test';

export class ShareDialogPage {
  readonly page: Page;
  readonly dialog: Locator;
  readonly emailInput: Locator;
  readonly advancedToggle: Locator;
  readonly shareButton: Locator;
  readonly passwordInput: Locator;
  readonly expirationInput: Locator;
  readonly blockDownloadToggle: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole('dialog');
    this.emailInput = this.dialog.getByLabel(/email/i);
    this.advancedToggle = this.dialog.getByText(/advanced/i);
    this.shareButton = this.dialog.getByRole('button', { name: /^share$/i });
    this.passwordInput = this.dialog.getByLabel(/password/i);
    this.expirationInput = this.dialog.getByLabel(/expir/i);
    this.blockDownloadToggle = this.dialog.getByLabel(/block download/i);
    this.closeButton = this.dialog.getByRole('button', {
      name: /close|cancel/i,
    });
  }

  async isOpen(): Promise<boolean> {
    return this.dialog.isVisible();
  }

  async shareWithUser(email: string) {
    await this.emailInput.fill(email);
    await this.shareButton.click();
  }

  async expandAdvanced() {
    if (await this.advancedToggle.isVisible()) {
      await this.advancedToggle.click();
    }
  }

  async setPassword(password: string) {
    await this.expandAdvanced();
    await this.passwordInput.fill(password);
  }

  async toggleBlockDownload() {
    await this.expandAdvanced();
    await this.blockDownloadToggle.click();
  }

  async close() {
    await this.closeButton.click();
  }

  async createShareLink() {
    const createLinkButton = this.dialog.getByRole('button', {
      name: /create.*link|generate.*link/i,
    });
    await createLinkButton.click();
  }

  async getMagnetUrl() {
    const magnetButton = this.dialog.getByRole('button', {
      name: /magnet.*url|get.*magnet/i,
    });
    await magnetButton.click();
  }
}
