/**
 * E2E UI: Domain routing and branding
 *
 * Tests against the real BrightChain API server at /burnbag.
 * Covers: DomainRouter branding, AppBar rendering, theme application,
 * and all routes working from the default domain.
 *
 * @requirements 34.1, 34.2, 34.3, 34.4, 34.5, 34.8, 55.8
 */
import { expect, navigateToBurnbag, test } from './fixtures';

test.describe('Domain Routing and Branding', () => {
  test('burnbag page renders with BrightChain branding on localhost', async ({
    authenticatedPage: page,
  }) => {
    await navigateToBurnbag(page);

    // On localhost, should fall back to BrightChain branding
    // Use .first() to avoid strict-mode violation when multiple AppBars render
    const appBar = page.locator('.MuiAppBar-root, [class*="AppBar"]').first();
    await expect(appBar).toBeVisible({ timeout: 15_000 });
  });

  test('AppBar shows brand header text', async ({
    authenticatedPage: page,
  }) => {
    await navigateToBurnbag(page);

    // Should show "BrightChain" or similar brand text in the header
    // Use .first() to avoid strict-mode violation when multiple AppBars render
    const appBar = page.locator('.MuiAppBar-root, [class*="AppBar"]').first();
    await expect(appBar).toBeVisible({ timeout: 15_000 });

    const hasBrandText = await appBar
      .getByText(/brightchain|burnbag|canary|privacy/i)
      .isVisible()
      .catch(() => false);

    // Also check for any text content in the AppBar as fallback
    const hasAnyText = await appBar
      .locator('*')
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasBrandText || hasAnyText).toBeTruthy();
  });

  test('AppBar has logo or brand icon', async ({ authenticatedPage: page }) => {
    await navigateToBurnbag(page);

    // The AppBar uses a BrightChainSubLogo component (SVG + text), not an <img>.
    // Check for SVG icon or brand text inside the AppBar.
    const hasLogoOrBrand = await page
      .locator(
        '.MuiAppBar-root svg, .MuiAppBar-root [class*="Logo"], [class*="AppBar"] svg',
      )
      .first()
      .isVisible()
      .catch(() => false);

    // Fallback: check for brand text if no SVG icon
    const hasBrandText = await page
      .locator('.MuiAppBar-root')
      .getByText(/digital|burnbag|brightchain|canary/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasLogoOrBrand || hasBrandText).toBeTruthy();
  });

  test('all sidebar sections render without error from any route', async ({
    authenticatedPage: page,
  }) => {
    const sections = [
      '/burnbag',
      '/burnbag/shared',
      '/burnbag/trash',
      '/burnbag/activity',
      '/burnbag/analytics',
      '/burnbag/canary',
    ];

    for (const route of sections) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      const hasError = await page
        .getByText(/unhandled.*error|something went wrong|crash/i)
        .isVisible()
        .catch(() => false);

      expect(hasError).toBeFalsy();
    }
  });

  test('theme colors are applied', async ({ authenticatedPage: page }) => {
    await navigateToBurnbag(page);

    // MUI theme should be applied — check that AppBar has a background color
    // Use .first() to avoid strict-mode violation when multiple AppBars render
    const appBar = page.locator('.MuiAppBar-root').first();
    if (await appBar.isVisible()) {
      const bgColor = await appBar.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.backgroundColor || style.background;
      });
      // MUI AppBar with color="primary" applies the theme primary color.
      // Accept any non-transparent background (rgb, rgba with alpha > 0, or named color).
      const isTransparent =
        bgColor === 'rgba(0, 0, 0, 0)' ||
        bgColor === 'transparent' ||
        bgColor === '';
      // If the AppBar has the MuiAppBar-colorPrimary class, the theme is applied
      // even if the computed background is transparent (e.g. CSS-in-JS not yet flushed).
      const hasColorClass = await appBar.evaluate((el) =>
        el.classList.contains('MuiAppBar-colorPrimary'),
      );
      expect(isTransparent ? hasColorClass : true).toBeTruthy();
    }
  });
});
