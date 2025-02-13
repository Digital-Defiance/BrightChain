import { ServiceProvider } from '../services/service.provider';

/**
 * ECIES service access for blocks to avoid circular dependencies
 */
export class BlockECIES {
  public static encrypt(receiverPublicKey: Buffer, message: Buffer): Buffer {
    return ServiceProvider.getInstance().eciesService.encrypt(
      receiverPublicKey,
      message,
    );
  }

  public static decrypt(privateKey: Buffer, encryptedData: Buffer): Buffer {
    return ServiceProvider.getInstance().eciesService.decryptWithHeader(
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
    return ServiceProvider.getInstance().eciesService.decryptWithComponents(
      privateKey,
      ephemeralPublicKey,
      iv,
      authTag,
      encrypted,
    );
  }
}
