/**
 * @fileoverview Property-based tests for email threading consistency
 *
 * **Feature: email-messaging-protocol, Property 7: Threading Consistency**
 *
 * **Validates: Requirements 10.1, 10.2, 10.3**
 *
 * Per RFC 5322 Section 3.6.4 and the design document:
 * - The In-Reply-To header SHALL equal the parent message's Message-ID
 * - The References header SHALL contain all Message-IDs from the parent's
 *   References header plus the parent's Message-ID
 * - The References header SHALL contain at most 20 Message-IDs
 *   (truncated from the beginning if necessary)
 */

import fc from 'fast-check';
import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import type { IGossipService } from '../../interfaces/availability/gossipService';
import type { IMailbox } from '../../interfaces/messaging/emailAddress';
import { createMailbox } from '../../interfaces/messaging/emailAddress';
import type { IEmailMetadata } from '../../interfaces/messaging/emailMetadata';
import { createContentType } from '../../interfaces/messaging/mimePart';
import {
  EmailMessageService,
  type IEmailMetadataStore,
  type IReplyInput,
} from './emailMessageService';
import type { MessageCBLService } from './messageCBLService';

// Feature: email-messaging-protocol, Property 7: Threading Consistency

// ─── Generators ─────────────────────────────────────────────────────────────

const arbLocalPart: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-z][a-z0-9]{0,19}$/,
);

const arbDomain: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringMatching(/^[a-z]{2,15}$/),
    fc.constantFrom('com', 'org', 'net', 'io', 'dev'),
  )
  .map(([name, tld]) => `${name}.${tld}`);

const arbMailbox: fc.Arbitrary<IMailbox> = fc
  .tuple(arbLocalPart, arbDomain)
  .map(([localPart, domain]) => createMailbox(localPart, domain));

/**
 * Generator for valid Message-ID strings in the format <id@domain>.
 */
const arbMessageId: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{4,20}$/),
    fc.stringMatching(/^[a-z]{2,10}\.[a-z]{2,4}$/),
  )
  .map(([id, domain]) => `<${id}@${domain}>`);

/**
 * Generator for References arrays of varying lengths.
 * Produces arrays of 0 to 30 Message-IDs to test truncation behavior.
 */
const arbReferences: fc.Arbitrary<string[]> = fc.array(arbMessageId, {
  minLength: 0,
  maxLength: 30,
});

// ─── Test Helpers ───────────────────────────────────────────────────────────

function buildMockMetadata(overrides: Partial<IEmailMetadata>): IEmailMetadata {
  const now = new Date();
  const from = createMailbox('sender', 'example.com');
  const to = [createMailbox('recipient', 'example.com')];
  return {
    blockId: 'block-1',
    createdAt: now,
    expiresAt: null,
    durabilityLevel: DurabilityLevel.Standard,
    parityBlockIds: [],
    accessCount: 0,
    lastAccessedAt: now,
    replicationStatus: ReplicationStatus.Pending,
    targetReplicationFactor: 0,
    replicaNodeIds: [],
    size: 100,
    checksum: '',
    messageType: 'email',
    senderId: from.address,
    recipients: to.map((m) => m.address),
    priority: MessagePriority.NORMAL,
    deliveryStatus: new Map(),
    acknowledgments: new Map(),
    encryptionScheme: MessageEncryptionScheme.NONE,
    isCBL: false,
    cblBlockIds: [],
    from,
    to,
    messageId: '<default@example.com>',
    date: now,
    mimeVersion: '1.0',
    contentType: createContentType(
      'text',
      'plain',
      new Map([['charset', 'utf-8']]),
    ),
    customHeaders: new Map(),
    deliveryReceipts: new Map(),
    readReceipts: new Map(),
    ...overrides,
  };
}

function createServiceForReply(
  storedEmails: Map<string, IEmailMetadata>,
  maxReferencesCount = 20,
) {
  const storeMock = jest.fn().mockResolvedValue(undefined);
  const getMock = jest
    .fn()
    .mockImplementation((messageId: string) =>
      Promise.resolve(storedEmails.get(messageId) ?? null),
    );
  const deliverMock = jest.fn().mockResolvedValue(new Map()) as jest.Mock;

  const metadataStoreMock: IEmailMetadataStore = {
    store: storeMock,
    get: getMock,
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
    announceMessage: deliverMock,
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
    { nodeId: 'test-node.brightchain.org', maxReferencesCount },
  );

  return { service, storeMock, getMock };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Property 7: Threading Consistency', () => {
  /**
   * **Feature: email-messaging-protocol, Property 7: Threading Consistency**
   *
   * *For any* reply created using createReply(), the In-Reply-To header
   * SHALL equal the parent message's Message-ID.
   *
   * **Validates: Requirements 10.1, 10.2, 10.3**
   */
  it('should set In-Reply-To to the parent message Message-ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMessageId,
        arbReferences,
        arbMailbox,
        arbMailbox,
        async (parentMessageId, parentReferences, parentFrom, replierFrom) => {
          const parentMetadata = buildMockMetadata({
            messageId: parentMessageId,
            references: parentReferences,
            from: parentFrom,
            to: [replierFrom],
          });

          const storedEmails = new Map<string, IEmailMetadata>();
          storedEmails.set(parentMessageId, parentMetadata);

          const { service, storeMock } = createServiceForReply(storedEmails);

          const replyInput: IReplyInput = {
            from: replierFrom,
            textBody: 'Reply body',
          };

          const result = await service.createReply(parentMessageId, replyInput);

          expect(result.success).toBe(true);

          // The stored reply metadata should have In-Reply-To = parent's Message-ID
          if (storeMock.mock.calls.length > 0) {
            const storedReply = storeMock.mock.calls[0][0] as IEmailMetadata;
            expect(storedReply.inReplyTo).toBe(parentMessageId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 7: Threading Consistency**
   *
   * *For any* reply created using createReply(), the References header
   * SHALL contain all Message-IDs from the parent's References header
   * plus the parent's Message-ID (subject to the 20-ID limit).
   *
   * **Validates: Requirements 10.1, 10.2, 10.3**
   */
  it('should construct References from parent References + parent Message-ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMessageId,
        arbReferences,
        arbMailbox,
        arbMailbox,
        async (parentMessageId, parentReferences, parentFrom, replierFrom) => {
          const parentMetadata = buildMockMetadata({
            messageId: parentMessageId,
            references: parentReferences,
            from: parentFrom,
            to: [replierFrom],
          });

          const storedEmails = new Map<string, IEmailMetadata>();
          storedEmails.set(parentMessageId, parentMetadata);

          const { service, storeMock } = createServiceForReply(storedEmails);

          const replyInput: IReplyInput = {
            from: replierFrom,
            textBody: 'Reply body',
          };

          const result = await service.createReply(parentMessageId, replyInput);

          expect(result.success).toBe(true);

          if (storeMock.mock.calls.length > 0) {
            const storedReply = storeMock.mock.calls[0][0] as IEmailMetadata;
            const expectedFull = [...parentReferences, parentMessageId];
            const maxRefs = 20;

            // References should be the tail of expectedFull, limited to maxRefs
            const expected =
              expectedFull.length > maxRefs
                ? expectedFull.slice(expectedFull.length - maxRefs)
                : expectedFull;

            expect(storedReply.references).toEqual(expected);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 7: Threading Consistency**
   *
   * *For any* reply created using createReply(), the References header
   * SHALL contain at most 20 Message-IDs (truncated from the beginning
   * if necessary).
   *
   * **Validates: Requirements 10.1, 10.2, 10.3**
   */
  it('should limit References to at most maxReferencesCount entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMessageId,
        arbReferences,
        arbMailbox,
        arbMailbox,
        async (parentMessageId, parentReferences, parentFrom, replierFrom) => {
          const parentMetadata = buildMockMetadata({
            messageId: parentMessageId,
            references: parentReferences,
            from: parentFrom,
            to: [replierFrom],
          });

          const storedEmails = new Map<string, IEmailMetadata>();
          storedEmails.set(parentMessageId, parentMetadata);

          const { service, storeMock } = createServiceForReply(storedEmails);

          const replyInput: IReplyInput = {
            from: replierFrom,
            textBody: 'Reply body',
          };

          const result = await service.createReply(parentMessageId, replyInput);

          expect(result.success).toBe(true);

          if (storeMock.mock.calls.length > 0) {
            const storedReply = storeMock.mock.calls[0][0] as IEmailMetadata;
            expect(storedReply.references!.length).toBeLessThanOrEqual(20);

            // The last entry should always be the parent's Message-ID
            const refs = storedReply.references!;
            expect(refs[refs.length - 1]).toBe(parentMessageId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
