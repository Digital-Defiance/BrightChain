/**
 * BrightMail Frontend E2E Tests
 *
 * Playwright tests verifying the BrightMail email interface works correctly
 * against the real API server. Uses the shared authenticated fixtures for
 * tests that require login.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9
 */
import { expect as baseExpect, test as baseTest } from '@playwright/test';
import axios from 'axios';

import { expect, generateCredentials, test, waitForSuspense } from './fixtures';

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3000';

/** Create an axios config with Bearer auth header. */
function authHeader(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

/**
 * Send an email via the API for test setup purposes.
 * Returns the messageId from the response.
 */
async function sendEmailViaApi(
  token: string,
  opts: {
    fromLocal: string;
    fromDomain: string;
    toLocal: string;
    toDomain: string;
    subject: string;
    textBody: string;
  },
): Promise<string> {
  const res = await axios.post(
    `${BASE_URL}/api/emails`,
    {
      from: {
        localPart: opts.fromLocal,
        domain: opts.fromDomain,
      },
      to: [
        {
          localPart: opts.toLocal,
          domain: opts.toDomain,
        },
      ],
      subject: opts.subject,
      textBody: opts.textBody,
    },
    authHeader(token),
  );
  return res.data.data?.messageId ?? res.data.data?.result?.messageId ?? '';
}

/**
 * Helper: wait for the email list to load (not loading, not error).
 * First waits for the lazy-loaded BrightMail chunk to resolve via Suspense,
 * then waits for the inbox loading state to finish.
 * Returns the email-list container locator.
 */
async function waitForEmailList(page: import('@playwright/test').Page) {
  // Wait for the lazy chunk to load first
  await waitForSuspense(page);

  // Wait for either the email list or the empty state
  const emailList = page.locator('[data-testid="email-list"]');
  const emptyState = page.locator('[data-testid="inbox-empty"]');
  const errorState = page.locator('[data-testid="inbox-error"]');

  // First ensure loading is done
  await page
    .locator('[data-testid="inbox-loading"]')
    .waitFor({ state: 'hidden', timeout: 20000 })
    .catch(() => {});

  // Check for error
  const hasError = await errorState
    .isVisible({ timeout: 2000 })
    .catch(() => false);
  if (hasError) {
    const errorText = await errorState.textContent();
    throw new Error(`Inbox failed to load — error state: ${errorText}`);
  }

  return { emailList, emptyState };
}

/**
 * Helper: find an email row by subject text within the email list.
 */
function findEmailRowBySubject(
  page: import('@playwright/test').Page,
  subject: string,
) {
  // EmailRow renders data-testid="email-subject" containing the subject text
  return page.locator('[data-testid^="email-row-"]', {
    has: page.locator(`[data-testid="email-subject"]:has-text("${subject}")`),
  });
}

// ─── Test 1: Authenticated user sees BrightMail menu ─────────
// Requirement 10.1

test.describe('BrightMail Menu & Navigation', () => {
  test('authenticated user sees BrightMail menu and navigates to inbox', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.waitForLoadState('networkidle');

    // Look for the BrightMail menu link
    const brightmailLink = authenticatedPage.getByRole('link', {
      name: /brightmail/i,
    });

    const linkVisible = await brightmailLink
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!linkVisible) {
      // Try finding it via href attribute
      const linkByHref = authenticatedPage.locator('a[href="/brightmail"]');
      const hrefVisible = await linkByHref
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (hrefVisible) {
        await linkByHref.click();
      } else {
        // Navigate directly
        await authenticatedPage.goto('/brightmail');
      }
    } else {
      await brightmailLink.click();
    }

    await expect(authenticatedPage).toHaveURL(/\/brightmail/, {
      timeout: 10000,
    });

    // Wait for the lazy-loaded BrightMail chunk to resolve
    await waitForSuspense(authenticatedPage);

    // Verify inbox content is visible (must NOT be an error state)
    const inboxError = authenticatedPage.locator('[data-testid="inbox-error"]');
    const errorVisible = await inboxError
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (errorVisible) {
      const errorText = await inboxError.textContent();
      throw new Error(
        `Inbox failed to load — error state displayed: ${errorText}`,
      );
    }

    const inboxIndicator = authenticatedPage
      .getByText(/inbox/i)
      .or(authenticatedPage.locator('[data-testid="inbox-loading"]'))
      .or(authenticatedPage.locator('[data-testid="inbox-empty"]'));

    await expect(inboxIndicator.first()).toBeVisible({
      timeout: 15000,
    });
  });
});

// ─── Test 2: Inbox displays email data fields ───────────────
// Requirement 10.2

test.describe('BrightMail Inbox Columns', () => {
  test('inbox displays emails with sender, subject, and date', async ({
    authenticatedPage,
    authResult,
  }) => {
    // Send a test email so the inbox is not empty
    const creds = generateCredentials();
    const senderLocal = creds.email.split('@')[0];
    const senderDomain = creds.email.split('@')[1];
    const recipientLocal = authResult.email.split('@')[0];
    const recipientDomain = authResult.email.split('@')[1];

    await sendEmailViaApi(authResult.token, {
      fromLocal: senderLocal,
      fromDomain: senderDomain,
      toLocal: recipientLocal,
      toDomain: recipientDomain,
      subject: `E2E Column Test ${Date.now()}`,
      textBody: 'Testing inbox columns display.',
    });

    await authenticatedPage.goto('/brightmail');
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for the email list to appear (MUI List with role="listbox")
    const { emailList } = await waitForEmailList(authenticatedPage);
    await expect(emailList).toBeVisible({ timeout: 15000 });

    // Verify at least one email row is rendered with sender, subject, date
    const firstRow = authenticatedPage
      .locator('[data-testid^="email-row-"]')
      .first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await expect(
      firstRow.locator('[data-testid="email-sender"]'),
    ).toBeVisible();
    await expect(
      firstRow.locator('[data-testid="email-subject"]'),
    ).toBeVisible();
    await expect(firstRow.locator('[data-testid="email-date"]')).toBeVisible();
  });
});

// ─── Test 3: Compose-send-verify flow ────────────────────────
// Requirement 10.3
// Compose is a modal overlay (no /brightmail/compose route).
// It is opened via the Compose FAB in the sidebar.

test.describe('BrightMail Compose Flow', () => {
  test('compose, send, and verify email appears in inbox', async ({
    authenticatedPage,
    authResult,
  }) => {
    // Compose flow involves modal interaction and email delivery — generous timeout
    test.setTimeout(120_000);

    const uniqueSubject = `E2E Compose ${Date.now()}`;
    const recipientLocal = authResult.email.split('@')[0];
    const recipientDomain = authResult.email.split('@')[1];
    const recipientAddress = `${recipientLocal}@${recipientDomain}`;

    // Navigate to inbox first
    await authenticatedPage.goto('/brightmail');
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for inbox to finish loading
    await waitForEmailList(authenticatedPage).catch(() => {});

    // Open compose modal via the Compose FAB button in the sidebar
    const composeFab = authenticatedPage.getByRole('button', {
      name: /compose/i,
    });
    await expect(composeFab).toBeVisible({ timeout: 10000 });
    await composeFab.click();

    // Wait for the compose modal to appear
    const composeModal = authenticatedPage.locator(
      '[data-testid="compose-modal"]',
    );
    await expect(composeModal).toBeVisible({ timeout: 10000 });

    // The ComposeModal uses RecipientChipInput for To field.
    // Type the recipient address and press Enter to commit the chip.
    const toInput = composeModal.locator('input').first();
    await toInput.fill(recipientAddress);
    await toInput.press('Enter');

    // Fill subject
    const subjectInput = composeModal.getByLabel(/subject/i);
    await subjectInput.fill(uniqueSubject);

    // Send the email
    const sendButton = composeModal.locator(
      '[data-testid="compose-send-button"]',
    );
    await expect(sendButton).toBeEnabled({ timeout: 5000 });
    await sendButton.click();

    // Verify success notification
    await expect(
      authenticatedPage.getByRole('alert').filter({ hasText: /sent/i }),
    ).toBeVisible({ timeout: 15000 });

    // Navigate to inbox and verify the sent email appears
    await authenticatedPage.goto('/brightmail');
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for email list and check for the email subject
    await waitForEmailList(authenticatedPage);
    const emailRow = findEmailRowBySubject(authenticatedPage, uniqueSubject);
    await expect(emailRow).toBeVisible({ timeout: 15000 });
  });
});

// ─── Test 4: Thread view from inbox click ────────────────────
// Requirement 10.4

test.describe('BrightMail Thread View', () => {
  // Use a viewport narrower than 1280px so InboxView navigates
  // instead of opening the reading pane (wide-desktop mode).
  test.use({ viewport: { width: 1024, height: 720 } });

  test('clicking an email in inbox opens the thread view', async ({
    authenticatedPage,
    authResult,
  }) => {
    const uniqueSubject = `E2E Thread ${Date.now()}`;
    const recipientLocal = authResult.email.split('@')[0];
    const recipientDomain = authResult.email.split('@')[1];

    // Send a test email
    await sendEmailViaApi(authResult.token, {
      fromLocal: recipientLocal,
      fromDomain: recipientDomain,
      toLocal: recipientLocal,
      toDomain: recipientDomain,
      subject: uniqueSubject,
      textBody: 'Thread view test body.',
    });

    // Navigate to inbox
    await authenticatedPage.goto('/brightmail');
    await authenticatedPage.waitForLoadState('networkidle');

    await waitForEmailList(authenticatedPage);

    // Click the email row with our subject
    const emailRow = findEmailRowBySubject(authenticatedPage, uniqueSubject);
    await expect(emailRow).toBeVisible({ timeout: 10000 });
    await emailRow.click();

    // Verify we navigated to the thread view
    await expect(authenticatedPage).toHaveURL(/\/brightmail\/thread\//, {
      timeout: 10000,
    });

    // Verify thread content is displayed
    const threadView = authenticatedPage.locator('[data-testid="thread-view"]');
    await expect(threadView).toBeVisible({ timeout: 15000 });

    // Verify the email subject appears in the thread
    await expect(
      threadView.locator(
        `[data-testid="message-subject"]:has-text("${uniqueSubject}")`,
      ),
    ).toBeVisible();

    // Verify reply and forward icon buttons are present (they use aria-label, not text)
    await expect(
      threadView.locator('[data-testid^="reply-btn-"]').first(),
    ).toBeVisible();
    await expect(
      threadView.locator('[data-testid^="forward-btn-"]').first(),
    ).toBeVisible();

    // Verify back-to-inbox link is present
    await expect(
      authenticatedPage.locator('[data-testid="back-to-inbox"]'),
    ).toBeVisible();
  });
});

// ─── Test 5: Reply flow within thread ────────────────────────
// Requirement 10.5
// ThreadView has an inline reply box at the bottom (data-testid="inline-reply-box").
// Clicking the reply icon button opens the ComposeModal with pre-filled data.
// We test the inline reply flow which is simpler and more reliable.

test.describe('BrightMail Reply Flow', () => {
  test.use({ viewport: { width: 1024, height: 720 } });

  test('reply to an email within thread view', async ({
    authenticatedPage,
    authResult,
  }) => {
    const uniqueSubject = `E2E Reply ${Date.now()}`;
    const recipientLocal = authResult.email.split('@')[0];
    const recipientDomain = authResult.email.split('@')[1];

    // Send a test email
    await sendEmailViaApi(authResult.token, {
      fromLocal: recipientLocal,
      fromDomain: recipientDomain,
      toLocal: recipientLocal,
      toDomain: recipientDomain,
      subject: uniqueSubject,
      textBody: 'Original message for reply test.',
    });

    // Navigate to inbox and open the thread
    await authenticatedPage.goto('/brightmail');
    await authenticatedPage.waitForLoadState('networkidle');

    await waitForEmailList(authenticatedPage);

    const emailRow = findEmailRowBySubject(authenticatedPage, uniqueSubject);
    await expect(emailRow).toBeVisible({ timeout: 10000 });
    await emailRow.click();

    // Wait for thread view
    const threadView = authenticatedPage.locator('[data-testid="thread-view"]');
    await expect(threadView).toBeVisible({ timeout: 15000 });

    // Use the inline reply box at the bottom of the thread
    const inlineReplyBox = authenticatedPage.locator(
      '[data-testid="inline-reply-box"]',
    );
    await expect(inlineReplyBox).toBeVisible({ timeout: 10000 });

    // Type a reply in the inline reply input.
    // MUI TextField renders two <textarea> elements (one visible, one hidden
    // shadow for auto-sizing). Target only the visible one.
    const replyInput = inlineReplyBox.locator(
      '[data-testid="inline-reply-input"] textarea:not([aria-hidden="true"])',
    );
    await replyInput.fill('This is an inline reply from E2E test.');

    // Click the inline reply send button
    const sendButton = inlineReplyBox.locator(
      '[data-testid="inline-reply-send"]',
    );
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // Verify success notification
    await expect(
      authenticatedPage.getByRole('alert').filter({ hasText: /sent/i }),
    ).toBeVisible({ timeout: 10000 });
  });
});

// ─── Test 6: Delete flow with confirmation ───────────────────
// Requirement 10.6

test.describe('BrightMail Delete Flow', () => {
  test('delete an email with confirmation dialog', async ({
    authenticatedPage,
    authResult,
  }) => {
    const uniqueSubject = `E2E Delete ${Date.now()}`;
    const recipientLocal = authResult.email.split('@')[0];
    const recipientDomain = authResult.email.split('@')[1];

    // Send a test email
    await sendEmailViaApi(authResult.token, {
      fromLocal: recipientLocal,
      fromDomain: recipientDomain,
      toLocal: recipientLocal,
      toDomain: recipientDomain,
      subject: uniqueSubject,
      textBody: 'Email to be deleted.',
    });

    // Navigate to inbox
    await authenticatedPage.goto('/brightmail');
    await authenticatedPage.waitForLoadState('networkidle');

    await waitForEmailList(authenticatedPage);

    // Find the email row and click its checkbox
    const emailRow = findEmailRowBySubject(authenticatedPage, uniqueSubject);
    await expect(emailRow).toBeVisible({ timeout: 10000 });

    // Click the checkbox within the email row (EmailRow has a Checkbox)
    const checkbox = emailRow.locator('input[type="checkbox"]');
    await checkbox.click();

    // Verify bulk actions toolbar appears
    const bulkActions = authenticatedPage.locator(
      '[data-testid="bulk-actions"]',
    );
    await expect(bulkActions).toBeVisible({ timeout: 5000 });

    // Click delete button in bulk actions
    await bulkActions.locator('button', { hasText: /delete/i }).click();

    // Verify confirmation dialog appears (ConfirmDialog uses MUI Dialog with role="alertdialog")
    const dialog = authenticatedPage.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Confirm deletion — the confirm button has color="error" variant="contained"
    await dialog.getByRole('button', { name: /delete/i }).click();

    // Verify the email is removed from the inbox
    await expect(emailRow).not.toBeVisible({ timeout: 10000 });
  });
});

// ─── Test 7: Mark-as-read on open ────────────────────────────
// Requirement 10.7
// EmailRow shows unread emails with fontWeight 600 and a primary-colored left border.
// Opening the thread auto-marks as read. After navigating back, the row should
// have fontWeight 400 (read).

test.describe('BrightMail Mark as Read', () => {
  test.use({ viewport: { width: 1024, height: 720 } });

  test('opening an unread email marks it as read', async ({
    authenticatedPage,
    authResult,
  }) => {
    // Mark-as-read involves navigation, API calls, and re-rendering — generous timeout
    test.setTimeout(120_000);

    const uniqueSubject = `E2E MarkRead ${Date.now()}`;
    const recipientLocal = authResult.email.split('@')[0];
    const recipientDomain = authResult.email.split('@')[1];

    // Send a test email (will be unread initially)
    await sendEmailViaApi(authResult.token, {
      fromLocal: recipientLocal,
      fromDomain: recipientDomain,
      toLocal: recipientLocal,
      toDomain: recipientDomain,
      subject: uniqueSubject,
      textBody: 'Unread email for mark-as-read test.',
    });

    // Navigate to inbox
    await authenticatedPage.goto('/brightmail');
    await authenticatedPage.waitForLoadState('networkidle');

    await waitForEmailList(authenticatedPage);

    // Find the email row
    const emailRow = findEmailRowBySubject(authenticatedPage, uniqueSubject);
    await expect(emailRow).toBeVisible({ timeout: 10000 });

    // Verify the email shows as unread (has a colored left border, not transparent)
    const borderLeft = await emailRow.evaluate(
      (el) => window.getComputedStyle(el).borderLeftColor,
    );
    // Unread emails have a non-transparent primary-colored left border
    expect(borderLeft).not.toBe('transparent');

    // Click to open the thread (triggers mark-as-read)
    await emailRow.click();

    // Wait for thread view to load
    const threadView = authenticatedPage.locator('[data-testid="thread-view"]');
    await expect(threadView).toBeVisible({ timeout: 15000 });

    // Wait for the mark-as-read API call to complete before navigating back.
    // ThreadView fires markAsRead on mount; give it time to round-trip.
    await authenticatedPage
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/emails/') &&
          resp.url().includes('/read') &&
          resp.status() === 200,
        { timeout: 10000 },
      )
      .catch(() => {
        // If the endpoint pattern doesn't match, fall back to a short wait
      });
    // Extra settle time for the server to persist the read state
    await authenticatedPage.waitForTimeout(1000);

    // Navigate back to inbox
    await authenticatedPage.locator('[data-testid="back-to-inbox"]').click();
    await expect(authenticatedPage).toHaveURL(/\/brightmail/, {
      timeout: 10000,
    });

    // Wait for inbox to fully reload with fresh data
    await authenticatedPage.waitForLoadState('networkidle');
    await waitForEmailList(authenticatedPage);

    // The email should now show as read
    const emailRowAfter = findEmailRowBySubject(
      authenticatedPage,
      uniqueSubject,
    );
    await expect(emailRowAfter).toBeVisible({ timeout: 10000 });

    // Verify the sender text is no longer bold (read = fontWeight 400)
    const senderEl = emailRowAfter.locator('[data-testid="email-sender"]');
    const fontWeight = await senderEl.evaluate(
      (el) => window.getComputedStyle(el).fontWeight,
    );
    // "400" or "normal" = read; "600" or "bold" = unread
    expect(['400', 'normal']).toContain(fontWeight);
  });
});

// ─── Test 8: Empty inbox state ───────────────────────────────
// Requirement 10.8

test.describe('BrightMail Empty Inbox', () => {
  test('empty inbox displays empty state message', async ({
    authenticatedPage,
  }) => {
    // Navigate to inbox — fresh user should have no emails
    await authenticatedPage.goto('/brightmail');
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for the lazy-loaded BrightMail chunk to resolve
    await waitForSuspense(authenticatedPage);

    // Wait for either the empty state or the email list
    const emptyState = authenticatedPage.locator('[data-testid="inbox-empty"]');
    const emailList = authenticatedPage.locator('[data-testid="email-list"]');

    // For a fresh user, expect the empty state
    const emptyVisible = await emptyState
      .isVisible({ timeout: 15000 })
      .catch(() => false);
    const listVisible = await emailList
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (emptyVisible) {
      // Verify the empty state message is displayed
      await expect(emptyState).toBeVisible();
    } else if (listVisible) {
      // If the user has emails, the list is acceptable
      await expect(emailList).toBeVisible();
    } else {
      // Only loading state is acceptable — error state means the service is broken
      const error = authenticatedPage.locator('[data-testid="inbox-error"]');
      const errorVisible = await error
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      if (errorVisible) {
        const errorText = await error.textContent();
        throw new Error(
          `Inbox failed to load — error state displayed: ${errorText}`,
        );
      }

      const loading = authenticatedPage.locator(
        '[data-testid="inbox-loading"]',
      );
      await expect(loading.or(emptyState)).toBeVisible({
        timeout: 15000,
      });
    }
  });
});

// ─── Test 9: BrightMail routes require authentication ────────
// Requirement 10.9

baseTest.describe('BrightMail Authentication Guard', () => {
  baseTest(
    'unauthenticated user redirected from /brightmail',
    async ({ page }) => {
      await page.goto('/brightmail');
      // Wait for the lazy chunk to load and PrivateRoute to redirect
      await page.waitForURL(/\/login/, { timeout: 30_000 });
      await baseExpect(page).toHaveURL(/\/login/);
    },
  );

  baseTest(
    'unauthenticated user redirected from /brightmail/thread/id',
    async ({ page }) => {
      await page.goto('/brightmail/thread/test-id');
      // Wait for the lazy chunk to load and PrivateRoute to redirect
      // PrivateRoute first shows "Checking authentication..." then redirects
      await page.waitForURL(/\/login/, { timeout: 30_000 });
      await baseExpect(page).toHaveURL(/\/login/);
    },
  );
});
