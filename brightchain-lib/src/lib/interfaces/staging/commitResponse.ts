/**
 * Response body returned after a successful commit.
 * Contains the permanent file metadata.
 */
export interface ICommitResponse<TId = string> {
  /** Permanent file ID in the vault system */
  fileId: TId;
  /** Vault container the file was stored in */
  vaultContainerId: TId;
  /** Filename in the vault */
  fileName: string;
  /** MIME type of the stored file (may differ from original if processed) */
  mimeType: string;
  /** Size in bytes of the stored file (may differ from original if processed) */
  sizeBytes: number;
}
