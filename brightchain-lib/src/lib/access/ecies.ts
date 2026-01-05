import { ServiceProvider } from '../services/service.provider';

/**
 * ECIES service access for blocks to avoid circular dependencies
 * Updated to use new @digitaldefiance/node-ecies-lib API
 */
export class BlockECIES {
  public static encrypt(receiverPublicKey: Buffer, message: Buffer): Buffer {
    // Use encryptSimpleOrSingle (encryptSimple = true) from new ECIES service
    return ServiceProvider.getInstance().eciesService.encryptSimpleOrSingle(
      true,
      receiverPublicKey,
      message,
    );
  }

  public static decrypt(privateKey: Buffer, encryptedData: Buffer): Buffer {
    // Use decryptSimpleOrSingleWithHeader (decryptSimple = false) from new ECIES service
    return ServiceProvider.getInstance().eciesService.decryptSimpleOrSingleWithHeader(
      false,
      privateKey,
      encryptedData,
    );
  }

  public static decryptWithComponents(
    privateKey: Buffer,
    ephemeralPublicKey: Buffer,
    iv: Buffer,
    authTag: Buffer,
    encrypted: Buffer,
  ): Buffer {
    const result =
      ServiceProvider.getInstance().eciesService.decryptSingleWithComponents(
        privateKey,
        ephemeralPublicKey,
        iv,
        authTag,
        encrypted,
      );
    return result.decrypted;
  }
}
