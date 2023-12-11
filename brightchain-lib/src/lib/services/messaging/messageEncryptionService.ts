import { BlockECIES } from '../../access/ecies';
import { BrightChainStrings } from '../../enumerations';
import { MessageErrorType } from '../../enumerations/messaging/messageErrorType';
import { MessageError } from '../../errors/messaging/messageError';
import { translate } from '../../i18n';

/**
 * Service for encrypting and decrypting message content.
 *
 * @remarks
 * Uses ECIES for direct message encryption with recipient public keys.
 * Uses AES-256-GCM with shared key for broadcast messages.
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.5
 */
export class MessageEncryptionService {
  /**
   * Encrypt content for direct message with recipient public keys.
   * @param content - Plaintext content
   * @param recipientPublicKeys - Map of recipient ID to public key
   * @returns Encrypted content and per-recipient encrypted keys
   */
  async encryptDirect(
    content: Uint8Array,
    recipientPublicKeys: Map<string, Uint8Array>,
  ): Promise<{
    encryptedContent: Uint8Array;
    encryptedKeys: Map<string, Uint8Array>;
  }> {
    if (recipientPublicKeys.size === 0) {
      throw new MessageError(
        MessageErrorType.MISSING_RECIPIENT_KEYS,
        translate(
          BrightChainStrings.MessageEncryptionService_NoRecipientPublicKeysProvided,
        ),
      );
    }

    // Encrypt content for each recipient using their public key
    const encryptedKeys = new Map<string, Uint8Array>();
    let encryptedContent: Uint8Array | null = null;

    for (const [recipientId, publicKey] of recipientPublicKeys.entries()) {
      try {
        const encrypted = await BlockECIES.encrypt(publicKey, content);
        if (!encryptedContent) {
          encryptedContent = encrypted;
        }
        // Store encrypted content as the "key" for this recipient
        encryptedKeys.set(recipientId, encrypted);
      } catch (error) {
        throw new MessageError(
          MessageErrorType.ENCRYPTION_FAILED,
          translate(
            BrightChainStrings.MessageEncryptionService_FailedToEncryptTemplate,
            {
              RECIPIENT_ID: recipientId,
              ERROR: error instanceof Error ? error.message : String(error),
            },
          ),
        );
      }
    }

    return { encryptedContent: encryptedContent!, encryptedKeys };
  }

  /**
   * Encrypt content for broadcast with shared key.
   * @param content - Plaintext content
   * @param sharedPublicKey - Shared public key for broadcast
   * @returns Encrypted content
   */
  async encryptBroadcast(
    content: Uint8Array,
    sharedPublicKey: Uint8Array,
  ): Promise<Uint8Array> {
    try {
      return await BlockECIES.encrypt(sharedPublicKey, content);
    } catch (error) {
      throw new MessageError(
        MessageErrorType.ENCRYPTION_FAILED,
        translate(
          BrightChainStrings.MessageEncryptionService_BroadcastEncryptionFailedTemplate,
          {
            ERROR: error instanceof Error ? error.message : String(error),
          },
        ),
      );
    }
  }

  /**
   * Decrypt message content (no automatic decryption in storage/routing).
   * @param encryptedContent - Encrypted content
   * @param privateKey - Private key for decryption
   * @returns Decrypted content
   */
  async decrypt(
    encryptedContent: Uint8Array,
    privateKey: Uint8Array,
  ): Promise<Uint8Array> {
    try {
      return await BlockECIES.decrypt(privateKey, encryptedContent);
    } catch (error) {
      throw new MessageError(
        MessageErrorType.ENCRYPTION_FAILED,
        translate(
          BrightChainStrings.MessageEncryptionService_DecryptionFailedTemplate,
          {
            ERROR: error instanceof Error ? error.message : String(error),
          },
        ),
      );
    }
  }

  /**
   * Decrypt symmetric key for recipient.
   * @param encryptedKey - Encrypted symmetric key
   * @param privateKey - Recipient's private key
   * @returns Decrypted symmetric key
   */
  async decryptKey(
    encryptedKey: Uint8Array,
    privateKey: Uint8Array,
  ): Promise<Uint8Array> {
    try {
      return await BlockECIES.decrypt(privateKey, encryptedKey);
    } catch (error) {
      throw new MessageError(
        MessageErrorType.INVALID_ENCRYPTION_KEY,
        translate(
          BrightChainStrings.MessageEncryptionService_KeyDecryptionFailedTemplate,
          {
            ERROR: error instanceof Error ? error.message : String(error),
          },
        ),
      );
    }
  }
}
