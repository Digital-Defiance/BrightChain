import { ServiceProvider } from '../services/service.provider';

/**
 * ECIES service access for blocks to avoid circular dependencies
 * Updated to use new @digitaldefiance/ecies-lib API
 */
export class BlockECIES {
  public static async encrypt(
    receiverPublicKey: Uint8Array,
    message: Uint8Array,
  ): Promise<Uint8Array> {
    // Use encryptSimpleOrSingle (encryptSimple = true) from new ECIES service
    return ServiceProvider.getInstance().eciesService.encryptBasic(
      receiverPublicKey,
      message,
    );
  }

  public static async decrypt(
    privateKey: Uint8Array,
    encryptedData: Uint8Array,
  ): Promise<Uint8Array> {
    // Use decryptSimpleOrSingleWithHeader (decryptSimple = false) from new ECIES service
    return ServiceProvider.getInstance().eciesService.decryptWithLengthAndHeader(
      privateKey,
      encryptedData,
    );
  }

  public static async decryptWithComponents(
    privateKey: Uint8Array,
    ephemeralPublicKey: Uint8Array,
    iv: Uint8Array,
    authTag: Uint8Array,
    encrypted: Uint8Array,
  ): Promise<{
    decrypted: Uint8Array;
    ciphertextLength?: number;
  }> {
    const result =
      ServiceProvider.getInstance().eciesService.decryptWithComponents(
        privateKey,
        ephemeralPublicKey,
        iv,
        authTag,
        encrypted,
      );
    return result;
  }
}
