import {
  ECIESService,
  EmailString,
  Member,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { MessageEncryptionScheme } from '../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../enumerations/messaging/messagePriority';
import { CBLService } from './cblService';
import { ChecksumService } from './checksum.service';
import { ServiceProvider } from './service.provider';

describe('CBLService - MessageCBL', () => {
  let cblService: CBLService;
  let checksumService: ChecksumService;
  let eciesService: ECIESService;
  let _creator: Member;

  beforeEach(() => {
    const serviceProvider = ServiceProvider.getInstance();
    eciesService = serviceProvider.eciesService;
    checksumService = serviceProvider.checksumService;
    cblService = serviceProvider.cblService;
    const memberWithMnemonic = Member.newMember(
      eciesService,
      MemberType.User,
      'test',
      new EmailString('test@example.com'),
    );
    _creator = memberWithMnemonic.member;
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
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
        encryptionScheme,
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
        MessageEncryptionScheme.NONE,
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
        MessageEncryptionScheme.NONE,
      );

      const fullHeader = new Uint8Array(
        cblService.baseHeaderSize + messageHeader.length,
      );
      fullHeader.set(
        messageHeader,
        cblService.baseHeaderCreatorSignatureOffset,
      );

      expect(cblService.isMessageHeader(fullHeader)).toBe(true);
    });
  });
});
