import type { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IFileMetadataBase } from '../bases/file-metadata';

/**
 * Response DTO returned by `UploadService.commit()` on success (HTTP 201).
 *
 * All bigint fields are serialised as decimal strings for JSON safety.
 *
 * Requirement 3.4 — commit response shape
 */
export interface IUploadCommitResultDTO<TID extends PlatformID = string> {
  /** Permanent file ID assigned after blocks are written to the store. */
  fileId: string;
  /** Full metadata record for the committed file. */
  metadata: IFileMetadataBase<TID>;
}
