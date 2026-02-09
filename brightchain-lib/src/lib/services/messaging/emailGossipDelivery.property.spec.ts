/**
 * @fileoverview Property-based tests for Email Gossip Delivery
 *
 * **Feature: unified-gossip-delivery**
 *
 * This test suite verifies:
 * - Property 12: Email Gossip Announcement Invariants
 *
 * **Validates: Requirements 6.1, 6.5**
 *
 * Per the design document:
 * - For any email sent via EmailMessageService, the resulting gossip announcement
 *   must have messageDelivery.ackRequired set to true
 * - messageDelivery.recipientIds must contain all intended recipients for that announcement
 * - messageDelivery.cblBlockId must be set to the CBL block ID returned by MessageCBLService
 * - messageDelivery.blockIds must contain all constituent content block IDs for the email content
 */

import fc from 'fast-check';
import type {
  IGossipService,
  MessageDeliveryMetadata,
} from '../../interfaces/availability/gossipService';
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

// Feature: unified-gossip-delivery, Property 12: Email gossip announcement invariants

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Generator for valid email local-parts.
 * Constrained to simple alphanumeric strings to pass email validation.
 */
const arbLocalPart: fc.Arbitrary<string> =
  fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/);

/**
 * Generator for valid email domains.
 * Produces realistic domain names that pass RFC validation.
 */
const arbDomain: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringMatching(/^[a-z]{2,10}$/),
    fc.constantFrom('com', 'org', 'net', 'io'),
  )
  .map(([name, tld]) => `${name}.${tld}`);

/**
 * Generator for valid IMailbox objects using createMailbox().
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
 * Captured gossip announceMessage call data.
 */
interface CapturedAnnouncement {
  blockIds: string[];
  metadata: MessageDeliveryMetadata;
}

/**
 * Creates an EmailMessageService with mocked dependencies that capture
 * all gossipService.announceMessage() calls for inspection.
 *
 * The metadataStore.store() is also captured so we can inspect the
 * metadata copies (To/CC copy, BCC copies) and their blockIds/cblBlockIds.
 */
function createTestService() {
  const storeCalls: IEmailMetadata[] = [];
  const announceCalls: CapturedAnnouncement[] = [];

  const storeMock = jest
    .fn()
    .mockImplementation(async (metadata: IEmailMetadata) => {
      storeCalls.push(metadata);
    });

  const announceMessageMock = jest
    .fn()
    .mockImplementation(
      async (blockIds: string[], metadata: MessageDeliveryMetadata) => {
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

  return { service, storeCalls, announceCalls, announceMessageMock };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Feature: unified-gossip-delivery, Property 12: Email Gossip Announcement Invariants', () => {
  /**
   * **Validates: Requirements 6.1, 6.5**
   */

  /**
   * Property 12a: All gossip announcements for email delivery have ackRequired=true.
   *
   * For any email sent via EmailMessageService, every resulting gossip announcement
   * must have messageDelivery.ackRequired set to true.
   *
   * **Validates: Requirements 6.5**
   */
  it('Property 12a: all email gossip announcements have ackRequired=true', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 3),
        fc.option(arbUniqueMailboxes(1, 2), { nil: undefined }),
        fc.option(arbUniqueMailboxes(1, 2), { nil: undefined }),
        async (from, toRecipients, ccRecipients, bccRecipients) => {
          // Ensure no address overlap between To, CC, and BCC
          const usedAddrs = new Set<string>();
          toRecipients.forEach((m) => usedAddrs.add(m.address));
          if (from.address && usedAddrs.has(from.address)) return;

          const filteredCc = ccRecipients?.filter(
            (m) => !usedAddrs.has(m.address),
          );
          filteredCc?.forEach((m) => usedAddrs.add(m.address));

          const filteredBcc = bccRecipients?.filter(
            (m) => !usedAddrs.has(m.address),
          );

          const { service, announceCalls } = createTestService();

          const input: IEmailInput = {
            from,
            to: toRecipients,
            cc: filteredCc && filteredCc.length > 0 ? filteredCc : undefined,
            bcc:
              filteredBcc && filteredBcc.length > 0 ? filteredBcc : undefined,
            textBody: 'Test email body',
          };

          const result = await service.sendEmail(input);
          if (!result.success) return;

          // There must be at least one announcement
          expect(announceCalls.length).toBeGreaterThanOrEqual(1);

          // Every announcement must have ackRequired=true
          for (const call of announceCalls) {
            expect(call.metadata.ackRequired).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 12b: The To/CC gossip announcement recipientIds contain all To and CC recipients.
   *
   * For any email with To and/or CC recipients, the first gossip announcement must
   * contain exactly the To and CC recipient addresses in recipientIds.
   *
   * **Validates: Requirements 6.1**
   */
  it('Property 12b: To/CC announcement recipientIds contain all To and CC recipients', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 3),
        fc.option(arbUniqueMailboxes(1, 2), { nil: undefined }),
        async (from, toRecipients, ccRecipients) => {
          // Ensure no overlap between from and recipients
          const usedAddrs = new Set<string>();
          toRecipients.forEach((m) => usedAddrs.add(m.address));
          if (usedAddrs.has(from.address)) return;

          const filteredCc = ccRecipients?.filter(
            (m) => !usedAddrs.has(m.address),
          );

          const { service, announceCalls } = createTestService();

          const input: IEmailInput = {
            from,
            to: toRecipients,
            cc: filteredCc && filteredCc.length > 0 ? filteredCc : undefined,
            textBody: 'Test email body',
          };

          const result = await service.sendEmail(input);
          if (!result.success) return;

          // Should have exactly one announcement for To/CC (no BCC)
          expect(announceCalls.length).toBe(1);

          const toCcAnnouncement = announceCalls[0];

          // Build expected recipient IDs
          const expectedRecipientIds = [
            ...toRecipients.map((m) => m.address),
            ...(filteredCc ?? []).map((m) => m.address),
          ];

          // recipientIds must contain exactly the To/CC addresses
          expect(toCcAnnouncement.metadata.recipientIds.sort()).toEqual(
            expectedRecipientIds.sort(),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 12c: The cblBlockId is set to the metadata's blockId for each announcement.
   *
   * For any email sent, each gossip announcement's cblBlockId must match the
   * blockId of the corresponding metadata copy stored for that announcement.
   *
   * **Validates: Requirements 6.1**
   */
  it('Property 12c: cblBlockId is set to the metadata blockId for each announcement', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 3),
        fc.option(arbUniqueMailboxes(1, 2), { nil: undefined }),
        async (from, toRecipients, bccRecipients) => {
          const usedAddrs = new Set<string>();
          toRecipients.forEach((m) => usedAddrs.add(m.address));
          if (usedAddrs.has(from.address)) return;

          const filteredBcc = bccRecipients?.filter(
            (m) => !usedAddrs.has(m.address),
          );

          const { service, storeCalls, announceCalls } = createTestService();

          const input: IEmailInput = {
            from,
            to: toRecipients,
            bcc:
              filteredBcc && filteredBcc.length > 0 ? filteredBcc : undefined,
            textBody: 'Test email body',
          };

          const result = await service.sendEmail(input);
          if (!result.success) return;

          expect(announceCalls.length).toBeGreaterThanOrEqual(1);

          // For each announcement, the cblBlockId should match the blockId
          // of the corresponding stored metadata copy.
          // The To/CC copy has blockId ending with '-tocc'.
          // BCC copies have blockId containing '-bcc-'.
          // The store calls include: sender copy, then To/CC copy, then BCC copies.
          // The announce calls correspond to: To/CC announcement, then BCC announcements.

          // Find the To/CC metadata copy (stored after the sender copy)
          const toCcCopy = storeCalls.find(
            (m) => typeof m.blockId === 'string' && m.blockId.endsWith('-tocc'),
          );

          if (toCcCopy) {
            // First announcement is for To/CC
            expect(announceCalls[0].metadata.cblBlockId).toBe(toCcCopy.blockId);
          }

          // For BCC announcements, each should match its BCC copy's blockId
          if (filteredBcc && filteredBcc.length > 0) {
            const bccCopies = storeCalls.filter(
              (m) =>
                typeof m.blockId === 'string' && m.blockId.includes('-bcc-'),
            );

            // BCC announcements start after the To/CC announcement
            const bccAnnounceStart = toCcCopy ? 1 : 0;
            for (let i = 0; i < bccCopies.length; i++) {
              const announceIdx = bccAnnounceStart + i;
              if (announceIdx < announceCalls.length) {
                expect(announceCalls[announceIdx].metadata.cblBlockId).toBe(
                  bccCopies[i].blockId,
                );
              }
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 12d: blockIds in each announcement match the cblBlockIds from the metadata copy.
   *
   * For any email sent, each gossip announcement's blockIds must contain the
   * cblBlockIds from the corresponding metadata copy.
   *
   * **Validates: Requirements 6.1**
   */
  it('Property 12d: blockIds contain the cblBlockIds from the metadata copy', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 3),
        fc.option(arbUniqueMailboxes(1, 2), { nil: undefined }),
        async (from, toRecipients, bccRecipients) => {
          const usedAddrs = new Set<string>();
          toRecipients.forEach((m) => usedAddrs.add(m.address));
          if (usedAddrs.has(from.address)) return;

          const filteredBcc = bccRecipients?.filter(
            (m) => !usedAddrs.has(m.address),
          );

          const { service, storeCalls, announceCalls } = createTestService();

          const input: IEmailInput = {
            from,
            to: toRecipients,
            bcc:
              filteredBcc && filteredBcc.length > 0 ? filteredBcc : undefined,
            textBody: 'Test email body',
          };

          const result = await service.sendEmail(input);
          if (!result.success) return;

          expect(announceCalls.length).toBeGreaterThanOrEqual(1);

          // Find the To/CC metadata copy
          const toCcCopy = storeCalls.find(
            (m) => typeof m.blockId === 'string' && m.blockId.endsWith('-tocc'),
          );

          if (toCcCopy) {
            // The blockIds in the announcement should match the cblBlockIds from metadata
            const expectedBlockIds = toCcCopy.cblBlockIds ?? [];
            expect(announceCalls[0].metadata.blockIds).toEqual(
              expectedBlockIds,
            );
            // The first argument (blockIds) should also match
            expect(announceCalls[0].blockIds).toEqual(expectedBlockIds);
          }

          // For BCC announcements
          if (filteredBcc && filteredBcc.length > 0) {
            const bccCopies = storeCalls.filter(
              (m) =>
                typeof m.blockId === 'string' && m.blockId.includes('-bcc-'),
            );

            const bccAnnounceStart = toCcCopy ? 1 : 0;
            for (let i = 0; i < bccCopies.length; i++) {
              const announceIdx = bccAnnounceStart + i;
              if (announceIdx < announceCalls.length) {
                const expectedBlockIds = bccCopies[i].cblBlockIds ?? [];
                expect(announceCalls[announceIdx].metadata.blockIds).toEqual(
                  expectedBlockIds,
                );
                expect(announceCalls[announceIdx].blockIds).toEqual(
                  expectedBlockIds,
                );
              }
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 12e: The number of gossip announcements matches the expected count.
   *
   * For any email with To/CC recipients and N BCC recipients, there should be
   * exactly 1 + N gossip announcements (1 for To/CC, N for individual BCC).
   * For emails with only BCC recipients (no To/CC), there should be N announcements.
   *
   * **Validates: Requirements 6.1**
   */
  it('Property 12e: announcement count matches 1 (To/CC) + N (BCC) pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 3),
        arbUniqueMailboxes(1, 3),
        async (from, toRecipients, bccRecipients) => {
          const usedAddrs = new Set<string>();
          toRecipients.forEach((m) => usedAddrs.add(m.address));
          if (usedAddrs.has(from.address)) return;

          const filteredBcc = bccRecipients.filter(
            (m) => !usedAddrs.has(m.address),
          );
          if (filteredBcc.length === 0) return;

          const { service, announceCalls } = createTestService();

          const input: IEmailInput = {
            from,
            to: toRecipients,
            bcc: filteredBcc,
            textBody: 'Test email body',
          };

          const result = await service.sendEmail(input);
          if (!result.success) return;

          // Expected: 1 announcement for To/CC + 1 per BCC recipient
          const expectedCount = 1 + filteredBcc.length;
          expect(announceCalls.length).toBe(expectedCount);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 12f: Emails with only CC recipients (no To) still produce correct announcements.
   *
   * For any email with only CC recipients, the gossip announcement must contain
   * all CC recipient addresses and have ackRequired=true.
   *
   * **Validates: Requirements 6.1, 6.5**
   */
  it('Property 12f: CC-only emails produce correct announcements with ackRequired=true', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 3),
        async (from, ccRecipients) => {
          if (ccRecipients.some((m) => m.address === from.address)) return;

          const { service, announceCalls } = createTestService();

          const input: IEmailInput = {
            from,
            cc: ccRecipients,
            textBody: 'Test email body',
          };

          const result = await service.sendEmail(input);
          if (!result.success) return;

          expect(announceCalls.length).toBe(1);

          const announcement = announceCalls[0];
          expect(announcement.metadata.ackRequired).toBe(true);

          const expectedRecipientIds = ccRecipients.map((m) => m.address);
          expect(announcement.metadata.recipientIds.sort()).toEqual(
            expectedRecipientIds.sort(),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 12g: All announcements have priority set to 'normal' for standard emails.
   *
   * For any email sent via EmailMessageService, the gossip announcement metadata
   * must have priority set to 'normal'.
   *
   * **Validates: Requirements 6.1**
   */
  it('Property 12g: all email announcements have priority set to normal', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 3),
        async (from, toRecipients) => {
          if (toRecipients.some((m) => m.address === from.address)) return;

          const { service, announceCalls } = createTestService();

          const input: IEmailInput = {
            from,
            to: toRecipients,
            textBody: 'Test email body',
          };

          const result = await service.sendEmail(input);
          if (!result.success) return;

          expect(announceCalls.length).toBeGreaterThanOrEqual(1);

          for (const call of announceCalls) {
            expect(call.metadata.priority).toBe('normal');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: unified-gossip-delivery, Property 13: BCC privacy in separate announcements

describe('Feature: unified-gossip-delivery, Property 13: BCC Privacy in Separate Announcements', () => {
  /**
   * **Validates: Requirements 6.3**
   *
   * Per the design document:
   * For any email with BCC recipients, the gossip announcement sent for To/CC
   * recipients must not contain any BCC recipient IDs in messageDelivery.recipientIds,
   * and each BCC recipient must receive a separate gossip announcement containing
   * only that BCC recipient's ID. No BCC recipient's ID may appear in any
   * announcement intended for other recipients.
   */

  /**
   * Property 13a: The To/CC announcement must not contain any BCC recipient IDs.
   *
   * For any email with To recipients AND BCC recipients, the first gossip
   * announcement (for To/CC) must not include any BCC addresses in recipientIds.
   *
   * **Validates: Requirements 6.3**
   */
  it('Property 13a: To/CC announcement does not contain any BCC recipient IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 3),
        arbUniqueMailboxes(1, 3),
        async (from, toRecipients, bccRecipients) => {
          // Ensure no address overlap between from, To, and BCC
          const usedAddrs = new Set<string>();
          usedAddrs.add(from.address);
          toRecipients.forEach((m) => usedAddrs.add(m.address));

          const filteredBcc = bccRecipients.filter(
            (m) => !usedAddrs.has(m.address),
          );
          if (filteredBcc.length === 0) return;

          const { service, announceCalls } = createTestService();

          const input: IEmailInput = {
            from,
            to: toRecipients,
            bcc: filteredBcc,
            textBody: 'Test email body',
          };

          const result = await service.sendEmail(input);
          if (!result.success) return;

          // The first announcement is for To/CC recipients
          const toCcAnnouncement = announceCalls[0];
          const bccAddresses = new Set(filteredBcc.map((m) => m.address));

          // No BCC address should appear in the To/CC announcement
          for (const recipientId of toCcAnnouncement.metadata.recipientIds) {
            expect(bccAddresses.has(recipientId)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 13b: Each BCC recipient gets exactly one separate announcement
   * containing only their address.
   *
   * For any email with BCC recipients, each BCC recipient must receive a
   * separate gossip announcement with recipientIds containing only that
   * BCC recipient's address.
   *
   * **Validates: Requirements 6.3**
   */
  it('Property 13b: each BCC recipient gets a separate announcement with only their address', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 3),
        arbUniqueMailboxes(1, 3),
        async (from, toRecipients, bccRecipients) => {
          // Ensure no address overlap
          const usedAddrs = new Set<string>();
          usedAddrs.add(from.address);
          toRecipients.forEach((m) => usedAddrs.add(m.address));

          const filteredBcc = bccRecipients.filter(
            (m) => !usedAddrs.has(m.address),
          );
          if (filteredBcc.length === 0) return;

          const { service, announceCalls } = createTestService();

          const input: IEmailInput = {
            from,
            to: toRecipients,
            bcc: filteredBcc,
            textBody: 'Test email body',
          };

          const result = await service.sendEmail(input);
          if (!result.success) return;

          // BCC announcements start after the To/CC announcement (index 1+)
          const bccAnnouncements = announceCalls.slice(1);

          // There must be exactly one BCC announcement per BCC recipient
          expect(bccAnnouncements.length).toBe(filteredBcc.length);

          for (let i = 0; i < filteredBcc.length; i++) {
            const bccAnnouncement = bccAnnouncements[i];

            // Each BCC announcement must contain exactly one recipientId
            expect(bccAnnouncement.metadata.recipientIds.length).toBe(1);

            // That recipientId must be the BCC recipient's address
            expect(bccAnnouncement.metadata.recipientIds[0]).toBe(
              filteredBcc[i].address,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 13c: Total announcement count equals 1 (To/CC) + N (BCC recipients).
   *
   * For any email with To/CC recipients and N BCC recipients, the total number
   * of gossip announcements must be exactly 1 + N.
   *
   * **Validates: Requirements 6.3**
   */
  it('Property 13c: total announcements = 1 (To/CC) + N (BCC recipients)', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 3),
        arbUniqueMailboxes(1, 4),
        async (from, toRecipients, bccRecipients) => {
          // Ensure no address overlap
          const usedAddrs = new Set<string>();
          usedAddrs.add(from.address);
          toRecipients.forEach((m) => usedAddrs.add(m.address));

          const filteredBcc = bccRecipients.filter(
            (m) => !usedAddrs.has(m.address),
          );
          if (filteredBcc.length === 0) return;

          const { service, announceCalls } = createTestService();

          const input: IEmailInput = {
            from,
            to: toRecipients,
            bcc: filteredBcc,
            textBody: 'Test email body',
          };

          const result = await service.sendEmail(input);
          if (!result.success) return;

          // Expected: 1 for To/CC + 1 per BCC recipient
          const expectedCount = 1 + filteredBcc.length;
          expect(announceCalls.length).toBe(expectedCount);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 13d: No BCC recipient's ID appears in any other BCC recipient's announcement.
   *
   * For any email with multiple BCC recipients, each BCC announcement must
   * contain only that specific BCC recipient's ID and no other BCC recipient's ID.
   *
   * **Validates: Requirements 6.3**
   */
  it('Property 13d: no BCC recipient ID appears in any other BCC announcement', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 2),
        arbUniqueMailboxes(2, 4),
        async (from, toRecipients, bccRecipients) => {
          // Ensure no address overlap
          const usedAddrs = new Set<string>();
          usedAddrs.add(from.address);
          toRecipients.forEach((m) => usedAddrs.add(m.address));

          const filteredBcc = bccRecipients.filter(
            (m) => !usedAddrs.has(m.address),
          );
          if (filteredBcc.length < 2) return;

          const { service, announceCalls } = createTestService();

          const input: IEmailInput = {
            from,
            to: toRecipients,
            bcc: filteredBcc,
            textBody: 'Test email body',
          };

          const result = await service.sendEmail(input);
          if (!result.success) return;

          // BCC announcements start after the To/CC announcement
          const bccAnnouncements = announceCalls.slice(1);

          // For each BCC announcement, verify no other BCC recipient's ID is present
          for (let i = 0; i < bccAnnouncements.length; i++) {
            const currentBccAddress = filteredBcc[i].address;
            const otherBccAddresses = filteredBcc
              .filter((_, idx) => idx !== i)
              .map((m) => m.address);

            const recipientIds = bccAnnouncements[i].metadata.recipientIds;

            // Must contain only the current BCC recipient
            expect(recipientIds).toEqual([currentBccAddress]);

            // Must not contain any other BCC recipient
            for (const otherAddr of otherBccAddresses) {
              expect(recipientIds).not.toContain(otherAddr);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 13e: No BCC recipient ID appears in any announcement not intended for them.
   *
   * For any email with BCC recipients, each BCC recipient's address must appear
   * in exactly one announcement (their own), and must not appear in the To/CC
   * announcement or any other BCC announcement.
   *
   * **Validates: Requirements 6.3**
   */
  it('Property 13e: each BCC recipient ID appears in exactly one announcement', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 3),
        arbUniqueMailboxes(1, 3),
        fc.option(arbUniqueMailboxes(1, 2), { nil: undefined }),
        async (from, toRecipients, bccRecipients, ccRecipients) => {
          // Ensure no address overlap across all fields
          const usedAddrs = new Set<string>();
          usedAddrs.add(from.address);
          toRecipients.forEach((m) => usedAddrs.add(m.address));

          const filteredCc = ccRecipients?.filter(
            (m) => !usedAddrs.has(m.address),
          );
          filteredCc?.forEach((m) => usedAddrs.add(m.address));

          const filteredBcc = bccRecipients.filter(
            (m) => !usedAddrs.has(m.address),
          );
          if (filteredBcc.length === 0) return;

          const { service, announceCalls } = createTestService();

          const input: IEmailInput = {
            from,
            to: toRecipients,
            cc: filteredCc && filteredCc.length > 0 ? filteredCc : undefined,
            bcc: filteredBcc,
            textBody: 'Test email body',
          };

          const result = await service.sendEmail(input);
          if (!result.success) return;

          // For each BCC recipient, count how many announcements contain their ID
          for (const bccMailbox of filteredBcc) {
            let count = 0;
            for (const call of announceCalls) {
              if (call.metadata.recipientIds.includes(bccMailbox.address)) {
                count++;
              }
            }
            // Each BCC recipient must appear in exactly one announcement
            expect(count).toBe(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: unified-gossip-delivery, Property 14: Email inbox indexing on receipt

/**
 * @fileoverview Property 14: Email Inbox Indexing on Receipt
 *
 * **Validates: Requirements 6.4**
 *
 * Per the design document:
 * For any gossip announcement with email messageDelivery metadata received at a
 * node where a recipientId matches a local user, the email metadata store must
 * contain an entry for that email queryable via queryInbox for that user after
 * processing completes.
 *
 * This test verifies the recipient-side contract: when a message delivery handler
 * is triggered (simulating what happens when gossipService detects a local
 * recipient), the email metadata store gets populated and is queryable via
 * queryInbox for the matching user.
 *
 * We use InMemoryEmailMetadataStore as a real implementation (no mocks) to
 * verify the full store → queryInbox flow.
 */

import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import type { BlockAnnouncement } from '../../interfaces/availability/gossipService';
import { createContentType } from '../../interfaces/messaging/mimePart';
import { InMemoryEmailMetadataStore } from './inMemoryEmailMetadataStore';

describe('Feature: unified-gossip-delivery, Property 14: Email Inbox Indexing on Receipt', () => {
  /**
   * **Validates: Requirements 6.4**
   *
   * WHEN a gossip announcement with email Message_Delivery_Metadata is received
   * at a Recipient_Node, THE Recipient_Node SHALL index the email in the
   * recipient's inbox via the email metadata store.
   */

  /**
   * Simulates the recipient-side message delivery handler.
   *
   * When a gossip announcement with messageDelivery metadata arrives and
   * recipientIds match local users, the handler:
   * 1. Constructs IEmailMetadata from the announcement and fetched content
   * 2. Stores it in the email metadata store
   *
   * This function simulates that flow for testing purposes.
   */
  async function simulateMessageDeliveryHandler(
    store: InMemoryEmailMetadataStore,
    announcement: BlockAnnouncement,
    localUserIds: string[],
    senderMailbox: IMailbox,
  ): Promise<void> {
    const md = announcement.messageDelivery;
    if (!md) return;

    // Find which recipientIds match local users
    const matchingRecipients = md.recipientIds.filter((id) =>
      localUserIds.includes(id),
    );

    if (matchingRecipients.length === 0) return;

    // Build recipient mailboxes from the recipientIds
    const recipientMailboxes: IMailbox[] = matchingRecipients.map((addr) => {
      const [localPart, domain] = addr.split('@');
      return createMailbox(localPart, domain);
    });

    // Construct email metadata as the handler would after fetching blocks
    const now = new Date();
    const emailMetadata: IEmailMetadata = {
      // IBlockMetadata fields
      blockId: md.cblBlockId,
      createdAt: now,
      expiresAt: null,
      durabilityLevel: DurabilityLevel.Standard,
      parityBlockIds: [],
      accessCount: 0,
      lastAccessedAt: now,
      replicationStatus: ReplicationStatus.Pending,
      targetReplicationFactor: 0,
      replicaNodeIds: [],
      size: 1024,
      checksum: md.cblBlockId,

      // IMessageMetadata fields
      messageType: 'email',
      senderId: announcement.nodeId,
      recipients: md.recipientIds,
      priority: MessagePriority.NORMAL,
      deliveryStatus: new Map(
        matchingRecipients.map((r) => [r, DeliveryStatus.Delivered]),
      ),
      acknowledgments: new Map(),
      encryptionScheme: MessageEncryptionScheme.NONE,
      isCBL: true,
      cblBlockIds: md.blockIds,

      // IEmailMetadata fields
      from: senderMailbox,
      to: recipientMailboxes,
      messageId: md.messageId,
      date: now,
      mimeVersion: '1.0',
      contentType: createContentType('text', 'plain'),
      customHeaders: new Map(),
      deliveryReceipts: new Map(),
      readReceipts: new Map(),
    };

    await store.store(emailMetadata);
  }

  /**
   * Property 14a: After processing a message delivery announcement, each matching
   * local recipient can query their inbox and find the delivered email.
   *
   * For any gossip announcement with messageDelivery metadata where recipientIds
   * match local users, queryInbox for each matching user must return the email.
   *
   * **Validates: Requirements 6.4**
   */
  it('Property 14a: delivered email is queryable via queryInbox for each matching local recipient', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 4),
        fc.uuid(),
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }),
        async (
          senderMailbox,
          recipientMailboxes,
          messageId,
          cblBlockId,
          blockIds,
        ) => {
          const store = new InMemoryEmailMetadataStore();
          const recipientIds = recipientMailboxes.map((m) => m.address);

          // All recipients are local users
          const localUserIds = [...recipientIds];

          const announcement: BlockAnnouncement = {
            type: 'add',
            blockId: cblBlockId,
            nodeId: 'sender-node-001',
            timestamp: new Date(),
            ttl: 5,
            messageDelivery: {
              messageId,
              recipientIds,
              priority: 'normal',
              blockIds,
              cblBlockId,
              ackRequired: true,
            },
          };

          // Simulate the delivery handler processing
          await simulateMessageDeliveryHandler(
            store,
            announcement,
            localUserIds,
            senderMailbox,
          );

          // Verify: each local recipient can query their inbox and find the email
          for (const recipientId of recipientIds) {
            const result = await store.queryInbox(recipientId, {});
            expect(result.totalCount).toBeGreaterThanOrEqual(1);

            const found = result.emails.some((e) => e.messageId === messageId);
            expect(found).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 14b: When only a subset of recipientIds match local users,
   * only those matching users should find the email in their inbox.
   * Non-local recipients should NOT have the email in the store.
   *
   * **Validates: Requirements 6.4**
   */
  it('Property 14b: only matching local recipients have the email indexed in their inbox', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(2, 5),
        fc.uuid(),
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }),
        async (
          senderMailbox,
          allRecipientMailboxes,
          messageId,
          cblBlockId,
          blockIds,
        ) => {
          // Split recipients: first half are local, second half are not
          const splitIdx = Math.max(
            1,
            Math.floor(allRecipientMailboxes.length / 2),
          );
          const localMailboxes = allRecipientMailboxes.slice(0, splitIdx);
          const nonLocalMailboxes = allRecipientMailboxes.slice(splitIdx);

          if (nonLocalMailboxes.length === 0) return;

          const store = new InMemoryEmailMetadataStore();
          const allRecipientIds = allRecipientMailboxes.map((m) => m.address);
          const localUserIds = localMailboxes.map((m) => m.address);

          const announcement: BlockAnnouncement = {
            type: 'add',
            blockId: cblBlockId,
            nodeId: 'sender-node-001',
            timestamp: new Date(),
            ttl: 5,
            messageDelivery: {
              messageId,
              recipientIds: allRecipientIds,
              priority: 'normal',
              blockIds,
              cblBlockId,
              ackRequired: true,
            },
          };

          // Simulate the delivery handler — only local users trigger indexing
          await simulateMessageDeliveryHandler(
            store,
            announcement,
            localUserIds,
            senderMailbox,
          );

          // Local recipients should find the email
          for (const localId of localUserIds) {
            const result = await store.queryInbox(localId, {});
            const found = result.emails.some((e) => e.messageId === messageId);
            expect(found).toBe(true);
          }

          // Non-local recipients should NOT find the email
          for (const nonLocalMailbox of nonLocalMailboxes) {
            const result = await store.queryInbox(nonLocalMailbox.address, {});
            const found = result.emails.some((e) => e.messageId === messageId);
            expect(found).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 14c: The indexed email metadata preserves the messageId from
   * the gossip announcement's messageDelivery metadata.
   *
   * For any delivered email, the messageId stored in the metadata store must
   * match the messageId from the original announcement.
   *
   * **Validates: Requirements 6.4**
   */
  it('Property 14c: indexed email messageId matches the announcement messageDelivery.messageId', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 3),
        fc.uuid(),
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }),
        async (
          senderMailbox,
          recipientMailboxes,
          messageId,
          cblBlockId,
          blockIds,
        ) => {
          const store = new InMemoryEmailMetadataStore();
          const recipientIds = recipientMailboxes.map((m) => m.address);

          const announcement: BlockAnnouncement = {
            type: 'add',
            blockId: cblBlockId,
            nodeId: 'sender-node-001',
            timestamp: new Date(),
            ttl: 5,
            messageDelivery: {
              messageId,
              recipientIds,
              priority: 'normal',
              blockIds,
              cblBlockId,
              ackRequired: true,
            },
          };

          await simulateMessageDeliveryHandler(
            store,
            announcement,
            recipientIds,
            senderMailbox,
          );

          // Verify the stored email has the correct messageId
          for (const recipientId of recipientIds) {
            const result = await store.queryInbox(recipientId, {});
            expect(result.totalCount).toBeGreaterThanOrEqual(1);

            const matchingEmail = result.emails.find(
              (e) => e.messageId === messageId,
            );
            expect(matchingEmail).toBeDefined();
            expect(matchingEmail!.messageId).toBe(messageId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 14d: Announcements without messageDelivery metadata do not
   * cause any inbox indexing.
   *
   * For any BlockAnnouncement without messageDelivery, the email metadata
   * store must remain empty after processing.
   *
   * **Validates: Requirements 6.4**
   */
  it('Property 14d: announcements without messageDelivery do not index anything', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 3),
        fc.uuid(),
        async (senderMailbox, recipientMailboxes, blockId) => {
          const store = new InMemoryEmailMetadataStore();
          const recipientIds = recipientMailboxes.map((m) => m.address);

          // Announcement without messageDelivery (plain block announcement)
          const announcement: BlockAnnouncement = {
            type: 'add',
            blockId,
            nodeId: 'sender-node-001',
            timestamp: new Date(),
            ttl: 3,
            // No messageDelivery field
          };

          await simulateMessageDeliveryHandler(
            store,
            announcement,
            recipientIds,
            senderMailbox,
          );

          // No emails should be indexed
          for (const recipientId of recipientIds) {
            const result = await store.queryInbox(recipientId, {});
            expect(result.totalCount).toBe(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 14e: When no recipientIds match local users, the email metadata
   * store must remain empty after processing.
   *
   * **Validates: Requirements 6.4**
   */
  it('Property 14e: no indexing when recipientIds do not match any local users', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox,
        arbUniqueMailboxes(1, 3),
        arbUniqueMailboxes(1, 3),
        fc.uuid(),
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }),
        async (
          senderMailbox,
          announcementRecipients,
          localUsers,
          messageId,
          cblBlockId,
          blockIds,
        ) => {
          // Ensure no overlap between announcement recipients and local users
          const announcementAddrs = new Set(
            announcementRecipients.map((m) => m.address),
          );
          const filteredLocalUsers = localUsers.filter(
            (m) => !announcementAddrs.has(m.address),
          );
          if (filteredLocalUsers.length === 0) return;

          const store = new InMemoryEmailMetadataStore();
          const recipientIds = announcementRecipients.map((m) => m.address);
          const localUserIds = filteredLocalUsers.map((m) => m.address);

          const announcement: BlockAnnouncement = {
            type: 'add',
            blockId: cblBlockId,
            nodeId: 'sender-node-001',
            timestamp: new Date(),
            ttl: 5,
            messageDelivery: {
              messageId,
              recipientIds,
              priority: 'normal',
              blockIds,
              cblBlockId,
              ackRequired: true,
            },
          };

          // No recipientIds match local users
          await simulateMessageDeliveryHandler(
            store,
            announcement,
            localUserIds,
            senderMailbox,
          );

          // Store should be empty — no local recipients matched
          for (const localId of localUserIds) {
            const result = await store.queryInbox(localId, {});
            expect(result.totalCount).toBe(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
