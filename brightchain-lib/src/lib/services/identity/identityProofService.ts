/**
 * Identity Proof Service for the BrightChain identity system.
 *
 * Creates, verifies, and manages cryptographic identity proofs that link
 * a BrightChain member to external platform accounts (Twitter, GitHub,
 * Reddit, personal websites, and blockchain addresses).
 *
 * Each proof contains a signed statement produced with the member's
 * SECP256k1 private key. Anyone with the member's public key can
 * independently verify the proof without contacting BrightChain.
 *
 * The signed statement format (Requirement 4.8):
 *   "I am {username} on {platform}. My BrightChain ID is {memberId}. Timestamp: {ISO8601}"
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.9
 */

import {
  ECIESService,
  hexToUint8Array,
  Member,
  PlatformID,
  SignatureUint8Array,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { v4 as uuidv4 } from 'uuid';

import { stringToUint8Array } from '../../bufferUtils';
import { ProofPlatform } from '../../enumerations/proofPlatform';
import { VerificationStatus } from '../../enumerations/verificationStatus';
import { IIdentityProof } from '../../interfaces/identity/identityProof';

// ─── Error classes ──────────────────────────────────────────────────────────

/**
 * Error thrown when an unsupported platform is specified.
 */
export class UnsupportedPlatformError extends Error {
  constructor(platform: string) {
    super(`Unsupported proof platform: "${platform}"`);
    this.name = 'UnsupportedPlatformError';
  }
}

/**
 * Error thrown when proof creation fails (e.g. member has no private key).
 */
export class ProofCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProofCreationError';
  }
}

/**
 * Error thrown when proof URL validation fails.
 */
export class ProofUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProofUrlError';
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Set of valid platform values derived from the ProofPlatform enum.
 */
const VALID_PLATFORMS = new Set<string>(Object.values(ProofPlatform));

/**
 * Platform-specific instructions for posting identity proofs.
 *
 * Requirement 4.9: Return instructions for posting the signed statement.
 */
const PLATFORM_INSTRUCTIONS: Readonly<Record<ProofPlatform, string>> = {
  [ProofPlatform.TWITTER]:
    'Post the signed statement as a tweet on Twitter/X and provide the tweet URL.',
  [ProofPlatform.GITHUB]:
    'Create a public GitHub Gist containing the signed statement and provide the Gist URL.',
  [ProofPlatform.REDDIT]:
    'Post the signed statement as a Reddit comment or text post and provide the permalink URL.',
  [ProofPlatform.WEBSITE]:
    'Add the signed statement to a publicly accessible page on your website and provide the page URL.',
  [ProofPlatform.BITCOIN]:
    'Sign a message with your Bitcoin address containing the signed statement and provide a verification URL.',
  [ProofPlatform.ETHEREUM]:
    'Sign a message with your Ethereum address containing the signed statement and provide a verification URL.',
};

/**
 * Default instruction returned for unrecognised platforms.
 */
const DEFAULT_INSTRUCTION =
  'Post the signed statement publicly and provide the URL where it can be verified.';

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Service for creating and verifying cryptographic identity proofs.
 *
 * Identity proofs link a BrightChain member to an external platform
 * account by signing a standardised statement with the member's
 * SECP256k1 private key. The proof can be independently verified by
 * anyone with the member's public key.
 *
 * All methods are static — the service is stateless and safe to call
 * from any context (browser or Node.js).
 *
 * @example
 * ```typescript
 * const eciesService = ServiceProvider.getInstance().eciesService;
 * const member = PaperKeyService.recoverFromPaperKey(paperKey, eciesService);
 *
 * // Create a proof
 * const proof = IdentityProofService.create(member, ProofPlatform.GITHUB, 'octocat');
 *
 * // Verify the proof
 * const isValid = IdentityProofService.verify(proof, member.publicKey, eciesService);
 *
 * // Get posting instructions
 * const instructions = IdentityProofService.getInstructions(ProofPlatform.GITHUB);
 * ```
 */
export class IdentityProofService {
  /**
   * Create a new identity proof by signing a statement with the member's
   * SECP256k1 private key.
   *
   * The signed statement follows the format defined in Requirement 4.8:
   *   "I am {username} on {platform}. My BrightChain ID is {memberId}. Timestamp: {ISO8601}"
   *
   * **Validates: Requirements 4.1, 4.2, 4.3**
   *
   * @param member   - The member creating the proof (must have private key loaded)
   * @param platform - The target platform (must be a valid {@link ProofPlatform} value)
   * @param username - The member's username on the target platform
   * @returns A new {@link IIdentityProof} with status {@link VerificationStatus.PENDING}
   * @throws {UnsupportedPlatformError} If the platform is not a valid {@link ProofPlatform}
   * @throws {ProofCreationError} If the member has no private key loaded
   */
  static create<TID extends PlatformID = Uint8Array>(
    member: Member<TID>,
    platform: ProofPlatform,
    username: string,
  ): IIdentityProof {
    // Validate platform
    if (!VALID_PLATFORMS.has(platform)) {
      throw new UnsupportedPlatformError(platform);
    }

    // Validate member has private key for signing
    if (!member.hasPrivateKey) {
      throw new ProofCreationError(
        'Member must have a private key loaded to create identity proofs',
      );
    }

    // Validate username is non-empty
    if (!username || username.trim().length === 0) {
      throw new ProofCreationError('Username must not be empty');
    }

    const trimmedUsername = username.trim();
    const timestamp = new Date().toISOString();
    const memberId = uint8ArrayToHex(member.idBytes);

    // Requirement 4.8: Signed statement format
    const statement = `I am ${trimmedUsername} on ${platform}. My BrightChain ID is ${memberId}. Timestamp: ${timestamp}`;

    // Requirement 4.3: Sign with SECP256k1 private key
    const statementBytes = stringToUint8Array(statement);
    const signature: SignatureUint8Array = member.sign(statementBytes);
    const signatureHex = uint8ArrayToHex(signature);

    return {
      id: uuidv4(),
      memberId,
      platform,
      username: trimmedUsername,
      proofUrl: '',
      signedStatement: statement,
      signature: signatureHex,
      createdAt: new Date(),
      verificationStatus: VerificationStatus.PENDING,
    };
  }

  /**
   * Verify an identity proof's signature using a public key.
   *
   * Reconstructs the signature from its hex encoding and verifies it
   * against the signed statement using the ECIESService's ECDSA
   * verification.
   *
   * **Validates: Requirement 4.4**
   *
   * @param proof        - The identity proof to verify
   * @param publicKey    - The SECP256k1 public key to verify against (raw bytes)
   * @param eciesService - The ECIES service instance for signature verification
   * @returns `true` if the signature is valid for the given public key
   */
  static verify<TID extends PlatformID = Uint8Array>(
    proof: IIdentityProof,
    publicKey: Uint8Array,
    eciesService: ECIESService<TID>,
  ): boolean {
    try {
      const statementBytes = stringToUint8Array(proof.signedStatement);
      const signatureBytes = hexToUint8Array(
        proof.signature,
      ) as SignatureUint8Array;

      return eciesService.verifyMessage(
        publicKey,
        statementBytes,
        signatureBytes,
      );
    } catch {
      return false;
    }
  }

  /**
   * Check whether a proof URL contains the expected signed statement.
   *
   * Fetches the proof URL and checks that the response body includes
   * the full signed statement text. This is used for initial verification
   * and periodic re-verification (Requirement 4.10).
   *
   * **Validates: Requirement 4.6**
   *
   * @param proof - The identity proof whose URL to check
   * @returns A promise resolving to `true` if the URL is accessible and
   *          contains the signed statement, `false` otherwise
   */
  static async checkProofUrl(proof: IIdentityProof): Promise<boolean> {
    if (!proof.proofUrl || proof.proofUrl.trim().length === 0) {
      return false;
    }

    try {
      const response = await fetch(proof.proofUrl);
      if (!response.ok) {
        return false;
      }
      const content = await response.text();
      return content.includes(proof.signedStatement);
    } catch {
      return false;
    }
  }

  /**
   * Get platform-specific instructions for posting an identity proof.
   *
   * Returns human-readable instructions explaining how to post the
   * signed statement on the specified platform and what URL to provide
   * for verification.
   *
   * **Validates: Requirement 4.9**
   *
   * @param platform - The target platform
   * @returns Instructions string for the specified platform, or a generic
   *          fallback for unrecognised platforms
   */
  static getInstructions(platform: ProofPlatform | string): string {
    if (VALID_PLATFORMS.has(platform)) {
      return PLATFORM_INSTRUCTIONS[platform as ProofPlatform];
    }
    return DEFAULT_INSTRUCTION;
  }

  /**
   * Build the signed statement string for a given set of parameters.
   *
   * This is a utility method that produces the statement text without
   * signing it. Useful for previewing the statement before creation.
   *
   * @param username  - The member's username on the target platform
   * @param platform  - The target platform
   * @param memberId  - The member's hex-encoded ID
   * @param timestamp - ISO 8601 timestamp string
   * @returns The formatted statement string per Requirement 4.8
   */
  static buildStatement(
    username: string,
    platform: ProofPlatform | string,
    memberId: string,
    timestamp: string,
  ): string {
    return `I am ${username} on ${platform}. My BrightChain ID is ${memberId}. Timestamp: ${timestamp}`;
  }
}
