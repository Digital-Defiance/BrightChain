/**
 * Typed error structure returned by the BrightPass API on failure responses.
 */
export interface IBrightPassError {
  /** Machine-readable error code (e.g. 'UNAUTHORIZED', 'NOT_FOUND'). */
  code: string;
  /** Human-readable error message. */
  message: string;
  /** Optional additional details about the error. */
  details?: Record<string, unknown>;
}
