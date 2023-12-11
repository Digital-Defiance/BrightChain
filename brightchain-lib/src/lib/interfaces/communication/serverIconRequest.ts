/**
 * Request body for the server icon upload endpoint.
 * The frontend stages the file via /api/temp-upload first,
 * then passes the commit token here.
 *
 * Requirements: 2.1, 2.8
 */
export interface IServerIconUploadRequest {
  /** Commit token from the staging system */
  commitToken: string;
}
