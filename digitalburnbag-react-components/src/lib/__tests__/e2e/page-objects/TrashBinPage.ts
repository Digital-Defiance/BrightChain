/**
 * Page Object Model for the TrashBinView component.
 *
 * Accessed via the "Trash" sidebar section on BurnbagPage.
 */
import { Locator, Page } from '@playwright/test';

export class TrashBinPage {
  readonly page: Page;
  readonly trashTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.trashTable = page.getByRole('table');
  }

  async restoreItem(fileName: string) {
    const restoreButton = this.page.getByRole('button', {
      name: new RegExp(`restore.*${fileName}`, 'i'),
    });
    if (await restoreButton.isVisible()) {
      await restoreButton.click();
      return;
    }
    // Fallback: click the row then click a generic restore button
    await this.trashTable.getByText(fileName).click();
    await this.page
      .getByRole('button', { name: /restore/i })
      .first()
      .click();
  }

  async permanentlyDelete(fileName: string) {
    const deleteButton = this.page.getByRole('button', {
      name: new RegExp(
        `permanently delete.*${fileName}|delete.*forever.*${fileName}`,
        'i',
      ),
    });
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      return;
    }
    await this.trashTable.getByText(fileName).click();
    await this.page
      .getByRole('button', { name: /permanent.*delete|delete.*forever/i })
      .first()
      .click();
  }

  async getTrashItemNames(): Promise<string[]> {
    const rows = this.trashTable.locator('tbody tr');
    const count = await rows.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).locator('td').first().textContent();
      if (text) names.push(text.trim());
    }
    return names;
  }

  async hasItem(fileName: string): Promise<boolean> {
    return this.trashTable.getByText(fileName).isVisible();
  }
}
