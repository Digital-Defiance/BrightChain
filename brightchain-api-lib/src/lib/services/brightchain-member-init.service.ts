/**
 * @fileoverview BrightChainMemberInitService — initialises BrightDB and
 * persists system/admin/member users as IMemberIndexDocument entries.
 *
 * Design constraints:
 *  - NO imports from @digitaldefiance/node-express-suite (no Mongoose, no Express)
 *  - NO `any` / `unknown` in the public API surface
 *  - NO `as any` / `as unknown` casts
 *  - All writes go through BrightDb.withTransaction exclusively
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
  getBrightChainIdProvider,
  IBrightChainBaseInitResult,
  IBrightChainInitResult,
  IBrightChainMemberInitInput,
  IMemberIndexDocument,
  MemberStatusType,
  MemoryBlockStore,
} from '@brightchain/brightchain-lib';
import {
  BrightDb,
  CBLIndex,
  HeadRegistry,
  validateDocument,
  ValidationError,
} from '@brightchain/db';
import type { IIdProvider } from '@digitaldefiance/ecies-lib';
import { Member, MemberType } from '@digitaldefiance/ecies-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  AccountStatus,
  IMnemonicBase,
  IRoleBase,
  IUserBase,
  IUserRoleBase,
} from '@digitaldefiance/suite-core-lib';
import { BrightChainApiStrings } from '../enumerations/brightChainApiStrings';
import { MemberIndexSchemaValidationError } from '../errors/memberIndexSchemaValidationError';
import {
  createMnemonicHydrationSchema,
  createRoleHydrationSchema,
  createUserHydrationSchema,
  createUserRoleHydrationSchema,
} from '../hydration';
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
import type {
  IStoredMnemonic,
  IStoredRole,
  IStoredUser,
  IStoredUserRole,
} from '../interfaces/storage/storedDocumentTypes';
import {
  USER_ROLE_SCHEMA,
  USER_ROLES_COLLECTION,
} from '../interfaces/storage/userRoleSchema';
import {
  USER_SCHEMA,
  USERS_COLLECTION,
} from '../interfaces/storage/userSchema';
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore';
import { serializeForStorage as serializeForStorageUtil } from '../utils/serialization';
export type { IBrightChainMemberInitConfig } from '../interfaces/member-init-config';

/** Well-known collection name for the member index. */
const MEMBER_INDEX_COLLECTION = 'member_index';

// ─── Block store helpers (not exported) ──────────────────────────────────────

function buildMemoryBlockStore(
  blockSize: BlockSize = BlockSize.Medium,
): MemoryBlockStore {
  return new MemoryBlockStore(blockSize);
}

function buildDiskBlockStore(
  storePath: string,
  blockSize: BlockSize = BlockSize.Medium,
): DiskBlockAsyncStore {
  return new DiskBlockAsyncStore({ storePath, blockSize });
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

function buildCandidateEntries<TID extends PlatformID>(
  input: IBrightChainMemberInitInput<TID>,
  poolId: string,
  idProvider: IIdProvider<TID>,
): IMemberIndexDocument[] {
  const now = new Date().toISOString();
  return [input.systemUser, input.adminUser, input.memberUser].map((user) => {
    const idStr = idProvider.idToString(user.id);
    if (!idStr) {
      throw new MemberIndexSchemaValidationError([
        { field: 'id', message: 'User ID is invalid or empty', value: user.id },
      ]);
    }
    return {
      id: idStr.replace(/-/g, ''),
      // Zero-filled sentinel — replaced when the member's actual CBL blocks are written.
      // Must be 128 hex chars (64 bytes) to match SHA3-512 / CHECKSUM.SHA3_BUFFER_LENGTH.
      publicCBL: '0'.repeat(128),
      privateCBL: '0'.repeat(128),
      poolId,
      type: user.type,
      status: MemberStatusType.Active,
      lastUpdate: now,
      reputation: 0,
    };
  });
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Initialises a BrightDB instance and persists system/admin/member users
 * as IMemberIndexDocument entries in the member index collection.
 *
 * The service is idempotent: calling initialize() multiple times with the same
 * users will not create duplicate entries.
 */
export class BrightChainMemberInitService<TID extends PlatformID> {
  private _db: BrightDb | undefined;
  private _memberCblIndex: CBLIndex | undefined;
  private readonly _idProvider: IIdProvider<TID>;

  constructor(idProvider?: IIdProvider<TID>) {
    this._idProvider = idProvider ?? getBrightChainIdProvider<TID>();
  }

  /**
   * The initialised BrightDb instance.
   * @throws Error if initialize() has not been called yet.
   */
  get db(): BrightDb {
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
   * Initialise the block store and BrightDB, then persist any missing
   * member index entries.
   *
   * Steps:
   *  1. Build the appropriate block store (disk or memory)
   *  2. Create BrightDb with an isolated HeadRegistry
   *  3. Create CBLIndex for the member pool
   *  4. Build candidate IMemberIndexDocument entries
   *  5. Validate all candidates against MEMBER_INDEX_SCHEMA (pre-transaction)
   *  6. Check which candidates are already present (idempotency)
   *  7. Insert missing entries in a single withTransaction call
   */
  async initialize(
    config: IBrightChainMemberInitConfig,
    input: IBrightChainMemberInitInput<TID>,
  ): Promise<IBrightChainBaseInitResult<BrightDb, TID>> {
    const useDisk = !!config.blockStorePath && !config.useMemoryStore;

    // Steps 1-3: only run once per service instance.
    if (!this._db) {
      const blockStore = useDisk
        ? buildDiskBlockStore(config.blockStorePath!, config.blockSize)
        : buildMemoryBlockStore(config.blockSize);

      const db = new BrightDb(blockStore, {
        name: config.memberPoolName,
        // Use PersistentHeadRegistry for disk stores so data survives across
        // service instances; use an isolated in-memory registry otherwise.
        ...(useDisk
          ? { dataDir: config.blockStorePath! }
          : { headRegistry: HeadRegistry.createIsolated() }),
      });
      await db.connect();
      this._db = db;

      this._memberCblIndex = new CBLIndex(db, blockStore);
    }

    const db = this._db;

    // Step 4: build candidates
    const idProvider = this._idProvider;
    const candidates = buildCandidateEntries<TID>(
      input,
      config.memberPoolName,
      idProvider,
    );

    // Step 5: validate before touching the DB
    for (const candidate of candidates) {
      const errors = validateDocumentSafe(candidate);
      if (errors.length > 0) {
        throw new MemberIndexSchemaValidationError(errors);
      }
    }

    // Step 6: idempotency check — query only the candidate IDs, not the full collection
    const collection = db.collection<IMemberIndexDocument>(
      MEMBER_INDEX_COLLECTION,
    );
    const candidateIds = candidates.map((c) => c.id);
    const existing = await collection
      .find({ id: { $in: candidateIds } } as never)
      .toArray();
    const existingIds = new Set(existing.map((e) => e.id));

    const toInsert = candidates.filter((c) => !existingIds.has(c.id));
    const skippedCount = candidates.length - toInsert.length;

    if (toInsert.length === 0) {
      return {
        input,
        alreadyInitialized: true,
        insertedCount: 0,
        skippedCount,
        db,
      };
    }

    // Step 7: insert in a single transaction
    await db.withTransaction(async (session) => {
      for (const entry of toInsert) {
        await collection.insertOne(entry, { session });
      }
    });

    return {
      input,
      alreadyInitialized: false,
      insertedCount: toInsert.length,
      skippedCount,
      db,
    };
  }

  // ── Model registration ───────────────────────────────────────────────────

  /**
   * Register typed Models for all RBAC collections on the given BrightDB instance.
   *
   * After this call, `db.model('roles')`, `db.model('users')`, etc. return
   * Model instances that auto-serialize on writes and auto-rehydrate on reads.
   *
   * Idempotent — skips registration if models are already present.
   */
  private registerRbacModels(db: BrightDb): void {
    const idProvider = this._idProvider;

    if (!db.hasModel(ROLES_COLLECTION)) {
      db.model<IStoredRole, IRoleBase<TID, Date, string>>(ROLES_COLLECTION, {
        schema: ROLE_SCHEMA,
        hydration: createRoleHydrationSchema<TID>(idProvider),
      });
    }
    if (!db.hasModel(USERS_COLLECTION)) {
      db.model<IStoredUser, IUserBase<TID, Date, string, AccountStatus>>(
        USERS_COLLECTION,
        {
          schema: USER_SCHEMA,
          hydration: createUserHydrationSchema<TID>(idProvider),
        },
      );
    }
    if (!db.hasModel(USER_ROLES_COLLECTION)) {
      db.model<IStoredUserRole, IUserRoleBase<TID, Date>>(
        USER_ROLES_COLLECTION,
        {
          schema: USER_ROLE_SCHEMA,
          hydration: createUserRoleHydrationSchema<TID>(idProvider),
        },
      );
    }
    if (!db.hasModel(MNEMONICS_COLLECTION)) {
      db.model<IStoredMnemonic, IMnemonicBase<TID>>(MNEMONICS_COLLECTION, {
        schema: MNEMONIC_SCHEMA,
        hydration: createMnemonicHydrationSchema<TID>(idProvider),
      });
    }
  }

  // ── RBAC initialization ─────────────────────────────────────────────────

  /**
   * Build a role document for insertion into the roles collection.
   * Returns a plain data object satisfying IRoleBase — no Document wrapper needed.
   */
  private static buildRoleDocument<TID extends PlatformID>(
    user: IBrightChainUserInitEntry<TID>,
    systemUserId: TID,
    now: Date,
  ): IRoleBase<TID, Date, string> {
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
  private static buildUserDocument<TID extends PlatformID>(
    user: IBrightChainUserInitEntry<TID>,
    systemUserId: TID,
    now: Date,
  ): IUserBase<TID, Date, string, AccountStatus> {
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
  private static buildUserRoleDocument<TID extends PlatformID>(
    user: IBrightChainUserInitEntry<TID>,
    systemUserId: TID,
    now: Date,
  ): IUserRoleBase<TID, Date> {
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
  private static buildMnemonicDocument<TID extends PlatformID>(
    user: IBrightChainUserInitEntry<TID>,
  ): IMnemonicBase<TID> {
    return {
      _id: user.mnemonicDocId,
      hmac: user.mnemonicHmac,
    };
  }

  /**
   * Serialize a typed RBAC document for storage/validation.
   * Delegates to the standalone serializeForStorage utility.
   *
   * @template T - The input typed document (e.g. IRoleBase<TID, Date, string>)
   * @template TStored - The expected stored output type (e.g. IStoredRole).
   *   When omitted, returns a generic Record.
   */
  static serializeForStorage<
    T extends object,
    TStored extends Record<string, unknown> = Record<string, unknown>,
  >(doc: T): TStored {
    return serializeForStorageUtil<T, TStored>(doc);
  }

  /**
   * Validate a document against a schema, returning field errors (if any).
   *
   * Uses a generic parameter so callers can pass any typed RBAC document
   * (IRoleBase, IUserBase, etc.) without needing an index signature.
   * Serializes the document before validation so GuidV4Buffer and Date
   * values are converted to the string types the schemas expect.
   *
   * @deprecated Prefer using Model.validate() which handles dehydration internally.
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
   * Initialise the block store and BrightDB, then persist member index
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
    input: IBrightChainRbacInitInput<TID>,
  ): Promise<IBrightChainInitResult<TID, BrightDb>> {
    // Steps 1-7: delegate to the base initialize() for member_index entries
    const memberInitInput: IBrightChainMemberInitInput<TID> = {
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
      BrightChainMemberInitService.buildRoleDocument<TID>(u, systemUserId, now),
    );
    const userDocuments = users.map((u) =>
      BrightChainMemberInitService.buildUserDocument<TID>(u, systemUserId, now),
    );
    const userRoleDocuments = users.map((u) =>
      BrightChainMemberInitService.buildUserRoleDocument<TID>(
        u,
        systemUserId,
        now,
      ),
    );
    const mnemonicDocuments = users.map((u) =>
      BrightChainMemberInitService.buildMnemonicDocument<TID>(u),
    );

    // Validate all RBAC documents via the Model layer before touching the DB.
    // Model.validate() dehydrates internally and checks against the schema.
    // We register models first so validate() is available.
    this.registerRbacModels(db);

    const rolesModelForValidation = db.model<
      IStoredRole,
      IRoleBase<TID, Date, string>
    >(ROLES_COLLECTION);
    const usersModelForValidation = db.model<
      IStoredUser,
      IUserBase<TID, Date, string, AccountStatus>
    >(USERS_COLLECTION);
    const userRolesModelForValidation = db.model<
      IStoredUserRole,
      IUserRoleBase<TID, Date>
    >(USER_ROLES_COLLECTION);
    const mnemonicsModelForValidation = db.model<
      IStoredMnemonic,
      IMnemonicBase<TID>
    >(MNEMONICS_COLLECTION);

    for (const doc of roleDocuments) {
      const errors = rolesModelForValidation.validate(doc);
      if (errors.length > 0) {
        throw new MemberIndexSchemaValidationError(errors);
      }
    }
    for (const doc of userDocuments) {
      const errors = usersModelForValidation.validate(doc);
      if (errors.length > 0) {
        throw new MemberIndexSchemaValidationError(errors);
      }
    }
    for (const doc of userRoleDocuments) {
      const errors = userRolesModelForValidation.validate(doc);
      if (errors.length > 0) {
        throw new MemberIndexSchemaValidationError(errors);
      }
    }
    for (const doc of mnemonicDocuments) {
      const errors = mnemonicsModelForValidation.validate(doc);
      if (errors.length > 0) {
        throw new MemberIndexSchemaValidationError(errors);
      }
    }

    // Step 9: Models are already registered above — retrieve them for
    // idempotency checks and inserts.
    const rolesModel = rolesModelForValidation;
    const usersModel = usersModelForValidation;
    const userRolesModel = userRolesModelForValidation;
    const mnemonicsModel = mnemonicsModelForValidation;

    // Idempotency check: query only the candidates we're about to insert,
    // NOT the entire collection. This avoids full-collection scans at scale.

    // Roles — match by stable role name (System, Admin, Member)
    const candidateRoleNames = roleDocuments.map((d) => d.name);
    const existingRoles = await rolesModel.collection
      .find({ name: { $in: candidateRoleNames } } as never)
      .toArray();
    const existingRoleNames = new Set(existingRoles.map((r) => r.name));

    // Users — match by stable email address (the only reliably known field)
    const candidateEmails = userDocuments.map((d) => d.email);
    const existingUsers = await usersModel.collection
      .find({ email: { $in: candidateEmails } } as never)
      .toArray();
    const existingUserEmails = new Set(existingUsers.map((u) => u.email));

    // User-roles — match by the userId+roleId of users/roles we found
    const existingUserIds = new Set(existingUsers.map((u) => u._id));
    const existingUserRoles =
      existingUserIds.size > 0
        ? await userRolesModel.collection
            .find({ userId: { $in: [...existingUserIds] } } as never)
            .toArray()
        : [];
    const existingUserRolePairs = new Set(
      existingUserRoles.map((ur) => `${ur.userId}:${ur.roleId}`),
    );

    // Mnemonics — match by the _id values we're about to insert
    const candidateMnemonicIds = mnemonicDocuments.map((d) =>
      String(mnemonicsModel.dehydrate(d)['_id']),
    );
    const existingMnemonics = await mnemonicsModel.collection
      .find({ _id: { $in: candidateMnemonicIds } } as never)
      .toArray();
    const existingMnemonicIds = new Set(existingMnemonics.map((m) => m._id));

    // Compare typed documents against existing data using stable fields.
    const rolesToInsert = roleDocuments.filter(
      (d) => !existingRoleNames.has(d.name),
    );
    const usersToInsert = userDocuments.filter(
      (d) => !existingUserEmails.has(d.email),
    );
    const userRolesToInsert = userRoleDocuments.filter((d) => {
      const dehydrated = userRolesModel.dehydrate(d);
      const pair = `${dehydrated['userId']}:${dehydrated['roleId']}`;
      return !existingUserRolePairs.has(pair);
    });
    const mnemonicsToInsert = mnemonicDocuments.filter(
      (d) =>
        !existingMnemonicIds.has(String(mnemonicsModel.dehydrate(d)['_id'])),
    );

    const totalToInsert =
      rolesToInsert.length +
      usersToInsert.length +
      userRolesToInsert.length +
      mnemonicsToInsert.length;

    // Step 10: Insert missing RBAC documents in a single transaction.
    // Model.insertOne auto-dehydrates typed → stored and validates against
    // the schema, so no manual serializeForStorage calls are needed.
    if (totalToInsert > 0) {
      await db.withTransaction(async (session) => {
        for (const doc of rolesToInsert) {
          await rolesModel.collection.insertOne(rolesModel.dehydrate(doc), {
            session,
          });
        }
        for (const doc of mnemonicsToInsert) {
          await mnemonicsModel.collection.insertOne(
            mnemonicsModel.dehydrate(doc),
            { session },
          );
        }
        for (const doc of usersToInsert) {
          await usersModel.collection.insertOne(usersModel.dehydrate(doc), {
            session,
          });
        }
        for (const doc of userRolesToInsert) {
          await userRolesModel.collection.insertOne(
            userRolesModel.dehydrate(doc),
            { session },
          );
        }
      });
    }

    return {
      input,
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
      systemMember: {} as Member<TID>, // placeholder — caller creates Member
      // Admin user flat fields
      adminRole: roleDocuments[1],
      adminUser: userDocuments[1],
      adminUserRole: userRoleDocuments[1],
      adminUsername: input.adminUser.username,
      adminEmail: input.adminUser.email,
      adminMnemonic: input.adminUser.plaintextMnemonic ?? '',
      adminPassword: input.adminUser.plaintextPassword ?? '',
      adminBackupCodes: input.adminUser.plaintextBackupCodes ?? [],
      adminMember: {} as Member<TID>, // placeholder
      // Member user flat fields
      memberRole: roleDocuments[2],
      memberUser: userDocuments[2],
      memberUserRole: userRoleDocuments[2],
      memberUsername: input.memberUser.username,
      memberEmail: input.memberUser.email,
      memberMnemonic: input.memberUser.plaintextMnemonic ?? '',
      memberPassword: input.memberUser.plaintextPassword ?? '',
      memberBackupCodes: input.memberUser.plaintextBackupCodes ?? [],
      memberMember: {} as Member<TID>, // placeholder
    };
  }

  // ── Credential helpers ────────────────────────────────────────────────

  /**
   * Map an IBrightChainUserInitEntry to an IBrightChainUserCredentials bundle.
   * Plaintext fields default to empty string / empty array when absent.
   */
  private static buildUserCredentials<TID extends PlatformID>(
    entry: IBrightChainUserInitEntry<TID>,
  ): IBrightChainUserCredentials<TID> {
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
  private static printUserCredentials<TID extends PlatformID>(
    label: string,
    creds: IBrightChainUserCredentials<TID>,
    idProvider: IIdProvider<TID>,
  ): void {
    const log = (msg: string) => console.log(msg);
    // Normalize to ShortHexGuid (32-char hex, no dashes) for consistency
    const idHex = (id: TID) => {
      try {
        const s = idProvider.idToString(id);
        return s ? s.replace(/-/g, '') : String(id);
      } catch {
        return String(id);
      }
    };
    log(`  ${label} ID:           ${idHex(creds.id)}`);
    log(`  ${label} Full ID:      ${idHex(creds.fullId)}`);
    log(`  ${label} Type:         ${this.memberTypeLabel(creds.type)}`);
    log(`  ${label} Username:     ${creds.username}`);
    log(`  ${label} Email:        ${creds.email}`);
    log(`  ${label} Password:     ${creds.password}`);
    log(`  ${label} Mnemonic:     ${creds.mnemonic}`);
    if (creds.publicKeyHex) {
      log(`  ${label} Public Key:   ${creds.publicKeyHex}`);
    }
    if (creds.roleId) {
      log(`  ${label} Role ID:      ${idHex(creds.roleId)}`);
    }
    if (creds.userRoleId) {
      log(`  ${label} User Role ID: ${idHex(creds.userRoleId)}`);
    }
    log(`  ${label} Backup Codes: ${creds.backupCodes.join(', ')}`);
    log('');
  }

  /**
   * Print a formatted summary of the BrightChain server init results,
   * including full credentials for each user.
   */
  static printServerInitResults<TID extends PlatformID>(
    result: IBrightChainServerInitResult<TID, BrightDb>,
    config: IBrightChainMemberInitConfig,
    idProvider: IIdProvider<TID>,
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

    this.printUserCredentials('System', result.system, idProvider);
    this.printUserCredentials('Admin', result.admin, idProvider);
    this.printUserCredentials('Member', result.member, idProvider);

    log('=== End BrightChain Account Credentials ===');
    log('');
  }

  /**
   * Print a formatted summary of the BrightChain member init results.
   * Kept for backward compatibility — delegates to printServerInitResults
   * when a full result is available, otherwise prints minimal info.
   */
  static printBaseInitResults<TID extends PlatformID>(
    input: IBrightChainMemberInitInput<TID>,
    result: IBrightChainBaseInitResult<BrightDb, TID>,
    config: IBrightChainMemberInitConfig,
    idProvider: IIdProvider<TID>,
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
      entry: IBrightChainMemberEntry<TID>;
    }> = [
      { label: 'System', entry: input.systemUser },
      { label: 'Admin', entry: input.adminUser },
      { label: 'Member', entry: input.memberUser },
    ];

    for (const { label, entry } of entries) {
      log(`  ${label} ID:       ${idProvider.idToString(entry.id)}`);
      log(`  ${label} Type:     ${this.memberTypeLabel(entry.type)}`);
      log('');
    }

    log('=== End BrightChain Member Initialization ===');
    log('');
  }

  /**
   * Print a formatted summary of the BrightChain member init results.
   * Kept for backward compatibility — delegates to printServerInitResults
   * when a full result is available, otherwise prints minimal info.
   */
  static printInitResults<TID extends PlatformID>(
    input: IBrightChainMemberInitInput<TID>,
    result: IBrightChainInitResult<TID, BrightDb>,
    config: IBrightChainMemberInitConfig,
    idProvider: IIdProvider<TID>,
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
      entry: IBrightChainMemberEntry<TID>;
    }> = [
      { label: 'System', entry: input.systemUser },
      { label: 'Admin', entry: input.adminUser },
      { label: 'Member', entry: input.memberUser },
    ];

    for (const { label, entry } of entries) {
      log(`  ${label} ID:       ${idProvider.idToString(entry.id)}`);
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
  static buildServerInitResult<TID extends PlatformID>(
    baseResult: IBrightChainInitResult<TID, BrightDb>,
    credentials: {
      system: IBrightChainUserCredentials<TID>;
      admin: IBrightChainUserCredentials<TID>;
      member: IBrightChainUserCredentials<TID>;
    },
  ): IBrightChainServerInitResult<TID, BrightDb> {
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
  static formatDotEnv<TID extends PlatformID>(
    credentials: {
      system: IBrightChainUserCredentials<TID>;
      admin: IBrightChainUserCredentials<TID>;
      member: IBrightChainUserCredentials<TID>;
    },
    idProvider: IIdProvider<TID>,
  ): string {
    const { admin, member, system } = credentials;
    const idStr = (id: TID | undefined): string =>
      id ? idProvider.idToString(id) : '';
    const lines: string[] = [
      `ADMIN_ID="${idStr(admin.fullId)}"`,
      `ADMIN_MNEMONIC="${admin.mnemonic}"`,
      `ADMIN_ROLE_ID="${idStr(admin.roleId)}"`,
      `ADMIN_USER_ROLE_ID="${idStr(admin.userRoleId)}"`,
      `ADMIN_PASSWORD="${admin.password}"`,
      '',
      `MEMBER_ID="${idStr(member.fullId)}"`,
      `MEMBER_MNEMONIC="${member.mnemonic}"`,
      `MEMBER_ROLE_ID="${idStr(member.roleId)}"`,
      `MEMBER_PASSWORD="${member.password}"`,
      `MEMBER_USER_ROLE_ID="${idStr(member.userRoleId)}"`,
      '',
      '# System credentials used to sign system messages',
      `SYSTEM_ID="${idStr(system.fullId)}"`,
      `SYSTEM_MNEMONIC="${system.mnemonic}"`,
      `SYSTEM_PUBLIC_KEY="${system.publicKeyHex ?? ''}"`,
      `SYSTEM_ROLE_ID="${idStr(system.roleId)}"`,
      `SYSTEM_PASSWORD="${system.password}"`,
      `SYSTEM_USER_ROLE_ID="${idStr(system.userRoleId)}"`,
    ];
    return lines.join('\n');
  }
}
