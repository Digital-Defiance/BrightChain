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

import type {
  IBlockStore,
  IBrightChainBaseInitResult,
  IBrightChainMemberInitInput,
  IMemberIndexDocument,
} from '@brightchain/brightchain-lib';
import {
  EnergyAccountStore,
  MemberStatusType,
  MemberStore,
} from '@brightchain/brightchain-lib';
import type { BrightChainDb } from '@brightchain/db';
import { MemberType } from '@digitaldefiance/ecies-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type {
  IApplication,
  IAuthenticationProvider,
  IDatabasePlugin,
} from '@digitaldefiance/node-express-suite';
import type { IDatabase } from '@digitaldefiance/suite-core-lib';
import { brightchainDatabaseInit } from '../databaseInit';
import type { Environment } from '../environment';
import type { IBrightChainApplication } from '../interfaces/application';
import type { IBrightChainMemberInitConfig } from '../interfaces/member-init-config';
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
 * Typed accessors (blockStore, memberStore, energyStore, brightChainDb)
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
    return this._brightChainDb as unknown as IDatabase;
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
   * backend references (blockStore, BrightChainDb, memberStore, energyStore).
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
    this._brightChainDb = db as BrightChainDb;
    this._memberStore = memberStore as MemberStore;
    this._energyStore = energyStore as EnergyAccountStore;
    this._connected = true;

    // Seed system/admin/member users into the database.
    // Runs for both dev and production modes; idempotent if called again
    // via initializeDevStore().
    const config = this.buildMemberInitConfig();
    await this.seedMembers(config);
  }

  /**
   * Disconnect and release all backend references.
   * Idempotent — calling when already disconnected completes without error.
   */
  async disconnect(): Promise<void> {
    if (!this._connected) {
      return;
    }

    this._blockStore = null;
    this._brightChainDb = null;
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
   * environment.devDatabase is truthy. Invokes BrightChainMemberInitService
   * to persist system/admin/member seed users into the in-memory database.
   */
  async initializeDevStore(): Promise<
    IBrightChainBaseInitResult<BrightChainDb, TID>
  > {
    const config = this.buildMemberInitConfig();
    return this.seedMembers(config);
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
   * Build an IBrightChainMemberInitConfig from the environment.
   *
   * Derives `useMemoryStore` from `!!environment.devDatabasePoolName` by default.
   * When a dev pool name is set the store is in-memory; otherwise disk-backed.
   *
   * @param useMemoryStore - Optional override. Defaults to `!!environment.devDatabasePoolName`.
   */
  buildMemberInitConfig(
    useMemoryStore: boolean = !!this._environment.devDatabasePoolName,
  ): IBrightChainMemberInitConfig {
    const env = this._environment;
    return {
      memberPoolName: useMemoryStore
        ? (env.devDatabasePoolName ?? env.memberPoolName)
        : env.memberPoolName,
      blockStorePath: env.blockStorePath,
      useMemoryStore,
      blockSize: env.blockStoreBlockSize,
    };
  }

  /**
   * Build an IBrightChainMemberInitInput from the environment's
   * system/admin/member IDs and their associated member types.
   *
   * @throws Error if any of the required IDs are not set in the environment.
   */
  buildMemberInitInput(): IBrightChainMemberInitInput<TID> {
    const env = this._environment;

    if (!env.systemId || !env.adminId || !env.memberId) {
      throw new Error(
        'BrightChainDatabasePlugin: cannot seed members — one or more user IDs ' +
          '(systemId, adminId, memberId) are not set in the environment.',
      );
    }

    return {
      systemUser: { id: env.systemId, type: MemberType.System },
      adminUser: { id: env.adminId, type: MemberType.User },
      memberUser: { id: env.memberId, type: MemberType.User },
    };
  }

  /**
   * Seed system/admin/member users into the database using
   * BrightChainMemberInitService.
   *
   * Reusable by both dev mode (initializeDevStore) and production mode paths.
   *
   * @param config - The member init configuration.
   * @returns The init result from BrightChainMemberInitService.
   */
  async seedMembers(
    config: IBrightChainMemberInitConfig,
  ): Promise<IBrightChainBaseInitResult<BrightChainDb, TID>> {
    const input = this.buildMemberInitInput();
    const db = this.brightChainDb;

    // Build candidate member index documents
    const now = new Date().toISOString();
    const candidates: IMemberIndexDocument[] = [
      input.systemUser,
      input.adminUser,
      input.memberUser,
    ].map((user) => ({
      id: user.id.toString('hex'),
      publicCBL: '0'.repeat(64),
      privateCBL: '0'.repeat(64),
      poolId: config.memberPoolName,
      type: user.type,
      status: MemberStatusType.Active,
      lastUpdate: now,
      reputation: 0,
    }));

    // Idempotency check
    const collection = db.collection<IMemberIndexDocument>('member_index');
    const existing = await collection.find({}).toArray();
    const existingIds = new Set(existing.map((e) => e.id));
    const toInsert = candidates.filter((c) => !existingIds.has(c.id));
    const skippedCount = candidates.length - toInsert.length;

    if (toInsert.length === 0) {
      console.log(
        `[BrightChain] Member seeding: already initialized (${skippedCount} skipped).`,
      );
      return {
        input,
        alreadyInitialized: true,
        insertedCount: 0,
        skippedCount,
        db,
      };
    }

    // Insert missing entries
    await db.withTransaction(async (session) => {
      for (const entry of toInsert) {
        await collection.insertOne(entry, { session });
      }
    });

    console.log(
      `[BrightChain] Member seeding: ${toInsert.length} inserted, ${skippedCount} skipped.`,
    );

    return {
      input,
      alreadyInitialized: false,
      insertedCount: toInsert.length,
      skippedCount,
      db,
    };
  }
}
