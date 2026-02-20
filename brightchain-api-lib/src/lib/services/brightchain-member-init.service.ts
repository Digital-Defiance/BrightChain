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

import type { ValidationFieldError } from '@brightchain/brightchain-lib';
import {
  BlockSize,
  IBrightChainInitResult,
  IBrightChainMemberInitInput,
  IMemberIndexDocument,
  MemberStatusType,
  MemoryBlockStore,
} from '@brightchain/brightchain-lib';
import {
  BrightChainDb,
  CBLIndex,
  ValidationError,
  validateDocument,
} from '@brightchain/db';
import { BrightChainApiStrings } from '../enumerations/brightChainApiStrings';
import { MemberIndexSchemaValidationError } from '../errors/memberIndexSchemaValidationError';
import { MEMBER_INDEX_SCHEMA } from '../interfaces/storage/memberIndexSchema';
import { DiskBlockStore } from '../stores/diskBlockStore';

/** Well-known collection name for the member index. */
const MEMBER_INDEX_COLLECTION = 'member_index';

// ─── Config passed to initialize() ───────────────────────────────────────────

/**
 * BrightChain-native configuration for BrightChainMemberInitService.
 * Contains only what the service needs — no Mongoose, no Express.
 */
export interface IBrightChainMemberInitConfig {
  /** Pool name used as the BrightChainDb name and poolId */
  memberPoolName: string;
  /**
   * Filesystem path for the disk block store.
   * When set (and useMemoryStore is false), a DiskBlockStore and
   * PersistentHeadRegistry are used so data survives process restarts.
   */
  blockStorePath?: string;
  /** Force in-memory store even when blockStorePath is set */
  useMemoryStore?: boolean;
  /** Block size for the store (defaults to BlockSize.Small) */
  blockSize?: BlockSize;
}

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
  input: IBrightChainMemberInitInput,
  poolId: string,
): IMemberIndexDocument[] {
  const now = new Date().toISOString();
  return [input.systemUser, input.adminUser, input.memberUser].map((user) => ({
    id: user.id,
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
    input: IBrightChainMemberInitInput,
  ): Promise<IBrightChainInitResult<BrightChainDb>> {
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
}
