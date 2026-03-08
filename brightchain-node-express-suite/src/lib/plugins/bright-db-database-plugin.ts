/**
 * @fileoverview Generic BrightDB database plugin for the express-suite plugin architecture.
 *
 * Implements IDatabasePlugin<TID> to encapsulate the generic BrightDB database
 * lifecycle: block stores, BrightDb connection/disconnection, and typed accessors.
 * Domain-specific stores (MemberStore, EnergyAccountStore, etc.) are added by
 * subclasses in consuming libraries.
 *
 * @module plugins/bright-db-database-plugin
 */

import type { IBlockStore } from '@brightchain/brightchain-lib';
import type { BrightDb } from '@brightchain/db';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type {
  IApplication,
  IAuthenticationProvider,
  IDatabasePlugin,
} from '@digitaldefiance/node-express-suite';
import type { IDatabase } from '@digitaldefiance/suite-core-lib';
import { brightchainDatabaseInit } from '../databaseInit';
import type { BrightDbEnvironment } from '../environment';
import {
  seedDevStore,
  printDevStoreResults,
  type IDevStoreSeederResult,
} from '../services/dev-store-seeder';

export interface IBrightDbDatabasePluginOptions {
  skipAutoSeed?: boolean;
}

export class BrightDbDatabasePlugin<TID extends PlatformID>
  implements IDatabasePlugin<TID>
{
  public readonly name: string = 'brightdb';
  public readonly version: string = '1.0.0';

  protected readonly _environment: BrightDbEnvironment<TID>;
  protected readonly _skipAutoSeed: boolean;
  protected _connected = false;
  protected _blockStore: IBlockStore | null = null;
  protected _brightDb: BrightDb | null = null;
  protected _authProvider: IAuthenticationProvider<TID> | null = null;

  constructor(
    environment: BrightDbEnvironment<TID>,
    options: IBrightDbDatabasePluginOptions = {},
  ) {
    this._environment = environment;
    this._skipAutoSeed = options.skipAutoSeed ?? false;
  }

  // ── IDatabasePlugin contract ──────────────────────────────────────

  /**
   * The IDatabase instance this plugin manages.
   * BrightDb implements IDatabase directly, so no adapter is needed.
   * @throws Error if the plugin is not connected.
   */
  get database(): IDatabase {
    if (!this._brightDb) {
      throw new Error(
        'BrightDbDatabasePlugin: cannot access "database" — plugin is not connected. Call connect() first.',
      );
    }
    return this._brightDb as unknown as IDatabase;
  }

  /**
   * Authentication provider created during init().
   * Returns undefined before init() is called.
   */
  get authenticationProvider(): IAuthenticationProvider<TID> | undefined {
    return this._authProvider ?? undefined;
  }

  /**
   * Connect the BrightDB database stack.
   *
   * Calls brightchainDatabaseInit(environment) and stores the resulting
   * backend references (blockStore, BrightDb).
   *
   * @param _uri - Ignored; BrightDB uses environment-based configuration.
   * @throws Error if brightchainDatabaseInit() returns a failure result.
   */
  async connect(_uri?: string): Promise<void> {
    const initResult = await brightchainDatabaseInit(this._environment);
    if (!initResult.success || !initResult.backend) {
      throw new Error(
        `BrightDB database initialization failed: ${initResult.error ?? 'unknown error'}`,
      );
    }
    this._blockStore = initResult.backend.blockStore;
    this._brightDb = initResult.backend.db as BrightDb;
    this._connected = true;
  }

  /**
   * Disconnect and release all backend references.
   * Idempotent — calling when already disconnected completes without error.
   */
  async disconnect(): Promise<void> {
    if (!this._connected) return;
    this._blockStore = null;
    this._brightDb = null;
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
   *
   * When the environment has a `devDatabasePoolName` (i.e. `DEV_DATABASE` is set),
   * this method calls {@link initializeDevStore} to seed the dev database.
   * The upstream PluginManager only calls `init()` — it does not invoke
   * `initializeDevStore()` on its own — so we bridge the gap here.
   *
   * Subclasses override to create domain-specific auth providers and should
   * call `super.init(app)` (or invoke `initializeDevStore()` themselves).
   */
  async init(_app: IApplication<TID>): Promise<void> {
    // Seed the dev database when DEV_DATABASE is set.
    // Subclasses (e.g. BrightChainDatabasePlugin) override initializeDevStore()
    // with domain-specific seeding + credential printing.
    if (this._environment.devDatabasePoolName && !this._skipAutoSeed) {
      await this.initializeDevStore();
    }
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
   * BrightChain doesn't use connection URIs — returns empty string.
   */
  async setupDevStore(): Promise<string> {
    console.log('[BrightDB] Dev database mode — using ephemeral MemoryBlockStore.');
    return '';
  }

  /**
   * Tear down the ephemeral dev/test block store.
   * disconnect() handles all cleanup — nothing extra needed.
   */
  async teardownDevStore(): Promise<void> {
    // disconnect() handles cleanup
  }

  /**
   * Seed the dev database after connection.
   *
   * Creates three members (system, admin, member) using MemberStore and
   * prints their credentials to the console so the user can log in.
   *
   * Subclasses override with domain-specific seeding (e.g. full RBAC).
   */
  async initializeDevStore(): Promise<unknown> {
    if (!this._blockStore || !this._brightDb) {
      console.warn(
        '[BrightDB] initializeDevStore() called before connect() — skipping.',
      );
      return {};
    }

    const poolName =
      this._environment.devDatabasePoolName ??
      this._environment.memberPoolName;

    const result: IDevStoreSeederResult = await seedDevStore(
      this._blockStore,
      this._brightDb,
      poolName,
      this._environment.emailDomain,
    );
    printDevStoreResults(result);
    return result;
  }

  // ── Typed accessors ───────────────────────────────────────────────

  /**
   * The block store backing the BrightDB database.
   * @throws Error if the plugin is not connected.
   */
  get blockStore(): IBlockStore {
    if (!this._blockStore) {
      throw new Error(
        'BrightDbDatabasePlugin: cannot access "blockStore" — plugin is not connected. Call connect() first.',
      );
    }
    return this._blockStore;
  }

  /**
   * The BrightDb instance (implements IDatabase).
   * @throws Error if the plugin is not connected.
   */
  get brightDb(): BrightDb {
    if (!this._brightDb) {
      throw new Error(
        'BrightDbDatabasePlugin: cannot access "brightDb" — plugin is not connected. Call connect() first.',
      );
    }
    return this._brightDb;
  }
}
