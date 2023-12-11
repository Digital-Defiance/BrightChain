/**
 * Unit tests for Task 10.1: Add attachment encryption to message send flow.
 *
 * Tests that ChannelService, GroupService, and ConversationService:
 * - Accept optional attachments in sendMessage()
 * - Validate maxFileSizeBytes and maxAttachmentsPerMessage limits
 * - Throw AttachmentTooLargeError / TooManyAttachmentsError on violation
 * - Record IChatAttachmentMetadata in the message's attachments array
 * - Continue to work without attachments (backward compatibility)
 *
 * Requirements: 11.1, 11.2, 11.4, 11.5
 */

import {
  AttachmentTooLargeError,
  TooManyAttachmentsError,
} from '../../../errors/encryptionErrors';
import {
  DEFAULT_ATTACHMENT_CONFIG,
  IChatAttachmentInput,
} from '../../../interfaces/communication';
import { ChannelVisibility } from '../../../enumerations/communication';
import { ChannelService } from '../channelService';
import { ConversationService } from '../conversationService';
import { GroupService } from '../groupService';
import { PermissionService } from '../permissionService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeAttachment(
  fileName: string,
  size: number,
  mimeType = 'application/octet-stream',
): IChatAttachmentInput {
  return { fileName, mimeType, content: new Uint8Array(size) };
}

// ─── ChannelService ─────────────────────────────────────────────────────────

describe('ChannelService sendMessage with attachments', () => {
  let channelService: ChannelService;
  const creator = 'alice';

  beforeEach(() => {
    const perm = new PermissionService();
    channelService = new ChannelService(perm);
  });

  it('sends a message without attachments (backward compat)', async () => {
    const ch = await channelService.createChannel('test', creator, ChannelVisibility.PUBLIC);
    const msg = await channelService.sendMessage(ch.id, creator, 'hello');
    expect(msg.attachments).toEqual([]);
  });

  it('sends a message with valid attachments', async () => {
    const ch = await channelService.createChannel('test', creator, ChannelVisibility.PUBLIC);
    const attachments = [
      makeAttachment('file1.txt', 100),
      makeAttachment('file2.png', 200, 'image/png'),
    ];
    const msg = await channelService.sendMessage(ch.id, creator, 'hello', attachments);

    expect(msg.attachments).toHaveLength(2);
    expect(msg.attachments[0].fileName).toBe('file1.txt');
    expect(msg.attachments[0].mimeType).toBe('application/octet-stream');
    expect(msg.attachments[0].originalSize).toBe(100);
    expect(msg.attachments[0].assetId).toBeDefined();
    expect(msg.attachments[1].fileName).toBe('file2.png');
    expect(msg.attachments[1].mimeType).toBe('image/png');
    expect(msg.attachments[1].originalSize).toBe(200);
  });

  it('throws AttachmentTooLargeError for oversized file', async () => {
    const ch = await channelService.createChannel('test', creator, ChannelVisibility.PUBLIC);
    const oversized = [makeAttachment('big.bin', DEFAULT_ATTACHMENT_CONFIG.maxFileSizeBytes + 1)];
    await expect(
      channelService.sendMessage(ch.id, creator, 'hello', oversized),
    ).rejects.toThrow(AttachmentTooLargeError);
  });

  it('throws TooManyAttachmentsError when exceeding count limit', async () => {
    const ch = await channelService.createChannel('test', creator, ChannelVisibility.PUBLIC);
    const tooMany = Array.from({ length: DEFAULT_ATTACHMENT_CONFIG.maxAttachmentsPerMessage + 1 }, (_, i) =>
      makeAttachment(`file${i}.txt`, 10),
    );
    await expect(
      channelService.sendMessage(ch.id, creator, 'hello', tooMany),
    ).rejects.toThrow(TooManyAttachmentsError);
  });
});


// ─── GroupService ───────────────────────────────────────────────────────────

describe('GroupService sendMessage with attachments', () => {
  let groupService: GroupService;
  const creator = 'alice';
  const member = 'bob';

  beforeEach(() => {
    const perm = new PermissionService();
    groupService = new GroupService(perm);
  });

  it('sends a message without attachments (backward compat)', async () => {
    const grp = await groupService.createGroup('grp', creator, [member]);
    const msg = await groupService.sendMessage(grp.id, creator, 'hello');
    expect(msg.attachments).toEqual([]);
  });

  it('sends a message with valid attachments', async () => {
    const grp = await groupService.createGroup('grp', creator, [member]);
    const attachments = [makeAttachment('doc.pdf', 500, 'application/pdf')];
    const msg = await groupService.sendMessage(grp.id, creator, 'hello', attachments);

    expect(msg.attachments).toHaveLength(1);
    expect(msg.attachments[0].fileName).toBe('doc.pdf');
    expect(msg.attachments[0].mimeType).toBe('application/pdf');
    expect(msg.attachments[0].originalSize).toBe(500);
    expect(msg.attachments[0].assetId).toBeDefined();
  });

  it('throws AttachmentTooLargeError for oversized file', async () => {
    const grp = await groupService.createGroup('grp', creator, [member]);
    const oversized = [makeAttachment('big.bin', DEFAULT_ATTACHMENT_CONFIG.maxFileSizeBytes + 1)];
    await expect(
      groupService.sendMessage(grp.id, creator, 'hello', oversized),
    ).rejects.toThrow(AttachmentTooLargeError);
  });

  it('throws TooManyAttachmentsError when exceeding count limit', async () => {
    const grp = await groupService.createGroup('grp', creator, [member]);
    const tooMany = Array.from({ length: DEFAULT_ATTACHMENT_CONFIG.maxAttachmentsPerMessage + 1 }, (_, i) =>
      makeAttachment(`file${i}.txt`, 10),
    );
    await expect(
      groupService.sendMessage(grp.id, creator, 'hello', tooMany),
    ).rejects.toThrow(TooManyAttachmentsError);
  });
});

// ─── ConversationService ────────────────────────────────────────────────────

describe('ConversationService sendMessage with attachments', () => {
  let conversationService: ConversationService;
  const sender = 'alice';
  const recipient = 'bob';

  beforeEach(() => {
    conversationService = new ConversationService();
    conversationService.registerMember(sender);
    conversationService.registerMember(recipient);
  });

  it('sends a message without attachments (backward compat)', async () => {
    const msg = await conversationService.sendMessage(sender, recipient, 'hello');
    expect(msg.attachments).toEqual([]);
  });

  it('sends a message with valid attachments', async () => {
    const attachments = [
      makeAttachment('photo.jpg', 1024, 'image/jpeg'),
      makeAttachment('notes.txt', 256, 'text/plain'),
    ];
    const msg = await conversationService.sendMessage(sender, recipient, 'hello', undefined, attachments);

    expect(msg.attachments).toHaveLength(2);
    expect(msg.attachments[0].fileName).toBe('photo.jpg');
    expect(msg.attachments[0].mimeType).toBe('image/jpeg');
    expect(msg.attachments[0].originalSize).toBe(1024);
    expect(msg.attachments[1].fileName).toBe('notes.txt');
    expect(msg.attachments[1].originalSize).toBe(256);
  });

  it('throws AttachmentTooLargeError for oversized file', async () => {
    const oversized = [makeAttachment('big.bin', DEFAULT_ATTACHMENT_CONFIG.maxFileSizeBytes + 1)];
    await expect(
      conversationService.sendMessage(sender, recipient, 'hello', undefined, oversized),
    ).rejects.toThrow(AttachmentTooLargeError);
  });

  it('throws TooManyAttachmentsError when exceeding count limit', async () => {
    const tooMany = Array.from({ length: DEFAULT_ATTACHMENT_CONFIG.maxAttachmentsPerMessage + 1 }, (_, i) =>
      makeAttachment(`file${i}.txt`, 10),
    );
    await expect(
      conversationService.sendMessage(sender, recipient, 'hello', undefined, tooMany),
    ).rejects.toThrow(TooManyAttachmentsError);
  });
});
