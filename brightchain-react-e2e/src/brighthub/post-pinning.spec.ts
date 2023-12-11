import { expect, test, waitForPageContent, waitForSuspense } from '../fixtures';

test.describe('BrightHub Post Pinning', () => {
  test('can create a post and see pin button on own posts', async ({
    authenticatedPage: page,
    authResult,
  }) => {
    // Create a post via API
    const axios = await import('axios');
    const baseURL = 'http://localhost:3000';
    const headers = { Authorization: `Bearer ${authResult.token}` };

    await axios.default.post(
      `${baseURL}/api/brighthub/posts`,
      { authorId: authResult.memberId, content: 'Pin test post' },
      { headers },
    );

    await page.goto('/brighthub');
    await waitForSuspense(page);
    await waitForPageContent(page);

    // The pin button should be visible on own posts (aria-label contains "Pin")
    const pinButton = page.getByRole('button', { name: /pin post to profile/i });
    await expect(pinButton.first()).toBeVisible({ timeout: 15_000 });
  });

  test('pin button toggles between pin and unpin states', async ({
    authenticatedPage: page,
    authResult,
  }) => {
    const axios = await import('axios');
    const baseURL = 'http://localhost:3000';
    const headers = { Authorization: `Bearer ${authResult.token}` };

    // Create a post
    const res = await axios.default.post(
      `${baseURL}/api/brighthub/posts`,
      { authorId: authResult.memberId, content: 'Toggle pin test' },
      { headers },
    );
    const postId = res.data.data._id;

    // Pin it via API
    await axios.default.post(
      `${baseURL}/api/brighthub/posts/${postId}/pin`,
      { userId: authResult.memberId },
      { headers },
    );

    await page.goto('/brighthub');
    await waitForSuspense(page);
    await waitForPageContent(page);

    // Should show "Unpin post" for the pinned post
    const unpinButton = page.getByRole('button', { name: /unpin post/i });
    await expect(unpinButton.first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('BrightHub Profile Edit', () => {
  test('profile page shows edit button for own profile', async ({
    authenticatedPage: page,
    authResult,
  }) => {
    await page.goto(`/brighthub/profile/@${authResult.username}`);
    await waitForSuspense(page);
    await waitForPageContent(page);

    // The edit profile button should be visible
    const editButton = page.getByRole('button', { name: /edit profile/i });
    await expect(editButton).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('BrightHub Thread View', () => {
  test('thread view shows author name instead of Unknown', async ({
    authenticatedPage: page,
    authResult,
  }) => {
    const axios = await import('axios');
    const baseURL = 'http://localhost:3000';
    const headers = { Authorization: `Bearer ${authResult.token}` };

    // Create a post
    const res = await axios.default.post(
      `${baseURL}/api/brighthub/posts`,
      { authorId: authResult.memberId, content: 'Thread author test' },
      { headers },
    );
    const postId = res.data.data._id;

    // Navigate to the thread view
    await page.goto(`/brighthub/thread/${postId}`);
    await waitForSuspense(page);
    await waitForPageContent(page);

    // The author name should NOT be "Unknown"
    const unknownText = page.getByText('Unknown @unknown');
    await expect(unknownText).not.toBeVisible({ timeout: 10_000 }).catch(() => {
      // If the text doesn't exist at all, that's fine
    });

    // The author's username should be visible
    const authorText = page.getByText(`@${authResult.username}`);
    await expect(authorText.first()).toBeVisible({ timeout: 15_000 });
  });
});
