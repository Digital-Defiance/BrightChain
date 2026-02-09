/**
 * @fileoverview Property-based tests for Inbox Query Correctness
 *
 * **Feature: email-messaging-protocol**
 *
 * **Property 12: Inbox Query Correctness**
 *
 * *For any* user and any email in the system:
 * 1. If the user is in the To, Cc, or Bcc field, the email SHALL appear in their inbox query results
 * 2. If the user is NOT in any recipient field, the email SHALL NOT appear in their inbox query results
 *
 * **Validates: Requirements 13.1**
 */

import fc from 'fast-check';
import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import {
  createMailbox,
  type IMailbox,
} from '../../interfaces/messaging/emailAddress';
import type { IEmailMetadata } from '../../interfaces/messaging/emailMetadata';
import { createContentType } from '../../interfaces/messaging/mimePart';
import { InMemoryEmailMetadataStore } from './inMemoryEmailMetadataStore';

// Feature: email-messaging-protocol, Property 12: Inbox Query Correctness

// ─── Generators ─────────────────────────────────────────────────────────────

const arbLocalPart = fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/);
const arbDomain = fc
  .tuple(
    fc.stringMatching(/^[a-z]{2,8}$/),
    fc.constantFrom('com', 'org', 'net'),
  )
  .map(([name, tld]) => `${name}.${tld}`);

const arbMailbox: fc.Arbitrary<IMailbox> = fc
  .tuple(arbLocalPart, arbDomain)
  .map(([lp, d]) => createMailbox(lp, d));

/**
 * Build a minimal IEmailMetadata with the given recipients.
 */
function buildEmail(
  messageId: string,
  from: IMailbox,
  to: IMailbox[],
  cc: IMailbox[],
  bcc: IMailbox[],
  date: Date,
): IEmailMetadata {
  const allRecipients = [...to, ...cc, ...bcc].map((m) => m.address);
  return {
    blockId: messageId,
    createdAt: date,
    expiresAt: null,
    durabilityLevel: DurabilityLevel.Standard,
    parityBlockIds: [],
    accessCount: 0,
    lastAccessedAt: date,
    replicationStatus: ReplicationStatus.Pending,
    targetReplicationFactor: 0,
    replicaNodeIds: [],
    size: 100,
    checksum: '',
    messageType: 'email',
    senderId: from.address,
    recipients: allRecipients,
    priority: MessagePriority.NORMAL,
    deliveryStatus: new Map(
      allRecipients.map((r) => [r, DeliveryStatus.Pending]),
    ),
    acknowledgments: new Map(),
    encryptionScheme: MessageEncryptionScheme.NONE,
    isCBL: false,
    cblBlockIds: [],
    from,
    to,
    cc: cc.length > 0 ? cc : undefined,
    bcc: bcc.length > 0 ? bcc : undefined,
    messageId,
    subject: `Subject for ${messageId}`,
    date,
    mimeVersion: '1.0',
    contentType: createContentType('text', 'plain'),
    customHeaders: new Map(),
    deliveryReceipts: new Map(),
    readReceipts: new Map(),
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Property 12: Inbox Query Correctness', () => {
  /**
   * **Feature: email-messaging-protocol, Property 12: Inbox Query Correctness**
   *
   * If the user is in the To field, the email SHALL appear in their inbox.
   *
   * **Validates: Requirements 13.1**
   */
  it('emails where user is a To recipient SHALL appear in inbox', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox, // sender
        arbMailbox, // the user (To recipient)
        fc.integer({ min: 1, max: 5 }), // extra To recipients count
        async (sender, user, extraCount) => {
          const store = new InMemoryEmailMetadataStore();

          // Create extra recipients that are NOT the user
          const extras: IMailbox[] = [];
          for (let i = 0; i < extraCount; i++) {
            extras.push(createMailbox(`extra${i}`, 'other.com'));
          }

          const email = buildEmail(
            `<msg-to-${user.address}@test>`,
            sender,
            [user, ...extras],
            [],
            [],
            new Date(),
          );
          await store.store(email);

          const result = await store.queryInbox(user.address, {});
          const ids = result.emails.map((e) => e.messageId);
          expect(ids).toContain(email.messageId);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 12: Inbox Query Correctness**
   *
   * If the user is in the Cc field, the email SHALL appear in their inbox.
   *
   * **Validates: Requirements 13.1**
   */
  it('emails where user is a Cc recipient SHALL appear in inbox', async () => {
    await fc.assert(
      fc.asyncProperty(arbMailbox, arbMailbox, async (sender, user) => {
        const store = new InMemoryEmailMetadataStore();
        const toRecipient = createMailbox('primary', 'other.com');

        const email = buildEmail(
          `<msg-cc-${user.address}@test>`,
          sender,
          [toRecipient],
          [user],
          [],
          new Date(),
        );
        await store.store(email);

        const result = await store.queryInbox(user.address, {});
        const ids = result.emails.map((e) => e.messageId);
        expect(ids).toContain(email.messageId);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 12: Inbox Query Correctness**
   *
   * If the user is in the Bcc field, the email SHALL appear in their inbox.
   *
   * **Validates: Requirements 13.1**
   */
  it('emails where user is a Bcc recipient SHALL appear in inbox', async () => {
    await fc.assert(
      fc.asyncProperty(arbMailbox, arbMailbox, async (sender, user) => {
        const store = new InMemoryEmailMetadataStore();
        const toRecipient = createMailbox('primary', 'other.com');

        const email = buildEmail(
          `<msg-bcc-${user.address}@test>`,
          sender,
          [toRecipient],
          [],
          [user],
          new Date(),
        );
        await store.store(email);

        const result = await store.queryInbox(user.address, {});
        const ids = result.emails.map((e) => e.messageId);
        expect(ids).toContain(email.messageId);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: email-messaging-protocol, Property 12: Inbox Query Correctness**
   *
   * If the user is NOT in any recipient field (To, Cc, Bcc),
   * the email SHALL NOT appear in their inbox.
   *
   * **Validates: Requirements 13.1**
   */
  it('emails where user is NOT a recipient SHALL NOT appear in inbox', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMailbox, // sender
        arbMailbox, // the querying user (not a recipient)
        fc.array(arbMailbox, { minLength: 1, maxLength: 3 }), // actual recipients
        async (sender, user, recipients) => {
          // Ensure user is not among the recipients
          const filteredRecipients = recipients.filter(
            (r) => r.address.toLowerCase() !== user.address.toLowerCase(),
          );
          if (filteredRecipients.length === 0) return; // skip degenerate case

          const store = new InMemoryEmailMetadataStore();

          const email = buildEmail(
            `<msg-norecip@test>`,
            sender,
            filteredRecipients,
            [],
            [],
            new Date(),
          );
          await store.store(email);

          const result = await store.queryInbox(user.address, {});
          const ids = result.emails.map((e) => e.messageId);
          expect(ids).not.toContain(email.messageId);
        },
      ),
      { numRuns: 100 },
    );
  });
});
