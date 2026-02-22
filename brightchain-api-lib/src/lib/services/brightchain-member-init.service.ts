/**
 * @fileoverview BrightChainMemberInitService — initialises BrightChainDb and
 * persists system/admin/member users as IMemberIndexDocument entries.
 *
 * Design constraints:
 *  - NO imports from @digitaldefiance/node-express-suite (no Mongoose, no Express)
 *  - NO `any` / `unknown` in the public API surface
 *  - NO `as any` / `as unknown` casts
 *  - All writes go through BrightChainDb.withTransaction exclusively
 */

import type {
  BsonDocument,
  IBrightChainMemberEntry,
  IBrightChainRbacInitInput,
  IBrightChainServerInitResult,
  IBrightChainUserCredentials,
  IBrightChainUserInitEntry,
  ValidationFieldError,
} from '@brightchain/brightchain-lib';
import {
  BlockSize,
  IBrightChainBaseInitResult,
  IBrightChainInitResult,
  IBrightChainMemberInitInput,
  IMemberIndexDocument,
  MemberStatusType,
  MemoryBlockStore,
} from '@brightchain/brightchain-lib';
import {
  BrightChainDb,
  CBLIndex,
  validateDocument,
  ValidationError,
} from '@brightchain/db';
import { Member, MemberType } from '@digitaldefiance/ecies-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { GuidV4Buffer } from '@digitaldefiance/node-ecies-lib';
import {
  AccountStatus,
  IMnemonicBase,
  IRoleBase,
  IUserBase,
  IUserRoleBase,
} from '@digitaldefiance/suite-core-lib';
import { BrightChainApiStrings } from '../enumerations/brightChainApiStrings';
import { MemberIndexSchemaValidationError } from '../errors/memberIndexSchemaValidationError';
import { IBrightChainMemberInitConfig } from '../interfaces/member-init-config';
import type { CollectionSchema } from '../interfaces/storage/document-types';
import { MEMBER_INDEX_SCHEMA } from '../interfaces/storage/memberIndexSchema';
import {
  MNEMONIC_SCHEMA,
  MNEMONICS_COLLECTION,
} from '../interfaces/storage/mnemonicSchema';
import {
  ROLE_SCHEMA,
  ROLES_COLLECTION,
} from '../interfaces/storage/roleSchema';
import {
  USER_ROLE_SCHEMA,
  USER_ROLES_COLLECTION,
} from '../interfaces/storage/userRoleSchema';
import {
  USER_SCHEMA,
  USERS_COLLECTION,
} from '../interfaces/storage/userSchema';
import { DiskBlockStore } from '../stores/diskBlockStore';
export type { IBrightChainMemberInitConfig } from '../interfaces/member-init-config';

/** Well-known collection name for the member index. */
const MEMBER_INDEX_COLLECTION = 'member_index';

// ─── Block store helpers (not exported) ──────────────────────────────────────

function buildMemoryBlockStore(): MemoryBlockStore {
  return new MemoryBlockStore(BlockSize.Small);
}

function buildDiskBlockStore(
  storePath: string,
  blockSize: BlockSize = BlockSize.Small,
): DiskBlockStore {
  return new DiskBlockStore({ storePath, blockSize });
}

// ─── Validation helper (not exported) ────────────────────────────────────────

function validateDocumentSafe(
  doc: IMemberIndexDocument,
): ValidationFieldError[] {
  try {
    validateDocument(doc, MEMBER_INDEX_SCHEMA, MEMBER_INDEX_COLLECTION);
    return [];
  } catch (err) {
    if (err instanceof ValidationError) {
      return err.validationErrors;
    }
    throw err;
  }
}

// ─── Candidate entry builder (not exported) ───────────────────────────────────

function buildCandidateEntries(
  input: IBrightChainMemberInitInput<GuidV4Buffer>,
  poolId: string,
): IMemberIndexDocument[] {
  const now = new Date().toISOString();
  return [input.systemUser, input.adminUser, input.memberUser].map((user) => ({
    id: user.id.toString('hex'),
    // Zero-filled sentinel — replaced when the member's actual CBL blocks are written
    publicCBL: '0'.repeat(64),
    privateCBL: '0'.repeat(64),
    poolId,
    type: user.type,
    status: MemberStatusType.Active,
    lastUpdate: now,
    reputation: 0,
  }));
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Initialises a BrightChainDb instance and persists system/admin/member users
 * as IMemberIndexDocument entries in the member index collection.
 *
 * The service is idempotent: calling initialize() multiple times with the same
 * users will not create duplicate entries.
 */
export class BrightChainMemberInitService {
  private _db: BrightChainDb | undefined;
  private _memberCblIndex: CBLIndex | undefined;

  /**
   * The initialised BrightChainDb instance.
   * @throws Error if initialize() has not been called yet.
   */
  get db(): BrightChainDb {
    if (!this._db) {
      throw new Error(
        BrightChainApiStrings.BrightChainMemberInitServiceNotInitialized,
      );
    }
    return this._db;
  }

  /**
   * The member pool CBLIndex.
   * @throws Error if initialize() has not been called yet.
   */
  get memberCblIndex(): CBLIndex {
    if (!this._memberCblIndex) {
      throw new Error(
        BrightChainApiStrings.BrightChainMemberInitServiceNotInitialized,
      );
    }
    return this._memberCblIndex;
  }

  /**
   * Initialise the block store and BrightChainDb, then persist any missing
   * member index entries.
   *
   * Steps:
   *  1. Build the appropriate block store (disk or memory)
   *  2. Create and connect BrightChainDb (with PersistentHeadRegistry when disk)
   *  3. Create CBLIndex for the member pool
   *  4. Build candidate IMemberIndexDocument entries
   *  5. Validate all candidates against MEMBER_INDEX_SCHEMA (pre-transaction)
   *  6. Check which candidates are already present (idempotency)
   *  7. Insert missing entries in a single withTransaction call
   */
  async initialize(
    config: IBrightChainMemberInitConfig,
    input: IBrightChainMemberInitInput<GuidV4Buffer>,
  ): Promise<IBrightChainBaseInitResult<BrightChainDb>> {
    const useDisk = !!config.blockStorePath && !config.useMemoryStore;

    // Steps 1-3: only run once per service instance.
    if (!this._db) {
      const blockStore = useDisk
        ? buildDiskBlockStore(config.blockStorePath!, config.blockSize)
        : buildMemoryBlockStore();

      const db = new BrightChainDb(blockStore, {
        name: config.memberPoolName,
        poolId: config.memberPoolName,
        // PersistentHeadRegistry when disk — ensures heads survive restarts
        ...(useDisk ? { dataDir: config.blockStorePath } : {}),
      });
      // Load persisted head pointers from disk (no-op for InMemoryHeadRegistry)
      await db.getHeadRegistry().load();
      await db.connect();
      this._db = db;

      this._memberCblIndex = new CBLIndex(db, blockStore);
    }

    const db = this._db;

    // Step 4: build candidates
    const candidates = buildCandidateEntries(input, config.memberPoolName);

    // Step 5: validate before touching the DB
    for (const candidate of candidates) {
      const errors = validateDocumentSafe(candidate);
      if (errors.length > 0) {
        throw new MemberIndexSchemaValidationError(errors);
      }
    }

    // Step 6: idempotency check
    const collection = db.collection<IMemberIndexDocument>(
      MEMBER_INDEX_COLLECTION,
    );
    const existing = await collection.find({}).toArray();
    const existingIds = new Set(existing.map((e) => e.id));

    const toInsert = candidates.filter((c) => !existingIds.has(c.id));
    const skippedCount = candidates.length - toInsert.length;

    if (toInsert.length === 0) {
      return { alreadyInitialized: true, insertedCount: 0, skippedCount, db };
    }

    // Step 7: insert in a single transaction
    await db.withTransaction(async (session) => {
      for (const entry of toInsert) {
        await collection.insertOne(entry, { session });
      }
    });

    return {
      alreadyInitialized: false,
      insertedCount: toInsert.length,
      skippedCount,
      db,
    };
  }

  // ── RBAC initialization ─────────────────────────────────────────────────

  /**
   * Build a role document for insertion into the roles collection.
   * Returns a plain data object satisfying IRoleBase — no Document wrapper needed.
   */
  private static buildRoleDocument(
    user: IBrightChainUserInitEntry<GuidV4Buffer>,
    systemUserId: GuidV4Buffer,
    now: Date,
  ): IRoleBase<GuidV4Buffer, Date, string> {
    return {
      _id: user.roleId,
      name: user.roleName,
      admin: user.roleAdmin,
      member: user.roleMember,
      child: false,
      system: user.roleSystem,
      createdBy: systemUserId,
      updatedBy: systemUserId,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Build a user document for insertion into the users collection.
   * Returns a plain data object satisfying IUserBase — no Document wrapper needed.
   */
  private static buildUserDocument(
    user: IBrightChainUserInitEntry<GuidV4Buffer>,
    systemUserId: GuidV4Buffer,
    now: Date,
  ): IUserBase<GuidV4Buffer, Date, string, AccountStatus> {
    return {
      _id: user.fullId,
      username: user.username,
      email: user.email,
      publicKey: user.publicKeyHex,
      passwordWrappedPrivateKey: user.passwordWrappedPrivateKey,
      mnemonicRecovery: user.mnemonicRecovery,
      mnemonicId: user.mnemonicDocId,
      backupCodes: user.backupCodes,
      accountStatus: AccountStatus.Active,
      emailVerified: true,
      directChallenge: true,
      timezone: 'UTC',
      siteLanguage: LanguageCodes.EN_US,
      currency: 'USD',
      darkMode: false,
      createdBy: systemUserId,
      updatedBy: systemUserId,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Build a user-role junction document for insertion into the user-roles collection.
   * Returns a plain data object satisfying IUserRoleBase — no Document wrapper needed.
   */
  private static buildUserRoleDocument(
    user: IBrightChainUserInitEntry<GuidV4Buffer>,
    systemUserId: GuidV4Buffer,
    now: Date,
  ): IUserRoleBase<GuidV4Buffer, Date> {
    return {
      _id: user.userRoleId,
      userId: user.fullId,
      roleId: user.roleId,
      createdBy: systemUserId,
      updatedBy: systemUserId,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Build a mnemonic document for insertion into the mnemonics collection.
   * Returns a plain data object satisfying IMnemonicBase — no Document wrapper needed.
   */
  private static buildMnemonicDocument(
    user: IBrightChainUserInitEntry<GuidV4Buffer>,
  ): IMnemonicBase<GuidV4Buffer> {
    return {
      _id: user.mnemonicDocId,
      hmac: user.mnemonicHmac,
    };
  }

  /**
   * Serialize a typed RBAC document for storage/validation.
   * Converts GuidV4Buffer values to their canonical string form and
   * Date values to ISO strings so the document satisfies the all-string
   * collection schemas.
   */
  private static serializeForStorage<T extends object>(
    doc: T,
  ): Record<
    string,
    | string
    | boolean
    | number
    | Record<string, string | number>
    | Array<Record<string, string | number>>
  > {
    const result: Record<
      string,
      | string
      | boolean
      | number
      | Record<string, string | number>
      | Array<Record<string, string | number>>
    > = {};
    for (const [key, value] of Object.entries(doc)) {
      if (value instanceof Date) {
        result[key] = value.toISOString();
      } else if (Buffer.isBuffer(value) && 'asFullHexGuid' in value) {
        result[key] = (value as GuidV4Buffer).asFullHexGuid;
      } else if (Buffer.isBuffer(value)) {
        result[key] = value.toString('hex');
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Validate a document against a schema, returning field errors (if any).
   *
   * Uses a generic parameter so callers can pass any typed RBAC document
   * (IRoleBase, IUserBase, etc.) without needing an index signature.
   * Serializes the document before validation so GuidV4Buffer and Date
   * values are converted to the string types the schemas expect.
   */
  private static validateRbacDocument<T extends object>(
    doc: T,
    schema: CollectionSchema,
    collectionName: string,
  ): ValidationFieldError[] {
    try {
      validateDocument(
        BrightChainMemberInitService.serializeForStorage(doc) as BsonDocument,
        schema,
        collectionName,
      );
      return [];
    } catch (err) {
      if (err instanceof ValidationError) {
        return err.validationErrors;
      }
      throw err;
    }
  }

  /**
   * Initialise the block store and BrightChainDb, then persist member index
   * entries AND full RBAC documents (roles, users, user-roles, mnemonics).
   *
   * This is the full-featured init that mirrors the Mongoose
   * DatabaseInitializationService.initUserDbWithServices() flow.
   *
   * Steps:
   *  1-3. Same as initialize() — build store, create DB, create CBLIndex
   *  4. Build candidate member index entries
   *  5. Validate member index candidates
   *  6. Idempotency check for member index
   *  7. Insert missing member index entries
   *  8. Build and validate RBAC documents (roles, users, user-roles, mnemonics)
   *  9. Idempotency check for RBAC collections
   * 10. Insert missing RBAC documents in a single transaction
   */
  async initializeWithRbac(
    config: IBrightChainMemberInitConfig,
    input: IBrightChainRbacInitInput<GuidV4Buffer>,
  ): Promise<IBrightChainInitResult<GuidV4Buffer, BrightChainDb>> {
    // Steps 1-7: delegate to the base initialize() for member_index entries
    const memberInitInput: IBrightChainMemberInitInput<GuidV4Buffer> = {
      systemUser: { id: input.systemUser.id, type: input.systemUser.type },
      adminUser: { id: input.adminUser.id, type: input.adminUser.type },
      memberUser: { id: input.memberUser.id, type: input.memberUser.type },
    };
    const baseResult = await this.initialize(config, memberInitInput);
    const db = this.db;

    const now = new Date();
    const systemUserId = input.systemUser.fullId;
    const users = [input.systemUser, input.adminUser, input.memberUser];

    // Step 8: Build RBAC documents
    const roleDocuments = users.map((u) =>
      BrightChainMemberInitService.buildRoleDocument(u, systemUserId, now),
    );
    const userDocuments = users.map((u) =>
      BrightChainMemberInitService.buildUserDocument(u, systemUserId, now),
    );
    const userRoleDocuments = users.map((u) =>
      BrightChainMemberInitService.buildUserRoleDocument(u, systemUserId, now),
    );
    const mnemonicDocuments = users.map((u) =>
      BrightChainMemberInitService.buildMnemonicDocument(u),
    );

    // Validate all RBAC documents before touching the DB
    for (const doc of roleDocuments) {
      const errors = BrightChainMemberInitService.validateRbacDocument(
        doc,
        ROLE_SCHEMA,
        ROLES_COLLECTION,
      );
      if (errors.length > 0) {
        throw new MemberIndexSchemaValidationError(errors);
      }
    }
    for (const doc of userDocuments) {
      const errors = BrightChainMemberInitService.validateRbacDocument(
        doc,
        USER_SCHEMA,
        USERS_COLLECTION,
      );
      if (errors.length > 0) {
        throw new MemberIndexSchemaValidationError(errors);
      }
    }
    for (const doc of userRoleDocuments) {
      const errors = BrightChainMemberInitService.validateRbacDocument(
        doc,
        USER_ROLE_SCHEMA,
        USER_ROLES_COLLECTION,
      );
      if (errors.length > 0) {
        throw new MemberIndexSchemaValidationError(errors);
      }
    }
    for (const doc of mnemonicDocuments) {
      const errors = BrightChainMemberInitService.validateRbacDocument(
        doc,
        MNEMONIC_SCHEMA,
        MNEMONICS_COLLECTION,
      );
      if (errors.length > 0) {
        throw new MemberIndexSchemaValidationError(errors);
      }
    }

    // Step 9: Idempotency check for each RBAC collection
    const rolesCollection =
      db.collection<Record<string, unknown>>(ROLES_COLLECTION);
    const usersCollection =
      db.collection<Record<string, unknown>>(USERS_COLLECTION);
    const userRolesCollection = db.collection<Record<string, unknown>>(
      USER_ROLES_COLLECTION,
    );
    const mnemonicsCollection =
      db.collection<Record<string, unknown>>(MNEMONICS_COLLECTION);

    const existingRoles = await rolesCollection.find({}).toArray();
    const existingUsers = await usersCollection.find({}).toArray();
    const existingUserRoles = await userRolesCollection.find({}).toArray();
    const existingMnemonics = await mnemonicsCollection.find({}).toArray();

    const existingRoleIds = new Set(existingRoles.map((r) => String(r['_id'])));
    const existingUserIds = new Set(existingUsers.map((u) => String(u['_id'])));
    const existingUserRoleIds = new Set(
      existingUserRoles.map((ur) => String(ur['_id'])),
    );
    const existingMnemonicIds = new Set(
      existingMnemonics.map((m) => String(m['_id'])),
    );

    const rolesToInsert = roleDocuments.filter(
      (d) => !existingRoleIds.has(d._id.asFullHexGuid),
    );
    const usersToInsert = userDocuments.filter(
      (d) => !existingUserIds.has(d._id.asFullHexGuid),
    );
    const userRolesToInsert = userRoleDocuments.filter(
      (d) => !existingUserRoleIds.has(d._id.asFullHexGuid),
    );
    const mnemonicsToInsert = mnemonicDocuments.filter(
      (d) => !existingMnemonicIds.has(d._id.asFullHexGuid),
    );

    const totalToInsert =
      rolesToInsert.length +
      usersToInsert.length +
      userRolesToInsert.length +
      mnemonicsToInsert.length;

    // Step 10: Insert missing RBAC documents in a single transaction
    if (totalToInsert > 0) {
      await db.withTransaction(async (session) => {
        for (const doc of rolesToInsert) {
          await rolesCollection.insertOne(
            BrightChainMemberInitService.serializeForStorage(doc),
            { session },
          );
        }
        for (const doc of mnemonicsToInsert) {
          await mnemonicsCollection.insertOne(
            BrightChainMemberInitService.serializeForStorage(doc),
            { session },
          );
        }
        for (const doc of usersToInsert) {
          await usersCollection.insertOne(
            BrightChainMemberInitService.serializeForStorage(doc),
            { session },
          );
        }
        for (const doc of userRolesToInsert) {
          await userRolesCollection.insertOne(
            BrightChainMemberInitService.serializeForStorage(doc),
            { session },
          );
        }
      });
    }

    return {
      alreadyInitialized: baseResult.alreadyInitialized && totalToInsert === 0,
      insertedCount: baseResult.insertedCount + totalToInsert,
      skippedCount: baseResult.skippedCount,
      db,
      // System user flat fields
      systemRole: roleDocuments[0],
      systemUser: userDocuments[0],
      systemUserRole: userRoleDocuments[0],
      systemUsername: input.systemUser.username,
      systemEmail: input.systemUser.email,
      systemMnemonic: input.systemUser.plaintextMnemonic ?? '',
      systemPassword: input.systemUser.plaintextPassword ?? '',
      systemBackupCodes: input.systemUser.plaintextBackupCodes ?? [],
      systemMember: {} as Member<GuidV4Buffer>, // placeholder — caller creates Member
      // Admin user flat fields
      adminRole: roleDocuments[1],
      adminUser: userDocuments[1],
      adminUserRole: userRoleDocuments[1],
      adminUsername: input.adminUser.username,
      adminEmail: input.adminUser.email,
      adminMnemonic: input.adminUser.plaintextMnemonic ?? '',
      adminPassword: input.adminUser.plaintextPassword ?? '',
      adminBackupCodes: input.adminUser.plaintextBackupCodes ?? [],
      adminMember: {} as Member<GuidV4Buffer>, // placeholder
      // Member user flat fields
      memberRole: roleDocuments[2],
      memberUser: userDocuments[2],
      memberUserRole: userRoleDocuments[2],
      memberUsername: input.memberUser.username,
      memberEmail: input.memberUser.email,
      memberMnemonic: input.memberUser.plaintextMnemonic ?? '',
      memberPassword: input.memberUser.plaintextPassword ?? '',
      memberBackupCodes: input.memberUser.plaintextBackupCodes ?? [],
      memberMember: {} as Member<GuidV4Buffer>, // placeholder
    };
  }

  // ── Credential helpers ────────────────────────────────────────────────

  /**
   * Map an IBrightChainUserInitEntry to an IBrightChainUserCredentials bundle.
   * Plaintext fields default to empty string / empty array when absent.
   */
  private static buildUserCredentials(
    entry: IBrightChainUserInitEntry<GuidV4Buffer>,
  ): IBrightChainUserCredentials<GuidV4Buffer> {
    return {
      id: entry.id,
      fullId: entry.fullId,
      type: entry.type,
      username: entry.username,
      email: entry.email,
      mnemonic: entry.plaintextMnemonic ?? '',
      password: entry.plaintextPassword ?? '',
      backupCodes: entry.plaintextBackupCodes ?? [],
      publicKeyHex: entry.publicKeyHex,
      roleId: entry.roleId,
      userRoleId: entry.userRoleId,
    };
  }

  // ── Credential printing ─────────────────────────────────────────────────

  /**
   * Helper to resolve a display label for a MemberType.
   */
  private static memberTypeLabel(type: MemberType): string {
    switch (type) {
      case MemberType.System:
        return 'System';
      case MemberType.User:
        return 'User';
      default:
        return 'Unknown';
    }
  }

  /**
   * Print a single user's credentials block.
   */
  private static printUserCredentials(
    label: string,
    creds: IBrightChainUserCredentials<GuidV4Buffer>,
  ): void {
    const log = (msg: string) => console.log(msg);
    log(`  ${label} ID:           ${creds.id}`);
    log(`  ${label} Full ID:      ${creds.fullId}`);
    log(`  ${label} Type:         ${this.memberTypeLabel(creds.type)}`);
    log(`  ${label} Username:     ${creds.username}`);
    log(`  ${label} Email:        ${creds.email}`);
    log(`  ${label} Password:     ${creds.password}`);
    log(`  ${label} Mnemonic:     ${creds.mnemonic}`);
    if (creds.publicKeyHex) {
      log(`  ${label} Public Key:   ${creds.publicKeyHex}`);
    }
    if (creds.roleId) {
      log(`  ${label} Role ID:      ${creds.roleId}`);
    }
    if (creds.userRoleId) {
      log(`  ${label} User Role ID: ${creds.userRoleId}`);
    }
    log(`  ${label} Backup Codes: ${creds.backupCodes.join(', ')}`);
    log('');
  }

  /**
   * Print a formatted summary of the BrightChain server init results,
   * including full credentials for each user.
   */
  static printServerInitResults(
    result: IBrightChainServerInitResult<GuidV4Buffer, BrightChainDb>,
    config: IBrightChainMemberInitConfig,
  ): void {
    const log = (msg: string) => console.log(msg);

    log('');
    log('=== BrightChain Account Credentials ===');
    log('');
    log(`  Pool:           ${config.memberPoolName}`);
    log(
      `  Block Store:    ${config.blockStorePath ?? 'in-memory (ephemeral)'}`,
    );
    log(`  Already Init:   ${result.alreadyInitialized}`);
    log(`  Inserted:       ${result.insertedCount}`);
    log(`  Skipped:        ${result.skippedCount}`);
    log('');

    this.printUserCredentials('System', result.system);
    this.printUserCredentials('Admin', result.admin);
    this.printUserCredentials('Member', result.member);

    log('=== End BrightChain Account Credentials ===');
    log('');
  }

  /**
   * Print a formatted summary of the BrightChain member init results.
   * Kept for backward compatibility — delegates to printServerInitResults
   * when a full result is available, otherwise prints minimal info.
   */
  static printInitResults(
    input: IBrightChainMemberInitInput<GuidV4Buffer>,
    result: IBrightChainInitResult<GuidV4Buffer, BrightChainDb>,
    config: IBrightChainMemberInitConfig,
  ): void {
    const log = (msg: string) => console.log(msg);

    log('');
    log('=== BrightChain Member Initialization Results ===');
    log('');
    log(`  Pool:           ${config.memberPoolName}`);
    log(
      `  Block Store:    ${config.blockStorePath ?? 'in-memory (ephemeral)'}`,
    );
    log(`  Already Init:   ${result.alreadyInitialized}`);
    log(`  Inserted:       ${result.insertedCount}`);
    log(`  Skipped:        ${result.skippedCount}`);
    log('');

    const entries: Array<{
      label: string;
      entry: IBrightChainMemberEntry<GuidV4Buffer>;
    }> = [
      { label: 'System', entry: input.systemUser },
      { label: 'Admin', entry: input.adminUser },
      { label: 'Member', entry: input.memberUser },
    ];

    for (const { label, entry } of entries) {
      log(`  ${label} ID:       ${entry.id}`);
      log(`  ${label} Type:     ${this.memberTypeLabel(entry.type)}`);
      log('');
    }

    log('=== End BrightChain Member Initialization ===');
    log('');
  }

  /**
   * Combine a basic init result with user credentials to produce the full
   * IBrightChainServerInitResult. This keeps the initialize() method lean
   * while allowing callers to enrich the result with environment credentials.
   */
  static buildServerInitResult(
    baseResult: IBrightChainInitResult<GuidV4Buffer, BrightChainDb>,
    credentials: {
      system: IBrightChainUserCredentials<GuidV4Buffer>;
      admin: IBrightChainUserCredentials<GuidV4Buffer>;
      member: IBrightChainUserCredentials<GuidV4Buffer>;
    },
  ): IBrightChainServerInitResult<GuidV4Buffer, BrightChainDb> {
    return {
      ...baseResult,
      system: credentials.system,
      admin: credentials.admin,
      member: credentials.member,
    };
  }

  /**
   * Format the full server init result as .env variable lines.
   * Outputs all credential fields matching the .env.example layout.
   */
  static formatDotEnv(credentials: {
    system: IBrightChainUserCredentials<GuidV4Buffer>;
    admin: IBrightChainUserCredentials<GuidV4Buffer>;
    member: IBrightChainUserCredentials<GuidV4Buffer>;
  }): string {
    const { admin, member, system } = credentials;
    const lines: string[] = [
      `ADMIN_ID="${admin.fullId}"`,
      `ADMIN_MNEMONIC="${admin.mnemonic}"`,
      `ADMIN_ROLE_ID="${admin.roleId ?? ''}"`,
      `ADMIN_USER_ROLE_ID="${admin.userRoleId ?? ''}"`,
      `ADMIN_PASSWORD="${admin.password}"`,
      '',
      `MEMBER_ID="${member.fullId}"`,
      `MEMBER_MNEMONIC="${member.mnemonic}"`,
      `MEMBER_ROLE_ID="${member.roleId ?? ''}"`,
      `MEMBER_PASSWORD="${member.password}"`,
      `MEMBER_USER_ROLE_ID="${member.userRoleId ?? ''}"`,
      '',
      '# System credentials used to sign system messages',
      `SYSTEM_ID="${system.fullId}"`,
      `SYSTEM_MNEMONIC="${system.mnemonic}"`,
      `SYSTEM_PUBLIC_KEY="${system.publicKeyHex ?? ''}"`,
      `SYSTEM_ROLE_ID="${system.roleId ?? ''}"`,
      `SYSTEM_PASSWORD="${system.password}"`,
      `SYSTEM_USER_ROLE_ID="${system.userRoleId ?? ''}"`,
    ];
    return lines.join('\n');
  }
}
