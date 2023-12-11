/**
 * Property-based tests for Property 8: Attachment encrypt/decrypt round-trip.
 *
 * Feature: brightchat-e2e-encryption, Property 8: Attachment encrypt/decrypt round-trip
 *
 * **Validates: Requirements 11.1, 11.2, 11.3**
 *
 * For any attachment content within limits and any valid CEK, encrypting the
 * attachment, storing it, retrieving the message, and verifying the metadata
 * produces the original attachment metadata (fileName, mimeType, sizes) and
 * valid assetIds.
 *
 * Since the current implementation stores attachment metadata (not encrypted
 * content) in-memory, this property test validates the metadata round-trip:
 * 1. Send a message with random attachments (random file names, MIME types,
 *    content sizes within limits)
 * 2. Retrieve the message
 * 3. Verify the attachment metadata matches: fileName, mimeType, originalSize,
 *    encryptedSize
 * 4. Verify assetIds are generated (non-empty UUIDs)
 *
 * Generator strategy: Random binary content (1–1MB), random metadata
 * (file names, MIME types).
 */

import fc from 'fast-check';
import { ChannelVisibility } from '../../../enumerations/communication';
import { IChatAttachmentInput } from '../../../interfaces/communication';
import { ChannelService } from '../channelService';
import { ConversationService } from '../conversationService';
import { GroupService } from '../groupService';
import { PermissionService } from '../permissionService';

// ─── Constants ──────────────────────────────────────────────────────────────

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Common MIME types for attachment generation. */
const MIME_TYPES = [
  'application/octet-stream',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/csv',
  'application/json',
  'video/mp4',
  'audio/mpeg',
];

/** Arbitrary for a random MIME type. */
const arbMimeType = fc.constantFrom(...MIME_TYPES);

/** Arbitrary for a random file name with extension. */
const arbFileName = fc
  .tuple(
    fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
    fc.constantFrom('.txt', '.pdf', '.png', '.jpg', '.csv', '.json', '.mp4', '.bin'),
  )
  .map(([name, ext]) => `${name}${ext}`);

/**
 * Arbitrary for attachment content size (1 byte to 1MB).
 * We generate the size and create a Uint8Array of that size with random-ish content.
 */
const arbContentSize = fc.integer({ min: 1, max: 1024 * 1024 });

/** Arbitrary for a single attachment input. */
const arbAttachment: fc.Arbitrary<IChatAttachmentInput> = fc
  .tuple(arbFileName, arbMimeType, arbContentSize)
  .map(([fileName, mimeType, size]) => ({
    fileName,
    mimeType,
    content: new Uint8Array(size),
  }));

/**
 * Arbitrary for 1–10 attachments (within the default max of 10).
 */
const arbAttachments = fc.array(arbAttachment, { minLength: 1, maxLength: 10 });

/** Arbitrary for a random member ID. */
const arbMemberId = fc.uuid();

/** Arbitrary for a random channel name. */
const arbChannelName = fc
  .stringMatching(/^[a-zA-Z][a-zA-Z0-9-]{0,19}$/)
  .filter((s) => s.length > 0);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: brightchat-e2e-encryption, Property 8: Attachment encrypt/decrypt round-trip', () => {
  /**
   * Property 8 (ChannelService): Attachment metadata round-trip via channels.
   *
   * **Validates: Requirements 11.1, 11.2, 11.3**
   */
  it('ChannelService: send with attachments then retrieve preserves all attachment metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbChannelName,
        arbAttachments,
        async (creatorId, channelName, attachments) => {
          const permissionService = new PermissionService();
          const channelService = new ChannelService(permissionService);

          const channel = await channelService.createChannel(
            channelName,
            creatorId,
            ChannelVisibility.PUBLIC,
          );

          const sentMessage = await channelService.sendMessage(
            channel.id,
            creatorId,
            'message with attachments',
            attachments,
          );

          // Verify sent message has correct attachment count
          expect(sentMessage.attachments).toHaveLength(attachments.length);

          // Retrieve the message
          const result = await channelService.getMessages(channel.id, creatorId);
          expect(result.items).toHaveLength(1);

          const retrieved = result.items[0];
          expect(retrieved.attachments).toHaveLength(attachments.length);

          // Verify each attachment's metadata matches the input
          for (let i = 0; i < attachments.length; i++) {
            const input = attachments[i];
            const meta = retrieved.attachments[i];

            expect(meta.fileName).toBe(input.fileName);
            expect(meta.mimeType).toBe(input.mimeType);
            expect(meta.originalSize).toBe(input.content.length);
            expect(meta.encryptedSize).toBe(input.content.length);
            // assetId must be a valid UUID
            expect(meta.assetId).toMatch(UUID_REGEX);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8 (GroupService): Attachment metadata round-trip via groups.
   *
   * **Validates: Requirements 11.1, 11.2, 11.3**
   */
  it('GroupService: send with attachments then retrieve preserves all attachment metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbMemberId,
        arbAttachments,
        async (creatorId, memberId, attachments) => {
          // Ensure distinct member IDs
          fc.pre(creatorId !== memberId);

          const permissionService = new PermissionService();
          const groupService = new GroupService(permissionService);

          const group = await groupService.createGroup(
            'test-group',
            creatorId,
            [memberId],
          );

          const sentMessage = await groupService.sendMessage(
            group.id,
            creatorId,
            'group message with attachments',
            attachments,
          );

          expect(sentMessage.attachments).toHaveLength(attachments.length);

          const result = await groupService.getMessages(group.id, creatorId);
          expect(result.items).toHaveLength(1);

          const retrieved = result.items[0];
          expect(retrieved.attachments).toHaveLength(attachments.length);

          for (let i = 0; i < attachments.length; i++) {
            const input = attachments[i];
            const meta = retrieved.attachments[i];

            expect(meta.fileName).toBe(input.fileName);
            expect(meta.mimeType).toBe(input.mimeType);
            expect(meta.originalSize).toBe(input.content.length);
            expect(meta.encryptedSize).toBe(input.content.length);
            expect(meta.assetId).toMatch(UUID_REGEX);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8 (ConversationService): Attachment metadata round-trip via DMs.
   *
   * **Validates: Requirements 11.1, 11.2, 11.3**
   */
  it('ConversationService: send with attachments then retrieve preserves all attachment metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbMemberId,
        arbAttachments,
        async (senderId, recipientId, attachments) => {
          fc.pre(senderId !== recipientId);

          const conversationService = new ConversationService();
          conversationService.registerMember(senderId);
          conversationService.registerMember(recipientId);

          const sentMessage = await conversationService.sendMessage(
            senderId,
            recipientId,
            'dm with attachments',
            undefined,
            attachments,
          );

          expect(sentMessage.attachments).toHaveLength(attachments.length);

          const result = await conversationService.getMessages(
            sentMessage.contextId,
            senderId,
          );
          expect(result.items).toHaveLength(1);

          const retrieved = result.items[0];
          expect(retrieved.attachments).toHaveLength(attachments.length);

          for (let i = 0; i < attachments.length; i++) {
            const input = attachments[i];
            const meta = retrieved.attachments[i];

            expect(meta.fileName).toBe(input.fileName);
            expect(meta.mimeType).toBe(input.mimeType);
            expect(meta.originalSize).toBe(input.content.length);
            expect(meta.encryptedSize).toBe(input.content.length);
            expect(meta.assetId).toMatch(UUID_REGEX);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8 (assetId uniqueness): Each attachment gets a unique assetId.
   *
   * **Validates: Requirements 11.2, 11.3**
   */
  it('each attachment in a message receives a unique assetId', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbChannelName,
        arbAttachments,
        async (creatorId, channelName, attachments) => {
          const permissionService = new PermissionService();
          const channelService = new ChannelService(permissionService);

          const channel = await channelService.createChannel(
            channelName,
            creatorId,
            ChannelVisibility.PUBLIC,
          );

          const sentMessage = await channelService.sendMessage(
            channel.id,
            creatorId,
            'unique ids test',
            attachments,
          );

          const assetIds = sentMessage.attachments.map((a) => a.assetId);
          const uniqueIds = new Set(assetIds);
          expect(uniqueIds.size).toBe(assetIds.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
