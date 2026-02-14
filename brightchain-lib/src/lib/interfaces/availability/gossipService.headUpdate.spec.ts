/**
 * Unit tests for head_update announcement type validation.
 *
 * Tests that validateBlockAnnouncement correctly validates head_update
 * announcements used for HeadRegistry cross-node synchronization.
 *
 * Validates: Requirements 2.1
 */

import {
  BlockAnnouncement,
  HeadUpdateMetadata,
  validateBlockAnnouncement,
} from './gossipService';

/** Helper to build a valid head_update announcement. */
function makeHeadUpdateAnnouncement(
  overrides: Partial<BlockAnnouncement> = {},
): BlockAnnouncement {
  return {
    type: 'head_update',
    blockId: 'abc123def456',
    nodeId: 'node-1',
    timestamp: new Date(),
    ttl: 3,
    headUpdate: {
      dbName: 'mydb',
      collectionName: 'users',
    },
    ...overrides,
  };
}

describe('validateBlockAnnouncement – head_update type (Req 2.1)', () => {
  it('should accept a valid head_update announcement', () => {
    const announcement = makeHeadUpdateAnnouncement();
    expect(validateBlockAnnouncement(announcement)).toBe(true);
  });

  it('should accept head_update with various valid dbName/collectionName values', () => {
    const cases: HeadUpdateMetadata[] = [
      { dbName: 'db1', collectionName: 'col1' },
      { dbName: 'production-db', collectionName: '__cbl_index__' },
      { dbName: 'a', collectionName: 'b' },
    ];

    for (const headUpdate of cases) {
      const announcement = makeHeadUpdateAnnouncement({ headUpdate });
      expect(validateBlockAnnouncement(announcement)).toBe(true);
    }
  });

  it('should reject head_update with empty blockId', () => {
    const announcement = makeHeadUpdateAnnouncement({ blockId: '' });
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });

  it('should reject head_update with missing headUpdate metadata', () => {
    const announcement = makeHeadUpdateAnnouncement();
    delete announcement.headUpdate;
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });

  it('should reject head_update with empty dbName', () => {
    const announcement = makeHeadUpdateAnnouncement({
      headUpdate: { dbName: '', collectionName: 'users' },
    });
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });

  it('should reject head_update with empty collectionName', () => {
    const announcement = makeHeadUpdateAnnouncement({
      headUpdate: { dbName: 'mydb', collectionName: '' },
    });
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });

  it('should reject head_update that has messageDelivery metadata', () => {
    const announcement = makeHeadUpdateAnnouncement({
      messageDelivery: {
        messageId: 'msg-1',
        recipientIds: ['r1'],
        priority: 'normal',
        blockIds: ['b1'],
        cblBlockId: 'cbl-1',
        ackRequired: false,
      },
    });
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });

  it('should reject head_update that has deliveryAck metadata', () => {
    const announcement = makeHeadUpdateAnnouncement({
      deliveryAck: {
        messageId: 'msg-1',
        recipientId: 'r1',
        status: 'delivered',
        originalSenderNode: 'node-2',
      },
    });
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });

  it('should reject head_update that has cblIndexEntry metadata', () => {
    const announcement = makeHeadUpdateAnnouncement({
      cblIndexEntry: {
        _id: 'entry-1',
        magnetUrl: 'magnet:test',
        blockId1: 'b1',
        blockId2: 'b2',
        blockSize: 256,
        createdAt: new Date(),
        visibility: 'private' as never,
        sequenceNumber: 1,
      },
    });
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });

  it('should allow head_update with optional poolId', () => {
    // poolId is not required for head_update but should not cause rejection
    const announcement = makeHeadUpdateAnnouncement();
    // head_update doesn't require poolId, just headUpdate metadata
    expect(validateBlockAnnouncement(announcement)).toBe(true);
  });
});
