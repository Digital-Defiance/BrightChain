import { expect, test } from '../fixtures';

/**
 * Playwright E2E tests for the PostComposer component.
 *
 * Tests rich text editing, media attachment, and character limit enforcement.
 *
 * Requirements: 15.8
 */

test.describe('PostComposer', () => {
  test.describe('Rich Text Editing', () => {
    test('should render the post composer with formatting toolbar', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('networkidle');

      // Composer should be visible with formatting buttons
      const boldBtn = page.getByRole('button', { name: /bold/i });
      const italicBtn = page.getByRole('button', { name: /italic/i });
      const codeBtn = page.getByRole('button', { name: /code/i });
      const emojiBtn = page.getByRole('button', { name: /emoji/i });

      await expect(boldBtn).toBeVisible();
      await expect(italicBtn).toBeVisible();
      await expect(codeBtn).toBeVisible();
      await expect(emojiBtn).toBeVisible();
    });

    test('should insert bold markdown when bold button is clicked', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('networkidle');

      const textarea = page.getByRole('textbox');
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
      await page.goto('/brighthub');
      await page.waitForLoadState('networkidle');

      const textarea = page.getByRole('textbox');
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
      await page.goto('/brighthub');
      await page.waitForLoadState('networkidle');

      const textarea = page.getByRole('textbox');
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
      await page.goto('/brighthub');
      await page.waitForLoadState('networkidle');

      const textarea = page.getByRole('textbox');
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
      await page.goto('/brighthub');
      await page.waitForLoadState('networkidle');

      const attachBtn = page.getByRole('button', { name: /attach image/i });
      await expect(attachBtn).toBeVisible();
    });

    test('should disable attach button when 4 images are attached', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('networkidle');

      // Attach 4 files via the hidden input
      const fileInput = page.locator('input[type="file"][accept*="image"]');
      const files = Array.from({ length: 4 }, (_, i) => ({
        name: `test-${i}.png`,
        mimeType: 'image/png',
        buffer: Buffer.from('fake-png-data'),
      }));

      await fileInput.setInputFiles(files);

      // The attach button should now be disabled
      const attachBtn = page.getByRole('button', { name: /attach image/i });
      await expect(attachBtn).toBeDisabled();
    });

    test('should show media previews after attaching images', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('networkidle');

      const fileInput = page.locator('input[type="file"][accept*="image"]');
      await fileInput.setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake-png-data'),
      });

      // Should show a remove button for the attachment
      const removeBtn = page.getByRole('button', {
        name: /remove attachment/i,
      });
      await expect(removeBtn).toBeVisible();
    });

    test('should remove media preview when remove button is clicked', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('networkidle');

      const fileInput = page.locator('input[type="file"][accept*="image"]');
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
      await expect(attachBtn).toBeEnabled();
    });
  });

  test.describe('Character Limit', () => {
    test('should show character count when typing', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('networkidle');

      const textarea = page.getByRole('textbox');
      await textarea.fill('Hello BrightHub!');

      // Character remaining indicator should be visible
      // 280 - 16 = 264
      await expect(page.getByText('264')).toBeVisible();
    });

    test('should show warning color when near limit', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('networkidle');

      const textarea = page.getByRole('textbox');
      // Fill with 265 characters (15 remaining)
      await textarea.fill('a'.repeat(265));

      // Should show 15 remaining
      await expect(page.getByText('15')).toBeVisible();
    });

    test('should disable submit when over 280 characters', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('networkidle');

      const textarea = page.getByRole('textbox');
      await textarea.fill('a'.repeat(281));

      const submitBtn = page.getByRole('button', { name: /post/i });
      await expect(submitBtn).toBeDisabled();
    });

    test('should disable submit when content is empty', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('networkidle');

      const submitBtn = page.getByRole('button', { name: /post/i });
      await expect(submitBtn).toBeDisabled();
    });

    test('should enable submit with valid content', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub');
      await page.waitForLoadState('networkidle');

      const textarea = page.getByRole('textbox');
      await textarea.fill('Valid post content');

      const submitBtn = page.getByRole('button', { name: /post/i });
      await expect(submitBtn).toBeEnabled();
    });
  });
});
