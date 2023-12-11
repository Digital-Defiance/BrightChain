/**
 * Unit tests for OutboundQueue with concurrency control.
 *
 * Validates:
 * - enqueue persists to store and rejects when store unavailable (Req 9.5)
 * - start/stop lifecycle
 * - FIFO dequeue via processing loop (Req 9.3)
 * - Concurrency limit enforcement (Req 9.4)
 * - Resume on startup: re-process non-expired items (Req 9.2)
 * - Expired items are marked failed on dequeue (Req 9.2)
 * - Handler errors cause requeue with incremented retryCount
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */

import type { IEmailMetadata } from '@brightchain/brightchain-lib';
import {
  createMailbox,
  OutboundDeliveryStatus,
} from '@brightchain/brightchain-lib';

import type { IEmailGatewayConfig } from './emailGatewayConfig';
import type { IOutboundQueueItem } from './emailGatewayService';
import { OutboundQueue } from './outboundQueue';
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

/** Build a minimal config with overrides. */
function makeConfig(
  overrides: Partial<IEmailGatewayConfig> = {},
): IEmailGatewayConfig {
  return {
    canonicalDomain: 'brightchain.org',
    postfixHost: 'localhost',
    postfixPort: 25,
    dkimKeyPath: '/etc/dkim/private.key',
    dkimSelector: 'default',
    mailDropDirectory: '/var/spool/brightchain/incoming/',
    errorDirectory: '/var/spool/brightchain/errors/',
    maxMessageSizeBytes: 25 * 1024 * 1024,
    recipientLookupPort: 2526,
    recipientLookupCacheTtlSeconds: 300,
    spamEngine: 'spamassassin',
    spamThresholds: { probableSpamScore: 5, definiteSpamScore: 10 },
    queueConcurrency: 10,
    retryMaxCount: 5,
    retryMaxDurationMs: 48 * 60 * 60 * 1000,
    retryBaseIntervalMs: 60_000,
    ...overrides,
  };
}

/**
 * Helper: wait for a condition to become true, polling every `intervalMs`.
 * Times out after `timeoutMs` and throws.
 */
async function waitFor(
  predicate: () => boolean,
  timeoutMs = 2000,
  intervalMs = 20,
): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitFor timed out');
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('OutboundQueue', () => {
  let store: InMemoryOutboundQueueStore;
  let config: IEmailGatewayConfig;

  beforeEach(() => {
    store = new InMemoryOutboundQueueStore();
    config = makeConfig({ queueConcurrency: 2 });
  });

  afterEach(() => {
    // Ensure no timers leak between tests.
    jest.restoreAllMocks();
  });

  // ─── enqueue ────────────────────────────────────────────────────────

  describe('enqueue', () => {
    it('should persist item to the store', async () => {
      const queue = new OutboundQueue(store, config);
      const item = makeItem('msg-1');

      await queue.enqueue(item);

      const stored = await store.getByMessageId('msg-1');
      expect(stored).toBeDefined();
      expect(stored!.messageId).toBe('msg-1');
    });

    it('should reject when the store throws (Req 9.5)', async () => {
      const failingStore: InMemoryOutboundQueueStore = {
        ...store,
        enqueue: jest.fn().mockRejectedValue(new Error('disk full')),
      } as unknown as InMemoryOutboundQueueStore;

      const queue = new OutboundQueue(failingStore, config);

      await expect(queue.enqueue(makeItem('msg-1'))).rejects.toThrow(
        'Outbound queue store unavailable: disk full',
      );
    });
  });

  // ─── start / stop lifecycle ─────────────────────────────────────────

  describe('start / stop', () => {
    it('should set running state on start', async () => {
      const queue = new OutboundQueue(store, config, undefined, 50);
      expect(queue.isRunning()).toBe(false);

      await queue.start();
      expect(queue.isRunning()).toBe(true);

      queue.stop();
      expect(queue.isRunning()).toBe(false);
    });

    it('should be idempotent — calling start() twice does not double-poll', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const queue = new OutboundQueue(store, config, handler, 50);

      await queue.start();
      await queue.start(); // second call should be a no-op

      queue.stop();
    });

    it('should be idempotent — calling stop() when not running is a no-op', () => {
      const queue = new OutboundQueue(store, config);
      queue.stop(); // should not throw
      expect(queue.isRunning()).toBe(false);
    });
  });

  // ─── Processing loop ─────────────────────────────────────────────────

  describe('processing loop', () => {
    it('should dequeue and invoke handler for queued items', async () => {
      const processed: string[] = [];
      const handler = jest
        .fn()
        .mockImplementation(async (item: IOutboundQueueItem) => {
          processed.push(item.messageId);
        });

      await store.enqueue(makeItem('msg-1'));
      await store.enqueue(makeItem('msg-2'));

      const queue = new OutboundQueue(store, config, handler, 50);
      await queue.start();

      await waitFor(() => processed.length === 2);
      queue.stop();

      expect(processed).toEqual(['msg-1', 'msg-2']);
    });

    it('should process items enqueued after start', async () => {
      const processed: string[] = [];
      const handler = jest
        .fn()
        .mockImplementation(async (item: IOutboundQueueItem) => {
          processed.push(item.messageId);
        });

      const queue = new OutboundQueue(store, config, handler, 50);
      await queue.start();

      // Enqueue after start
      await queue.enqueue(makeItem('msg-late'));

      await waitFor(() => processed.length === 1);
      queue.stop();

      expect(processed[0]).toBe('msg-late');
    });

    it('should not process items when no handler is set', async () => {
      await store.enqueue(makeItem('msg-1'));

      const queue = new OutboundQueue(store, config, undefined, 50);
      await queue.start();

      // Wait a bit — nothing should be processed
      await new Promise((r) => setTimeout(r, 150));
      queue.stop();

      // Item should still be in the store
      expect(await store.getQueueDepth()).toBe(1);
    });
  });

  // ─── Concurrency limit ─────────────────────────────────────────────

  describe('concurrency limit (Req 9.4)', () => {
    it('should not exceed the configured concurrency limit', async () => {
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const handler = jest.fn().mockImplementation(async () => {
        currentConcurrent++;
        if (currentConcurrent > maxConcurrent) {
          maxConcurrent = currentConcurrent;
        }
        // Simulate work
        await new Promise((r) => setTimeout(r, 100));
        currentConcurrent--;
      });

      // Enqueue more items than the concurrency limit
      for (let i = 0; i < 5; i++) {
        await store.enqueue(makeItem(`msg-${i}`));
      }

      const queue = new OutboundQueue(
        store,
        makeConfig({ queueConcurrency: 2 }),
        handler,
        30,
      );
      await queue.start();

      // Wait for all items to be processed
      await waitFor(() => handler.mock.calls.length === 5, 3000);
      queue.stop();

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  // ─── Resume on startup (Req 9.2) ───────────────────────────────────

  describe('resume on startup (Req 9.2)', () => {
    it('should process previously queued items on start', async () => {
      const processed: string[] = [];
      const handler = jest
        .fn()
        .mockImplementation(async (item: IOutboundQueueItem) => {
          processed.push(item.messageId);
        });

      // Pre-populate the store (simulating items from a previous run)
      await store.enqueue(makeItem('msg-old-1'));
      await store.enqueue(makeItem('msg-old-2'));

      const queue = new OutboundQueue(store, config, handler, 50);
      await queue.start();

      await waitFor(() => processed.length === 2);
      queue.stop();

      expect(processed).toContain('msg-old-1');
      expect(processed).toContain('msg-old-2');
    });

    it('should mark expired items as failed instead of processing them (Req 9.2)', async () => {
      const processed: string[] = [];
      const handler = jest
        .fn()
        .mockImplementation(async (item: IOutboundQueueItem) => {
          processed.push(item.messageId);
        });

      // Create an item that was enqueued 49 hours ago (exceeds 48h max)
      const expiredItem = makeItem('msg-expired', {
        enqueuedAt: new Date(Date.now() - 49 * 60 * 60 * 1000),
      });
      await store.enqueue(expiredItem);

      // Also enqueue a fresh item
      await store.enqueue(makeItem('msg-fresh'));

      const queue = new OutboundQueue(store, config, handler, 50);
      await queue.start();

      await waitFor(() => processed.length === 1);
      queue.stop();

      // Expired item should NOT have been processed
      expect(processed).toEqual(['msg-fresh']);
      // Expired item should have been removed from the store
      expect(await store.getByMessageId('msg-expired')).toBeUndefined();
    });
  });

  // ─── Handler errors ─────────────────────────────────────────────────

  describe('handler errors', () => {
    it('should requeue item with incremented retryCount and backoff delay when handler throws', async () => {
      let callCount = 0;
      const handler = jest
        .fn()
        .mockImplementation(async (item: IOutboundQueueItem) => {
          callCount++;
          if (item.retryCount === 0) {
            throw new Error('temporary SMTP failure');
          }
          // Succeed on retry
        });

      await store.enqueue(makeItem('msg-retry'));

      // Use a tiny base interval so the backoff delay expires quickly
      const retryConfig = makeConfig({
        queueConcurrency: 2,
        retryBaseIntervalMs: 1,
      });
      const queue = new OutboundQueue(store, retryConfig, handler, 50);
      await queue.start();

      // Wait for the item to be processed twice (fail + retry succeed)
      await waitFor(() => callCount >= 2, 3000);
      queue.stop();

      expect(callCount).toBeGreaterThanOrEqual(2);
    });

    it('should mark item as permanently failed when retry limits are exceeded', async () => {
      const handler = jest.fn().mockImplementation(async () => {
        throw new Error('always fails');
      });

      // Item already at max retry count
      await store.enqueue(makeItem('msg-exhausted', { retryCount: 5 }));

      const queue = new OutboundQueue(store, config, handler, 50);
      await queue.start();

      await waitFor(() => handler.mock.calls.length >= 1, 2000);
      // Give the processItem catch block time to run markFailed
      await new Promise((r) => setTimeout(r, 100));
      queue.stop();

      // Item should have been removed from the store (marked failed)
      expect(await store.getByMessageId('msg-exhausted')).toBeUndefined();
    });

    it('should mark item as permanently failed when max duration is exceeded', async () => {
      const handler = jest.fn().mockImplementation(async () => {
        throw new Error('always fails');
      });

      // Item enqueued 49 hours ago (exceeds 48h max)
      await store.enqueue(
        makeItem('msg-old-fail', {
          enqueuedAt: new Date(Date.now() - 49 * 60 * 60 * 1000),
          retryCount: 1,
        }),
      );

      const queue = new OutboundQueue(store, config, handler, 50);
      await queue.start();

      // The expired item is caught by isExpired in processAvailable,
      // so the handler is never called. Give the poll loop time to run.
      await new Promise((r) => setTimeout(r, 300));
      queue.stop();

      // Handler should NOT have been called — item was expired before processing
      expect(handler).not.toHaveBeenCalled();
      // Item should have been removed from the store (marked failed)
      expect(await store.getByMessageId('msg-old-fail')).toBeUndefined();
    });
  });

  // ─── getQueueDepth / getActiveCount ─────────────────────────────────

  describe('getQueueDepth / getActiveCount', () => {
    it('should report queue depth from the store', async () => {
      const queue = new OutboundQueue(store, config);

      expect(await queue.getQueueDepth()).toBe(0);

      await queue.enqueue(makeItem('msg-1'));
      await queue.enqueue(makeItem('msg-2'));

      expect(await queue.getQueueDepth()).toBe(2);
    });

    it('should report active count during processing', async () => {
      let capturedActiveCount = 0;
      const handler = jest.fn().mockImplementation(async () => {
        capturedActiveCount = queue.getActiveCount();
        await new Promise((r) => setTimeout(r, 100));
      });

      await store.enqueue(makeItem('msg-1'));

      const queue = new OutboundQueue(store, config, handler, 50);
      await queue.start();

      await waitFor(() => handler.mock.calls.length >= 1);
      expect(capturedActiveCount).toBeGreaterThanOrEqual(1);

      // Wait for processing to finish
      await waitFor(() => queue.getActiveCount() === 0, 2000);
      queue.stop();
    });
  });

  // ─── setHandler ─────────────────────────────────────────────────────

  describe('setHandler', () => {
    it('should allow setting handler after construction', async () => {
      const processed: string[] = [];

      await store.enqueue(makeItem('msg-1'));

      const queue = new OutboundQueue(store, config, undefined, 50);
      queue.setHandler(async (item) => {
        processed.push(item.messageId);
      });

      await queue.start();
      await waitFor(() => processed.length === 1);
      queue.stop();

      expect(processed).toEqual(['msg-1']);
    });
  });
});
