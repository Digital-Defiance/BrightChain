/**
 * Components of a derived data key.
 *
 * Uses Uint8Array for browser compatibility (Requirement 18.6).
 */
export interface IDataKeyComponents {
  salt: Uint8Array;
  iterations: number;
  data: Uint8Array;
}
