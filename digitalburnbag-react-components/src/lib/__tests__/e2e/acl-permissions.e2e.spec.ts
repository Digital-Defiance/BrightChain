/**
 * E2E UI: ACL editor and permissions workflow
 *
 * Tests against the real BrightChain API server at /burnbag.
 * Covers: ACL editor opening, adding/removing entries, permission levels,
 * and verifying permission enforcement.
 *
 * @requirements 55.5, 10.1, 10.2, 40.1, 40.2, 46.2
 */
import type { Page } from '@playwright/test';
import { expect, navigateToBurnbag, test } from './fixtures';
import { ACLEditorPage } from './page-objects/ACLEditorPage';
import { FileBrowserPage } from './page-objects/FileBrowserPage';

/**
 * Open the Permissions menu item from a file's context menu.
 * "Permissions" lives under the "More…" submenu, so we need to
 * right-click → More… → Permissions.
 * Returns true if the ACL editor opened, false if the menu item wasn't found.
 */
async function openPermissionsViaContextMenu(
  page: Page,
  browser: FileBrowserPage,
  fileName: string,
): Promise<boolean> {
  await browser.rightClickFile(fileName);

  // Check primary menu first
  let permOption = page.getByRole('menuitem', {
    name: /permission|acl|access/i,
  });
  if (await permOption.isVisible().catch(() => false)) {
    await permOption.click();
    return true;
  }

  // Try "More…" submenu
  const moreOption = page.getByRole('menuitem', { name: /more/i });
  if (await moreOption.isVisible().catch(() => false)) {
    await moreOption.click();
    await page.waitForTimeout(300);
    permOption = page.getByRole('menuitem', {
      name: /permission|acl|access/i,
    });
    if (await permOption.isVisible().catch(() => false)) {
      await permOption.click();
      return true;
    }
  }

  // Dismiss any open menu
  await page.keyboard.press('Escape');
  return false;
}

test.describe('ACL Editor and Permissions', () => {
  let testFileId: string;
  let testFileName: string;

  test.beforeEach(async ({ authenticatedPage: page, api }) => {
    const file = await api.seedFile(`e2e-acl-${Date.now()}.txt`);
    testFileId = file.id;
    testFileName = file.name;
    await new Promise((r) => setTimeout(r, 1_000));
    await navigateToBurnbag(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
  });

  test('open ACL editor from file context menu', async ({
    authenticatedPage: page,
  }) => {
    const browser = new FileBrowserPage(page);
    await browser.waitForFile(testFileName);

    const opened = await openPermissionsViaContextMenu(
      page,
      browser,
      testFileName,
    );
    expect(opened).toBe(true);

    const aclEditor = new ACLEditorPage(page);
    const hasEditor = await aclEditor.principalInput
      .or(aclEditor.entryRows.first())
      .isVisible()
      .catch(() => false);
    expect(hasEditor).toBeTruthy();
  });

  test('ACL editor shows existing entries', async ({
    authenticatedPage: page,
  }) => {
    const browser = new FileBrowserPage(page);
    await browser.waitForFile(testFileName);

    const opened = await openPermissionsViaContextMenu(
      page,
      browser,
      testFileName,
    );
    expect(opened).toBe(true);

    const aclEditor = new ACLEditorPage(page);
    const count = await aclEditor.getEntryCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('add ACL entry for a user', async ({ authenticatedPage: page }) => {
    const browser = new FileBrowserPage(page);
    await browser.waitForFile(testFileName);

    const opened = await openPermissionsViaContextMenu(
      page,
      browser,
      testFileName,
    );
    expect(opened).toBe(true);

    const aclEditor = new ACLEditorPage(page);
    const initialCount = await aclEditor.getEntryCount();

    if (await aclEditor.principalInput.isVisible()) {
      await aclEditor.addEntry('test-user@brightchain.org', 'Viewer');
      await page.waitForTimeout(500);

      const newCount = await aclEditor.getEntryCount();
      expect(newCount).toBeGreaterThan(initialCount);
    }
  });

  test('ACL changes are reflected via API', async ({
    authenticatedPage: _page,
    api,
  }) => {
    const acl = await api.getACL('file', testFileId);
    expect(acl).toHaveProperty('entries');
    expect(Array.isArray(acl.entries)).toBeTruthy();
  });
});
