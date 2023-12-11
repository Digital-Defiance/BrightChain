/**
 * @fileoverview Property-based tests for BCC Privacy Invariant
 *
 * **Feature: email-messaging-protocol**
 *
 * This test suite verifies:
 * - Property 5: BCC Privacy Invariant
 *
 * **Validates: Requirements 9.2, 9.3, 16.2**
 *
 * Per the design document and RFC 5322:
 * - To/CC recipient copies SHALL NOT contain the Bcc header field
 * - To/CC recipient copies SHALL NOT contain any BCC recipient information
 * - To/CC recipient copies SHALL NOT contain BCC delivery tracking
 * - Each BCC recipient's copy SHALL NOT contain information about other BCC recipients
 * - BCC copies SHALL use per-recipient encryption (RECIPIENT_KEYS scheme)
 */

import fc from 'fast-check';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import type { IGossipService } from '../../interfaces/availability/gossipService';
import {
  createMailbox,
  type IMailbox,
} from '../../interfaces/messaging/emailAddress';
import type { IEmailMetadata } from '../../interfaces/messaging/emailMetadata';
import {
  EmailMessageService,
  type IEmailInput,
  type IEmailMetadataStore,
} from './emailMessageService';
import type { MessageCBLService } from './messageCBLService';

// Feature: email-messaging-protocol, Property 5: BCC Privacy Invariant

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Generator for valid email local-parts.
 */
const arbLocalPart: fc.Arbitrary<string> =
  fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/);

/**
 * Generator for valid email domains.
 */
const arbDomain: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringMatching(/^[a-z]{2,10}$/),
    fc.constantFrom('com', 'org', 'net', 'io'),
  )
  .map(([name, tld]) => `${name}.${tld}`);

/**
 * Generator for valid IMailbox objects.
 */
const arbMailbox: fc.Arbitrary<IMailbox> = fc
  .tuple(arbLocalPart, arbDomain)
  .map(([localPart, domain]) => createMailbox(localPart, domain));

/**
 * Generator for non-empty arrays of unique mailboxes.
 * Ensures no duplicate addresses across the generated set.
 */
function arbUniqueMailboxes(
  min: number,
  max: number,
): fc.Arbitrary<IMailbox[]> {
  return fc
    .array(arbMailbox, { minLength: min, maxLength: max })
    .map((mailboxes) => {
      const seen = new Set<string>();
      return mailboxes.filter((m) => {
        if (seen.has(m.address)) return false;
        seen.add(m.address);
        return true;
      });
    })
    .filter((arr) => arr.length >= min);
}

// ─── Test Helpers ───────────────────────────────────────────────────────────

/**
 * Creates an EmailMessageService with mocked dependencies that capture
 * all store and deliver calls for inspection.
 */
function createTestService() {
  const storeCalls: IEmailMetadata[] = [];
  const announceCalls: Array<{
    blockIds: string[];
    metadata: {
      messageId: string;
      recipientIds: string[];
      priority: string;
      ackRequired: boolean;
      cblBlockId: string;
      blockIds: string[];
    };
  }> = [];

  const storeMock = jest
    .fn()
    .mockImplementation(async (metadata: IEmailMetadata) => {
      storeCalls.push(metadata);
    });

  const announceMessageMock = jest.fn().mockImplementation(
    async (
      blockIds: string[],
      metadata: {
        messageId: string;
        recipientIds: string[];
        priority: string;
        ackRequired: boolean;
        cblBlockId: string;
        blockIds: string[];
      },
    ) => {
      announceCalls.push({ blockIds, metadata });
    },
  );

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
    { nodeId: 'test-node.brightchain.org' },
  );

  return { service, storeCalls, announceCalls };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Property 5: BCC Privacy Invariant', () => {
  /**
   * **Feature: email-messaging-protocol, Property 5: BCC Privacy Invariant**
   *
   * *For any* email sent with BCC recipients, the copy delivered to To/CC
   * recipients SHALL NOT contain the Bcc header field or any BCC recipient
   * information.
   *
   * **Validates: Requirements 9.2, 9.3, 16.2**
   */
  it('To/CC delivery copies should not contain any BCC information', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 3),
        arbUniqueMailboxes(1, 3),
        async (from, toRecipients, bccRecipients) => {
          // Ensure BCC addresses don't overlap with To addresses
          const toAddrs = new Set(toRecipients.map((m) => m.address));
          const filteredBcc = bccRecipients.filter(
            (m) => !toAddrs.has(m.address),
          );
          if (filteredBcc.length === 0) return; // skip if all overlap

          const { service, storeCalls } = createTestService();

          const input: IEmailInput = {
            from,
            to: toRecipients,
            bcc: filteredBcc,
            textBody: 'Test message',
          };

          const result = await service.sendEmail(input);
          if (!result.success) return; // skip validation failures

          const bccAddresses = new Set(filteredBcc.map((m) => m.address));

          // Find the To/CC delivery copy (has blockId ending with '-tocc')
          const toCcCopy = storeCalls.find(
            (m) => typeof m.blockId === 'string' && m.blockId.endsWith('-tocc'),
          );

          expect(toCcCopy).toBeDefined();
          if (!toCcCopy) return;

          // 1. The Bcc field must be undefined
          expect(toCcCopy.bcc).toBeUndefined();

          // 2. No BCC addresses in the recipients array
          for (const bccAddr of bccAddresses) {
            expect(toCcCopy.recipients).not.toContain(bccAddr);
          }

          // 3. No BCC delivery tracking in deliveryStatus
          for (const bccAddr of bccAddresses) {
            expect(toCcCopy.deliveryStatus.has(bccAddr)).toBe(false);
          }

          // 4. No BCC delivery receipts
          for (const bccAddr of bccAddresses) {
            expect(toCcCopy.deliveryReceipts.has(bccAddr)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 5: BCC Privacy Invariant**
   *
   * *For any* email sent with multiple BCC recipients, each BCC recipient's
   * copy SHALL NOT contain information about other BCC recipients.
   *
   * **Validates: Requirements 9.2, 9.3, 16.2**
   */
  it('each BCC recipient copy should not contain other BCC recipients', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 2),
        arbUniqueMailboxes(2, 4),
        async (from, toRecipients, bccRecipients) => {
          // Ensure BCC addresses don't overlap with To addresses
          const toAddrs = new Set(toRecipients.map((m) => m.address));
          const filteredBcc = bccRecipients.filter(
            (m) => !toAddrs.has(m.address),
          );
          if (filteredBcc.length < 2) return; // need at least 2 BCC for this test

          const { service, storeCalls } = createTestService();

          const input: IEmailInput = {
            from,
            to: toRecipients,
            bcc: filteredBcc,
            textBody: 'Test message',
          };

          const result = await service.sendEmail(input);
          if (!result.success) return;

          // Find BCC copies (blockId contains '-bcc-')
          const bccCopies = storeCalls.filter(
            (m) => typeof m.blockId === 'string' && m.blockId.includes('-bcc-'),
          );

          // Should have one copy per BCC recipient
          expect(bccCopies.length).toBe(filteredBcc.length);

          for (const bccCopy of bccCopies) {
            // Extract which BCC recipient this copy is for from the blockId
            const bccAddrInBlockId = bccCopy.blockId.split('-bcc-')[1];

            // 1. No Bcc header
            expect(bccCopy.bcc).toBeUndefined();

            // 2. Other BCC recipients should not appear in this copy's recipients
            for (const otherBcc of filteredBcc) {
              if (otherBcc.address === bccAddrInBlockId) continue;
              expect(bccCopy.recipients).not.toContain(otherBcc.address);
            }

            // 3. Other BCC recipients should not appear in deliveryStatus
            for (const otherBcc of filteredBcc) {
              if (otherBcc.address === bccAddrInBlockId) continue;
              expect(bccCopy.deliveryStatus.has(otherBcc.address)).toBe(false);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 5: BCC Privacy Invariant**
   *
   * *For any* email sent with BCC recipients, each BCC copy SHALL use
   * per-recipient encryption (RECIPIENT_KEYS scheme) to ensure
   * cryptographic separation.
   *
   * **Validates: Requirements 9.3, 16.2**
   */
  it('BCC copies should use per-recipient encryption', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 2),
        arbUniqueMailboxes(1, 3),
        async (from, toRecipients, bccRecipients) => {
          const toAddrs = new Set(toRecipients.map((m) => m.address));
          const filteredBcc = bccRecipients.filter(
            (m) => !toAddrs.has(m.address),
          );
          if (filteredBcc.length === 0) return;

          const { service, storeCalls } = createTestService();

          const input: IEmailInput = {
            from,
            to: toRecipients,
            bcc: filteredBcc,
            textBody: 'Test message',
          };

          const result = await service.sendEmail(input);
          if (!result.success) return;

          // Find BCC copies
          const bccCopies = storeCalls.filter(
            (m) => typeof m.blockId === 'string' && m.blockId.includes('-bcc-'),
          );

          for (const bccCopy of bccCopies) {
            expect(bccCopy.encryptionScheme).toBe(
              MessageEncryptionScheme.RECIPIENT_KEYS,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 5: BCC Privacy Invariant**
   *
   * *For any* email sent with BCC recipients, delivery calls for To/CC
   * recipients SHALL NOT include any BCC recipients.
   *
   * **Validates: Requirements 9.2, 9.3**
   */
  it('delivery to To/CC should not include BCC recipients', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 3),
        arbUniqueMailboxes(1, 3),
        async (from, toRecipients, bccRecipients) => {
          const toAddrs = new Set(toRecipients.map((m) => m.address));
          const filteredBcc = bccRecipients.filter(
            (m) => !toAddrs.has(m.address),
          );
          if (filteredBcc.length === 0) return;

          const { service, announceCalls } = createTestService();

          const input: IEmailInput = {
            from,
            to: toRecipients,
            bcc: filteredBcc,
            textBody: 'Test message',
          };

          const result = await service.sendEmail(input);
          if (!result.success) return;

          const bccAddresses = new Set(filteredBcc.map((m) => m.address));

          // First announce call is for To/CC recipients
          expect(announceCalls.length).toBeGreaterThanOrEqual(1);
          const toCcDelivery = announceCalls[0];

          // No BCC addresses in the To/CC delivery call
          for (const recipientId of toCcDelivery.metadata.recipientIds) {
            expect(bccAddresses.has(recipientId)).toBe(false);
          }

          // Each subsequent announce call should be for exactly one BCC recipient
          for (let i = 1; i < announceCalls.length; i++) {
            const bccDelivery = announceCalls[i];
            expect(bccDelivery.metadata.recipientIds).toHaveLength(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
