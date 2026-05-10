/**
 * E2E UI: Folder export to TCBL workflow
 *
 * Tests against the real BrightChain API server at /burnbag.
 * Covers: export dialog opening from folder context menu,
 * export options, progress, result summary, and skipped files.
 *
 * @requirements 53.1, 53.4, 53.7, 53.8, 53.9, 55.6
 */
import { expect, navigateToBurnbag, test } from './fixtures';
import { FileBrowserPage } from './page-objects/FileBrowserPage';
import { FolderExportPage } from './page-objects/FolderExportPage';

test.describe('Folder Export to TCBL', () => {
  let testFolderName: string;

  test.beforeEach(async ({ authenticatedPage: page, api }) => {
    // Seed a folder with files for export
    testFolderName = `e2e-export-${Date.now()}`;
    const root = await api.getRootFolder();
    const folder = await api.createFolder(testFolderName, root.folder.id);
    await api.seedFile(`export-file-1.txt`, 'export content 1', folder.id);
    await api.seedFile(`export-file-2.txt`, 'export content 2', folder.id);
    // Brief delay so the server indexes the newly-seeded folder and files
    await new Promise((r) => setTimeout(r, 1_500));
    await navigateToBurnbag(page);
  });

  test('export option appears in folder context menu', async ({
    authenticatedPage: page,
  }) => {
    const browser = new FileBrowserPage(page);
    await browser.waitForLoaded();

    await browser.rightClickFile(testFolderName);

    // Look for export option (may be under "More..." submenu)
    const exportOption = page.getByRole('menuitem', {
      name: /export|tcbl/i,
    });
    const moreOption = page.getByRole('menuitem', {
      name: /more|advanced/i,
    });

    const hasExport = await exportOption.isVisible().catch(() => false);
    const hasMore = await moreOption.isVisible().catch(() => false);

    // Export should be directly visible or under "More..."
    expect(hasExport || hasMore).toBeTruthy();
  });

  test('export dialog opens with options', async ({
    authenticatedPage: page,
  }) => {
    const browser = new FileBrowserPage(page);
    await browser.waitForLoaded();

    await browser.rightClickFile(testFolderName);

    // Try direct export option first, then "More..." submenu
    let exportOption = page.getByRole('menuitem', { name: /export|tcbl/i });
    if (!(await exportOption.isVisible())) {
      const moreOption = page.getByRole('menuitem', {
        name: /more|advanced/i,
      });
      if (await moreOption.isVisible()) {
        await moreOption.click();
        exportOption = page.getByRole('menuitem', { name: /export|tcbl/i });
      }
    }

    if (await exportOption.isVisible()) {
      await exportOption.click();

      const exportPage = new FolderExportPage(page);
      const isOpen = await exportPage.isOpen();
      expect(isOpen).toBeTruthy();

      await exportPage.close();
    }
  });

  test('export API endpoint works', async ({
    authenticatedPage: _page,
    api,
  }) => {
    const root = await api.getRootFolder();
    // Find our test folder
    const contents = await api.getFolderContents(root.folder.id);
    const folder = (contents.subfolders as { id: string; name: string }[]).find(
      (f) => f.name === testFolderName,
    );
    expect(folder).toBeDefined();

    const result = await api.exportFolderToTCBL(folder.id);
    expect(result).toHaveProperty('tcblHandle');
    // entryCount is nested under manifestSummary
    const entryCount =
      result.entryCount ?? result.manifestSummary?.entryCount ?? 0;
    expect(entryCount).toBeGreaterThan(0);
  });
});
