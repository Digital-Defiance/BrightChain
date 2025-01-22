import { createECDH, randomBytes } from 'crypto';
import { EncryptedConstituentBlockListBlock } from './blocks/encryptedCbl';
import { EncryptedOwnedDataBlock } from './blocks/encryptedOwnedData';
import { OwnedDataBlock } from './blocks/ownedData';
import { BrightChainMember } from './brightChainMember';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSizes';
import { BlockType } from './enumerations/blockType';
import { GuidV4 } from './guid';
import { IBlock } from './interfaces/blockBase';
import { StaticHelpersChecksum } from './staticHelpers.checksum';
import { StaticHelpersECIES } from './staticHelpers.ECIES';
import { ChecksumBuffer } from './types';

/**
 * BlockService provides utility functions for working with blocks.
 * It handles block creation, encryption, decryption, and XOR operations.
 */
export class BlockService {
  /**
   * Get the appropriate block size for a given data length
   * @param dataLength - The length of data in bytes
   * @returns The appropriate BlockSize enum value
   */
  public static getBlockSizeForData(dataLength: number): BlockSize {
    if (dataLength < 0) {
      return BlockSize.Unknown;
    }

    // Return the appropriate block size based on data length
    if (dataLength >= BlockSize.Huge) {
      return BlockSize.Unknown;
    }
    if (dataLength >= BlockSize.Large) {
      return BlockSize.Huge;
    }
    if (dataLength >= BlockSize.Medium) {
      return BlockSize.Large;
    }
    if (dataLength >= BlockSize.Small) {
      return BlockSize.Medium;
    }
    if (dataLength >= BlockSize.Tiny) {
      return BlockSize.Small;
    }
    if (dataLength >= BlockSize.Message) {
      return BlockSize.Tiny;
    }
    return BlockSize.Message;
  }

  /**
   * Encrypt a block using ECIES
   */
  public static encrypt(
    creator: BrightChainMember,
    block: OwnedDataBlock,
  ): EncryptedOwnedDataBlock | EncryptedConstituentBlockListBlock {
    if (!block.canEncrypt) {
      throw new Error('Block cannot be encrypted');
    }

    // Create encryption metadata
    const ecdh = createECDH(StaticHelpersECIES.curveName);
    ecdh.generateKeys();
    const ephemeralPublicKey = ecdh.getPublicKey();
    const iv = randomBytes(StaticHelpersECIES.ivLength);

    // Encrypt the data
    const encryptedBuffer = StaticHelpersECIES.encrypt(
      creator.publicKey,
      block.data,
    );

    // Extract components from encrypted buffer
    const authTag = encryptedBuffer.subarray(
      StaticHelpersECIES.publicKeyLength + StaticHelpersECIES.ivLength,
      StaticHelpersECIES.publicKeyLength +
        StaticHelpersECIES.ivLength +
        StaticHelpersECIES.authTagLength,
    );
    const encryptedData = encryptedBuffer.subarray(
      StaticHelpersECIES.publicKeyLength +
        StaticHelpersECIES.ivLength +
        StaticHelpersECIES.authTagLength,
    );

    // Combine encryption metadata with encrypted data
    const fullData = Buffer.concat([
      ephemeralPublicKey,
      iv,
      authTag,
      encryptedData,
    ]);

    // Create encrypted block based on input block type
    if (block.blockType === BlockType.ConstituentBlockList) {
      return new EncryptedConstituentBlockListBlock(
        block.blockSize,
        fullData,
        StaticHelpersChecksum.calculateChecksum(fullData),
        creator,
        block.data.length,
        block.dateCreated,
      );
    }

    return new EncryptedOwnedDataBlock(
      block.blockSize,
      fullData,
      StaticHelpersChecksum.calculateChecksum(fullData),
      creator,
      block.data.length,
      block.dateCreated,
    );
  }

  /**
   * Decrypt a block using ECIES
   */
  public static decrypt(
    creator: BrightChainMember,
    block: EncryptedOwnedDataBlock | EncryptedConstituentBlockListBlock,
  ): OwnedDataBlock {
    if (!block.canDecrypt) {
      throw new Error('Block cannot be decrypted');
    }

    const decryptedData = StaticHelpersECIES.decryptWithComponents(
      creator.privateKey,
      block.ephemeralPublicKey,
      block.iv,
      block.authTag,
      block.payload,
    );

    return new OwnedDataBlock(
      creator,
      block.blockSize,
      decryptedData,
      undefined,
      block.dateCreated,
      decryptedData.length,
    );
  }

  /**
   * Create a new block with the specified parameters
   */
  public static createBlock(
    blockSize: BlockSize,
    blockType: BlockType,
    blockDataType: BlockDataType,
    data: Buffer,
    creator?: BrightChainMember,
    checksum?: ChecksumBuffer,
  ): IBlock {
    if (data.length === 0) {
      throw new Error('Data cannot be empty');
    }

    if (data.length > blockSize) {
      throw new Error(
        `Data length (${data.length}) exceeds block size (${blockSize})`,
      );
    }

    // Handle encrypted data
    if (
      blockDataType === BlockDataType.EncryptedData &&
      creator instanceof BrightChainMember
    ) {
      return new EncryptedOwnedDataBlock(
        blockSize,
        data,
        checksum,
        creator,
        data.length,
      );
    }

    // Handle CBL data
    if (
      blockDataType === BlockDataType.EphemeralStructuredData &&
      creator instanceof BrightChainMember
    ) {
      return new EncryptedConstituentBlockListBlock(
        blockSize,
        data,
        checksum,
        creator,
        data.length,
      );
    }

    // Handle owned data - create anonymous creator if none provided
    return new OwnedDataBlock(
      creator ?? GuidV4.new(),
      blockSize,
      data,
      checksum,
      undefined,
      data.length,
    );
  }
}
