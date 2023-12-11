/**
 * @fileoverview IMembershipProofService interface.
 *
 * Generates and verifies ring signatures proving BrightTrust membership
 * without revealing which specific member created the content.
 *
 * @see Requirements 18
 */

import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Interface for ring signature membership proof generation and verification.
 *
 * Anonymous content carries a ring signature proving the creator is one
 * of the current BrightTrust members without revealing which one. The proof
 * is bound to the specific content hash, preventing reuse across content.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface IMembershipProofService<TID extends PlatformID = Uint8Array> {
  /**
   * Generate a ring signature proving the signer is one of the current BrightTrust members.
   * The proof is bound to the specific content hash.
   * @param signerPrivateKey - The signer's private key
   * @param memberPublicKeys - Public keys of all current BrightTrust members
   * @param contentHash - Hash of the content being signed
   * @returns The ring signature proof bytes
   */
  generateProof(
    signerPrivateKey: Uint8Array,
    memberPublicKeys: Uint8Array[],
    contentHash: Uint8Array,
  ): Promise<Uint8Array>;

  /**
   * Verify a membership proof against the current member set and content hash.
   * @param proof - The ring signature proof to verify
   * @param memberPublicKeys - Public keys of all current BrightTrust members
   * @param contentHash - Hash of the content the proof should be bound to
   * @returns True if the proof is valid
   */
  verifyProof(
    proof: Uint8Array,
    memberPublicKeys: Uint8Array[],
    contentHash: Uint8Array,
  ): Promise<boolean>;

  /** Generic marker for DTO compatibility */
  _platformId?: TID;
}
