/**
 * @fileoverview Property-based tests for InboundProcessor idempotency
 *
 * **Feature: email-gateway**
 *
 * This test suite verifies:
 * - Property 7: Processing the same message file twice does not create duplicate metadata entries
 *
 * **Validates: Requirements 4.7**
 */

import * as fs from 'fs';

import fc from 'fast-check';

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

import type { IEmailAuthVerifier } from './emailAuthVerifier';
import type { IEmailGatewayConfig } from './emailGatewayConfig';
import { InboundProcessor } from './inboundProcessor';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('fs');

const mockedFs = jest.mocked(fs);

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeConfig(): IEmailGatewayConfig {
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
  };
}

function makeEmailMetadata(messageId: string): IEmailMetadata {
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
    messageId,
    subject: 'Test message',
    date: new Date(),
    mimeVersion: '1.0',
    contentType: {
      type: 'text',
      subtype: 'plain',
      parameters: new Map(),
      get mediaType() {
        return 'text/plain';
      },
    },
    customHeaders: new Map(),
    deliveryReceipts: new Map(),
    readReceipts: new Map(),
  } as unknown as IEmailMetadata;
}

/** Passing auth verifier stub — all checks pass. */
function makePassingAuthVerifier(): IEmailAuthVerifier {
  return {
    verify: () => ({
      spf: { status: 'pass' as const },
      dkim: { status: 'pass' as const },
      dmarc: { status: 'pass' as const },
    }),
  };
}

/**
 * Arbitrary that generates valid Maildir-style filenames.
 * Format: alphanumeric + dots/dashes, 5–30 chars, ending with .eml
 */
const FILENAME_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-_.'.split('');
const arbFilename: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...FILENAME_CHARS), { minLength: 3, maxLength: 25 })
  .map((chars) => chars.join('') + '.eml');

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('InboundProcessor Idempotency Property Tests', () => {
  let sendEmailMock: jest.Mock;
  let putMock: jest.Mock;
  let announceMessageMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    sendEmailMock = jest.fn().mockResolvedValue({
      messageId: '<test@brightchain.org>',
      brightchainMessageId: 'bc-1',
      deliveryStatus: new Map(),
      success: true,
    });

    putMock = jest.fn().mockResolvedValue(undefined);
    announceMessageMock = jest.fn().mockResolvedValue(undefined);

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

  describe('Property 7: Processing the same message file twice does not create duplicate metadata entries', () => {
    /**
     * **Feature: email-gateway, Property 7**
     *
     * *For any* valid filename, calling processFile with the same filename
     * N times (N >= 2) results in exactly one metadata creation (sendEmail)
     * and exactly one block store write. The idempotency guard in
     * processedFiles prevents duplicate processing.
     *
     * **Validates: Requirements 4.7**
     */
    it('calling processFile with the same filename multiple times creates metadata exactly once', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbFilename,
          fc.integer({ min: 2, max: 10 }),
          async (filename: string, totalCalls: number) => {
            // Reset mocks for each property run
            sendEmailMock.mockClear();
            putMock.mockClear();
            announceMessageMock.mockClear();

            const metadata = makeEmailMetadata(`<${filename}@example.com>`);

            const parser = {
              parse: jest.fn().mockResolvedValue(metadata),
            } as unknown as EmailParser;

            const emailService = {
              sendEmail: sendEmailMock,
            } as unknown as EmailMessageService;

            const blockStore = {
              put: putMock,
            } as unknown as IBlockStore;

            const gossip = {
              announceMessage: announceMessageMock,
            } as unknown as IGossipService;

            const proc = new InboundProcessor(
              makeConfig(),
              parser,
              emailService,
              blockStore,
              gossip,
              makePassingAuthVerifier(),
            );

            // Call processFile N times with the same filename
            for (let i = 0; i < totalCalls; i++) {
              await proc.processFile(filename);
            }

            // Metadata should be created exactly once (no duplicates)
            expect(sendEmailMock).toHaveBeenCalledTimes(1);
            expect(putMock).toHaveBeenCalledTimes(1);
            expect(announceMessageMock).toHaveBeenCalledTimes(1);

            // The file should appear in processedFiles
            expect(proc.getProcessedFiles().has(filename)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * *For any* set of distinct filenames, each filename is processed
     * exactly once even when interleaved with duplicate calls.
     *
     * **Validates: Requirements 4.7**
     */
    it('distinct filenames are each processed exactly once even with interleaved duplicates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(arbFilename, { minLength: 1, maxLength: 8 }),
          async (filenames: string[]) => {
            sendEmailMock.mockClear();
            putMock.mockClear();
            announceMessageMock.mockClear();

            const metadata = makeEmailMetadata('<multi@example.com>');

            const parser = {
              parse: jest.fn().mockResolvedValue(metadata),
            } as unknown as EmailParser;

            const emailService = {
              sendEmail: sendEmailMock,
            } as unknown as EmailMessageService;

            const blockStore = {
              put: putMock,
            } as unknown as IBlockStore;

            const gossip = {
              announceMessage: announceMessageMock,
            } as unknown as IGossipService;

            const proc = new InboundProcessor(
              makeConfig(),
              parser,
              emailService,
              blockStore,
              gossip,
              makePassingAuthVerifier(),
            );

            // Process each filename twice — first call + duplicate
            for (const filename of filenames) {
              await proc.processFile(filename);
              await proc.processFile(filename); // duplicate
            }

            // Each unique filename should produce exactly one metadata entry
            expect(sendEmailMock).toHaveBeenCalledTimes(filenames.length);
            expect(putMock).toHaveBeenCalledTimes(filenames.length);
            expect(announceMessageMock).toHaveBeenCalledTimes(filenames.length);

            // All filenames should be tracked
            for (const filename of filenames) {
              expect(proc.getProcessedFiles().has(filename)).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * After clearProcessedFiles(), the same filename CAN be reprocessed,
     * confirming the idempotency guard is the processedFiles Set.
     *
     * **Validates: Requirements 4.7**
     */
    it('clearProcessedFiles resets idempotency allowing reprocessing', async () => {
      await fc.assert(
        fc.asyncProperty(arbFilename, async (filename: string) => {
          sendEmailMock.mockClear();
          putMock.mockClear();

          const metadata = makeEmailMetadata(`<${filename}@example.com>`);

          const parser = {
            parse: jest.fn().mockResolvedValue(metadata),
          } as unknown as EmailParser;

          const emailService = {
            sendEmail: sendEmailMock,
          } as unknown as EmailMessageService;

          const blockStore = {
            put: putMock,
          } as unknown as IBlockStore;

          const gossip = {
            announceMessage: announceMessageMock,
          } as unknown as IGossipService;

          const proc = new InboundProcessor(
            makeConfig(),
            parser,
            emailService,
            blockStore,
            gossip,
            makePassingAuthVerifier(),
          );

          // First processing
          await proc.processFile(filename);
          expect(sendEmailMock).toHaveBeenCalledTimes(1);

          // Clear idempotency guard
          proc.clearProcessedFiles();

          // Second processing — should succeed since guard was cleared
          await proc.processFile(filename);
          expect(sendEmailMock).toHaveBeenCalledTimes(2);
        }),
        { numRuns: 100 },
      );
    });
  });
});
