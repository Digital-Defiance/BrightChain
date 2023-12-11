/**
 * Unit tests for CBL index announcement types in BlockAnnouncement.
 *
 * Tests validation of cbl_index_update and cbl_index_delete announcement types.
 *
 * Validates: Requirements 8.1, 8.6
 */

import type { BlockId } from '../branded/primitives/blockId';
import type { ICBLIndexEntry } from '../storage/cblIndex';
import { CBLVisibility } from '../storage/cblIndex';
import type { BlockAnnouncement } from './gossipService';
import { validateBlockAnnouncement } from './gossipService';

/** Cast a test string to BlockId without validation — for test data only. */
const bid = (s: string) => s as unknown as BlockId;

/** Build a minimal valid CBL index entry for testing. */
function makeCBLIndexEntry(
  overrides: Partial<ICBLIndexEntry> = {},
): ICBLIndexEntry {
  return {
    _id: 'entry-001',
    magnetUrl: 'magnet:?xt=urn:brightchain:cbl&bs=256&b1=abc123&b2=def456',
    blockId1: bid('abc123'),
    blockId2: bid('def456'),
    blockSize: 256,
    createdAt: new Date(),
    visibility: CBLVisibility.Private,
    sequenceNumber: 1,
    ...overrides,
  };
}

/** Build a base announcement with common fields. */
function makeBaseAnnouncement(
  overrides: Partial<BlockAnnouncement> = {},
): BlockAnnouncement {
  return {
    type: 'cbl_index_update',
    blockId: bid(''),
    nodeId: 'node-001',
    timestamp: new Date(),
    ttl: 3,
    poolId: 'test-pool',
    cblIndexEntry: makeCBLIndexEntry(),
    ...overrides,
  };
}

describe('validateBlockAnnouncement – cbl_index_update type (Req 8.1)', () => {
  it('should accept a valid cbl_index_update announcement', () => {
    const announcement = makeBaseAnnouncement({ type: 'cbl_index_update' });
    expect(validateBlockAnnouncement(announcement)).toBe(true);
  });

  it('should reject cbl_index_update without poolId', () => {
    const announcement = makeBaseAnnouncement({
      type: 'cbl_index_update',
      poolId: undefined,
    });
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });

  it('should reject cbl_index_update with invalid poolId', () => {
    const announcement = makeBaseAnnouncement({
      type: 'cbl_index_update',
      poolId: 'invalid pool id with spaces!!' as never,
    });
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });

  it('should reject cbl_index_update without cblIndexEntry', () => {
    const announcement = makeBaseAnnouncement({
      type: 'cbl_index_update',
      cblIndexEntry: undefined,
    });
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });

  it('should reject cbl_index_update with empty magnetUrl', () => {
    const announcement = makeBaseAnnouncement({
      type: 'cbl_index_update',
      cblIndexEntry: makeCBLIndexEntry({ magnetUrl: '' }),
    });
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });

  it('should reject cbl_index_update with empty blockId1', () => {
    const announcement = makeBaseAnnouncement({
      type: 'cbl_index_update',
      cblIndexEntry: makeCBLIndexEntry({ blockId1: bid('') }),
    });
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });

  it('should reject cbl_index_update with empty blockId2', () => {
    const announcement = makeBaseAnnouncement({
      type: 'cbl_index_update',
      cblIndexEntry: makeCBLIndexEntry({ blockId2: bid('') }),
    });
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });

  it('should reject cbl_index_update with messageDelivery', () => {
    const announcement = makeBaseAnnouncement({
      type: 'cbl_index_update',
      messageDelivery: {
        messageId: 'msg-1',
        recipientIds: ['user-1'],
        priority: 'normal',
        blockIds: [bid('block-1')],
        cblBlockId: bid('cbl-1'),
        ackRequired: false,
      },
    });
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });

  it('should reject cbl_index_update with deliveryAck', () => {
    const announcement = makeBaseAnnouncement({
      type: 'cbl_index_update',
      deliveryAck: {
        messageId: 'msg-1',
        recipientId: 'user-1',
        status: 'delivered',
        originalSenderNode: 'node-1',
      },
    });
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });
});

describe('validateBlockAnnouncement – cbl_index_delete type (Req 8.6)', () => {
  it('should accept a valid cbl_index_delete announcement', () => {
    const announcement = makeBaseAnnouncement({
      type: 'cbl_index_delete',
      cblIndexEntry: makeCBLIndexEntry({ deletedAt: new Date() }),
    });
    expect(validateBlockAnnouncement(announcement)).toBe(true);
  });

  it('should reject cbl_index_delete without poolId', () => {
    const announcement = makeBaseAnnouncement({
      type: 'cbl_index_delete',
      poolId: undefined,
    });
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });

  it('should reject cbl_index_delete without cblIndexEntry', () => {
    const announcement = makeBaseAnnouncement({
      type: 'cbl_index_delete',
      cblIndexEntry: undefined,
    });
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });

  it('should reject cbl_index_delete with messageDelivery', () => {
    const announcement = makeBaseAnnouncement({
      type: 'cbl_index_delete',
      messageDelivery: {
        messageId: 'msg-1',
        recipientIds: ['user-1'],
        priority: 'normal',
        blockIds: [bid('block-1')],
        cblBlockId: bid('cbl-1'),
        ackRequired: false,
      },
    });
    expect(validateBlockAnnouncement(announcement)).toBe(false);
  });
});
