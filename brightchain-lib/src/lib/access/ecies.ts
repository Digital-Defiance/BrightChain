import { ServiceProvider } from '../services/service.provider';

/**
 * ECIES service access for blocks to avoid circular dependencies
 */
export class BlockECIES {
  public static encrypt(receiverPublicKey: Buffer, message: Buffer): Buffer {
    return ServiceProvider.getInstance().eciesService.encryptSimpleOrSingle(
      receiverPublicKey,
      message,
    );
  }

  public static decrypt(privateKey: Buffer, encryptedData: Buffer): Buffer {
    // Use the backward compatible version directly now which returns Buffer
    return ServiceProvider.getInstance().eciesService.decryptSimpleOrSingleWithHeader(
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
    // Our implementation now returns { decrypted, ciphertextLength }
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
