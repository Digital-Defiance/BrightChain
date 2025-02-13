import { ServiceProvider } from '../services/service.provider';

/**
 * ECIES service access for blocks to avoid circular dependencies
 */
export class BlockECIES {
  private static getService() {
    return ServiceProvider.getECIESService();
  }

  public static get eciesOverheadLength(): number {
    return this.getService().eciesOverheadLength;
  }

  public static get publicKeyLength(): number {
    return this.getService().publicKeyLength;
  }

  public static get ivLength(): number {
    return this.getService().ivLength;
  }

  public static get authTagLength(): number {
    return this.getService().authTagLength;
  }

  public static encrypt(receiverPublicKey: Buffer, message: Buffer): Buffer {
    return this.getService().encrypt(receiverPublicKey, message);
  }

  public static decrypt(privateKey: Buffer, encryptedData: Buffer): Buffer {
    return this.getService().decrypt(privateKey, encryptedData);
  }

  public static decryptWithComponents(
    privateKey: Buffer,
    ephemeralPublicKey: Buffer,
    iv: Buffer,
    authTag: Buffer,
    encrypted: Buffer,
  ): Buffer {
    return this.getService().decryptWithComponents(
      privateKey,
      ephemeralPublicKey,
      iv,
      authTag,
      encrypted,
    );
  }
}
