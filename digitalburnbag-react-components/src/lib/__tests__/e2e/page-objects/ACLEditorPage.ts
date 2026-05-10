/**
 * Page Object Model for the ACLEditor component.
 *
 * Accessed via file context menu → "permissions" on BurnbagPage.
 */
import { Locator, Page } from '@playwright/test';

export class ACLEditorPage {
  readonly page: Page;
  readonly principalInput: Locator;
  readonly permissionSelect: Locator;
  readonly addButton: Locator;
  readonly entryRows: Locator;
  readonly removeButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.principalInput = page.getByLabel(/user.*email|principal/i);
    this.permissionSelect = page.getByLabel(/permission.*level/i);
    this.addButton = page.getByRole('button', { name: /add/i });
    this.entryRows = page.locator('[data-testid="acl-entry"], table tbody tr');
    this.removeButtons = page.getByRole('button', { name: /remove|delete/i });
  }

  async addEntry(principal: string, level: string) {
    await this.principalInput.fill(principal);
    if (await this.permissionSelect.isVisible()) {
      await this.permissionSelect.selectOption(level);
    }
    await this.addButton.click();
  }

  async getEntryCount(): Promise<number> {
    return this.entryRows.count();
  }
}
