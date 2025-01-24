import { IDataBlock } from './dataBlock';

export interface IEncryptedBlock extends IDataBlock {
  /**
   * The length of the encrypted data
   */
  get encryptedLength(): number | bigint;
  /**
   * The ephemeral public key used to encrypt the data
   */
  get ephemeralPublicKey(): Buffer;
  /**
   * The initialization vector used to encrypt the data
   */
  get iv(): Buffer;
  /**
   * The authentication tag used to encrypt the data
   */
  get authTag(): Buffer;
}
