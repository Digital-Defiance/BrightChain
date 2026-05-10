/**
 * E2E UI: Canary protocol advanced workflow
 *
 * Tests against the real BrightChain API server at /burnbag.
 * Covers: canary binding creation, dry-run execution, recipient list
 * management, binding deletion, and cascading configuration.
 *
 * @requirements 18.1, 19.1, 20.1, 22.1, 46.2, 55.7
 */
import {
  clickSidebarSection,
  expect,
  navigateToBurnbag,
  test,
} from './fixtures';
import { CanaryConfigPage } from './page-objects/CanaryConfigPage';

test.describe('Canary Protocol Advanced', () => {
  test.beforeEach(async ({ authenticatedPage: page, api }) => {
    // Seed a file that canary bindings can target
    await api.seedFile(`e2e-canary-target-${Date.now()}.txt`, 'canary data');
    // Brief delay so the server indexes the newly-seeded file before we load
    await new Promise((r) => setTimeout(r, 1_000));
    await navigateToBurnbag(page);
  });

  test('canary section shows create binding button', async ({
    authenticatedPage: page,
  }) => {
    await clickSidebarSection(page, 'Canary');

    const createButton = page.getByRole('button', {
      name: /create.*binding|add.*binding|new.*binding/i,
    });
    const hasCreate = await createButton.isVisible().catch(() => false);

    // Should have a way to create bindings
    expect(hasCreate).toBeTruthy();
  });

  test('canary binding creation form has required fields', async ({
    authenticatedPage: page,
  }) => {
    await clickSidebarSection(page, 'Canary');

    const createButton = page.getByRole('button', {
      name: /create.*binding|add.*binding|new.*binding/i,
    });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Form should have condition, provider, and action fields
    const hasCondition = await page
      .getByText(/condition|trigger/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasAction = await page
      .getByText(/action|protocol/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasCondition || hasAction).toBeTruthy();
  });

  test('dry-run button produces report', async ({
    authenticatedPage: page,
    api,
  }) => {
    // Create a binding via API first
    const binding = await api.createCanaryBinding({
        condition: 'MISSED_CHECK_IN',
        provider: 'MANUAL',
        action: 'DeleteFiles',
        targetIds: [],
      });

      await clickSidebarSection(page, 'Canary');
      await page.waitForTimeout(1000);

      const canaryPage = new CanaryConfigPage(page);
      const dryRunButtons = canaryPage.dryRunButtons;

      if ((await dryRunButtons.count()) > 0) {
        await canaryPage.clickDryRun(0);
        await page.waitForTimeout(1000);

        // Should show a report or result
        const hasReport = await page
          .getByText(/affected|files|recipients|dry.*run.*result/i)
          .first()
          .isVisible()
          .catch(() => false);

        expect(hasReport).toBeTruthy();
      }

      // Cleanup
      await api.deleteCanaryBinding(binding.id);
  });

  test('canary bindings API CRUD works', async ({
    authenticatedPage: _page,
    api,
  }) => {
    // Create
      const binding = await api.createCanaryBinding({
        condition: 'MISSED_CHECK_IN',
        provider: 'MANUAL',
        action: 'DeleteFiles',
        targetIds: [],
      });
      expect(binding).toHaveProperty('id');

      // Read
      const bindings = await api.getCanaryBindings();
      expect(Array.isArray(bindings)).toBeTruthy();

      // Delete
      await api.deleteCanaryBinding(binding.id);
  });

  test('recipient list management via API', async ({
    authenticatedPage: _page,
    api,
  }) => {
    const list = await api.createRecipientList({
        name: `e2e-recipients-${Date.now()}`,
        recipients: [
          { email: 'test1@example.com', label: 'Test 1' },
          { email: 'test2@example.com', label: 'Test 2' },
        ],
      });
      expect(list).toHaveProperty('id');
  });

  test('canary navigable via URL', async ({ authenticatedPage: page }) => {
    await page.goto('/burnbag/canary', { waitUntil: 'domcontentloaded' });
    // Wait for the authenticated app to render
    await page
      .waitForSelector(
        '[data-testid="app-sidebar-drawer"], [data-testid="sidebar-nav-list"]',
        { timeout: 30_000 },
      )
      .catch(() => {
        /* sidebar may not have rendered yet */
      });
    await page.waitForTimeout(1000);

    const hasCanaryContent = await page
      .getByText(/canary|binding|protocol/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasCanaryContent).toBeTruthy();
  });
});
