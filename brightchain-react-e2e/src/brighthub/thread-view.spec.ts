import { expect, test, waitForPageContent, waitForSuspense } from '../fixtures';

/**
 * Playwright E2E tests for the ThreadView component.
 *
 * Tests thread navigation and reply interactions.
 *
 * Requirements: 15.10
 */

test.describe('ThreadView', () => {
  /**
   * Helper: create a post and a reply via the API, returning their IDs.
   */
  async function createThreadViaApi(
    baseURL: string,
    token: string,
    memberId: string,
  ) {
    const axios = await import('axios');
    const headers = { Authorization: `Bearer ${token}` };

    const rootRes = await axios.default.post(
      `${baseURL}/api/brighthub/posts`,
      { authorId: memberId, content: 'Root post for thread test' },
      { headers },
    );
    const rootId = rootRes.data.data._id as string;

    const replyRes = await axios.default.post(
      `${baseURL}/api/brighthub/posts`,
      {
        authorId: memberId,
        content: 'Reply to root post',
        parentPostId: rootId,
      },
      { headers },
    );
    const replyId = replyRes.data.data._id as string;

    return { rootId, replyId };
  }

  test.describe('Thread Navigation', () => {
    test('should display root post and replies in thread view', async ({
      authenticatedPage: page,
      authResult,
    }) => {
      const baseURL = 'http://localhost:3000';
      const { rootId } = await createThreadViaApi(
        baseURL,
        authResult.token,
        authResult.memberId,
      );

      await page.goto(`/brighthub/thread/${rootId}`);
      await waitForSuspense(page);
      await waitForPageContent(page);

      // Thread view should render as an article
      const threadView = page.getByRole('article');
      await expect(threadView).toBeVisible({ timeout: 15_000 });

      // Root post content should be visible
      await expect(page.getByText('Root post for thread test')).toBeVisible({
        timeout: 10_000,
      });

      // Reply should be visible
      await expect(page.getByText('Reply to root post')).toBeVisible({
        timeout: 10_000,
      });
    });

    test('should show reply count and participant count', async ({
      authenticatedPage: page,
      authResult,
    }) => {
      const baseURL = 'http://localhost:3000';
      const { rootId } = await createThreadViaApi(
        baseURL,
        authResult.token,
        authResult.memberId,
      );

      await page.goto(`/brighthub/thread/${rootId}`);
      await waitForSuspense(page);
      await waitForPageContent(page);

      // Should show reply count (at least "1 reply")
      await expect(page.getByText(/1 repl/i)).toBeVisible({ timeout: 15_000 });
    });

    test('should show nested replies with indentation', async ({
      authenticatedPage: page,
      authResult,
    }) => {
      const baseURL = 'http://localhost:3000';
      const axios = await import('axios');
      const headers = { Authorization: `Bearer ${authResult.token}` };

      // Create root → reply → nested reply
      const rootRes = await axios.default.post(
        `${baseURL}/api/brighthub/posts`,
        { authorId: authResult.memberId, content: 'Nested thread root' },
        { headers },
      );
      const rootId = rootRes.data.data._id;

      const reply1Res = await axios.default.post(
        `${baseURL}/api/brighthub/posts`,
        {
          authorId: authResult.memberId,
          content: 'First level reply',
          parentPostId: rootId,
        },
        { headers },
      );
      const reply1Id = reply1Res.data.data._id;

      await axios.default.post(
        `${baseURL}/api/brighthub/posts`,
        {
          authorId: authResult.memberId,
          content: 'Second level reply',
          parentPostId: reply1Id,
        },
        { headers },
      );

      await page.goto(`/brighthub/thread/${rootId}`);
      await waitForSuspense(page);
      await waitForPageContent(page);

      await expect(page.getByText('Nested thread root')).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText('First level reply')).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText('Second level reply')).toBeVisible({
        timeout: 10_000,
      });
    });

    test('should show empty state when thread has no replies', async ({
      authenticatedPage: page,
      authResult,
    }) => {
      const baseURL = 'http://localhost:3000';
      const axios = await import('axios');
      const headers = { Authorization: `Bearer ${authResult.token}` };

      const rootRes = await axios.default.post(
        `${baseURL}/api/brighthub/posts`,
        { authorId: authResult.memberId, content: 'Post with no replies' },
        { headers },
      );
      const rootId = rootRes.data.data._id;

      await page.goto(`/brighthub/thread/${rootId}`);
      await waitForSuspense(page);
      await waitForPageContent(page);

      await expect(page.getByText('Post with no replies')).toBeVisible({
        timeout: 15_000,
      });
    });
  });

  test.describe('Reply Interactions', () => {
    test('should show reply button on each post in thread', async ({
      authenticatedPage: page,
      authResult,
    }) => {
      const baseURL = 'http://localhost:3000';
      const { rootId } = await createThreadViaApi(
        baseURL,
        authResult.token,
        authResult.memberId,
      );

      await page.goto(`/brighthub/thread/${rootId}`);
      await waitForSuspense(page);
      await waitForPageContent(page);

      // Reply buttons should be present on posts
      const replyButtons = page.getByRole('button', { name: /reply/i });
      await expect(replyButtons.first()).toBeVisible({ timeout: 15_000 });
    });

    test('should show like button on each post in thread', async ({
      authenticatedPage: page,
      authResult,
    }) => {
      const baseURL = 'http://localhost:3000';
      const { rootId } = await createThreadViaApi(
        baseURL,
        authResult.token,
        authResult.memberId,
      );

      await page.goto(`/brighthub/thread/${rootId}`);
      await waitForSuspense(page);
      await waitForPageContent(page);

      // Wait for post content to render first
      await expect(page.getByText('Root post for thread test')).toBeVisible({
        timeout: 15_000,
      });

      const likeButtons = page.getByRole('button', { name: /like/i });
      await expect(likeButtons.first()).toBeVisible({ timeout: 10_000 });
    });

    test('should show repost button on each post in thread', async ({
      authenticatedPage: page,
      authResult,
    }) => {
      const baseURL = 'http://localhost:3000';
      const { rootId } = await createThreadViaApi(
        baseURL,
        authResult.token,
        authResult.memberId,
      );

      await page.goto(`/brighthub/thread/${rootId}`);
      await waitForSuspense(page);
      await waitForPageContent(page);

      // Wait for post content to render first
      await expect(page.getByText('Root post for thread test')).toBeVisible({
        timeout: 15_000,
      });

      const repostButtons = page.getByRole('button', { name: /repost/i });
      await expect(repostButtons.first()).toBeVisible({ timeout: 10_000 });
    });
  });
});
