/**
 * @fileoverview BrightChain database plugin for the express-suite plugin architecture.
 *
 * Extends BrightDbDatabasePlugin from @brightchain/node-express-suite with
 * domain-specific store initialization (MemberStore, EnergyAccountStore),
 * RBAC seeding, and the BrightChain authentication provider.
 *
 * @module plugins/brightchain-database-plugin
 */

import type {
  IBlockStore,
  IBrightChainInitResult,
  IBrightChainMemberInitInput,
  IMemberIndexDocument,
} from '@brightchain/brightchain-lib';
import {
  Checksum,
  EnergyAccountStore,
  MemberStatusType,
  MemberStore,
} from '@brightchain/brightchain-lib';
import type { BrightDb } from '@brightchain/db';
import {
  BrightDbDatabasePlugin,
  type IBrightDbDatabasePluginOptions,
} from '@brightchain/node-express-suite';
import { MemberType } from '@digitaldefiance/ecies-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { getEnhancedNodeIdProvider } from '@digitaldefiance/node-ecies-lib';
import type { IApplication } from '@digitaldefiance/node-express-suite';
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
 * BrightChain-specific database plugin options.
 * Extends the generic BrightDB plugin options.
 */
export interface IBrightChainDatabasePluginOptions
  extends IBrightDbDatabasePluginOptions {
  /**
   * When true, skip the automatic production seed in connect().
   * Use this when the caller (e.g. brightchain-inituserdb) will perform
   * its own controlled seeding after connect() returns.
   */
  skipAutoSeed?: boolean;
}

/**
 * BrightChain database plugin extending BrightDbDatabasePlugin.
 *
 * Adds domain-specific functionality on top of the generic BrightDB lifecycle:
 * - MemberStore and EnergyAccountStore initialization
 * - RBAC seeding (seedWithRbac, seedProductionIfEmpty)
 * - BrightChainAuthenticationProvider creation
 * - Domain-specific dev store initialization
 */
export class BrightChainDatabasePlugin<TID extends PlatformID>
  extends BrightDbDatabasePlugin<TID>
{
  public override readonly name = 'brightchain-database';

  private _memberStore: MemberStore | null = null;
  private _energyStore: EnergyAccountStore | null = null;
  /** Stored result from the most recent seedWithRbac() / initializeDevStore() call. */
  private _lastInitResult: IBrightChainInitResult<TID, BrightDb> | null = null;

  constructor(
    environment: Environment<TID>,
    options: IBrightChainDatabasePluginOptions = {},
  ) {
    super(environment, options);
  }

  // ── Overrides ─────────────────────────────────────────────────────

  /**
   * The result from the most recent seedWithRbac() / initializeDevStore() call.
   * Useful in tests to retrieve credentials (e.g. memberMnemonic) without
   * calling seedWithRbac() a second time (which would generate new random keys).
   */
  get lastInitResult(): IBrightChainInitResult<TID, BrightDb> | null {
    return this._lastInitResult;
  }

  /**
   * Connect the BrightChain database stack.
   *
   * Uses the domain-specific brightchainDatabaseInit (from api-lib) which
   * wraps the generic init and adds MemberStore + EnergyAccountStore via
   * the modelRegistrations callback.
   *
   * Does NOT call super.connect() because the domain init handles everything.
   *
   * @param _uri - Ignored; BrightChain uses environment-based configuration.
   * @throws Error if brightchainDatabaseInit() returns a failure result.
   */
  override async connect(_uri?: string): Promise<void> {
    const initResult = await brightchainDatabaseInit(
      this._environment as Environment<TID>,
    );

    if (!initResult.success || !initResult.backend) {
      throw new Error(
        `BrightChain database initialization failed: ${initResult.error ?? 'unknown error'}`,
      );
    }

    const { blockStore, db, memberStore, energyStore } = initResult.backend;

    this._blockStore = blockStore;
    this._brightDb = db as BrightDb;
    this._memberStore = memberStore as MemberStore;
    this._energyStore = energyStore as EnergyAccountStore;
    this._connected = true;

    // Give MemberStore a DB reference so queryIndex() can do O(1) DB-backed
    // lookups instead of requiring the full member list loaded into memory.
    (this._memberStore as MemberStore<TID>).setDb(this._brightDb);

    // In production mode (no dev pool), auto-seed if the database is empty —
    // unless the caller has opted out (e.g. brightchain-inituserdb, which
    // performs its own controlled seeding after connect() returns).
    if (!this._environment.devDatabasePoolName && !this._skipAutoSeed) {
      await this.seedProductionIfEmpty();
    }
  }

  /**
   * Disconnect and release all backend references (including domain stores).
   * Idempotent — calling when already disconnected completes without error.
   */
  override async disconnect(): Promise<void> {
    if (!this._connected) {
      return;
    }

    this._memberStore = null;
    this._energyStore = null;
    await super.disconnect();
  }

  /**
   * Initialize the plugin after connection.
   * Creates the BrightChainAuthenticationProvider and stores it
   * as the authenticationProvider property.
   *
   * @param app - The application instance (must implement IBrightChainApplication).
   */
  override async init(app: IApplication<TID>): Promise<void> {
    this._authProvider = new BrightChainAuthenticationProvider(
      app as IBrightChainApplication<TID>,
    );
    // Delegate to base class — triggers initializeDevStore() in dev mode
    await super.init(app);
  }

  // ── Dev store lifecycle hooks ─────────────────────────────────────

  /**
   * Provision an ephemeral dev/test block store.
   */
  override async setupDevStore(): Promise<string> {
    console.log(
      '[BrightChain] Dev database mode — using ephemeral MemoryBlockStore + InMemoryHeadRegistry.',
    );
    return '';
  }

  /**
   * Seed the dev database after connection.
   *
   * Uses RbacInputBuilder to generate ephemeral credentials and calls
   * initializeWithRbac() for a fully functional dev database.
   */
  override async initializeDevStore(): Promise<IBrightChainInitResult<TID, BrightDb>> {
    const result = await this.seedWithRbac(true);
    // After seeding, update the MemberStore's DB reference so queryIndex()
    // can find the freshly seeded members via DB-backed lookups.
    if (this._memberStore && this._brightDb) {
      (this._memberStore as MemberStore<TID>).setDb(this._brightDb);
    }
    return result;
  }

  // ── Domain-specific typed accessors ───────────────────────────────

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

  // ── Domain-specific helpers ───────────────────────────────────────

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
    const env = this._environment as Environment<TID>;
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
    const env = this._environment as Environment<TID>;
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
    const env = this._environment as Environment<TID>;

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
        email: env.systemEmail.email,
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
        email: env.adminEmail.email,
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
        email: env.memberEmail.email,
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
    const db = this.brightDb;
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
   * the service created, so plugin.brightDb reflects the seeded data.
   *
   * @param printCredentials - Whether to print credentials to console.
   * @returns The full init result from initializeWithRbac().
   */
  async seedWithRbac(
    printCredentials: boolean,
  ): Promise<IBrightChainInitResult<TID, BrightDb>> {
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

      // The service creates its own BrightDb internally. Update our
      // reference so plugin.brightDb always points to the db that
      // actually holds the seeded data.
      this._brightDb = initResult.db;

      // Populate MemberStore in-memory indexes for seeded users.
      // The init service writes directly to the DB member_index collection
      // but never calls MemberStore.updateIndex(), leaving the in-memory
      // nameIndex/emailIndex empty. Without this, queryIndex({ name: ... })
      // would miss seeded users unless the DB fallback fires.
      if (this._memberStore) {
        const ms = this._memberStore as MemberStore<TID>;
        const seededUsers = [
          {
            entry: buildResult.rbacInput.systemUser,
            result: initResult,
            prefix: 'system' as const,
          },
          {
            entry: buildResult.rbacInput.adminUser,
            result: initResult,
            prefix: 'admin' as const,
          },
          {
            entry: buildResult.rbacInput.memberUser,
            result: initResult,
            prefix: 'member' as const,
          },
        ];
        for (const { entry } of seededUsers) {
          // Build a sentinel Checksum for seeded users (no real CBL blocks)
          const sentinelHex = '0'.repeat(128);
          const sentinelChecksum = Checksum.fromHex(sentinelHex);
          await ms.updateIndex({
            id: entry.id,
            publicCBL: sentinelChecksum,
            privateCBL: sentinelChecksum,
            type: entry.type,
            status: MemberStatusType.Active,
            lastUpdate: new Date(),
            reputation: 0,
            name: entry.username,
            email: entry.email,
          });
        }
        // Re-attach DB reference (seedWithRbac replaces _brightDb)
        ms.setDb(this._brightDb);
      }

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

      this._lastInitResult = initResult;
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
