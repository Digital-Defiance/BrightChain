/**
 * Unit tests for ExplodingMessageService.
 *
 * Tests time-based expiration, read-count expiration, message explosion,
 * and expired message scanning.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.7
 */

import { CommunicationEventType } from '../../enumerations/communication';
import { ICommunicationMessage } from '../../interfaces/communication';
import {
  ExplodingMessageService,
  InvalidExpirationError,
  MessageAlreadyExplodedError,
} from './explodingMessageService';

// ─── Test helpers ───────────────────────────────────────────────────────────

function createMessage(
  overrides: Partial<ICommunicationMessage> = {},
): ICommunicationMessage {
  return {
    id: 'msg-1',
    contextType: 'conversation',
    contextId: 'conv-1',
    senderId: 'member-1',
    encryptedContent: 'encrypted-content',
    createdAt: new Date(),
    editHistory: [],
    deleted: false,
    pinned: false,
    reactions: [],
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ExplodingMessageService', () => {
  describe('setExpiration', () => {
    it('should set time-based expiration with expiresAt', () => {
      const message = createMessage();
      const future = new Date(Date.now() + 60_000);

      ExplodingMessageService.setExpiration(message, { expiresAt: future });

      expect(message.expiresAt).toEqual(future);
    });

    it('should set time-based expiration with expiresInMs', () => {
      const before = Date.now();
      const message = createMessage();

      ExplodingMessageService.setExpiration(message, { expiresInMs: 30_000 });

      const after = Date.now();
      expect(message.expiresAt).toBeDefined();
      expect(message.expiresAt!.getTime()).toBeGreaterThanOrEqual(
        before + 30_000,
      );
      expect(message.expiresAt!.getTime()).toBeLessThanOrEqual(after + 30_000);
    });

    it('should set read-count expiration', () => {
      const message = createMessage();

      ExplodingMessageService.setExpiration(message, { maxReads: 3 });

      expect(message.maxReads).toBe(3);
      expect(message.readCount).toBe(0);
      expect(message.readBy).toBeDefined();
    });

    it('should support combined time and read-count expiration', () => {
      const message = createMessage();
      const future = new Date(Date.now() + 60_000);

      ExplodingMessageService.setExpiration(message, {
        expiresAt: future,
        maxReads: 5,
      });

      expect(message.expiresAt).toEqual(future);
      expect(message.maxReads).toBe(5);
    });

    it('should throw InvalidExpirationError when no options provided', () => {
      const message = createMessage();

      expect(() => ExplodingMessageService.setExpiration(message, {})).toThrow(
        InvalidExpirationError,
      );
    });

    it('should throw InvalidExpirationError for past expiresAt', () => {
      const message = createMessage();
      const past = new Date(Date.now() - 1000);

      expect(() =>
        ExplodingMessageService.setExpiration(message, { expiresAt: past }),
      ).toThrow(InvalidExpirationError);
    });

    it('should throw InvalidExpirationError for non-positive expiresInMs', () => {
      const message = createMessage();

      expect(() =>
        ExplodingMessageService.setExpiration(message, { expiresInMs: 0 }),
      ).toThrow(InvalidExpirationError);

      expect(() =>
        ExplodingMessageService.setExpiration(message, { expiresInMs: -100 }),
      ).toThrow(InvalidExpirationError);
    });

    it('should throw InvalidExpirationError for non-positive maxReads', () => {
      const message = createMessage();

      expect(() =>
        ExplodingMessageService.setExpiration(message, { maxReads: 0 }),
      ).toThrow(InvalidExpirationError);
    });

    it('should throw InvalidExpirationError for non-integer maxReads', () => {
      const message = createMessage();

      expect(() =>
        ExplodingMessageService.setExpiration(message, { maxReads: 2.5 }),
      ).toThrow(InvalidExpirationError);
    });

    it('should throw MessageAlreadyExplodedError for exploded message', () => {
      const message = createMessage({ exploded: true });

      expect(() =>
        ExplodingMessageService.setExpiration(message, { expiresInMs: 5000 }),
      ).toThrow(MessageAlreadyExplodedError);
    });
  });

  describe('markRead', () => {
    it('should increment read count on first read by a member', () => {
      const message = createMessage();
      ExplodingMessageService.setExpiration(message, { maxReads: 3 });

      ExplodingMessageService.markRead(message, 'reader-1');

      expect(message.readCount).toBe(1);
      expect(message.readBy!.has('reader-1')).toBe(true);
    });

    it('should not increment read count on repeat read by same member', () => {
      const message = createMessage();
      ExplodingMessageService.setExpiration(message, { maxReads: 3 });

      ExplodingMessageService.markRead(message, 'reader-1');
      ExplodingMessageService.markRead(message, 'reader-1');

      expect(message.readCount).toBe(1);
    });

    it('should increment for different members', () => {
      const message = createMessage();
      ExplodingMessageService.setExpiration(message, { maxReads: 3 });

      ExplodingMessageService.markRead(message, 'reader-1');
      ExplodingMessageService.markRead(message, 'reader-2');

      expect(message.readCount).toBe(2);
    });

    it('should return true when read count reaches maxReads', () => {
      const message = createMessage();
      ExplodingMessageService.setExpiration(message, { maxReads: 2 });

      ExplodingMessageService.markRead(message, 'reader-1');
      const shouldExplode = ExplodingMessageService.markRead(
        message,
        'reader-2',
      );

      expect(shouldExplode).toBe(true);
    });

    it('should return false when read count is below maxReads', () => {
      const message = createMessage();
      ExplodingMessageService.setExpiration(message, { maxReads: 5 });

      const shouldExplode = ExplodingMessageService.markRead(
        message,
        'reader-1',
      );

      expect(shouldExplode).toBe(false);
    });

    it('should throw MessageAlreadyExplodedError for exploded message', () => {
      const message = createMessage({ exploded: true });

      expect(() =>
        ExplodingMessageService.markRead(message, 'reader-1'),
      ).toThrow(MessageAlreadyExplodedError);
    });

    it('should initialize readBy map if not present', () => {
      const message = createMessage();
      // No setExpiration call — readBy is undefined

      ExplodingMessageService.markRead(message, 'reader-1');

      expect(message.readBy).toBeDefined();
      expect(message.readBy!.has('reader-1')).toBe(true);
    });
  });

  describe('checkExpiration', () => {
    it('should return time_expired for past expiresAt', () => {
      const message = createMessage({
        expiresAt: new Date(Date.now() - 1000),
      });

      const result = ExplodingMessageService.checkExpiration(message);

      expect(result).toBe('time_expired');
    });

    it('should return null for future expiresAt', () => {
      const message = createMessage({
        expiresAt: new Date(Date.now() + 60_000),
      });

      const result = ExplodingMessageService.checkExpiration(message);

      expect(result).toBeNull();
    });

    it('should return read_count_exceeded when readCount >= maxReads', () => {
      const message = createMessage({
        maxReads: 2,
        readCount: 2,
      });

      const result = ExplodingMessageService.checkExpiration(message);

      expect(result).toBe('read_count_exceeded');
    });

    it('should return null when readCount < maxReads', () => {
      const message = createMessage({
        maxReads: 5,
        readCount: 3,
      });

      const result = ExplodingMessageService.checkExpiration(message);

      expect(result).toBeNull();
    });

    it('should return null for already exploded messages', () => {
      const message = createMessage({
        exploded: true,
        expiresAt: new Date(Date.now() - 1000),
      });

      const result = ExplodingMessageService.checkExpiration(message);

      expect(result).toBeNull();
    });

    it('should prioritize time expiration over read count', () => {
      const message = createMessage({
        expiresAt: new Date(Date.now() - 1000),
        maxReads: 5,
        readCount: 10,
      });

      const result = ExplodingMessageService.checkExpiration(message);

      expect(result).toBe('time_expired');
    });

    it('should accept a custom now parameter', () => {
      const future = new Date(Date.now() + 60_000);
      const message = createMessage({ expiresAt: future });

      const farFuture = new Date(future.getTime() + 1000);
      const result = ExplodingMessageService.checkExpiration(
        message,
        farFuture,
      );

      expect(result).toBe('time_expired');
    });
  });

  describe('explode', () => {
    it('should clear encrypted content', () => {
      const message = createMessage({
        expiresAt: new Date(Date.now() - 1000),
      });

      ExplodingMessageService.explode(message);

      expect(message.encryptedContent).toBe('');
    });

    it('should clear edit history', () => {
      const message = createMessage({
        expiresAt: new Date(Date.now() - 1000),
        editHistory: [{ content: 'old', editedAt: new Date() }],
      });

      ExplodingMessageService.explode(message);

      expect(message.editHistory).toEqual([]);
    });

    it('should mark message as exploded', () => {
      const message = createMessage({
        expiresAt: new Date(Date.now() - 1000),
      });

      ExplodingMessageService.explode(message);

      expect(message.exploded).toBe(true);
      expect(message.explodedAt).toBeDefined();
    });

    it('should return an explosion event', () => {
      const message = createMessage({
        expiresAt: new Date(Date.now() - 1000),
      });

      const event = ExplodingMessageService.explode(message);

      expect(event.type).toBe(CommunicationEventType.MESSAGE_EXPLODED);
      expect(event.messageId).toBe('msg-1');
      expect(event.contextId).toBe('conv-1');
      expect(event.contextType).toBe('conversation');
      expect(event.explodedAt).toBeDefined();
    });

    it('should throw MessageAlreadyExplodedError for exploded message', () => {
      const message = createMessage({ exploded: true });

      expect(() => ExplodingMessageService.explode(message)).toThrow(
        MessageAlreadyExplodedError,
      );
    });
  });

  describe('deleteExpired', () => {
    it('should find time-expired messages', () => {
      const expired = createMessage({
        id: 'expired-1',
        expiresAt: new Date(Date.now() - 1000),
      });
      const active = createMessage({
        id: 'active-1',
        expiresAt: new Date(Date.now() + 60_000),
      });

      const result = ExplodingMessageService.deleteExpired([expired, active]);

      expect(result.expired).toHaveLength(1);
      expect(result.expired[0].id).toBe('expired-1');
      expect(result.events).toHaveLength(1);
      expect(result.events[0].reason).toBe('time_expired');
    });

    it('should find read-count-exceeded messages', () => {
      const exceeded = createMessage({
        id: 'exceeded-1',
        maxReads: 2,
        readCount: 3,
      });

      const result = ExplodingMessageService.deleteExpired([exceeded]);

      expect(result.expired).toHaveLength(1);
      expect(result.events[0].reason).toBe('read_count_exceeded');
    });

    it('should skip already exploded messages', () => {
      const exploded = createMessage({
        id: 'exploded-1',
        exploded: true,
        expiresAt: new Date(Date.now() - 1000),
      });

      const result = ExplodingMessageService.deleteExpired([exploded]);

      expect(result.expired).toHaveLength(0);
      expect(result.events).toHaveLength(0);
    });

    it('should return empty results for no expired messages', () => {
      const active = createMessage({
        expiresAt: new Date(Date.now() + 60_000),
      });

      const result = ExplodingMessageService.deleteExpired([active]);

      expect(result.expired).toHaveLength(0);
      expect(result.events).toHaveLength(0);
    });
  });

  describe('isExplodingMessage', () => {
    it('should return true for time-based expiration', () => {
      const message = createMessage({
        expiresAt: new Date(Date.now() + 60_000),
      });

      expect(ExplodingMessageService.isExplodingMessage(message)).toBe(true);
    });

    it('should return true for read-count expiration', () => {
      const message = createMessage({ maxReads: 3 });

      expect(ExplodingMessageService.isExplodingMessage(message)).toBe(true);
    });

    it('should return false for regular messages', () => {
      const message = createMessage();

      expect(ExplodingMessageService.isExplodingMessage(message)).toBe(false);
    });
  });

  describe('getRemainingTime', () => {
    it('should return remaining milliseconds', () => {
      const message = createMessage({
        expiresAt: new Date(Date.now() + 30_000),
      });

      const remaining = ExplodingMessageService.getRemainingTime(message);

      expect(remaining).toBeGreaterThan(29_000);
      expect(remaining).toBeLessThanOrEqual(30_000);
    });

    it('should return 0 for expired messages', () => {
      const message = createMessage({
        expiresAt: new Date(Date.now() - 1000),
      });

      const remaining = ExplodingMessageService.getRemainingTime(message);

      expect(remaining).toBe(0);
    });

    it('should return 0 for exploded messages', () => {
      const message = createMessage({
        expiresAt: new Date(Date.now() + 60_000),
        exploded: true,
      });

      const remaining = ExplodingMessageService.getRemainingTime(message);

      expect(remaining).toBe(0);
    });

    it('should return null for non-time-based messages', () => {
      const message = createMessage();

      expect(ExplodingMessageService.getRemainingTime(message)).toBeNull();
    });
  });

  describe('getRemainingReads', () => {
    it('should return remaining reads', () => {
      const message = createMessage({ maxReads: 5, readCount: 2 });

      expect(ExplodingMessageService.getRemainingReads(message)).toBe(3);
    });

    it('should return 0 when read count meets maxReads', () => {
      const message = createMessage({ maxReads: 3, readCount: 3 });

      expect(ExplodingMessageService.getRemainingReads(message)).toBe(0);
    });

    it('should return 0 for exploded messages', () => {
      const message = createMessage({
        maxReads: 5,
        readCount: 2,
        exploded: true,
      });

      expect(ExplodingMessageService.getRemainingReads(message)).toBe(0);
    });

    it('should return null for non-read-count messages', () => {
      const message = createMessage();

      expect(ExplodingMessageService.getRemainingReads(message)).toBeNull();
    });
  });
});
