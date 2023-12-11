/**
 * Public profile interfaces for the BrightChain identity system.
 *
 * A public profile represents a member's presence in the Public Key
 * Directory. It aggregates the member's display name, public key,
 * verified identity proofs, and optional Ethereum address into a
 * single searchable record. Members may opt out of directory listing
 * via the privacy mode flag.
 *
 * All data interfaces are generic over TId so the same interface
 * can serve as a DTO for React clients (string) and as the concrete
 * type used inside Node services (GuidV4Buffer / Uint8Array).
 *
 * Requirements: 5.1
 */

import { IIdentityProof } from './identityProof';

/**
 * A member's public-facing profile in the Public Key Directory.
 *
 * @remarks
 * The Public Key Directory stores public profiles that can be searched
 * by display name, social username, or member ID (Requirement 5.2).
 * Each profile includes the member's SECP256k1 public key and any
 * verified identity proofs, enabling encrypted communication and
 * cross-platform identity verification.
 *
 * When {@link privacyMode} is `true` the profile is excluded from
 * search results (Requirement 5.9), though it may still be accessed
 * directly by member ID for existing contacts.
 *
 * @example
 * ```typescript
 * const profile: IPublicProfile = {
 *   memberId: 'member-xyz',
 *   displayName: 'Alice',
 *   publicKey: '04abcdef...',
 *   identityProofs: [],
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 *   privacyMode: false,
 * };
 * ```
 */
export interface IPublicProfile<TId = string> {
  /** Unique identifier of the member this profile belongs to */
  memberId: TId;

  /** Human-readable display name shown in directory listings and search results */
  displayName: string;

  /** SECP256k1 public key in hex-encoded format, used for encrypted communication */
  publicKey: string;

  /**
   * Identity proofs linked to this profile.
   * @remarks Only verified proofs are included in search results (Requirement 5.4).
   */
  identityProofs: IIdentityProof<TId>[];

  /**
   * Checksummed Ethereum address (EIP-55) linked to this member's identity.
   * @remarks Populated when the member derives an Ethereum wallet (Requirement 6.6).
   */
  ethereumAddress?: string;

  /** Timestamp when the profile was first created in the directory */
  createdAt: Date;

  /**
   * Timestamp when the profile was last updated.
   * @remarks Updated whenever identity proofs are added or revoked (Requirement 5.8).
   */
  updatedAt: Date;

  /**
   * When `true`, this profile is excluded from directory search results.
   * @remarks Members may toggle this to opt out of public listing (Requirement 5.6).
   */
  privacyMode: boolean;
}
