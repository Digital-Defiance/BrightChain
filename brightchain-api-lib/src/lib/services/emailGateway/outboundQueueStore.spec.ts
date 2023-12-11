/**
 * Unit tests for IOutboundQueueStore / InMemoryOutboundQueueStore.
 *
 * Validates:
 * - FIFO ordering (Req 9.3)
 * - enqueue / dequeue / peek lifecycle
 * - markCompleted / markFailed removal
 * - requeue moves item to end of queue
 * - getQueueDepth accuracy
 * - getByMessageId lookup
 *
 * @see Requirements 9.1, 9.3, 9.4
 */

import type { IEmailMetadata } from '@brightchain/brightchain-lib';
import {
  createMailbox,
  OutboundDeliveryStatus,
} from '@brightchain/brightchain-lib';

import type { IOutboundQueueItem } from './emailGatewayService';
import { InMemoryOutboundQueueStore } from './outboundQueueStore';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a minimal IEmailMetadata stub. */
function makeMetadata(overrides: Partial<IEmailMetadata> = {}): IEmailMetadata {
  return {
    blockId: 'block-1' as never,
    createdAt: new Date(),
    expiresAt: null,
    durabilityLevel: 0 as never,
    parityBlockIds: [],
    accessCount: 0,
    lastAccessedAt: new Date(),
    replicationStatus: 0 as never,
    targetReplicationFactor: 0,
    replicaNodeIds: [],
    size: 100,
    checksum: '',
    messageType: 'email',
    senderId: 'alice@brightchain.org',
    recipients: ['bob@external.com'],
    priority: 0 as never,
    deliveryStatus: new Map(),
    acknowledgments: new Map(),
    encryptionScheme: 0 as never,
    isCBL: false,
    cblBlockIds: [],
    from: createMailbox('alice', 'brightchain.org', 'Alice'),
    to: [createMailbox('bob', 'external.com', 'Bob')],
    messageId: '<test@brightchain.org>',
    subject: 'Test',
    date: new Date(),
    mimeVersion: '1.0',
    contentType: { type: 'text', subtype: 'plain', parameters: new Map() },
    customHeaders: new Map(),
    deliveryReceipts: new Map(),
    readReceipts: new Map(),
    ...overrides,
  } as IEmailMetadata;
}

/** Build a queue item with a given messageId. */
function makeItem(
  messageId: string,
  overrides: Partial<IOutboundQueueItem> = {},
): IOutboundQueueItem {
  return {
    messageId,
    from: 'alice@brightchain.org',
    to: ['bob@external.com'],
    subject: 'Test',
    metadata: makeMetadata(),
    enqueuedAt: new Date(),
    status: OutboundDeliveryStatus.Queued,
    retryCount: 0,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('InMemoryOutboundQueueStore', () => {
  let store: InMemoryOutboundQueueStore;

  beforeEach(() => {
    store = new InMemoryOutboundQueueStore();
  });

  // ─── enqueue / dequeue ──────────────────────────────────────────────

  it('should return undefined when dequeuing from an empty queue', async () => {
    expect(await store.dequeue()).toBeUndefined();
  });

  it('should enqueue and dequeue a single item', async () => {
    const item = makeItem('msg-1');
    await store.enqueue(item);

    const dequeued = await store.dequeue();
    expect(dequeued).toBeDefined();
    expect(dequeued!.messageId).toBe('msg-1');
  });

  it('should maintain FIFO ordering across multiple enqueues', async () => {
    await store.enqueue(makeItem('msg-1'));
    await store.enqueue(makeItem('msg-2'));
    await store.enqueue(makeItem('msg-3'));

    const first = await store.dequeue();
    const second = await store.dequeue();
    const third = await store.dequeue();

    expect(first!.messageId).toBe('msg-1');
    expect(second!.messageId).toBe('msg-2');
    expect(third!.messageId).toBe('msg-3');
    expect(await store.dequeue()).toBeUndefined();
  });

  it('should only dequeue items in Queued status', async () => {
    await store.enqueue(
      makeItem('msg-sending', { status: OutboundDeliveryStatus.Sending }),
    );
    await store.enqueue(makeItem('msg-queued'));

    const dequeued = await store.dequeue();
    expect(dequeued!.messageId).toBe('msg-queued');
  });

  it('should skip items whose nextAttemptAt is in the future', async () => {
    const futureDate = new Date(Date.now() + 60_000);
    await store.enqueue(makeItem('msg-delayed', { nextAttemptAt: futureDate }));
    await store.enqueue(makeItem('msg-ready'));

    const dequeued = await store.dequeue();
    expect(dequeued!.messageId).toBe('msg-ready');

    // The delayed item should still be in the store
    expect(await store.getByMessageId('msg-delayed')).toBeDefined();
  });

  it('should dequeue items whose nextAttemptAt is in the past', async () => {
    const pastDate = new Date(Date.now() - 1000);
    await store.enqueue(makeItem('msg-past', { nextAttemptAt: pastDate }));

    const dequeued = await store.dequeue();
    expect(dequeued!.messageId).toBe('msg-past');
  });

  // ─── peek ───────────────────────────────────────────────────────────

  it('should return undefined when peeking an empty queue', async () => {
    expect(await store.peek()).toBeUndefined();
  });

  it('should peek without removing the item', async () => {
    await store.enqueue(makeItem('msg-1'));

    const peeked = await store.peek();
    expect(peeked!.messageId).toBe('msg-1');

    // Item should still be dequeue-able
    const dequeued = await store.dequeue();
    expect(dequeued!.messageId).toBe('msg-1');
  });

  it('should peek the first Queued item, skipping non-Queued', async () => {
    await store.enqueue(
      makeItem('msg-sending', { status: OutboundDeliveryStatus.Sending }),
    );
    await store.enqueue(makeItem('msg-queued'));

    const peeked = await store.peek();
    expect(peeked!.messageId).toBe('msg-queued');
  });

  // ─── markCompleted ──────────────────────────────────────────────────

  it('should remove item from queue on markCompleted', async () => {
    await store.enqueue(makeItem('msg-1'));
    await store.enqueue(makeItem('msg-2'));

    await store.markCompleted('msg-1');

    const dequeued = await store.dequeue();
    expect(dequeued!.messageId).toBe('msg-2');
    expect(await store.getQueueDepth()).toBe(0);
  });

  it('should be a no-op when marking a non-existent message as completed', async () => {
    await store.markCompleted('non-existent');
    expect(await store.getQueueDepth()).toBe(0);
  });

  // ─── markFailed ─────────────────────────────────────────────────────

  it('should remove item from queue on markFailed', async () => {
    await store.enqueue(makeItem('msg-1'));
    await store.markFailed('msg-1', 'permanent 5xx');

    expect(await store.dequeue()).toBeUndefined();
    expect(await store.getQueueDepth()).toBe(0);
  });

  // ─── requeue ────────────────────────────────────────────────────────

  it('should move requeued item to end of queue (FIFO fairness)', async () => {
    await store.enqueue(makeItem('msg-1'));
    await store.enqueue(makeItem('msg-2'));
    await store.enqueue(makeItem('msg-3'));

    // Requeue msg-1 to the end
    await store.requeue(
      makeItem('msg-1', {
        retryCount: 1,
        status: OutboundDeliveryStatus.Queued,
      }),
    );

    const first = await store.dequeue();
    const second = await store.dequeue();
    const third = await store.dequeue();

    expect(first!.messageId).toBe('msg-2');
    expect(second!.messageId).toBe('msg-3');
    expect(third!.messageId).toBe('msg-1');
    expect(third!.retryCount).toBe(1);
  });

  it('should add a new item via requeue if it did not exist before', async () => {
    await store.requeue(makeItem('msg-new'));

    const dequeued = await store.dequeue();
    expect(dequeued!.messageId).toBe('msg-new');
  });

  // ─── getQueueDepth ──────────────────────────────────────────────────

  it('should return 0 for an empty queue', async () => {
    expect(await store.getQueueDepth()).toBe(0);
  });

  it('should track queue depth accurately through enqueue/dequeue', async () => {
    await store.enqueue(makeItem('msg-1'));
    await store.enqueue(makeItem('msg-2'));
    expect(await store.getQueueDepth()).toBe(2);

    await store.dequeue();
    expect(await store.getQueueDepth()).toBe(1);

    await store.dequeue();
    expect(await store.getQueueDepth()).toBe(0);
  });

  // ─── getByMessageId ─────────────────────────────────────────────────

  it('should return undefined for a non-existent messageId', async () => {
    expect(await store.getByMessageId('non-existent')).toBeUndefined();
  });

  it('should retrieve an enqueued item by messageId', async () => {
    await store.enqueue(makeItem('msg-1'));

    const found = await store.getByMessageId('msg-1');
    expect(found).toBeDefined();
    expect(found!.messageId).toBe('msg-1');
  });

  it('should return undefined after item is markCompleted', async () => {
    await store.enqueue(makeItem('msg-1'));
    await store.markCompleted('msg-1');

    expect(await store.getByMessageId('msg-1')).toBeUndefined();
  });

  it('should return a copy, not a reference to the internal item', async () => {
    await store.enqueue(makeItem('msg-1'));

    const found = await store.getByMessageId('msg-1');
    found!.retryCount = 999;

    const foundAgain = await store.getByMessageId('msg-1');
    expect(foundAgain!.retryCount).toBe(0);
  });
});
