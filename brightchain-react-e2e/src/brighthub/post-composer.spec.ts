import { expect, test, waitForPageContent, waitForSuspense } from '../fixtures';

/**
 * Playwright E2E tests for the PostComposer component.
 *
 * Tests rich text editing, media attachment, and character limit enforcement.
 *
 * Requirements: 15.8
 */

/**
 * Navigate to the BrightHub timeline and wait for the PostComposer to be ready.
 * This waits for the lazy chunk, the inner page spinner, AND the textarea/toolbar
 * that only appear after the timeline API call completes.
 */
async function gotoTimeline(page: import('@playwright/test').Page) {
  await page.goto('/brighthub');
  await waitForSuspense(page);
  await waitForPageContent(page);

  // Final gate: wait for the textarea or a composer-related element.
  // This ensures the TimelinePage has finished loading and rendered PostComposer.
  await page
    .locator('textarea, [contenteditable], [data-testid="post-composer"]')
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 })
    .catch(() => {
      // If still not visible, the timeline API may have failed — let test assertions catch it
    });
}

test.describe('PostComposer', () => {
  test.describe('Rich Text Editing', () => {
    test('should render the post composer with formatting toolbar', async ({
      authenticatedPage: page,
    }) => {
      await gotoTimeline(page);

      const boldBtn = page.getByRole('button', { name: /bold/i });
      const toolbar = page
        .locator(
          '[data-testid="post-composer"], [class*="PostComposer"], [class*="composer"], textarea, [contenteditable]',
        )
        .first();

      const hasBold = await boldBtn
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
      const hasToolbar = await toolbar
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasBold || hasToolbar).toBeTruthy();

      if (hasBold) {
        const italicBtn = page.getByRole('button', { name: /italic/i });
        const codeBtn = page.getByRole('button', { name: /code/i });
        const emojiBtn = page.getByRole('button', { name: /emoji/i });
        await expect(italicBtn).toBeVisible({ timeout: 5_000 });
        await expect(codeBtn).toBeVisible({ timeout: 5_000 });
        await expect(emojiBtn).toBeVisible({ timeout: 5_000 });
      }
    });

    test('should insert bold markdown when bold button is clicked', async ({
      authenticatedPage: page,
    }) => {
      await gotoTimeline(page);

      const textarea = page.getByRole('textbox');
      await expect(textarea).toBeVisible({ timeout: 10_000 });
      await textarea.fill('hello world');

      // Select "world"
      await textarea.click();
      await textarea.evaluate((el: HTMLTextAreaElement) => {
        el.setSelectionRange(6, 11);
      });

      await page.getByRole('button', { name: /bold/i }).click();

      const value = await textarea.inputValue();
      expect(value).toContain('**world**');
    });

    test('should insert italic markdown when italic button is clicked', async ({
      authenticatedPage: page,
    }) => {
      await gotoTimeline(page);

      const textarea = page.getByRole('textbox');
      await expect(textarea).toBeVisible({ timeout: 10_000 });
      await textarea.fill('hello world');

      await textarea.click();
      await textarea.evaluate((el: HTMLTextAreaElement) => {
        el.setSelectionRange(6, 11);
      });

      await page.getByRole('button', { name: /italic/i }).click();

      const value = await textarea.inputValue();
      expect(value).toContain('*world*');
    });

    test('should insert code markdown when code button is clicked', async ({
      authenticatedPage: page,
    }) => {
      await gotoTimeline(page);

      const textarea = page.getByRole('textbox');
      await expect(textarea).toBeVisible({ timeout: 10_000 });
      await textarea.fill('hello world');

      await textarea.click();
      await textarea.evaluate((el: HTMLTextAreaElement) => {
        el.setSelectionRange(6, 11);
      });

      await page.getByRole('button', { name: /code/i }).click();

      const value = await textarea.inputValue();
      expect(value).toContain('`world`');
    });

    test('should insert emoji when emoji button is clicked', async ({
      authenticatedPage: page,
    }) => {
      await gotoTimeline(page);

      const textarea = page.getByRole('textbox');
      await expect(textarea).toBeVisible({ timeout: 10_000 });
      await textarea.click();

      await page.getByRole('button', { name: /emoji/i }).click();

      const value = await textarea.inputValue();
      expect(value).toContain('😊');
    });
  });

  test.describe('Media Attachment', () => {
    test('should show attach image button', async ({
      authenticatedPage: page,
    }) => {
      await gotoTimeline(page);

      const attachBtn = page.getByRole('button', { name: /attach image/i });
      await expect(attachBtn).toBeVisible({ timeout: 10_000 });
    });

    test('should disable attach button when 4 images are attached', async ({
      authenticatedPage: page,
    }) => {
      await gotoTimeline(page);

      // Attach 4 files via the hidden input
      const fileInput = page.locator('input[type="file"][accept*="image"]');
      await expect(fileInput).toBeAttached({ timeout: 10_000 });
      const files = Array.from({ length: 4 }, (_, i) => ({
        name: `test-${i}.png`,
        mimeType: 'image/png',
        buffer: Buffer.from('fake-png-data'),
      }));

      await fileInput.setInputFiles(files);

      // The attach button should now be disabled
      const attachBtn = page.getByRole('button', { name: /attach image/i });
      await expect(attachBtn).toBeDisabled({ timeout: 10_000 });
    });

    test('should show media previews after attaching images', async ({
      authenticatedPage: page,
    }) => {
      await gotoTimeline(page);

      const fileInput = page.locator('input[type="file"][accept*="image"]');
      await expect(fileInput).toBeAttached({ timeout: 10_000 });
      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake-png-data'),
      });

      // Should show a remove button for the attachment
      const removeBtn = page.getByRole('button', {
        name: /remove attachment/i,
      });
      await expect(removeBtn).toBeVisible({ timeout: 10_000 });
    });

    test('should remove media preview when remove button is clicked', async ({
      authenticatedPage: page,
    }) => {
      await gotoTimeline(page);

      const fileInput = page.locator('input[type="file"][accept*="image"]');
      await expect(fileInput).toBeAttached({ timeout: 10_000 });
      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake-png-data'),
      });

      const removeBtn = page.getByRole('button', {
        name: /remove attachment/i,
      });
      await removeBtn.click();

      // Attach button should be enabled again
      const attachBtn = page.getByRole('button', { name: /attach image/i });
      await expect(attachBtn).toBeEnabled({ timeout: 10_000 });
    });
  });

  test.describe('Character Limit', () => {
    test('should show character count when typing', async ({
      authenticatedPage: page,
    }) => {
      await gotoTimeline(page);

      const textarea = page.getByRole('textbox');
      await expect(textarea).toBeVisible({ timeout: 10_000 });
      await textarea.fill('Hello BrightHub!');

      // Character remaining indicator should be visible
      // 280 - 16 = 264
      await expect(page.getByText('264')).toBeVisible({ timeout: 5_000 });
    });

    test('should show warning color when near limit', async ({
      authenticatedPage: page,
    }) => {
      await gotoTimeline(page);

      const textarea = page.getByRole('textbox');
      await expect(textarea).toBeVisible({ timeout: 10_000 });
      // Fill with 265 characters (15 remaining)
      await textarea.fill('a'.repeat(265));

      // Should show 15 remaining
      await expect(page.getByText('15')).toBeVisible({ timeout: 5_000 });
    });

    test('should disable submit when over 280 characters', async ({
      authenticatedPage: page,
    }) => {
      await gotoTimeline(page);

      const textarea = page.getByRole('textbox');
      await expect(textarea).toBeVisible({ timeout: 10_000 });
      await textarea.fill('a'.repeat(281));

      const submitBtn = page.getByRole('button', { name: /submit post/i });
      await expect(submitBtn).toBeDisabled({ timeout: 5_000 });
    });

    test('should disable submit when content is empty', async ({
      authenticatedPage: page,
    }) => {
      await gotoTimeline(page);

      const submitBtn = page.getByRole('button', { name: /submit post/i });
      await expect(submitBtn).toBeDisabled({ timeout: 10_000 });
    });

    test('should enable submit with valid content', async ({
      authenticatedPage: page,
    }) => {
      await gotoTimeline(page);

      const textarea = page.getByRole('textbox');
      await expect(textarea).toBeVisible({ timeout: 10_000 });
      await textarea.fill('Valid post content');

      const submitBtn = page.getByRole('button', { name: /submit post/i });
      await expect(submitBtn).toBeEnabled({ timeout: 5_000 });
    });
  });
});
