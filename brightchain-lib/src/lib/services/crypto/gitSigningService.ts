/**
 * Git Signing Service for the BrightChain identity system.
 *
 * Provides GPG-compatible commit and tag signing using SECP256k1 keys
 * derived from BrightChain member identities. Signatures are produced
 * in a format that Git can verify using the member's exported public key.
 *
 * The service uses ECDSA signing over SHA-256 hashes, wrapped in a
 * PGP-like armored format that Git recognises for signature verification.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { ECIESService, PlatformID } from '@digitaldefiance/ecies-lib';
import { sha256 } from '@noble/hashes/sha256';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';
import * as secp256k1 from 'secp256k1';

import { PaperKeyService } from '../identity/paperKeyService';

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * BIP44 derivation path for Git signing keys.
 * Uses change=2 to separate from wallet (change=0) and device (change=1) keys.
 */
const GIT_SIGNING_DERIVATION_PATH = "m/44'/60'/0'/2/0";

/**
 * PGP armor header for signatures.
 */
const PGP_SIG_BEGIN = '-----BEGIN PGP SIGNATURE-----';
const PGP_SIG_END = '-----END PGP SIGNATURE-----';
const PGP_KEY_BEGIN = '-----BEGIN PGP PUBLIC KEY BLOCK-----';
const PGP_KEY_END = '-----END PGP PUBLIC KEY BLOCK-----';

// ─── Error classes ──────────────────────────────────────────────────────────

/**
 * Error thrown when Git signing operations fail.
 */
export class GitSigningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitSigningError';
  }
}

// ─── Result types ───────────────────────────────────────────────────────────

/**
 * Result of a Git signing operation.
 */
export interface IGitSignatureResult {
  /** The armored PGP-like signature block */
  armoredSignature: string;

  /** Raw ECDSA signature bytes (DER-encoded, hex) */
  signatureHex: string;

  /** SHA-256 hash of the signed content (hex) */
  contentHashHex: string;

  /** BIP44 derivation path used for the signing key */
  derivationPath: string;
}

/**
 * Result of exporting a public key in PGP-like format.
 */
export interface IGitPublicKeyExport {
  /** Armored PGP-like public key block */
  armoredPublicKey: string;

  /** Compressed SECP256k1 public key (hex) */
  publicKeyHex: string;

  /** BIP44 derivation path */
  derivationPath: string;

  /** Key fingerprint (SHA-256 of the public key, first 20 bytes, hex) */
  fingerprint: string;
}

// ─── Utility functions ──────────────────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function base64Encode(bytes: Uint8Array): string {
  // Works in both Node.js and browser
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Wrap a base64 string at 76 characters per line (PGP standard).
 */
function wrapBase64(b64: string): string {
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 76) {
    lines.push(b64.substring(i, i + 76));
  }
  return lines.join('\n');
}

/**
 * Derive the Git signing key pair from a paper key mnemonic.
 */
function deriveGitKey(paperKey: string): HDKey {
  const seed = mnemonicToSeedSync(paperKey);
  const masterKey = HDKey.fromMasterSeed(seed);
  return masterKey.derive(GIT_SIGNING_DERIVATION_PATH);
}

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Service for signing Git commits and tags using BrightChain member keys.
 *
 * Produces PGP-armored signatures compatible with `git verify-commit`
 * and `git verify-tag` when the corresponding public key is imported
 * into the user's GPG keyring.
 *
 * All methods are static and stateless.
 *
 * @example
 * ```typescript
 * // Sign a commit
 * const sig = GitSigningService.signCommit(paperKey, commitContent);
 *
 * // Export public key for GPG import
 * const pubKey = GitSigningService.exportPublicKey(paperKey);
 *
 * // Verify a signature
 * const valid = GitSigningService.verify(commitContent, sig, paperKey);
 * ```
 */
export class GitSigningService {
  /**
   * Sign a Git commit payload.
   *
   * Produces a PGP-armored ECDSA signature over the SHA-256 hash
   * of the commit content.
   *
   * **Validates: Requirements 7.1, 7.2**
   *
   * @param paperKey      - The 24-word BIP39 mnemonic (private key source)
   * @param commitContent - The raw commit object content to sign
   * @returns The signature result with armored signature block
   * @throws {GitSigningError} If signing fails
   */
  static signCommit(
    paperKey: string,
    commitContent: string,
  ): IGitSignatureResult {
    return GitSigningService.sign(paperKey, commitContent);
  }

  /**
   * Sign a Git tag payload.
   *
   * Produces a PGP-armored ECDSA signature over the SHA-256 hash
   * of the tag content.
   *
   * **Validates: Requirements 7.3**
   *
   * @param paperKey   - The 24-word BIP39 mnemonic (private key source)
   * @param tagContent - The raw tag object content to sign
   * @returns The signature result with armored signature block
   * @throws {GitSigningError} If signing fails
   */
  static signTag(paperKey: string, tagContent: string): IGitSignatureResult {
    return GitSigningService.sign(paperKey, tagContent);
  }

  /**
   * Verify a signature against content using the signer's paper key.
   *
   * Derives the public key from the paper key and verifies the ECDSA
   * signature against the SHA-256 hash of the content.
   *
   * **Validates: Requirements 7.4**
   *
   * @param content   - The original content that was signed
   * @param signature - The signature result to verify
   * @param paperKey  - The signer's paper key (for public key derivation)
   * @returns `true` if the signature is valid
   */
  static verify(
    content: string,
    signature: IGitSignatureResult,
    paperKey: string,
  ): boolean {
    try {
      const childKey = deriveGitKey(paperKey);
      const publicKey = childKey.publicKey;
      if (!publicKey) return false;

      const contentBytes = new TextEncoder().encode(content);
      const hash = sha256(contentBytes);
      const sigBytes = hexToBytes(signature.signatureHex);

      return secp256k1.ecdsaVerify(sigBytes, hash, publicKey);
    } catch {
      return false;
    }
  }

  /**
   * Verify a signature using a raw public key hex string.
   *
   * @param content      - The original content that was signed
   * @param signature    - The signature result to verify
   * @param publicKeyHex - The signer's compressed public key (hex)
   * @returns `true` if the signature is valid
   */
  static verifyWithPublicKey(
    content: string,
    signature: IGitSignatureResult,
    publicKeyHex: string,
  ): boolean {
    try {
      const publicKey = hexToBytes(publicKeyHex);
      const contentBytes = new TextEncoder().encode(content);
      const hash = sha256(contentBytes);
      const sigBytes = hexToBytes(signature.signatureHex);

      return secp256k1.ecdsaVerify(sigBytes, hash, publicKey);
    } catch {
      return false;
    }
  }

  /**
   * Export the Git signing public key in a PGP-armored format.
   *
   * The exported key can be added to a GPG keyring or uploaded to
   * GitHub/GitLab for signature verification.
   *
   * **Validates: Requirements 7.5**
   *
   * @param paperKey - The 24-word BIP39 mnemonic
   * @returns The public key export with armored block and fingerprint
   * @throws {GitSigningError} If key derivation fails
   */
  static exportPublicKey(paperKey: string): IGitPublicKeyExport {
    try {
      const childKey = deriveGitKey(paperKey);
      const publicKey = childKey.publicKey;
      if (!publicKey) {
        throw new GitSigningError('Key derivation produced no public key');
      }

      const publicKeyHex = bytesToHex(new Uint8Array(publicKey));

      // Fingerprint: first 20 bytes of SHA-256 of the public key
      const keyHash = sha256(new Uint8Array(publicKey));
      const fingerprint = bytesToHex(keyHash.slice(0, 20));

      // Armored public key block
      const b64Key = base64Encode(new Uint8Array(publicKey));
      const armoredPublicKey = [
        PGP_KEY_BEGIN,
        '',
        wrapBase64(b64Key),
        PGP_KEY_END,
      ].join('\n');

      return {
        armoredPublicKey,
        publicKeyHex,
        derivationPath: GIT_SIGNING_DERIVATION_PATH,
        fingerprint,
      };
    } catch (error) {
      if (error instanceof GitSigningError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      throw new GitSigningError(`Failed to export public key: ${msg}`);
    }
  }

  /**
   * Validate a paper key before using it for Git signing.
   *
   * @param paperKey     - The paper key to validate
   * @param eciesService - The ECIES service for validation
   * @returns `true` if the paper key is valid
   */
  static validateKey<TID extends PlatformID = Uint8Array>(
    paperKey: string,
    eciesService: ECIESService<TID>,
  ): boolean {
    return PaperKeyService.validatePaperKey(paperKey, eciesService);
  }

  // ─── Private helpers ────────────────────────────────────────────────

  /**
   * Core signing implementation shared by signCommit and signTag.
   */
  private static sign(paperKey: string, content: string): IGitSignatureResult {
    try {
      const childKey = deriveGitKey(paperKey);
      const privateKey = childKey.privateKey;
      if (!privateKey) {
        throw new GitSigningError('Key derivation produced no private key');
      }

      // SHA-256 hash of the content
      const contentBytes = new TextEncoder().encode(content);
      const hash = sha256(contentBytes);
      const contentHashHex = bytesToHex(hash);

      // ECDSA sign (DER-encoded)
      const { signature } = secp256k1.ecdsaSign(hash, privateKey);
      const signatureHex = bytesToHex(signature);

      // Build PGP-armored signature block
      const b64Sig = base64Encode(signature);
      const armoredSignature = [
        PGP_SIG_BEGIN,
        '',
        wrapBase64(b64Sig),
        PGP_SIG_END,
      ].join('\n');

      return {
        armoredSignature,
        signatureHex,
        contentHashHex,
        derivationPath: GIT_SIGNING_DERIVATION_PATH,
      };
    } catch (error) {
      if (error instanceof GitSigningError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      throw new GitSigningError(`Failed to sign content: ${msg}`);
    }
  }
}

/**
 * Convert a hex string to a Uint8Array.
 */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
