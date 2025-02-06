import { createECDH, randomBytes } from 'crypto';
import { BaseBlock } from './blocks/base';
import { ConstituentBlockListBlock } from './blocks/cbl';
import { EncryptedConstituentBlockListBlock } from './blocks/encryptedCbl';
import { EncryptedOwnedDataBlock } from './blocks/encryptedOwnedData';
import { OwnedDataBlock } from './blocks/ownedData';
import { RawDataBlock } from './blocks/rawData';
import { BrightChainMember } from './brightChainMember';
import { CblBlockMetadata } from './cblBlockMetadata';
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
      return await EncryptedConstituentBlockListBlock.from(
        BlockType.ConstituentBlockList,
        BlockDataType.EncryptedData,
        block.blockSize,
        fullData,
        StaticHelpersChecksum.calculateChecksum(fullData),
        creator,
        block.dateCreated,
        block.data.length,
      );
    }

    return await EncryptedOwnedDataBlock.from(
      BlockType.EncryptedOwnedDataBlock,
      BlockDataType.EncryptedData,
      block.blockSize,
      fullData,
      StaticHelpersChecksum.calculateChecksum(fullData),
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

    const decryptedData = StaticHelpersECIES.decryptWithComponents(
      creator.privateKey,
      block.ephemeralPublicKey,
      block.iv,
      block.authTag,
      block.payload,
    );

    return await OwnedDataBlock.from(
      BlockType.OwnedDataBlock,
      BlockDataType.RawData,
      block.blockSize,
      decryptedData,
      StaticHelpersChecksum.calculateChecksum(decryptedData),
      creator,
      block.dateCreated,
      decryptedData.length,
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
      const finalChecksum =
        checksum ?? StaticHelpersChecksum.calculateChecksum(data);
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
      blocks.push(fileData.subarray(i, i + blockSizeNumber));
    }
    return blocks;
  }

  /**
   * XOR blocks with whiteners in a round-robin fashion
   * @param blocks - The blocks to XOR
   * @param whiteners - The whiteners to use (will be reused if fewer than blocks)
   * @returns The XORed blocks
   */
  public static xorBlocksWithWhiteners(
    blocks: Buffer[],
    whiteners: Buffer[],
  ): Buffer[] {
    if (whiteners.length === 0) {
      throw new BlockServiceError(BlockServiceErrorType.NoWhitenersProvided);
    }

    const xorBlocks: Buffer[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      // Use round-robin to select whitener
      const whitener = whiteners[i % whiteners.length];
      const xorBlock = Buffer.alloc(block.length);
      for (let j = 0; j < block.length; j++) {
        xorBlock[j] = block[j] ^ whitener[j];
      }
      xorBlocks.push(xorBlock);
    }
    return xorBlocks;
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
