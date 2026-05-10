/**
 * @enum AccessOutcome
 * @description Result of a vault file access attempt, derived from the HTTP
 * response status code after the route handler completes.
 *
 * - success   : The access succeeded (HTTP 2xx).
 * - denied    : The access was denied due to ACL restrictions (HTTP 403).
 * - not_found : The requested file does not exist (HTTP 404).
 * - error     : The access failed due to a server error (HTTP 5xx) or other unexpected status.
 */
export enum AccessOutcome {
  Success = 'success',
  Denied = 'denied',
  NotFound = 'not_found',
  Error = 'error',
}
