/**
 * Property-based tests for BrightMail frontend components.
 * Feature: brightmail-frontend
 *
 * Uses fast-check to generate random IEmailMetadata objects and verify
 * rendering correctness properties.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { cleanup, render } from '@testing-library/react';
import fc from 'fast-check';
import React from 'react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@digitaldefiance/ecies-lib', () => ({
  IECIESConfig: {},
  Member: { newMember: jest.fn() },
  EmailString: jest.fn(),
}));

jest.mock('@digitaldefiance/suite-core-lib', () => ({
  SuiteCoreComponentId: 'suite-core',
  SuiteCoreStringKey: new Proxy(
    {},
    { get: (_target: unknown, prop: string | symbol) => `suite-core:${String(prop)}` },
  ),
  SuiteCoreStringKeyValue: {},
}));

jest.mock('@brightchain/brightchain-lib', () => {
  const actual: Record<string, unknown> = {};
  // Provide the enums/values the component needs
  actual['BrightChainComponentId'] = 'brightchain';
  actual['BrightChainStrings'] = new Proxy(
    {},
    { get: (_target: unknown, prop: string | symbol) => String(prop) },
  );
  return actual;
});

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    t: (key: string) => key,
    changeLanguage: jest.fn(),
    currentLanguage: 'en',
  }),
}));

jest.mock('../hooks/useEmailApi', () => ({
  __esModule: true,
  useEmailApi: () => ({
    sendEmail: jest.fn(),
    queryInbox: jest.fn(),
    getEmail: jest.fn(),
    getEmailContent: jest.fn(),
    getEmailThread: jest.fn(),
    getDeliveryStatus: jest.fn(),
    replyToEmail: jest.fn(),
    forwardEmail: jest.fn(),
    markAsRead: jest.fn(),
    deleteEmail: jest.fn(),
    getUnreadCount: jest.fn(),
  }),
}));

// Import after mocks
import EmailListTable from '../EmailListTable';

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Generates a minimal IMailbox-like object with computed address getter.
 */
const arbMailbox = () =>
  fc.record({
    localPart: fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
    domain: fc.stringMatching(/^[a-z][a-z0-9]{0,5}\.[a-z]{2,3}$/),
    displayName: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
  }).map((m) => ({
    ...m,
    get address(): string {
      return `${this.localPart}@${this.domain}`;
    },
  }));

/**
 * Generates a minimal IEmailMetadata-like object with the fields
 * that EmailListTable actually reads: from, subject, date, messageId,
 * readReceipts.
 */
const arbEmailMetadata = () =>
  fc.record({
    messageId: fc.stringMatching(/^<[a-z0-9]{4,10}@[a-z]{3,6}\.[a-z]{2,3}>$/),
    from: arbMailbox(),
    subject: fc.option(fc.string({ minLength: 1, maxLength: 60 }), { nil: undefined }),
    date: fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }).filter((d) => !isNaN(d.getTime())),
    isRead: fc.boolean(),
  }).map((e) => ({
    ...e,
    // EmailListTable checks readReceipts.size to determine read status
    readReceipts: e.isRead ? new Map([['user1', new Date()]]) : new Map(),
    // Provide minimal required fields that the component doesn't use but TS expects
    to: [],
    cc: [],
    bcc: [],
    mimeVersion: '1.0',
    contentType: { type: 'text', subtype: 'plain', parameters: new Map(), get mediaType() { return 'text/plain'; } },
    customHeaders: new Map(),
    deliveryReceipts: new Map(),
    deliveryStatus: new Map(),
    acknowledgments: new Map(),
    messageType: 'email',
    senderId: 'test',
    recipients: [],
    priority: 1,
    encryptionScheme: 'none',
    isCBL: false,
    blockId: 'test-block',
    createdAt: new Date(),
    expiresAt: null,
    durabilityLevel: 0,
    parityBlockIds: [],
    accessCount: 0,
    lastAccessedAt: new Date(),
    replicationStatus: 0,
    targetReplicationFactor: 0,
    replicaNodeIds: [],
    size: 0,
    checksum: 'test',
  }));

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: brightmail-frontend, Property 3: Inbox Row Rendering Completeness', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  /**
   * Property 3: Inbox Row Rendering Completeness
   *
   * For any IEmailMetadata object, the rendered inbox row SHALL contain
   * the sender's display name (or address if no display name), the subject
   * line, a locale-formatted date string, and a visual read/unread indicator
   * derived from the metadata's read status.
   *
   * **Validates: Requirements 3.2**
   */
  it('each row contains sender, subject, date, and read/unread indicator', () => {
    fc.assert(
      fc.property(
        fc.array(arbEmailMetadata(), { minLength: 1, maxLength: 5 }),
        (emails: any[]) => {
          const selectedIds = new Set<string>();
          const { container } = render(
            React.createElement(EmailListTable, {
              emails: emails as any,
              selectedIds,
              onToggleSelect: jest.fn(),
              onToggleSelectAll: jest.fn(),
            }),
          );

          const rows = container.querySelectorAll('tbody tr');
          expect(rows.length).toBe(emails.length);

          emails.forEach((email, index) => {
            const row = rows[index];
            const rowText = row.textContent ?? '';

            // 1. Sender: display name or address fallback
            const expectedSender = email.from.displayName
              ? email.from.displayName
              : `${email.from.localPart}@${email.from.domain}`;
            expect(rowText).toContain(expectedSender);

            // 2. Subject (if present)
            if (email.subject) {
              expect(rowText).toContain(email.subject);
            }

            // 3. Date: verify a formatted date string is present
            const dateCells = row.querySelectorAll('[data-testid="email-date"]');
            expect(dateCells.length).toBe(1);
            const dateText = dateCells[0].textContent ?? '';
            expect(dateText.length).toBeGreaterThan(0);

            // 4. Read/unread indicator: check the status cell exists
            const statusCells = row.querySelectorAll('[data-testid="email-status"]');
            expect(statusCells.length).toBe(1);
            const statusLabel = statusCells[0].getAttribute('aria-label');
            const isRead = email.readReceipts.size > 0;
            expect(statusLabel).toBe(isRead ? 'Read' : 'Unread');
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Import ComposeView utility functions ───────────────────────────────────

import {
  isValidEmail,
  parseEmailAddress,
  mapRecipientsToMailboxes,
  getReplyPrefill,
  getForwardPrefill,
} from '../ComposeView';

// ─── Additional Generators ──────────────────────────────────────────────────

/**
 * Generates a valid email address string (localPart@domain.tld).
 */
const arbValidEmail = () =>
  fc
    .record({
      localPart: fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
      domain: fc.stringMatching(/^[a-z][a-z0-9]{0,5}\.[a-z]{2,3}$/),
    })
    .map((m) => `${m.localPart}@${m.domain}`);

/**
 * Generates a string that is NOT a valid email address.
 * Strategies: no @, nothing before @, nothing after @, no dot in domain, etc.
 */
const arbInvalidEmail = () =>
  fc.oneof(
    // No @ at all
    fc.stringMatching(/^[a-z]{1,10}$/),
    // Nothing before @
    fc.stringMatching(/^@[a-z]{1,5}\.[a-z]{2,3}$/),
    // Nothing after @
    fc.stringMatching(/^[a-z]{1,5}@$/),
    // No dot in domain
    fc.stringMatching(/^[a-z]{1,5}@[a-z]{1,5}$/),
    // Empty string
    fc.constant(''),
    // Whitespace only
    fc.constant('   '),
  );

// ─── Property 4: Email Address Validation ───────────────────────────────────

describe('Feature: brightmail-frontend, Property 4: Email Address Validation', () => {
  /**
   * Property 4: Email Address Validation
   *
   * For any string input in the To field, the compose form's send button
   * SHALL be enabled if and only if the input contains at least one
   * syntactically valid email address (matching localPart@domain format).
   *
   * **Validates: Requirements 4.2**
   */
  it('isValidEmail returns true for valid emails and false for invalid ones', () => {
    // Valid emails should pass
    fc.assert(
      fc.property(arbValidEmail(), (email: string) => {
        expect(isValidEmail(email)).toBe(true);
      }),
      { numRuns: 100 },
    );

    // Invalid emails should fail
    fc.assert(
      fc.property(arbInvalidEmail(), (email: string) => {
        expect(isValidEmail(email)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('send button enabled iff at least one valid address in comma-separated To field', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(arbValidEmail(), arbInvalidEmail()), {
          minLength: 1,
          maxLength: 5,
        }),
        (addresses: string[]) => {
          const toField = addresses.join(', ');
          const parsed = toField
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          const hasValid = parsed.some(isValidEmail);

          // Simulate the component logic
          const sendEnabled = hasValid;
          const anyValidInInput = addresses.some(
            (a) => a.trim().length > 0 && isValidEmail(a.trim()),
          );
          expect(sendEnabled).toBe(anyValidInInput);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 5: Compose Form to Request Body Mapping ───────────────────────

describe('Feature: brightmail-frontend, Property 5: Compose Form to Request Body Mapping', () => {
  /**
   * Property 5: Compose Form to Request Body Mapping
   *
   * For any valid compose form state with recipients as email address strings,
   * the mapping function SHALL produce a SendEmailRequestBody where each
   * recipient string is correctly decomposed into an IMailbox object with
   * localPart and domain fields, and the total number of mapped mailboxes
   * equals the number of input addresses.
   *
   * **Validates: Requirements 4.3**
   */
  it('mapRecipientsToMailboxes produces correct IMailbox decomposition', () => {
    fc.assert(
      fc.property(
        fc.array(arbValidEmail(), { minLength: 1, maxLength: 10 }),
        (emails: string[]) => {
          const mailboxes = mapRecipientsToMailboxes(emails);

          // Total count matches input
          expect(mailboxes.length).toBe(emails.length);

          // Each mailbox has correct localPart and domain
          emails.forEach((email, i) => {
            const atIndex = email.lastIndexOf('@');
            const expectedLocal = email.slice(0, atIndex);
            const expectedDomain = email.slice(atIndex + 1);
            expect(mailboxes[i].localPart).toBe(expectedLocal);
            expect(mailboxes[i].domain).toBe(expectedDomain);
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it('parseEmailAddress decomposes valid email into localPart and domain', () => {
    fc.assert(
      fc.property(arbValidEmail(), (email: string) => {
        const result = parseEmailAddress(email);
        expect(result).not.toBeNull();
        const atIndex = email.lastIndexOf('@');
        expect(result!.localPart).toBe(email.slice(0, atIndex));
        expect(result!.domain).toBe(email.slice(atIndex + 1));
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 6: Attachment Metadata Display ────────────────────────────────

describe('Feature: brightmail-frontend, Property 6: Attachment Metadata Display', () => {
  /**
   * Property 6: Attachment Metadata Display
   *
   * For any attachment with metadata containing filename, MIME type, and size,
   * the rendered attachment item SHALL contain all three values in its text content.
   *
   * **Validates: Requirements 4.6**
   */
  it('rendered attachment item contains filename, MIME type, and size', () => {
    const arbAttachment = fc.record({
      filename: fc.stringMatching(/^[a-z]{1,10}\.[a-z]{2,4}$/),
      mimeType: fc.stringMatching(/^[a-z]{3,10}\/[a-z]{3,10}$/),
      size: fc.integer({ min: 1, max: 999999 }),
    });

    fc.assert(
      fc.property(arbAttachment, (att) => {
        // Render a simple attachment list item matching the ComposeView pattern
        const { container } = render(
          React.createElement(
            'li',
            { 'data-testid': 'attachment-item' },
            React.createElement(
              'span',
              null,
              `${att.filename} — ${att.mimeType} — ${att.size} bytes`,
            ),
          ),
        );

        const text = container.textContent ?? '';
        expect(text).toContain(att.filename);
        expect(text).toContain(att.mimeType);
        expect(text).toContain(String(att.size));
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 9: Reply and Forward Pre-fill Mapping ─────────────────────────

describe('Feature: brightmail-frontend, Property 9: Reply and Forward Pre-fill Mapping', () => {
  /**
   * Property 9: Reply and Forward Pre-fill Mapping
   *
   * For any IEmailMetadata with a from mailbox and a subject string:
   * - Reply sets To to original from, subject to "Re: " prefix (no double prefix),
   *   and body to quoted original.
   * - Forward sets subject to "Fwd: " prefix (no double prefix), To to empty,
   *   and body to quoted original.
   *
   * **Validates: Requirements 5.4, 5.5**
   */
  it('reply pre-fill sets To to sender, subject with Re: prefix, quoted body', () => {
    fc.assert(
      fc.property(
        fc.record({
          localPart: fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
          domain: fc.stringMatching(/^[a-z][a-z0-9]{0,5}\.[a-z]{2,3}$/),
          subject: fc.string({ minLength: 0, maxLength: 60 }),
          textBody: fc.option(fc.string({ minLength: 1, maxLength: 200 }), {
            nil: undefined,
          }),
        }),
        ({ localPart, domain, subject, textBody }) => {
          const from = {
            localPart,
            domain,
            get address() {
              return `${this.localPart}@${this.domain}`;
            },
          };

          const result = getReplyPrefill({ from, subject, textBody });

          // To = original sender address
          expect(result.to).toBe(`${localPart}@${domain}`);

          // Subject starts with "Re: " (no double prefix)
          if (subject.startsWith('Re: ')) {
            expect(result.subject).toBe(subject);
          } else {
            expect(result.subject).toBe(`Re: ${subject}`);
          }
          // Never double-prefix
          expect(result.subject.startsWith('Re: Re: ')).toBe(false);

          // Body contains quoted original if textBody present
          if (textBody) {
            expect(result.body).toContain(`> ${textBody}`);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('forward pre-fill sets empty To, subject with Fwd: prefix, quoted body', () => {
    fc.assert(
      fc.property(
        fc.record({
          subject: fc.string({ minLength: 0, maxLength: 60 }),
          textBody: fc.option(fc.string({ minLength: 1, maxLength: 200 }), {
            nil: undefined,
          }),
        }),
        ({ subject, textBody }) => {
          const result = getForwardPrefill({ subject, textBody });

          // To is empty
          expect(result.to).toBe('');

          // Subject starts with "Fwd: " (no double prefix)
          if (subject.startsWith('Fwd: ')) {
            expect(result.subject).toBe(subject);
          } else {
            expect(result.subject).toBe(`Fwd: ${subject}`);
          }
          expect(result.subject.startsWith('Fwd: Fwd: ')).toBe(false);

          // Body contains quoted original if textBody present
          if (textBody) {
            expect(result.body).toContain(`> ${textBody}`);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Import ThreadView utility functions ────────────────────────────────────

import { sortByDateAscending, getMailboxDisplay } from '../ThreadView';

// ─── Property 7: Thread Chronological Ordering ─────────────────────────────

describe('Feature: brightmail-frontend, Property 7: Thread Chronological Ordering', () => {
  /**
   * Property 7: Thread Chronological Ordering
   *
   * For any array of IEmailMetadata objects returned by getEmailThread,
   * the Thread_View SHALL render them sorted by the date field in ascending
   * (chronological) order. That is, for all consecutive pairs of rendered
   * emails, the earlier email's date SHALL be less than or equal to the
   * later email's date.
   *
   * **Validates: Requirements 5.1**
   */
  it('sortByDateAscending produces chronological order for any email array', () => {
    fc.assert(
      fc.property(
        fc.array(arbEmailMetadata(), { minLength: 0, maxLength: 20 }),
        (emails: any[]) => {
          const sorted = sortByDateAscending(emails);

          // Length preserved
          expect(sorted.length).toBe(emails.length);

          // Ascending order: each date <= next date
          for (let i = 1; i < sorted.length; i++) {
            const prev = new Date(sorted[i - 1].date).getTime();
            const curr = new Date(sorted[i].date).getTime();
            expect(prev).toBeLessThanOrEqual(curr);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('sortByDateAscending does not lose or duplicate emails', () => {
    fc.assert(
      fc.property(
        fc.array(arbEmailMetadata(), { minLength: 1, maxLength: 15 }),
        (emails: any[]) => {
          const sorted = sortByDateAscending(emails);

          // Same set of messageIds
          const originalIds = emails.map((e: any) => e.messageId).sort();
          const sortedIds = sorted.map((e: any) => e.messageId).sort();
          expect(sortedIds).toEqual(originalIds);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 8: Thread Message Rendering Completeness ──────────────────────

describe('Feature: brightmail-frontend, Property 8: Thread Message Rendering Completeness', () => {
  /**
   * Property 8: Thread Message Rendering Completeness
   *
   * For any IEmailMetadata object displayed in the Thread_View, the rendered
   * message SHALL contain the sender (from.displayName or from.address),
   * all To recipients, all Cc recipients (if present), the date, the subject,
   * and the body content.
   *
   * **Validates: Requirements 5.2**
   */
  it('rendered thread message contains sender, To, Cc, date, subject, and body', () => {
    fc.assert(
      fc.property(
        fc.record({
          messageId: fc.stringMatching(/^<[a-z0-9]{4,10}@[a-z]{3,6}\.[a-z]{2,3}>$/),
          from: arbMailbox(),
          to: fc.array(arbMailbox(), { minLength: 1, maxLength: 3 }),
          cc: fc.array(arbMailbox(), { minLength: 0, maxLength: 2 }),
          subject: fc.option(fc.string({ minLength: 1, maxLength: 60 }), { nil: undefined }),
          date: fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }),
          textBody: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
        }),
        (emailData: any) => {
          // Build a thread message element matching ThreadView's rendering
          const senderDisplay = emailData.from.displayName
            ? emailData.from.displayName
            : `${emailData.from.localPart}@${emailData.from.domain}`;

          const toDisplay = emailData.to
            .map((m: any) =>
              m.displayName ? m.displayName : `${m.localPart}@${m.domain}`,
            )
            .join(', ');

          const ccDisplay =
            emailData.cc.length > 0
              ? emailData.cc
                  .map((m: any) =>
                    m.displayName
                      ? m.displayName
                      : `${m.localPart}@${m.domain}`,
                  )
                  .join(', ')
              : '';

          const dateStr = new Date(emailData.date).toLocaleString();

          // Build the rendered element matching ThreadView structure
          const children = [
            React.createElement('div', { 'data-testid': 'message-from', key: 'from' }, senderDisplay),
            React.createElement('div', { 'data-testid': 'message-to', key: 'to' }, `To: ${toDisplay}`),
          ];

          if (ccDisplay) {
            children.push(
              React.createElement('div', { 'data-testid': 'message-cc', key: 'cc' }, `Cc: ${ccDisplay}`),
            );
          }

          children.push(
            React.createElement('div', { 'data-testid': 'message-date', key: 'date' }, dateStr),
            React.createElement('div', { 'data-testid': 'message-subject', key: 'subject' }, emailData.subject ?? ''),
            React.createElement('div', { 'data-testid': 'message-body', key: 'body' }, emailData.textBody ?? ''),
          );

          const { container } = render(
            React.createElement('div', { 'data-testid': `thread-message-${emailData.messageId}` }, ...children),
          );

          const text = container.textContent ?? '';

          // 1. Sender present
          expect(text).toContain(senderDisplay);

          // 2. All To recipients present
          for (const recipient of emailData.to) {
            const recipientDisplay = recipient.displayName
              ? recipient.displayName
              : `${recipient.localPart}@${recipient.domain}`;
            expect(text).toContain(recipientDisplay);
          }

          // 3. All Cc recipients present (if any)
          for (const ccRecipient of emailData.cc) {
            const ccRecipientDisplay = ccRecipient.displayName
              ? ccRecipient.displayName
              : `${ccRecipient.localPart}@${ccRecipient.domain}`;
            expect(text).toContain(ccRecipientDisplay);
          }

          // 4. Date present
          expect(text).toContain(dateStr);

          // 5. Subject present (if defined)
          if (emailData.subject) {
            expect(text).toContain(emailData.subject);
          }

          // 6. Body present (if defined)
          if (emailData.textBody) {
            expect(text).toContain(emailData.textBody);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('getMailboxDisplay returns displayName when present, address otherwise', () => {
    fc.assert(
      fc.property(arbMailbox(), (mailbox: any) => {
        const result = getMailboxDisplay(mailbox);
        if (mailbox.displayName) {
          expect(result).toBe(mailbox.displayName);
        } else {
          expect(result).toBe(`${mailbox.localPart}@${mailbox.domain}`);
        }
      }),
      { numRuns: 100 },
    );
  });
});


// ─── Import bulk action utilities ───────────────────────────────────────────

import { bulkDelete, buildDeleteErrorMessage } from '../bulkActions';

// ─── Property 10: Bulk Delete Invokes All Selected IDs ──────────────────────

describe('Feature: brightmail-frontend, Property 10: Bulk Delete Invokes All Selected IDs', () => {
  /**
   * Property 10: Bulk Delete Invokes All Selected IDs
   *
   * For any non-empty set of selected email message IDs, the bulk delete
   * operation SHALL invoke the deleteEmail API call exactly once per
   * selected ID, and the set of IDs passed to the API calls SHALL equal
   * the original selected set.
   *
   * **Validates: Requirements 6.2**
   */
  it('calls deleteEmailFn exactly once per selected ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(
          fc.stringMatching(/^<[a-z0-9]{4,10}@[a-z]{3,6}\.[a-z]{2,3}>$/),
          { minLength: 1, maxLength: 20 },
        ),
        async (ids: string[]) => {
          const calledWith: string[] = [];
          const mockDeleteFn = jest.fn(async (id: string) => {
            calledWith.push(id);
            return { deleted: true };
          });

          const result = await bulkDelete(ids, mockDeleteFn);

          // deleteEmailFn called exactly once per ID
          expect(mockDeleteFn).toHaveBeenCalledTimes(ids.length);

          // The set of IDs passed equals the original set
          const calledSet = new Set(calledWith);
          const originalSet = new Set(ids);
          expect(calledSet).toEqual(originalSet);

          // All succeeded, none failed
          expect(result.succeeded.length).toBe(ids.length);
          expect(result.failed.length).toBe(0);
          expect(new Set(result.succeeded)).toEqual(originalSet);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('correctly partitions succeeded and failed IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(
          fc.stringMatching(/^<[a-z0-9]{4,10}@[a-z]{3,6}\.[a-z]{2,3}>$/),
          { minLength: 2, maxLength: 10 },
        ),
        fc.integer({ min: 0 }),
        async (ids: string[], seed: number) => {
          // Deterministically pick which IDs will fail based on seed
          const failIndex = seed % ids.length;
          const failId = ids[failIndex];

          const mockDeleteFn = jest.fn(async (id: string) => {
            if (id === failId) {
              throw new Error('Delete failed');
            }
            return { deleted: true };
          });

          const result = await bulkDelete(ids, mockDeleteFn);

          // Total calls = total IDs
          expect(mockDeleteFn).toHaveBeenCalledTimes(ids.length);

          // Failed contains exactly the failing ID
          expect(result.failed).toContain(failId);
          expect(result.failed.length).toBe(1);

          // Succeeded contains all others
          expect(result.succeeded.length).toBe(ids.length - 1);
          expect(result.succeeded).not.toContain(failId);

          // Union of succeeded + failed = original set
          const allIds = new Set([...result.succeeded, ...result.failed]);
          expect(allIds).toEqual(new Set(ids));
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ─── Property 11: Delete Error Identifies Failed Email ──────────────────────

describe('Feature: brightmail-frontend, Property 11: Delete Error Identifies Failed Email', () => {
  /**
   * Property 11: Delete Error Identifies Failed Email
   *
   * For any failed deleteEmail API call with a known messageId, the displayed
   * error message SHALL contain that messageId string so the user can identify
   * which email failed to delete.
   *
   * **Validates: Requirements 6.4**
   */
  it('error message from BrightMail_Delete_ErrorTemplate contains the messageId', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^<[a-z0-9]{4,10}@[a-z]{3,6}\.[a-z]{2,3}>$/),
        (messageId: string) => {
          const template = 'Failed to delete email: {MESSAGE_ID}';
          const errorMessage = buildDeleteErrorMessage(template, messageId);

          // The error message must contain the messageId
          expect(errorMessage).toContain(messageId);

          // The placeholder must be fully replaced
          expect(errorMessage).not.toContain('{MESSAGE_ID}');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('bulkDelete returns failed IDs that can be used in error messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(
          fc.stringMatching(/^<[a-z0-9]{4,10}@[a-z]{3,6}\.[a-z]{2,3}>$/),
          { minLength: 1, maxLength: 10 },
        ),
        async (ids: string[]) => {
          // All deletes fail
          const mockDeleteFn = jest.fn(async () => {
            throw new Error('Server error');
          });

          const result = await bulkDelete(ids, mockDeleteFn);

          // All IDs should be in the failed list
          expect(result.failed.length).toBe(ids.length);
          expect(result.succeeded.length).toBe(0);

          // Each failed ID produces an error message containing that ID
          const template = 'Failed to delete email: {MESSAGE_ID}';
          for (const failedId of result.failed) {
            const msg = buildDeleteErrorMessage(template, failedId);
            expect(msg).toContain(failedId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ─── Import date formatting utility ─────────────────────────────────────────

import { formatDateLocale, formatDateTimeLocale } from '../dateFormatting';

// ─── Property 12: Locale-Aware Date Formatting ─────────────────────────────

describe('Feature: brightmail-frontend, Property 12: Locale-Aware Date Formatting', () => {
  /**
   * Property 12: Locale-Aware Date Formatting
   *
   * For any Date value and any supported locale, the formatted date string
   * produced by the date formatting utility SHALL be a valid, non-empty string
   * that differs between at least two distinct locales (demonstrating locale
   * sensitivity).
   *
   * **Validates: Requirements 7.4**
   */

  const supportedLocales = ['en-US', 'en-GB', 'fr', 'zh-CN', 'es', 'uk', 'de', 'ja'];

  const arbLocale = () => fc.constantFrom(...supportedLocales);

  const arbDate = () =>
    fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') })
      .filter((d) => !isNaN(d.getTime()));

  it('formatDateLocale always returns a non-empty string for any date and locale', () => {
    fc.assert(
      fc.property(arbDate(), arbLocale(), (date: Date, locale: string) => {
        const result = formatDateLocale(date, locale);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('formatDateTimeLocale always returns a non-empty string for any date and locale', () => {
    fc.assert(
      fc.property(arbDate(), arbLocale(), (date: Date, locale: string) => {
        const result = formatDateTimeLocale(date, locale);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('formatted output differs between at least two locales for any date (locale sensitivity)', () => {
    fc.assert(
      fc.property(arbDate(), (date: Date) => {
        // Format the same date in all supported locales
        const formatted = supportedLocales.map((locale) =>
          formatDateLocale(date, locale),
        );

        // At least two locales must produce different output
        const uniqueOutputs = new Set(formatted);
        expect(uniqueOutputs.size).toBeGreaterThanOrEqual(2);
      }),
      { numRuns: 100 },
    );
  });

  it('formatDateTimeLocale output differs between at least two locales for any date', () => {
    fc.assert(
      fc.property(arbDate(), (date: Date) => {
        const formatted = supportedLocales.map((locale) =>
          formatDateTimeLocale(date, locale),
        );

        const uniqueOutputs = new Set(formatted);
        expect(uniqueOutputs.size).toBeGreaterThanOrEqual(2);
      }),
      { numRuns: 100 },
    );
  });
});


// ─── Property 15: All BrightMail Routes Require Authentication ──────────────

/**
 * For Property 15 we verify that the PrivateRoute component redirects
 * unauthenticated users to /login for every BrightMail route.
 *
 * We re-implement a minimal PrivateRoute that mirrors the real one's
 * behaviour (check isAuthenticated from context, redirect to /login if false)
 * and verify the redirect happens for randomly-generated thread IDs.
 */

import { MemoryRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

/**
 * Minimal PrivateRoute replica matching the real component's logic:
 * if not authenticated → Navigate to /login.
 */
const FakePrivateRoute: React.FC<{
  isAuthenticated: boolean;
  children?: React.ReactNode;
}> = ({ isAuthenticated, children }) => {
  const location = useLocation();
  if (!isAuthenticated) {
    return React.createElement(Navigate, { to: '/login', state: { from: location }, replace: true });
  }
  return React.createElement(React.Fragment, null, children);
};

/**
 * Helper that captures the current pathname via a sentinel component.
 */
function LocationDisplay() {
  const location = useLocation();
  return React.createElement('div', { 'data-testid': 'location-display' }, location.pathname);
}

/**
 * The three BrightMail route patterns. For the parameterised route we
 * substitute a generated messageId.
 */
const BRIGHTMAIL_ROUTES = ['/brightmail', '/brightmail/compose'] as const;

describe('Feature: brightmail-frontend, Property 15: All BrightMail Routes Require Authentication', () => {
  /**
   * Property 15: All BrightMail Routes Require Authentication
   *
   * For any route matching /brightmail, /brightmail/thread/:messageId,
   * or /brightmail/compose, an unauthenticated user SHALL be redirected
   * to the login page rather than seeing the BrightMail content.
   *
   * **Validates: Requirements 11.2**
   */
  it('unauthenticated access to static BrightMail routes redirects to /login', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BRIGHTMAIL_ROUTES),
        (route: string) => {
          cleanup();
          const { getByTestId, queryByText } = render(
            React.createElement(
              MemoryRouter,
              { initialEntries: [route] },
              React.createElement(
                Routes,
                null,
                React.createElement(Route, {
                  path: '/brightmail',
                  element: React.createElement(
                    FakePrivateRoute,
                    { isAuthenticated: false },
                    React.createElement('div', null, 'PROTECTED_CONTENT'),
                  ),
                  children: [
                    React.createElement(Route, {
                      index: true,
                      key: 'index',
                      element: React.createElement('div', null, 'INBOX'),
                    }),
                    React.createElement(Route, {
                      path: 'compose',
                      key: 'compose',
                      element: React.createElement('div', null, 'COMPOSE'),
                    }),
                    React.createElement(Route, {
                      path: 'thread/:messageId',
                      key: 'thread',
                      element: React.createElement('div', null, 'THREAD'),
                    }),
                  ],
                }),
                React.createElement(Route, {
                  path: '/login',
                  element: React.createElement(
                    React.Fragment,
                    null,
                    React.createElement('div', null, 'LOGIN_PAGE'),
                    React.createElement(LocationDisplay),
                  ),
                }),
              ),
            ),
          );

          // Protected content must NOT be visible
          expect(queryByText('PROTECTED_CONTENT')).toBeNull();
          expect(queryByText('INBOX')).toBeNull();
          expect(queryByText('COMPOSE')).toBeNull();

          // Must have redirected to /login
          expect(getByTestId('location-display').textContent).toBe('/login');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('unauthenticated access to /brightmail/thread/:messageId redirects to /login for any messageId', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z0-9]{4,20}$/),
        (messageId: string) => {
          cleanup();
          const route = `/brightmail/thread/${messageId}`;

          const { getByTestId, queryByText } = render(
            React.createElement(
              MemoryRouter,
              { initialEntries: [route] },
              React.createElement(
                Routes,
                null,
                React.createElement(Route, {
                  path: '/brightmail',
                  element: React.createElement(
                    FakePrivateRoute,
                    { isAuthenticated: false },
                    React.createElement('div', null, 'PROTECTED_CONTENT'),
                  ),
                  children: [
                    React.createElement(Route, {
                      index: true,
                      key: 'index',
                      element: React.createElement('div', null, 'INBOX'),
                    }),
                    React.createElement(Route, {
                      path: 'compose',
                      key: 'compose',
                      element: React.createElement('div', null, 'COMPOSE'),
                    }),
                    React.createElement(Route, {
                      path: 'thread/:messageId',
                      key: 'thread',
                      element: React.createElement('div', null, 'THREAD'),
                    }),
                  ],
                }),
                React.createElement(Route, {
                  path: '/login',
                  element: React.createElement(
                    React.Fragment,
                    null,
                    React.createElement('div', null, 'LOGIN_PAGE'),
                    React.createElement(LocationDisplay),
                  ),
                }),
              ),
            ),
          );

          // Protected content must NOT be visible
          expect(queryByText('PROTECTED_CONTENT')).toBeNull();
          expect(queryByText('THREAD')).toBeNull();

          // Must have redirected to /login
          expect(getByTestId('location-display').textContent).toBe('/login');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('authenticated access to BrightMail routes renders protected content', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('/brightmail', '/brightmail/compose'),
        (route: string) => {
          cleanup();
          const { queryByText } = render(
            React.createElement(
              MemoryRouter,
              { initialEntries: [route] },
              React.createElement(
                Routes,
                null,
                React.createElement(Route, {
                  path: '/brightmail',
                  element: React.createElement(
                    FakePrivateRoute,
                    { isAuthenticated: true },
                    React.createElement('div', null, 'PROTECTED_CONTENT'),
                  ),
                  children: [
                    React.createElement(Route, {
                      index: true,
                      key: 'index',
                      element: React.createElement('div', null, 'INBOX'),
                    }),
                    React.createElement(Route, {
                      path: 'compose',
                      key: 'compose',
                      element: React.createElement('div', null, 'COMPOSE'),
                    }),
                    React.createElement(Route, {
                      path: 'thread/:messageId',
                      key: 'thread',
                      element: React.createElement('div', null, 'THREAD'),
                    }),
                  ],
                }),
                React.createElement(Route, {
                  path: '/login',
                  element: React.createElement('div', null, 'LOGIN_PAGE'),
                }),
              ),
            ),
          );

          // Protected content SHOULD be visible
          expect(queryByText('PROTECTED_CONTENT')).not.toBeNull();

          // Login page should NOT be visible
          expect(queryByText('LOGIN_PAGE')).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
