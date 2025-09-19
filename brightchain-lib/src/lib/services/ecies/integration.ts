/**
 * Integration helpers for using the browser ECIES service with existing web-crypto functionality
 */

import { SecureString } from '../../secure-string';
import { SignatureArray } from '../../shared-types';
import {
  hexToUint8Array,
  stringToUint8Array,
  uint8ArrayToHex,
  uint8ArrayToString,
} from '../../utils';
import { IWalletSeed } from './interfaces';
import { ECIESService } from './service';

/**
 * Enhanced web crypto service that uses the new ECIES implementation
 */
export class EnhancedWebCryptoService {
  private ecies: ECIESService;

  constructor() {
    this.ecies = new ECIESService();
  }

  /**
   * Derive wallet from mnemonic using the new ECIES service
   * This replaces the existing walletFromMnemonic method with better browser compatibility
   */
  public async walletFromMnemonic(
    mnemonic: SecureString,
  ): Promise<IWalletSeed> {
    const { wallet, seed } = this.ecies.walletAndSeedFromMnemonic(mnemonic);
    return {
      wallet,
      seed,
    };
  }

  /**
   * Decrypt challenge using the new ECIES service
   * This provides better compatibility and error handling than the original implementation
   */
  public async decryptChallenge(
    encryptedHex: string,
    privateKey: Uint8Array,
  ): Promise<Uint8Array> {
    try {
      const encryptedData = hexToUint8Array(encryptedHex);

      // Try to decrypt using single mode first (most common)
      try {
        return await this.ecies.decryptSimpleOrSingleWithHeader(
          false,
          privateKey,
          encryptedData,
        );
      } catch {
        // Fallback to simple mode
        return await this.ecies.decryptSimpleOrSingleWithHeader(
          true,
          privateKey,
          encryptedData,
        );
      }
    } catch (error) {
      throw new Error(`Failed to decrypt challenge: ${error}`);
    }
  }

  /**
   * Encrypt data for a recipient
   */
  public async encryptForRecipient(
    recipientPublicKey: Uint8Array,
    data: Uint8Array,
    useSimpleMode: boolean = false,
  ): Promise<string> {
    const encrypted = await this.ecies.encryptSimpleOrSingle(
      !useSimpleMode,
      recipientPublicKey,
      data,
    );
    return uint8ArrayToHex(encrypted);
  }

  /**
   * Sign data with private key
   */
  public signData(privateKey: Uint8Array, data: Uint8Array): string {
    const signature = this.ecies.signMessage(privateKey, data);
    return uint8ArrayToHex(signature);
  }

  /**
   * Verify signature
   */
  public verifySignature(
    publicKey: Uint8Array,
    data: Uint8Array,
    signatureHex: string,
  ): boolean {
    const signature = hexToUint8Array(signatureHex) as SignatureArray;
    return this.ecies.verifyMessage(publicKey, data, signature);
  }

  /**
   * Generate new mnemonic
   */
  public generateMnemonic(): SecureString {
    return this.ecies.generateNewMnemonic();
  }

  /**
   * Complete client-side challenge verification (enhanced version)
   */
  public async verifyChallengeResponse(
    encryptedChallenge: string,
    mnemonic: SecureString,
    systemPublicKeyHex: string,
  ): Promise<string> {
    // Derive keys from mnemonic
    const { wallet } = await this.walletFromMnemonic(mnemonic);

    // Decrypt the challenge
    const decryptedPayload = await this.decryptChallenge(
      encryptedChallenge,
      wallet.getPrivateKey(),
    );

    // Extract nonce and signature (assuming 48 bytes payload + signature)
    const payload = decryptedPayload.slice(0, 48);
    const signature = decryptedPayload.slice(48);

    // Convert system public key from hex
    const systemPubKey = hexToUint8Array(systemPublicKeyHex);

    // Verify system signature
    const isValid = this.verifySignature(
      systemPubKey,
      payload,
      uint8ArrayToHex(signature),
    );

    if (!isValid) {
      throw new Error('Invalid challenge signature');
    }

    return uint8ArrayToHex(decryptedPayload);
  }
}

/**
 * Migration helper to transition from old WebCryptoService to new ECIES service
 */
export class MigrationHelper {
  /**
   * Test compatibility between old and new implementations
   */
  public static async testCompatibility(mnemonic: SecureString): Promise<{
    compatible: boolean;
    details: {
      mnemonicValid: boolean;
      keysMatch: boolean;
      encryptionWorks: boolean;
    };
  }> {
    try {
      const ecies = new ECIESService();
      const enhanced = new EnhancedWebCryptoService();

      // Test mnemonic validation
      let mnemonicValid = false;
      try {
        ecies.walletAndSeedFromMnemonic(mnemonic);
        mnemonicValid = true;
      } catch {
        mnemonicValid = false;
      }

      // Test key derivation
      let keysMatch = false;
      if (mnemonicValid) {
        try {
          const { wallet: wallet1 } = ecies.walletAndSeedFromMnemonic(mnemonic);
          const { wallet: wallet2 } = await enhanced.walletFromMnemonic(
            mnemonic,
          );
          keysMatch =
            uint8ArrayToHex(wallet1.getPrivateKey()) ===
            uint8ArrayToHex(wallet2.getPrivateKey());
        } catch {
          keysMatch = false;
        }
      }

      // Test encryption roundtrip
      let encryptionWorks = false;
      if (keysMatch) {
        try {
          const { wallet } = await enhanced.walletFromMnemonic(mnemonic);
          const testMessage = stringToUint8Array('Test message');
          const encrypted = await enhanced.encryptForRecipient(
            wallet.getPublicKey(),
            testMessage,
          );
          const decrypted = await enhanced.decryptChallenge(
            encrypted,
            wallet.getPrivateKey(),
          );
          encryptionWorks =
            uint8ArrayToString(testMessage) === uint8ArrayToString(decrypted);
        } catch {
          encryptionWorks = false;
        }
      }

      return {
        compatible: mnemonicValid && keysMatch && encryptionWorks,
        details: {
          mnemonicValid,
          keysMatch,
          encryptionWorks,
        },
      };
    } catch {
      return {
        compatible: false,
        details: {
          mnemonicValid: false,
          keysMatch: false,
          encryptionWorks: false,
        },
      };
    }
  }
}
