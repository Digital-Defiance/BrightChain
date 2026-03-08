/**
 * @fileoverview HMAC computation service for mnemonic uniqueness checking.
 * Mirrors the upstream MnemonicService pattern from express-suite.
 * Uses SecureBuffer/SecureString for secure secret and mnemonic handling.
 * @module services/mnemonic-hmac
 */

import { SecureBuffer, SecureString } from '@digitaldefiance/ecies-lib';
import { createHmac } from 'crypto';

/**
 * Service for computing SHA-256 HMACs of mnemonic phrases.
 * Used for uniqueness checking without storing plaintext mnemonics.
 *
 * This class mirrors the HMAC computation from the upstream
 * `MnemonicService` in `express-suite`, using `SecureBuffer` for
 * the HMAC secret and `SecureString` for the mnemonic input.
 */
export class MnemonicHmacService {
  private readonly hmacSecret: SecureBuffer;

  /**
   * Creates a new MnemonicHmacService instance.
   * @param hmacSecret The HMAC secret wrapped in a SecureBuffer.
   */
  constructor(hmacSecret: SecureBuffer) {
    this.hmacSecret = hmacSecret;
  }

  /**
   * Disposes of the secure HMAC secret held by this service.
   */
  public dispose(): void {
    this.hmacSecret.dispose();
  }

  /**
   * Compute the SHA-256 HMAC of a mnemonic for uniqueness checking.
   * Mirrors the upstream MnemonicService.getMnemonicHmac pattern.
   * @param mnemonic The mnemonic to hash, wrapped in a SecureString.
   * @returns Hex-encoded SHA-256 HMAC string.
   */
  public getMnemonicHmac(mnemonic: SecureString): string {
    return createHmac('sha256', this.hmacSecret.value)
      .update(mnemonic.valueAsUint8Array)
      .digest('hex');
  }
}
