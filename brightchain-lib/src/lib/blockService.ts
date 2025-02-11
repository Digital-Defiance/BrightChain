import { randomBytes } from 'crypto';
import { BaseBlock } from './blocks/base';
import { ConstituentBlockListBlock } from './blocks/cbl';
import { EncryptedConstituentBlockListBlock } from './blocks/encryptedCbl';
import { EncryptedOwnedDataBlock } from './blocks/encryptedOwnedData';
import { OwnedDataBlock } from './blocks/ownedData';
import { RawDataBlock } from './blocks/rawData';
import { BrightChainMember } from './brightChainMember';
import { CblBlockMetadata } from './cblBlockMetadata';
import { OFFS_CACHE_PERCENTAGE } from './constants';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockServiceErrorType } from './enumerations/blockServiceErrorType';
import { BlockSize } from './enumerations/blockSizes';
import { BlockType } from './enumerations/blockType';
import { BlockValidationErrorType } from './enumerations/blockValidationErrorType';
import {
  BlockValidationError,
  CannotDecryptBlockError,
  CannotEncryptBlockError,
} from './errors/block';
import { BlockServiceError } from './errors/blockServiceError';
import { GuidV4 } from './guid';
import { IBlock } from './interfaces/blockBase';
import { StaticHelpersChecksum } from './staticHelpers.checksum';
import { StaticHelpersECIES } from './staticHelpers.ECIES';
import { DiskBlockAsyncStore } from './stores/diskBlockAsyncStore';
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
  public static async encrypt(
    creator: BrightChainMember,
    block: OwnedDataBlock,
  ): Promise<EncryptedOwnedDataBlock | EncryptedConstituentBlockListBlock> {
    if (!block.canEncrypt) {
      throw new CannotEncryptBlockError();
    }

    // Encrypt the data - StaticHelpersECIES.encrypt already includes ephemeral public key, iv, and authTag
    const encryptedBuffer = StaticHelpersECIES.encrypt(
      creator.publicKey,
      block.data,
    );

    // Create padded buffer filled with random data for the payload area only
    const payloadBuffer = randomBytes(
      block.blockSize - StaticHelpersECIES.eciesOverheadLength,
    );
    // Create final buffer
    const finalBuffer = Buffer.alloc(block.blockSize);
    // Copy ECIES header (ephemeral public key, IV, auth tag)
    encryptedBuffer.copy(
      finalBuffer,
      0,
      0,
      StaticHelpersECIES.eciesOverheadLength,
    );
    // Copy encrypted data into payload area
    encryptedBuffer.copy(
      finalBuffer,
      StaticHelpersECIES.eciesOverheadLength,
      StaticHelpersECIES.eciesOverheadLength,
      Math.min(encryptedBuffer.length, block.blockSize),
    );
    // Fill remaining space with random data
    payloadBuffer.copy(
      finalBuffer,
      StaticHelpersECIES.eciesOverheadLength +
        encryptedBuffer.length -
        StaticHelpersECIES.eciesOverheadLength,
    );

    // Create encrypted block based on input block type
    if (block.blockType === BlockType.ConstituentBlockList) {
      return await EncryptedConstituentBlockListBlock.from(
        BlockType.ConstituentBlockList,
        BlockDataType.EncryptedData,
        block.blockSize,
        finalBuffer,
        StaticHelpersChecksum.calculateChecksum(finalBuffer),
        creator,
        block.dateCreated,
        block.data.length,
      );
    }

    return await EncryptedOwnedDataBlock.from(
      BlockType.EncryptedOwnedDataBlock,
      BlockDataType.EncryptedData,
      block.blockSize,
      finalBuffer,
      StaticHelpersChecksum.calculateChecksum(finalBuffer),
      creator,
      block.dateCreated,
      block.data.length,
    );
  }

  /**
   * Decrypt a block using ECIES
   */
  public static async decrypt(
    creator: BrightChainMember,
    block: EncryptedOwnedDataBlock | EncryptedConstituentBlockListBlock,
  ): Promise<OwnedDataBlock> {
    if (!block.canDecrypt) {
      throw new CannotDecryptBlockError();
    }

    // Get the encrypted payload (excluding random padding)
    const encryptedPayload = block.data.subarray(
      StaticHelpersECIES.eciesOverheadLength,
      StaticHelpersECIES.eciesOverheadLength + block.actualDataLength,
    );

    const decryptedData = StaticHelpersECIES.decryptWithComponents(
      creator.privateKey,
      block.ephemeralPublicKey,
      block.iv,
      block.authTag,
      encryptedPayload,
    );

    // Create unpadded data buffer
    const unpaddedData = decryptedData.subarray(0, block.actualDataLength);

    return await OwnedDataBlock.from(
      BlockType.OwnedDataBlock,
      BlockDataType.RawData,
      block.blockSize,
      unpaddedData,
      StaticHelpersChecksum.calculateChecksum(unpaddedData),
      creator,
      block.dateCreated,
      unpaddedData.length,
    );
  }

  /**
   * Create a new block with the specified parameters
   */
  public static async createBlock(
    blockSize: BlockSize,
    blockType: BlockType,
    blockDataType: BlockDataType,
    data: Buffer,
    creator?: BrightChainMember,
    checksum?: ChecksumBuffer,
  ): Promise<IBlock> {
    if (data.length === 0) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataCannotBeEmpty,
      );
    }

    if (data.length > blockSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthExceedsCapacity,
      );
    }

    // Handle encrypted data
    if (
      blockDataType === BlockDataType.EncryptedData &&
      creator instanceof BrightChainMember
    ) {
      // Create a temporary OwnedDataBlock to encrypt
      const tempBlock = await OwnedDataBlock.from(
        BlockType.OwnedDataBlock,
        BlockDataType.RawData,
        blockSize,
        data,
        checksum ?? StaticHelpersChecksum.calculateChecksum(data),
        creator,
        undefined,
        data.length,
      );
      // Encrypt the block
      return await this.encrypt(creator, tempBlock);
    }

    // Handle CBL data
    if (
      blockDataType === BlockDataType.EphemeralStructuredData &&
      creator instanceof BrightChainMember
    ) {
      const finalChecksum =
        checksum ?? StaticHelpersChecksum.calculateChecksum(data);
      return await EncryptedConstituentBlockListBlock.from(
        blockType,
        blockDataType,
        blockSize,
        data,
        finalChecksum,
        creator,
        undefined,
        data.length,
      );
    }

    // Handle owned data - create anonymous creator if none provided
    const finalChecksum =
      checksum ?? StaticHelpersChecksum.calculateChecksum(data);
    if (
      blockDataType === BlockDataType.EncryptedData &&
      creator instanceof BrightChainMember
    ) {
      return await EncryptedOwnedDataBlock.from(
        blockType,
        blockDataType,
        blockSize,
        data,
        finalChecksum,
        creator,
        undefined,
        data.length,
      );
    } else if (
      blockDataType === BlockDataType.EphemeralStructuredData &&
      creator instanceof BrightChainMember
    ) {
      return await EncryptedConstituentBlockListBlock.from(
        blockType,
        blockDataType,
        blockSize,
        data,
        finalChecksum,
        creator,
        undefined,
        data.length,
      );
    } else {
      return await OwnedDataBlock.from(
        blockType,
        blockDataType,
        blockSize,
        data,
        finalChecksum,
        creator ?? GuidV4.new(),
        undefined,
        data.length,
      );
    }
  }

  /**
   * Break up input file into blocks
   * @param fileData - The input file data
   * @param blockSize - The size of each block
   * @returns An array of blocks
   */
  public static breakFileIntoBlocks(
    fileData: Buffer,
    blockSize: BlockSize,
  ): Buffer[] {
    const blocks: Buffer[] = [];
    const blockSizeNumber = blockSize as number;
    for (let i = 0; i < fileData.length; i += blockSizeNumber) {
      const blockData = fileData.subarray(
        i,
        Math.min(i + blockSizeNumber, fileData.length),
      );
      blocks.push(blockData);
    }
    return blocks;
  }

  /**
   * Generate whiteners following OFFS guidelines
   * @param blockSize - Size of each whitener block
   * @param count - Number of whiteners to generate
   * @param store - DiskBlockAsyncStore to use for cached blocks
   * @returns Array of whitener buffers and their checksums
   */
  public static async generateWhiteners(
    blockSize: BlockSize,
    count: number,
    store: DiskBlockAsyncStore,
  ): Promise<{ whiteners: Buffer[]; checksums: ChecksumBuffer[] }> {
    const whiteners: Buffer[] = [];
    const checksums: ChecksumBuffer[] = [];

    // Get random blocks from store according to OFFS percentage
    const targetCacheCount = Math.floor(count * OFFS_CACHE_PERCENTAGE);
    const cachedBlocks = await store.getRandomBlocks(targetCacheCount);

    // Use the cached blocks we got
    for (const blockChecksum of cachedBlocks) {
      const block = await store.getData(blockChecksum);
      whiteners.push(block.data);
      checksums.push(blockChecksum);
    }

    // Generate new random blocks for the remainder
    const remainingCount = count - whiteners.length;
    for (let i = 0; i < remainingCount; i++) {
      const whitener = randomBytes(blockSize as number);
      const checksum = StaticHelpersChecksum.calculateChecksum(whitener);
      whiteners.push(whitener);
      checksums.push(checksum);
    }

    return { whiteners, checksums };
  }

  /**
   * XOR a single block with all whiteners
   * @param block - The block to XOR
   * @param whiteners - The whiteners to use
   * @returns The XORed block
   */
  public static xorBlockWithWhiteners(
    block: Buffer,
    whiteners: Buffer[],
  ): Buffer {
    if (whiteners.length === 0) {
      throw new BlockServiceError(BlockServiceErrorType.NoWhitenersProvided);
    }

    const xorBlock = Buffer.from(block);
    // XOR with all whiteners
    for (const whitener of whiteners) {
      for (let j = 0; j < whitener.length; j++) {
        xorBlock[j] = xorBlock[j] ^ whitener[j];
      }
    }
    return xorBlock;
  }

  /**
   * XOR multiple blocks with whiteners in a round-robin fashion
   * @param blocks - The blocks to XOR
   * @param whiteners - The whiteners to use (will be reused if fewer than blocks)
   * @returns Array of XORed blocks
   */
  public static xorBlocksWithWhitenersRoundRobin(
    blocks: Buffer[],
    whiteners: Buffer[],
  ): Buffer[] {
    if (whiteners.length === 0) {
      throw new BlockServiceError(BlockServiceErrorType.NoWhitenersProvided);
    }

    return blocks.map((block, blockIndex) => {
      const xorBlock = Buffer.from(block);
      const whitener = whiteners[blockIndex % whiteners.length];
      for (let j = 0; j < block.length; j++) {
        xorBlock[j] = xorBlock[j] ^ whitener[j];
      }
      return xorBlock;
    });
  }

  /**
   * Create and store CBL
   * @param blocks - The blocks to include in the CBL
   * @param creator - The creator of the CBL
   * @returns The created CBL
   */
  public static async createAndStoreCBL(
    blocks: BaseBlock[],
    creator: BrightChainMember,
    fileDataLength: bigint,
  ): Promise<ConstituentBlockListBlock> {
    if (blocks.length === 0) {
      throw new BlockServiceError(BlockServiceErrorType.EmptyBlocksArray);
    }
    const blockIds = await Promise.all(blocks.map((block) => block.idChecksum));
    if (!blocks.every((block) => block.blockSize === blocks[0].blockSize)) {
      throw new BlockServiceError(BlockServiceErrorType.BlockSizeMismatch);
    }
    const metadata: CblBlockMetadata = new CblBlockMetadata(
      BlockSize.Huge,
      BlockType.ConstituentBlockList,
      BlockDataType.EphemeralStructuredData,
      StaticHelpersChecksum.Sha3ChecksumBufferLength * blocks.length,
      fileDataLength,
      blocks[0].dateCreated,
      creator,
    );
    const blockIdsBuffer = Buffer.concat(blockIds);
    const header = ConstituentBlockListBlock.makeCblHeader(
      creator,
      new Date(metadata.dateCreated),
      blockIds.length,
      metadata.fileDataLength,
      blockIdsBuffer,
      metadata.size,
    );
    const data = Buffer.concat([header.headerData, blockIdsBuffer]);
    const checksum = StaticHelpersChecksum.calculateChecksum(data);
    const cbl = new ConstituentBlockListBlock(
      creator,
      metadata,
      data,
      checksum,
    );

    // Store the CBL (implementation depends on the storage mechanism)
    // For example, you might store it in a database or a file system
    // Here, we'll just return the CBL for now
    return cbl;
  }

  /**
   * Store a CBL block to disk using DiskBlockAsyncStore
   * @param cbl - The CBL block to store
   * @param store - The DiskBlockAsyncStore instance
   */
  public static async storeCBLToDisk(
    cbl: ConstituentBlockListBlock,
    store: DiskBlockAsyncStore,
  ): Promise<void> {
    // Convert CBL to RawDataBlock before storing
    const rawData = new RawDataBlock(
      cbl.blockSize,
      cbl.data,
      cbl.dateCreated,
      cbl.idChecksum,
    );
    await store.setData(rawData);
  }
}
