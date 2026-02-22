/**
 * @fileoverview BrightChain database plugin for the express-suite plugin architecture.
 *
 * Implements IDatabasePlugin<TID> to encapsulate the BrightChain database stack
 * lifecycle: block stores, BrightChainDb, member/energy stores, and the
 * authentication provider. The plugin is registered via Application.useDatabasePlugin()
 * and participates in the standard plugin lifecycle (connect → init → stop).
 *
 * BrightChainDb already implements IDatabase from express-suite, so the plugin's
 * `database` property returns the BrightChainDb instance directly — no adapter needed.
 *
 * @module plugins/brightchain-database-plugin
 */

import type { IBlockStore, IDocumentStore } from '@brightchain/brightchain-lib';
import { EnergyAccountStore, MemberStore } from '@brightchain/brightchain-lib';
import type { BrightChainDb } from '@brightchain/db';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type {
  IApplication,
  IAuthenticationProvider,
  IDatabase,
  IDatabasePlugin,
} from '@digitaldefiance/node-express-suite';
import { BrightChainDbDocumentStoreAdapter } from '../adapters/brightChainDbDocumentStoreAdapter';
import { brightchainDatabaseInit } from '../databaseInit';
import type { Environment } from '../environment';
import type { IBrightChainApplication } from '../interfaces/application';
import { BrightChainAuthenticationProvider } from '../services/brightchain-authentication-provider';

/**
 * BrightChain database plugin implementing IDatabasePlugin<TID>.
 *
 * Owns the full database lifecycle:
 * - connect() → calls brightchainDatabaseInit() and stores backend references
 * - init(app) → creates BrightChainAuthenticationProvider
 * - stop() → delegates to disconnect()
 * - disconnect() → releases all references (idempotent)
 *
 * Typed accessors (blockStore, memberStore, energyStore, brightChainDb, documentStore)
 * throw descriptive errors when the plugin is not connected.
 */
export class BrightChainDatabasePlugin<
  TID extends PlatformID,
> implements IDatabasePlugin<TID> {
  public readonly name = 'brightchain-database';
  public readonly version = '1.0.0';

  private readonly _environment: Environment<TID>;
  private _connected = false;
  private _blockStore: IBlockStore | null = null;
  private _brightChainDb: BrightChainDb | null = null;
  private _documentStore: IDocumentStore | null = null;
  private _memberStore: MemberStore | null = null;
  private _energyStore: EnergyAccountStore | null = null;
  private _authProvider: BrightChainAuthenticationProvider<TID> | null = null;

  constructor(environment: Environment<TID>) {
    this._environment = environment;
  }

  // ── IDatabasePlugin contract ──────────────────────────────────────

  /**
   * The IDatabase instance this plugin manages.
   * BrightChainDb implements IDatabase directly, so no adapter is needed.
   * @throws Error if the plugin is not connected.
   */
  get database(): IDatabase {
    if (!this._brightChainDb) {
      throw new Error(
        'BrightChainDatabasePlugin: cannot access "database" — plugin is not connected. Call connect() first.',
      );
    }
    return this._brightChainDb;
  }

  /**
   * Authentication provider created during init().
   * Returns undefined before init() is called.
   */
  get authenticationProvider(): IAuthenticationProvider<TID> | undefined {
    return this._authProvider ?? undefined;
  }

  /**
   * Connect the BrightChain database stack.
   *
   * Calls brightchainDatabaseInit(environment) and stores the resulting
   * backend references (blockStore, db/BrightChainDb, documentStore,
   * memberStore, energyStore).
   *
   * @param _uri - Ignored; BrightChain uses environment-based configuration.
   * @throws Error if brightchainDatabaseInit() returns a failure result.
   */
  async connect(_uri?: string): Promise<void> {
    const initResult = await brightchainDatabaseInit(this._environment);

    if (!initResult.success || !initResult.backend) {
      throw new Error(
        `BrightChain database initialization failed: ${initResult.error ?? 'unknown error'}`,
      );
    }

    const { blockStore, db, memberStore, energyStore } = initResult.backend;

    this._blockStore = blockStore;
    this._documentStore = db;
    this._memberStore = memberStore as MemberStore;
    this._energyStore = energyStore as EnergyAccountStore;

    // BrightChainDb is the underlying database behind the documentStore adapter.
    // brightchainDatabaseInit() creates BrightChainDb and wraps it in
    // BrightChainDbDocumentStoreAdapter. We extract the raw BrightChainDb
    // for the IDatabasePlugin.database property (IDatabase contract).
    this._brightChainDb = this.extractBrightChainDb(db);
    this._connected = true;
  }

  /**
   * Disconnect and release all backend references.
   * Idempotent — calling when already disconnected completes without error.
   */
  async disconnect(): Promise<void> {
    if (!this._connected) {
      return;
    }

    if (this._brightChainDb?.isConnected()) {
      await this._brightChainDb.disconnect();
    }

    this._blockStore = null;
    this._brightChainDb = null;
    this._documentStore = null;
    this._memberStore = null;
    this._energyStore = null;
    this._authProvider = null;
    this._connected = false;
  }

  /**
   * Whether the database is currently connected.
   */
  isConnected(): boolean {
    return this._connected;
  }

  /**
   * Initialize the plugin after connection.
   * Creates the BrightChainAuthenticationProvider and stores it
   * as the authenticationProvider property.
   *
   * @param app - The application instance (must implement IBrightChainApplication).
   */
  async init(app: IApplication<TID>): Promise<void> {
    this._authProvider = new BrightChainAuthenticationProvider(
      app as IBrightChainApplication<TID>,
    );
  }

  /**
   * Stop the plugin. Delegates to disconnect() for cleanup.
   */
  async stop(): Promise<void> {
    await this.disconnect();
  }

  // ── Dev store lifecycle hooks ─────────────────────────────────────
  // These are the BrightChain equivalents of the Mongo plugin's
  // MongoMemoryReplSet provisioning. When environment.devDatabase is
  // truthy, the upstream Application.start() calls setupDevStore()
  // before connect() and initializeDevStore() after init().
  //
  // For BrightChain, "dev store" means using a MemoryBlockStore with
  // an InMemoryHeadRegistry — brightchainDatabaseInit() already handles
  // this when environment.blockStorePath is not set.

  /**
   * Provision an ephemeral dev/test block store.
   *
   * Called by Application.start() before connect() when
   * environment.devDatabase is truthy. BrightChain doesn't use
   * connection URIs — the memory vs disk decision is driven by
   * environment.blockStorePath (absent → memory). This hook
   * signals that we're in dev mode and returns an empty string
   * (no URI concept for block stores).
   */
  async setupDevStore(): Promise<string> {
    console.log(
      '[BrightChain] Dev database mode — using ephemeral MemoryBlockStore + InMemoryHeadRegistry.',
    );
    return '';
  }

  /**
   * Tear down the ephemeral dev/test block store.
   *
   * Called during stop() flow. Our disconnect() already releases
   * all in-memory references, so this is a no-op beyond logging.
   */
  async teardownDevStore(): Promise<void> {
    // disconnect() handles all cleanup — nothing extra needed
  }

  /**
   * Seed the dev database after connection.
   *
   * Called by Application.start() after connect() and init() when
   * environment.devDatabase is truthy. Currently a no-op — can be
   * extended to seed test users, blocks, etc. for local development.
   */
  async initializeDevStore(): Promise<unknown> {
    return undefined;
  }

  // ── Typed accessors ───────────────────────────────────────────────

  /**
   * The block store backing the BrightChain database.
   * @throws Error if the plugin is not connected.
   */
  get blockStore(): IBlockStore {
    if (!this._blockStore) {
      throw new Error(
        'BrightChainDatabasePlugin: cannot access "blockStore" — plugin is not connected. Call connect() first.',
      );
    }
    return this._blockStore;
  }

  /**
   * The BrightChainDb instance (implements IDatabase).
   * @throws Error if the plugin is not connected.
   */
  get brightChainDb(): BrightChainDb {
    if (!this._brightChainDb) {
      throw new Error(
        'BrightChainDatabasePlugin: cannot access "brightChainDb" — plugin is not connected. Call connect() first.',
      );
    }
    return this._brightChainDb;
  }

  /**
   * The document store (BrightChainDbDocumentStoreAdapter wrapping BrightChainDb).
   * @throws Error if the plugin is not connected.
   */
  get documentStore(): IDocumentStore {
    if (!this._documentStore) {
      throw new Error(
        'BrightChainDatabasePlugin: cannot access "documentStore" — plugin is not connected. Call connect() first.',
      );
    }
    return this._documentStore;
  }

  /**
   * The member store for user/member operations.
   * @throws Error if the plugin is not connected.
   */
  get memberStore(): MemberStore {
    if (!this._memberStore) {
      throw new Error(
        'BrightChainDatabasePlugin: cannot access "memberStore" — plugin is not connected. Call connect() first.',
      );
    }
    return this._memberStore;
  }

  /**
   * The energy account store for energy ledger operations.
   * @throws Error if the plugin is not connected.
   */
  get energyStore(): EnergyAccountStore {
    if (!this._energyStore) {
      throw new Error(
        'BrightChainDatabasePlugin: cannot access "energyStore" — plugin is not connected. Call connect() first.',
      );
    }
    return this._energyStore;
  }

  // ── Private helpers ───────────────────────────────────────────────

  /**
   * Extract the underlying BrightChainDb from the IDocumentStore adapter.
   *
   * brightchainDatabaseInit() wraps BrightChainDb in a
   * BrightChainDbDocumentStoreAdapter. We need the raw BrightChainDb
   * for the IDatabasePlugin.database property (IDatabase contract).
   *
   * We verify the adapter type via instanceof, then access the runtime
   * `db` property (TypeScript `private` is compile-time only).
   */
  private extractBrightChainDb(documentStore: IDocumentStore): BrightChainDb {
    if (!(documentStore instanceof BrightChainDbDocumentStoreAdapter)) {
      throw new Error(
        'BrightChainDatabasePlugin: expected BrightChainDbDocumentStoreAdapter from brightchainDatabaseInit().',
      );
    }
    // BrightChainDbDocumentStoreAdapter has a private `db: BrightChainDb` field.
    // TypeScript's `private` keyword is compile-time only — the property exists
    // at runtime. We use a structural interface to access it after the instanceof
    // guard confirms the concrete type.
    const adapterWithDb: { db: BrightChainDb } =
      documentStore as BrightChainDbDocumentStoreAdapter & {
        db: BrightChainDb;
      };
    if (!adapterWithDb.db) {
      throw new Error(
        'BrightChainDatabasePlugin: could not extract BrightChainDb from document store adapter.',
      );
    }
    return adapterWithDb.db;
  }
}
