import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * The result of computing a work unit, returned by the client.
 *
 * @template TID - Platform ID type. Defaults to string for JSON/frontend.
 */
export interface IWorkResult<TID extends PlatformID = string> {
  /** The work unit ID this result corresponds to */
  workUnitId: string;
  /** The computed SHA3-512 hash as a lowercase hex string (128 chars) */
  resultHash: string;
  /** The challenge token from the original work unit */
  challengeToken: string;
  /** Client-reported computation time in milliseconds */
  computeTimeMs: number;
  /** ISO 8601 timestamp when the client completed computation */
  completedAt: string;
}
