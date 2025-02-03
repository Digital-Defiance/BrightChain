import { BrightChainMember } from '../brightChainMember';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { GuidV4 } from '../guid';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
import { EncryptedBlock } from './encrypted';
export class EncryptedBlockFactory {
  private static blockConstructors: {
    [key: string]: new (
      type: BlockType,
      dataType: BlockDataType,
      data: Buffer,
      checksum: ChecksumBuffer,
      metadata: EncryptedBlockMetadata,
      canRead: boolean,
      canPersist: boolean,
    ) => EncryptedBlock;
  } = {};

  public static registerBlockType(
    type: BlockType,
    constructor: new (
      type: BlockType,
      dataType: BlockDataType,
      data: Buffer,
      checksum: ChecksumBuffer,
      metadata: EncryptedBlockMetadata,
      canRead: boolean,
      canPersist: boolean,
    ) => EncryptedBlock,
  ): void {
    this.blockConstructors[type] = constructor;
  }

  public static async createBlock(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    dateCreated?: Date,
    actualDataLength?: number,
    canRead = true,
    canPersist = true,
  ): Promise<EncryptedBlock> {
    // Validate data length
    if (data.length < StaticHelpersECIES.eciesOverheadLength) {
      throw new Error('Data too short to contain encryption header');
    }

    // Total data length must not exceed block size
    if (data.length > (blockSize as number)) {
      throw new Error('Data length exceeds block capacity');
    }

    // For encrypted blocks with known actual data length:
    // 1. The actual data length must not exceed available capacity
    // 2. The total encrypted length must not exceed block size
    if (actualDataLength !== undefined) {
      const availableCapacity =
        (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
      if (actualDataLength > availableCapacity) {
        throw new Error('Data length exceeds block capacity');
      }
    }

    // Calculate and validate checksum
    const computedChecksum = StaticHelpersChecksum.calculateChecksum(data);
    if (checksum && !computedChecksum.equals(checksum)) {
      throw new ChecksumMismatchError(checksum, computedChecksum);
    }
    const finalChecksum = checksum ?? computedChecksum;

    const metadata: EphemeralBlockMetadata = new EphemeralBlockMetadata(
      blockSize,
      type,
      BlockDataType.EncryptedData,
      actualDataLength ?? data.length - StaticHelpersECIES.eciesOverheadLength,
      false,
      creator,
      dateCreated,
    );

    const Constructor = this.blockConstructors[type];
    if (!Constructor) {
      throw new Error(`Invalid block type ${type}`);
    }

    return new Constructor(
      type,
      BlockDataType.EncryptedData,
      data,
      finalChecksum,
      EncryptedBlockMetadata.fromEphemeralBlockMetadata(metadata),
      canRead,
      canPersist,
    );
  }
}
