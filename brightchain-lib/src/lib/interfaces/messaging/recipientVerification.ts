/**
 * Local recipient verification types.
 *
 * Defines the IRecipientVerificationResult interface returned by the
 * verify-recipient endpoint, plus rate-limit constants. Shared between
 * frontend and backend via brightchain-lib.
 *
 * @see Requirements 8.7, 8.8
 * @module recipientVerification
 */

/**
 * Response shape for the local recipient verification endpoint.
 * Defined in brightchain-lib so both frontend and backend share the type.
 */
export interface IRecipientVerificationResult {
  /** The username (local part) that was checked. */
  username: string;
  /** Whether a member with this username exists on the local domain. */
  exists: boolean;
}

/** Max verification requests per authenticated user per minute. */
export const RECIPIENT_VERIFY_RATE_LIMIT = 10;

/** Sliding window duration for the per-user rate limit (1 minute). */
export const RECIPIENT_VERIFY_WINDOW_MS = 60_000;
