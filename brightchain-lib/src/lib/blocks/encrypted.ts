import { BrightChainMember } from '../brightChainMember';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { GuidV4 } from '../guid';
import { IEncryptedBlock } from '../interfaces/encryptedBlock';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
import { EphemeralBlock } from './ephemeral';

export abstract class EncryptedBlock
  extends EphemeralBlock
  implements IEncryptedBlock
{
  /**
   * Creates an instance of EncryptedBlock.
   * @param type - The type of the block
   * @param blockSize - The size of the block
   * @param data - The encrypted data
   * @param checksum - The checksum of the data
   * @param creator - The creator of the block
   * @param dateCreated - The date the block was created
   * @param actualDataLength - The length of the data before encryption, if known
   * @param canRead - Whether the block can be read
   */
  constructor(
    type: BlockType,
    blockSize: BlockSize,
    data: Buffer,
    checksum?: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    dateCreated?: Date,
    actualDataLength?: number,
    canRead = true,
  ) {
    super(
      type,
      BlockDataType.EncryptedData,
      blockSize,
      data,
      checksum,
      creator,
      dateCreated,
      actualDataLength,
      canRead,
      true,
    );
  }
  /**
   * The length of the encrypted data is the actual data length plus the overhead of the encryption
   */
  public get encryptedLength(): number {
    return this.actualDataLength === (this.blockSize as number)
      ? this.actualDataLength
      : this.actualDataLength + StaticHelpersECIES.eciesOverheadLength;
  }
  /**
   * The ephemeral public key used to encrypt the data
   */
  public get ephemeralPublicKey(): Buffer {
    return this.layerOverheadData.subarray(
      0,
      StaticHelpersECIES.publicKeyLength,
    );
  }
  /**
   * The initialization vector used to encrypt the data
   */
  public get iv(): Buffer {
    return this.layerOverheadData.subarray(
      StaticHelpersECIES.publicKeyLength,
      StaticHelpersECIES.publicKeyLength + StaticHelpersECIES.ivLength,
    );
  }
  /**
   * The authentication tag used to encrypt the data
   */
  public get authTag(): Buffer {
    return this.layerOverheadData.subarray(
      StaticHelpersECIES.publicKeyLength + StaticHelpersECIES.ivLength,
      StaticHelpersECIES.publicKeyLength +
        StaticHelpersECIES.ivLength +
        StaticHelpersECIES.authTagLength,
    );
  }
  /**
   * The overhead of the block is the space taken by the CBL header, encryption auth tag, iv, and ephemeral public key
   */
  public override get overhead(): number {
    return super.overhead + StaticHelpersECIES.eciesOverheadLength;
  }
  /**
   * The layer overhead of this block is the encryption auth tag, iv, and ephemeral public key
   * This excludes the CBL header
   */
  public override get layerOverheadData(): Buffer {
    return this.data.subarray(super.overhead, this.overhead);
  }
}
