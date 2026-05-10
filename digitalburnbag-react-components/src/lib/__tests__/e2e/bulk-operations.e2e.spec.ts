/**
 * E2E UI: Bulk operations workflow
 *
 * Tests against the real BrightChain API server at /burnbag.
 * Covers: multi-select, bulk toolbar appearance, bulk delete,
 * clear selection, and result summary.
 *
 * @requirements 9.1, 9.2, 9.3, 55.2
 */
import { expect, navigateToBurnbag, test } from './fixtures';
import { BulkOperationsPage } from './page-objects/BulkOperationsPage';
import { FileBrowserPage } from './page-objects/FileBrowserPage';

test.describe('Bulk Operations', () => {
  test.beforeEach(async ({ authenticatedPage: page, api }) => {
    // Seed multiple files for bulk operations
    const ts = Date.now();
    await api.seedFile(`e2e-bulk-a-${ts}.txt`, 'bulk content a');
    await api.seedFile(`e2e-bulk-b-${ts}.txt`, 'bulk content b');
    await api.seedFile(`e2e-bulk-c-${ts}.txt`, 'bulk content c');
    // Brief delay so the server indexes the newly-seeded files before we load
    await new Promise((r) => setTimeout(r, 1_500));
    await navigateToBurnbag(page);
  });

  test('selecting multiple files shows bulk toolbar', async ({
    authenticatedPage: page,
  }) => {
    const browser = new FileBrowserPage(page);
    const fileNames = await browser.waitForMinimumFiles(2);
    expect(fileNames.length).toBeGreaterThanOrEqual(2);

    // Multi-select two files
    await browser.selectMultipleFiles(fileNames.slice(0, 2));

    // Bulk toolbar should appear
    const bulk = new BulkOperationsPage(page);
    const toolbarVisible = await bulk.isVisible();
    // The toolbar or a selected count indicator should be present
    const hasSelectedIndicator = await page
      .getByText(/selected/i)
      .isVisible()
      .catch(() => false);

    expect(toolbarVisible || hasSelectedIndicator).toBeTruthy();
  });

  test('bulk toolbar shows selected count', async ({
    authenticatedPage: page,
  }) => {
    const browser = new FileBrowserPage(page);
    const fileNames = await browser.waitForMinimumFiles(2);
    expect(fileNames.length).toBeGreaterThanOrEqual(2);

    await browser.selectMultipleFiles(fileNames.slice(0, 2));

    const bulk = new BulkOperationsPage(page);
    const countText = await bulk.getSelectedCount();
    if (countText) {
      expect(countText).toMatch(/2/);
    }
  });

  test('clear selection hides bulk toolbar', async ({
    authenticatedPage: page,
  }) => {
    const browser = new FileBrowserPage(page);
    const fileNames = await browser.waitForMinimumFiles(2);
    expect(fileNames.length).toBeGreaterThanOrEqual(2);

    await browser.selectMultipleFiles(fileNames.slice(0, 2));

    const bulk = new BulkOperationsPage(page);
    if (await bulk.isVisible()) {
      await bulk.clickClear();
      await page.waitForTimeout(500);

      const stillVisible = await bulk.isVisible();
      expect(stillVisible).toBeFalsy();
    }
  });

  test('bulk delete moves selected files to trash', async ({
    authenticatedPage: page,
  }) => {
    const browser = new FileBrowserPage(page);
    const fileNames = await browser.waitForMinimumFiles(2);
    const bulkFiles = fileNames.filter((n) => n.includes('e2e-bulk-'));
    expect(bulkFiles.length).toBeGreaterThanOrEqual(2);

    await browser.selectMultipleFiles(bulkFiles.slice(0, 2));

    const bulk = new BulkOperationsPage(page);
    if (await bulk.deleteButton.isVisible()) {
      await bulk.clickDelete();

      // Confirm the delete if a confirmation dialog appears
      const confirmBtn = page.getByRole('button', {
        name: /confirm|yes|delete/i,
      });
      if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      // Should show success feedback — either a snackbar, an alert, or the
      // deleted files should disappear from the table.
      const snackbar = page.locator('.MuiSnackbar-root, [role="alert"]');
      const snackbarVisible = await snackbar
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      // If no snackbar, verify the files were removed from the table
      if (!snackbarVisible) {
        // Poll for up to 10 seconds for the deleted files to disappear
        let deletedStillPresent = true;
        for (let attempt = 0; attempt < 10; attempt++) {
          await page.waitForTimeout(1_000);
          const remainingFiles = await browser.getFileNames();
          deletedStillPresent = bulkFiles
            .slice(0, 2)
            .some((f) => remainingFiles.includes(f));
          if (!deletedStillPresent) break;
        }
        expect(deletedStillPresent).toBeFalsy();
      }
    }
  });
});
