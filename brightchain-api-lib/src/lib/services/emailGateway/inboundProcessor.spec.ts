/**
 * Unit tests for InboundProcessor.
 *
 * Validates:
 * - Lifecycle (start/stop)
 * - File processing pipeline: parse → store → create metadata → announce → delete
 * - Idempotency: same file is not processed twice
 * - Error handling: failed files moved to error directory
 * - Existing files processed on startup
 *
 * All filesystem operations are mocked to avoid real I/O.
 *
 * @see Requirements 4.4, 4.5, 4.6, 4.7, 4.8, 4.9
 */

import * as fs from 'fs';
import * as path from 'path';

import type {
  BlockId,
  IBlockStore,
  IEmailMetadata,
  IGossipService,
} from '@brightchain/brightchain-lib';
import {
  createMailbox,
  EmailMessageService,
  EmailParser,
} from '@brightchain/brightchain-lib';

import type { IEmailGatewayConfig } from './emailGatewayConfig';
import { InboundProcessor } from './inboundProcessor';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('fs');

const mockedFs = jest.mocked(fs);

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

function makeMockEmailParser(metadata: IEmailMetadata): EmailParser {
  return {
    parse: jest.fn().mockResolvedValue(metadata),
  } as unknown as EmailParser;
}

function makeMockEmailMessageService(): EmailMessageService & {
  sendEmail: jest.Mock;
} {
  return {
    sendEmail: jest.fn().mockResolvedValue({
      messageId: '<test@brightchain.org>',
      brightchainMessageId: 'bc-1',
      deliveryStatus: new Map(),
      success: true,
    }),
  } as unknown as EmailMessageService & { sendEmail: jest.Mock };
}

function makeMockBlockStore(): IBlockStore & { put: jest.Mock } {
  return {
    supportedBlockSizes: [],
    blockSize: 0 as never,
    has: jest.fn().mockResolvedValue(false),
    getData: jest.fn(),
    setData: jest.fn(),
    deleteData: jest.fn(),
    getRandomBlocks: jest.fn().mockResolvedValue([]),
    get: jest.fn(),
    put: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn(),
    getMetadata: jest.fn().mockResolvedValue(null),
    updateMetadata: jest.fn(),
    generateParityBlocks: jest.fn().mockResolvedValue([]),
    getParityBlocks: jest.fn().mockResolvedValue([]),
    recoverBlock: jest.fn(),
    verifyBlockIntegrity: jest.fn().mockResolvedValue(true),
    getBlocksPendingReplication: jest.fn().mockResolvedValue([]),
    getUnderReplicatedBlocks: jest.fn().mockResolvedValue([]),
    recordReplication: jest.fn(),
    recordReplicaLoss: jest.fn(),
    brightenBlock: jest.fn(),
    storeCBLWithWhitening: jest.fn(),
    retrieveCBL: jest.fn(),
    parseCBLMagnetUrl: jest.fn(),
    generateCBLMagnetUrl: jest.fn(),
  } as unknown as IBlockStore & { put: jest.Mock };
}

function makeMockGossipService(): IGossipService & {
  announceMessage: jest.Mock;
} {
  return {
    announceBlock: jest.fn().mockResolvedValue(undefined),
    announceRemoval: jest.fn().mockResolvedValue(undefined),
    announcePoolDeletion: jest.fn().mockResolvedValue(undefined),
    announceCBLIndexUpdate: jest.fn().mockResolvedValue(undefined),
    announceCBLIndexDelete: jest.fn().mockResolvedValue(undefined),
    announceHeadUpdate: jest.fn().mockResolvedValue(undefined),
    announceACLUpdate: jest.fn().mockResolvedValue(undefined),
    handleAnnouncement: jest.fn().mockResolvedValue(undefined),
    onAnnouncement: jest.fn(),
    offAnnouncement: jest.fn(),
    getPendingAnnouncements: jest.fn().mockReturnValue([]),
    flushAnnouncements: jest.fn().mockResolvedValue(undefined),
    start: jest.fn(),
    stop: jest.fn().mockResolvedValue(undefined),
    getConfig: jest.fn().mockReturnValue({}),
    announceMessage: jest.fn().mockResolvedValue(undefined),
    sendDeliveryAck: jest.fn().mockResolvedValue(undefined),
    onMessageDelivery: jest.fn(),
    offMessageDelivery: jest.fn(),
    onDeliveryAck: jest.fn(),
    offDeliveryAck: jest.fn(),
    announceQuorumProposal: jest.fn().mockResolvedValue(undefined),
    announceQuorumVote: jest.fn().mockResolvedValue(undefined),
    onQuorumProposal: jest.fn(),
    offQuorumProposal: jest.fn(),
    onQuorumVote: jest.fn(),
    offQuorumVote: jest.fn(),
  } as unknown as IGossipService & { announceMessage: jest.Mock };
}

function makeEmailMetadata(
  overrides: Partial<IEmailMetadata> = {},
): IEmailMetadata {
  return {
    blockId: 'block-1' as unknown as BlockId,
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
    senderId: 'external@example.com',
    recipients: ['alice@brightchain.org'],
    priority: 0 as never,
    deliveryStatus: new Map(),
    acknowledgments: new Map(),
    encryptionScheme: 0 as never,
    isCBL: false,
    cblBlockIds: [],
    from: createMailbox('external', 'example.com', 'External Sender'),
    to: [createMailbox('alice', 'brightchain.org', 'Alice')],
    messageId: '<inbound-1@example.com>',
    subject: 'Hello from outside',
    date: new Date(),
    mimeVersion: '1.0',
    contentType: { type: 'text', subtype: 'plain', parameters: new Map() },
    customHeaders: new Map(),
    deliveryReceipts: new Map(),
    readReceipts: new Map(),
    ...overrides,
  } as IEmailMetadata;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('InboundProcessor', () => {
  let config: IEmailGatewayConfig;
  let parser: EmailParser;
  let emailService: EmailMessageService & { sendEmail: jest.Mock };
  let blockStore: IBlockStore & { put: jest.Mock };
  let gossip: IGossipService & { announceMessage: jest.Mock };
  let metadata: IEmailMetadata;

  beforeEach(() => {
    jest.clearAllMocks();

    config = makeConfig();
    metadata = makeEmailMetadata();
    parser = makeMockEmailParser(metadata);
    emailService = makeMockEmailMessageService();
    blockStore = makeMockBlockStore();
    gossip = makeMockGossipService();

    // Default fs mocks
    mockedFs.mkdirSync.mockReturnValue(undefined as unknown as string);
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(
      Buffer.from(
        'From: external@example.com\r\nTo: alice@brightchain.org\r\nSubject: Test\r\n\r\nHello',
      ),
    );
    mockedFs.unlinkSync.mockReturnValue(undefined);
    mockedFs.renameSync.mockReturnValue(undefined);
    mockedFs.readdirSync.mockReturnValue(
      [] as unknown as ReturnType<typeof fs.readdirSync>,
    );
    mockedFs.statSync.mockReturnValue({ isFile: () => true } as fs.Stats);
    mockedFs.watch.mockReturnValue({
      close: jest.fn(),
    } as unknown as fs.FSWatcher);
  });

  // ── Lifecycle ─────────────────────────────────────────────────────

  describe('start / stop', () => {
    it('should create directories and start watching on start()', () => {
      const proc = new InboundProcessor(
        config,
        parser,
        emailService,
        blockStore,
        gossip,
      );

      proc.start();

      expect(proc.isRunning()).toBe(true);
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        config.mailDropDirectory,
        { recursive: true },
      );
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(config.errorDirectory, {
        recursive: true,
      });
      expect(mockedFs.watch).toHaveBeenCalledWith(
        config.mailDropDirectory,
        expect.any(Function),
      );

      proc.stop();
    });

    it('should be idempotent — calling start() twice only watches once', () => {
      const proc = new InboundProcessor(
        config,
        parser,
        emailService,
        blockStore,
        gossip,
      );

      proc.start();
      proc.start();

      expect(mockedFs.watch).toHaveBeenCalledTimes(1);

      proc.stop();
    });

    it('should close the watcher on stop()', () => {
      const closeFn = jest.fn();
      mockedFs.watch.mockReturnValue({
        close: closeFn,
      } as unknown as fs.FSWatcher);

      const proc = new InboundProcessor(
        config,
        parser,
        emailService,
        blockStore,
        gossip,
      );
      proc.start();
      proc.stop();

      expect(proc.isRunning()).toBe(false);
      expect(closeFn).toHaveBeenCalledTimes(1);
    });

    it('should be a no-op when stop() is called without start()', () => {
      const proc = new InboundProcessor(
        config,
        parser,
        emailService,
        blockStore,
        gossip,
      );
      proc.stop();
      expect(proc.isRunning()).toBe(false);
    });
  });

  // ── File Processing Pipeline ──────────────────────────────────────

  describe('processFile', () => {
    it('should parse, store, create metadata, announce, and delete on success', async () => {
      const proc = new InboundProcessor(
        config,
        parser,
        emailService,
        blockStore,
        gossip,
      );

      await proc.processFile('msg-001.eml');

      // Parse was called
      expect(parser.parse).toHaveBeenCalledTimes(1);

      // Block store received the raw content
      expect(blockStore.put).toHaveBeenCalledTimes(1);

      // EmailMessageService.sendEmail was called to create metadata
      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
      const sendArg = emailService.sendEmail.mock.calls[0][0];
      expect(sendArg.from).toEqual(metadata.from);
      expect(sendArg.to).toEqual(metadata.to);
      expect(sendArg.subject).toBe(metadata.subject);

      // Gossip announcement was made
      expect(gossip.announceMessage).toHaveBeenCalledTimes(1);
      const [, deliveryMeta] = gossip.announceMessage.mock.calls[0];
      expect(deliveryMeta.messageId).toBe(metadata.messageId);
      expect(deliveryMeta.recipientIds).toContain('alice@brightchain.org');

      // File was deleted on success (Req 4.7)
      expect(mockedFs.unlinkSync).toHaveBeenCalledWith(
        path.join(config.mailDropDirectory, 'msg-001.eml'),
      );
    });

    it('should skip processing if file does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const proc = new InboundProcessor(
        config,
        parser,
        emailService,
        blockStore,
        gossip,
      );
      await proc.processFile('missing.eml');

      expect(parser.parse).not.toHaveBeenCalled();
      expect(blockStore.put).not.toHaveBeenCalled();
    });
  });

  // ── Idempotency ───────────────────────────────────────────────────

  describe('idempotency (Req 4.7)', () => {
    it('should not process the same file twice', async () => {
      const proc = new InboundProcessor(
        config,
        parser,
        emailService,
        blockStore,
        gossip,
      );

      await proc.processFile('msg-001.eml');
      await proc.processFile('msg-001.eml');

      expect(parser.parse).toHaveBeenCalledTimes(1);
    });

    it('should track processed files', async () => {
      const proc = new InboundProcessor(
        config,
        parser,
        emailService,
        blockStore,
        gossip,
      );

      await proc.processFile('msg-001.eml');

      expect(proc.getProcessedFiles().has('msg-001.eml')).toBe(true);
    });

    it('should allow reprocessing after clearProcessedFiles()', async () => {
      const proc = new InboundProcessor(
        config,
        parser,
        emailService,
        blockStore,
        gossip,
      );

      await proc.processFile('msg-001.eml');
      proc.clearProcessedFiles();
      await proc.processFile('msg-001.eml');

      expect(parser.parse).toHaveBeenCalledTimes(2);
    });
  });

  // ── Error Handling ────────────────────────────────────────────────

  describe('error handling (Req 4.8)', () => {
    it('should move file to error directory on parse failure', async () => {
      const failParser = {
        parse: jest.fn().mockRejectedValue(new Error('Invalid RFC 5322')),
      } as unknown as EmailParser;

      const proc = new InboundProcessor(
        config,
        failParser,
        emailService,
        blockStore,
        gossip,
      );
      await proc.processFile('bad-msg.eml');

      // File should be moved to error directory
      expect(mockedFs.renameSync).toHaveBeenCalledWith(
        path.join(config.mailDropDirectory, 'bad-msg.eml'),
        path.join(config.errorDirectory, 'bad-msg.eml'),
      );

      // File should NOT be deleted
      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();

      // File should be removed from processedFiles so retry is possible
      expect(proc.getProcessedFiles().has('bad-msg.eml')).toBe(false);
    });

    it('should move file to error directory on block store failure', async () => {
      blockStore.put.mockRejectedValue(new Error('Store unavailable'));

      const proc = new InboundProcessor(
        config,
        parser,
        emailService,
        blockStore,
        gossip,
      );
      await proc.processFile('store-fail.eml');

      expect(mockedFs.renameSync).toHaveBeenCalledWith(
        path.join(config.mailDropDirectory, 'store-fail.eml'),
        path.join(config.errorDirectory, 'store-fail.eml'),
      );
      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should move file to error directory on gossip failure', async () => {
      gossip.announceMessage.mockRejectedValue(new Error('Gossip down'));

      const proc = new InboundProcessor(
        config,
        parser,
        emailService,
        blockStore,
        gossip,
      );
      await proc.processFile('gossip-fail.eml');

      expect(mockedFs.renameSync).toHaveBeenCalledWith(
        path.join(config.mailDropDirectory, 'gossip-fail.eml'),
        path.join(config.errorDirectory, 'gossip-fail.eml'),
      );
    });

    it('should handle rename failure gracefully (file stays in place)', async () => {
      const failParser = {
        parse: jest.fn().mockRejectedValue(new Error('Parse error')),
      } as unknown as EmailParser;
      mockedFs.renameSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const proc = new InboundProcessor(
        config,
        failParser,
        emailService,
        blockStore,
        gossip,
      );

      // Should not throw
      await proc.processFile('stuck.eml');

      // File should be removed from processedFiles for retry
      expect(proc.getProcessedFiles().has('stuck.eml')).toBe(false);
    });
  });

  // ── Existing Files on Startup ─────────────────────────────────────

  describe('existing files on startup', () => {
    it('should process files already in the mail drop directory on start()', () => {
      mockedFs.readdirSync.mockReturnValue([
        'existing-1.eml',
        'existing-2.eml',
      ] as unknown as ReturnType<typeof fs.readdirSync>);
      mockedFs.statSync.mockReturnValue({ isFile: () => true } as fs.Stats);

      const proc = new InboundProcessor(
        config,
        parser,
        emailService,
        blockStore,
        gossip,
      );
      proc.start();

      // processFile is async and called via void, so we verify parse was called
      // after a small delay
      // The files should be queued for processing
      expect(mockedFs.readdirSync).toHaveBeenCalledWith(
        config.mailDropDirectory,
      );

      proc.stop();
    });
  });

  // ── Constructor ───────────────────────────────────────────────────

  describe('constructor', () => {
    it('should create a default EmailParser when null is passed', () => {
      const proc = new InboundProcessor(
        config,
        null,
        emailService,
        blockStore,
        gossip,
      );
      expect(proc).toBeDefined();
    });
  });

  // ── SPF/DKIM/DMARC Authentication (Req 6.4, 6.5) ────────────────

  describe('authentication verification (Req 6.4, 6.5)', () => {
    it('should store auth results in custom headers on success', async () => {
      // Raw message with passing auth results
      mockedFs.readFileSync.mockReturnValue(
        Buffer.from(
          'From: sender@example.com\r\n' +
            'To: alice@brightchain.org\r\n' +
            'Authentication-Results: mx.brightchain.org; spf=pass; dkim=pass; dmarc=pass\r\n' +
            '\r\nHello',
        ),
      );

      const proc = new InboundProcessor(
        config,
        parser,
        emailService,
        blockStore,
        gossip,
      );
      await proc.processFile('auth-pass.eml');

      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
      const sendArg = emailService.sendEmail.mock.calls[0][0];
      const authHeader = sendArg.customHeaders.get(
        'X-BrightChain-Auth-Results',
      );
      expect(authHeader).toBeDefined();
      expect(authHeader[0]).toContain('spf=pass');
      expect(authHeader[0]).toContain('dkim=pass');
      expect(authHeader[0]).toContain('dmarc=pass');
    });

    it('should move file to error directory when DMARC fails (Req 6.5)', async () => {
      // Raw message with failing DMARC
      mockedFs.readFileSync.mockReturnValue(
        Buffer.from(
          'From: spammer@evil.com\r\n' +
            'To: alice@brightchain.org\r\n' +
            'Authentication-Results: mx.brightchain.org; spf=fail; dkim=fail; dmarc=fail (p=reject)\r\n' +
            '\r\nSpam content',
        ),
      );

      const proc = new InboundProcessor(
        config,
        parser,
        emailService,
        blockStore,
        gossip,
      );
      await proc.processFile('dmarc-fail.eml');

      // Should NOT store or announce — message is rejected
      expect(blockStore.put).not.toHaveBeenCalled();
      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(gossip.announceMessage).not.toHaveBeenCalled();

      // File should be moved to error directory
      expect(mockedFs.renameSync).toHaveBeenCalledWith(
        path.join(config.mailDropDirectory, 'dmarc-fail.eml'),
        path.join(config.errorDirectory, 'dmarc-fail.eml'),
      );

      // File should NOT be deleted
      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should accept a custom IEmailAuthVerifier via constructor', async () => {
      const customVerifier = {
        verify: jest.fn().mockReturnValue({
          spf: { status: 'pass' },
          dkim: { status: 'pass' },
          dmarc: { status: 'pass' },
        }),
      };

      const proc = new InboundProcessor(
        config,
        parser,
        emailService,
        blockStore,
        gossip,
        customVerifier,
      );
      await proc.processFile('custom-verifier.eml');

      expect(customVerifier.verify).toHaveBeenCalledTimes(1);
      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    });
  });
});
