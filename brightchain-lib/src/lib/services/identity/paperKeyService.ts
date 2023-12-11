/**
 * Paper Key Service for the BrightChain identity system.
 *
 * Provides generation, validation, recovery, and template creation
 * for 24-word BIP39 mnemonic paper keys. Paper keys serve as the
 * primary mechanism for account backup, device provisioning, and
 * account recovery.
 *
 * This service wraps the existing BIP39/ECIES infrastructure from
 * {@link @digitaldefiance/ecies-lib} and exposes a focused API for
 * paper key operations.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.8
 */

import {
  ECIESService,
  Member,
  PlatformID,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import * as QRCode from 'qrcode';

import { IPaperKeyTemplate } from '../../interfaces/identity/paperKey';

/**
 * Default security warnings displayed on every paper key template.
 *
 * These warnings are mandated by Requirement 1.10 and must appear
 * on every printed template.
 */
const PAPER_KEY_WARNINGS: readonly string[] = [
  'Anyone with this paper key can access your account',
  'Do not store digitally or photograph',
  'Consider splitting among trusted parties',
] as const;

/**
 * Default instructions for paper key storage.
 */
const PAPER_KEY_INSTRUCTIONS =
  'Store this paper key in a secure location. You will need it to recover your account.';

/**
 * Expected word count for a 256-bit entropy BIP39 mnemonic.
 */
const PAPER_KEY_WORD_COUNT = 24;

/**
 * Service for generating, validating, and recovering from BIP39 paper keys.
 *
 * All methods require an {@link ECIESService} instance, which is obtained
 * from {@link ServiceProvider}. This keeps the service stateless and
 * compatible with the existing dependency-injection pattern used
 * throughout BrightChain.
 *
 * @example
 * ```typescript
 * const eciesService = ServiceProvider.getInstance().eciesService;
 *
 * // Generate a new paper key
 * const paperKey = PaperKeyService.generatePaperKey(eciesService);
 *
 * // Validate it
 * const isValid = PaperKeyService.validatePaperKey(paperKey, eciesService);
 *
 * // Recover a member from it
 * const member = PaperKeyService.recoverFromPaperKey(paperKey, eciesService);
 *
 * // Generate a printable template
 * const template = await PaperKeyService.generateTemplate(
 *   paperKey,
 *   member.id.toString(),
 * );
 * ```
 */
export class PaperKeyService {
  /**
   * Generate a new 24-word BIP39 mnemonic paper key (256-bit entropy).
   *
   * Uses the ECIESService's mnemonic generator which internally calls
   * `@scure/bip39.generateMnemonic(wordlist, 256)`.
   *
   * **Validates: Requirement 1.1** — Generate 24-word BIP39 mnemonics
   *
   * @param eciesService - The ECIES service instance for key generation
   * @returns A {@link SecureString} containing the 24-word mnemonic
   */
  static generatePaperKey<TID extends PlatformID = Uint8Array>(
    eciesService: ECIESService<TID>,
  ): SecureString {
    return eciesService.generateNewMnemonic();
  }

  /**
   * Validate that a paper key is a well-formed BIP39 mnemonic.
   *
   * Checks both structural validity (24 words, valid BIP39 checksum)
   * by attempting to derive a wallet from the mnemonic. If derivation
   * succeeds the mnemonic is valid; if it throws, the mnemonic is invalid.
   *
   * **Validates: Requirement 1.2** — Validate paper key format using BIP39 validation
   *
   * @param paperKey - The mnemonic string to validate
   * @param eciesService - The ECIES service instance for validation
   * @returns `true` if the paper key is a valid 24-word BIP39 mnemonic, `false` otherwise
   */
  static validatePaperKey<TID extends PlatformID = Uint8Array>(
    paperKey: string,
    eciesService: ECIESService<TID>,
  ): boolean {
    // Quick structural check: must be exactly 24 words
    const words = paperKey.trim().split(/\s+/);
    if (words.length !== PAPER_KEY_WORD_COUNT) {
      return false;
    }

    try {
      // Attempt wallet derivation — this internally calls
      // @scure/bip39.validateMnemonic and throws on invalid input
      const secureString = new SecureString(paperKey);
      eciesService.walletAndSeedFromMnemonic(secureString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Recover a {@link Member} identity from a paper key mnemonic.
   *
   * Reconstructs the full member (with private key and wallet loaded)
   * from the BIP39 mnemonic. The recovered member can immediately
   * perform cryptographic operations (sign, encrypt, etc.).
   *
   * **Validates: Requirement 1.3** — Recover Member identity from a valid paper key
   *
   * @param paperKey - The 24-word BIP39 mnemonic
   * @param eciesService - The ECIES service instance for key derivation
   * @param name - Optional display name for the recovered member (default: 'Recovered User')
   * @returns A fully-initialised {@link Member} with wallet and private key loaded
   * @throws {Error} If the paper key is invalid or key derivation fails
   */
  static recoverFromPaperKey<TID extends PlatformID = Uint8Array>(
    paperKey: string,
    eciesService: ECIESService<TID>,
    name?: string,
  ): Member<TID> {
    const secureString = new SecureString(paperKey);
    return Member.fromMnemonic<TID>(
      secureString,
      eciesService,
      undefined,
      name ?? 'Recovered User',
    );
  }

  /**
   * Generate a printable paper key template.
   *
   * Produces an {@link IPaperKeyTemplate} containing the mnemonic words,
   * a QR code data URL for mobile scanning, creation timestamp,
   * storage instructions, and security warnings.
   *
   * The QR code encodes the full mnemonic string and is generated
   * using the `qrcode` library (same pattern as {@link TOTPEngine}).
   *
   * **Validates: Requirements 1.4, 1.8, 1.10** — Printable template with QR code and warnings
   *
   * @param paperKey - The 24-word BIP39 mnemonic to template
   * @param memberId - The member ID to associate with the template
   * @returns A promise resolving to the complete {@link IPaperKeyTemplate}
   */
  static async generateTemplate(
    paperKey: string,
    memberId: string,
  ): Promise<IPaperKeyTemplate> {
    const words = paperKey.trim().split(/\s+/);
    const qrCode = await QRCode.toDataURL(paperKey);

    return {
      words,
      qrCode,
      createdAt: new Date(),
      memberId,
      instructions: PAPER_KEY_INSTRUCTIONS,
      warnings: [...PAPER_KEY_WARNINGS],
    };
  }
}
