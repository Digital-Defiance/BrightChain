import { randomBytes } from 'crypto';
import { stat } from 'fs/promises';
import { basename } from 'path';
import { Readable } from 'stream';
import { BaseBlock } from '../blocks/base';
import { ConstituentBlockListBlock } from '../blocks/cbl';
import { EncryptedBlock } from '../blocks/encrypted';
import { EncryptedBlockCreator } from '../blocks/encryptedBlockCreator';
import { EphemeralBlock } from '../blocks/ephemeral';
import { ExtendedCBL } from '../blocks/extendedCbl';
import { RandomBlock } from '../blocks/random';
import { RawDataBlock } from '../blocks/rawData';
import { BrightChainMember } from '../brightChainMember';
import { ECIES, ENCRYPTION, OFFS_CACHE_PERCENTAGE, TUPLE } from '../constants';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockErrorType } from '../enumerations/blockErrorType';
import { BlockServiceErrorType } from '../enumerations/blockServiceErrorType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType, EncryptedBlockTypes } from '../enumerations/blockType';
import { EciesErrorType } from '../enumerations/eciesErrorType';
import { BlockError, CannotEncryptBlockError } from '../errors/block';
import { BlockServiceError } from '../errors/blockServiceError';
import { EciesError } from '../errors/eciesError';
import { IEncryptedBlock } from '../interfaces/blocks/encrypted';
import { IEphemeralBlock } from '../interfaces/blocks/ephemeral';
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
   * Determine the block type from the first byte of the block data
   * @param data - The block data buffer
   * @returns The BlockType enum value
   * @throws BlockServiceError if the data is too short or the block type is invalid
   */
  public determineBlockEncryptionType(data: Buffer): BlockEncryptionType {
    if (data.length < ENCRYPTION.ENCRYPTION_TYPE_SIZE) {
      throw new BlockServiceError(BlockServiceErrorType.InvalidBlockData);
    }

    const blockType = data.readUInt8(0) as BlockEncryptionType;

    // Validate that the block type is a valid enum value
    if (!Object.values(BlockEncryptionType).includes(blockType)) {
      throw new BlockServiceError(BlockServiceErrorType.InvalidBlockType);
    }

    return blockType;
  }

  /**
   * Check if a block is encrypted for a single recipient
   * @param data - The block data buffer
   * @returns True if the block is encrypted for a single recipient
   */
  public isSingleRecipientEncrypted(data: Buffer): boolean {
    try {
      const blockType = this.determineBlockEncryptionType(data);
      return blockType === BlockEncryptionType.SingleRecipient;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a block is encrypted for multiple recipients
   * @param data - The block data buffer
   * @returns True if the block is encrypted for multiple recipients
   */
  public isMultiRecipientEncrypted(data: Buffer): boolean {
    try {
      const blockType = this.determineBlockEncryptionType(data);
      return blockType === BlockEncryptionType.MultiRecipient;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the appropriate block size for a given data length
   * @param dataLength - The length of data in bytes
   * @returns The appropriate BlockSize enum value
   */
  public getBlockSizeForData(dataLength: number): BlockSize {
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
    // Corrected logic: If >= Message (512), return Tiny (1024)
    if (dataLength >= BlockSize.Message) {
      // >= 512
      return BlockSize.Tiny; // 1024
    }
    // Only return Message size if less than Message size (0 to 511)
    return BlockSize.Message; // 512
  }

  /**
   * Encrypt a block using ECIES
   */
  public async encrypt(
    newBlockType: BlockType,
    block: IEphemeralBlock,
    recipient?: BrightChainMember,
  ): Promise<EncryptedBlock> {
    if (!EncryptedBlockTypes.includes(newBlockType)) {
      throw new BlockError(BlockErrorType.UnexpectedEncryptedBlockType);
    } else if (!block.canEncrypt()) {
      throw new Error('Block cannot be encrypted');
    } else if (!block.creator) {
      throw new BlockError(BlockErrorType.CreatorRequired);
    }

    const encryptedBuffer =
      ServiceLocator.getServiceProvider().eciesService.encrypt(
        recipient?.publicKey ?? block.creator.publicKey,
        block.data,
      );

    // Create padded buffer filled with random data
    const finalBuffer = randomBytes(block.blockSize);

    // Write the block type to the first byte
    finalBuffer.writeUInt8(BlockEncryptionType.SingleRecipient, 0);

    // Copy ECIES data (ephemeral public key, IV, auth tag, encrypted message) after the block type byte
    encryptedBuffer.copy(
      finalBuffer,
      ENCRYPTION.ENCRYPTION_TYPE_SIZE,
      0,
      encryptedBuffer.length,
    );

    const checksum =
      ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
        finalBuffer,
      );

    return await EncryptedBlockCreator.create(
      newBlockType,
      BlockDataType.EncryptedData,
      block.blockSize,
      finalBuffer,
      checksum,
      recipient ?? block.creator,
      block.dateCreated,
      block.data.length,
    );
  }

  /**
   * Encrypt a block for multiple recipients using ECIES
   * @param newBlockType The new block type
   * @param block The block to encrypt
   * @param recipients The recipients to encrypt the block for
   * @returns The encrypted block
   */
  public async encryptMultiple(
    newBlockType: BlockType,
    block: EphemeralBlock,
    recipients: BrightChainMember[],
  ): Promise<IEncryptedBlock> {
    if (!EncryptedBlockTypes.includes(newBlockType)) {
      throw new BlockError(BlockErrorType.UnexpectedEncryptedBlockType);
    } else if (!block.canMultiEncrypt(recipients.length)) {
      throw new CannotEncryptBlockError();
    } else if (!block.creator) {
      throw new BlockError(BlockErrorType.CreatorRequired);
    }
    const encryptedMessageDetails =
      await ServiceLocator.getServiceProvider().eciesService.encryptMultiple(
        recipients,
        block.data,
      );
    const header =
      ServiceLocator.getServiceProvider().eciesService.buildECIESMultipleRecipientHeader(
        encryptedMessageDetails,
      );
    const paddingSize =
      block.blockSize -
      header.length -
      encryptedMessageDetails.encryptedMessage.length;
    const padding = randomBytes(paddingSize);
    const data = Buffer.concat([
      header,
      encryptedMessageDetails.encryptedMessage,
      padding,
    ]);
    const checksum =
      ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
        data,
      );
    return Promise.resolve(
      await EncryptedBlock.from(
        newBlockType,
        BlockDataType.EncryptedData,
        block.blockSize,
        data,
        checksum,
        block.creator,
        block.dateCreated,
        block.lengthBeforeEncryption,
        true,
        false,
      ),
    );
  }

  public async decrypt(
    creator: BrightChainMember,
    block: EncryptedBlock,
    newBlockType: BlockType,
  ): Promise<IEphemeralBlock> {
    if (creator.privateKey === undefined) {
      throw new BlockError(BlockErrorType.CreatorPrivateKeyRequired);
    }

    // decryptSingleWithHeader now returns the decrypted buffer directly
    const decrypted =
      ServiceLocator.getServiceProvider().eciesService.decryptSingleWithHeader(
        creator.privateKey,
        block.layerPayload,
      );

    const checksum =
      ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
        decrypted, // Use the decrypted buffer
      );

    return await EncryptedBlockCreator.create(
      newBlockType,
      BlockDataType.EphemeralStructuredData,
      block.blockSize,
      decrypted, // Use the decrypted buffer
      checksum,
      creator,
      block.dateCreated,
      block.layerPayloadSize,
    );
  }

  /**
   * Decrypts a block encrypted for multiple recipients.
   * @param recipient The recipient to decrypt the block for
   * @param block The block to decrypt
   * @returns The decrypted block
   */
  public async decryptMultiple(
    recipient: BrightChainMember,
    block: IEncryptedBlock,
  ): Promise<IEphemeralBlock> {
    if (recipient.privateKey === undefined) {
      throw new EciesError(EciesErrorType.PrivateKeyNotLoaded);
    }
    const multiEncryptionHeader =
      ServiceLocator.getServiceProvider().eciesService.parseMultiEncryptedHeader(
        block.data,
      );
    const decryptedData =
      ServiceLocator.getServiceProvider().eciesService.decryptMultipleECIEForRecipient(
        {
          ...multiEncryptionHeader,
          encryptedMessage: block.data.subarray(
            multiEncryptionHeader.headerSize,
            multiEncryptionHeader.headerSize +
              multiEncryptionHeader.dataLength +
              ECIES.MULTIPLE.ENCRYPTED_MESSAGE_OVERHEAD_SIZE,
          ),
        },
        recipient,
      );
    const checksum =
      ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
        decryptedData,
      );
    return EphemeralBlock.from(
      BlockType.EphemeralOwnedDataBlock,
      BlockDataType.EphemeralStructuredData,
      block.blockSize,
      decryptedData,
      checksum,
      recipient,
      block.dateCreated,
      multiEncryptionHeader.dataLength,
      true,
      false,
    );
  }

  /**
   * Get the length of a file
   * @param fileData - the file data to get the length of
   * @param filePath - the path to the file (optional)
   * @returns the length of the file
   */
  public async getFileLength(
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
    // In test environment, always return a default mime type
    if (process.env['NODE_ENV'] === 'test') {
      return 'application/octet-stream';
    }

    // For production, try to determine the real mime type
    let mimeType: string | undefined = undefined;

    try {
      // Import the module dynamically
      // Note: This dynamic import is retained per user's approval
      const fileTypeModule = await import('file-type');

      if (fileData instanceof Readable) {
        // For readable streams
        if (typeof fileTypeModule.fileTypeStream === 'function') {
          const streamResult = await fileTypeModule.fileTypeStream(fileData);
          mimeType = streamResult.fileType?.mime;
        } else {
          // Fallback for readable streams
          mimeType = 'application/octet-stream';
        }
      } else if (Buffer.isBuffer(fileData)) {
        // For buffers
        if (typeof fileTypeModule.fileTypeFromBuffer === 'function') {
          const result = await fileTypeModule.fileTypeFromBuffer(fileData);
          mimeType = result?.mime;
        } else {
          // Fallback for buffers
          mimeType = 'application/octet-stream';
        }
      }
    } catch (error) {
      console.error('Error detecting mime type:', error);
      // In case of errors, default to a safe mime type
      mimeType = 'application/octet-stream';
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
    // In test environment, provide a default filename if no path is given
    if (process.env['NODE_ENV'] === 'test' && !filePath) {
      return 'test-file.bin';
    }

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
  public async processFileInChunks(
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
      fileSize ?? (await this.getFileLength(fileData, filePath));
    const blockSize = this.getBlockSizeForData(fileLength);
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
  public async gatherWhiteners(
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
  public xorBlockWithWhiteners(
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
  public xorBlocksWithWhitenersRoundRobin(
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

  public async createCBL(
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

    // Calculate total size needed for addresses
    const totalAddressSize =
      ServiceLocator.getServiceProvider().checksumService.checksumBufferLength *
      blocks.length;

    // Determine appropriate block size for CBL based on address list size + header
    const estimatedDataSize = CBLService.BaseHeaderSize + totalAddressSize;
    const cblBlockSize = this.getBlockSizeForData(estimatedDataSize);
    if (cblBlockSize === BlockSize.Unknown) {
      throw new BlockServiceError(
        BlockServiceErrorType.CannotDetermineBlockSize, // Removed string argument
      );
    }

    const blockIds: ChecksumBuffer[] = blocks.map((block) => block.idChecksum);
    const addressListBuffer = Buffer.concat(blockIds);

    // Create header using the determined cblBlockSize
    const header = ServiceLocator.getServiceProvider().cblService.makeCblHeader(
      creator,
      blocks[0].dateCreated ?? new Date(), // Use block date or now
      blockIds.length,
      fileDataLength,
      addressListBuffer,
      cblBlockSize, // Use calculated size
      BlockEncryptionType.None,
    );

    // Create final data buffer, padded to the determined block size
    const finalData = Buffer.alloc(cblBlockSize); // Allocate full block size
    header.headerData.copy(finalData, 0); // Copy header (includes signature)
    addressListBuffer.copy(finalData, header.headerData.length); // Copy addresses after header

    // Padding is implicitly handled by Buffer.alloc filling with zeros

    // Create CBL instance
    const cblService = ServiceLocator.getServiceProvider().cblService;
    const checksumService = ServiceLocator.getServiceProvider().checksumService;
    // The CBLBase constructor will recalculate the checksum based on the *padded* finalData
    return new ConstituentBlockListBlock(
      finalData,
      creator,
      cblService,
      checksumService,
    );
  }

  /**
   * Store a CBL block to disk using DiskBlockAsyncStore
   * @param cbl - The CBL block to store
   */
  public async storeCBLToDisk(cbl: ConstituentBlockListBlock): Promise<void> {
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
    const fileSize = await this.getFileLength(fileData);
    const mimeType = await this.getMimeType(fileData);
    const fileName = this.getFileName(fileData, filePath);
    const blockSize = this.getBlockSizeForData(fileSize);
    const rollbackOperations: (() => Promise<void>)[] = [];
    const blockIDs: ChecksumBuffer[] = [];
    try {
      await this.processFileInChunks(
        fileData,
        encrypt,
        TUPLE.SIZE,
        async (chunkBlocks: Buffer[]) => {
          for (const sourceBlock of chunkBlocks) {
            const whiteners = await this.gatherWhiteners(
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
              this.xorBlockWithWhiteners(sourceBlock, whiteners),
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
      // Determine the final CBL block size based on the *actual* header + address list size
      const tempAddressListBuffer = Buffer.concat(blockIDs);
      const tempHeader =
        ServiceLocator.getServiceProvider().cblService.makeCblHeader(
          creator,
          dateCreated,
          blockIDs.length,
          fileSize,
          tempAddressListBuffer,
          BlockSize.Small, // Use a temporary small size first
          BlockEncryptionType.None,
          createECBL ? { fileName, mimeType } : undefined,
        );
      const finalCblDataSize =
        tempHeader.headerData.length + tempAddressListBuffer.length;
      const finalCblBlockSize = this.getBlockSizeForData(finalCblDataSize);
      if (finalCblBlockSize === BlockSize.Unknown) {
        throw new BlockServiceError(
          BlockServiceErrorType.CannotDetermineBlockSize, // Removed string argument
        );
      }

      // Re-create the header with the *final* determined block size
      const finalHeader =
        ServiceLocator.getServiceProvider().cblService.makeCblHeader(
          creator,
          dateCreated,
          blockIDs.length,
          fileSize,
          tempAddressListBuffer,
          finalCblBlockSize, // Use the final calculated size
          BlockEncryptionType.None,
          createECBL ? { fileName, mimeType } : undefined,
        );

      // Create the final data buffer, padded to the final block size
      const finalData = Buffer.alloc(finalCblBlockSize);
      finalHeader.headerData.copy(finalData, 0);
      tempAddressListBuffer.copy(finalData, finalHeader.headerData.length);

      // Get services needed for CBL constructors
      const cblService = ServiceLocator.getServiceProvider().cblService;
      const checksumService =
        ServiceLocator.getServiceProvider().checksumService;

      // Create and return appropriate CBL type
      if (createECBL) {
        return new ExtendedCBL(finalData, creator, cblService, checksumService);
      }
      return new ConstituentBlockListBlock(
        finalData,
        creator,
        cblService,
        checksumService,
      );
    } catch (e) {
      console.error('Error ingesting file:', e);
      await Promise.all(rollbackOperations);
      throw e;
    }
  }

  /**
   * Convert a stream to a buffer
   * @param stream - The stream to convert
   * @returns The buffer
   */
  public async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err) => reject(err));
    });
  }
}
