import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IFileMetadataBase } from '../bases/file-metadata';
import type { IUploadSessionBase } from '../bases/upload-session';
import type { IUploadCommitResultDTO } from '../dto/uploadCommitResult';
import type { IUploadCostQuoteDTO } from '../dto/uploadCostQuote';
import type {
  IChunkReceipt,
  ICreateNewVersionSessionParams,
  ICreateUploadSessionParams,
  IUploadSessionStatus,
} from '../params/upload-service-params';

/**
 * Service interface for chunked file upload with resume capability.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 8.2
 */
export interface IUploadService<TID extends PlatformID> {
  /** Create a new upload session */
  createSession(
    params: ICreateUploadSessionParams<TID>,
  ): Promise<IUploadSessionBase<TID>>;

  /**
   * Create an upload session for a new version of an existing file.
   * Validates that the MIME type matches the original file.
   * @throws MimeTypeMismatchError if the MIME type differs from the original
   * @throws FileNotFoundError if the file does not exist
   */
  createNewVersionSession(
    params: ICreateNewVersionSessionParams<TID>,
  ): Promise<IUploadSessionBase<TID>>;

  /** Receive and verify a single chunk */
  receiveChunk(
    sessionId: TID,
    chunkIndex: number,
    data: Uint8Array,
    checksum: string,
  ): Promise<IChunkReceipt>;

  /** Finalize: reassemble, encrypt, create vault, store metadata */
  finalize(sessionId: TID): Promise<IFileMetadataBase<TID>>;

  // ---------------------------------------------------------------------------
  // Joule economy: three-phase escrow (Req 3.1–3.6)
  // All three methods are guarded by BURNBAG_JOULE_ENABLED in the implementation.
  // ---------------------------------------------------------------------------

  /**
   * Compute the definitive storage cost for the fully-uploaded file, reserve
   * Joule (1.25× buffer) from the member's L1 account, and return a quote DTO.
   *
   * The quote is valid for `BURNBAG_QUOTE_TTL_MS` (15 minutes).
   * The client MUST call `commit()` or `discard()` before the quote expires.
   *
   * @throws 402 `INSUFFICIENT_JOULE` if balance < upfrontMicroJoules × 1.25
   * @throws 422 `UPLOAD_SESSION_NOT_FOUND` if session does not exist
   * @throws 409 `UPLOAD_SESSION_NOT_UPLOADABLE` if chunks are not complete
   * @throws 503 `FEATURE_DISABLED` if `BURNBAG_JOULE_ENABLED` is false
   */
  quote(sessionId: TID, requestingUserId: string): Promise<IUploadCostQuoteDTO>;

  /**
   * Finalise the upload after a valid quote: write blocks to permanent storage,
   * capture the Joule reservation, create the storage contract, and return the
   * new file's metadata.
   *
   * @throws 409 `UPLOAD_QUOTE_EXPIRED` if the quote has expired or was not issued
   * @throws 422 `UPLOAD_SESSION_NOT_FOUND` if session does not exist
   * @throws 503 `FEATURE_DISABLED` if `BURNBAG_JOULE_ENABLED` is false
   */
  commit(
    sessionId: TID,
    requestingUserId: string,
  ): Promise<IUploadCommitResultDTO<TID>>;

  /**
   * Abandon the upload: release the Joule reservation and delete escrow data.
   *
   * @throws 422 `UPLOAD_SESSION_NOT_FOUND` if session does not exist
   * @throws 503 `FEATURE_DISABLED` if `BURNBAG_JOULE_ENABLED` is false
   */
  discard(sessionId: TID, requestingUserId: string): Promise<void>;

  /** Get session status (for resume) */
  getSessionStatus(sessionId: TID): Promise<IUploadSessionStatus>;

  /** Clean up expired sessions */
  purgeExpiredSessions(): Promise<number>;
}
