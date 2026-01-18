import { describe, it, expect, beforeEach } from '@jest/globals';
import { CBLService } from './cblService';
import { ChecksumService } from './checksum.service';
import { ECIESService, EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
import { MessagePriority } from '../enumerations/messaging/messagePriority';
import { MessageEncryptionScheme } from '../enumerations/messaging/messageEncryptionScheme';

describe('CBLService - MessageCBL', () => {
  let cblService: CBLService;
  let checksumService: ChecksumService;
  let eciesService: ECIESService;
  let creator: Member;

  beforeEach(async () => {
    checksumService = new ChecksumService();
    eciesService = new ECIESService();
    cblService = new CBLService(checksumService, eciesService);
    const memberWithMnemonic = await Member.newMember(
      eciesService,
      MemberType.User,
      'test',
      new EmailString('test@example.com')
    );
    creator = memberWithMnemonic.member;
  });

  describe('makeMessageHeader', () => {
    it('should create a message header with all fields', () => {
      const messageType = 'chat';
      const senderId = 'sender123';
      const recipients = ['recipient1', 'recipient2'];
      const priority = MessagePriority.HIGH;
      const encryptionScheme = MessageEncryptionScheme.RECIPIENT_KEYS;

      const header = cblService.makeMessageHeader(
        messageType,
        senderId,
        recipients,
        priority,
        encryptionScheme
      );

      expect(header).toBeInstanceOf(Uint8Array);
      expect(header.length).toBeGreaterThan(0);
      expect(header[0]).toBe(2); // isMessage flag
    });

    it('should handle empty recipients list', () => {
      const header = cblService.makeMessageHeader(
        'broadcast',
        'sender123',
        [],
        MessagePriority.NORMAL,
        MessageEncryptionScheme.NONE
      );

      expect(header).toBeInstanceOf(Uint8Array);
      expect(header[0]).toBe(2);
    });
  });

  describe('isMessageHeader', () => {
    it('should detect message headers', () => {
      const messageHeader = cblService.makeMessageHeader(
        'test',
        'sender',
        ['recipient'],
        MessagePriority.NORMAL,
        MessageEncryptionScheme.NONE
      );

      const fullHeader = new Uint8Array(cblService.baseHeaderSize + messageHeader.length);
      fullHeader.set(messageHeader, cblService.baseHeaderCreatorSignatureOffset);

      expect(cblService.isMessageHeader(fullHeader)).toBe(true);
    });
  });
});
