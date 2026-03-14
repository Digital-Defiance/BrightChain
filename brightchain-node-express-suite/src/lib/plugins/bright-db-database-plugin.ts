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
import { EnergyAccountStore, MemberStore } from '@brightchain/brightchain-lib';
import type { BrightDb } from '@brightchain/db';
import { SecureString } from '@digitaldefiance/ecies-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type {
  IApplication,
  IAuthenticationProvider,
  IDatabasePlugin,
} from '@digitaldefiance/node-express-suite';
import type { IDatabase } from '@digitaldefiance/suite-core-lib';
import { brightchainDatabaseInit } from '../databaseInit';
import type { DocumentStore } from '../datastore/document-store';
import { BrightDbDocumentStoreAdapter } from '../datastore/bright-db-document-store-adapter';
import type { BrightDbEnvironment } from '../environment';
import type { IBrightDbApplication } from '../interfaces/bright-db-application';
import { BrightDbAuthService } from '../services/auth';
import { BrightDbAuthenticationProvider } from '../services/bright-db-authentication-provider';
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
  /** MemberStore created during init() — shared with the auth service. */
  protected _initMemberStore: MemberStore<TID> | null = null;

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
    this._initMemberStore = null;
    this._documentStoreAdapter = null;
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
   * NOTE: This method intentionally does NOT call initializeDevStore().
   * The upstream Application.start() in @digitaldefiance/node-express-suite
   * already calls initializeDevStore() explicitly after plugins.initAll(),
   * so calling it here would cause double-seeding (two sets of credentials
   * with different mnemonics, the first of which becomes stale).
   *
   * Subclasses override to create domain-specific auth providers and should
   * call `super.init(app)` for any base-level initialization.
   */
  async init(app: IApplication<TID>): Promise<void> {
    // Register core stores and auth service so controllers (e.g. directChallenge)
    // can find them via the service container without requiring the consuming
    // application to wire them manually.
    if (this._blockStore && this._brightDb) {
      // Create the authentication provider so the upstream Application can
      // wire it as application.authProvider (used by authenticate-token
      // middleware for /api/user/verify and other auth: true routes).
      this._authProvider = new BrightDbAuthenticationProvider<TID>(
        this._brightDb,
        app.environment.jwtSecret,
      );
      const memberStore = new MemberStore<TID>(this._blockStore, this._brightDb);
      const energyStore = new EnergyAccountStore();
      this._initMemberStore = memberStore;

      app.services.register('blockStore', () => this._blockStore);
      app.services.register('db', () => this._brightDb);
      app.services.register('memberStore', () => memberStore);
      app.services.register('energyStore', () => energyStore);

      // Register a base auth service so direct-challenge works out of the box.
      // Subclasses (e.g. BrightChainDatabasePlugin) override init() and may
      // register a more capable auth service.
      const authService = new BrightDbAuthService<TID>(
        app as IBrightDbApplication<TID>,
        memberStore as unknown as MemberStore,
        energyStore,
        app.environment.jwtSecret,
      );
      app.services.register('auth', () => authService);
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
   * After seeding, updates the environment's systemMnemonic so that
   * SystemUserService.getSystemUser() can reconstruct the system member
   * for request signing (e.g. requestDirectLogin challenge generation).
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
      this._initMemberStore ?? undefined,
    );
    printDevStoreResults(result);

    // Update the environment with the generated system credentials so that
    // SystemUserService.getSystemUser() can reconstruct the system member
    // from the mnemonic. Without this, the env still holds the original
    // (possibly empty) SYSTEM_MNEMONIC from the .env file, causing
    // "Invalid mnemonic" errors on requestDirectLogin.
    const systemMember = result.members.find((m) => m.name === 'system');

    if (systemMember?.mnemonic) {
      this._environment.setEnvironment(
        'systemMnemonic',
        new SecureString(systemMember.mnemonic),
      );
    }
    if (systemMember?.publicKeyHex) {
      this._environment.setEnvironment(
        'systemPublicKeyHex',
        systemMember.publicKeyHex,
      );
    }

    return result;
  }

  protected _documentStoreAdapter: BrightDbDocumentStoreAdapter | null = null;

  // ── IDatabasePlugin.db ─────────────────────────────────────────────

  /**
   * Raw database connection object (IDatabasePlugin.db).
   * The upstream Application.get db() delegates to this property so that
   * `application.db` returns a DocumentStore-compatible wrapper around BrightDb.
   */
  get db(): DocumentStore | undefined {
    if (!this._brightDb) return undefined;
    if (!this._documentStoreAdapter || this._documentStoreAdapter.brightDb !== this._brightDb) {
      this._documentStoreAdapter = new BrightDbDocumentStoreAdapter(this._brightDb);
    }
    return this._documentStoreAdapter;
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
