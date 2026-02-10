/**
 * Ethereum Wallet Service for the BrightChain identity system.
 *
 * Derives Ethereum addresses from BrightChain member identities using
 * BIP44 hierarchical deterministic derivation. Provides message signing
 * and signature verification for dApp authentication and transaction
 * signing.
 *
 * Derivation path: m/44'/60'/0'/0/0 (BIP44 standard for Ethereum)
 * - purpose = 44 (BIP44)
 * - coin_type = 60 (Ethereum)
 * - account = 0 (default account)
 * - change = 0 (external chain — wallet addresses)
 * - index = 0 (first address)
 *
 * Requirements: 6.1, 6.2, 6.3, 6.7, 6.8
 */

import { ECIESService, PlatformID } from '@digitaldefiance/ecies-lib';
import { keccak_256 } from '@noble/hashes/sha3';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';
import * as secp256k1 from 'secp256k1';

import { PaperKeyService } from '../identity/paperKeyService';

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * BIP44 derivation path for Ethereum wallets.
 * m / 44' / 60' / 0' / 0 / 0
 */
const ETH_DERIVATION_PATH = "m/44'/60'/0'/0/0";

/**
 * Ethereum signed message prefix per EIP-191.
 */
const ETH_MESSAGE_PREFIX = '\x19Ethereum Signed Message:\n';

// ─── Error classes ──────────────────────────────────────────────────────────

/**
 * Error thrown when Ethereum address derivation fails.
 */
export class EthereumDerivationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EthereumDerivationError';
  }
}

/**
 * Error thrown when message signing fails.
 */
export class EthereumSigningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EthereumSigningError';
  }
}

// ─── Result types ───────────────────────────────────────────────────────────

/**
 * Result of Ethereum address derivation.
 */
export interface IEthereumAddressResult {
  /** EIP-55 checksummed Ethereum address */
  address: string;

  /** Uncompressed SECP256k1 public key (65 bytes, hex-encoded) */
  publicKeyHex: string;

  /** BIP44 derivation path used */
  derivationPath: string;
}

/**
 * Result of an Ethereum message signature.
 */
export interface IEthereumSignatureResult {
  /** The original message that was signed */
  message: string;

  /** The ECDSA signature (hex-encoded, 65 bytes: r + s + v) */
  signature: string;

  /** Recovery parameter (0 or 1) */
  recoveryParam: number;
}

// ─── Utility functions ──────────────────────────────────────────────────────

/**
 * Convert a byte array to a hex string (no 0x prefix).
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert a hex string (with or without 0x prefix) to a byte array.
 */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Derive an Ethereum address from an uncompressed public key.
 *
 * Takes the last 20 bytes of the keccak256 hash of the public key
 * (without the 0x04 prefix byte), then applies EIP-55 checksum encoding.
 *
 * @param uncompressedPublicKey - 65-byte uncompressed SECP256k1 public key
 * @returns EIP-55 checksummed Ethereum address
 */
function publicKeyToAddress(uncompressedPublicKey: Uint8Array): string {
  // Remove the 0x04 prefix (first byte) from uncompressed key
  const keyWithoutPrefix = uncompressedPublicKey.slice(1);

  // Keccak-256 hash of the public key bytes
  const hash = keccak_256(keyWithoutPrefix);

  // Take the last 20 bytes as the raw address
  const rawAddress = bytesToHex(hash.slice(12));

  // Apply EIP-55 checksum
  return toChecksumAddress(rawAddress);
}

/**
 * Apply EIP-55 mixed-case checksum encoding to an Ethereum address.
 *
 * @param address - Lowercase hex address (without 0x prefix)
 * @returns Checksummed address with 0x prefix
 */
function toChecksumAddress(address: string): string {
  const lower = address.toLowerCase();
  const hash = bytesToHex(keccak_256(new TextEncoder().encode(lower)));

  let checksummed = '0x';
  for (let i = 0; i < lower.length; i++) {
    const char = lower[i];
    // If the corresponding nibble of the hash is >= 8, uppercase the char
    if (parseInt(hash[i], 16) >= 8) {
      checksummed += char.toUpperCase();
    } else {
      checksummed += char;
    }
  }
  return checksummed;
}

/**
 * Validate an EIP-55 checksummed Ethereum address.
 *
 * @param address - The address to validate (with 0x prefix)
 * @returns `true` if the address has a valid EIP-55 checksum
 */
function isValidChecksumAddress(address: string): boolean {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return false;

  const stripped = address.slice(2);
  const lower = stripped.toLowerCase();
  const hash = bytesToHex(keccak_256(new TextEncoder().encode(lower)));

  for (let i = 0; i < 40; i++) {
    const hashNibble = parseInt(hash[i], 16);
    if (hashNibble >= 8 && stripped[i] !== stripped[i].toUpperCase()) {
      return false;
    }
    if (hashNibble < 8 && stripped[i] !== stripped[i].toLowerCase()) {
      return false;
    }
  }
  return true;
}

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Service for deriving Ethereum wallets from BrightChain member identities
 * and performing Ethereum-compatible message signing.
 *
 * All methods are static — the service is stateless and safe to call
 * from any context (browser or Node.js).
 *
 * @example
 * ```typescript
 * const eciesService = ServiceProvider.getInstance().eciesService;
 *
 * // Derive Ethereum address from paper key
 * const result = EthereumWalletService.deriveAddress(paperKey);
 * console.log(result.address); // 0x1234...abcd (EIP-55 checksummed)
 *
 * // Sign a message
 * const sig = EthereumWalletService.signMessage(paperKey, 'Hello World');
 *
 * // Verify the signature
 * const valid = EthereumWalletService.verifySignature(
 *   'Hello World',
 *   sig.signature,
 *   result.address,
 * );
 * ```
 */
export class EthereumWalletService {
  /**
   * Derive an Ethereum address from a BIP39 mnemonic paper key.
   *
   * Uses BIP44 path m/44'/60'/0'/0/0 to derive the first Ethereum
   * address. The address is returned in EIP-55 checksummed format.
   *
   * **Validates: Requirements 6.1, 6.4**
   *
   * @param paperKey - The 24-word BIP39 mnemonic
   * @returns The derived Ethereum address, public key, and derivation path
   * @throws {EthereumDerivationError} If derivation fails
   */
  static deriveAddress(paperKey: string): IEthereumAddressResult {
    try {
      const seed = mnemonicToSeedSync(paperKey);
      const masterKey = HDKey.fromMasterSeed(seed);
      const childKey = masterKey.derive(ETH_DERIVATION_PATH);

      const compressedPublicKey = childKey.publicKey;
      if (!compressedPublicKey) {
        throw new EthereumDerivationError(
          'BIP32 derivation produced no public key',
        );
      }

      // Convert compressed to uncompressed public key for address derivation
      const uncompressed = secp256k1.publicKeyConvert(
        compressedPublicKey,
        false,
      );

      const address = publicKeyToAddress(uncompressed);

      return {
        address,
        publicKeyHex: bytesToHex(uncompressed),
        derivationPath: ETH_DERIVATION_PATH,
      };
    } catch (error) {
      if (error instanceof EthereumDerivationError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      throw new EthereumDerivationError(
        `Failed to derive Ethereum address: ${msg}`,
      );
    }
  }

  /**
   * Derive an Ethereum address from a paper key after validating it.
   *
   * Convenience method that validates the paper key before derivation.
   *
   * @param paperKey     - The 24-word BIP39 mnemonic
   * @param eciesService - The ECIES service for paper key validation
   * @returns The derived Ethereum address result
   * @throws {EthereumDerivationError} If the paper key is invalid or derivation fails
   */
  static deriveAddressFromValidatedKey<TID extends PlatformID = Uint8Array>(
    paperKey: string,
    eciesService: ECIESService<TID>,
  ): IEthereumAddressResult {
    if (!PaperKeyService.validatePaperKey(paperKey, eciesService)) {
      throw new EthereumDerivationError('Invalid paper key');
    }
    return EthereumWalletService.deriveAddress(paperKey);
  }

  /**
   * Sign a message using the Ethereum personal_sign format (EIP-191).
   *
   * Prepends the standard Ethereum message prefix before signing,
   * making the signature compatible with MetaMask's personal_sign
   * and web3.eth.personal.sign.
   *
   * **Validates: Requirements 6.2, 6.3**
   *
   * @param paperKey - The 24-word BIP39 mnemonic (private key source)
   * @param message  - The message to sign
   * @returns The signature result with hex-encoded signature and recovery param
   * @throws {EthereumSigningError} If signing fails
   */
  static signMessage(
    paperKey: string,
    message: string,
  ): IEthereumSignatureResult {
    try {
      const seed = mnemonicToSeedSync(paperKey);
      const masterKey = HDKey.fromMasterSeed(seed);
      const childKey = masterKey.derive(ETH_DERIVATION_PATH);

      const privateKey = childKey.privateKey;
      if (!privateKey) {
        throw new EthereumSigningError(
          'BIP32 derivation produced no private key',
        );
      }

      // EIP-191 message hash
      const messageHash = EthereumWalletService.hashMessage(message);

      // Sign with SECP256k1
      const sigObj = secp256k1.ecdsaSign(messageHash, privateKey);

      // Combine r + s + v into a 65-byte signature
      const signature = new Uint8Array(65);
      signature.set(sigObj.signature);
      signature[64] = sigObj.recid + 27; // Ethereum v = recid + 27

      return {
        message,
        signature: '0x' + bytesToHex(signature),
        recoveryParam: sigObj.recid,
      };
    } catch (error) {
      if (error instanceof EthereumSigningError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      throw new EthereumSigningError(`Failed to sign message: ${msg}`);
    }
  }

  /**
   * Verify an Ethereum personal_sign signature.
   *
   * Recovers the signer's address from the signature and compares it
   * to the expected address.
   *
   * **Validates: Requirements 6.7, 6.8**
   *
   * @param message   - The original message that was signed
   * @param signature - The hex-encoded 65-byte signature (0x-prefixed)
   * @param address   - The expected signer's Ethereum address (EIP-55)
   * @returns `true` if the signature was produced by the address owner
   */
  static verifySignature(
    message: string,
    signature: string,
    address: string,
  ): boolean {
    try {
      const recoveredAddress = EthereumWalletService.recoverAddress(
        message,
        signature,
      );
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * Recover the signer's Ethereum address from a signed message.
   *
   * @param message   - The original message
   * @param signature - The hex-encoded 65-byte signature (0x-prefixed)
   * @returns The recovered EIP-55 checksummed Ethereum address
   * @throws {EthereumSigningError} If recovery fails
   */
  static recoverAddress(message: string, signature: string): string {
    try {
      const sigBytes = hexToBytes(signature);
      if (sigBytes.length !== 65) {
        throw new EthereumSigningError(
          `Invalid signature length: expected 65 bytes, got ${sigBytes.length}`,
        );
      }

      const messageHash = EthereumWalletService.hashMessage(message);

      // Extract r+s (first 64 bytes) and v (last byte)
      const rs = sigBytes.slice(0, 64);
      const v = sigBytes[64];
      const recid = v >= 27 ? v - 27 : v;

      // Recover the public key
      const recoveredPublicKey = secp256k1.ecdsaRecover(
        rs,
        recid,
        messageHash,
        false,
      );

      return publicKeyToAddress(recoveredPublicKey);
    } catch (error) {
      if (error instanceof EthereumSigningError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      throw new EthereumSigningError(`Failed to recover address: ${msg}`);
    }
  }

  /**
   * Hash a message using the EIP-191 personal message format.
   *
   * Format: keccak256("\x19Ethereum Signed Message:\n" + len(message) + message)
   *
   * @param message - The message to hash
   * @returns The 32-byte keccak256 hash
   */
  static hashMessage(message: string): Uint8Array {
    const messageBytes = new TextEncoder().encode(message);
    const prefix = new TextEncoder().encode(
      ETH_MESSAGE_PREFIX + messageBytes.length,
    );
    const combined = new Uint8Array(prefix.length + messageBytes.length);
    combined.set(prefix);
    combined.set(messageBytes, prefix.length);
    return keccak_256(combined);
  }

  /**
   * Validate an EIP-55 checksummed Ethereum address.
   *
   * @param address - The address to validate
   * @returns `true` if the address is valid and properly checksummed
   */
  static isValidAddress(address: string): boolean {
    return isValidChecksumAddress(address);
  }
}
