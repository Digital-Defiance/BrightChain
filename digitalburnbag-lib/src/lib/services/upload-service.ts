import { PlatformID } from '@digitaldefiance/ecies-lib';
import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import {
  ChunkChecksumMismatchError,
  ChunkIndexOutOfRangeError,
  FileNotFoundError,
  MimeTypeMismatchError,
  QuotaExceededError,
  UploadIncompleteError,
  UploadSessionExpiredError,
  UploadSessionNotFoundError,
} from '../errors';
import type { IFileMetadataBase } from '../interfaces/bases/file-metadata';
import type { IUploadSessionBase } from '../interfaces/bases/upload-session';
import type { IAuditEntryParams } from '../interfaces/params/audit-service-params';
import type { IQuotaCheckResult } from '../interfaces/params/quota-results';
import type {
  IChunkReceipt,
  ICreateNewVersionSessionParams,
  ICreateUploadSessionParams,
  IUploadSessionStatus,
} from '../interfaces/params/upload-service-params';
import type { IUploadRepository } from '../interfaces/services/upload-repository';
import type { IUploadService } from '../interfaces/services/upload-service';

/**
 * Default chunk size: 1 MB.
 */
const DEFAULT_CHUNK_SIZE_BYTES = 1 * 1024 * 1024;

/**
 * Default session expiration: 24 hours.
 */
const DEFAULT_SESSION_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/**
 * Compute a SHA-256 hex digest of the given data.
 * Uses a simple iterative hash for portability (no Node.js crypto dependency).
 */
function computeChecksum(data: Uint8Array): string {
  // Use a simple DJB2-style hash producing a hex string.
  // In production this would delegate to SubtleCrypto or a streaming SHA-256,
  // but for the service layer we accept an injected hash function.
  // The actual checksum comparison is against the caller-provided value,
  // so the algorithm must match what the client uses.
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash + data[i]) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Dependencies injected into UploadService that come from other services.
 */
export interface IUploadServiceDeps<TID extends PlatformID> {
  /** Check storage quota before creating a session */
  checkQuota: (
    userId: TID,
    additionalBytes: number,
  ) => Promise<IQuotaCheckResult>;
  /**
   * Encrypt assembled file content — returns encrypted bytes.
   * Optional: not called when the client pre-encrypted the file (E2EE upload).
   */
  encrypt?: (
    plaintext: Uint8Array,
  ) => Promise<{ ciphertext: Uint8Array; key: Uint8Array; iv: Uint8Array }>;
  /** Store encrypted blocks and return a recipe/reference */
  storeBlocks: (encrypted: Uint8Array) => Promise<{
    blockRefs: unknown;
    vaultCreationLedgerEntryHash: Uint8Array;
  }>;
  /**
   * Wrap the file's symmetric key for the uploading user so they have a
   * direct decryption path without going through the custodian.
   * Called during finalize() when the server performs encryption.
   */
  wrapKeyForOwner: (
    fileVersionId: TID,
    symmetricKey: Uint8Array,
    ownerId: TID,
  ) => Promise<void>;
  /**
   * Store a client-provided pre-wrapped (ECIES-encrypted) symmetric key for
   * the uploading user.  Called during finalize() when the client performed
   * E2EE encryption before upload.
   */
  storePreWrappedKeyForOwner?: (
    fileVersionId: TID,
    encryptedSymmetricKey: Uint8Array,
    ownerId: TID,
  ) => Promise<void>;
  /**
   * Persist the AES-GCM IV and authentication tag that were used by the client
   * to encrypt the file.  Required for the encrypted-download path to return
   * the correct IV and authTag to the browser.
   * Called during finalize() when the client performed E2EE encryption.
   */
  storeEncryptionMetadata?: (
    vaultCreationLedgerEntryHash: Uint8Array,
    iv: Uint8Array,
    authTag: Uint8Array,
  ) => Promise<void>;
  /** Log an audit entry */
  onAuditLog?: (entry: IAuditEntryParams<TID>) => Promise<void>;
  /** Compute checksum of chunk data — must match client algorithm */
  computeChecksum?: (data: Uint8Array) => string;
}

/**
 * Manages chunked file uploads with resume capability.
 *
 * Delegates persistence to an `IUploadRepository`, which is implemented in
 * `digitalburnbag-api-lib` backed by BrightDB. Encryption and block storage
 * are injected as dependencies so the service stays environment-agnostic.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 8.2
 */
export class UploadService<TID extends PlatformID>
  implements IUploadService<TID>
{
  private readonly computeChecksumFn: (data: Uint8Array) => string;

  constructor(
    private readonly repository: IUploadRepository<TID>,
    protected readonly deps: IUploadServiceDeps<TID>,
    private readonly generateId: () => TID,
    private readonly chunkSizeBytes: number = DEFAULT_CHUNK_SIZE_BYTES,
    private readonly sessionExpirationMs: number = DEFAULT_SESSION_EXPIRATION_MS,
  ) {
    this.computeChecksumFn = deps.computeChecksum ?? computeChecksum;
  }

  /**
   * Create a new upload session after validating the user's storage quota.
   *
   * Splits the file into fixed-size chunks and records the session in BrightDB
   * with an expiration timestamp.
   *
   * Validates: Requirements 1.1, 1.7, 8.2
   */
  async createSession(
    params: ICreateUploadSessionParams<TID>,
  ): Promise<IUploadSessionBase<TID>> {
    // Validate quota before creating session
    const quotaResult = await this.deps.checkQuota(
      params.userId,
      params.totalSizeBytes,
    );
    if (!quotaResult.allowed) {
      throw new QuotaExceededError(
        quotaResult.currentUsageBytes,
        quotaResult.quotaBytes,
        params.totalSizeBytes,
      );
    }

    const totalChunks = Math.max(
      1,
      Math.ceil(params.totalSizeBytes / this.chunkSizeBytes),
    );
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionExpirationMs);

    const session: IUploadSessionBase<TID> = {
      id: this.generateId(),
      userId: params.userId,
      fileName: params.fileName,
      mimeType: params.mimeType,
      totalSizeBytes: params.totalSizeBytes,
      chunkSizeBytes: this.chunkSizeBytes,
      totalChunks,
      receivedChunks: new Set<number>(),
      chunkChecksums: new Map<number, string>(),
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      targetFolderId: params.targetFolderId,
      vaultContainerId: params.vaultContainerId,
    };

    // Carry forward E2EE pre-encryption metadata when provided by the client
    if (params.preEncryptedWrappedKeyB64 !== undefined) {
      session.preEncryptedWrappedKeyB64 = params.preEncryptedWrappedKeyB64;
    }
    if (params.preEncryptedIvB64 !== undefined) {
      session.preEncryptedIvB64 = params.preEncryptedIvB64;
    }
    if (params.preEncryptedAuthTagB64 !== undefined) {
      session.preEncryptedAuthTagB64 = params.preEncryptedAuthTagB64;
    }

    await this.repository.createSession(session);
    return session;
  }

  /**
   * Create an upload session for a new version of an existing file.
   * Validates that the MIME type matches the original file.
   *
   * @throws FileNotFoundError if the file does not exist
   * @throws MimeTypeMismatchError if the MIME type differs from the original
   */
  async createNewVersionSession(
    params: ICreateNewVersionSessionParams<TID>,
  ): Promise<IUploadSessionBase<TID>> {
    const existingFile = await this.repository.getFileMetadata(params.fileId);
    if (!existingFile) {
      throw new FileNotFoundError(String(params.fileId));
    }

    if (params.mimeType !== existingFile.mimeType) {
      throw new MimeTypeMismatchError(
        String(params.fileId),
        existingFile.mimeType,
        params.mimeType,
      );
    }

    return this.createSession({
      userId: params.userId,
      fileName: params.fileName,
      mimeType: params.mimeType,
      totalSizeBytes: params.totalSizeBytes,
      targetFolderId: existingFile.folderId,
      vaultContainerId: existingFile.vaultContainerId,
    });
  }

  /**
   * Receive and verify a single chunk.
   *
   * Computes the checksum of the received data and compares it against the
   * caller-provided checksum. On mismatch the chunk is rejected. On match
   * the chunk is stored and the session is updated.
   *
   * Validates: Requirements 1.1, 1.2, 1.6
   */
  async receiveChunk(
    sessionId: TID,
    chunkIndex: number,
    data: Uint8Array,
    checksum: string,
  ): Promise<IChunkReceipt> {
    const session = await this.getValidSession(sessionId);

    // Validate chunk index
    if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
      throw new ChunkIndexOutOfRangeError(chunkIndex, session.totalChunks);
    }

    // Verify checksum
    const actualChecksum = this.computeChecksumFn(data);
    if (actualChecksum !== checksum) {
      throw new ChunkChecksumMismatchError(
        chunkIndex,
        checksum,
        actualChecksum,
      );
    }

    // Store chunk data and mark as received
    await this.repository.storeChunkData(sessionId, chunkIndex, data);
    session.receivedChunks.add(chunkIndex);
    session.chunkChecksums.set(chunkIndex, checksum);
    await this.repository.updateSession(session);

    const progress = session.receivedChunks.size / session.totalChunks;

    return {
      chunkIndex,
      received: true,
      progress,
    };
  }

  /**
   * Finalize an upload session: reassemble chunks, encrypt with AES-256-GCM,
   * store encrypted blocks in IBlockStore, create File_Metadata in BrightDB,
   * and log the upload to AuditService.
   *
   * Validates: Requirements 1.4, 1.1
   */
  async finalize(sessionId: TID): Promise<IFileMetadataBase<TID>> {
    const session = await this.getValidSession(sessionId);

    // Verify all chunks received
    if (session.receivedChunks.size !== session.totalChunks) {
      throw new UploadIncompleteError(
        session.receivedChunks.size,
        session.totalChunks,
      );
    }

    // Reassemble chunks in order
    const assembledData = await this.reassembleChunks(session);

    // Branch: client pre-encrypted (E2EE) vs. server-side encryption
    const isPreEncrypted =
      session.preEncryptedWrappedKeyB64 !== undefined &&
      session.preEncryptedIvB64 !== undefined &&
      session.preEncryptedAuthTagB64 !== undefined;

    let vaultCreationLedgerEntryHash: Uint8Array;

    if (isPreEncrypted) {
      // ── E2EE upload path ──────────────────────────────────────────────
      // The assembled chunks ARE already the ciphertext — store them as-is.
      const result = await this.deps.storeBlocks(assembledData);
      vaultCreationLedgerEntryHash = result.vaultCreationLedgerEntryHash;

      // Persist the IV and auth tag so the download path can reconstruct them
      if (this.deps.storeEncryptionMetadata) {
        const iv = Uint8Array.from(
          Buffer.from(session.preEncryptedIvB64 as string, 'base64'),
        );
        const authTag = Uint8Array.from(
          Buffer.from(session.preEncryptedAuthTagB64 as string, 'base64'),
        );
        await this.deps.storeEncryptionMetadata(
          vaultCreationLedgerEntryHash,
          iv,
          authTag,
        );
      }

      // Create file metadata
      const now = new Date().toISOString();
      const fileId = this.generateId();
      const versionId = this.generateId();

      const metadata: IFileMetadataBase<TID> = {
        id: fileId,
        ownerId: session.userId,
        vaultContainerId: session.vaultContainerId,
        folderId: session.targetFolderId,
        fileName: session.fileName,
        mimeType: session.mimeType,
        sizeBytes: session.totalSizeBytes,
        tags: [],
        currentVersionId: versionId,
        vaultCreationLedgerEntryHash,
        approvalGoverned: false,
        visibleWatermark: false,
        invisibleWatermark: false,
        createdAt: now,
        updatedAt: now,
        createdBy: session.userId,
        updatedBy: session.userId,
      };

      const storedMetadata = await this.repository.createFileMetadata(metadata);

      // Store the client-provided pre-wrapped key for the uploader
      if (this.deps.storePreWrappedKeyForOwner) {
        const wrappedKey = Uint8Array.from(
          Buffer.from(session.preEncryptedWrappedKeyB64 as string, 'base64'),
        );
        await this.deps.storePreWrappedKeyForOwner(
          versionId,
          wrappedKey,
          session.userId,
        );
      }

      // Clean up session and chunk data
      await this.repository.deleteChunkData(sessionId);
      await this.repository.deleteSession(sessionId);

      // Log upload to audit service
      if (this.deps.onAuditLog) {
        await this.deps.onAuditLog({
          operationType: FileAuditOperationType.FileUploaded,
          actorId: session.userId,
          targetId: fileId,
          targetType: 'file',
          metadata: {
            fileName: session.fileName,
            mimeType: session.mimeType,
            sizeBytes: session.totalSizeBytes,
            folderId: String(session.targetFolderId),
            e2eeUpload: true,
          },
        });
      }

      return storedMetadata;
    }

    // ── Server-side encryption path (legacy / non-E2EE) ──────────────────
    // Encrypt the assembled file content
    const {
      ciphertext,
      key: symmetricKey,
      iv: _iv,
    } = await this.deps.encrypt!(assembledData);

    // Store encrypted blocks
    const {
      blockRefs: _blockRefs,
      vaultCreationLedgerEntryHash: serverLedgerHash,
    } = await this.deps.storeBlocks(ciphertext);
    vaultCreationLedgerEntryHash = serverLedgerHash;

    // Create file metadata
    const now = new Date().toISOString();
    const fileId = this.generateId();
    const versionId = this.generateId();

    const metadata: IFileMetadataBase<TID> = {
      id: fileId,
      ownerId: session.userId,
      vaultContainerId: session.vaultContainerId,
      folderId: session.targetFolderId,
      fileName: session.fileName,
      mimeType: session.mimeType,
      sizeBytes: session.totalSizeBytes,
      tags: [],
      currentVersionId: versionId,
      vaultCreationLedgerEntryHash,
      approvalGoverned: false,
      visibleWatermark: false,
      invisibleWatermark: false,
      createdAt: now,
      updatedAt: now,
      createdBy: session.userId,
      updatedBy: session.userId,
    };

    const storedMetadata = await this.repository.createFileMetadata(metadata);

    // Wrap the symmetric key for the uploader so they have a direct
    // decryption path without relying on the custodian.
    await this.deps.wrapKeyForOwner(versionId, symmetricKey, session.userId);

    // Clean up session and chunk data
    await this.repository.deleteChunkData(sessionId);
    await this.repository.deleteSession(sessionId);

    // Log upload to audit service
    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.FileUploaded,
        actorId: session.userId,
        targetId: fileId,
        targetType: 'file',
        metadata: {
          fileName: session.fileName,
          mimeType: session.mimeType,
          sizeBytes: session.totalSizeBytes,
          folderId: String(session.targetFolderId),
        },
      });
    }

    return storedMetadata;
  }

  /**
   * Get the status of an upload session for resume purposes.
   * Returns the list of received chunk indices so the client knows
   * which chunks to re-send.
   *
   * Validates: Requirement 1.3
   */
  async getSessionStatus(sessionId: TID): Promise<IUploadSessionStatus> {
    const session = await this.repository.getSession(sessionId);
    if (!session) {
      throw new UploadSessionNotFoundError(String(sessionId));
    }

    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const expired = now > expiresAt;

    return {
      sessionId: String(session.id),
      receivedChunks: Array.from(session.receivedChunks).sort((a, b) => a - b),
      totalChunks: session.totalChunks,
      expired,
    };
  }

  /**
   * Clean up all upload sessions that have passed their expiration time.
   * Returns the number of sessions purged.
   *
   * Validates: Requirement 1.7
   */
  async purgeExpiredSessions(): Promise<number> {
    const expired = await this.repository.getExpiredSessions();
    for (const session of expired) {
      await this.repository.deleteChunkData(session.id);
      await this.repository.deleteSession(session.id);
    }
    return expired.length;
  }

  /**
   * Retrieve a session and verify it exists and has not expired.
   */
  private async getValidSession(
    sessionId: TID,
  ): Promise<IUploadSessionBase<TID>> {
    const session = await this.repository.getSession(sessionId);
    if (!session) {
      throw new UploadSessionNotFoundError(String(sessionId));
    }

    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    if (now > expiresAt) {
      throw new UploadSessionExpiredError(String(sessionId));
    }

    return session;
  }

  /**
   * Reassemble all chunks in order into a single Uint8Array.
   */
  private async reassembleChunks(
    session: IUploadSessionBase<TID>,
  ): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      const chunk = await this.repository.getChunkData(session.id, i);
      if (!chunk) {
        throw new UploadIncompleteError(
          session.receivedChunks.size,
          session.totalChunks,
        );
      }
      chunks.push(chunk);
    }

    // Concatenate all chunks
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const assembled = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      assembled.set(chunk, offset);
      offset += chunk.length;
    }

    return assembled;
  }

  // ---------------------------------------------------------------------------
  // Joule economy stubs — full implementation in digitalburnbag-api-lib
  // These throw FEATURE_DISABLED in the browser-safe layer.
  // ---------------------------------------------------------------------------

  async quote(
    _sessionId: TID,
    _requestingUserId: string,
  ): Promise<import('../interfaces/dto/uploadCostQuote').IUploadCostQuoteDTO> {
    throw new Error('FEATURE_DISABLED');
  }

  async commit(
    _sessionId: TID,
    _requestingUserId: string,
  ): Promise<
    import('../interfaces/dto/uploadCommitResult').IUploadCommitResultDTO<TID>
  > {
    throw new Error('FEATURE_DISABLED');
  }

  async discard(_sessionId: TID, _requestingUserId: string): Promise<void> {
    throw new Error('FEATURE_DISABLED');
  }
}
