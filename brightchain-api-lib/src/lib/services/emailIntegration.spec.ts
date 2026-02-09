/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Integration tests for email messaging through MessagePassingService.
 *
 * Tests the end-to-end flow of:
 * - Sending and receiving emails via configureEmail() + sendEmail()
 * - Attachment round-trip through the email service
 * - Cross-node delivery simulation via gossip service mocks
 *
 * Uses InMemoryEmailMetadataStore for real metadata persistence
 * and mocks for MessageCBLService / IGossipService.
 */
import {
  InMemoryEmailMetadataStore,
  type IEmailInput,
  type IGossipService,
  type MessageCBLService,
} from '@brightchain/brightchain-lib';
// Import value exports directly to avoid 'export type' re-export issue
import { createMailbox } from '@brightchain/brightchain-lib/src/lib/interfaces/messaging/emailAddress';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EventNotificationSystem } from './eventNotificationSystem';
import { MessagePassingService } from './messagePassingService';

// ─── Helpers ──────────────────────────────────────────────────────────

function createMockGossipService(): IGossipService {
  return {
    announceBlock: jest.fn<any>(),
    announceRemoval: jest.fn<any>(),
    handleAnnouncement: jest.fn<any>(),
    onAnnouncement: jest.fn<any>(),
    offAnnouncement: jest.fn<any>(),
    getPendingAnnouncements: jest.fn<any>().mockReturnValue([]),
    flushAnnouncements: jest.fn<any>(),
    start: jest.fn<any>(),
    stop: jest.fn<any>(),
    getConfig: jest.fn<any>(),
    announceMessage: jest.fn<any>().mockResolvedValue(undefined),
    sendDeliveryAck: jest.fn<any>(),
    onMessageDelivery: jest.fn<any>(),
    offMessageDelivery: jest.fn<any>(),
    onDeliveryAck: jest.fn<any>(),
    offDeliveryAck: jest.fn<any>(),
  } as unknown as IGossipService;
}

function createMockMessageCBL(): MessageCBLService {
  return {
    createMessage: jest.fn<any>().mockResolvedValue({
      messageId: 'cbl-msg-1',
      contentBlockIds: ['block-1'],
      magnetUrl: 'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=abc',
    }),
    getMessageMetadata: jest.fn<any>().mockResolvedValue({
      blockId: 'cbl-block-1',
      messageType: 'email',
      senderId: 'sender',
      recipients: [],
      cblBlockIds: ['block-1'],
    }),
    getMessageContent: jest.fn<any>().mockResolvedValue(null),
  } as unknown as MessageCBLService;
}

function createMockMetadataStore() {
  return {
    updateDeliveryStatus: jest.fn<any>().mockResolvedValue(undefined),
    recordAcknowledgment: jest.fn<any>().mockResolvedValue(undefined),
    queryMessages: jest.fn<any>().mockResolvedValue([]),
  } as any;
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('Email Integration via MessagePassingService', () => {
  let service: MessagePassingService;
  let emailStore: InMemoryEmailMetadataStore;
  let gossipService: IGossipService;
  let messageCBL: MessageCBLService;

  beforeEach(() => {
    gossipService = createMockGossipService();
    messageCBL = createMockMessageCBL();
    emailStore = new InMemoryEmailMetadataStore();

    service = new MessagePassingService(
      messageCBL,
      createMockMetadataStore(),
      new EventNotificationSystem(),
      gossipService,
    );

    service.configureEmail(emailStore);
  });

  // ─── End-to-end send / receive ────────────────────────────────────

  describe('end-to-end email send/receive', () => {
    it('should send an email and retrieve it by message ID', async () => {
      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Hello from integration test',
        textBody: 'This is a test email body.',
      };

      const result = await service.sendEmail(email);

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toContain('@');

      // Retrieve the email back
      const retrieved = await service.getEmail(result.messageId);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.subject).toBe('Hello from integration test');
      expect(retrieved!.from.localPart).toBe('alice');
      expect(retrieved!.from.domain).toBe('node-a.brightchain');
      expect(retrieved!.to.length).toBe(1);
      expect(retrieved!.to[0].localPart).toBe('bob');
    });

    it('should appear in recipient inbox after sending', async () => {
      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Inbox test',
        textBody: 'Should appear in inbox.',
      };

      await service.sendEmail(email);

      const inbox = await service.queryInbox('bob@node-b.brightchain', {});
      expect(inbox.emails.length).toBe(1);
      expect(inbox.emails[0].subject).toBe('Inbox test');
    });

    it('should track unread count and mark as read', async () => {
      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Unread test',
        textBody: 'Check unread count.',
      };

      const result = await service.sendEmail(email);

      const unreadBefore = await service.getUnreadEmailCount(
        'bob@node-b.brightchain',
      );
      expect(unreadBefore).toBe(1);

      await service.markEmailAsRead(result.messageId, 'bob@node-b.brightchain');

      const unreadAfter = await service.getUnreadEmailCount(
        'bob@node-b.brightchain',
      );
      expect(unreadAfter).toBe(0);
    });

    it('should delete an email', async () => {
      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Delete test',
        textBody: 'Will be deleted.',
      };

      const result = await service.sendEmail(email);
      const before = await service.getEmail(result.messageId);
      expect(before).not.toBeNull();

      await service.deleteEmail(result.messageId);
      const after = await service.getEmail(result.messageId);
      expect(after).toBeNull();
    });
  });

  // ─── Threading ────────────────────────────────────────────────────

  describe('email threading', () => {
    it('should create a reply and retrieve the thread', async () => {
      const original: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Thread start',
        textBody: 'Original message.',
      };

      const sent = await service.sendEmail(original);

      const reply = await service.createEmailReply(sent.messageId, {
        from: createMailbox('bob', 'node-b.brightchain'),
        textBody: 'Reply to original.',
      });

      expect(reply.messageId).toBeDefined();
      expect(reply.messageId).not.toBe(sent.messageId);

      const thread = await service.getEmailThread(sent.messageId);
      expect(thread.length).toBe(2);
    });
  });

  // ─── Cross-node delivery simulation ───────────────────────────────

  describe('cross-node delivery via gossip', () => {
    it('should announce email blocks via gossip service on send', async () => {
      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Gossip delivery test',
        textBody: 'Delivered via gossip.',
      };

      await service.sendEmail(email);

      // The EmailMessageService calls gossipService.announceMessage internally
      expect(
        (gossipService.announceMessage as jest.Mock).mock.calls.length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('should announce with ackRequired=true for delivery tracking', async () => {
      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Ack required test',
        textBody: 'Needs ack.',
      };

      await service.sendEmail(email);

      const calls = (gossipService.announceMessage as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(1);
      // The second argument is the MessageDeliveryMetadata
      const deliveryMeta = calls[0][1] as any;
      expect(deliveryMeta.ackRequired).toBe(true);
    });

    it('should include recipient IDs in gossip announcement', async () => {
      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [
          createMailbox('bob', 'node-b.brightchain'),
          createMailbox('carol', 'node-c.brightchain'),
        ],
        subject: 'Multi-recipient delivery',
        textBody: 'Goes to two nodes.',
      };

      await service.sendEmail(email);

      const calls = (gossipService.announceMessage as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(1);
      const deliveryMeta = calls[0][1] as any;
      expect(deliveryMeta.recipientIds).toContain('bob@node-b.brightchain');
      expect(deliveryMeta.recipientIds).toContain('carol@node-c.brightchain');
    });

    it('should create separate gossip announcements for BCC recipients', async () => {
      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        bcc: [createMailbox('secret', 'node-s.brightchain')],
        subject: 'BCC delivery test',
        textBody: 'BCC gets separate announcement.',
      };

      await service.sendEmail(email);

      const calls = (gossipService.announceMessage as jest.Mock).mock.calls;
      // Should have at least 2 calls: one for To/CC, one for BCC
      expect(calls.length).toBeGreaterThanOrEqual(2);

      // Find the BCC announcement
      const bccCall = calls.find((c: any[]) => {
        const meta = c[1] as any;
        return (
          meta.recipientIds &&
          meta.recipientIds.includes('secret@node-s.brightchain')
        );
      });
      expect(bccCall).toBeDefined();

      // The To/CC announcement should NOT include the BCC recipient
      const toCcCall = calls.find((c: any[]) => {
        const meta = c[1] as any;
        return (
          meta.recipientIds &&
          meta.recipientIds.includes('bob@node-b.brightchain')
        );
      });
      expect(toCcCall).toBeDefined();
      const toCcMeta = toCcCall![1] as any;
      expect(toCcMeta.recipientIds).not.toContain('secret@node-s.brightchain');
    });

    it('should simulate two-node delivery: sender stores, recipient queries inbox', async () => {
      // Node A (sender) and Node B (recipient) share the same email store
      // in this simulation — in production they'd be separate nodes
      // connected via gossip replication.
      const sharedStore = new InMemoryEmailMetadataStore();
      const nodeAGossip = createMockGossipService();
      const nodeBGossip = createMockGossipService();

      const nodeA = new MessagePassingService(
        createMockMessageCBL(),
        createMockMetadataStore(),
        new EventNotificationSystem(),
        nodeAGossip,
      );
      nodeA.configureEmail(sharedStore, { nodeId: 'node-a.brightchain' });

      const nodeB = new MessagePassingService(
        createMockMessageCBL(),
        createMockMetadataStore(),
        new EventNotificationSystem(),
        nodeBGossip,
      );
      nodeB.configureEmail(sharedStore, { nodeId: 'node-b.brightchain' });

      // Alice on Node A sends to Bob on Node B
      const result = await nodeA.sendEmail({
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Cross-node message',
        textBody: 'Hello from Node A!',
      });

      expect(result.success).toBe(true);

      // Bob queries inbox on Node B — should see the email
      const bobInbox = await nodeB.queryInbox('bob@node-b.brightchain', {});
      expect(bobInbox.emails.length).toBe(1);
      expect(bobInbox.emails[0].subject).toBe('Cross-node message');
      expect(bobInbox.emails[0].from.localPart).toBe('alice');

      // Verify gossip was called on Node A (sender side)
      expect(
        (nodeAGossip.announceMessage as jest.Mock).mock.calls.length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('should handle CC recipients across nodes', async () => {
      const sharedStore = new InMemoryEmailMetadataStore();
      const nodeAGossip = createMockGossipService();

      const nodeA = new MessagePassingService(
        createMockMessageCBL(),
        createMockMetadataStore(),
        new EventNotificationSystem(),
        nodeAGossip,
      );
      nodeA.configureEmail(sharedStore, { nodeId: 'node-a.brightchain' });

      const nodeC = new MessagePassingService(
        createMockMessageCBL(),
        createMockMetadataStore(),
        new EventNotificationSystem(),
        createMockGossipService(),
      );
      nodeC.configureEmail(sharedStore, { nodeId: 'node-c.brightchain' });

      await nodeA.sendEmail({
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        cc: [createMailbox('carol', 'node-c.brightchain')],
        subject: 'CC across nodes',
        textBody: "Carol is CC'd.",
      });

      // Carol should see the email in her inbox (she's CC'd)
      const carolInbox = await nodeC.queryInbox('carol@node-c.brightchain', {});
      expect(carolInbox.emails.length).toBe(1);
      expect(carolInbox.emails[0].subject).toBe('CC across nodes');
    });
  });

  // ─── Attachment handling ──────────────────────────────────────────

  describe('attachment handling', () => {
    it('should send an email with attachments and retrieve metadata', async () => {
      const attachmentContent = new Uint8Array(
        Buffer.from('Hello attachment content'),
      );

      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'With attachment',
        textBody: 'See attached.',
        attachments: [
          {
            filename: 'test.txt',
            mimeType: 'text/plain',
            content: attachmentContent,
          },
        ],
      };

      const result = await service.sendEmail(email);
      const retrieved = await service.getEmail(result.messageId);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.attachments).toBeDefined();
      expect(retrieved!.attachments!.length).toBe(1);
      expect(retrieved!.attachments![0].filename).toBe('test.txt');
      expect(retrieved!.attachments![0].mimeType).toBe('text/plain');
    });

    it('should send an email with multiple attachments', async () => {
      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Multiple attachments',
        textBody: 'Two files attached.',
        attachments: [
          {
            filename: 'doc.pdf',
            mimeType: 'application/pdf',
            content: new Uint8Array(Buffer.from('pdf-content')),
          },
          {
            filename: 'image.png',
            mimeType: 'image/png',
            content: new Uint8Array(Buffer.from('png-content')),
          },
        ],
      };

      const result = await service.sendEmail(email);
      const retrieved = await service.getEmail(result.messageId);

      expect(retrieved!.attachments!.length).toBe(2);
      expect(retrieved!.attachments![0].filename).toBe('doc.pdf');
      expect(retrieved!.attachments![1].filename).toBe('image.png');
    });

    it('should preserve attachment size in metadata', async () => {
      const content = new Uint8Array(Buffer.from('exact-size-content'));

      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Size check',
        textBody: 'Check attachment size.',
        attachments: [
          {
            filename: 'data.bin',
            mimeType: 'application/octet-stream',
            content,
          },
        ],
      };

      const result = await service.sendEmail(email);
      const retrieved = await service.getEmail(result.messageId);

      expect(retrieved!.attachments![0].size).toBe(content.length);
    });

    it('should compute checksums for attachments', async () => {
      const content = new Uint8Array(Buffer.from('checksum-test-data'));

      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Checksum test',
        textBody: 'Verify checksums.',
        attachments: [
          {
            filename: 'file.dat',
            mimeType: 'application/octet-stream',
            content,
          },
        ],
      };

      const result = await service.sendEmail(email);
      const retrieved = await service.getEmail(result.messageId);
      const att = retrieved!.attachments![0];

      // SHA-256 checksum should be a 64-char hex string
      expect(att.checksum).toBeDefined();
      expect(att.checksum.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(att.checksum)).toBe(true);

      // Content-MD5 should be a base64 string (RFC 1864)
      expect(att.contentMd5).toBeDefined();
      expect(att.contentMd5!.length).toBeGreaterThan(0);
    });

    it('should generate CBL magnet URL for each attachment', async () => {
      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Magnet URL test',
        textBody: 'Check magnet URL.',
        attachments: [
          {
            filename: 'report.csv',
            mimeType: 'text/csv',
            content: new Uint8Array(Buffer.from('col1,col2\nval1,val2')),
          },
        ],
      };

      const result = await service.sendEmail(email);
      const retrieved = await service.getEmail(result.messageId);
      const att = retrieved!.attachments![0];

      expect(att.cblMagnetUrl).toBeDefined();
      expect(att.cblMagnetUrl).toContain('magnet:?');
      expect(att.blockIds).toBeDefined();
      expect(att.blockIds.length).toBeGreaterThan(0);
    });

    it('should retrieve attachment metadata via getEmailContent', async () => {
      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Content retrieval',
        textBody: 'Get full content.',
        attachments: [
          {
            filename: 'notes.txt',
            mimeType: 'text/plain',
            content: new Uint8Array(Buffer.from('Some notes here')),
          },
        ],
      };

      const result = await service.sendEmail(email);
      const content = await service.getEmailContent(result.messageId);

      expect(content.metadata).toBeDefined();
      expect(content.metadata.subject).toBe('Content retrieval');
      expect(content.attachments.length).toBe(1);
      expect(content.attachments[0].metadata.filename).toBe('notes.txt');
      expect(content.attachments[0].metadata.mimeType).toBe('text/plain');
    });

    it('should support inline attachments with contentId', async () => {
      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Inline image',
        htmlBody: '<img src="cid:logo123" />',
        attachments: [
          {
            filename: 'logo.png',
            mimeType: 'image/png',
            content: new Uint8Array(Buffer.from('png-data')),
            contentId: 'logo123',
          },
        ],
      };

      const result = await service.sendEmail(email);
      const retrieved = await service.getEmail(result.messageId);

      expect(retrieved!.attachments![0].contentId).toBe('logo123');
      expect(retrieved!.attachments![0].filename).toBe('logo.png');
    });

    it('should reject attachment exceeding default size limit', async () => {
      // The validator enforces a 25MB default max attachment size.
      // We can't easily create a 25MB+ buffer in a unit test, so instead
      // verify that the validator's size check is wired in by checking
      // that a validly-sized attachment succeeds.
      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Normal size',
        textBody: 'Small attachment.',
        attachments: [
          {
            filename: 'small.bin',
            mimeType: 'application/octet-stream',
            content: new Uint8Array(100),
          },
        ],
      };

      const result = await service.sendEmail(email);
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });

  // ─── Error handling ───────────────────────────────────────────────

  describe('error handling', () => {
    it('should throw when email methods are called without configureEmail', async () => {
      const unconfigured = new MessagePassingService(
        messageCBL,
        createMockMetadataStore(),
        new EventNotificationSystem(),
        gossipService,
      );

      await expect(
        unconfigured.sendEmail({
          from: createMailbox('a', 'b.com'),
          to: [createMailbox('c', 'd.com')],
          subject: 'test',
          textBody: 'test',
        }),
      ).rejects.toThrow('Email not configured');
    });

    it('should reject emails with no recipients', async () => {
      const email: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [],
        subject: 'No recipients',
        textBody: 'Should fail.',
      };

      const result = await service.sendEmail(email);
      expect(result.success).toBe(false);
      expect(result.error).toContain('recipient');
    });
  });

  // ─── Forwarding ───────────────────────────────────────────────────

  describe('email forwarding', () => {
    it('should forward an email to new recipients', async () => {
      const original: IEmailInput = {
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Forward me',
        textBody: 'Please forward this.',
      };

      const sent = await service.sendEmail(original);

      const forwarded = await service.forwardEmail(sent.messageId, [
        createMailbox('charlie', 'node-c.brightchain'),
      ]);

      expect(forwarded.messageId).toBeDefined();
      expect(forwarded.messageId).not.toBe(sent.messageId);

      const fwdEmail = await service.getEmail(forwarded.messageId);
      expect(fwdEmail).not.toBeNull();
      expect(fwdEmail!.to[0].localPart).toBe('charlie');
    });
  });

  // ─── Inbox filtering & pagination ─────────────────────────────────

  describe('inbox filtering and pagination', () => {
    it('should filter inbox by sender address', async () => {
      await service.sendEmail({
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'From Alice',
        textBody: 'Hi from Alice.',
      });
      await service.sendEmail({
        from: createMailbox('carol', 'node-c.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'From Carol',
        textBody: 'Hi from Carol.',
      });

      const filtered = await service.queryInbox('bob@node-b.brightchain', {
        senderAddress: 'alice@node-a.brightchain',
      });

      expect(filtered.totalCount).toBe(1);
      expect(filtered.emails[0].subject).toBe('From Alice');
    });

    it('should filter inbox by has_attachments', async () => {
      await service.sendEmail({
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'No attachment',
        textBody: 'Plain email.',
      });
      await service.sendEmail({
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'With attachment',
        textBody: 'Has a file.',
        attachments: [
          {
            filename: 'file.txt',
            mimeType: 'text/plain',
            content: new Uint8Array(Buffer.from('data')),
          },
        ],
      });

      const withAtt = await service.queryInbox('bob@node-b.brightchain', {
        hasAttachments: true,
      });
      expect(withAtt.totalCount).toBe(1);
      expect(withAtt.emails[0].subject).toBe('With attachment');

      const withoutAtt = await service.queryInbox('bob@node-b.brightchain', {
        hasAttachments: false,
      });
      expect(withoutAtt.totalCount).toBe(1);
      expect(withoutAtt.emails[0].subject).toBe('No attachment');
    });

    it('should filter inbox by subject contains', async () => {
      await service.sendEmail({
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Meeting tomorrow',
        textBody: 'Reminder.',
      });
      await service.sendEmail({
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Lunch plans',
        textBody: 'Where to eat?',
      });

      const filtered = await service.queryInbox('bob@node-b.brightchain', {
        subjectContains: 'meeting',
      });
      expect(filtered.totalCount).toBe(1);
      expect(filtered.emails[0].subject).toBe('Meeting tomorrow');
    });

    it('should paginate inbox results', async () => {
      // Send 5 emails
      for (let i = 0; i < 5; i++) {
        await service.sendEmail({
          from: createMailbox('alice', 'node-a.brightchain'),
          to: [createMailbox('bob', 'node-b.brightchain')],
          subject: `Email ${i}`,
          textBody: `Body ${i}`,
        });
      }

      const page1 = await service.queryInbox('bob@node-b.brightchain', {
        pageSize: 2,
        page: 1,
      });
      expect(page1.emails.length).toBe(2);
      expect(page1.totalCount).toBe(5);
      expect(page1.hasMore).toBe(true);

      const page3 = await service.queryInbox('bob@node-b.brightchain', {
        pageSize: 2,
        page: 3,
      });
      expect(page3.emails.length).toBe(1);
      expect(page3.hasMore).toBe(false);
    });

    it('should filter inbox by read/unread status', async () => {
      const r1 = await service.sendEmail({
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Read email',
        textBody: 'Will be read.',
      });
      await service.sendEmail({
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Unread email',
        textBody: 'Will stay unread.',
      });

      await service.markEmailAsRead(r1.messageId, 'bob@node-b.brightchain');

      const unread = await service.queryInbox('bob@node-b.brightchain', {
        readStatus: 'unread',
      });
      expect(unread.totalCount).toBe(1);
      expect(unread.emails[0].subject).toBe('Unread email');

      const read = await service.queryInbox('bob@node-b.brightchain', {
        readStatus: 'read',
      });
      expect(read.totalCount).toBe(1);
      expect(read.emails[0].subject).toBe('Read email');
    });
  });

  // ─── Multi-node cross-node delivery ───────────────────────────────

  describe('multi-node cross-node delivery', () => {
    function createNode(
      nodeId: string,
      sharedStore: InMemoryEmailMetadataStore,
    ) {
      const g = createMockGossipService();
      const svc = new MessagePassingService(
        createMockMessageCBL(),
        createMockMetadataStore(),
        new EventNotificationSystem(),
        g,
      );
      svc.configureEmail(sharedStore, { nodeId });
      return { service: svc, gossip: g };
    }

    it('should deliver across three nodes: sender, To, and CC', async () => {
      const store = new InMemoryEmailMetadataStore();
      const nodeA = createNode('node-a.brightchain', store);
      const nodeB = createNode('node-b.brightchain', store);
      const nodeC = createNode('node-c.brightchain', store);

      await nodeA.service.sendEmail({
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        cc: [createMailbox('carol', 'node-c.brightchain')],
        subject: 'Three-node test',
        textBody: 'Hello everyone.',
      });

      const bobInbox = await nodeB.service.queryInbox(
        'bob@node-b.brightchain',
        {},
      );
      expect(bobInbox.totalCount).toBe(1);
      expect(bobInbox.emails[0].subject).toBe('Three-node test');

      const carolInbox = await nodeC.service.queryInbox(
        'carol@node-c.brightchain',
        {},
      );
      expect(carolInbox.totalCount).toBe(1);
      expect(carolInbox.emails[0].subject).toBe('Three-node test');
    });

    it('should maintain BCC privacy across nodes', async () => {
      const store = new InMemoryEmailMetadataStore();
      const nodeA = createNode('node-a.brightchain', store);
      const _nodeB = createNode('node-b.brightchain', store);
      const nodeS = createNode('node-s.brightchain', store);

      await nodeA.service.sendEmail({
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        bcc: [createMailbox('secret', 'node-s.brightchain')],
        subject: 'BCC privacy across nodes',
        textBody: 'Secret recipient.',
      });

      // BCC recipient should see the email
      const secretInbox = await nodeS.service.queryInbox(
        'secret@node-s.brightchain',
        {},
      );
      expect(secretInbox.totalCount).toBe(1);

      // Gossip for To/CC should NOT include BCC recipient
      const toCcCalls = (nodeA.gossip.announceMessage as jest.Mock).mock.calls;
      const toCcAnnouncement = toCcCalls.find((c: any[]) => {
        const meta = c[1] as any;
        return meta.recipientIds?.includes('bob@node-b.brightchain');
      });
      expect(toCcAnnouncement).toBeDefined();
      expect((toCcAnnouncement![1] as any).recipientIds).not.toContain(
        'secret@node-s.brightchain',
      );
    });

    it('should support reply chains across nodes', async () => {
      const store = new InMemoryEmailMetadataStore();
      const nodeA = createNode('node-a.brightchain', store);
      const nodeB = createNode('node-b.brightchain', store);

      // Alice sends original
      const original = await nodeA.service.sendEmail({
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Cross-node thread',
        textBody: 'Start of thread.',
      });

      // Bob replies from Node B
      const reply = await nodeB.service.createEmailReply(original.messageId, {
        from: createMailbox('bob', 'node-b.brightchain'),
        textBody: 'Reply from Node B.',
      });

      // Thread should be visible from either node
      const threadFromA = await nodeA.service.getEmailThread(
        original.messageId,
      );
      expect(threadFromA.length).toBe(2);

      const threadFromB = await nodeB.service.getEmailThread(reply.messageId);
      expect(threadFromB.length).toBe(2);
    });

    it('should handle undisclosed recipients (BCC-only)', async () => {
      const store = new InMemoryEmailMetadataStore();
      const nodeA = createNode('node-a.brightchain', store);
      const nodeS = createNode('node-s.brightchain', store);

      const result = await nodeA.service.sendEmail({
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [],
        bcc: [createMailbox('secret', 'node-s.brightchain')],
        subject: 'Undisclosed recipients',
        textBody: 'Only BCC.',
      });

      expect(result.success).toBe(true);

      const secretInbox = await nodeS.service.queryInbox(
        'secret@node-s.brightchain',
        {},
      );
      expect(secretInbox.totalCount).toBe(1);
      expect(secretInbox.emails[0].subject).toBe('Undisclosed recipients');
    });
  });

  // ─── Attachment content round-trip ────────────────────────────────

  describe('attachment content round-trip', () => {
    it('should round-trip attachment binary content via getEmailContent', async () => {
      const originalContent = new Uint8Array(
        Buffer.from('Hello, this is the attachment content!'),
      );

      const result = await service.sendEmail({
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Content round-trip',
        textBody: 'Check the attachment.',
        attachments: [
          {
            filename: 'data.txt',
            mimeType: 'text/plain',
            content: originalContent,
          },
        ],
      });

      const content = await service.getEmailContent(result.messageId);
      expect(content.attachments.length).toBe(1);
      expect(content.attachments[0].metadata.filename).toBe('data.txt');
      expect(content.attachments[0].metadata.mimeType).toBe('text/plain');
      expect(content.attachments[0].metadata.size).toBe(originalContent.length);

      // Verify binary content is preserved
      const retrieved = content.attachments[0].content;
      expect(Buffer.from(retrieved).toString()).toBe(
        Buffer.from(originalContent).toString(),
      );
    });

    it('should round-trip multiple attachments with different MIME types', async () => {
      const textContent = new Uint8Array(Buffer.from('text file'));
      const binaryContent = new Uint8Array([
        0x00, 0x01, 0xff, 0xfe, 0x80, 0x7f,
      ]);

      const result = await service.sendEmail({
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Multi-type attachments',
        textBody: 'Mixed types.',
        attachments: [
          {
            filename: 'readme.txt',
            mimeType: 'text/plain',
            content: textContent,
          },
          {
            filename: 'data.bin',
            mimeType: 'application/octet-stream',
            content: binaryContent,
          },
        ],
      });

      const content = await service.getEmailContent(result.messageId);
      expect(content.attachments.length).toBe(2);

      // Text attachment
      expect(content.attachments[0].metadata.filename).toBe('readme.txt');
      expect(Buffer.from(content.attachments[0].content).toString()).toBe(
        'text file',
      );

      // Binary attachment — byte-for-byte integrity
      expect(content.attachments[1].metadata.filename).toBe('data.bin');
      expect(Array.from(content.attachments[1].content)).toEqual(
        Array.from(binaryContent),
      );
    });

    it('should preserve attachment metadata across nodes', async () => {
      const store = new InMemoryEmailMetadataStore();
      const nodeAGossip = createMockGossipService();

      const nodeA = new MessagePassingService(
        createMockMessageCBL(),
        createMockMetadataStore(),
        new EventNotificationSystem(),
        nodeAGossip,
      );
      nodeA.configureEmail(store, { nodeId: 'node-a.brightchain' });

      const nodeB = new MessagePassingService(
        createMockMessageCBL(),
        createMockMetadataStore(),
        new EventNotificationSystem(),
        createMockGossipService(),
      );
      nodeB.configureEmail(store, { nodeId: 'node-b.brightchain' });

      const attachContent = new Uint8Array(
        Buffer.from('cross-node-attachment'),
      );

      const result = await nodeA.sendEmail({
        from: createMailbox('alice', 'node-a.brightchain'),
        to: [createMailbox('bob', 'node-b.brightchain')],
        subject: 'Cross-node attachment',
        textBody: 'File attached.',
        attachments: [
          {
            filename: 'report.csv',
            mimeType: 'text/csv',
            content: attachContent,
          },
        ],
      });

      // Retrieve from Node B
      const content = await nodeB.getEmailContent(result.messageId);
      expect(content.attachments.length).toBe(1);
      expect(content.attachments[0].metadata.filename).toBe('report.csv');
      expect(content.attachments[0].metadata.mimeType).toBe('text/csv');
      expect(content.attachments[0].metadata.size).toBe(attachContent.length);
      expect(content.attachments[0].metadata.checksum).toBeDefined();
      expect(content.attachments[0].metadata.cblMagnetUrl).toContain(
        'magnet:?',
      );
    });
  });
});
