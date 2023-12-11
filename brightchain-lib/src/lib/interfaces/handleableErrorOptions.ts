/**
 * Options for creating a handleable error
 *
 * @remarks
 * This interface defines the structure for errors that can be handled
 * gracefully by the application, including HTTP status codes and
 * source data for debugging.
 *
 * @example
 * ```typescript
 * const errorOptions: HandleableErrorOptions = {
 *   cause: new Error('Database connection failed'),
 *   handled: false,
 *   statusCode: 500,
 *   sourceData: { query: 'SELECT * FROM users' }
 * };
 * ```
 */
export interface HandleableErrorOptions {
  /** The underlying error that caused this handleable error */
  cause: Error;

  /** Whether this error has been handled by error handling middleware */
  handled: boolean;

  /** HTTP status code associated with this error (e.g., 404, 500) */
  statusCode: number;

  /**
   * Source data related to the error for debugging purposes
   * @remarks May contain request data, query parameters, etc.
   */
  sourceData: unknown;
}
