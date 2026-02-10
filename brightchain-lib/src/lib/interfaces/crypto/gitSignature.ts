/**
 * Git signature interfaces for the BrightChain identity system.
 *
 * Defines the data structures for Git commit/tag signing, signature
 * verification, and public key export. All interfaces are generic
 * over TId for frontend/backend DTO compatibility.
 *
 * Requirements: 7.8
 */

/**
 * Represents a Git signing key pair derived from a BrightChain member identity.
 *
 * @example
 * ```typescript
 * const gitKey: IGitSignature = {
 *   memberId: 'member-xyz',
 *   publicKeyHex: '03abcdef...',
 *   fingerprint: 'a1b2c3d4...',
 *   derivationPath: "m/44'/60'/0'/2/0",
 *   createdAt: new Date(),
 * };
 * ```
 */
export interface IGitSignature<TId = string> {
  /** The member this signing key belongs to */
  memberId: TId;

  /** Compressed SECP256k1 public key (33 bytes, hex-encoded) */
  publicKeyHex: string;

  /** Key fingerprint (SHA-256 of public key, first 20 bytes, hex) */
  fingerprint: string;

  /** BIP44 derivation path used to derive this key */
  derivationPath: string;

  /** When the signing key was first derived */
  createdAt: Date;

  /** Optional label for the signing key */
  label?: string;

  /** Whether this key has been revoked */
  revoked?: boolean;

  /** When the key was revoked, if applicable */
  revokedAt?: Date;
}

/**
 * Represents a signed Git commit or tag with full metadata.
 */
export interface IGitSignedObject<TId = string> {
  /** The member who signed the object */
  memberId: TId;

  /** Type of Git object that was signed */
  objectType: 'commit' | 'tag';

  /** SHA-256 hash of the signed content (hex) */
  contentHashHex: string;

  /** PGP-armored signature block */
  armoredSignature: string;

  /** Raw ECDSA signature (hex) */
  signatureHex: string;

  /** BIP44 derivation path used for signing */
  derivationPath: string;

  /** When the object was signed */
  signedAt: Date;
}

/**
 * Represents an exported Git signing public key in PGP-compatible format.
 */
export interface IGitPublicKeyExport<TId = string> {
  /** The member this key belongs to */
  memberId: TId;

  /** PGP-armored public key block */
  armoredPublicKey: string;

  /** Compressed SECP256k1 public key (hex) */
  publicKeyHex: string;

  /** Key fingerprint (SHA-256 of public key, first 20 bytes, hex) */
  fingerprint: string;

  /** BIP44 derivation path */
  derivationPath: string;

  /** When the key was exported */
  exportedAt: Date;
}

/**
 * Represents the result of verifying a Git signature.
 */
export interface IGitVerificationResult<TId = string> {
  /** Whether the signature is valid */
  valid: boolean;

  /** The member who signed (if verification succeeded) */
  signerId?: TId;

  /** The public key used for verification (hex) */
  publicKeyHex: string;

  /** Key fingerprint */
  fingerprint: string;

  /** Error message if verification failed */
  error?: string;

  /** When the verification was performed */
  verifiedAt: Date;
}
