/**
 * Response body returned after a successful staging upload.
 * Contains everything the client needs to preview, commit, or discard.
 */
export interface ITempUploadResponse {
  /** The commit token (UUID v4) for this staged file */
  commitToken: string;
  /** URL to preview the staged file */
  previewUrl: string;
  /** ISO 8601 timestamp when the staged file expires */
  expiresAt: string;
  /** Original filename from the upload */
  originalFilename: string;
  /** MIME type of the uploaded file */
  mimeType: string;
  /** File size in bytes */
  sizeBytes: number;
}
