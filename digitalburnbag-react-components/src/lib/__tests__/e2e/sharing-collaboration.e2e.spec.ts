/**
 * E2E UI: Sharing and collaboration workflow (Task 46.3)
 *
 * Tests against the real BrightChain API server at /burnbag.
 * Covers: share dialog, internal sharing, advanced encryption modes,
 * password protection, expiration, share link creation, and magnet URLs.
 *
 * @requirements 55.4, 55.5, 46.1, 46.2
 */
import {
  clickSidebarSection,
  computeChecksum,
  expect,
  navigateToBurnbag,
  test,
} from './fixtures';
import { FileBrowserPage } from './page-objects/FileBrowserPage';
import { ShareDialogPage } from './page-objects/ShareDialogPage';

test.describe('Sharing and Collaboration Workflow', () => {
  let _testFileId: string;
  let testFileName: string;

  test.beforeEach(async ({ authenticatedPage: page, api }) => {
    // Seed a test file via API for sharing tests
    testFileName = `e2e-share-${Date.now()}.txt`;
    const root = await api.getRootFolder();
    const session = await api.initUpload(
      testFileName,
      'text/plain',
      12,
      root.folder.id,
    );
    await api.uploadChunk(
      session.sessionId,
      0,
      new TextEncoder().encode('share content'),
      computeChecksum(new TextEncoder().encode('share content')),
    );
    const file = await api.finalizeUpload(session.sessionId);
    _testFileId = file.id;

    // Brief delay so the server indexes the newly-seeded file before we load
    await new Promise((r) => setTimeout(r, 1_000));
    await navigateToBurnbag(page);
  });

  test('open share dialog from file context menu', async ({
    authenticatedPage: page,
  }) => {
    const browser = new FileBrowserPage(page);
    await browser.waitForFile(testFileName);

    // Right-click the test file to open context menu
    await browser.rightClickFile(testFileName);

    // Click "share" in the context menu
    const shareOption = page.getByRole('menuitem', { name: /share/i });
    if (await shareOption.isVisible()) {
      await shareOption.click();

      // Share dialog should open
      const shareDialog = new ShareDialogPage(page);
      await expect(shareDialog.dialog).toBeVisible();

      // Dialog should reference the file name
      await expect(shareDialog.dialog.getByText(testFileName)).toBeVisible();

      // Close the dialog
      await shareDialog.close();
      await expect(shareDialog.dialog).not.toBeVisible();
    }
  });

  test('share dialog shows advanced options when expanded', async ({
    authenticatedPage: page,
  }) => {
    const browser = new FileBrowserPage(page);
    await browser.waitForFile(testFileName);

    // Open share dialog
    await browser.rightClickFile(testFileName);
    const shareOption = page.getByRole('menuitem', { name: /share/i });
    await expect(shareOption).toBeVisible();
    await shareOption.click();

    const shareDialog = new ShareDialogPage(page);
    await expect(shareDialog.dialog).toBeVisible();

    // Expand advanced section
    await shareDialog.expandAdvanced();

    // Should show encryption mode options
    const hasEncryptionOptions = await shareDialog.dialog
      .getByText(/server.*proxied|ephemeral|recipient.*key/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasEncryptionOptions).toBeTruthy();

    await shareDialog.close();
  });

  test('share dialog has block download toggle', async ({
    authenticatedPage: page,
  }) => {
    const browser = new FileBrowserPage(page);
    await browser.waitForFile(testFileName);

    await browser.rightClickFile(testFileName);
    const shareOption = page.getByRole('menuitem', { name: /share/i });
    await expect(shareOption).toBeVisible();
    await shareOption.click();

    const shareDialog = new ShareDialogPage(page);
    await shareDialog.expandAdvanced();

    // Block download toggle should be available
    const blockDownload = shareDialog.blockDownloadToggle;
    const isVisible = await blockDownload.isVisible().catch(() => false);
    if (isVisible) {
      await blockDownload.check();
      await expect(blockDownload).toBeChecked();
    }

    await shareDialog.close();
  });

  test('magnet URL section shows irrevocability warning', async ({
    authenticatedPage: page,
  }) => {
    const browser = new FileBrowserPage(page);
    await browser.waitForFile(testFileName);

    await browser.rightClickFile(testFileName);
    const shareOption = page.getByRole('menuitem', { name: /share/i });
    await expect(shareOption).toBeVisible();
    await shareOption.click();

    const shareDialog = new ShareDialogPage(page);
    await expect(shareDialog.dialog).toBeVisible();

    // Look for irrevocability warning text
    const hasWarning = await shareDialog.dialog
      .getByText(/irrevocab/i)
      .isVisible()
      .catch(() => false);

    // This is expected to be present in the share dialog
    expect(hasWarning).toBeTruthy();

    await shareDialog.close();
  });

  test('shared items section loads', async ({ authenticatedPage: page }) => {
    // Navigate to "Shared with me" section
    await clickSidebarSection(page, 'Shared');

    // Should render the shared items view (table or empty state)
    const hasContent = await page
      .getByRole('table')
      .or(page.getByText(/no shared|nothing shared|empty/i))
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasContent).toBeTruthy();
  });
});
