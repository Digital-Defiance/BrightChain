/**
 * Details of a single encrypted block including the ephemeral public key.
 *
 * Uses Uint8Array for browser compatibility (Requirement 18.6).
 */
export interface ISingleEncryptedBlockDetails {
  encryptedData: Uint8Array;
  ephemeralPublicKey: Uint8Array;
}
