import { randomBytes } from 'crypto';
import { ConstituentBlockListBlock } from './blocks/cbl';
import { EncryptedConstituentBlockListBlock } from './blocks/encryptedCbl';
import { EncryptedOwnedDataBlock } from './blocks/encryptedOwnedData';
import { OwnedDataBlock } from './blocks/ownedData';
import { BrightChainMember } from './brightChainMember';
import { RANDOM_BLOCKS_PER_TUPLE, TUPLE_SIZE } from './constants';
import {
  BlockSize,
  blockSizeLengths,
  validBlockSizes,
} from './enumerations/blockSizes';
import { BlockType } from './enumerations/blockType';
import { StaticHelpersECIES } from './staticHelpers.ECIES';

export abstract class BlockService {
  public static readonly TupleSize = TUPLE_SIZE;
  public static readonly RandomBlocksPerTuple = RANDOM_BLOCKS_PER_TUPLE;
  public static getBlockSizeForData(dataLength: number): BlockSize {
    if (dataLength < BigInt(0)) {
      return BlockSize.Unknown;
    }
    for (let i = 0; i < blockSizeLengths.length; i++) {
      if (dataLength <= blockSizeLengths[i]) {
        return validBlockSizes[i];
      }
    }
    return BlockSize.Unknown;
  }
  public static encrypt(
    creator: BrightChainMember,
    ownedData: OwnedDataBlock,
  ): EncryptedConstituentBlockListBlock | EncryptedOwnedDataBlock {
    const neededPadding =
      (ownedData.blockSize as number) -
      ownedData.data.length -
      StaticHelpersECIES.eciesOverheadLength;
    const padding = randomBytes(neededPadding);
    const paddedData = Buffer.concat([ownedData.data, padding]);
    const encryptedData = creator.encryptData(paddedData);
    if (encryptedData.length !== ownedData.blockSize) {
      throw new Error('Encrypted data length does not match block size');
    }
    if (ownedData.blockType === BlockType.ConstituentBlockList) {
      return new EncryptedConstituentBlockListBlock(
        ownedData.blockSize,
        encryptedData,
        ownedData.blockSize,
        undefined,
      );
    } else {
      return new EncryptedOwnedDataBlock(
        ownedData.blockSize,
        encryptedData,
        ownedData.data.length,
        undefined,
        undefined,
      );
    }
  }
  public decrypt(
    creator: BrightChainMember,
    encryptedBlock:
      | EncryptedConstituentBlockListBlock
      | EncryptedOwnedDataBlock,
  ): ConstituentBlockListBlock | OwnedDataBlock {
    const decryptedData = creator.decryptData(encryptedBlock.data);
    const data = decryptedData.subarray(
      0,
      encryptedBlock.lengthBeforeEncryption,
    );
    return new BaseBlock(
      this.blockSize,
      data,
      BlockDataType.EphemeralStructuredData,
      this.lengthBeforeEncryption,
      this.dateCreated,
    );
  }
  public xor<T extends BaseBlock>(
    other: BaseBlock,
    otherDataType?: BlockDataType,
  ): T {
    if (this.blockSize !== other.blockSize) {
      throw new Error('Block sizes do not match');
    }
    if (this.data.length !== other.data.length) {
      throw new Error('Block data lengths do not match');
    }
    const blockSize = this.blockSize as number;
    const result = Buffer.alloc(blockSize);
    for (let i = 0; i < blockSize; i++) {
      result[i] = this.data[i] ^ other.data[i];
    }
    return new BaseBlock(
      this.blockSize,
      result,
      otherDataType ?? BlockDataType.RawData,
      blockSize,
    ) as T;
  }
  public static newBlock(
    blockSize: BlockSize,
    data: Buffer,
    blockDataType: BlockDataType,
    lengthBeforeEncryption: number,
    dateCreated?: Date,
    checksum?: ChecksumBuffer,
  ): BaseBlock {
    const blockLength = blockSize as number;
    if (
      blockDataType == BlockDataType.EncryptedData &&
      data.length !== blockLength
    ) {
      throw new Error(
        `Encrypted data length ${data.length} is not a valid block size`,
      );
    } else if (
      blockDataType == BlockDataType.EphemeralStructuredData &&
      data.length > blockLength - StaticHelpersECIES.eciesOverheadLength
    ) {
      throw new Error(
        `Data length ${data.length} is too large for block size ${blockSize}`,
      );
    }
    // fill the buffer with zeros to the next block size
    const buffer = Buffer.alloc(blockLength);
    // copy the data into the buffer
    data.copy(buffer);
    // fill the rest with random bytes
    const fillLength = blockLength - data.length;
    const fillBuffer = randomBytes(fillLength);
    fillBuffer.copy(buffer, data.length);
    const block = new BaseBlock(
      blockSize,
      buffer,
      blockDataType,
      lengthBeforeEncryption,
      dateCreated,
      checksum,
    );
    if (checksum && !block.validate()) {
      throw new Error('Checksum mismatch');
    }
    return block;
  }
}
