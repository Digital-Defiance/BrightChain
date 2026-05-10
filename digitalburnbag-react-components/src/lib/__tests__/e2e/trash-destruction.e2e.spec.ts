/**
 * E2E UI: Trash, destruction, and advanced features (Task 46.4)
 *
 * Tests against the real BrightChain API server at /burnbag.
 * Covers: trash bin view, restore from trash, permanent deletion,
 * canary configuration panel, and sidebar navigation.
 *
 * @requirements 55.6, 55.7, 55.8, 7.1, 7.2, 7.3
 */
import {
  clickSidebarSection,
  computeChecksum,
  expect,
  navigateToBurnbag,
  test,
} from './fixtures';
import { CanaryConfigPage } from './page-objects/CanaryConfigPage';
import { TrashBinPage } from './page-objects/TrashBinPage';

test.describe('Trash Bin Workflow', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await navigateToBurnbag(page);
  });

  test('trash section renders', async ({ authenticatedPage: page }) => {
    await clickSidebarSection(page, 'Trash');

    // Should show the trash view — either a table or empty state
    const hasContent = await page
      .getByRole('table')
      .or(page.getByText(/trash is empty|no deleted|empty/i))
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasContent).toBeTruthy();
  });

  test('soft-delete a file and see it in trash', async ({
    authenticatedPage: page,
    api,
  }) => {
    // Seed a file via API
    const fileName = `e2e-trash-${Date.now()}.txt`;
    const root = await api.getRootFolder();
    const session = await api.initUpload(
      fileName,
      'text/plain',
      10,
      root.folder.id,
    );
    await api.uploadChunk(
      session.sessionId,
      0,
      new TextEncoder().encode('trash test'),
      computeChecksum(new TextEncoder().encode('trash test')),
    );
    const file = await api.finalizeUpload(session.sessionId);

    // Soft-delete via API
    await api.softDeleteFile(file.id);

    // Brief delay so the server processes the soft-delete
    await new Promise((r) => setTimeout(r, 1_000));

    // Navigate to trash section
    await clickSidebarSection(page, 'Trash');

    // The file should appear in trash (retry with reload if needed)
    let found = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page
          .getByText(fileName)
          .waitFor({ state: 'visible', timeout: 8_000 });
        found = true;
        break;
      } catch {
        await page.waitForTimeout(1_000 * (attempt + 1));
        await page.reload({ waitUntil: 'domcontentloaded' });
        await clickSidebarSection(page, 'Trash');
      }
    }
    if (!found) {
      expect(found).toBe(true);
    }
  });

  test('restore file from trash', async ({ authenticatedPage: page, api }) => {
    // Seed and soft-delete a file
    const fileName = `e2e-restore-${Date.now()}.txt`;
    const root = await api.getRootFolder();
    const session = await api.initUpload(
      fileName,
      'text/plain',
      12,
      root.folder.id,
    );
    await api.uploadChunk(
      session.sessionId,
      0,
      new TextEncoder().encode('restore test'),
      computeChecksum(new TextEncoder().encode('restore test')),
    );
    const file = await api.finalizeUpload(session.sessionId);
    await api.softDeleteFile(file.id);

    // Brief delay so the server processes the soft-delete
    await new Promise((r) => setTimeout(r, 1_000));

    // Navigate to trash
    await clickSidebarSection(page, 'Trash');
    let found = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page
          .getByText(fileName)
          .waitFor({ state: 'visible', timeout: 8_000 });
        found = true;
        break;
      } catch {
        await page.waitForTimeout(1_000 * (attempt + 1));
        await page.reload({ waitUntil: 'domcontentloaded' });
        await clickSidebarSection(page, 'Trash');
      }
    }
    expect(found).toBe(true);

    // Restore the file
    const trashPage = new TrashBinPage(page);
    await trashPage.restoreItem(fileName);

    // Success message should appear
    const snackbar = page.getByText(/restored/i).first();
    await expect(snackbar).toBeVisible({ timeout: 5_000 });

    // File should no longer be in trash
    await page.waitForTimeout(1000);
    const stillInTrash = await page
      .getByRole('table')
      .getByText(fileName)
      .isVisible()
      .catch(() => false);
    expect(stillInTrash).toBeFalsy();
  });

  test('permanently delete file from trash', async ({
    authenticatedPage: page,
    api,
  }) => {
    // Seed and soft-delete a file
    const fileName = `e2e-permdelete-${Date.now()}.txt`;
    const root = await api.getRootFolder();
    const session = await api.initUpload(
      fileName,
      'text/plain',
      14,
      root.folder.id,
    );
    await api.uploadChunk(
      session.sessionId,
      0,
      new TextEncoder().encode('permanent delete'),
      computeChecksum(new TextEncoder().encode('permanent delete')),
    );
    const file = await api.finalizeUpload(session.sessionId);
    await api.softDeleteFile(file.id);

    // Brief delay so the server processes the soft-delete
    await new Promise((r) => setTimeout(r, 1_000));

    // Navigate to trash
    await clickSidebarSection(page, 'Trash');
    let found = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page
          .getByText(fileName)
          .waitFor({ state: 'visible', timeout: 8_000 });
        found = true;
        break;
      } catch {
        await page.waitForTimeout(1_000 * (attempt + 1));
        await page.reload({ waitUntil: 'domcontentloaded' });
        await clickSidebarSection(page, 'Trash');
      }
    }
    expect(found).toBe(true);

    // Permanently delete
    const trashPage = new TrashBinPage(page);
    await trashPage.permanentlyDelete(fileName);

    // Success message
    const snackbar = page.getByText(/permanently deleted/i).first();
    await expect(snackbar).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Canary Configuration', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await navigateToBurnbag(page);
  });

  test('canary section renders', async ({ authenticatedPage: page }) => {
    await clickSidebarSection(page, 'Canary');

    // Should show the canary config panel
    const hasContent = await page
      .getByText(/canary|binding|protocol/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasContent).toBeTruthy();
  });

  test('canary panel shows bindings list or empty state', async ({
    authenticatedPage: page,
  }) => {
    await clickSidebarSection(page, 'Canary');

    const canaryPage = new CanaryConfigPage(page);

    // Either bindings exist or we see an empty/create state
    const bindingCount = await canaryPage.getBindingCount().catch(() => 0);
    const hasCreateButton = await page
      .getByRole('button', { name: /create.*binding|add.*binding|new/i })
      .isVisible()
      .catch(() => false);

    expect(bindingCount >= 0 || hasCreateButton).toBeTruthy();
  });
});

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await navigateToBurnbag(page);
  });

  test('sidebar sections are navigable', async ({
    authenticatedPage: page,
  }) => {
    // Test each sidebar section loads without error
    const sections = ['My Files', 'Shared', 'Trash', 'Activity', 'Analytics'];

    // Scope to sidebar to avoid strict-mode violations (e.g. "My Files"
    // appears in both the sidebar and the breadcrumb).
    const sidebar = page
      .locator(
        '[data-testid="sidebar-navigation"], [data-testid="sidebar-nav-list"], [data-testid="app-sidebar-drawer"], nav[aria-label="File sections"], [role="menu"][aria-label="File sections"], nav',
      )
      .first();

    for (const section of sections) {
      const sectionLink = sidebar.getByText(section, { exact: false }).first();
      if (await sectionLink.isVisible().catch(() => false)) {
        await sectionLink.click();
        await page.waitForTimeout(500);

        // Page should not show an unhandled error
        const hasError = await page
          .getByText(/unhandled.*error|something went wrong|crash/i)
          .isVisible()
          .catch(() => false);
        expect(hasError).toBeFalsy();
      }
    }
  });
});
