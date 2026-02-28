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
  IBrightChainInitResult,
  IBrightChainMemberInitInput,
  IMemberIndexDocument,
} from '@brightchain/brightchain-lib';
import { EnergyAccountStore, MemberStore } from '@brightchain/brightchain-lib';
import type { BrightChainDb } from '@brightchain/db';
import { MemberType } from '@digitaldefiance/ecies-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { getEnhancedNodeIdProvider } from '@digitaldefiance/node-ecies-lib';
import type {
  IApplication,
  IAuthenticationProvider,
  IDatabasePlugin,
} from '@digitaldefiance/node-express-suite';
import type { IDatabase } from '@digitaldefiance/suite-core-lib';
import { randomBytes } from 'crypto';
import { brightchainDatabaseInit } from '../databaseInit';
import type { Environment } from '../environment';
import type { IBrightChainApplication } from '../interfaces/application';
import type { IBrightChainMemberInitConfig } from '../interfaces/member-init-config';
import { BrightChainMemberInitService } from '../services';
import { BrightChainAuthenticationProvider } from '../services/brightchain-authentication-provider';
import {
  type IRbacUserInput,
  RbacInputBuilder,
} from '../services/rbac-input-builder';

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

    // In production mode (no dev pool), auto-seed if the database is empty.
    if (!this._environment.devDatabasePoolName) {
      await this.seedProductionIfEmpty();
    }
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
   * environment.devDatabase is truthy. Uses RbacInputBuilder to generate
   * ephemeral credentials and calls initializeWithRbac() for a fully
   * functional dev database. Prints credentials so dev users can log in.
   */
  async initializeDevStore(): Promise<
    IBrightChainInitResult<TID, BrightChainDb>
  > {
    return this.seedWithRbac(true);
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
   * Build IBrightChainMemberInitInput from the environment.
   * Returns {systemUser, adminUser, memberUser} shaped for BrightChainMemberInitService.
   *
   * @throws Error if any of the required user IDs are not set.
   */
  buildMemberInitInput(): IBrightChainMemberInitInput<TID> {
    const env = this._environment;
    if (!env.systemId || !env.adminId || !env.memberId) {
      throw new Error(
        'BrightChainDatabasePlugin: cannot build member init input — one or more user IDs ' +
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
   * Build IRbacUserInput entries for all three users from the environment.
   *
   * Reads IDs, mnemonics, passwords, role IDs, and usernames/emails from
   * the environment. Generates GUIDs for any missing role/user-role IDs.
   *
   * @throws Error if any of the required user IDs are not set.
   */
  buildRbacUserInputs(): {
    system: IRbacUserInput<TID>;
    admin: IRbacUserInput<TID>;
    member: IRbacUserInput<TID>;
  } {
    const env = this._environment;

    if (!env.systemId || !env.adminId || !env.memberId) {
      throw new Error(
        'BrightChainDatabasePlugin: cannot seed members — one or more user IDs ' +
          '(systemId, adminId, memberId) are not set in the environment.',
      );
    }

    const idProvider = getEnhancedNodeIdProvider<TID>();
    const generateId = (): TID =>
      idProvider.fromBytes(idProvider.generate()) as TID;

    return {
      system: {
        id: env.systemId,
        fullId: env.systemId,
        type: MemberType.System,
        username: env.get('SYSTEM_USERNAME') ?? 'system',
        email: env.get('SYSTEM_EMAIL') ?? env.emailSender,
        roleId: env.systemRoleId ?? generateId(),
        userRoleId: env.systemUserRoleId ?? generateId(),
        roleName: 'System',
        roleAdmin: true,
        roleMember: true,
        roleSystem: true,
        mnemonic: env.systemMnemonic?.hasValue ? env.systemMnemonic : undefined,
        password: env.systemPassword?.hasValue ? env.systemPassword : undefined,
      },
      admin: {
        id: env.adminId,
        fullId: env.adminId,
        type: MemberType.User,
        username: env.get('ADMIN_USERNAME') ?? 'admin',
        email: env.get('ADMIN_EMAIL') ?? env.emailSender,
        roleId: env.adminRoleId ?? generateId(),
        userRoleId: env.adminUserRoleId ?? generateId(),
        roleName: 'Admin',
        roleAdmin: true,
        roleMember: true,
        roleSystem: false,
        mnemonic: env.adminMnemonic?.hasValue ? env.adminMnemonic : undefined,
        password: env.adminPassword?.hasValue ? env.adminPassword : undefined,
      },
      member: {
        id: env.memberId,
        fullId: env.memberId,
        type: MemberType.User,
        username: env.get('MEMBER_USERNAME') ?? 'member',
        email: env.get('MEMBER_EMAIL') ?? env.emailSender,
        roleId: env.memberRoleId ?? generateId(),
        userRoleId: env.memberUserRoleId ?? generateId(),
        roleName: 'Member',
        roleAdmin: false,
        roleMember: true,
        roleSystem: false,
        mnemonic: env.memberMnemonic?.hasValue ? env.memberMnemonic : undefined,
        password: env.memberPassword?.hasValue ? env.memberPassword : undefined,
      },
    };
  }

  /**
   * Check whether the database is empty (no member_index entries).
   * Used to guard against auto-seeding a production database that was
   * already initialized by brightchain-inituserdb.
   */
  async isDatabaseEmpty(): Promise<boolean> {
    const db = this.brightChainDb;
    const collection = db.collection<IMemberIndexDocument>('member_index');
    const existing = await collection.find({}).limit(1).toArray();
    return existing.length === 0;
  }

  /**
   * Full RBAC seeding using RbacInputBuilder + initializeWithRbac().
   *
   * Generates key material, builds all RBAC documents, and inserts them.
   * When `printCredentials` is true, prints the full credential summary
   * (for dev/ephemeral mode so users can log in via the frontend).
   *
   * After seeding, updates the plugin's internal db reference to the one
   * the service created, so plugin.brightChainDb reflects the seeded data.
   *
   * @param printCredentials - Whether to print credentials to console.
   * @returns The full init result from initializeWithRbac().
   */
  async seedWithRbac(
    printCredentials: boolean,
  ): Promise<IBrightChainInitResult<TID, BrightChainDb>> {
    const config = this.buildMemberInitConfig();
    const userInputs = this.buildRbacUserInputs();

    const hmacSecretHex =
      this._environment.get('MNEMONIC_HMAC_SECRET') ??
      randomBytes(32).toString('hex');

    const builder = new RbacInputBuilder<TID>({ hmacSecretHex });
    const buildResult = await builder.buildAll(userInputs);

    try {
      const service = new BrightChainMemberInitService<TID>();
      const initResult = await service.initializeWithRbac(
        config,
        buildResult.rbacInput,
      );

      // The service creates its own BrightChainDb internally. Update our
      // reference so plugin.brightChainDb always points to the db that
      // actually holds the seeded data.
      this._brightChainDb = initResult.db;

      if (printCredentials) {
        const serverResult =
          BrightChainMemberInitService.buildServerInitResult<TID>(
            initResult,
            buildResult.credentials,
          );
        BrightChainMemberInitService.printServerInitResults<TID>(
          serverResult,
          config,
          getEnhancedNodeIdProvider<TID>(),
        );
      }

      return initResult;
    } finally {
      RbacInputBuilder.disposeMembers(buildResult.members);
    }
  }

  /**
   * Seed a production (disk-backed) database ONLY if it is completely empty.
   *
   * If the database already has member_index entries, this is a no-op —
   * the assumption is that brightchain-inituserdb was already run.
   * Prints credentials when seeding occurs so the operator can capture them.
   */
  async seedProductionIfEmpty(): Promise<void> {
    const empty = await this.isDatabaseEmpty();
    if (!empty) {
      console.log(
        '[BrightChain] Production database already initialized — skipping auto-seed.',
      );
      return;
    }

    console.log(
      '[BrightChain] Production database is empty — seeding with full RBAC...',
    );
    await this.seedWithRbac(true);
  }
}
