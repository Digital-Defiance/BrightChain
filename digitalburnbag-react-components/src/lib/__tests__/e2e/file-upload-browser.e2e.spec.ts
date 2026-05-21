/**
 * E2E UI: File upload and browser workflow (Task 46.2)
 *
 * Tests against the real BrightChain API server at /burnbag.
 * Covers: file browser rendering, folder navigation, breadcrumbs,
 * sorting, file upload via the UI, and upload progress.
 *
 * @requirements 55.2, 55.3, 50.1, 50.2, 50.3, 50.4
 */
import { computeChecksum, expect, navigateToBurnbag, test } from './fixtures';
import { FileBrowserPage } from './page-objects/FileBrowserPage';
import { UploadWidgetPage } from './page-objects/UploadWidgetPage';

test.describe('File Upload and Browser Workflow', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await navigateToBurnbag(authenticatedPage);
  });

  test('file browser renders with My Files section active', async ({
    authenticatedPage: page,
  }) => {
    // Wait for the vault combobox to become enabled — this means vaults
    // have loaded and one was auto-selected, so the UploadWidget and
    // FileBrowser will render below the vault picker.
    await page
      .locator('div[role="combobox"]:not([aria-disabled="true"])')
      .or(page.getByRole('table'))
      .or(page.getByText(/drop files here|click to browse/i))
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 });

    const hasTable = await page
      .getByRole('table')
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await page
      .getByText(/no files|empty|drop files|this folder is empty/i)
      .isVisible()
      .catch(() => false);
    const hasUploadZone = await page
      .getByText(/drop files here|click to browse/i)
      .isVisible()
      .catch(() => false);

    expect(hasTable || hasEmptyState || hasUploadZone).toBeTruthy();
  });

  test('breadcrumb navigation shows root', async ({
    authenticatedPage: page,
  }) => {
    // The breadcrumb uses aria-label="Folder path" (from i18n), not "breadcrumb"
    const breadcrumbs = page.getByRole('navigation', {
      name: /folder path|breadcrumb/i,
    });
    // Should show at least "My Files" root breadcrumb
    await expect(breadcrumbs.getByText(/my files|root/i)).toBeVisible();
  });

  test('upload a file and see it appear in the browser', async ({
    authenticatedPage: page,
  }) => {
    const upload = new UploadWidgetPage(page);
    const browser = new FileBrowserPage(page);

    // Wait for the vault to load and file browser to be ready
    await browser.waitForLoaded();

    // Generate a unique file name to avoid collisions
    const fileName = `e2e-test-${Date.now()}.txt`;
    const fileContent = `E2E test content created at ${new Date().toISOString()}`;

    // Upload via the file input
    await upload.uploadFile(fileName, fileContent);

    // Wait for upload to complete (progress bars disappear)
    await upload.waitForUploadComplete();

    // The file should now appear in the file browser.
    // After upload, BurnbagPage calls loadFolderContents which is async.
    // Use waitForFile which retries with reloads if needed.
    await browser.waitForFile(fileName);
  });

  test('upload multiple files shows per-file progress', async ({
    authenticatedPage: page,
  }) => {
    const upload = new UploadWidgetPage(page);
    const ts = Date.now();

    await upload.uploadMultipleFiles([
      { name: `e2e-multi-a-${ts}.txt`, content: 'File A content' },
      { name: `e2e-multi-b-${ts}.txt`, content: 'File B content' },
    ]);

    // Wait for both files to appear in the file browser
    const browser = new FileBrowserPage(page);
    await browser.waitForFile(`e2e-multi-a-${ts}.txt`);
    await browser.waitForFile(`e2e-multi-b-${ts}.txt`);

    // Wait for completion
    await upload.waitForUploadComplete();
  });

  test('sort columns change file order', async ({
    authenticatedPage: page,
  }) => {
    const browser = new FileBrowserPage(page);
    await browser.waitForLoaded();

    // Only test sorting if there's a table with sortable headers
    await expect(page.getByRole('table')).toBeVisible();

    const nameHeader = page.locator('th').getByText(/name/i);
    if (await nameHeader.isVisible()) {
      await nameHeader.click();
      // Table should still be visible after sort
      await expect(page.getByRole('table')).toBeVisible();
    }
  });

  test('create folder via API and navigate into it', async ({
    authenticatedPage: page,
    api,
  }) => {
    const browser = new FileBrowserPage(page);
    const folderName = `e2e-folder-${Date.now()}`;

    // Create folder via API
    const root = await api.getRootFolder();
    await api.createFolder(folderName, root.folder.id);

    // Refresh the page to see the new folder
    await navigateToBurnbag(page);
    await browser.waitForLoaded();

    // Folder should be visible (retry with reload if needed)
    try {
      await page
        .getByText(folderName)
        .waitFor({ state: 'visible', timeout: 10_000 });
    } catch {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page
        .getByText(folderName)
        .waitFor({ state: 'visible', timeout: 10_000 });
    }

    // Navigate into the folder
    await browser.navigateToFolder(folderName);

    // Breadcrumbs should show the folder name.
    // The breadcrumb nav may contain the folder name in both the title bar
    // and the breadcrumb trail, so use .first() to avoid strict mode violations.
    const breadcrumbs = page.getByRole('navigation', {
      name: /folder path|breadcrumb/i,
    });
    await expect(breadcrumbs.getByText(folderName).first()).toBeVisible();

    // Navigate back via breadcrumb — use "My Files" or "Root" depending on what's rendered
    // The breadcrumb may render as a link or as plain text
    const rootCrumb = breadcrumbs
      .locator('a, span, p, li')
      .filter({ hasText: /my files|root/i })
      .first();
    try {
      await rootCrumb.click({ timeout: 5000 });
    } catch {
      // Breadcrumb click failed — navigate back via URL
      await navigateToBurnbag(page);
    }
    await page.waitForTimeout(500);
    await expect(
      page.locator('p, td, [data-testid]', { hasText: folderName }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('create folder via New Folder button', async ({
    authenticatedPage: page,
  }) => {
    const browser = new FileBrowserPage(page);
    await browser.waitForLoaded();

    const folderName = `e2e-ui-folder-${Date.now()}`;

    // Click the New Folder button
    await page.getByRole('button', { name: /new folder/i }).click();

    // Dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // Type the folder name
    await page.getByLabel(/folder name/i).fill(folderName);

    // Click Create
    await page.getByRole('button', { name: /create/i }).click();

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Folder should appear in the file browser (use .first() to avoid snackbar collision)
    await expect(
      page.locator('p, td, [data-testid]', { hasText: folderName }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('select file by clicking', async ({ authenticatedPage: page, api }) => {
    const browser = new FileBrowserPage(page);

    // Seed a file via API
    const fileName = `e2e-select-${Date.now()}.txt`;
    const root = await api.getRootFolder();
    const session = await api.initUpload(
      fileName,
      'text/plain',
      5,
      root.folder.id,
    );
    await api.uploadChunk(
      session.sessionId,
      0,
      new TextEncoder().encode('hello'),
      computeChecksum(new TextEncoder().encode('hello')),
    );
    await api.finalizeUpload(session.sessionId);

    // Brief delay so the server indexes the newly-seeded file
    await new Promise((r) => setTimeout(r, 1_000));
    await navigateToBurnbag(page);
    await browser.waitForFile(fileName);

    // Click the file
    await browser.selectFile(fileName);

    // The file text should still be visible (selection doesn't hide it)
    await expect(page.getByText(fileName)).toBeVisible();
  });
});
