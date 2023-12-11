/**
 * Unit tests for Task 10.2: Attachment metadata in message retrieval.
 *
 * Verifies that getMessages() returns messages with their attachments
 * array intact (assetId, fileName, mimeType, encryptedSize, originalSize)
 * across ChannelService, GroupService, and ConversationService.
 *
 * Requirements: 11.3, 11.6
 */

import { IChatAttachmentInput } from '../../../interfaces/communication';
import { ChannelVisibility } from '../../../enumerations/communication';
import { ChannelService } from '../channelService';
import { ConversationService } from '../conversationService';
import { GroupService } from '../groupService';
import { PermissionService } from '../permissionService';

function makeAttachment(
  fileName: string,
  size: number,
  mimeType = 'application/octet-stream',
): IChatAttachmentInput {
  return { fileName, mimeType, content: new Uint8Array(size) };
}

// ─── ChannelService ─────────────────────────────────────────────────────────

describe('ChannelService getMessages returns attachment metadata', () => {
  let channelService: ChannelService;
  const creator = 'alice';

  beforeEach(() => {
    channelService = new ChannelService(new PermissionService());
  });

  it('retrieved message contains correct attachment metadata', async () => {
    const ch = await channelService.createChannel('ch', creator, ChannelVisibility.PUBLIC);
    const attachments = [
      makeAttachment('report.pdf', 4096, 'application/pdf'),
      makeAttachment('photo.png', 2048, 'image/png'),
    ];
    await channelService.sendMessage(ch.id, creator, 'see attached', attachments);

    const result = await channelService.getMessages(ch.id, creator);
    expect(result.items).toHaveLength(1);

    const msg = result.items[0];
    expect(msg.attachments).toHaveLength(2);

    expect(msg.attachments[0]).toEqual(
      expect.objectContaining({
        fileName: 'report.pdf',
        mimeType: 'application/pdf',
        encryptedSize: 4096,
        originalSize: 4096,
      }),
    );
    expect(msg.attachments[0].assetId).toBeDefined();

    expect(msg.attachments[1]).toEqual(
      expect.objectContaining({
        fileName: 'photo.png',
        mimeType: 'image/png',
        encryptedSize: 2048,
        originalSize: 2048,
      }),
    );
    expect(msg.attachments[1].assetId).toBeDefined();
  });

  it('retrieved message without attachments has empty array', async () => {
    const ch = await channelService.createChannel('ch', creator, ChannelVisibility.PUBLIC);
    await channelService.sendMessage(ch.id, creator, 'no files');

    const result = await channelService.getMessages(ch.id, creator);
    expect(result.items[0].attachments).toEqual([]);
  });
});

// ─── GroupService ───────────────────────────────────────────────────────────

describe('GroupService getMessages returns attachment metadata', () => {
  let groupService: GroupService;
  const creator = 'alice';
  const member = 'bob';

  beforeEach(() => {
    groupService = new GroupService(new PermissionService());
  });

  it('retrieved message contains correct attachment metadata', async () => {
    const grp = await groupService.createGroup('grp', creator, [member]);
    const attachments = [makeAttachment('data.csv', 512, 'text/csv')];
    await groupService.sendMessage(grp.id, creator, 'data', attachments);

    const result = await groupService.getMessages(grp.id, creator);
    expect(result.items).toHaveLength(1);

    const msg = result.items[0];
    expect(msg.attachments).toHaveLength(1);
    expect(msg.attachments[0]).toEqual(
      expect.objectContaining({
        fileName: 'data.csv',
        mimeType: 'text/csv',
        encryptedSize: 512,
        originalSize: 512,
      }),
    );
    expect(msg.attachments[0].assetId).toBeDefined();
  });

  it('retrieved message without attachments has empty array', async () => {
    const grp = await groupService.createGroup('grp', creator, [member]);
    await groupService.sendMessage(grp.id, creator, 'text only');

    const result = await groupService.getMessages(grp.id, creator);
    expect(result.items[0].attachments).toEqual([]);
  });
});

// ─── ConversationService ────────────────────────────────────────────────────

describe('ConversationService getMessages returns attachment metadata', () => {
  let conversationService: ConversationService;
  const sender = 'alice';
  const recipient = 'bob';

  beforeEach(() => {
    conversationService = new ConversationService();
    conversationService.registerMember(sender);
    conversationService.registerMember(recipient);
  });

  it('retrieved message contains correct attachment metadata', async () => {
    const attachments = [
      makeAttachment('image.jpg', 8192, 'image/jpeg'),
      makeAttachment('doc.docx', 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ];
    const sent = await conversationService.sendMessage(sender, recipient, 'files', undefined, attachments);

    const result = await conversationService.getMessages(sent.contextId, sender);
    expect(result.items).toHaveLength(1);

    const msg = result.items[0];
    expect(msg.attachments).toHaveLength(2);

    expect(msg.attachments[0]).toEqual(
      expect.objectContaining({
        fileName: 'image.jpg',
        mimeType: 'image/jpeg',
        encryptedSize: 8192,
        originalSize: 8192,
      }),
    );
    expect(msg.attachments[0].assetId).toBeDefined();

    expect(msg.attachments[1]).toEqual(
      expect.objectContaining({
        fileName: 'doc.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        encryptedSize: 1024,
        originalSize: 1024,
      }),
    );
    expect(msg.attachments[1].assetId).toBeDefined();
  });

  it('retrieved message without attachments has empty array', async () => {
    const sent = await conversationService.sendMessage(sender, recipient, 'plain');

    const result = await conversationService.getMessages(sent.contextId, sender);
    expect(result.items[0].attachments).toEqual([]);
  });
});
