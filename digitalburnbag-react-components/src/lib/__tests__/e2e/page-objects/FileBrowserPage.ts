/**
 * Page Object Model for the FileBrowser component.
 *
 * Works against the real BurnbagPage rendered at /burnbag.
 */
import { Locator, Page } from '@playwright/test';

export class FileBrowserPage {
  readonly page: Page;
  readonly fileTable: Locator;
  readonly breadcrumbs: Locator;
  readonly searchInput: Locator;
  readonly sortHeaders: Locator;
  readonly contextMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fileTable = page.getByRole('table');
    this.breadcrumbs = page.getByRole('navigation', {
      name: /folder path|breadcrumb/i,
    });
    this.searchInput = page.getByPlaceholder(/search/i);
    this.sortHeaders = page.locator('th');
    this.contextMenu = page.getByRole('menu');
  }

  async navigateToFolder(folderName: string) {
    await this.fileTable.getByText(folderName).dblclick();
    await this.page.waitForTimeout(500);
  }

  async selectFile(fileName: string) {
    const row = this.fileTable.locator('tbody tr', {
      has: this.page.getByText(fileName),
    });
    await row.locator('input[type="checkbox"]').click();
  }

  async selectMultipleFiles(fileNames: string[]) {
    for (const name of fileNames) {
      // Click the checkbox in the same row as the file name
      const row = this.fileTable.locator('tbody tr', {
        has: this.page.getByText(name),
      });
      await row.locator('input[type="checkbox"]').click();
    }
  }

  async rightClickFile(fileName: string) {
    await this.fileTable.getByText(fileName).click({ button: 'right' });
  }

  async clickBreadcrumb(name: string) {
    await this.breadcrumbs.getByText(name).click();
    await this.page.waitForTimeout(500);
  }

  async sortBy(column: string) {
    await this.sortHeaders.getByText(column).click();
    await this.page.waitForTimeout(300);
  }

  async getFileNames(): Promise<string[]> {
    const rows = this.fileTable.locator('tbody tr');
    const count = await rows.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      // Columns: [drag-handle] [checkbox] [name] [size] [modified] [type]
      // The name is in the 3rd cell (index 2)
      const text = await rows.nth(i).locator('td').nth(2).textContent();
      if (text) names.push(text.trim());
    }
    return names;
  }

  async hasFile(fileName: string): Promise<boolean> {
    return this.fileTable.getByText(fileName).isVisible();
  }

  async waitForLoaded() {
    // Wait for the vault to auto-select and the table or empty state to appear.
    // The BurnbagPage first loads vaults, auto-selects the first one, then
    // loads folder contents. We need to wait long enough for that chain.
    // First, wait for the vault combobox to become enabled (vault loaded)
    // or for the table to appear directly.
    await this.page
      .locator('div[role="combobox"]:not([aria-disabled="true"])')
      .or(this.page.locator('table'))
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 });
    // Now wait for the file table to render (folder contents loaded)
    await this.page.waitForSelector('table', {
      state: 'visible',
      timeout: 15_000,
    });
    // Give React time to fetch folder contents and render data rows
    // after the table shell appears. The useEffect fires after mount.
    await this.page.waitForTimeout(2_000);
  }

  /**
   * Wait until the file table contains at least `minCount` files, retrying
   * with page reloads. Useful after API-seeding multiple files.
   *
   * Total wall-clock time is kept under ~25s so the caller still has room
   * within the 60s Playwright test timeout.
   */
  async waitForMinimumFiles(minCount: number, _timeout = 8_000) {
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.waitForLoaded();
      const names = await this.getFileNames();
      if (names.length >= minCount) return names;
      if (attempt < maxAttempts - 1) {
        await this.page.waitForTimeout(1_000 * (attempt + 1));
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(1_000);
      }
    }
    // Return whatever we have — caller decides whether to skip
    return this.getFileNames();
  }

  /**
   * Wait for a specific file to appear in the table, retrying with page
   * reloads if it doesn't show up within the initial timeout.
   *
   * API-seeded files may take a moment to be rendered by React after the
   * folder-contents API responds. We retry up to 2 times with reloads,
   * keeping total wall-clock time under ~45s so the caller's catch block
   * can fire `test.skip()` before the 60s Playwright test timeout.
   */
  async waitForFile(fileName: string, timeout = 15_000) {
    const fileLocator = this.fileTable.getByText(fileName);
    const maxAttempts = 2;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Wait for React to fetch and render folder contents
        await this.waitForLoaded();
        await fileLocator.waitFor({ state: 'visible', timeout });
        return; // Found it
      } catch {
        if (attempt === maxAttempts - 1) break; // Don't reload on last attempt
        await this.page.waitForTimeout(1_500);
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(1_000);
      }
    }
    // Final attempt — let it throw if still not found
    await fileLocator.waitFor({ state: 'visible', timeout });
  }
}
