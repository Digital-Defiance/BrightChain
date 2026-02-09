/**
 * @fileoverview Property-based tests for Attachment Round-Trip
 *
 * **Feature: email-messaging-protocol, Property 6: Attachment Round-Trip**
 *
 * **Validates: Requirements 8.1, 8.3, 8.7**
 *
 * For any email with attachments, storing the email using
 * EmailMessageService.sendEmail() and then retrieving it using
 * EmailMessageService.getEmailContent() SHALL produce attachments with:
 * 1. Identical filename
 * 2. Identical MIME type
 * 3. Identical file size
 * 4. Valid checksums (SHA-256 and MD5)
 * 5. Identical binary content (byte-for-byte)
 */

import fc from 'fast-check';
import type { IGossipService } from '../../interfaces/availability/gossipService';
import { createMailbox } from '../../interfaces/messaging/emailAddress';
import type { IEmailMetadata } from '../../interfaces/messaging/emailMetadata';
import {
  EmailMessageService,
  type IAttachmentInput,
  type IEmailInput,
  type IEmailMetadataStore,
} from './emailMessageService';
import type { MessageCBLService } from './messageCBLService';

// Feature: email-messaging-protocol, Property 6: Attachment Round-Trip

// ─── Generators ─────────────────────────────────────────────────────────────

const ALPHA_LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const ALPHA_NUM = ALPHA_LOWER + DIGITS;

/**
 * Generator for a safe filename (alphanumeric + common extensions).
 */
const arbFilename: fc.Arbitrary<string> = fc
  .tuple(
    fc
      .array(fc.constantFrom(...ALPHA_NUM.split('')), {
        minLength: 3,
        maxLength: 12,
      })
      .map((chars: string[]) => chars.join('')),
    fc.constantFrom(
      '.pdf',
      '.txt',
      '.png',
      '.jpg',
      '.doc',
      '.zip',
      '.csv',
      '.xml',
    ),
  )
  .map(([name, ext]: [string, string]) => name + ext);

/**
 * Generator for a valid MIME type string.
 */
const arbMimeType: fc.Arbitrary<string> = fc.constantFrom(
  'application/pdf',
  'application/octet-stream',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/xml',
);

/**
 * Generator for attachment binary content (1 to 1024 bytes).
 * Kept small to avoid hitting size limits during property testing.
 */
const arbAttachmentContent: fc.Arbitrary<Uint8Array> = fc
  .array(fc.integer({ min: 0, max: 255 }), { minLength: 1, maxLength: 1024 })
  .map((bytes: number[]) => new Uint8Array(bytes));

/**
 * Generator for a single valid IAttachmentInput.
 */
const arbAttachmentInput: fc.Arbitrary<IAttachmentInput> = fc
  .tuple(arbFilename, arbMimeType, arbAttachmentContent)
  .map(([filename, mimeType, content]: [string, string, Uint8Array]) => ({
    filename,
    mimeType,
    content,
  }));

/**
 * Generator for a non-empty array of attachments (1-3).
 */
const arbAttachments: fc.Arbitrary<IAttachmentInput[]> = fc.array(
  arbAttachmentInput,
  {
    minLength: 1,
    maxLength: 3,
  },
);

// ─── Test Infrastructure ────────────────────────────────────────────────────

/**
 * Creates an in-memory metadata store that stores/retrieves by messageId.
 */
function createInMemoryMetadataStore(): IEmailMetadataStore & {
  storage: Map<string, IEmailMetadata>;
} {
  const storage = new Map<string, IEmailMetadata>();
  const attachmentContents = new Map<string, Uint8Array>();
  return {
    storage,
    store: jest.fn(async (metadata: IEmailMetadata) => {
      storage.set(metadata.messageId, metadata);
    }),
    get: jest.fn(async (messageId: string) => {
      return storage.get(messageId) ?? null;
    }),
    delete: jest.fn(),
    update: jest.fn(),
    queryInbox: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    getThread: jest.fn(),
    getRootMessage: jest.fn(),
    storeAttachmentContent: jest.fn(
      async (key: string, content: Uint8Array) => {
        attachmentContents.set(key, content);
      },
    ),
    getAttachmentContent: jest.fn(async (key: string) => {
      return attachmentContents.get(key) ?? null;
    }),
  };
}

function createMockGossipService(): IGossipService {
  return {
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
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Attachment Round-Trip Property Tests', () => {
  // Feature: email-messaging-protocol, Property 6: Attachment Round-Trip

  describe('Property 6: Attachment Round-Trip', () => {
    /**
     * **Feature: email-messaging-protocol, Property 6: Attachment Round-Trip**
     *
     * For any email with attachments, storing via sendEmail() and retrieving
     * via getEmailContent() SHALL produce attachments with identical
     * filename, MIME type, and file size, plus valid checksums.
     *
     * **Validates: Requirements 8.1, 8.3, 8.7**
     */
    it('should preserve attachment metadata through sendEmail then getEmailContent round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbAttachments,
          async (attachments: IAttachmentInput[]) => {
            const metadataStore = createInMemoryMetadataStore();
            const service = new EmailMessageService(
              {} as MessageCBLService,
              metadataStore,
              createMockGossipService(),
              { nodeId: 'test-node.brightchain.org' },
            );

            const input: IEmailInput = {
              from: createMailbox('sender', 'example.com'),
              to: [createMailbox('recipient', 'example.com')],
              subject: 'Email with attachments',
              textBody: 'See attached files.',
              attachments,
            };

            // Store
            const sendResult = await service.sendEmail(input);
            expect(sendResult.success).toBe(true);

            // Retrieve
            const content = await service.getEmailContent(sendResult.messageId);

            // Verify attachment count matches
            expect(content.attachments.length).toBe(attachments.length);

            // Verify each attachment's metadata round-trips correctly
            for (let i = 0; i < attachments.length; i++) {
              const original = attachments[i];
              const retrieved = content.attachments[i];

              // 1. Identical filename
              expect(retrieved.metadata.filename).toBe(original.filename);

              // 2. Identical MIME type
              expect(retrieved.metadata.mimeType).toBe(original.mimeType);

              // 3. Identical file size
              expect(retrieved.metadata.size).toBe(original.content.length);

              // 4. Valid checksums
              // SHA-256 checksum: 64 hex characters
              expect(retrieved.metadata.checksum).toMatch(/^[0-9a-f]{64}$/);

              // MD5 checksum (base64): non-empty string
              expect(retrieved.metadata.contentMd5).toBeDefined();
              expect(typeof retrieved.metadata.contentMd5).toBe('string');
              expect(retrieved.metadata.contentMd5!.length).toBeGreaterThan(0);

              // CBL magnet URL should be present
              expect(retrieved.metadata.cblMagnetUrl).toBeDefined();
              expect(retrieved.metadata.cblMagnetUrl.length).toBeGreaterThan(0);

              // Block IDs should be present
              expect(retrieved.metadata.blockIds).toBeDefined();
              expect(retrieved.metadata.blockIds.length).toBeGreaterThan(0);

              // 5. Identical binary content (byte-for-byte)
              expect(retrieved.content.length).toBe(original.content.length);
              expect(Buffer.from(retrieved.content)).toEqual(
                Buffer.from(original.content),
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: email-messaging-protocol, Property 6: Attachment Round-Trip**
     *
     * For any two distinct attachment contents, the checksums produced by
     * storeAttachment SHALL differ (collision resistance).
     *
     * **Validates: Requirements 8.1, 8.3**
     */
    it('should produce distinct checksums for distinct attachment contents', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbAttachmentContent,
          arbAttachmentContent,
          async (content1: Uint8Array, content2: Uint8Array) => {
            // Skip if contents happen to be identical
            if (
              content1.length === content2.length &&
              content1.every((b, i) => b === content2[i])
            ) {
              return;
            }

            const metadataStore = createInMemoryMetadataStore();
            const service = new EmailMessageService(
              {} as MessageCBLService,
              metadataStore,
              createMockGossipService(),
              { nodeId: 'test-node.brightchain.org' },
            );

            // Send email with first attachment
            const result1 = await service.sendEmail({
              from: createMailbox('sender', 'example.com'),
              to: [createMailbox('recipient', 'example.com')],
              textBody: 'File 1',
              attachments: [
                {
                  filename: 'file1.bin',
                  mimeType: 'application/octet-stream',
                  content: content1,
                },
              ],
            });

            // Send email with second attachment
            const result2 = await service.sendEmail({
              from: createMailbox('sender', 'example.com'),
              to: [createMailbox('recipient', 'example.com')],
              textBody: 'File 2',
              attachments: [
                {
                  filename: 'file2.bin',
                  mimeType: 'application/octet-stream',
                  content: content2,
                },
              ],
            });

            const email1 = await service.getEmailContent(result1.messageId);
            const email2 = await service.getEmailContent(result2.messageId);

            // Checksums should differ for different content
            expect(email1.attachments[0].metadata.checksum).not.toBe(
              email2.attachments[0].metadata.checksum,
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
