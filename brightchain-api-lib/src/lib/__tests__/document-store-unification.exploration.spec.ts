/**
 * @fileoverview Bug Condition Exploration Test — Document Store Divergence
 *
 * **Property 1: Bug Condition** — Document Store Divergence
 *
 * **Validates: Requirements 1.1, 1.3, 1.4, 1.6, 1.9, 1.11, 1.12, 1.14, 1.15, 1.17, 1.18, 1.19**
 *
 * CRITICAL: This test is EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bug exists — services write to stores invisible to admin controllers.
 *
 * Each area tests the same pattern:
 *   1. Write data through the service's storage mechanism
 *   2. Read data through the admin controller's BrightDb path
 *   3. Expect the data to be present (it won't be — proving the bug)
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { App } from '../application';
import { Environment } from '../environment';
import { BrightChainDatabasePlugin } from '../plugins/brightchain-database-plugin';
import {
  ConversationService,
  InMemoryEmailMetadataStore,
  MessagePriority,
  MessageEncryptionScheme,
  DurabilityLevel,
  ReplicationStatus,
  type IEmailMetadataStore,
} from '@brightchain/brightchain-lib';
import { createChatStorageProvider } from '../services/brightchat/chatStorageAdapter';
import { BrightPassService } from '../services/brightpass';
import type { DefaultBackendIdType } from '../shared-types';

// Ensure the disk store factory is registered
import '../factories/blockStoreFactory';

jest.setTimeout(180_000);

// ── Helpers ──────────────────────────────────────────────────────────────

let tmpDistDir: string | undefined;

function setupDistDirs(): void {
  tmpDistDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-exploration-'));
  const reactDist = path.join(tmpDistDir, 'dist', 'react');
  const apiDist = path.join(tmpDistDir, 'dist', 'api');
  fs.mkdirSync(reactDist, { recursive: true });
  fs.mkdirSync(apiDist, { recursive: true });
  fs.writeFileSync(path.join(reactDist, 'index.html'), '<html></html>');
  process.env['REACT_DIST_DIR'] = reactDist;
  process.env['API_DIST_DIR'] = apiDist;
}

function teardownDistDirs(): void {
  if (tmpDistDir) {
    fs.rmSync(tmpDistDir, { recursive: true, force: true });
    tmpDistDir = undefined;
  }
}

const savedEnv: Record<string, string | undefined> = {};

function setRequiredEnvVars(): void {
  const vars: Record<string, string> = {
    JWT_SECRET:
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    MNEMONIC_HMAC_SECRET:
      'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
    MNEMONIC_ENCRYPTION_KEY:
      'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    SYSTEM_MNEMONIC:
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  };

  for (const [key, value] of Object.entries(vars)) {
    savedEnv[key] = process.env[key];
    process.env[key] = value;
  }

  savedEnv['BRIGHTCHAIN_BLOCKSTORE_PATH'] =
    process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'];
  savedEnv['BLOCKSTORE_PATH'] = process.env['BLOCKSTORE_PATH'];
  savedEnv['DEV_DATABASE'] = process.env['DEV_DATABASE'];
  delete process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'];
  delete process.env['BLOCKSTORE_PATH'];
  process.env['DEV_DATABASE'] = 'ephemeral-exploration-test';

  setupDistDirs();
}

function clearRequiredEnvVars(): void {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  teardownDistDirs();
}


/**
 * Create an App instance with mocked HTTP listen and connected plugin.
 * Returns the app and plugin for direct BrightDb access.
 */
async function createConnectedApp(): Promise<{
  app: App<DefaultBackendIdType>;
  plugin: BrightChainDatabasePlugin<DefaultBackendIdType>;
  cleanup: () => Promise<void>;
}> {
  const env = new Environment<DefaultBackendIdType>(undefined, true, true);
  const app = new App<DefaultBackendIdType>(env);

  // Mock expressApp.listen to avoid binding to a real port
  const mockServer = http.createServer();
  jest.spyOn(app.expressApp, 'listen').mockImplementation(((
    _port: number,
    _host: string,
    callback: () => void,
  ) => {
    if (callback) callback();
    return mockServer;
  }) as never);

  const plugin =
    app.databasePlugin as BrightChainDatabasePlugin<DefaultBackendIdType>;

  // Start the app to trigger plugin connection
  await app.start();

  return {
    app,
    plugin,
    cleanup: async () => {
      try {
        mockServer.close();
        await app.stop();
      } catch {
        // Ignore cleanup errors
      }
    },
  };
}

// ── Property 1: Bug Condition — Document Store Divergence ────────────────

describe('Property 1: Bug Condition — Document Store Divergence', () => {
  /**
   * Area 1/2: getModel() falls through to standalone store
   *
   * **Validates: Requirements 1.3, 1.4**
   *
   * Write a document via app.getModel('brighthub_posts'), then read via
   * plugin.brightDb.collection('brighthub_posts'). The document should be
   * present if storage is unified. On unfixed code, getModel falls through
   * to the standalone _brightchainDocumentStore, so the document will NOT
   * be visible in the plugin's BrightDb — proving the bug.
   */
  it('Area 1/2: data written via getModel() is visible in plugin BrightDb', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 50 }),
          postId: fc.uuid(),
        }),
        async ({ title, postId }) => {
          setRequiredEnvVars();
          const { app, plugin, cleanup } = await createConnectedApp();

          try {
            // Write via getModel (service path)
            const collection = app.getModel<Record<string, unknown>>(
              'brighthub_posts',
            );
            await collection.create({
              _id: postId,
              title,
              createdAt: new Date(),
            });

            // Read via plugin's BrightDb (admin controller path)
            const brightDb = plugin.brightDb;
            const adminCollection = brightDb.collection('brighthub_posts');
            const count = await adminCollection.countDocuments();

            // This SHOULD find the document — but on unfixed code it won't
            expect(count).toBeGreaterThan(0);
          } finally {
            await cleanup();
            clearRequiredEnvVars();
          }
        },
      ),
      { numRuns: 1 },
    );
  });

  /**
   * Area 3: ConversationService stores data in Maps, not BrightDb
   *
   * **Validates: Requirements 1.6, 1.9**
   *
   * Create a conversation via ConversationService, then query
   * brightDb.collection('brightchat_conversations'). The conversation
   * should be present if storage is unified. On unfixed code, data lives
   * in a plain Map — proving the bug.
   */
  it('Area 3: ConversationService data is visible in BrightDb', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          memberA: fc.uuid(),
          memberB: fc.uuid(),
        }),
        async ({ memberA, memberB }) => {
          // Ensure distinct members
          fc.pre(memberA !== memberB);

          setRequiredEnvVars();
          const { app, plugin, cleanup } = await createConnectedApp();

          try {
            // Create a fresh ConversationService with the default (non-ECIES)
            // key encryption handler but wired to the same BrightDb storage
            // provider. The app's wired ConversationService uses the ECIES
            // handler which requires pre-cached public keys — random UUIDs
            // won't have those. This test validates storage unification, not
            // encryption, so the default handler is appropriate.
            const chatStorageProvider = createChatStorageProvider(
              (name) => app.getModel(name),
            );
            const conversationService = new ConversationService(
              null,      // memberReachabilityCheck
              undefined, // eventEmitter
              chatStorageProvider,
              undefined, // encryptKey — uses default base64 handler
            );
            conversationService.registerMember(memberA);
            conversationService.registerMember(memberB);
            await conversationService.createOrGetConversation(memberA, memberB);

            // Query BrightDb (admin controller path)
            const brightDb = plugin.brightDb;
            const adminCollection = brightDb.collection(
              'brightchat_conversations',
            );
            const count = await adminCollection.countDocuments();

            // This SHOULD find the conversation — but on unfixed code it won't
            expect(count).toBeGreaterThan(0);
          } finally {
            await cleanup();
            clearRequiredEnvVars();
          }
        },
      ),
      { numRuns: 1 },
    );
  });

  /**
   * Area 4: BrightPassService stores vault metadata in Maps, not BrightDb
   *
   * **Validates: Requirements 1.11, 1.12**
   *
   * Create a vault via BrightPassService, then query
   * brightDb.collection('brightpass_vaults'). The vault metadata should
   * be present if storage is unified. On unfixed code, data lives in
   * plain Maps — proving the bug.
   */
  it('Area 4: BrightPassService vault metadata is visible in BrightDb', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          memberId: fc.uuid(),
          vaultName: fc.string({ minLength: 1, maxLength: 30 }),
          masterPassword: fc.string({ minLength: 8, maxLength: 32 }),
        }),
        async ({ memberId, vaultName, masterPassword }) => {
          setRequiredEnvVars();
          const { app, plugin, cleanup } = await createConnectedApp();

          try {
            // Get the BrightDb-backed vault metadata collection wired by App.start()
            // so the BrightPassService writes through to BrightDb.
            const vaultMetadataCollection = app.services.has('vaultMetadataCollection')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ? (app.services.get('vaultMetadataCollection') as any)
              : undefined;

            // Create vault via service with the app's wired collection
            const passService = new BrightPassService(
              undefined,
              undefined,
              undefined,
              undefined,
              vaultMetadataCollection,
            );
            await passService.createVault(memberId, vaultName, masterPassword);

            // Query BrightDb (admin controller path)
            const brightDb = plugin.brightDb;
            const adminCollection =
              brightDb.collection('brightpass_vaults');
            const count = await adminCollection.countDocuments();

            // This SHOULD find the vault metadata — but on unfixed code it won't
            expect(count).toBeGreaterThan(0);
          } finally {
            await cleanup();
            clearRequiredEnvVars();
          }
        },
      ),
      { numRuns: 1 },
    );
  });

  /**
   * Area 5: InMemoryEmailMetadataStore stores email in Maps, not BrightDb
   *
   * **Validates: Requirements 1.14, 1.15**
   *
   * Store email metadata via InMemoryEmailMetadataStore, then query
   * brightDb.collection('brightmail_emails'). The email should be present
   * if storage is unified. On unfixed code, data lives in a plain Map —
   * proving the bug.
   */
  it('Area 5: email metadata stored via InMemoryEmailMetadataStore is visible in BrightDb', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          messageId: fc.uuid(),
          subject: fc.string({ minLength: 1, maxLength: 50 }),
          senderEmail: fc.emailAddress(),
        }),
        async ({ messageId, subject, senderEmail }) => {
          setRequiredEnvVars();
          const { app, plugin, cleanup } = await createConnectedApp();

          try {
            // Get the BrightDb-backed email metadata store wired by App.start()
            const emailStore = app.services.get<IEmailMetadataStore>('emailMetadataStore');
            await emailStore.store({
              messageId,
              subject,
              from: { address: senderEmail, name: 'Test Sender' },
              to: [{ address: 'recipient@test.com', name: 'Recipient' }],
              date: new Date(),
              mimeVersion: '1.0',
              contentType: { type: 'text', subtype: 'plain' },
              customHeaders: new Map(),
              deliveryReceipts: new Map(),
              readReceipts: new Map(),
              // IMessageMetadata fields
              messageType: 'email',
              senderId: senderEmail,
              recipients: ['recipient@test.com'],
              priority: MessagePriority.NORMAL,
              deliveryStatus: new Map(),
              acknowledgments: new Map(),
              encryptionScheme: MessageEncryptionScheme.NONE,
              isCBL: false,
              // IBlockMetadata fields
              blockId: messageId as never,
              createdAt: new Date(),
              expiresAt: null,
              durabilityLevel: DurabilityLevel.None,
              parityBlockIds: [],
              accessCount: 0,
              lastAccessedAt: new Date(),
              replicationStatus: ReplicationStatus.Pending,
              targetReplicationFactor: 0,
              replicaNodeIds: [],
              size: 100,
              checksum: 'abc123',
            });

            // Query BrightDb (admin controller path)
            const brightDb = plugin.brightDb;
            const adminCollection =
              brightDb.collection('brightmail_emails');
            const count = await adminCollection.countDocuments();

            // This SHOULD find the email — but on unfixed code it won't
            expect(count).toBeGreaterThan(0);
          } finally {
            await cleanup();
            clearRequiredEnvVars();
          }
        },
      ),
      { numRuns: 1 },
    );
  });

  /**
   * Area 6: Admin controllers use unprefixed collection names
   *
   * **Validates: Requirements 1.17, 1.18, 1.19**
   *
   * Verify that admin controllers use prefixed collection names matching
   * what services write to. On unfixed code, AdminChatController uses
   * 'conversations' instead of 'brightchat_conversations', etc.
   *
   * This is a source-code-level assertion — we read the controller source
   * and verify the collection names used.
   */
  it('Area 6: admin controllers use prefixed collection names matching service writes', () => {
    // Read the admin controller source files and check collection names
    const adminChatSource = fs.readFileSync(
      path.resolve(
        __dirname,
        '../controllers/api/adminChat.ts',
      ),
      'utf-8',
    );
    const adminPassSource = fs.readFileSync(
      path.resolve(
        __dirname,
        '../controllers/api/adminPass.ts',
      ),
      'utf-8',
    );
    const adminMailSource = fs.readFileSync(
      path.resolve(
        __dirname,
        '../controllers/api/adminMail.ts',
      ),
      'utf-8',
    );

    // AdminChatController should use 'brightchat_conversations' not 'conversations'
    expect(adminChatSource).toContain("collection('brightchat_conversations')");
    expect(adminChatSource).not.toContain("collection('conversations')");

    // AdminChatController should use 'brightchat_messages' not 'messages'
    expect(adminChatSource).toContain("collection('brightchat_messages')");
    expect(adminChatSource).not.toContain("collection('messages')");

    // AdminPassController should use 'brightpass_vaults' not 'vaults'
    expect(adminPassSource).toContain("collection('brightpass_vaults')");
    expect(adminPassSource).not.toContain("collection('vaults')");

    // AdminMailController should use 'brightmail_emails' not 'emails'
    expect(adminMailSource).toContain("collection('brightmail_emails')");
    expect(adminMailSource).not.toContain("collection('emails')");
  });
});
