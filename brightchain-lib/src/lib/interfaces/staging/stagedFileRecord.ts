/**
 * Metadata tracked for each staged file.
 * Persisted as a JSON sidecar file alongside the staged file bytes.
 *
 * TId defaults to string for frontend, GuidV4Buffer for backend.
 */
export interface IStagedFileRecord<TId = string> {
  /** Cryptographically random UUID v4 — acts as both ID and bearer credential */
  commitToken: string;
  /** Original filename from the upload */
  originalFilename: string;
  /** MIME type of the uploaded file */
  mimeType: string;
  /** File size in bytes */
  sizeBytes: number;
  /** ISO 8601 timestamp of when the file was staged */
  uploadedAt: Date | string;
  /** ISO 8601 timestamp of when the staged file expires */
  expiresAt: Date | string;
  /** ID of the user who uploaded the file */
  uploaderId: TId;
}
