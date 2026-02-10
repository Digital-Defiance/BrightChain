/**
 * Split Paper Key Service for the BrightChain identity system.
 *
 * Splits a 24-word BIP39 paper key into N Shamir's Secret Sharing
 * shares with a configurable threshold T. Any T shares can reconstruct
 * the original paper key; fewer than T shares reveal nothing.
 *
 * Each share is encoded as a human-readable word sequence using the
 * BIP39 English wordlist as a dictionary (11 bits per word). Because
 * Shamir shares include metadata (bit-width, share index) and internal
 * padding, they are larger than the original 32-byte entropy, so they
 * cannot be represented as standard BIP39 mnemonics. Instead, the
 * service uses a raw 11-bit-per-word encoding that preserves the full
 * share hex string for lossless round-trip reconstruction.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.7
 */

import type { CSPRNGType } from '@digitaldefiance/secrets';
import * as secretsModule from '@digitaldefiance/secrets';
import {
  entropyToMnemonic,
  mnemonicToEntropy,
  validateMnemonic,
} from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import * as QRCode from 'qrcode';

import { SEALING } from '../../constants';
import { ISplitPaperKeyShare } from '../../interfaces/identity/splitPaperKey';

// Handle both ESM default export and CommonJS module.exports patterns
const secrets =
  (secretsModule as typeof secretsModule & { default?: typeof secretsModule })
    .default ?? secretsModule;

/**
 * Number of bits encoded per BIP39 wordlist word (2048 words = 2^11).
 */
const BITS_PER_WORD = 11;

/**
 * Minimum threshold for Shamir's Secret Sharing.
 * A threshold of 1 is meaningless — every share IS the secret.
 */
const MIN_THRESHOLD = 2;

/**
 * Expected byte length of 256-bit BIP39 entropy (24-word mnemonic).
 */
const EXPECTED_ENTROPY_BYTES = 32;

// ─── Hex ↔ Word-list encoding ───────────────────────────────────────────────
//
// Shamir share strings are arbitrary-length hex and cannot be fed to
// `entropyToMnemonic` (which requires 16/20/24/28/32-byte entropy).
// We encode them as words by chunking the hex into 11-bit groups and
// mapping each group to a BIP39 wordlist entry.  The encoding is
// fully reversible.

/**
 * Encode an arbitrary hex string as a sequence of BIP39 wordlist words.
 *
 * The hex is converted to a binary string, left-padded to a multiple of
 * {@link BITS_PER_WORD} bits, then split into 11-bit chunks. Each chunk
 * indexes into the BIP39 English wordlist.
 *
 * @param hex - Hex string to encode (no `0x` prefix)
 * @returns Array of BIP39 words representing the hex value
 */
function hexToWords(hex: string): string[] {
  // Convert hex → binary string
  let binary = '';
  for (const ch of hex) {
    binary += parseInt(ch, 16).toString(2).padStart(4, '0');
  }

  // Pad to a multiple of BITS_PER_WORD
  const remainder = binary.length % BITS_PER_WORD;
  if (remainder !== 0) {
    binary = '0'.repeat(BITS_PER_WORD - remainder) + binary;
  }

  const words: string[] = [];
  for (let i = 0; i < binary.length; i += BITS_PER_WORD) {
    const chunk = binary.slice(i, i + BITS_PER_WORD);
    const index = parseInt(chunk, 2);
    words.push(wordlist[index]);
  }
  return words;
}

/**
 * Decode a sequence of BIP39 wordlist words back to a hex string.
 *
 * Each word is looked up in the BIP39 English wordlist to recover its
 * 11-bit index. The concatenated binary is then converted back to hex.
 *
 * @param words - Array of BIP39 words previously produced by {@link hexToWords}
 * @returns The original hex string
 * @throws {Error} If any word is not in the BIP39 English wordlist
 */
function wordsToHex(words: string[]): string {
  let binary = '';
  for (const word of words) {
    const index = wordlist.indexOf(word);
    if (index === -1) {
      throw new Error(`Word "${word}" is not in the BIP39 English wordlist`);
    }
    binary += index.toString(2).padStart(BITS_PER_WORD, '0');
  }

  // Convert binary → hex, stripping leading zeros that were padding
  // We need groups of 4 bits for hex conversion
  const remainder = binary.length % 4;
  if (remainder !== 0) {
    binary = '0'.repeat(4 - remainder) + binary;
  }

  let hex = '';
  for (let i = 0; i < binary.length; i += 4) {
    hex += parseInt(binary.slice(i, i + 4), 2).toString(16);
  }

  // Strip leading zeros but preserve at least one character
  hex = hex.replace(/^0+/, '') || '0';
  return hex;
}

// ─── Secrets library initialisation ─────────────────────────────────────────

/**
 * Initialise (or re-initialise) the `@digitaldefiance/secrets` library
 * with the correct Galois Field bit-width for the requested number of
 * shares.
 *
 * The bit-width determines the maximum share count: `2^bits − 1`.
 * We clamp to the range [3, 20] as required by the library.
 *
 * @param maxShares - Maximum number of shares that will be generated
 */
function initSecrets(maxShares: number): void {
  const bits = Math.max(3, Math.ceil(Math.log2(maxShares + 1)));
  if (bits < 3 || bits > 20) {
    throw new Error(
      `Cannot initialise secrets library: computed ${bits} bits for ${maxShares} shares (valid range: 3–20)`,
    );
  }

  let csprngType: CSPRNGType = 'nodeCryptoRandomBytes';
  try {
    const config = secrets.getConfig();
    if (config?.typeCSPRNG) {
      csprngType = config.typeCSPRNG;
    }
  } catch {
    // Library not yet initialised — use default
  }

  secrets.init(bits, csprngType);
}

// ─── Validation helpers ─────────────────────────────────────────────────────

/**
 * Validate split parameters against system constraints.
 *
 * @throws {Error} If any parameter is out of range
 */
function validateSplitParams(
  paperKey: string,
  shares: number,
  threshold: number,
): void {
  if (!validateMnemonic(paperKey, wordlist)) {
    throw new Error('Invalid paper key: not a valid BIP39 mnemonic');
  }

  const words = paperKey.trim().split(/\s+/);
  if (words.length !== 24) {
    throw new Error(
      `Invalid paper key: expected 24 words, got ${words.length}`,
    );
  }

  if (!Number.isInteger(shares) || shares < SEALING.MIN_SHARES) {
    throw new Error(
      `Number of shares must be an integer ≥ ${SEALING.MIN_SHARES}, got ${shares}`,
    );
  }

  if (shares > SEALING.MAX_SHARES) {
    throw new Error(
      `Number of shares must be ≤ ${SEALING.MAX_SHARES}, got ${shares}`,
    );
  }

  if (!Number.isInteger(threshold) || threshold < MIN_THRESHOLD) {
    throw new Error(
      `Threshold must be an integer ≥ ${MIN_THRESHOLD}, got ${threshold}`,
    );
  }

  if (threshold > shares) {
    throw new Error(
      `Threshold (${threshold}) cannot exceed number of shares (${shares})`,
    );
  }
}

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Service for splitting and reconstructing BIP39 paper keys using
 * Shamir's Secret Sharing.
 *
 * All methods are static — the service is stateless and safe to call
 * from any context (browser or Node.js).
 *
 * @example
 * ```typescript
 * // Split a 24-word paper key into 5 shares, requiring 3 to reconstruct
 * const shares = SplitPaperKeyService.split(paperKey, 5, 3);
 *
 * // Reconstruct from any 3 shares
 * const recovered = SplitPaperKeyService.reconstruct(shares, 5);
 *
 * // Generate a printable template for share #1
 * const template = await SplitPaperKeyService.generateShareTemplate(
 *   shares[0], 1, 5, 3,
 * );
 * ```
 */
export class SplitPaperKeyService {
  /**
   * Split a 24-word BIP39 paper key into N Shamir shares.
   *
   * The paper key mnemonic is converted to its 32-byte entropy, then
   * the entropy hex is split using Shamir's Secret Sharing. Each
   * resulting share hex is encoded as human-readable words using the
   * BIP39 wordlist (11 bits per word).
   *
   * **Validates: Requirements 2.1, 2.2, 2.3**
   *
   * @param paperKey - A valid 24-word BIP39 mnemonic
   * @param shares  - Total number of shares to generate (2–1,048,575)
   * @param threshold - Minimum shares needed to reconstruct (2–shares)
   * @returns Array of word-encoded share strings (space-separated words)
   * @throws {Error} If the paper key is invalid or parameters are out of range
   */
  static split(paperKey: string, shares: number, threshold: number): string[] {
    validateSplitParams(paperKey, shares, threshold);

    // Requirement 2.2: Convert BIP39 mnemonic → raw entropy bytes
    const entropyBytes = mnemonicToEntropy(paperKey, wordlist);
    if (entropyBytes.length !== EXPECTED_ENTROPY_BYTES) {
      throw new Error(
        `Unexpected entropy length: expected ${EXPECTED_ENTROPY_BYTES} bytes, got ${entropyBytes.length}`,
      );
    }

    // Convert entropy to hex for the secrets library
    const entropyHex = Buffer.from(entropyBytes).toString('hex');

    // Initialise secrets library for the requested share count
    initSecrets(shares);

    // Requirement 2.1: Split using Shamir's Secret Sharing
    // padLength=0 preserves the exact hex length (no extra zero-padding)
    const shamirShares = secrets.share(entropyHex, shares, threshold, 0);

    // Requirement 2.3: Convert each share to human-readable words
    return shamirShares.map((shareHex: string) => {
      const words = hexToWords(shareHex);
      return words.join(' ');
    });
  }

  /**
   * Reconstruct a paper key from T or more Shamir shares.
   *
   * The word-encoded shares are decoded back to hex, combined using
   * Shamir's Secret Sharing, and the resulting entropy is converted
   * back to a 24-word BIP39 mnemonic.
   *
   * **Validates: Requirement 2.4**
   *
   * @param shares - Array of word-encoded share strings (at least threshold count)
   * @param totalShares - The total number of shares originally created
   *                      (needed to re-initialise the secrets library with
   *                      the correct Galois Field bit-width)
   * @returns The original 24-word BIP39 paper key
   * @throws {Error} If shares are invalid or reconstruction fails
   */
  static reconstruct(shares: string[], totalShares: number): string {
    if (!Array.isArray(shares) || shares.length < MIN_THRESHOLD) {
      throw new Error(
        `At least ${MIN_THRESHOLD} shares are required for reconstruction`,
      );
    }

    if (
      !Number.isInteger(totalShares) ||
      totalShares < SEALING.MIN_SHARES ||
      totalShares > SEALING.MAX_SHARES
    ) {
      throw new Error(
        `totalShares must be an integer between ${SEALING.MIN_SHARES} and ${SEALING.MAX_SHARES}`,
      );
    }

    // Decode word-encoded shares back to hex
    const hexShares = shares.map((shareWords) => {
      const words = shareWords.trim().split(/\s+/);
      return wordsToHex(words);
    });

    // Re-initialise secrets library with the same bit-width used during split
    initSecrets(totalShares);

    // Combine shares to recover the original entropy hex
    const recoveredHex = secrets.combine(hexShares);

    // Convert hex → bytes → BIP39 mnemonic
    const entropyBytes = new Uint8Array(Buffer.from(recoveredHex, 'hex'));

    // The recovered entropy should be exactly 32 bytes for a 24-word mnemonic
    if (entropyBytes.length !== EXPECTED_ENTROPY_BYTES) {
      throw new Error(
        `Reconstruction produced ${entropyBytes.length} bytes of entropy; expected ${EXPECTED_ENTROPY_BYTES}. ` +
          'Ensure the correct number of valid shares and totalShares were provided.',
      );
    }

    const mnemonic = entropyToMnemonic(entropyBytes, wordlist);

    // Sanity check: the result must be a valid BIP39 mnemonic
    if (!validateMnemonic(mnemonic, wordlist)) {
      throw new Error(
        'Reconstructed mnemonic failed BIP39 validation. ' +
          'The shares may be corrupted or from different split operations.',
      );
    }

    return mnemonic;
  }

  /**
   * Generate a printable template for a single share.
   *
   * Produces an {@link ISplitPaperKeyShare} containing the share words,
   * a QR code data URL for mobile scanning, and human-readable
   * instructions with share number, total count, and threshold.
   *
   * **Validates: Requirement 2.7**
   *
   * @param share       - Space-separated word-encoded share string
   * @param shareNumber - 1-based index of this share
   * @param totalShares - Total number of shares created
   * @param threshold   - Minimum shares needed to reconstruct
   * @returns A promise resolving to the complete {@link ISplitPaperKeyShare}
   */
  static async generateShareTemplate(
    share: string,
    shareNumber: number,
    totalShares: number,
    threshold: number,
  ): Promise<ISplitPaperKeyShare> {
    const words = share.trim().split(/\s+/);
    const qrCode = await QRCode.toDataURL(share);

    return {
      shareNumber,
      totalShares,
      threshold,
      words,
      qrCode,
      createdAt: new Date(),
      instructions:
        `This is share ${shareNumber} of ${totalShares}. ` +
        `You need ${threshold} shares to recover your account.`,
    };
  }
}
