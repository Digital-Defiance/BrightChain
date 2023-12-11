/**
 * Unit tests for OutboundDeliveryWorker.
 *
 * Validates:
 * - Registers as OutboundQueue handler on construction
 * - Serializes IEmailMetadata → RFC 5322 via EmailSerializer
 * - Applies DKIM signature using configured domain and selector
 * - Delegates to Postfix transport with correct envelope
 * - Marks completed on successful delivery
 * - Marks permanently failed on 5xx response
 * - Throws on 4xx response so queue requeues with retry
 * - Rejects messages exceeding max message size
 *
 * @see Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 6.1
 */

import type { IEmailMetadata } from '@brightchain/brightchain-lib';
import { createMailbox } from '@brightchain/brightchain-lib';

import type { IEmailGatewayConfig } from './emailGatewayConfig';
import type { IOutboundQueueItem } from './emailGatewayService';
import type {
  IDkimSigner,
  IPostfixTransport,
  IPostfixTransportResult,
} from './outboundDeliveryWorker';
import { OutboundDeliveryWorker } from './outboundDeliveryWorker';
import type { OutboundQueue } from './outboundQueue';
import type { IOutboundQueueStore } from './outboundQueueStore';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function makeEmailMetadata(
  overrides: Partial<IEmailMetadata> = {},
): IEmailMetadata {
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
    messageId: '<test-1@brightchain.org>',
    subject: 'Hello',
    date: new Date(),
    mimeVersion: '1.0',
    contentType: {
      type: 'text',
      subtype: 'plain',
      mediaType: 'text/plain',
      parameters: new Map(),
    },
    customHeaders: new Map(),
    deliveryReceipts: new Map(),
    readReceipts: new Map(),
    ...overrides,
  } as IEmailMetadata;
}

function makeQueueItem(
  overrides: Partial<IOutboundQueueItem> = {},
): IOutboundQueueItem {
  const metadata = makeEmailMetadata(overrides.metadata as never);
  return {
    messageId: metadata.messageId,
    from: metadata.from.address,
    to: metadata.to.map((m) => m.address),
    subject: metadata.subject,
    metadata,
    enqueuedAt: new Date(),
    status: 0 as never, // OutboundDeliveryStatus.Queued
    retryCount: 0,
    ...overrides,
  };
}

/** Mock OutboundQueue that captures the handler set via setHandler(). */
function makeMockQueue(): OutboundQueue & {
  getHandler: () => ((item: IOutboundQueueItem) => Promise<void>) | null;
} {
  let handler: ((item: IOutboundQueueItem) => Promise<void>) | null = null;
  return {
    getHandler: () => handler,
    setHandler: jest.fn((h: (item: IOutboundQueueItem) => Promise<void>) => {
      handler = h;
    }),
    enqueue: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    isRunning: jest.fn().mockReturnValue(false),
    getActiveCount: jest.fn().mockReturnValue(0),
    getQueueDepth: jest.fn().mockResolvedValue(0),
  } as unknown as OutboundQueue & {
    getHandler: () => ((item: IOutboundQueueItem) => Promise<void>) | null;
  };
}

// Module-level ref for the mock queue.
let mockQueue: ReturnType<typeof makeMockQueue>;

function makeMockStore(): IOutboundQueueStore & {
  completedIds: string[];
  failedIds: Array<{ id: string; reason: string }>;
} {
  const completedIds: string[] = [];
  const failedIds: Array<{ id: string; reason: string }> = [];
  return {
    completedIds,
    failedIds,
    enqueue: jest.fn(),
    dequeue: jest.fn(),
    peek: jest.fn(),
    markCompleted: jest.fn(async (id: string) => {
      completedIds.push(id);
    }),
    markFailed: jest.fn(async (id: string, reason: string) => {
      failedIds.push({ id, reason });
    }),
    requeue: jest.fn(),
    getQueueDepth: jest.fn().mockResolvedValue(0),
    getByMessageId: jest.fn(),
  };
}

function makeMockTransport(
  result: IPostfixTransportResult = {
    success: true,
    responseCode: 250,
    responseMessage: 'OK',
  },
): IPostfixTransport {
  return {
    send: jest.fn().mockResolvedValue(result),
  };
}

function makeMockDkimSigner(): IDkimSigner {
  return {
    sign: jest.fn(async (raw: Uint8Array) => {
      // Prepend a fake DKIM-Signature header to simulate signing.
      const header = new TextEncoder().encode(
        'DKIM-Signature: v=1; a=rsa-sha256; d=brightchain.org; s=default;\r\n',
      );
      const signed = new Uint8Array(header.length + raw.length);
      signed.set(header, 0);
      signed.set(raw, header.length);
      return signed;
    }),
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('OutboundDeliveryWorker', () => {
  let store: ReturnType<typeof makeMockStore>;
  let transport: IPostfixTransport;
  let dkimSigner: IDkimSigner;
  let config: IEmailGatewayConfig;

  beforeEach(() => {
    mockQueue = makeMockQueue();
    store = makeMockStore();
    transport = makeMockTransport();
    dkimSigner = makeMockDkimSigner();
    config = makeConfig();
  });

  it('should register itself as the queue handler on construction', () => {
    new OutboundDeliveryWorker(mockQueue, store, config, transport, dkimSigner);
    expect(mockQueue.setHandler).toHaveBeenCalledTimes(1);
    expect(mockQueue.getHandler()).toBeInstanceOf(Function);
  });

  it('should serialize metadata, sign with DKIM, and send via transport on success', async () => {
    new OutboundDeliveryWorker(mockQueue, store, config, transport, dkimSigner);
    const item = makeQueueItem();

    await mockQueue.getHandler()!(item);

    // DKIM signer was called with the canonical domain and selector
    expect(dkimSigner.sign).toHaveBeenCalledTimes(1);
    expect(dkimSigner.sign).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      'brightchain.org',
      'default',
    );

    // Transport was called with correct envelope
    expect(transport.send).toHaveBeenCalledTimes(1);
    expect(transport.send).toHaveBeenCalledWith(
      item.from,
      item.to,
      expect.any(Uint8Array),
    );

    // Store was marked completed
    expect(store.completedIds).toEqual([item.messageId]);
    expect(store.failedIds).toHaveLength(0);
  });

  it('should mark permanently failed on 5xx transport response', async () => {
    transport = makeMockTransport({
      success: false,
      responseCode: 550,
      responseMessage: 'User unknown',
    });
    new OutboundDeliveryWorker(mockQueue, store, config, transport, dkimSigner);
    const item = makeQueueItem();

    await mockQueue.getHandler()!(item);

    expect(store.failedIds).toHaveLength(1);
    expect(store.failedIds[0].id).toBe(item.messageId);
    expect(store.failedIds[0].reason).toContain('Permanent failure');
    expect(store.failedIds[0].reason).toContain('550');
    expect(store.completedIds).toHaveLength(0);
  });

  it('should throw on 4xx transport response so queue requeues', async () => {
    transport = makeMockTransport({
      success: false,
      responseCode: 421,
      responseMessage: 'Try again later',
    });
    new OutboundDeliveryWorker(mockQueue, store, config, transport, dkimSigner);
    const item = makeQueueItem();

    await expect(mockQueue.getHandler()!(item)).rejects.toThrow(
      'Temporary failure (421)',
    );

    // Neither completed nor permanently failed — queue handles requeue
    expect(store.completedIds).toHaveLength(0);
    expect(store.failedIds).toHaveLength(0);
  });

  it('should reject messages exceeding max message size', async () => {
    // Set a very small max size to trigger the check
    config = makeConfig({ maxMessageSizeBytes: 10 });
    new OutboundDeliveryWorker(mockQueue, store, config, transport, dkimSigner);
    const item = makeQueueItem();

    await mockQueue.getHandler()!(item);

    // Should be marked failed without calling transport or DKIM
    expect(store.failedIds).toHaveLength(1);
    expect(store.failedIds[0].reason).toContain('exceeds maximum');
    expect(transport.send).not.toHaveBeenCalled();
    expect(dkimSigner.sign).not.toHaveBeenCalled();
  });

  it('should use config dkimSelector and canonicalDomain for signing', async () => {
    config = makeConfig({
      canonicalDomain: 'custom.net',
      dkimSelector: 'mail2025',
    });
    new OutboundDeliveryWorker(mockQueue, store, config, transport, dkimSigner);
    const item = makeQueueItem();

    await mockQueue.getHandler()!(item);

    expect(dkimSigner.sign).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      'custom.net',
      'mail2025',
    );
  });

  it('should pass the DKIM-signed message (not the raw message) to transport', async () => {
    new OutboundDeliveryWorker(mockQueue, store, config, transport, dkimSigner);
    const item = makeQueueItem();

    await mockQueue.getHandler()!(item);

    // The signed message should contain the DKIM-Signature header
    const sentMessage = (transport.send as jest.Mock).mock
      .calls[0][2] as Uint8Array;
    const sentText = new TextDecoder().decode(sentMessage);
    expect(sentText).toContain('DKIM-Signature');
  });
});
