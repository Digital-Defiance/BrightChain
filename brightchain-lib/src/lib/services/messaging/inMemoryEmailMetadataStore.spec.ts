/**
 * Unit tests for InMemoryEmailMetadataStore
 *
 * Tests filtering, sorting, pagination, read tracking, and full-text search.
 *
 * @see Requirement 13.1 - Inbox query for To, Cc, or Bcc recipients
 * @see Requirement 13.2 - Sort by Date header
 * @see Requirement 13.3 - Filter by read/unread, sender, date range, etc.
 * @see Requirement 13.4 - Full-text search across subject and body
 * @see Requirement 13.6 - Pagination with configurable page size
 * @see Requirement 13.7 - Sort by date, sender, subject, size
 * @see Requirement 13.8 - Track and return unread count
 */

import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import { createMailbox } from '../../interfaces/messaging/emailAddress';
import type { IEmailMetadata } from '../../interfaces/messaging/emailMetadata';
import { createContentType } from '../../interfaces/messaging/mimePart';
import { InMemoryEmailMetadataStore } from './inMemoryEmailMetadataStore';

const USER = 'alice@example.com';

function buildEmail(
  overrides: Partial<IEmailMetadata> & { messageId: string },
): IEmailMetadata {
  const now = new Date();
  return {
    blockId: overrides.messageId,
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
    senderId: 'sender@example.com',
    recipients: [USER],
    priority: MessagePriority.NORMAL,
    deliveryStatus: new Map([[USER, DeliveryStatus.Pending]]),
    acknowledgments: new Map(),
    encryptionScheme: MessageEncryptionScheme.NONE,
    isCBL: false,
    cblBlockIds: [],
    from: createMailbox('sender', 'example.com'),
    to: [createMailbox('alice', 'example.com')],
    subject: 'Default Subject',
    date: now,
    mimeVersion: '1.0',
    contentType: createContentType('text', 'plain'),
    customHeaders: new Map(),
    deliveryReceipts: new Map(),
    readReceipts: new Map(),
    ...overrides,
  };
}

describe('InMemoryEmailMetadataStore', () => {
  describe('inbox filtering (Requirement 13.3)', () => {
    it('should filter by read status', async () => {
      const store = new InMemoryEmailMetadataStore();
      const e1 = buildEmail({ messageId: '<e1@test>' });
      const e2 = buildEmail({ messageId: '<e2@test>' });
      await store.store(e1);
      await store.store(e2);
      await store.markAsRead('<e1@test>', USER);

      const readResult = await store.queryInbox(USER, { readStatus: 'read' });
      expect(readResult.emails.map((e) => e.messageId)).toEqual(['<e1@test>']);

      const unreadResult = await store.queryInbox(USER, {
        readStatus: 'unread',
      });
      expect(unreadResult.emails.map((e) => e.messageId)).toEqual([
        '<e2@test>',
      ]);
    });

    it('should filter by sender address', async () => {
      const store = new InMemoryEmailMetadataStore();
      const e1 = buildEmail({
        messageId: '<e1@test>',
        from: createMailbox('bob', 'example.com'),
      });
      const e2 = buildEmail({
        messageId: '<e2@test>',
        from: createMailbox('carol', 'example.com'),
      });
      await store.store(e1);
      await store.store(e2);

      const result = await store.queryInbox(USER, {
        senderAddress: 'bob@example.com',
      });
      expect(result.emails).toHaveLength(1);
      expect(result.emails[0].messageId).toBe('<e1@test>');
    });

    it('should filter by date range', async () => {
      const store = new InMemoryEmailMetadataStore();
      const jan = new Date('2025-01-15');
      const feb = new Date('2025-02-15');
      const mar = new Date('2025-03-15');

      await store.store(buildEmail({ messageId: '<jan@test>', date: jan }));
      await store.store(buildEmail({ messageId: '<feb@test>', date: feb }));
      await store.store(buildEmail({ messageId: '<mar@test>', date: mar }));

      const result = await store.queryInbox(USER, {
        dateFrom: new Date('2025-02-01'),
        dateTo: new Date('2025-02-28'),
      });
      expect(result.emails).toHaveLength(1);
      expect(result.emails[0].messageId).toBe('<feb@test>');
    });

    it('should filter by has_attachments', async () => {
      const store = new InMemoryEmailMetadataStore();
      await store.store(buildEmail({ messageId: '<noatt@test>' }));
      await store.store(
        buildEmail({
          messageId: '<att@test>',
          attachments: [
            {
              filename: 'file.pdf',
              mimeType: 'application/pdf',
              size: 1024,
              cblMagnetUrl: 'magnet:?xt=urn:cbl:abc',
              blockIds: ['block1'],
              checksum: 'abc',
            },
          ],
        }),
      );

      const withAtt = await store.queryInbox(USER, { hasAttachments: true });
      expect(withAtt.emails).toHaveLength(1);
      expect(withAtt.emails[0].messageId).toBe('<att@test>');

      const withoutAtt = await store.queryInbox(USER, {
        hasAttachments: false,
      });
      expect(withoutAtt.emails).toHaveLength(1);
      expect(withoutAtt.emails[0].messageId).toBe('<noatt@test>');
    });

    it('should filter by subject contains', async () => {
      const store = new InMemoryEmailMetadataStore();
      await store.store(
        buildEmail({ messageId: '<e1@test>', subject: 'Meeting tomorrow' }),
      );
      await store.store(
        buildEmail({ messageId: '<e2@test>', subject: 'Invoice attached' }),
      );

      const result = await store.queryInbox(USER, {
        subjectContains: 'meeting',
      });
      expect(result.emails).toHaveLength(1);
      expect(result.emails[0].messageId).toBe('<e1@test>');
    });
  });

  describe('sorting (Requirement 13.7)', () => {
    it('should sort by date descending by default', async () => {
      const store = new InMemoryEmailMetadataStore();
      const old = new Date('2025-01-01');
      const mid = new Date('2025-06-01');
      const recent = new Date('2025-12-01');

      await store.store(buildEmail({ messageId: '<old@test>', date: old }));
      await store.store(buildEmail({ messageId: '<mid@test>', date: mid }));
      await store.store(
        buildEmail({ messageId: '<recent@test>', date: recent }),
      );

      const result = await store.queryInbox(USER, {});
      expect(result.emails.map((e) => e.messageId)).toEqual([
        '<recent@test>',
        '<mid@test>',
        '<old@test>',
      ]);
    });

    it('should sort by sender ascending', async () => {
      const store = new InMemoryEmailMetadataStore();
      await store.store(
        buildEmail({
          messageId: '<c@test>',
          from: createMailbox('carol', 'example.com'),
        }),
      );
      await store.store(
        buildEmail({
          messageId: '<a@test>',
          from: createMailbox('alice', 'other.com'),
        }),
      );
      await store.store(
        buildEmail({
          messageId: '<b@test>',
          from: createMailbox('bob', 'example.com'),
        }),
      );

      const result = await store.queryInbox(USER, {
        sortBy: 'sender',
        sortDirection: 'asc',
      });
      expect(result.emails.map((e) => e.from.address)).toEqual([
        'alice@other.com',
        'bob@example.com',
        'carol@example.com',
      ]);
    });
  });

  describe('pagination (Requirement 13.6)', () => {
    it('should paginate results correctly', async () => {
      const store = new InMemoryEmailMetadataStore();
      for (let i = 0; i < 5; i++) {
        await store.store(
          buildEmail({
            messageId: `<e${i}@test>`,
            date: new Date(2025, 0, i + 1),
          }),
        );
      }

      const page1 = await store.queryInbox(USER, {
        page: 1,
        pageSize: 2,
        sortBy: 'date',
        sortDirection: 'asc',
      });
      expect(page1.emails).toHaveLength(2);
      expect(page1.totalCount).toBe(5);
      expect(page1.hasMore).toBe(true);
      expect(page1.page).toBe(1);

      const page3 = await store.queryInbox(USER, {
        page: 3,
        pageSize: 2,
        sortBy: 'date',
        sortDirection: 'asc',
      });
      expect(page3.emails).toHaveLength(1);
      expect(page3.hasMore).toBe(false);
    });
  });

  describe('full-text search (Requirement 13.4)', () => {
    it('should search across subject', async () => {
      const store = new InMemoryEmailMetadataStore();
      await store.store(
        buildEmail({
          messageId: '<e1@test>',
          subject: 'Quarterly budget review',
        }),
      );
      await store.store(
        buildEmail({ messageId: '<e2@test>', subject: 'Lunch plans' }),
      );

      const result = await store.queryInbox(USER, { searchText: 'budget' });
      expect(result.emails).toHaveLength(1);
      expect(result.emails[0].messageId).toBe('<e1@test>');
    });

    it('should search across body content in text parts', async () => {
      const encoder = new TextEncoder();
      const store = new InMemoryEmailMetadataStore();
      await store.store(
        buildEmail({
          messageId: '<e1@test>',
          subject: 'Hello',
          parts: [
            {
              contentType: createContentType('text', 'plain'),
              body: encoder.encode('The deployment pipeline is broken'),
              size: 33,
            },
          ],
        }),
      );
      await store.store(
        buildEmail({
          messageId: '<e2@test>',
          subject: 'Greetings',
          parts: [
            {
              contentType: createContentType('text', 'plain'),
              body: encoder.encode('Everything is fine'),
              size: 18,
            },
          ],
        }),
      );

      const result = await store.queryInbox(USER, { searchText: 'pipeline' });
      expect(result.emails).toHaveLength(1);
      expect(result.emails[0].messageId).toBe('<e1@test>');
    });

    it('should be case-insensitive', async () => {
      const store = new InMemoryEmailMetadataStore();
      await store.store(
        buildEmail({ messageId: '<e1@test>', subject: 'URGENT: Server Down' }),
      );

      const result = await store.queryInbox(USER, { searchText: 'urgent' });
      expect(result.emails).toHaveLength(1);
    });

    it('should return empty when no match', async () => {
      const store = new InMemoryEmailMetadataStore();
      await store.store(
        buildEmail({ messageId: '<e1@test>', subject: 'Hello world' }),
      );

      const result = await store.queryInbox(USER, {
        searchText: 'xyznonexistent',
      });
      expect(result.emails).toHaveLength(0);
    });
  });

  describe('unread count (Requirement 13.8)', () => {
    it('should track unread count correctly', async () => {
      const store = new InMemoryEmailMetadataStore();
      await store.store(buildEmail({ messageId: '<e1@test>' }));
      await store.store(buildEmail({ messageId: '<e2@test>' }));
      await store.store(buildEmail({ messageId: '<e3@test>' }));

      expect(await store.getUnreadCount(USER)).toBe(3);

      await store.markAsRead('<e1@test>', USER);
      expect(await store.getUnreadCount(USER)).toBe(2);

      await store.markAsRead('<e2@test>', USER);
      expect(await store.getUnreadCount(USER)).toBe(1);
    });

    it('should return unread count in query results', async () => {
      const store = new InMemoryEmailMetadataStore();
      await store.store(buildEmail({ messageId: '<e1@test>' }));
      await store.store(buildEmail({ messageId: '<e2@test>' }));
      await store.markAsRead('<e1@test>', USER);

      const result = await store.queryInbox(USER, {});
      expect(result.unreadCount).toBe(1);
      expect(result.totalCount).toBe(2);
    });
  });
});
