import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Decoded challenge token structure.
 * The token is transmitted as a base64-encoded HMAC-signed JSON string.
 *
 * @template TID - Platform ID type. Defaults to string for JSON/frontend.
 */
export interface IChallengeToken<TID extends PlatformID = string> {
  /** The work unit this token is bound to */
  workUnitId: string;
  /** The client identifier this token is bound to */
  clientId: string;
  /** Issuance timestamp (Unix epoch ms) */
  issuedAt: number;
  /** Expiration timestamp (Unix epoch ms) */
  expiresAt: number;
  /** HMAC-SHA3-512 signature of the above fields */
  signature: string;
}
