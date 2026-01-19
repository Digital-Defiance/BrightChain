import { MessageErrorType } from '../../enumerations/messaging/messageErrorType';
import { MessageError } from '../../errors/messaging/messageError';

/**
 * Interface for recipient public key provider.
 * Implementations can fetch keys from node registry, discovery protocol, etc.
 */
export interface IPublicKeyProvider {
  getPublicKey(nodeId: string): Promise<Uint8Array | null>;
}

/**
 * Manager for recipient public key operations.
 *
 * @remarks
 * Fetches and validates recipient public keys for message encryption.
 * Handles missing keys gracefully.
 *
 * @see Requirements 3.1
 */
export class RecipientKeyManager {
  constructor(private keyProvider: IPublicKeyProvider) {}

  /**
   * Fetch public keys for multiple recipients.
   * @param recipientIds - Array of recipient node IDs
   * @returns Map of recipient ID to public key
   * @throws MessageError if any required key is missing
   */
  async fetchPublicKeys(
    recipientIds: string[],
  ): Promise<Map<string, Uint8Array>> {
    const keys = new Map<string, Uint8Array>();
    const missingKeys: string[] = [];

    for (const recipientId of recipientIds) {
      const publicKey = await this.keyProvider.getPublicKey(recipientId);
      if (publicKey) {
        if (this.validatePublicKey(publicKey)) {
          keys.set(recipientId, publicKey);
        } else {
          missingKeys.push(recipientId);
        }
      } else {
        missingKeys.push(recipientId);
      }
    }

    if (missingKeys.length > 0) {
      throw new MessageError(
        MessageErrorType.MISSING_PUBLIC_KEY,
        `Missing or invalid public keys for recipients: ${missingKeys.join(', ')}`,
      );
    }

    return keys;
  }

  /**
   * Validate public key format and length.
   * @param publicKey - Public key to validate
   * @returns True if valid secp256k1 public key
   */
  validatePublicKey(publicKey: Uint8Array): boolean {
    // secp256k1 public keys are either:
    // - 65 bytes (uncompressed, starts with 0x04)
    // - 33 bytes (compressed, starts with 0x02 or 0x03)
    if (publicKey.length === 65) {
      return publicKey[0] === 0x04;
    }
    if (publicKey.length === 33) {
      return publicKey[0] === 0x02 || publicKey[0] === 0x03;
    }
    return false;
  }

  /**
   * Fetch public key for single recipient with graceful handling.
   * @param recipientId - Recipient node ID
   * @returns Public key or null if not found
   */
  async fetchPublicKeyOptional(
    recipientId: string,
  ): Promise<Uint8Array | null> {
    try {
      const publicKey = await this.keyProvider.getPublicKey(recipientId);
      if (publicKey && this.validatePublicKey(publicKey)) {
        return publicKey;
      }
      return null;
    } catch {
      return null;
    }
  }
}
