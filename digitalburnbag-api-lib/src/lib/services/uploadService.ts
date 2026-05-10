/**
 * @fileoverview Burnbag API-layer upload service.
 *
 * Extends the browser-safe `UploadService` base class with Joule-economy
 * `quote()`, `commit()`, and `discard()` overrides.  The three path-breaking
 * constraints that differ from the base class:
 *
 *  1. `IDebitAuthorizationService` integration (two-phase debit).
 *  2. Encrypted-ciphertext escrow via `IUploadRepository.storeEscrowData()`.
 *  3. Block-size selection from the receiving node's supported sizes —
 *     uses `pickBlockSize()` to minimise padding waste.
 *
 * Requirement cross-refs: 2.2, 2.7, 2.8
 */
import type { Checksum } from '@brightchain/brightchain-lib';
import type {
  IFileMetadataBase,
  IUploadCommitResultDTO,
  IUploadCostQuoteDTO,
  IUploadRepository,
  IUploadServiceDeps,
  IUploadSessionBase,
} from '@brightchain/digitalburnbag-lib';
import {
  UploadService,
  blockAlignedBytes,
  calculateBurnbagStorageCost,
  pickBlockSize,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { isBurnbagJouleEnabled } from '../config/burnbagConfig';
import { ConflictError, GoneError, NotFoundError } from '../errors';

// ---------------------------------------------------------------------------
// Local structural type for the brightchain-api-lib `DebitAuthorizationService`.
//
// Defined here (instead of importing the concrete class) to avoid a circular
// package dependency between `digitalburnbag-api-lib` and `brightchain-api-lib`
// — the latter already depends on this package for route mounting. Callers in
// brightchain-api-lib pass an actual `DebitAuthorizationService` instance,
// which structurally satisfies this interface.
// ---------------------------------------------------------------------------
export interface IDebitAuthorizationService {
  authorize(memberId: Checksum, maxMicroJoules: bigint, opId?: string): string;
  capture(
    opId: string,
    actualMicroJoules: bigint,
    memberId?: Uint8Array,
    requestId?: string,
  ): Promise<void>;
  release(opId: string): void;
}

// ---------------------------------------------------------------------------
// AES-GCM overhead (12-byte IV + 16-byte auth tag = 28 bytes added per
// encryption).  Used to derive `encryptedBytes` from `totalSizeBytes`.
// ---------------------------------------------------------------------------
const AES_GCM_OVERHEAD_BYTES = 28;

// ---------------------------------------------------------------------------
// Extended deps interface
// ---------------------------------------------------------------------------

/**
 * Additional dependencies for `BurnbagUploadService` beyond the base class.
 * The base `IUploadServiceDeps` covers createSession/receiveChunk/finalize;
 * these cover the Joule quote→commit path.
 */
export interface IBurnbagUploadServiceDeps<TID extends PlatformID> {
  /**
   * Block sizes (in bytes) that the receiving node supports.
   * `pickBlockSize()` selects the entry that wastes the fewest bytes for
   * the given encrypted payload.  Must be non-empty.
   *
   * Example values from `brightchain-lib` BlockSize enum:
   *   [512, 1024, 4096, 1_048_576, 67_108_864, 268_435_456]
   */
  availableBlockSizes: readonly number[];

  /**
   * Build and persist a `IFileMetadataBase` record from the completed session.
   * Called during `commit()` after blocks are stored.
   */
  createFileMetadata: (
    session: IUploadSessionBase<TID>,
    blockRefs: unknown,
    vaultCreationLedgerEntryHash: Uint8Array,
  ) => Promise<IFileMetadataBase<TID>>;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Node-side upload service that extends the browser-safe `UploadService`
 * with Joule escrow for the quote → commit | discard lifecycle.
 *
 * Inherits: createSession, receiveChunk, finalize, getSessionStatus,
 *           purgeExpiredSessions from the base class.
 * Overrides: quote, commit, discard with full Joule implementation.
 *
 * When `BURNBAG_JOULE_ENABLED=false`, the overrides delegate to the base
 * stubs (which throw FEATURE_DISABLED / no-op as appropriate).
 */
export class BurnbagUploadService<
  TID extends PlatformID,
> extends UploadService<TID> {
  constructor(
    repository: IUploadRepository<TID>,
    baseDeps: IUploadServiceDeps<TID>,
    generateId: () => TID,
    private readonly debitAuth: IDebitAuthorizationService,
    private readonly quoteTtlMs: number,
    /**
     * Converts a string user-ID into a `Checksum` for the debit-auth layer.
     */
    private readonly resolveChecksum: (userId: string) => Checksum,
    private readonly jouleDeps: IBurnbagUploadServiceDeps<TID>,
    /** Stringify a `TID` to a plain string (for repository key lookups). */
    private readonly idToString: (id: TID) => string,
  ) {
    super(repository, baseDeps, generateId);
  }

  // -------------------------------------------------------------------------
  // quote  (Task 2.7 / Req 2.7)
  // -------------------------------------------------------------------------

  /**
   * Compute a Joule cost quote for the completed upload.
   *
   * @throws `Error('FEATURE_DISABLED')` when `BURNBAG_JOULE_ENABLED` is false.
   * @throws `NotFoundError`   when the session does not exist.
   * @throws `ConflictError('UPLOAD_ALREADY_QUOTED')` when already quoted.
   * @throws `ConflictError('UPLOAD_INCOMPLETE')` when not all chunks received.
   * @throws `InsufficientJouleError` (402) when the member has too few Joules.
   */
  override async quote(
    sessionId: TID,
    requestingUserId: string,
    durabilityTier: IUploadSessionBase<TID>['durabilityTier'] = 'standard',
    durationDays = 30,
  ): Promise<IUploadCostQuoteDTO> {
    if (!isBurnbagJouleEnabled()) {
      return super.quote(sessionId, requestingUserId);
    }

    const session = await this['repository'].getSession(sessionId);
    if (!session) {
      throw new NotFoundError('UploadSession', this.idToString(sessionId));
    }

    if (session.state === 'quoted') {
      // Session is already quoted — return the stored quote so the client
      // can display it and let the user confirm or discard.
      return {
        sessionId: this.idToString(sessionId),
        effectiveTier: session.durabilityTier ?? 'standard',
        blockAlignedBytes: session.quotedBlockAlignedBytes ?? 0,
        rsK: session.quotedRsK ?? 0,
        rsM: session.quotedRsM ?? 0,
        overheadDisplay:
          session.quotedRsK && session.quotedRsM
            ? `${((session.quotedRsK + session.quotedRsM) / session.quotedRsK).toFixed(2)}×`
            : '1.00×',
        upfrontMicroJoules: session.quotedUpfrontMicroJoules ?? '0',
        dailyMicroJoules: session.quotedDailyMicroJoules ?? '0',
        durationDays: session.durationDays ?? 30,
        quotedAt: session.quotedAt ?? new Date().toISOString(),
        quoteExpiresAt: session.quoteExpiresAt ?? new Date().toISOString(),
      };
    }

    if (session.receivedChunks.size !== session.totalChunks) {
      throw new ConflictError('UPLOAD_INCOMPLETE');
    }

    // Reassemble all chunks in order using the base class helper.
    const assembledData = await this['reassembleChunks'](session);

    // Encrypt to get the exact ciphertext byte count.
    const encryptFn = this['deps'].encrypt;
    if (!encryptFn) {
      throw new Error('FEATURE_DISABLED');
    }
    const { ciphertext } = await encryptFn(assembledData);

    // The encrypted size is the plaintext + AES-GCM overhead bytes.
    const encryptedBytes = Math.max(
      ciphertext.length,
      session.totalSizeBytes + AES_GCM_OVERHEAD_BYTES,
    );

    // Pick the node block size that minimises padding waste.
    const blockSize = pickBlockSize(
      encryptedBytes,
      this.jouleDeps.availableBlockSizes,
    );
    const alignedBytes = blockAlignedBytes(encryptedBytes, blockSize);

    const tier = session.durabilityTier ?? durabilityTier;
    const days = session.durationDays ?? durationDays;

    const cost = calculateBurnbagStorageCost({
      bytes: BigInt(alignedBytes),
      tier,
      durationDays: days,
    });

    // Authorize 25 % over-reserve to absorb minor estimation drift.
    const authorizedMax = (cost.upfrontMicroJoules * 125n) / 100n;
    const memberId = this.resolveChecksum(requestingUserId);

    // May throw InsufficientJouleError — callers should handle as HTTP 402.
    const opId = this.debitAuth.authorize(memberId, authorizedMax);

    const sessionIdStr = this.idToString(sessionId);
    await this['repository'].storeEscrowData(
      sessionIdStr,
      ciphertext,
      this.quoteTtlMs,
    );

    // Raw chunks are no longer needed — escrow holds the ciphertext.
    await this['repository'].deleteChunkData(sessionId);

    const quotedAt = new Date();
    const quoteExpiresAt = new Date(quotedAt.getTime() + this.quoteTtlMs);

    const updated: IUploadSessionBase<TID> = {
      ...session,
      state: 'quoted',
      durabilityTier: tier,
      durationDays: days,
      quotedAt: quotedAt.toISOString(),
      quoteExpiresAt: quoteExpiresAt.toISOString(),
      quotedUpfrontMicroJoules: cost.upfrontMicroJoules.toString(),
      quotedDailyMicroJoules: cost.dailyMicroJoules.toString(),
      quotedBlockAlignedBytes: alignedBytes,
      quotedRsK: cost.rsK,
      quotedRsM: cost.rsM,
      jouleOpId: opId,
    };
    await this['repository'].updateSession(updated);

    return {
      sessionId: sessionIdStr,
      effectiveTier: cost.effectiveTier,
      blockAlignedBytes: alignedBytes,
      rsK: cost.rsK,
      rsM: cost.rsM,
      overheadDisplay: cost.overheadDisplay,
      upfrontMicroJoules: cost.upfrontMicroJoules.toString(),
      dailyMicroJoules: cost.dailyMicroJoules.toString(),
      durationDays: days,
      quotedAt: quotedAt.toISOString(),
      quoteExpiresAt: quoteExpiresAt.toISOString(),
    };
  }

  // -------------------------------------------------------------------------
  // commit  (Task 2.8 / Req 2.8)
  // -------------------------------------------------------------------------

  /**
   * Accept the quoted cost, write blocks, and capture the reserved Joules.
   *
   * @throws `Error('FEATURE_DISABLED')` when feature flag is off.
   * @throws `NotFoundError`  when session is gone.
   * @throws `GoneError('UPLOAD_QUOTE_EXPIRED')` when quote TTL has passed.
   * @throws `ConflictError('UPLOAD_NOT_QUOTED')` when session is still uploading.
   */
  override async commit(
    sessionId: TID,
    requestingUserId?: string,
  ): Promise<IUploadCommitResultDTO<TID>> {
    if (!isBurnbagJouleEnabled()) {
      return super.commit(sessionId, requestingUserId ?? '');
    }

    const session = await this['repository'].getSession(sessionId);
    if (!session) {
      throw new NotFoundError('UploadSession', this.idToString(sessionId));
    }

    if (session.state !== 'quoted') {
      throw new ConflictError('UPLOAD_NOT_QUOTED');
    }

    // Verify quote TTL.
    if (
      session.quoteExpiresAt &&
      new Date(session.quoteExpiresAt).getTime() <= Date.now()
    ) {
      if (session.jouleOpId) {
        this.debitAuth.release(session.jouleOpId);
      }
      throw new GoneError('UPLOAD_QUOTE_EXPIRED');
    }

    const sessionIdStr = this.idToString(sessionId);
    const ciphertext = await this['repository'].getEscrowData(sessionIdStr);
    if (!ciphertext) {
      if (session.jouleOpId) {
        this.debitAuth.release(session.jouleOpId);
      }
      throw new GoneError('UPLOAD_QUOTE_EXPIRED');
    }

    // Write blocks — if this throws we must release the reservation.
    let blockRefs: unknown;
    let vaultCreationLedgerEntryHash: Uint8Array;
    try {
      const result = await this['deps'].storeBlocks(ciphertext);
      blockRefs = result.blockRefs;
      vaultCreationLedgerEntryHash = result.vaultCreationLedgerEntryHash;
    } catch (err) {
      if (session.jouleOpId) {
        this.debitAuth.release(session.jouleOpId);
      }
      throw err;
    }

    // Capture the exact quoted amount.
    const captureAmount = BigInt(session.quotedUpfrontMicroJoules ?? '0');
    await this.debitAuth.capture(session.jouleOpId!, captureAmount);

    const metadata = await this.jouleDeps.createFileMetadata(
      session,
      blockRefs,
      vaultCreationLedgerEntryHash,
    );

    await this['repository'].deleteEscrowData(sessionIdStr);
    await this['repository'].deleteSession(sessionId);

    return {
      fileId: String(metadata.id),
      metadata,
    };
  }

  // -------------------------------------------------------------------------
  // discard  (Task 2.8 / Req 2.8)
  // -------------------------------------------------------------------------

  /**
   * Abandon a quoted upload, releasing any reserved Joules and purging escrow.
   *
   * Idempotent: safe to call even when the session is not found or the feature
   * flag is off.
   */
  override async discard(
    sessionId: TID,
    _requestingUserId?: string,
  ): Promise<void> {
    if (!isBurnbagJouleEnabled()) {
      return;
    }

    const session = await this['repository']
      .getSession(sessionId)
      .catch(() => null);
    if (!session) {
      return;
    }

    if (session.jouleOpId) {
      try {
        this.debitAuth.release(session.jouleOpId);
      } catch {
        // Reservation may already be expired — swallow.
      }
    }

    const sessionIdStr = this.idToString(sessionId);
    try {
      await this['repository'].deleteEscrowData(sessionIdStr);
    } catch {
      // Escrow already gone — swallow.
    }
    try {
      await this['repository'].deleteSession(sessionId);
    } catch {
      // Session already gone — swallow.
    }
  }
}
