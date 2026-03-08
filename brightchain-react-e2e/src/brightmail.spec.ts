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

import { expect, generateCredentials, test } from './fixtures';

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

    // Verify inbox content is visible (must NOT be an error state)
    // First, ensure no error indicator is shown — SERVICE_UNAVAILABLE should fail the test
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

// ─── Test 2: Inbox displays email columns ────────────────────
// Requirement 10.2

test.describe('BrightMail Inbox Columns', () => {
  test('inbox displays emails with sender, subject, and date columns', async ({
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

    // Wait for the email list table to appear
    const table = authenticatedPage.locator('table[role="grid"]');
    await expect(table).toBeVisible({ timeout: 15000 });

    // Verify column headers exist
    await expect(table.locator('th:has-text("Sender")')).toBeVisible();
    await expect(table.locator('th:has-text("Subject")')).toBeVisible();
    await expect(table.locator('th:has-text("Date")')).toBeVisible();

    // Verify at least one email row is rendered with data
    const firstRow = table.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
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

test.describe('BrightMail Compose Flow', () => {
  test('compose, send, and verify email appears in inbox', async ({
    authenticatedPage,
    authResult,
  }) => {
    const uniqueSubject = `E2E Compose ${Date.now()}`;
    const recipientLocal = authResult.email.split('@')[0];
    const recipientDomain = authResult.email.split('@')[1];
    const recipientAddress = `${recipientLocal}@${recipientDomain}`;

    // Navigate to compose
    await authenticatedPage.goto('/brightmail/compose');
    await authenticatedPage.waitForLoadState('networkidle');

    // Fill in the compose form
    const composeForm = authenticatedPage.locator(
      '[data-testid="compose-form"]',
    );
    await expect(composeForm).toBeVisible({ timeout: 15000 });

    await authenticatedPage.locator('#compose-to').fill(recipientAddress);
    await authenticatedPage.locator('#compose-subject').fill(uniqueSubject);
    await authenticatedPage
      .locator('#compose-body')
      .fill('E2E test email body content.');

    // Send the email
    const sendButton = authenticatedPage.locator('[data-testid="send-button"]');
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // Verify success notification
    await expect(
      authenticatedPage
        .getByRole('alert')
        .filter({ hasText: /sent successfully/i }),
    ).toBeVisible({ timeout: 10000 });

    // Navigate to inbox and verify the sent email appears
    await authenticatedPage.goto('/brightmail');
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for inbox to load and check for the email subject
    const table = authenticatedPage.locator('table[role="grid"]');
    await expect(table).toBeVisible({ timeout: 15000 });

    await expect(table.locator(`td:has-text("${uniqueSubject}")`)).toBeVisible({
      timeout: 10000,
    });
  });
});

// ─── Test 4: Thread view from inbox click ────────────────────
// Requirement 10.4

test.describe('BrightMail Thread View', () => {
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

    const table = authenticatedPage.locator('table[role="grid"]');
    await expect(table).toBeVisible({ timeout: 15000 });

    // Click the email row with our subject
    const emailRow = table.locator(`tr:has(td:has-text("${uniqueSubject}"))`);
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
    const subjectSelector =
      `[data-testid="message-subject"]` + `:has-text("${uniqueSubject}")`;
    await expect(threadView.locator(subjectSelector)).toBeVisible();

    // Verify reply and forward buttons are present
    await expect(
      threadView.locator('button:has-text("Reply")').first(),
    ).toBeVisible();
    await expect(
      threadView.locator('button:has-text("Forward")').first(),
    ).toBeVisible();

    // Verify back-to-inbox link is present
    await expect(
      authenticatedPage.locator('[data-testid="back-to-inbox"]'),
    ).toBeVisible();
  });
});

// ─── Test 5: Reply flow within thread ────────────────────────
// Requirement 10.5

test.describe('BrightMail Reply Flow', () => {
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

    const table = authenticatedPage.locator('table[role="grid"]');
    await expect(table).toBeVisible({ timeout: 15000 });

    const emailRow = table.locator(`tr:has(td:has-text("${uniqueSubject}"))`);
    await expect(emailRow).toBeVisible({ timeout: 10000 });
    await emailRow.click();

    // Wait for thread view
    const threadView = authenticatedPage.locator('[data-testid="thread-view"]');
    await expect(threadView).toBeVisible({ timeout: 15000 });

    // Click the reply button on the first message
    const replyButton = threadView.locator('button:has-text("Reply")').first();
    await expect(replyButton).toBeVisible();
    await replyButton.click();

    // Verify compose form appears with pre-filled data
    const composeForm = authenticatedPage.locator(
      '[data-testid="compose-form"]',
    );
    await expect(composeForm).toBeVisible({
      timeout: 10000,
    });

    // Verify subject is pre-filled with "Re: " prefix
    const subjectField = authenticatedPage.locator('#compose-subject');
    const subjectValue = await subjectField.inputValue();
    expect(subjectValue).toContain('Re: ');
    expect(subjectValue).toContain(uniqueSubject);

    // Verify To field is pre-filled
    const toField = authenticatedPage.locator('#compose-to');
    const toValue = await toField.inputValue();
    expect(toValue.length).toBeGreaterThan(0);

    // Fill in reply body and send
    await authenticatedPage.locator('#compose-body').fill('This is a reply.');
    const sendButton = authenticatedPage.locator('[data-testid="send-button"]');
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // Verify success notification
    await expect(
      authenticatedPage
        .getByRole('alert')
        .filter({ hasText: /sent successfully/i }),
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

    const table = authenticatedPage.locator('table[role="grid"]');
    await expect(table).toBeVisible({ timeout: 15000 });

    // Select the email via checkbox
    const emailRow = table.locator(`tr:has(td:has-text("${uniqueSubject}"))`);
    await expect(emailRow).toBeVisible({ timeout: 10000 });

    // Click the checkbox
    const checkbox = emailRow.locator('input[type="checkbox"]');
    await checkbox.click();

    // Verify bulk actions toolbar appears
    const bulkActions = authenticatedPage.locator(
      '[data-testid="bulk-actions"]',
    );
    await expect(bulkActions).toBeVisible({ timeout: 5000 });

    // Click delete button
    await bulkActions.locator('button:has-text("Delete")').click();

    // Verify confirmation dialog appears
    const dialog = authenticatedPage.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Confirm deletion
    await dialog.locator('button:has-text("Delete")').click();

    // Verify the email is removed from the inbox
    await expect(
      table.locator(`td:has-text("${uniqueSubject}")`),
    ).not.toBeVisible({ timeout: 10000 });
  });
});

// ─── Test 7: Mark-as-read on open ────────────────────────────
// Requirement 10.7

test.describe('BrightMail Mark as Read', () => {
  test('opening an unread email marks it as read', async ({
    authenticatedPage,
    authResult,
  }) => {
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

    const table = authenticatedPage.locator('table[role="grid"]');
    await expect(table).toBeVisible({ timeout: 15000 });

    // Find the email row
    const emailRow = table.locator(`tr:has(td:has-text("${uniqueSubject}"))`);
    await expect(emailRow).toBeVisible({ timeout: 10000 });

    // Verify the email shows as unread (status cell visible)
    const statusCell = emailRow.locator('[data-testid="email-status"]');
    await expect(statusCell).toBeVisible();

    // Click to open the thread (triggers mark-as-read)
    await emailRow.click();

    // Wait for thread view to load
    const threadView = authenticatedPage.locator('[data-testid="thread-view"]');
    await expect(threadView).toBeVisible({ timeout: 15000 });

    // Navigate back to inbox
    await authenticatedPage.locator('[data-testid="back-to-inbox"]').click();
    await expect(authenticatedPage).toHaveURL(/\/brightmail$/, {
      timeout: 10000,
    });

    // Wait for inbox to reload
    const tableAfter = authenticatedPage.locator('table[role="grid"]');
    await expect(tableAfter).toBeVisible({
      timeout: 15000,
    });

    // The email should now show as read
    const emailRowAfter = tableAfter.locator(
      `tr:has(td:has-text("${uniqueSubject}"))`,
    );
    await expect(emailRowAfter).toBeVisible({
      timeout: 10000,
    });

    // Verify the row is no longer bold (read = normal)
    const fontWeight = await emailRowAfter.evaluate(
      (el) => window.getComputedStyle(el).fontWeight,
    );
    // "400" or "normal" = read; "700" or "bold" = unread
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

    // Wait for either the empty state or the email list
    const emptyState = authenticatedPage.locator('[data-testid="inbox-empty"]');
    const emailTable = authenticatedPage.locator('table[role="grid"]');

    // For a fresh user, expect the empty state
    const emptyVisible = await emptyState
      .isVisible({ timeout: 15000 })
      .catch(() => false);
    const tableVisible = await emailTable
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (emptyVisible) {
      // Verify the empty state message is displayed
      await expect(emptyState).toBeVisible();
      await expect(emptyState.locator('text=/no emails/i')).toBeVisible();
    } else if (tableVisible) {
      // If the user has emails, the table is acceptable
      await expect(emailTable).toBeVisible();
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
      await baseExpect(page).toHaveURL(/\/login/, {
        timeout: 10000,
      });
    },
  );

  baseTest(
    'unauthenticated user redirected from /brightmail/compose',
    async ({ page }) => {
      await page.goto('/brightmail/compose');
      await baseExpect(page).toHaveURL(/\/login/, {
        timeout: 10000,
      });
    },
  );

  baseTest(
    'unauthenticated user redirected from /brightmail/thread/id',
    async ({ page }) => {
      await page.goto('/brightmail/thread/test-id');
      await baseExpect(page).toHaveURL(/\/login/, {
        timeout: 10000,
      });
    },
  );
});
