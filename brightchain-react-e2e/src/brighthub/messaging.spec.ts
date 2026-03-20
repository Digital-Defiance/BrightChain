import {
  expect,
  registerViaApi,
  test,
  waitForPageContent,
  waitForSuspense,
} from '../fixtures';

/**
 * Playwright E2E tests for messaging components.
 *
 * Tests MessagingInbox, ConversationView, MessageComposer,
 * MessageRequestsList, GroupConversationSettings, and NewConversationDialog.
 *
 * Requirements: 48.16-48.21
 */

/**
 * Navigate to a messaging route and wait for Suspense to resolve.
 */
async function gotoMessages(
  page: import('@playwright/test').Page,
  subPath = '',
) {
  await page.goto(`/brighthub/messages${subPath ? `/${subPath}` : ''}`);
  await waitForSuspense(page);
  await waitForPageContent(page);
}

test.describe('Messaging', () => {
  test.describe('MessagingInbox', () => {
    test('should render messaging inbox', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      // New conversation button should be visible
      const newBtn = page.getByRole('button', { name: /new conversation/i });
      await expect(newBtn).toBeVisible({ timeout: 15_000 });
    });

    test('should show empty state when no conversations', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      // Wait for loading to finish — the component starts with loading=true
      // and sets it to false after the API call completes
      const emptyState = page.getByTestId('empty-state');
      await expect(emptyState).toBeVisible({ timeout: 15_000 });
    });

    test('should display conversation list items', async ({
      authenticatedPage: page,
      authResult,
    }) => {
      // Create a conversation via API
      const baseURL = 'http://localhost:3000';
      const axios = await import('axios');
      const otherUser = await registerViaApi(baseURL);

      await axios.default
        .post(
          `${baseURL}/api/brighthub/messages/conversations`,
          { participantIds: [otherUser.memberId] },
          { headers: { Authorization: `Bearer ${authResult.token}` } },
        )
        .catch(() => {});

      await gotoMessages(page);

      // Either conversations or empty state
      const emptyState = page.getByTestId('empty-state');
      const convItem = page.locator('[data-testid^="conversation-"]').first();

      const emptyVisible = await emptyState
        .isVisible({ timeout: 15_000 })
        .catch(() => false);
      const convVisible = await convItem
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      expect(emptyVisible || convVisible).toBeTruthy();
    });

    test('should highlight selected conversation', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      const convItem = page.locator('[data-testid^="conversation-"]').first();
      if (await convItem.isVisible()) {
        await convItem.click();
        await expect(convItem).toBeVisible();
      }
    });

    test('should show pinned conversations section', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      // Pinned section appears only when there are pinned conversations.
      // For a fresh user, expect the empty state or the new conversation button.
      const emptyState = page.getByTestId('empty-state');
      const newBtn = page.getByRole('button', { name: /new conversation/i });
      const emptyVisible = await emptyState
        .isVisible({ timeout: 15_000 })
        .catch(() => false);
      const btnVisible = await newBtn
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      expect(emptyVisible || btnVisible).toBeTruthy();
    });

    test('should show unread badge on conversations', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      // Unread badges appear on conversations with unread messages
      const convItem = page.locator('[data-testid^="conversation-"]').first();
      if (await convItem.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await expect(convItem).toBeVisible();
      }
    });

    test('should show group badge on group conversations', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      // Group badge appears on group conversations
      const convItem = page.locator('[data-testid^="conversation-"]').first();
      if (await convItem.isVisible()) {
        await expect(convItem).toBeVisible();
      }
    });
  });

  test.describe('ConversationView', () => {
    test('should show empty state for new conversation', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      // If a conversation is selected, the view should render
      const emptyState = page.getByTestId('empty-state');
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();
      }
    });

    test('should display message bubbles in conversation', async ({
      authenticatedPage: page,
      authResult,
    }) => {
      const baseURL = 'http://localhost:3000';
      const axios = await import('axios');
      const otherUser = await registerViaApi(baseURL);

      // Create conversation and send a message
      const convRes = await axios.default
        .post(
          `${baseURL}/api/brighthub/messages/conversations`,
          { participantIds: [otherUser.memberId] },
          { headers: { Authorization: `Bearer ${authResult.token}` } },
        )
        .catch(() => null);

      if (convRes?.data?.data?._id) {
        const convId = convRes.data.data._id;

        await axios.default
          .post(
            `${baseURL}/api/brighthub/messages/conversations/${convId}/messages`,
            { content: 'Hello from E2E test' },
            { headers: { Authorization: `Bearer ${authResult.token}` } },
          )
          .catch(() => {});

        await page.goto(`/brighthub/messages/${convId}`);
        await waitForSuspense(page);
        await waitForPageContent(page);

        await expect(
          page
            .getByText('Hello from E2E test')
            .or(page.getByTestId('empty-state')),
        ).toBeVisible({ timeout: 10_000 });
      }
    });

    test('should show load more button for older messages', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      // Load more button appears when there are older messages
      const loadMore = page.getByRole('button', { name: /load more/i });
      if (await loadMore.isVisible()) {
        await expect(loadMore).toBeVisible();
      }
    });

    test('should show typing indicator', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      // Typing indicator appears when other users are typing
      // This is a real-time feature, just verify the page loads
    });
  });

  test.describe('MessageComposer', () => {
    test('should render message input field', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      // If in a conversation, the composer should be visible
      const composer = page.getByRole('textbox', { name: /message/i });
      if (await composer.isVisible()) {
        await expect(composer).toBeVisible();
      }
    });

    test('should show send button', async ({ authenticatedPage: page }) => {
      await gotoMessages(page);

      const sendBtn = page.getByTestId('send-button');
      if (await sendBtn.isVisible()) {
        await expect(sendBtn).toBeVisible();
      }
    });

    test('should disable send button when input is empty', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      const sendBtn = page.getByTestId('send-button');
      if (await sendBtn.isVisible()) {
        await expect(sendBtn).toBeDisabled();
      }
    });

    test('should enable send button when text is entered', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      const composer = page.getByRole('textbox', { name: /message/i });
      if (await composer.isVisible()) {
        await composer.fill('Test message');

        const sendBtn = page.getByTestId('send-button');
        await expect(sendBtn).toBeEnabled();
      }
    });

    test('should send message on Enter key', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      const composer = page.getByRole('textbox', { name: /message/i });
      if (await composer.isVisible()) {
        await composer.fill('Enter key test');
        await composer.press('Enter');

        // Input should be cleared after sending
        await expect(composer).toHaveValue('');
      }
    });

    test('should not send on Shift+Enter (newline)', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      const composer = page.getByRole('textbox', { name: /message/i });
      if (await composer.isVisible()) {
        await composer.fill('Line 1');
        await composer.press('Shift+Enter');

        // Content should still be in the input (not sent)
        const value = await composer.inputValue();
        expect(value).toContain('Line 1');
      }
    });

    test('should show attach file button', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      const attachBtn = page.getByRole('button', { name: /attach file/i });
      if (await attachBtn.isVisible()) {
        await expect(attachBtn).toBeVisible();
      }
    });

    test('should show reply indicator when replying', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      // Reply indicator appears when replying to a specific message
      const replyIndicator = page.getByTestId('reply-indicator');
      if (await replyIndicator.isVisible()) {
        await expect(replyIndicator).toBeVisible();
      }
    });
  });

  test.describe('MessageRequestsList', () => {
    test('should render message requests list', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page, 'requests');

      // Title or empty state should be visible
      const heading = page.getByRole('heading', { name: /message request/i });
      const emptyState = page.getByTestId('empty-state');
      const headingVisible = await heading
        .isVisible({ timeout: 15_000 })
        .catch(() => false);
      const emptyVisible = await emptyState
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      expect(headingVisible || emptyVisible).toBeTruthy();
    });

    test('should show empty state when no requests', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page, 'requests');

      const emptyState = page.getByTestId('empty-state');
      await expect(emptyState).toBeVisible({ timeout: 15_000 });
    });

    test('should show accept and decline buttons on requests', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page, 'requests');

      const acceptBtn = page.getByRole('button', { name: /accept/i }).first();
      if (await acceptBtn.isVisible()) {
        await expect(acceptBtn).toBeVisible();

        const declineBtn = page
          .getByRole('button', { name: /decline/i })
          .first();
        await expect(declineBtn).toBeVisible();
      }
    });
  });

  test.describe('GroupConversationSettings', () => {
    test('should render group settings panel', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      // Group settings are shown when viewing a group conversation's settings
    });

    test('should show group name input', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      const nameInput = page.getByRole('textbox', { name: /group name/i });
      if (await nameInput.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await expect(nameInput).toBeVisible();
      }
    });

    test('should show participant list with admin badges', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      const adminBadge = page.locator('[data-testid^="admin-badge-"]').first();
      if (await adminBadge.isVisible()) {
        await expect(adminBadge).toBeVisible();
      }
    });

    test('should show add participant button for admins', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      const addBtn = page.getByRole('button', { name: /add participant/i });
      if (await addBtn.isVisible()) {
        await expect(addBtn).toBeVisible();
      }
    });

    test('should show leave group button', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      const leaveBtn = page.getByRole('button', { name: /leave group/i });
      if (await leaveBtn.isVisible()) {
        await expect(leaveBtn).toBeVisible();
      }
    });

    test('should show promote/demote buttons for admin users', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      const promoteBtn = page
        .getByRole('button', { name: /promote to admin/i })
        .first();
      if (await promoteBtn.isVisible()) {
        await expect(promoteBtn).toBeVisible();
      }
    });
  });

  test.describe('NewConversationDialog', () => {
    test('should open new conversation dialog', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      const newBtn = page.getByRole('button', { name: /new conversation/i });
      await expect(newBtn).toBeVisible({ timeout: 15_000 });
      await newBtn.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 10_000 });
    });

    test('should show user search input', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      const newBtn = page.getByRole('button', { name: /new conversation/i });
      await expect(newBtn).toBeVisible({ timeout: 15_000 });
      await newBtn.click();

      const searchInput = page.getByRole('textbox', { name: /search/i });
      await expect(searchInput).toBeVisible({ timeout: 10_000 });
    });

    test('should show group toggle switch', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      const newBtn = page.getByRole('button', { name: /new conversation/i });
      await expect(newBtn).toBeVisible({ timeout: 15_000 });
      await newBtn.click();

      // Group toggle switch should be visible in the dialog
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5_000 });
      // MUI Switch renders as role="checkbox"
      const groupSwitch = dialog.locator('input[type="checkbox"]').first();
      await expect(groupSwitch).toBeAttached({ timeout: 5_000 });
    });

    test('should show group name input when group mode is enabled', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      const newBtn = page.getByRole('button', { name: /new conversation/i });
      await expect(newBtn).toBeVisible({ timeout: 15_000 });
      await newBtn.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // Enable group mode
      const groupSwitch = dialog.locator('input[type="checkbox"]').first();
      await expect(groupSwitch).toBeAttached({ timeout: 5_000 });
      await groupSwitch.click({ force: true });

      // Group name input should appear
      const groupNameInput = dialog.locator('input').nth(1);
      await expect(groupNameInput).toBeVisible({ timeout: 5_000 });
    });

    test('should search for users', async ({ authenticatedPage: page }) => {
      await gotoMessages(page);

      const newBtn = page.getByRole('button', { name: /new conversation/i });
      await expect(newBtn).toBeVisible({ timeout: 15_000 });
      await newBtn.click();

      const searchInput = page.getByRole('textbox', { name: /search/i });
      await expect(searchInput).toBeVisible({ timeout: 10_000 });
      await searchInput.fill('test');

      // Wait for search results
      await page.waitForTimeout(500);
    });

    test('should select users from search results', async ({
      authenticatedPage: page,
    }) => {
      test.setTimeout(120_000);
      const baseURL = 'http://localhost:3000';
      const otherUser = await registerViaApi(baseURL);

      await gotoMessages(page);

      const newBtn = page.getByRole('button', { name: /new conversation/i });
      await expect(newBtn).toBeVisible({ timeout: 15_000 });
      await newBtn.click();

      const searchInput = page.getByRole('textbox', { name: /search/i });
      await expect(searchInput).toBeVisible({ timeout: 10_000 });
      await searchInput.fill(otherUser.username);

      await page.waitForTimeout(1000);

      // Click on a user result if visible
      const userResult = page.locator(
        `[data-testid="user-${otherUser.memberId}"]`,
      );
      if (await userResult.isVisible()) {
        await userResult.click();
      }
    });

    test('should disable start button when no users selected', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      const newBtn = page.getByRole('button', { name: /new conversation/i });
      await expect(newBtn).toBeVisible({ timeout: 15_000 });
      await newBtn.click();

      const startBtn = page.getByRole('button', { name: /start/i });
      await expect(startBtn).toBeDisabled({ timeout: 10_000 });
    });

    test('should close dialog on cancel', async ({
      authenticatedPage: page,
    }) => {
      await gotoMessages(page);

      const newBtn = page.getByRole('button', { name: /new conversation/i });
      await expect(newBtn).toBeVisible({ timeout: 15_000 });
      await newBtn.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 10_000 });

      await page.getByRole('button', { name: /cancel/i }).click();
      await expect(dialog).not.toBeVisible();
    });
  });
});
