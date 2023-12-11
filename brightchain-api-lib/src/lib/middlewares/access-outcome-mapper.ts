import { AccessOutcome } from '@brightchain/digitalburnbag-lib';

/**
 * Maps an HTTP response status code to an AccessOutcome.
 *
 * - 2xx → Success
 * - 403 → Denied
 * - 404 → NotFound
 * - 5xx → Error
 * - All others → Error (conservative default)
 */
export function mapStatusToOutcome(statusCode: number): AccessOutcome {
  if (statusCode >= 200 && statusCode < 300) {
    return AccessOutcome.Success;
  }
  if (statusCode === 403) {
    return AccessOutcome.Denied;
  }
  if (statusCode === 404) {
    return AccessOutcome.NotFound;
  }
  if (statusCode >= 500 && statusCode < 600) {
    return AccessOutcome.Error;
  }
  // All other status codes (1xx, 3xx, 4xx except 403/404) → Error
  return AccessOutcome.Error;
}
