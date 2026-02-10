/**
 * Identity proof interfaces for the BrightChain identity system.
 *
 * Identity proofs cryptographically link a BrightChain member to an
 * external platform account (e.g. Twitter, GitHub, a personal website,
 * or a blockchain address). Each proof contains a signed statement
 * that can be independently verified by anyone with the member's
 * public key.
 *
 * All data interfaces are generic over TId so the same interface
 * can serve as a DTO for React clients (string) and as the concrete
 * type used inside Node services (GuidV4Buffer / Uint8Array).
 *
 * Requirements: 4.5
 */

import { ProofPlatform } from '../../enumerations/proofPlatform';
import { VerificationStatus } from '../../enumerations/verificationStatus';

/**
 * Metadata and cryptographic data for a single identity proof.
 *
 * @remarks
 * An identity proof is created when a member signs a statement claiming
 * ownership of an external account. The signed statement is posted
 * publicly on the target platform, and the proof URL points to that
 * posting. The system periodically re-verifies proofs by fetching the
 * URL and checking that the signed statement is still present
 * (Requirement 4.10).
 *
 * @example
 * ```typescript
 * const proof: IIdentityProof = {
 *   id: 'proof-abc-123',
 *   memberId: 'member-xyz',
 *   platform: ProofPlatform.GITHUB,
 *   username: 'octocat',
 *   proofUrl: 'https://gist.github.com/octocat/abc123',
 *   signedStatement: 'I am octocat on github. My BrightChain ID is member-xyz. Timestamp: 2024-01-01T00:00:00.000Z',
 *   signature: '304402...',
 *   createdAt: new Date(),
 *   verifiedAt: new Date(),
 *   verificationStatus: VerificationStatus.VERIFIED,
 * };
 * ```
 */
export interface IIdentityProof<TId = string> {
  /** Unique identifier for this identity proof record */
  id: TId;

  /** Identifier of the member who created this proof */
  memberId: TId;

  /** The external platform this proof targets */
  platform: ProofPlatform;

  /** The member's username on the external platform */
  username: string;

  /**
   * URL where the signed statement has been posted publicly.
   * @remarks Empty string until the member provides the URL after posting.
   */
  proofUrl: string;

  /**
   * The plaintext statement that was signed.
   * @remarks Format: "I am {username} on {platform}. My BrightChain ID is {memberId}. Timestamp: {ISO8601}"
   * per Requirement 4.8.
   */
  signedStatement: string;

  /**
   * ECDSA signature of the signed statement (hex-encoded).
   * @remarks Produced using the member's SECP256k1 private key per Requirement 4.3.
   */
  signature: string;

  /** Timestamp when the proof was created */
  createdAt: Date;

  /**
   * Timestamp when the proof was last successfully verified.
   * @remarks Set when the proof URL is fetched and the signed statement is found.
   */
  verifiedAt?: Date;

  /**
   * Timestamp when the proof was revoked by the member.
   * @remarks Once revoked, the proof is no longer considered valid.
   */
  revokedAt?: Date;

  /**
   * Timestamp when the proof URL was last checked for validity.
   * @remarks Updated by the periodic re-verification process (Requirement 4.10).
   */
  lastCheckedAt?: Date;

  /** Current verification lifecycle state of this proof */
  verificationStatus: VerificationStatus;
}
