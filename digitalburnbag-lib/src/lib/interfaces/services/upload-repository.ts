import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IFileMetadataBase } from '../bases/file-metadata';
import type { IUploadSessionBase } from '../bases/upload-session';

/**
 * Repository interface abstracting BrightDB access for upload session operations.
 * The API layer (digitalburnbag-api-lib) provides the concrete implementation
 * backed by BrightDB collections.
 */
export interface IUploadRepository<TID extends PlatformID> {
  /** Get an upload session by ID, or null if not found */
  getSession(sessionId: TID): Promise<IUploadSessionBase<TID> | null>;

  /** Create a new upload session */
  createSession(session: IUploadSessionBase<TID>): Promise<void>;

  /** Update an existing upload session (e.g., mark chunk received) */
  updateSession(session: IUploadSessionBase<TID>): Promise<void>;

  /** Delete an upload session (after finalization or expiration) */
  deleteSession(sessionId: TID): Promise<void>;

  /** Get all sessions that have expired (expiresAt < now) */
  getExpiredSessions(): Promise<IUploadSessionBase<TID>[]>;

  /** Store chunk data for a session */
  storeChunkData(
    sessionId: TID,
    chunkIndex: number,
    data: Uint8Array,
  ): Promise<void>;

  /** Get chunk data for a session, ordered by chunk index */
  getChunkData(sessionId: TID, chunkIndex: number): Promise<Uint8Array | null>;

  /** Delete all chunk data for a session */
  deleteChunkData(sessionId: TID): Promise<void>;

  /** Create a file metadata record and return it */
  createFileMetadata(
    metadata: IFileMetadataBase<TID>,
  ): Promise<IFileMetadataBase<TID>>;

  /** Get file metadata by ID, or null if not found */
  getFileMetadata(fileId: TID): Promise<IFileMetadataBase<TID> | null>;

  // ---------------------------------------------------------------------------
  // Joule escrow storage (Requirement 3.7)
  // Used during the quote → commit / discard lifecycle.
  // TTL is enforced by the store (e.g. MongoDB TTL index on expiresAt).
  // ---------------------------------------------------------------------------

  /**
   * Persist encrypted ciphertext in the escrow store until commit or discard.
   * @param sessionId   Upload session identifier
   * @param ciphertext  AES-GCM encrypted file data
   * @param ttlMs       Time-to-live in milliseconds; store sets expiresAt = now + ttlMs
   */
  storeEscrowData(
    sessionId: string,
    ciphertext: Uint8Array,
    ttlMs: number,
  ): Promise<void>;

  /**
   * Retrieve escrowed ciphertext, or `null` if not found / already expired.
   * @param sessionId Upload session identifier
   */
  getEscrowData(sessionId: string): Promise<Uint8Array | null>;

  /**
   * Delete escrowed ciphertext after commit or discard.
   * No-ops silently if the entry is already absent.
   * @param sessionId Upload session identifier
   */
  deleteEscrowData(sessionId: string): Promise<void>;
}
