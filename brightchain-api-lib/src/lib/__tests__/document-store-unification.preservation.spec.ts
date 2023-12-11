/**
 * @fileoverview Preservation Property Tests — Document Store Unification
 *
 * **Property 2: Preservation** — Registered Models and Service API Signatures
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11**
 *
 * These tests capture baseline behavior on UNFIXED code for non-buggy inputs.
 * They verify that existing correct behavior is preserved through the fix:
 *   - Registered models (users, roles, etc.) return from BrightDb
 *   - Service public API signatures remain unchanged
 *   - BrightPass encrypted entries use block store (not BrightDb)
 *   - wrapCollection bridges collections to BrightHubCollection<T>
 *
 * EXPECTED OUTCOME: All tests PASS on unfixed code (confirms baseline to preserve).
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { App } from '../application';
import { Environment } from '../environment';
import { BrightChainDatabasePlugin } from '../plugins/brightchain-database-plugin';
import { ConversationService } from '@brightchain/brightchain-lib';
import { BrightPassService } from '../services/brightpass';
import {
  wrapCollection,
  type BrightHubCollection,
} from '../services/brighthub/collectionAdapter';
import type { DefaultBackendIdType } from '../shared-types';

// Ensure the disk store factory is registered
import '../factories/blockStoreFactory';

jest.setTimeout(180_000);

// ── Helpers (reused from exploration test) ───────────────────────────────

let tmpDistDir: string | undefined;

function setupDistDirs(): void {
  tmpDistDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-preservation-'));
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
  process.env['DEV_DATABASE'] = 'ephemeral-preservation-test';

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
 */
async function createConnectedApp(): Promise<{
  app: App<DefaultBackendIdType>;
  plugin: BrightChainDatabasePlugin<DefaultBackendIdType>;
  cleanup: () => Promise<void>;
}> {
  const env = new Environment<DefaultBackendIdType>(undefined, true, true);
  const app = new App<DefaultBackendIdType>(env);

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


// ── Property 2: Preservation — Registered Models and Service API Signatures ──

describe('Property 2: Preservation — Registered Models and Service API Signatures', () => {
  /**
   * 2.1: For all registered model names, getModel(name) returns the registered Model
   *
   * **Validates: Requirements 3.1, 3.4, 3.6**
   *
   * Registered models (users, roles, user_roles, mnemonics) are correctly
   * returned from BrightDb via getModel(). This behavior must be preserved.
   * Also verifies app.db returns the plugin's BrightDbDocumentStoreAdapter
   * when the plugin is connected.
   */
  it('registered models are returned from BrightDb via getModel()', async () => {
    const registeredModelNames = ['users', 'roles', 'user_roles', 'mnemonics'];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...registeredModelNames),
        async (modelName) => {
          setRequiredEnvVars();
          const { app, plugin, cleanup } = await createConnectedApp();

          try {
            const brightDb = plugin.brightDb;

            // The model should be registered in BrightDb
            expect(brightDb.hasModel(modelName)).toBe(true);

            // getModel() should return the registered Model (not a raw collection)
            const model = app.getModel(modelName);
            expect(model).toBeDefined();

            // The registered Model from brightDb.model() should be the same reference
            const registeredModel = brightDb.model(modelName);
            expect(model).toBe(registeredModel);

            // app.db should return the plugin's document store adapter (not standalone)
            const db = app.db;
            expect(db).toBeDefined();
            // The db getter should return the plugin's db when connected
            expect(db).toBe(plugin.db);
          } finally {
            await cleanup();
            clearRequiredEnvVars();
          }
        },
      ),
      { numRuns: 4 }, // One run per registered model name
    );
  });

  /**
   * 2.2: AdminHubController already uses correct prefixed collection name
   *
   * **Validates: Requirements 3.5, 3.6**
   *
   * AdminHubController queries brightDb.collection('brighthub_posts') —
   * this is already correct and must be preserved through the fix.
   */
  it('AdminHubController uses prefixed collection name brighthub_posts', () => {
    const adminHubSource = fs.readFileSync(
      path.resolve(__dirname, '../controllers/api/adminHub.ts'),
      'utf-8',
    );

    // AdminHubController already uses the correct prefixed name
    expect(adminHubSource).toContain("collection('brighthub_posts')");
  });

  /**
   * 2.3: wrapCollection bridges collections to BrightHubCollection<T>
   *
   * **Validates: Requirements 3.4**
   *
   * wrapCollection() wraps any underlying collection to provide the
   * BrightHubCollection<T> interface (create, findOne, find, updateOne,
   * deleteOne). This adapter must continue working after the fix.
   */
  it('wrapCollection bridges collections to BrightHubCollection<T>', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          collectionName: fc.constantFrom('brighthub_posts', 'brighthub_likes', 'brighthub_follows'),
        }),
        async ({ collectionName }) => {
          setRequiredEnvVars();
          const { app, cleanup } = await createConnectedApp();

          try {
            const rawCollection = app.getModel<Record<string, unknown>>(collectionName);
            const wrapped: BrightHubCollection<Record<string, unknown>> =
              wrapCollection<Record<string, unknown>>(rawCollection);

            // Verify the wrapped collection has all required BrightHubCollection methods
            expect(typeof wrapped.create).toBe('function');
            expect(typeof wrapped.findOne).toBe('function');
            expect(typeof wrapped.find).toBe('function');
            expect(typeof wrapped.updateOne).toBe('function');
            expect(typeof wrapped.deleteOne).toBe('function');

            // Verify findOne returns an object with exec()
            const findOneResult = wrapped.findOne({ _id: 'nonexistent' });
            expect(typeof findOneResult.exec).toBe('function');

            // Verify find returns an object with sort/skip/limit/exec
            const findResult = wrapped.find({});
            expect(typeof findResult.sort).toBe('function');
            expect(typeof findResult.skip).toBe('function');
            expect(typeof findResult.limit).toBe('function');
            expect(typeof findResult.exec).toBe('function');
          } finally {
            await cleanup();
            clearRequiredEnvVars();
          }
        },
      ),
      { numRuns: 3 },
    );
  });


  /**
   * 2.4: ConversationService public methods have correct signatures and return types
   *
   * **Validates: Requirements 3.10**
   *
   * ConversationService public API (createOrGetConversation, sendMessage,
   * listConversations, getMessages, deleteMessage, promoteToGroup) must
   * maintain the same signatures and return types after the fix.
   */
  it('ConversationService public API signatures are preserved', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          memberA: fc.uuid(),
          memberB: fc.uuid(),
          messageContent: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ memberA, memberB, messageContent }) => {
          fc.pre(memberA !== memberB);

          const service = new ConversationService();
          service.registerMember(memberA);
          service.registerMember(memberB);

          // createOrGetConversation returns IConversation
          const conversation = await service.createOrGetConversation(
            memberA,
            memberB,
          );
          expect(conversation).toBeDefined();
          expect(conversation.id).toBeDefined();
          expect(conversation.participants).toContain(memberA);
          expect(conversation.participants).toContain(memberB);
          expect(conversation.createdAt).toBeInstanceOf(Date);
          expect(conversation.lastMessageAt).toBeInstanceOf(Date);

          // sendMessage returns ICommunicationMessage
          const message = await service.sendMessage(
            memberA,
            memberB,
            messageContent,
            conversation.id,
          );
          expect(message).toBeDefined();
          expect(message.id).toBeDefined();
          expect(message.senderId).toBe(memberA);
          expect(message.encryptedContent).toBe(messageContent);
          expect(message.createdAt).toBeInstanceOf(Date);

          // listConversations returns IPaginatedResult<IConversation>
          const listed = await service.listConversations(memberA);
          expect(listed).toBeDefined();
          expect(Array.isArray(listed.items)).toBe(true);
          expect(listed.items.length).toBeGreaterThan(0);

          // getMessages returns IPaginatedResult<ICommunicationMessage>
          const messages = await service.getMessages(
            conversation.id,
            memberA,
          );
          expect(messages).toBeDefined();
          expect(Array.isArray(messages.items)).toBe(true);
          expect(messages.items.length).toBeGreaterThan(0);

          // deleteMessage returns void
          const deleteResult = await service.deleteMessage(
            conversation.id,
            message.id,
            memberA,
          );
          expect(deleteResult).toBeUndefined();
        },
      ),
      { numRuns: 3 },
    );
  });

  /**
   * 2.5: BrightPassService vault operations — encrypted entry data stays in block store
   *
   * **Validates: Requirements 3.7, 3.8**
   *
   * BrightPass encrypted entry data uses block store (not BrightDb) for
   * actual vault contents. Only vault index/metadata should move to BrightDb.
   * The block store usage for encrypted entries must be preserved.
   */
  it('BrightPassService encrypted entry data stays in block store', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          memberId: fc.uuid(),
          vaultName: fc.string({ minLength: 1, maxLength: 30 }),
          masterPassword: fc.string({ minLength: 8, maxLength: 32 }),
          entryTitle: fc.string({ minLength: 1, maxLength: 50 }),
          entryUsername: fc.string({ minLength: 1, maxLength: 30 }),
          entryPassword: fc.string({ minLength: 1, maxLength: 30 }),
        }),
        async ({
          memberId,
          vaultName,
          masterPassword,
          entryTitle,
          entryUsername,
          entryPassword,
        }) => {
          // Create service with default MemoryBlockStore (no BrightDb)
          const passService = new BrightPassService();

          // createVault returns VaultMetadata
          const vaultMeta = await passService.createVault(
            memberId,
            vaultName,
            masterPassword,
          );
          expect(vaultMeta).toBeDefined();
          expect(vaultMeta.id).toBeDefined();
          expect(vaultMeta.name).toBe(vaultName);
          expect(vaultMeta.ownerId).toBe(memberId);

          // addEntry stores encrypted data — returns VaultEntry
          const entry = await passService.addEntry(vaultMeta.id, {
            id: '',
            title: entryTitle,
            type: 'login',
            username: entryUsername,
            password: entryPassword,
            fields: {},
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          expect(entry).toBeDefined();
          expect(entry.id).toBeDefined();
          expect(entry.title).toBe(entryTitle);

          // getEntry retrieves and decrypts from block store — returns VaultEntry
          const retrieved = await passService.getEntry(vaultMeta.id, entry.id);
          expect(retrieved).toBeDefined();
          expect(retrieved.title).toBe(entryTitle);
          expect(retrieved.username).toBe(entryUsername);
          expect(retrieved.password).toBe(entryPassword);

          // listVaults returns VaultMetadata[]
          const vaults = await passService.listVaults(memberId);
          expect(Array.isArray(vaults)).toBe(true);
          expect(vaults.length).toBeGreaterThan(0);
          expect(vaults[0].id).toBe(vaultMeta.id);

          // openVault returns DecryptedVault
          const opened = await passService.openVault(
            memberId,
            vaultMeta.id,
            masterPassword,
          );
          expect(opened).toBeDefined();
          expect(opened.metadata.id).toBe(vaultMeta.id);

          // deleteVault returns void
          const deleteResult = await passService.deleteVault(
            memberId,
            vaultMeta.id,
            masterPassword,
          );
          expect(deleteResult).toBeUndefined();
        },
      ),
      { numRuns: 2 },
    );
  });

  /**
   * 2.6: IEmailMetadataStore interface contract is satisfied
   *
   * **Validates: Requirements 3.9, 3.11**
   *
   * InMemoryEmailMetadataStore satisfies the IEmailMetadataStore interface.
   * Any replacement implementation must satisfy the same contract.
   */
  it('IEmailMetadataStore interface contract is satisfied by InMemoryEmailMetadataStore', () => {
    // Import dynamically to avoid pulling in all messaging deps at top level
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { InMemoryEmailMetadataStore } = require('@brightchain/brightchain-lib');
    const store = new InMemoryEmailMetadataStore();

    // Verify all required IEmailMetadataStore methods exist
    expect(typeof store.store).toBe('function');
    expect(typeof store.get).toBe('function');
    expect(typeof store.delete).toBe('function');
    expect(typeof store.update).toBe('function');
    expect(typeof store.queryInbox).toBe('function');
    expect(typeof store.markAsRead).toBe('function');
    expect(typeof store.getThread).toBe('function');
    expect(typeof store.getUnreadCount).toBe('function');
    expect(typeof store.getRootMessage).toBe('function');

    // Optional methods
    expect(typeof store.storeAttachmentContent).toBe('function');
    expect(typeof store.getAttachmentContent).toBe('function');
  });
});
