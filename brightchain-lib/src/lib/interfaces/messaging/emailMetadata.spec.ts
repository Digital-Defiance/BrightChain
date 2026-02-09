import { describe, expect, it } from '@jest/globals';
import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import {
  ContentTransferEncoding,
  IAttachmentMetadata,
  IContentType,
  IDeliveryReceipt,
  IEmailMetadata,
  IMailbox,
  IMimePart,
  IResentHeaderBlock,
} from './emailMetadata';

/**
 * Helper to create a minimal valid IMailbox.
 */
function createMailbox(
  localPart: string,
  domain: string,
  displayName?: string,
): IMailbox {
  return {
    localPart,
    domain,
    displayName,
    get address(): string {
      return `${localPart}@${domain}`;
    },
  };
}

/**
 * Helper to create a minimal valid IContentType.
 */
function createContentType(
  type: string,
  subtype: string,
  params?: Map<string, string>,
): IContentType {
  return {
    type,
    subtype,
    parameters: params ?? new Map(),
    get mediaType(): string {
      return `${type}/${subtype}`;
    },
  };
}

/**
 * Helper to create a minimal valid IEmailMetadata object.
 */
function createMinimalEmailMetadata(
  overrides?: Partial<IEmailMetadata>,
): IEmailMetadata {
  const from = createMailbox('sender', 'example.com', 'Sender Name');
  const to = [createMailbox('recipient', 'example.com')];
  const contentType = createContentType(
    'text',
    'plain',
    new Map([['charset', 'utf-8']]),
  );

  return {
    // IBlockMetadata fields
    blockId: 'test-block-id',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    expiresAt: null,
    durabilityLevel: DurabilityLevel.Standard,
    parityBlockIds: [],
    accessCount: 0,
    lastAccessedAt: new Date('2024-01-01T00:00:00Z'),
    replicationStatus: ReplicationStatus.Pending,
    targetReplicationFactor: 1,
    replicaNodeIds: [],
    size: 1024,
    checksum: 'abc123',

    // IMessageMetadata fields
    messageType: 'email',
    senderId: 'sender-node-1',
    recipients: ['recipient-node-1'],
    priority: MessagePriority.NORMAL,
    deliveryStatus: new Map([['recipient-node-1', DeliveryStatus.Pending]]),
    acknowledgments: new Map(),
    encryptionScheme: MessageEncryptionScheme.NONE,
    isCBL: false,

    // IEmailMetadata fields
    from,
    to,
    messageId: '<unique-id-123@example.com>',
    date: new Date('2024-01-01T12:00:00Z'),
    mimeVersion: '1.0',
    contentType,
    customHeaders: new Map(),
    deliveryReceipts: new Map(),
    readReceipts: new Map(),

    ...overrides,
  };
}

describe('IEmailMetadata Interface', () => {
  describe('RFC 5322 Originator Fields (Section 3.6.2)', () => {
    it('should include required From field', () => {
      const email = createMinimalEmailMetadata();
      expect(email.from).toBeDefined();
      expect(email.from.localPart).toBe('sender');
      expect(email.from.domain).toBe('example.com');
      expect(email.from.address).toBe('sender@example.com');
    });

    it('should support optional Sender field', () => {
      const sender = createMailbox('actual-sender', 'example.com');
      const email = createMinimalEmailMetadata({ sender });
      expect(email.sender).toBeDefined();
      expect(email.sender?.address).toBe('actual-sender@example.com');
    });

    it('should support optional Reply-To field', () => {
      const replyTo = [
        createMailbox('reply', 'example.com'),
        createMailbox('reply2', 'example.com'),
      ];
      const email = createMinimalEmailMetadata({ replyTo });
      expect(email.replyTo).toHaveLength(2);
      expect(email.replyTo?.[0].address).toBe('reply@example.com');
    });

    it('should allow Sender and Reply-To to be undefined', () => {
      const email = createMinimalEmailMetadata();
      expect(email.sender).toBeUndefined();
      expect(email.replyTo).toBeUndefined();
    });
  });

  describe('RFC 5322 Destination Fields (Section 3.6.3)', () => {
    it('should include required To field as array', () => {
      const email = createMinimalEmailMetadata();
      expect(Array.isArray(email.to)).toBe(true);
      expect(email.to).toHaveLength(1);
      expect(email.to[0].address).toBe('recipient@example.com');
    });

    it('should support multiple To recipients', () => {
      const to = [
        createMailbox('alice', 'example.com'),
        createMailbox('bob', 'example.com'),
        createMailbox('charlie', 'example.com'),
      ];
      const email = createMinimalEmailMetadata({ to });
      expect(email.to).toHaveLength(3);
    });

    it('should support optional Cc field', () => {
      const cc = [createMailbox('cc-user', 'example.com')];
      const email = createMinimalEmailMetadata({ cc });
      expect(email.cc).toHaveLength(1);
      expect(email.cc?.[0].address).toBe('cc-user@example.com');
    });

    it('should support optional Bcc field', () => {
      const bcc = [createMailbox('bcc-user', 'example.com')];
      const email = createMinimalEmailMetadata({ bcc });
      expect(email.bcc).toHaveLength(1);
      expect(email.bcc?.[0].address).toBe('bcc-user@example.com');
    });

    it('should allow Cc and Bcc to be undefined', () => {
      const email = createMinimalEmailMetadata();
      expect(email.cc).toBeUndefined();
      expect(email.bcc).toBeUndefined();
    });
  });

  describe('RFC 5322 Identification Fields (Section 3.6.4)', () => {
    it('should include required Message-ID field', () => {
      const email = createMinimalEmailMetadata();
      expect(email.messageId).toBe('<unique-id-123@example.com>');
    });

    it('should support optional In-Reply-To field', () => {
      const email = createMinimalEmailMetadata({
        inReplyTo: '<parent-msg@example.com>',
      });
      expect(email.inReplyTo).toBe('<parent-msg@example.com>');
    });

    it('should support optional References field as array', () => {
      const references = [
        '<root-msg@example.com>',
        '<reply1@example.com>',
        '<reply2@example.com>',
      ];
      const email = createMinimalEmailMetadata({ references });
      expect(email.references).toHaveLength(3);
      expect(email.references?.[0]).toBe('<root-msg@example.com>');
    });

    it('should allow In-Reply-To and References to be undefined', () => {
      const email = createMinimalEmailMetadata();
      expect(email.inReplyTo).toBeUndefined();
      expect(email.references).toBeUndefined();
    });
  });

  describe('RFC 5322 Informational Fields (Section 3.6.5)', () => {
    it('should support optional Subject field', () => {
      const email = createMinimalEmailMetadata({
        subject: 'Test Subject with UTF-8: 日本語',
      });
      expect(email.subject).toBe('Test Subject with UTF-8: 日本語');
    });

    it('should support optional Comments field as array', () => {
      const email = createMinimalEmailMetadata({
        comments: ['First comment', 'Second comment'],
      });
      expect(email.comments).toHaveLength(2);
    });

    it('should support optional Keywords field as array', () => {
      const email = createMinimalEmailMetadata({
        keywords: ['urgent', 'project-alpha', 'review'],
      });
      expect(email.keywords).toHaveLength(3);
    });

    it('should allow Subject, Comments, and Keywords to be undefined', () => {
      const email = createMinimalEmailMetadata();
      expect(email.subject).toBeUndefined();
      expect(email.comments).toBeUndefined();
      expect(email.keywords).toBeUndefined();
    });
  });

  describe('RFC 5322 Date Field (Section 3.6.1)', () => {
    it('should include required Date field', () => {
      const email = createMinimalEmailMetadata();
      expect(email.date).toBeInstanceOf(Date);
      expect(email.date.toISOString()).toBe('2024-01-01T12:00:00.000Z');
    });
  });

  describe('MIME Headers (RFC 2045)', () => {
    it('should include required mimeVersion field set to "1.0"', () => {
      const email = createMinimalEmailMetadata();
      expect(email.mimeVersion).toBe('1.0');
    });

    it('should include required contentType field', () => {
      const email = createMinimalEmailMetadata();
      expect(email.contentType.type).toBe('text');
      expect(email.contentType.subtype).toBe('plain');
      expect(email.contentType.mediaType).toBe('text/plain');
      expect(email.contentType.parameters.get('charset')).toBe('utf-8');
    });

    it('should support optional contentTransferEncoding field', () => {
      const email = createMinimalEmailMetadata({
        contentTransferEncoding: ContentTransferEncoding.Base64,
      });
      expect(email.contentTransferEncoding).toBe('base64');
    });

    it('should support all ContentTransferEncoding values', () => {
      expect(ContentTransferEncoding.SevenBit).toBe('7bit');
      expect(ContentTransferEncoding.EightBit).toBe('8bit');
      expect(ContentTransferEncoding.Binary).toBe('binary');
      expect(ContentTransferEncoding.QuotedPrintable).toBe('quoted-printable');
      expect(ContentTransferEncoding.Base64).toBe('base64');
    });
  });

  describe('Email-Specific Extensions', () => {
    it('should include required customHeaders as Map', () => {
      const customHeaders = new Map<string, string[]>([
        ['X-Custom-Header', ['value1', 'value2']],
        ['X-Priority', ['1']],
      ]);
      const email = createMinimalEmailMetadata({ customHeaders });
      expect(email.customHeaders.size).toBe(2);
      expect(email.customHeaders.get('X-Custom-Header')).toEqual([
        'value1',
        'value2',
      ]);
    });

    it('should support empty customHeaders Map', () => {
      const email = createMinimalEmailMetadata();
      expect(email.customHeaders.size).toBe(0);
    });

    it('should support optional parts field for multipart messages', () => {
      const textPart: IMimePart = {
        contentType: createContentType('text', 'plain'),
        body: new Uint8Array([72, 101, 108, 108, 111]),
        size: 5,
      };
      const htmlPart: IMimePart = {
        contentType: createContentType('text', 'html'),
        body: new Uint8Array([60, 104, 49, 62, 72, 105, 60, 47, 104, 49, 62]),
        size: 11,
      };
      const email = createMinimalEmailMetadata({
        contentType: createContentType(
          'multipart',
          'alternative',
          new Map([['boundary', '----=_Part_123']]),
        ),
        parts: [textPart, htmlPart],
      });
      expect(email.parts).toHaveLength(2);
      expect(email.parts?.[0].contentType.type).toBe('text');
      expect(email.parts?.[1].contentType.subtype).toBe('html');
    });

    it('should support optional attachments field', () => {
      const attachment: IAttachmentMetadata = {
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1024000,
        cblMagnetUrl: 'magnet:?xt=urn:brightchain:abc123',
        blockIds: ['block1', 'block2'],
        checksum: 'sha3-abc123',
        contentMd5: 'md5-xyz789',
      };
      const email = createMinimalEmailMetadata({ attachments: [attachment] });
      expect(email.attachments).toHaveLength(1);
      expect(email.attachments?.[0].filename).toBe('document.pdf');
      expect(email.attachments?.[0].mimeType).toBe('application/pdf');
    });
  });

  describe('Delivery Tracking Extensions', () => {
    it('should include required deliveryReceipts as Map', () => {
      const receipt: IDeliveryReceipt = {
        recipientId: 'recipient-1',
        recipientNode: 'node-1',
        status: DeliveryStatus.Delivered,
        queuedAt: new Date('2024-01-01T12:00:00Z'),
        sentAt: new Date('2024-01-01T12:00:01Z'),
        deliveredAt: new Date('2024-01-01T12:00:05Z'),
        retryCount: 0,
      };
      const deliveryReceipts = new Map([['recipient-1', receipt]]);
      const email = createMinimalEmailMetadata({ deliveryReceipts });
      expect(email.deliveryReceipts.size).toBe(1);
      expect(email.deliveryReceipts.get('recipient-1')?.status).toBe(
        'delivered',
      );
    });

    it('should include required readReceipts as Map', () => {
      const readReceipts = new Map([
        ['recipient-1', new Date('2024-01-01T13:00:00Z')],
      ]);
      const email = createMinimalEmailMetadata({ readReceipts });
      expect(email.readReceipts.size).toBe(1);
      expect(email.readReceipts.get('recipient-1')).toBeInstanceOf(Date);
    });

    it('should support empty delivery and read receipts', () => {
      const email = createMinimalEmailMetadata();
      expect(email.deliveryReceipts.size).toBe(0);
      expect(email.readReceipts.size).toBe(0);
    });
  });

  describe('Resent Headers for Forwarding (RFC 5322 Section 3.6.6)', () => {
    it('should support optional resentHeaders field', () => {
      const resentBlock: IResentHeaderBlock = {
        resentFrom: createMailbox('forwarder', 'example.com'),
        resentTo: [createMailbox('new-recipient', 'example.com')],
        resentDate: new Date('2024-01-02T10:00:00Z'),
        resentMessageId: '<resent-123@example.com>',
      };
      const email = createMinimalEmailMetadata({
        resentHeaders: [resentBlock],
      });
      expect(email.resentHeaders).toHaveLength(1);
      expect(email.resentHeaders?.[0].resentFrom.address).toBe(
        'forwarder@example.com',
      );
      expect(email.resentHeaders?.[0].resentMessageId).toBe(
        '<resent-123@example.com>',
      );
    });

    it('should support multiple resent header blocks for multiple forwards', () => {
      const firstForward: IResentHeaderBlock = {
        resentFrom: createMailbox('forwarder1', 'example.com'),
        resentTo: [createMailbox('forwarder2', 'example.com')],
        resentDate: new Date('2024-01-02T10:00:00Z'),
        resentMessageId: '<resent-1@example.com>',
      };
      const secondForward: IResentHeaderBlock = {
        resentFrom: createMailbox('forwarder2', 'example.com'),
        resentTo: [createMailbox('final-recipient', 'example.com')],
        resentCc: [createMailbox('cc-on-forward', 'example.com')],
        resentDate: new Date('2024-01-03T10:00:00Z'),
        resentMessageId: '<resent-2@example.com>',
      };
      // Most recent forward first
      const email = createMinimalEmailMetadata({
        resentHeaders: [secondForward, firstForward],
      });
      expect(email.resentHeaders).toHaveLength(2);
      expect(email.resentHeaders?.[0].resentFrom.address).toBe(
        'forwarder2@example.com',
      );
      expect(email.resentHeaders?.[1].resentFrom.address).toBe(
        'forwarder1@example.com',
      );
    });

    it('should allow resentHeaders to be undefined', () => {
      const email = createMinimalEmailMetadata();
      expect(email.resentHeaders).toBeUndefined();
    });
  });

  describe('IMessageMetadata Extension', () => {
    it('should include all IMessageMetadata fields', () => {
      const email = createMinimalEmailMetadata();
      // IBlockMetadata fields
      expect(email.blockId).toBeDefined();
      expect(email.createdAt).toBeInstanceOf(Date);
      expect(email.size).toBe(1024);
      expect(email.checksum).toBe('abc123');

      // IMessageMetadata fields
      expect(email.messageType).toBe('email');
      expect(email.senderId).toBe('sender-node-1');
      expect(email.recipients).toEqual(['recipient-node-1']);
      expect(email.priority).toBe(MessagePriority.NORMAL);
      expect(email.encryptionScheme).toBe(MessageEncryptionScheme.NONE);
      expect(email.isCBL).toBe(false);
    });
  });

  describe('Complex Email Scenarios', () => {
    it('should support a full-featured email with all optional fields', () => {
      const email = createMinimalEmailMetadata({
        sender: createMailbox('actual-sender', 'example.com'),
        replyTo: [createMailbox('reply', 'example.com')],
        cc: [createMailbox('cc1', 'example.com')],
        bcc: [createMailbox('bcc1', 'example.com')],
        inReplyTo: '<parent@example.com>',
        references: ['<root@example.com>', '<parent@example.com>'],
        subject: 'Re: Important Discussion',
        comments: ['Forwarded from internal'],
        keywords: ['important', 'discussion'],
        contentTransferEncoding: ContentTransferEncoding.QuotedPrintable,
        customHeaders: new Map([
          ['X-Mailer', ['BrightChain/1.0']],
          ['X-Priority', ['1']],
        ]),
        parts: [
          {
            contentType: createContentType('text', 'plain'),
            body: new Uint8Array([72, 101, 108, 108, 111]),
            size: 5,
          },
        ],
        attachments: [
          {
            filename: 'report.pdf',
            mimeType: 'application/pdf',
            size: 2048,
            cblMagnetUrl: 'magnet:?xt=urn:brightchain:def456',
            blockIds: ['b1', 'b2'],
            checksum: 'sha3-def456',
          },
        ],
        deliveryReceipts: new Map([
          [
            'recipient-1',
            {
              recipientId: 'recipient-1',
              recipientNode: 'node-1',
              status: DeliveryStatus.Delivered,
              retryCount: 0,
            },
          ],
        ]),
        readReceipts: new Map([['recipient-1', new Date()]]),
        resentHeaders: [
          {
            resentFrom: createMailbox('forwarder', 'example.com'),
            resentTo: [createMailbox('new-recipient', 'example.com')],
            resentDate: new Date(),
            resentMessageId: '<resent@example.com>',
          },
        ],
      });

      // Verify all fields are populated
      expect(email.sender).toBeDefined();
      expect(email.replyTo).toHaveLength(1);
      expect(email.cc).toHaveLength(1);
      expect(email.bcc).toHaveLength(1);
      expect(email.inReplyTo).toBeDefined();
      expect(email.references).toHaveLength(2);
      expect(email.subject).toBe('Re: Important Discussion');
      expect(email.comments).toHaveLength(1);
      expect(email.keywords).toHaveLength(2);
      expect(email.contentTransferEncoding).toBe(
        ContentTransferEncoding.QuotedPrintable,
      );
      expect(email.customHeaders.size).toBe(2);
      expect(email.parts).toHaveLength(1);
      expect(email.attachments).toHaveLength(1);
      expect(email.deliveryReceipts.size).toBe(1);
      expect(email.readReceipts.size).toBe(1);
      expect(email.resentHeaders).toHaveLength(1);
    });

    it('should support multipart/mixed with nested multipart/alternative', () => {
      const textPart: IMimePart = {
        contentType: createContentType('text', 'plain'),
        body: new Uint8Array([72, 101, 108, 108, 111]),
        size: 5,
      };
      const htmlPart: IMimePart = {
        contentType: createContentType('text', 'html'),
        body: new Uint8Array([60, 104, 49, 62]),
        size: 4,
      };
      const alternativePart: IMimePart = {
        contentType: createContentType(
          'multipart',
          'alternative',
          new Map([['boundary', '----=_Alt']]),
        ),
        parts: [textPart, htmlPart],
        size: 9,
      };
      const attachmentPart: IMimePart = {
        contentType: createContentType('application', 'pdf'),
        contentTransferEncoding: ContentTransferEncoding.Base64,
        contentDisposition: { type: 'attachment', filename: 'doc.pdf' },
        bodyBlockIds: ['block-1', 'block-2'],
        size: 50000,
      };

      const email = createMinimalEmailMetadata({
        contentType: createContentType(
          'multipart',
          'mixed',
          new Map([['boundary', '----=_Mixed']]),
        ),
        parts: [alternativePart, attachmentPart],
      });

      expect(email.parts).toHaveLength(2);
      expect(email.parts?.[0].parts).toHaveLength(2); // nested alternative
      expect(email.parts?.[1].contentDisposition?.type).toBe('attachment');
    });
  });
});
