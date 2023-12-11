/**
 * GPG (OpenPGP) key interfaces for BrightMail encryption.
 *
 * These interfaces define the data structures for GPG key management,
 * encryption results, signature results, and verification results
 * used throughout the messaging system.
 *
 * @see Requirements 1.1, 1.3, 4.1, 5.3
 */

/**
 * Metadata for a GPG (OpenPGP) key.
 *
 * Contains identifying information extracted from an OpenPGP key,
 * including the key ID, fingerprint, creation/expiration dates,
 * the associated user ID string, and the cryptographic algorithm.
 *
 * @see Requirement 1.3 — Key metadata display (key ID, fingerprint, creation date, user ID)
 */
export interface IGpgKeyMetadata {
  /** Short key ID (last 16 hex characters of the fingerprint) */
  keyId: string;

  /** Full key fingerprint (40 hex characters for v4 keys) */
  fingerprint: string;

  /** Date the key was created */
  createdAt: Date;

  /** Date the key expires, or null if it does not expire */
  expiresAt: Date | null;

  /** User ID string in the format "Display Name <email@example.com>" */
  userId: string;

  /** Cryptographic algorithm used (e.g., "rsa4096", "ed25519") */
  algorithm: string;
}

/**
 * A GPG keypair consisting of ASCII-armored public and private keys
 * along with associated metadata.
 *
 * @remarks
 * The private key is stored in ASCII-armored format and should be
 * encrypted at rest before persistence to the key store.
 *
 * @see Requirement 1.1 — GPG keypair generation
 */
export interface IGpgKeyPair {
  /** ASCII-armored PGP public key block */
  publicKeyArmored: string;

  /** ASCII-armored PGP private key block (encrypted at rest before storage) */
  privateKeyArmored: string;

  /** Metadata extracted from the generated keypair */
  metadata: IGpgKeyMetadata;
}

/**
 * Result of a GPG encryption operation.
 *
 * Contains the encrypted message in ASCII-armored OpenPGP format
 * conforming to RFC 4880.
 *
 * @see Requirement 1.1 — GPG encryption output
 */
export interface IGpgEncryptionResult {
  /** ASCII-armored OpenPGP encrypted message */
  encryptedMessage: string;
}

/**
 * Result of a GPG signing operation.
 *
 * Contains the detached ASCII-armored signature and the key ID
 * of the signing key.
 *
 * @see Requirement 4.1 — Detached OpenPGP signature production
 */
export interface IGpgSignatureResult {
  /** Detached ASCII-armored OpenPGP signature */
  signature: string;

  /** Key ID of the key used to produce the signature */
  signerKeyId: string;
}

/**
 * Result of a GPG signature verification operation.
 *
 * Indicates whether the signature is valid, and optionally provides
 * the signer's key ID and a reason string for failures.
 *
 * @see Requirement 5.3 — Verification result with signer key ID and valid status
 */
export interface IGpgVerificationResult {
  /** Whether the signature is valid */
  valid: boolean;

  /** Key ID of the signer, if verification succeeded or the key was identified */
  signerKeyId?: string;

  /** Human-readable reason for verification failure */
  reason?: string;
}
