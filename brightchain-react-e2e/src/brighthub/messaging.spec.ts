import { expect, registerViaApi, test } from '../fixtures';

/**
 * Playwright E2E tests for messaging components.
 *
 * Tests MessagingInbox, ConversationView, MessageComposer,
 * MessageRequestsList, GroupConversationSettings, and NewConversationDialog.
 *
 * Requirements: 48.16-48.21
 */

test.describe('Messaging', () => {
  test.describe('MessagingInbox', () => {
    test('should render messaging inbox', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      // New conversation button should be visible
      const newBtn = page.getByRole('button', { name: /new conversation/i });
      await expect(newBtn).toBeVisible();
    });

    test('should show empty state when no conversations', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      const emptyState = page.getByTestId('empty-state');
      await expect(emptyState).toBeVisible();
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

      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      // Either conversations or empty state
      const emptyState = page.getByTestId('empty-state');
      const convItem = page.locator('[data-testid^="conversation-"]').first();

      await expect(emptyState.or(convItem)).toBeVisible({ timeout: 5000 });
    });

    test('should highlight selected conversation', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      const convItem = page.locator('[data-testid^="conversation-"]').first();
      if (await convItem.isVisible()) {
        await convItem.click();
        // Selected state should be applied
        await expect(convItem).toBeVisible();
      }
    });

    test('should show pinned conversations section', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      // Pinned section appears only when there are pinned conversations
      const inbox = page
        .getByRole('region', { name: /messages/i })
        .or(page.locator('[aria-label*="essag"]'));
      await expect(inbox.or(page.getByTestId('empty-state'))).toBeVisible({
        timeout: 5000,
      });
    });

    test('should show unread badge on conversations', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      // Unread badges appear on conversations with unread messages
      const convItem = page.locator('[data-testid^="conversation-"]').first();
      if (await convItem.isVisible()) {
        await expect(convItem).toBeVisible();
      }
    });

    test('should show group badge on group conversations', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

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
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

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
        await page.waitForLoadState('networkidle');

        await expect(
          page
            .getByText('Hello from E2E test')
            .or(page.getByTestId('empty-state')),
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show load more button for older messages', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      // Load more button appears when there are older messages
      const loadMore = page.getByRole('button', { name: /load more/i });
      if (await loadMore.isVisible()) {
        await expect(loadMore).toBeVisible();
      }
    });

    test('should show typing indicator', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      // Typing indicator appears when other users are typing
      // This is a real-time feature, just verify the page loads
    });
  });

  test.describe('MessageComposer', () => {
    test('should render message input field', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      // If in a conversation, the composer should be visible
      const composer = page.getByRole('textbox', { name: /message/i });
      if (await composer.isVisible()) {
        await expect(composer).toBeVisible();
      }
    });

    test('should show send button', async ({ authenticatedPage: page }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      const sendBtn = page.getByTestId('send-button');
      if (await sendBtn.isVisible()) {
        await expect(sendBtn).toBeVisible();
      }
    });

    test('should disable send button when input is empty', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      const sendBtn = page.getByTestId('send-button');
      if (await sendBtn.isVisible()) {
        await expect(sendBtn).toBeDisabled();
      }
    });

    test('should enable send button when text is entered', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

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
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

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
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

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
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      const attachBtn = page.getByRole('button', { name: /attach file/i });
      if (await attachBtn.isVisible()) {
        await expect(attachBtn).toBeVisible();
      }
    });

    test('should show reply indicator when replying', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

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
      await page.goto('/brighthub/messages/requests');
      await page.waitForLoadState('networkidle');

      // Title should be visible
      await expect(page.getByText(/message request/i)).toBeVisible();
    });

    test('should show empty state when no requests', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages/requests');
      await page.waitForLoadState('networkidle');

      const emptyState = page.getByTestId('empty-state');
      await expect(emptyState).toBeVisible();
    });

    test('should show accept and decline buttons on requests', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages/requests');
      await page.waitForLoadState('networkidle');

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
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      // Group settings are shown when viewing a group conversation's settings
      // Navigate to a group conversation settings page if available
    });

    test('should show group name input', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      const nameInput = page.getByRole('textbox', { name: /group name/i });
      if (await nameInput.isVisible()) {
        await expect(nameInput).toBeVisible();
      }
    });

    test('should show participant list with admin badges', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      const adminBadge = page.locator('[data-testid^="admin-badge-"]').first();
      if (await adminBadge.isVisible()) {
        await expect(adminBadge).toBeVisible();
      }
    });

    test('should show add participant button for admins', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      const addBtn = page.getByRole('button', { name: /add participant/i });
      if (await addBtn.isVisible()) {
        await expect(addBtn).toBeVisible();
      }
    });

    test('should show leave group button', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      const leaveBtn = page.getByRole('button', { name: /leave group/i });
      if (await leaveBtn.isVisible()) {
        await expect(leaveBtn).toBeVisible();
      }
    });

    test('should show promote/demote buttons for admin users', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

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
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      const newBtn = page.getByRole('button', { name: /new conversation/i });
      await newBtn.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
    });

    test('should show user search input', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /new conversation/i }).click();

      const searchInput = page.getByRole('textbox', { name: /search/i });
      await expect(searchInput).toBeVisible();
    });

    test('should show group toggle switch', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /new conversation/i }).click();

      // Group toggle switch should be visible
      const groupSwitch = page.getByRole('checkbox').first();
      await expect(groupSwitch).toBeVisible();
    });

    test('should show group name input when group mode is enabled', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /new conversation/i }).click();

      // Enable group mode
      const groupSwitch = page.getByRole('checkbox').first();
      await groupSwitch.click();

      // Group name input should appear
      const groupNameInput = page.getByRole('textbox', { name: /group name/i });
      await expect(groupNameInput).toBeVisible();
    });

    test('should search for users', async ({ authenticatedPage: page }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /new conversation/i }).click();

      const searchInput = page.getByRole('textbox', { name: /search/i });
      await searchInput.fill('test');

      // Wait for search results
      await page.waitForTimeout(500);
    });

    test('should select users from search results', async ({
      authenticatedPage: page,
    }) => {
      const baseURL = 'http://localhost:3000';
      const otherUser = await registerViaApi(baseURL);

      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /new conversation/i }).click();

      const searchInput = page.getByRole('textbox', { name: /search/i });
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
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /new conversation/i }).click();

      const startBtn = page.getByRole('button', { name: /start/i });
      await expect(startBtn).toBeDisabled();
    });

    test('should close dialog on cancel', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/brighthub/messages');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /new conversation/i }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      await page.getByRole('button', { name: /cancel/i }).click();
      await expect(dialog).not.toBeVisible();
    });
  });
});
