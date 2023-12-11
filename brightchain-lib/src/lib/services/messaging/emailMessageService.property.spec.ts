/**
 * @fileoverview Property-based tests for EmailMessageService
 *
 * **Feature: email-messaging-protocol**
 *
 * This test suite verifies:
 * - Property 3: Message-ID Uniqueness and Format
 * - Property 15: Required Header Auto-Generation
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 1.3, 1.5, 15.4**
 *
 * Per RFC 5322 Section 3.6.4 and the design document:
 * - Message-IDs SHALL match the format `<id-left@id-right>` (enclosed in angle brackets, exactly one @ character)
 * - Message-IDs SHALL be globally unique (no duplicates in any generated set)
 * - The id-right portion SHALL contain the sender's node identifier (configured nodeId)
 * - Required headers (Message-ID, Date) SHALL be auto-generated when not provided
 */

import fc from 'fast-check';
import type { IGossipService } from '../../interfaces/availability/gossipService';
import { createMailbox } from '../../interfaces/messaging/emailAddress';
import {
  EmailMessageService,
  type IEmailMetadataStore,
} from './emailMessageService';
import type { MessageCBLService } from './messageCBLService';

// Feature: email-messaging-protocol, Property 3: Message-ID Uniqueness and Format

// ─── Test Helpers ───────────────────────────────────────────────────────────

/**
 * Minimal stubs for EmailMessageService dependencies.
 * generateMessageId() does not use any of these, so empty stubs suffice.
 */
const mockMessageCBLService = {} as MessageCBLService;
const mockGossipService = {
  announceBlock: jest.fn(),
  announceRemoval: jest.fn(),
  handleAnnouncement: jest.fn(),
  onAnnouncement: jest.fn(),
  offAnnouncement: jest.fn(),
  getPendingAnnouncements: jest.fn().mockReturnValue([]),
  flushAnnouncements: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  getConfig: jest.fn(),
  announceMessage: jest.fn().mockResolvedValue(undefined),
  sendDeliveryAck: jest.fn(),
  onMessageDelivery: jest.fn(),
  offMessageDelivery: jest.fn(),
  onDeliveryAck: jest.fn(),
  offDeliveryAck: jest.fn(),
} as unknown as IGossipService;
const mockMetadataStore: IEmailMetadataStore = {
  store: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
  queryInbox: jest.fn(),
  getUnreadCount: jest.fn(),
  markAsRead: jest.fn(),
  getThread: jest.fn(),
  getRootMessage: jest.fn(),
};

/**
 * Creates an EmailMessageService instance with the given nodeId.
 */
function createServiceWithNodeId(nodeId: string): EmailMessageService {
  return new EmailMessageService(
    mockMessageCBLService,
    mockMetadataStore,
    mockGossipService,
    { nodeId },
  );
}

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Generator for valid node ID strings.
 * Node IDs are domain-like identifiers: alphanumeric characters, hyphens, and dots.
 * Must be non-empty and not start/end with a hyphen or dot.
 */
const arbNodeIdChar = fc.constantFrom(
  ...'abcdefghijklmnopqrstuvwxyz0123456789-.'.split(''),
);

const arbNodeId: fc.Arbitrary<string> = fc
  .tuple(
    // First character: alphanumeric only
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
    // Middle characters: alphanumeric, hyphens, dots
    fc.array(arbNodeIdChar, { minLength: 0, maxLength: 50 }),
    // Last character: alphanumeric only
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
  )
  .map(([first, middle, last]) => first + middle.join('') + last);

/**
 * Generator for batch sizes used in uniqueness tests.
 * We test batches of 2 to 50 Message-IDs.
 */
const arbBatchSize: fc.Arbitrary<number> = fc.integer({ min: 2, max: 50 });

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Property 3: Message-ID Uniqueness and Format', () => {
  /**
   * **Feature: email-messaging-protocol, Property 3: Message-ID Uniqueness and Format**
   *
   * *For any* generated Message-ID, it SHALL match the format `<id-left@id-right>`
   * where the ID is enclosed in angle brackets and contains exactly one @ character.
   *
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
   */
  it('should generate Message-IDs matching the format <id-left@id-right>', () => {
    fc.assert(
      fc.property(arbNodeId, (nodeId) => {
        const service = createServiceWithNodeId(nodeId);
        const messageId = service.generateMessageId();

        // Must start with < and end with >
        expect(messageId.startsWith('<')).toBe(true);
        expect(messageId.endsWith('>')).toBe(true);

        // Extract inner content (without angle brackets)
        const inner = messageId.slice(1, -1);

        // Must contain exactly one @ character
        const atCount = (inner.match(/@/g) || []).length;
        expect(atCount).toBe(1);

        // Must have non-empty id-left and id-right
        const atIndex = inner.indexOf('@');
        const idLeft = inner.slice(0, atIndex);
        const idRight = inner.slice(atIndex + 1);
        expect(idLeft.length).toBeGreaterThan(0);
        expect(idRight.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 3: Message-ID Uniqueness and Format**
   *
   * *For any* batch of N generated Message-IDs (where N is between 2 and 50),
   * all Message-IDs in the batch SHALL be unique (no duplicates).
   *
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
   */
  it('should generate globally unique Message-IDs within any batch', () => {
    fc.assert(
      fc.property(arbBatchSize, (batchSize) => {
        const service = createServiceWithNodeId('test-node.brightchain.org');
        const ids: string[] = [];

        for (let i = 0; i < batchSize; i++) {
          ids.push(service.generateMessageId());
        }

        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(batchSize);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 3: Message-ID Uniqueness and Format**
   *
   * *For any* configured nodeId, the id-right portion of every generated Message-ID
   * SHALL exactly equal the configured nodeId.
   *
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
   */
  it('should always include the configured nodeId as the id-right portion', () => {
    fc.assert(
      fc.property(arbNodeId, (nodeId) => {
        const service = createServiceWithNodeId(nodeId);
        const messageId = service.generateMessageId();

        // Extract id-right: everything after @ and before closing >
        const inner = messageId.slice(1, -1);
        const atIndex = inner.indexOf('@');
        const idRight = inner.slice(atIndex + 1);

        expect(idRight).toBe(nodeId);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 3: Message-ID Uniqueness and Format**
   *
   * *For any* configured nodeId and any batch of generated Message-IDs,
   * uniqueness SHALL hold even when the same nodeId is used across all IDs.
   * This validates that the id-left portion (timestamp + random) provides
   * sufficient entropy for uniqueness.
   *
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
   */
  it('should maintain uniqueness across batches with the same nodeId', () => {
    fc.assert(
      fc.property(arbNodeId, arbBatchSize, (nodeId, batchSize) => {
        const service = createServiceWithNodeId(nodeId);
        const ids: string[] = [];

        for (let i = 0; i < batchSize; i++) {
          ids.push(service.generateMessageId());
        }

        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(batchSize);
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: email-messaging-protocol, Property 15: Required Header Auto-Generation

// ─── Property 15 Test Helpers ───────────────────────────────────────────────

/**
 * Creates an EmailMessageService with mocked dependencies suitable for sendEmail() testing.
 * The metadataStore.store mock captures the stored metadata for inspection.
 * The gossipService.announceMessage mock resolves to undefined.
 *
 * @returns An object with the service, the store mock, and the announceMessage mock.
 */
function createServiceForSendEmail(nodeId = 'test-node.brightchain.org') {
  const storeMock = jest.fn().mockResolvedValue(undefined);
  const announceMessageMock = jest
    .fn()
    .mockResolvedValue(undefined) as jest.Mock;

  const metadataStoreMock: IEmailMetadataStore = {
    store: storeMock,
    get: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    queryInbox: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    getThread: jest.fn(),
    getRootMessage: jest.fn(),
  };

  const gossipServiceMock = {
    announceBlock: jest.fn(),
    announceRemoval: jest.fn(),
    handleAnnouncement: jest.fn(),
    onAnnouncement: jest.fn(),
    offAnnouncement: jest.fn(),
    getPendingAnnouncements: jest.fn().mockReturnValue([]),
    flushAnnouncements: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    getConfig: jest.fn(),
    announceMessage: announceMessageMock,
    sendDeliveryAck: jest.fn(),
    onMessageDelivery: jest.fn(),
    offMessageDelivery: jest.fn(),
    onDeliveryAck: jest.fn(),
    offDeliveryAck: jest.fn(),
  } as unknown as IGossipService;

  const service = new EmailMessageService(
    {} as MessageCBLService,
    metadataStoreMock,
    gossipServiceMock,
    { nodeId },
  );

  return { service, storeMock, announceMessageMock };
}

// ─── Property 15 Generators ────────────────────────────────────────────────

/**
 * Generator for valid email local-parts.
 * Produces simple alphanumeric local-parts (1-20 chars) that are always valid.
 */
const arbLocalPart: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-z][a-z0-9]{0,19}$/,
);

/**
 * Generator for valid email domains.
 * Produces simple domain names like "example.com", "test.org", etc.
 */
const arbDomain: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringMatching(/^[a-z]{2,15}$/),
    fc.constantFrom('com', 'org', 'net', 'io', 'dev'),
  )
  .map(([name, tld]) => `${name}.${tld}`);

/**
 * Generator for valid IMailbox objects using createMailbox().
 * Display names are constrained to simple alphanumeric strings to avoid
 * validation failures from special characters (quotes, angle brackets, etc.).
 */
const arbMailbox: fc.Arbitrary<
  import('../../interfaces/messaging/emailAddress').IMailbox
> = fc
  .tuple(
    arbLocalPart,
    arbDomain,
    fc.option(
      fc
        .stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,28}$/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      { nil: undefined },
    ),
  )
  .map(([localPart, domain, displayName]) =>
    createMailbox(localPart, domain, displayName),
  );

/**
 * Generator for non-empty arrays of mailboxes (for recipients).
 */
const arbRecipients: fc.Arbitrary<
  import('../../interfaces/messaging/emailAddress').IMailbox[]
> = fc.array(arbMailbox, { minLength: 1, maxLength: 5 });

/**
 * Generator for optional email subject lines.
 */
const arbSubject: fc.Arbitrary<string | undefined> = fc.option(
  fc.string({ minLength: 0, maxLength: 100 }),
  { nil: undefined },
);

/**
 * Generator for optional plain text body content.
 */
const arbTextBody: fc.Arbitrary<string | undefined> = fc.option(
  fc.string({ minLength: 1, maxLength: 200 }),
  { nil: undefined },
);

// ─── Property 15 Tests ─────────────────────────────────────────────────────

describe('Property 15: Required Header Auto-Generation', () => {
  /**
   * **Feature: email-messaging-protocol, Property 15: Required Header Auto-Generation**
   *
   * *For any* valid email input WITHOUT a messageId, sendEmail() SHALL auto-generate
   * a valid Message-ID matching the format `<id-left@id-right>` (enclosed in angle
   * brackets with exactly one @ character).
   *
   * **Validates: Requirements 1.3, 1.5, 15.4**
   */
  it('should auto-generate a valid Message-ID when not provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbRecipients,
        arbSubject,
        arbTextBody,
        async (from, to, subject, textBody) => {
          const { service, storeMock } = createServiceForSendEmail();

          const input = {
            from,
            to,
            subject,
            textBody: textBody ?? 'default body',
            // messageId intentionally omitted
          };

          const result = await service.sendEmail(input);

          // The result should contain an auto-generated messageId
          expect(result.messageId).toBeDefined();
          expect(typeof result.messageId).toBe('string');

          // Must match <id-left@id-right> format
          expect(result.messageId.startsWith('<')).toBe(true);
          expect(result.messageId.endsWith('>')).toBe(true);

          const inner = result.messageId.slice(1, -1);
          const atCount = (inner.match(/@/g) || []).length;
          expect(atCount).toBe(1);

          // id-left and id-right must be non-empty
          const atIndex = inner.indexOf('@');
          expect(inner.slice(0, atIndex).length).toBeGreaterThan(0);
          expect(inner.slice(atIndex + 1).length).toBeGreaterThan(0);

          // The stored metadata should also have the same messageId
          if (result.success && storeMock.mock.calls.length > 0) {
            const storedMetadata = storeMock.mock.calls[0][0];
            expect(storedMetadata.messageId).toBe(result.messageId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 15: Required Header Auto-Generation**
   *
   * *For any* valid email input WITHOUT a date, sendEmail() SHALL auto-generate
   * a valid Date that is a proper Date instance and is close to the current time.
   *
   * **Validates: Requirements 1.3, 1.5, 15.4**
   */
  it('should auto-generate a valid Date when not provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbRecipients,
        arbSubject,
        arbTextBody,
        async (from, to, subject, textBody) => {
          const { service, storeMock } = createServiceForSendEmail();

          const beforeSend = new Date();

          const input = {
            from,
            to,
            subject,
            textBody: textBody ?? 'default body',
            // date intentionally omitted
          };

          const result = await service.sendEmail(input);

          const afterSend = new Date();

          // Only check stored metadata if the send was successful
          if (result.success && storeMock.mock.calls.length > 0) {
            const storedMetadata = storeMock.mock.calls[0][0];

            // The auto-generated date must be a valid Date instance
            expect(storedMetadata.date).toBeInstanceOf(Date);

            // The auto-generated date must be between beforeSend and afterSend
            expect(storedMetadata.date.getTime()).toBeGreaterThanOrEqual(
              beforeSend.getTime(),
            );
            expect(storedMetadata.date.getTime()).toBeLessThanOrEqual(
              afterSend.getTime(),
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 15: Required Header Auto-Generation**
   *
   * *For any* valid email input with auto-generated headers (no explicit messageId
   * or date), the sendEmail() result SHALL have `success: true`, confirming that
   * auto-generated headers pass validation.
   *
   * **Validates: Requirements 1.3, 1.5, 15.4**
   */
  it('should return success when headers are auto-generated', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbRecipients,
        arbSubject,
        arbTextBody,
        async (from, to, subject, textBody) => {
          const { service } = createServiceForSendEmail();

          const input = {
            from,
            to,
            subject,
            textBody: textBody ?? 'default body',
            // Both messageId and date intentionally omitted
          };

          const result = await service.sendEmail(input);

          // The email with auto-generated headers must pass validation
          expect(result.success).toBe(true);
          expect(result.messageId).toBeDefined();
          expect(result.messageId.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
