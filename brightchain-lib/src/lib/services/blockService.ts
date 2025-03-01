import { randomBytes } from 'crypto';
import { fileTypeFromBuffer, fileTypeStream } from 'file-type';
import { stat } from 'fs/promises';
import { basename } from 'path';
import { Readable } from 'stream';
import { BaseBlock } from '../blocks/base';
import { ConstituentBlockListBlock } from '../blocks/cbl';
import { EncryptedBlock } from '../blocks/encrypted';
import { BlockEncryption } from '../blocks/encryption';
import { EphemeralBlock } from '../blocks/ephemeral';
import { ExtendedCBL } from '../blocks/extendedCbl';
import { RandomBlock } from '../blocks/random';
import { RawDataBlock } from '../blocks/rawData';
import { BrightChainMember } from '../brightChainMember';
import { CblBlockMetadata } from '../cblBlockMetadata';
import { ECIES, OFFS_CACHE_PERCENTAGE, TUPLE } from '../constants';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockServiceErrorType } from '../enumerations/blockServiceErrorType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import { EciesErrorType } from '../enumerations/eciesErrorType';
import { BlockValidationError, CannotEncryptBlockError } from '../errors/block';
import { BlockServiceError } from '../errors/blockServiceError';
import { EciesError } from '../errors/eciesError';
import { GuidV4 } from '../guid';
import { IBaseBlock } from '../interfaces/blocks/base';
import { ServiceLocator } from '../services/serviceLocator';
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore';
import { ChecksumBuffer } from '../types';
import { CBLService } from './cblService';

/**
 * BlockService provides utility functions for working with blocks.
 * It handles block creation, encryption, decryption, and XOR operations.
 */
export class BlockService {
  public static diskBlockAsyncStore: DiskBlockAsyncStore | undefined =
    undefined;

  public static initialize(diskBlockAsyncStore: DiskBlockAsyncStore) {
    // If already initialized with the same store, just return
    if (BlockService.diskBlockAsyncStore === diskBlockAsyncStore) {
      return;
    }

    // If already initialized with a different store, handle appropriately
    if (BlockService.diskBlockAsyncStore) {
      // For tests, reset the store instead of throwing an error
      if (process.env['NODE_ENV'] === 'test') {
        BlockService.diskBlockAsyncStore = diskBlockAsyncStore;
        return;
      }
      // In production, throw an error
      throw new BlockServiceError(BlockServiceErrorType.AlreadyInitialized);
    }

    BlockService.diskBlockAsyncStore = diskBlockAsyncStore;
  }

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
    block: EphemeralBlock,
  ): Promise<EncryptedBlock> {
    if (!block.canEncrypt) {
      throw new CannotEncryptBlockError();
    }
    return BlockEncryption.encrypt(
      creator,
      block,
      block instanceof ExtendedCBL
        ? BlockType.ExtendedConstituentBlockListBlock
        : BlockType.ConstituentBlockList,
    );
  }

  public static async decrypt(
    creator: BrightChainMember,
    block: EncryptedBlock,
  ): Promise<EphemeralBlock> {
    if (creator.privateKey === undefined) {
      throw new EciesError(EciesErrorType.PrivateKeyNotLoaded);
    }

    // Get the encrypted payload (excluding random padding)
    const encryptedPayload = block.data.subarray(
      ECIES.OVERHEAD_SIZE,
      ECIES.OVERHEAD_SIZE + block.lengthBeforeEncryption,
    );

    const decryptedData =
      ServiceLocator.getServiceProvider().eciesService.decryptWithComponents(
        creator.privateKey,
        block.ephemeralPublicKey,
        block.iv,
        block.authTag,
        encryptedPayload,
      );

    // Create unpadded data buffer
    const unpaddedData = decryptedData.subarray(
      0,
      block.lengthBeforeEncryption,
    );

    return await EphemeralBlock.from(
      BlockType.EphemeralOwnedDataBlock,
      BlockDataType.RawData,
      block.blockSize,
      unpaddedData,
      ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
        unpaddedData,
      ),
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
    creator: BrightChainMember,
    checksum?: ChecksumBuffer,
  ): Promise<IBaseBlock> {
    if (data.length === 0) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataCannotBeEmpty,
      );
    }

    if (
      data.length > blockSize ||
      (blockDataType === BlockDataType.EncryptedData &&
        data.length + ECIES.OVERHEAD_SIZE > blockSize)
    ) {
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
      const tempBlock = await EphemeralBlock.from(
        BlockType.EphemeralOwnedDataBlock,
        BlockDataType.RawData,
        blockSize,
        data,
        checksum ??
          ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
            data,
          ),
        creator,
        undefined,
        data.length,
      );
      // Encrypt the block
      return await BlockService.encrypt(creator, tempBlock);
    }

    // Handle CBL data
    if (
      blockDataType === BlockDataType.EphemeralStructuredData &&
      creator instanceof BrightChainMember
    ) {
      const finalChecksum =
        checksum ??
        ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
          data,
        );
      return await EncryptedBlock.from(
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
      checksum ??
      ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
        data,
      );
    if (
      blockDataType === BlockDataType.EncryptedData &&
      creator instanceof BrightChainMember
    ) {
      return await EncryptedBlock.from(
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
      return await EncryptedBlock.from(
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
      return await EphemeralBlock.from(
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
   * Get the length of a file
   * @param fileData - the file data to get the length of
   * @param filePath - the path to the file (optional)
   * @returns the length of the file
   */
  public static async getFileLength(
    fileData: Buffer | Readable,
    filePath?: string, // allow overriding or providing the path
  ): Promise<number> {
    if (Buffer.isBuffer(fileData)) {
      return fileData.length;
    }

    // Check if the stream has a "path" property or a provided filePath
    const pathToStat = filePath
      ? filePath
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fileData as any).path && typeof (fileData as any).path === 'string'
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (fileData as any).path
        : null;

    if (pathToStat) {
      const stats = await stat(pathToStat);
      return stats.size;
    }

    throw new BlockServiceError(BlockServiceErrorType.CannotDetermineLength);
  }

  /**
   * Get the MIME type of a file/stream
   * @param fileData - the file data to get the MIME type of
   * @returns the MIME type of the file
   */
  public async getMimeType(fileData: Buffer | Readable): Promise<string> {
    let mimeType: string | undefined = undefined;
    if (fileData instanceof Readable) {
      // If the input is a Readable stream, using fileTypeStream will
      // consume a small chunk but then re-emit it in the returned stream,
      // preserving the original data flow.
      const streamResult = await fileTypeStream(fileData);
      mimeType = streamResult.fileType?.mime;
    } else if (Buffer.isBuffer(fileData)) {
      // For native Buffer.
      const result = await fileTypeFromBuffer(fileData);
      mimeType = result?.mime;
    }

    if (
      mimeType === undefined ||
      mimeType === null ||
      mimeType.trim().length === 0
    ) {
      throw new BlockServiceError(
        BlockServiceErrorType.CannotDetermineMimeType,
      );
    }
    return mimeType;
  }

  /**
   * Get the file name of a file/stream
   * @param fileData - the file data to get the file name of
   * @param filePath - the file path to use if fileData is a Buffer or Buffer
   * @returns the file name of the file
   */
  public getFileName(fileData: Buffer | Readable, filePath?: string): string {
    // For Buffer or Buffer, require a filePath parameter.
    if (Buffer.isBuffer(fileData)) {
      if (filePath) {
        return basename(filePath);
      }
      throw new BlockServiceError(BlockServiceErrorType.FilePathNotProvided);
    }

    // For Readable streams, use provided filePath or check for a stream 'path' property.
    const pathToUse =
      filePath ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((fileData as any).path &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeof (fileData as any).path === 'string' &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fileData as any).path);

    if (pathToUse) {
      return basename(pathToUse);
    }

    throw new BlockServiceError(BlockServiceErrorType.CannotDetermineFileName);
  }

  /**
   * Process file data in chunks to reduce memory usage
   * @param fileData - The input file data
   * @param encrypt - Whether to encrypt the blocks
   * @param chunkCount - Number of blocks to process at a time
   * @param processChunk - Function to process each chunk of blocks
   * @param recipient - The recipient of the blocks (required if encrypt is true)
   * @param filePath - The path to the file (optional)
   * @param fileSize - The size of the file (optional)
   */
  public static async processFileInChunks(
    fileData: Buffer | Readable,
    encrypt: boolean,
    chunkCount: number,
    processChunk: (chunkBlocks: Buffer[]) => Promise<void>,
    recipient?: BrightChainMember,
    filePath?: string,
    fileSize?: number,
  ): Promise<number> {
    if (encrypt && !recipient) {
      throw new BlockServiceError(
        BlockServiceErrorType.RecipientRequiredForEncryption,
      );
    }

    const fileLength =
      fileSize ?? (await BlockService.getFileLength(fileData, filePath));
    const blockSize = BlockService.getBlockSizeForData(fileLength);
    if (blockSize === BlockSize.Unknown || (blockSize as number) <= 0) {
      throw new BlockServiceError(
        BlockServiceErrorType.CannotDetermineBlockSize,
      );
    }

    const blockSizeNumber = blockSize as number;
    const payloadPerBlock = encrypt
      ? blockSizeNumber - ECIES.OVERHEAD_SIZE
      : blockSizeNumber;

    let totalLength = 0;
    let chunkDatas: Buffer[] = [];

    // Helper to process a full chunk when ready
    const flushChunk = async () => {
      if (chunkDatas.length > 0) {
        await processChunk(chunkDatas);
        chunkDatas = [];
      }
    };

    // Helper to create a block from a given slice
    const createBlock = async (dataSlice: Buffer): Promise<void> => {
      // Pad if needed
      if (dataSlice.length < payloadPerBlock) {
        const padding = randomBytes(payloadPerBlock - dataSlice.length);
        padding.copy(dataSlice, dataSlice.length);
      }
      if (encrypt && recipient) {
        const encryptedData =
          await ServiceLocator.getServiceProvider().eciesService.encrypt(
            recipient.publicKey,
            dataSlice,
          );
        chunkDatas.push(encryptedData);
      } else {
        chunkDatas.push(dataSlice);
      }
    };

    // If we have an in-memory buffer
    if (Buffer.isBuffer(fileData)) {
      const totalBlocks = Math.ceil(fileLength / payloadPerBlock);
      for (let j = 0; j < totalBlocks; j++) {
        const offset = j * payloadPerBlock;
        const end = Math.min(offset + payloadPerBlock, fileLength);
        const dataSlice = fileData.subarray(offset, end);
        await createBlock(dataSlice);
        if (chunkDatas.length === chunkCount) {
          await flushChunk();
        }
      }
    } else {
      // For Readable streams, accumulate data until payloadPerBlock is available
      let bufferAcc = Buffer.alloc(0);
      for await (const chunk of fileData) {
        bufferAcc = Buffer.concat([bufferAcc, chunk]);
        // Process as many complete blocks as possible
        while (bufferAcc.length >= payloadPerBlock) {
          const blockSlice = bufferAcc.subarray(0, payloadPerBlock);
          await createBlock(blockSlice);
          totalLength += payloadPerBlock;
          bufferAcc = bufferAcc.subarray(payloadPerBlock);
          if (chunkDatas.length === chunkCount) {
            await flushChunk();
          }
        }
      }
      // Process any remaining bytes (pad if needed)
      if (bufferAcc.length > 0) {
        totalLength += bufferAcc.length;
        await createBlock(bufferAcc);
      }
    }
    await flushChunk();

    return totalLength;
  }

  /**
   * Gather/generate whiteners following OFFS guidelines
   * @param blockSize - Size of each whitener block
   * @param count - Number of whiteners needed
   * @returns Array of whitener buffers and their checksums
   */
  public static async gatherWhiteners(
    blockSize: BlockSize,
    count: number,
    dateCreated?: Date,
  ): Promise<(RawDataBlock | RandomBlock)[]> {
    if (dateCreated === undefined) {
      dateCreated = new Date();
    }
    if (!BlockService.diskBlockAsyncStore) {
      throw new BlockServiceError(BlockServiceErrorType.Uninitialized);
    }
    const whiteners: (RawDataBlock | RandomBlock)[] = [];

    // Get random blocks from store according to OFFS percentage
    const targetCacheCount = Math.floor(count * OFFS_CACHE_PERCENTAGE);
    const cachedBlocks =
      await BlockService.diskBlockAsyncStore.getRandomBlocks(targetCacheCount);

    // Use the cached blocks we got
    for (const blockChecksum of cachedBlocks) {
      const block =
        await BlockService.diskBlockAsyncStore.getData(blockChecksum);
      whiteners.push(block);
    }

    // Generate new random blocks for the remainder
    const remainingCount = count - whiteners.length;
    for (let i = 0; i < remainingCount; i++) {
      const whitenerBlock = RandomBlock.new(blockSize, dateCreated);
      await BlockService.diskBlockAsyncStore.setData(whitenerBlock);
      whiteners.push(whitenerBlock);
    }

    return whiteners;
  }

  /**
   * XOR a single block with all whiteners
   * @param block - The block to XOR
   * @param whiteners - The whiteners to use
   * @returns The XORed block
   */
  public static xorBlockWithWhiteners(
    block: Buffer,
    whiteners: (Buffer | RandomBlock | RawDataBlock)[],
  ): Buffer {
    if (whiteners.length === 0) {
      throw new BlockServiceError(BlockServiceErrorType.NoWhitenersProvided);
    }

    const xorBlock = Buffer.from(block);
    // XOR with all whiteners
    for (const whitener of whiteners) {
      const data: Buffer = Buffer.isBuffer(whitener) ? whitener : whitener.data;
      for (let j = 0; j < data.length; j++) {
        xorBlock[j] = xorBlock[j] ^ data[j];
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
   * Create CBL from blocks
   * @param blocks - The blocks to include in the CBL
   * @param creator - The creator of the CBL
   * @returns The created CBL
   */
  private static readonly DEFAULT_CHUNK_SIZE = TUPLE.SIZE * 3; // Process 9 blocks at a time

  public static async createCBL(
    blocks: BaseBlock[],
    creator: BrightChainMember,
    fileDataLength: number,
  ): Promise<ConstituentBlockListBlock> {
    if (blocks.length === 0) {
      throw new BlockServiceError(BlockServiceErrorType.EmptyBlocksArray);
    }

    // Validate block sizes
    if (!blocks.every((block) => block.blockSize === blocks[0].blockSize)) {
      throw new BlockServiceError(BlockServiceErrorType.BlockSizeMismatch);
    }

    // Calculate total size needed
    const totalSize =
      ServiceLocator.getServiceProvider().checksumService.checksumBufferLength *
      blocks.length;

    // Calculate total size including header and signature
    const headerSize = CBLService.HeaderOffsets.CreatorSignature;
    const signatureSize = ECIES.SIGNATURE_LENGTH;
    const totalDataSize = headerSize + signatureSize + totalSize;

    // Calculate appropriate block size for CBL
    // Start with a larger block size to ensure it can hold all addresses
    const cblBlockSize = BlockSize.Small; // Use Small (4KB) instead of Message (512B)

    // Create metadata with appropriate block size
    const metadata = new CblBlockMetadata(
      cblBlockSize,
      BlockType.ConstituentBlockList,
      BlockDataType.EphemeralStructuredData,
      totalDataSize, // Include header and signature in length
      fileDataLength,
      creator,
      blocks[0].dateCreated,
    );

    const blockIds: ChecksumBuffer[] = blocks.map((block) => block.idChecksum);

    // Create address list buffer efficiently
    const addressListBuffer = Buffer.concat(blockIds);

    // Create header
    const header = ServiceLocator.getServiceProvider().cblService.makeCblHeader(
      creator,
      new Date(metadata.dateCreated),
      blockIds.length,
      metadata.fileDataLength,
      addressListBuffer,
      cblBlockSize,
    );

    // Create final data buffer with exact size
    const dataSize = header.headerData.length + totalSize;
    // Allocate buffer with the exact size needed for the CBL data
    // This ensures the block size used for signature validation matches the one used for creating the header
    const finalData = Buffer.alloc(dataSize);

    // Copy header
    header.headerData.copy(finalData, 0);

    // Copy block IDs in chunks
    let offset = header.headerData.length;
    for (let i = 0; i < blockIds.length; i += BlockService.DEFAULT_CHUNK_SIZE) {
      const end = Math.min(
        i + BlockService.DEFAULT_CHUNK_SIZE,
        blockIds.length,
      );
      const chunkIds = blockIds.slice(i, end);

      for (const blockId of chunkIds) {
        blockId.copy(finalData, offset);
        offset += blockId.length;
      }

      // Allow garbage collection between chunks
      chunkIds.length = 0;
    }

    // Create CBL with minimal copying
    return new ConstituentBlockListBlock(finalData, creator);
  }

  /**
   * Store a CBL block to disk using DiskBlockAsyncStore
   * @param cbl - The CBL block to store
   */
  public static async storeCBLToDisk(
    cbl: ConstituentBlockListBlock,
  ): Promise<void> {
    if (!BlockService.diskBlockAsyncStore) {
      throw new BlockServiceError(BlockServiceErrorType.Uninitialized);
    }
    // Convert CBL to RawDataBlock before storing
    const rawData = new RawDataBlock(
      cbl.blockSize,
      cbl.data,
      cbl.dateCreated,
      cbl.idChecksum,
    );
    await BlockService.diskBlockAsyncStore.setData(rawData);
  }

  /**
   * Store a block to disk using DiskBlockAsyncStore
   * @param block - The block to store
   */
  public static async storeBlockToDisk(block: RawDataBlock): Promise<void> {
    if (!BlockService.diskBlockAsyncStore) {
      throw new BlockServiceError(BlockServiceErrorType.Uninitialized);
    }
    if (await BlockService.diskBlockAsyncStore.has(block.idChecksum)) {
      throw new BlockServiceError(
        BlockServiceErrorType.BlockAlreadyExists,
        undefined,
        {
          ID: block.idChecksum.toString('hex'),
        },
      );
    }
    await BlockService.diskBlockAsyncStore.setData(block);
  }

  /**
   * Delete a random block from disk
   * While ingesting a file, if an error occurs, we will delete any brand new random blocks and xor'd prime blocks during the rollback process (leaving any existing whitener blocks untouched)
   * @param block The random or prime block to delete
   */
  public static async deleteBlockFromDisk(
    block: RandomBlock | RawDataBlock,
  ): Promise<void> {
    if (!BlockService.diskBlockAsyncStore) {
      throw new BlockServiceError(BlockServiceErrorType.Uninitialized);
    }
    if (await BlockService.diskBlockAsyncStore.has(block.idChecksum)) {
      await BlockService.diskBlockAsyncStore.deleteData(block.idChecksum);
    }
  }

  /**
   * In order to add a file to the store, it must be broken up into blocks, encrypted if necessary, xored with whiteners,
   * a CBL created, and all result blocks and used whiteners stored to disk.
   * @param fileData - The file data to process
   * @param createECBL - Whether to create an ECBL (Extended CBL with filename)
   * @param encrypt - Whether to encrypt the blocks
   * @param creator - The creator of the blocks
   * @param recipient - The recipient of the blocks
   * @param filePath - The path to the file (optional)
   * @param dateCreated - The date the file was created (optional)
   * @returns The CBL and the blocks
   */
  public async ingestFile(
    fileData: Buffer | Readable,
    createECBL: boolean,
    encrypt: boolean,
    creator: BrightChainMember,
    recipient?: BrightChainMember,
    filePath?: string,
    dateCreated?: Date,
  ): Promise<ConstituentBlockListBlock | ExtendedCBL> {
    if (dateCreated === undefined) {
      dateCreated = new Date();
    }
    if (!BlockService.diskBlockAsyncStore) {
      throw new BlockServiceError(BlockServiceErrorType.Uninitialized);
    }
    const fileSize = await BlockService.getFileLength(fileData);
    const mimeType = await this.getMimeType(fileData);
    const fileName = this.getFileName(fileData, filePath);
    const blockSize = BlockService.getBlockSizeForData(fileSize);
    const rollbackOperations: (() => Promise<void>)[] = [];
    const blockIDs: ChecksumBuffer[] = [];
    try {
      await BlockService.processFileInChunks(
        fileData,
        encrypt,
        TUPLE.SIZE,
        async (chunkBlocks: Buffer[]) => {
          for (const sourceBlock of chunkBlocks) {
            const whiteners = await BlockService.gatherWhiteners(
              blockSize,
              TUPLE.SIZE - 1,
              dateCreated,
            );
            blockIDs.push(...whiteners.map((w) => w.idChecksum));
            // if we need to rollback, we'll delete the new random blocks, but not reused whiteners
            rollbackOperations.push(
              ...whiteners
                .filter((w) => w instanceof RandomBlock)
                .map((w) => async () => {
                  await BlockService.deleteBlockFromDisk(w);
                }),
            );
            const primeBlock = new RawDataBlock(
              blockSize,
              BlockService.xorBlockWithWhiteners(sourceBlock, whiteners),
              dateCreated,
              undefined,
              BlockType.RawData,
              BlockDataType.RawData,
            );
            blockIDs.push(primeBlock.idChecksum);
            await BlockService.storeBlockToDisk(primeBlock);
            rollbackOperations.push(async () => {
              await BlockService.deleteBlockFromDisk(primeBlock);
            });
          }
        },
        recipient,
        filePath,
      );
      const header =
        ServiceLocator.getServiceProvider().cblService.makeCblHeader(
          creator,
          dateCreated,
          blockIDs.length,
          fileSize,
          Buffer.concat(blockIDs),
          blockSize,
          createECBL
            ? {
                fileName,
                mimeType,
              }
            : undefined,
        );
      const data = Buffer.concat([header.headerData, ...blockIDs]);
      if (createECBL) {
        return new ExtendedCBL(data, creator);
      }
      return new ConstituentBlockListBlock(data, creator);
    } catch (e) {
      console.error('Error ingesting file:', e);
      await Promise.all(rollbackOperations);
      throw e;
    }
  }
}
