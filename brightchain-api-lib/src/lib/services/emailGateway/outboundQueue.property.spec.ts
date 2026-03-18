/**
 * @fileoverview Property-based tests for OutboundQueue FIFO ordering
 *
 * **Feature: email-gateway**
 *
 * This test suite verifies:
 * - Property 2: Queue FIFO ordering preservation
 *
 * **Validates: Requirements 9.3**
 */

import type { IEmailMetadata } from '@brightchain/brightchain-lib';
import {
  createMailbox,
  OutboundDeliveryStatus,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';

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
function makeItem(messageId: string): IOutboundQueueItem {
  return {
    messageId,
    from: 'alice@brightchain.org',
    to: ['bob@external.com'],
    subject: 'Test',
    metadata: makeMetadata(),
    enqueuedAt: new Date(),
    status: OutboundDeliveryStatus.Queued,
    retryCount: 0,
  };
}

/**
 * Arbitrary that generates a list of unique message IDs.
 * Uses uniqueArray with a string mapper to guarantee uniqueness.
 */
const arbUniqueMessageIds = fc.uniqueArray(
  fc.stringMatching(/^[a-z0-9]{1,20}$/),
  { minLength: 1, maxLength: 50 },
);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('OutboundQueue FIFO Ordering Property Tests', () => {
  describe('Property 2: Queue FIFO ordering preservation', () => {
    /**
     * **Feature: email-gateway, Property 2: Queue FIFO ordering preservation**
     *
     * *For any* sequence of N enqueued items with unique message IDs,
     * dequeuing them all produces the same order as the enqueue order (FIFO).
     *
     * **Validates: Requirements 9.3**
     */
    it('should dequeue items in the same order they were enqueued (FIFO)', async () => {
      await fc.assert(
        fc.asyncProperty(arbUniqueMessageIds, async (messageIds) => {
          const store = new InMemoryOutboundQueueStore();

          // Enqueue all items in order
          for (const id of messageIds) {
            await store.enqueue(makeItem(id));
          }

          // Dequeue all items and collect their IDs
          const dequeuedIds: string[] = [];
          let item = await store.dequeue();
          while (item !== undefined) {
            dequeuedIds.push(item.messageId);
            item = await store.dequeue();
          }

          // Assert FIFO: dequeue order must match enqueue order
          expect(dequeuedIds).toEqual(messageIds);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * *For any* sequence of N enqueued items, the queue depth after
     * enqueuing all equals N, and after dequeuing all equals 0.
     *
     * **Validates: Requirements 9.3**
     */
    it('should have correct queue depth after enqueue and dequeue cycles', async () => {
      await fc.assert(
        fc.asyncProperty(arbUniqueMessageIds, async (messageIds) => {
          const store = new InMemoryOutboundQueueStore();

          // Enqueue all
          for (const id of messageIds) {
            await store.enqueue(makeItem(id));
          }

          expect(await store.getQueueDepth()).toBe(messageIds.length);

          // Dequeue all
          for (let i = 0; i < messageIds.length; i++) {
            await store.dequeue();
          }

          expect(await store.getQueueDepth()).toBe(0);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * *For any* sequence of N enqueued items, peeking always returns
     * the same item as the next dequeue without consuming it.
     *
     * **Validates: Requirements 9.3**
     */
    it('should peek the same item that dequeue would return', async () => {
      await fc.assert(
        fc.asyncProperty(arbUniqueMessageIds, async (messageIds) => {
          const store = new InMemoryOutboundQueueStore();

          for (const id of messageIds) {
            await store.enqueue(makeItem(id));
          }

          // For each position, peek and dequeue should agree
          for (let i = 0; i < messageIds.length; i++) {
            const peeked = await store.peek();
            const dequeued = await store.dequeue();

            expect(peeked).toBeDefined();
            expect(dequeued).toBeDefined();
            expect(peeked!.messageId).toBe(dequeued!.messageId);
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});

// ─── Concurrency Limit Property Tests ───────────────────────────────────────

import type { IEmailGatewayConfig } from './emailGatewayConfig';
import { OutboundQueue } from './outboundQueue';

/**
 * Build a minimal IEmailGatewayConfig with the given concurrency limit.
 * Only the fields used by OutboundQueue are meaningful here.
 */
function makeConfig(
  overrides: Partial<IEmailGatewayConfig> = {},
): IEmailGatewayConfig {
  return {
    canonicalDomain: 'brightchain.org',
    postfixHost: 'localhost',
    postfixPort: 25,
    dkimKeyPath: '/dev/null',
    dkimSelector: 'default',
    mailDropDirectory: '/tmp/mail',
    errorDirectory: '/tmp/errors',
    maxMessageSizeBytes: 25 * 1024 * 1024,
    recipientLookupPort: 2526,
    recipientLookupCacheTtlSeconds: 300,
    spamEngine: 'spamassassin' as const,
    spamThresholds: { probableSpamScore: 5, definiteSpamScore: 10 },
    queueConcurrency: 10,
    retryMaxCount: 5,
    retryMaxDurationMs: 48 * 60 * 60 * 1000,
    retryBaseIntervalMs: 60_000,
    ...overrides,
  };
}

describe('OutboundQueue Concurrency Limit Property Tests', () => {
  describe('Property 3: Concurrent dequeue never exceeds configured limit', () => {
    /**
     * **Feature: email-gateway, Property 3: Concurrent dequeue never exceeds configured limit**
     *
     * *For any* concurrency limit N (1–20) and any number of queued items M (N+1 to 50),
     * the number of simultaneously active handler invocations never exceeds N.
     *
     * **Validates: Requirements 9.4**
     */
    it('should never exceed the configured concurrency limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 2, max: 50 }),
          async (concurrencyLimit, extraItems) => {
            // Ensure M > N so we actually stress the concurrency limit
            const totalItems = concurrencyLimit + extraItems;

            const store = new InMemoryOutboundQueueStore();
            const config = makeConfig({ queueConcurrency: concurrencyLimit });

            // Track concurrency
            let activeCount = 0;
            let maxObservedConcurrency = 0;

            // Handler that simulates async work and tracks concurrency
            const handler = async (
              _item: IOutboundQueueItem,
            ): Promise<void> => {
              activeCount++;
              if (activeCount > maxObservedConcurrency) {
                maxObservedConcurrency = activeCount;
              }
              // Small delay to allow concurrent handlers to overlap
              await new Promise((resolve) => setTimeout(resolve, 5));
              activeCount--;
            };

            // Use a fast poll interval so the test completes quickly
            const queue = new OutboundQueue(store, config, handler, 10);

            // Enqueue all items
            for (let i = 0; i < totalItems; i++) {
              await store.enqueue(makeItem(`msg-${i}`));
            }

            // Start processing
            await queue.start();

            // Wait for all items to be processed.
            // Poll until the store is empty and no active handlers remain.
            const deadline = Date.now() + 10_000; // 10s safety timeout
            while (Date.now() < deadline) {
              const depth = await store.getQueueDepth();
              if (depth === 0 && queue.getActiveCount() === 0) {
                break;
              }
              await new Promise((resolve) => setTimeout(resolve, 15));
            }

            queue.stop();

            // The max observed concurrency must never exceed the configured limit
            expect(maxObservedConcurrency).toBeLessThanOrEqual(
              concurrencyLimit,
            );
            // Sanity: we should have seen at least 1 concurrent handler
            expect(maxObservedConcurrency).toBeGreaterThanOrEqual(1);
          },
        ),
        { numRuns: 20, timeout: 30_000 },
      );
    }, 60_000);
  });
});
