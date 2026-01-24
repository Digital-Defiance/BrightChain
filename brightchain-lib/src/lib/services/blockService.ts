/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ECIES,
  EciesEncryptionTypeEnum,
  Member,
  PlatformID,
} from '@digitaldefiance/ecies-lib';
import { ConstituentBlockListBlock } from '../blocks/cbl';
import { EncryptedBlock } from '../blocks/encrypted';
import { EphemeralBlock } from '../blocks/ephemeral';
import { ExtendedCBL } from '../blocks/extendedCbl';
import { RandomBlock } from '../blocks/random';
import { RawDataBlock } from '../blocks/rawData';
import { TUPLE } from '../constants';
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
import { blockLogger, LogLevel } from '../logging/blockLogger';
import { Checksum } from '../types/checksum';

import { IUniversalBlockStore } from '../interfaces/storage/universalBlockStore';
import { ServiceLocator } from '../services/serviceLocator';
import { Validator } from '../utils/validator';
import { XorService } from './xor';

/**
 * Browser-compatible BlockService with core functionality
 */
export class BlockService<TID extends PlatformID = Uint8Array> {
  private static blockStore: IUniversalBlockStore | undefined = undefined;

  /**
   * Configure the block logger level.
   * @param level - The minimum log level to emit
   */
  public static setLogLevel(level: LogLevel): void {
    blockLogger.setLevel(level);
  }

  public static initialize(blockStore: IUniversalBlockStore) {
    BlockService.blockStore = blockStore;
  }

  /**
   * Determine the block type from the first byte of the block data
   */
  public determineBlockEncryptionType(data: Uint8Array): BlockEncryptionType {
    if (data.length < ECIES.ENCRYPTION_TYPE_SIZE) {
      throw new BlockServiceError(BlockServiceErrorType.InvalidBlockData);
    }

    const blockType = data[0] as BlockEncryptionType;

    if (!Object.values(BlockEncryptionType).includes(blockType)) {
      throw new BlockServiceError(BlockServiceErrorType.InvalidBlockType);
    }

    return blockType;
  }

  /**
   * Check if a block is encrypted for a single recipient
   */
  public isSingleRecipientEncrypted(data: Uint8Array): boolean {
    try {
      const blockType = this.determineBlockEncryptionType(data);
      return blockType === BlockEncryptionType.SingleRecipient;
    } catch {
      return false;
    }
  }

  /**
   * Check if a block is encrypted for multiple recipients
   */
  public isMultiRecipientEncrypted(data: Uint8Array): boolean {
    try {
      const blockType = this.determineBlockEncryptionType(data);
      return blockType === BlockEncryptionType.MultiRecipient;
    } catch {
      return false;
    }
  }

  /**
   * Get the appropriate block size for a given data length
   */
  public getBlockSizeForData(dataLength: number): BlockSize {
    if (dataLength < 0) {
      return BlockSize.Unknown;
    }

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
   * Generate random data using browser crypto
   */
  private generateRandomData(length: number): Uint8Array {
    const data = new Uint8Array(length);
    crypto.getRandomValues(data);
    return data;
  }

  /**
   * Encrypt a block using ECIES
   *
   * @param newBlockType - The block type for the encrypted block
   * @param block - The ephemeral block to encrypt
   * @param recipient - Optional recipient member (defaults to block creator)
   * @returns The encrypted block
   * @throws {EnhancedValidationError} If block type is invalid
   * @throws {BlockError} If block cannot be encrypted or creator is missing
   * @throws {EciesError} If ECIES encryption fails
   *
   * @see Requirements 5.1, 5.2, 5.3, 7.2, 7.3
   */
  public async encrypt(
    newBlockType: BlockType,
    block: IEphemeralBlock<TID>,
    recipient?: Member<TID>,
  ): Promise<EncryptedBlock<TID>> {
    // Validate block type
    Validator.validateBlockType(newBlockType, 'encrypt');

    if (!EncryptedBlockTypes.includes(newBlockType)) {
      throw new BlockError(BlockErrorType.UnexpectedEncryptedBlockType);
    } else if (!block.canEncrypt()) {
      throw new Error('Block cannot be encrypted');
    } else if (!block.creator) {
      throw new BlockError(BlockErrorType.CreatorRequired);
    }

    // Log encryption start (never log sensitive data like keys or plaintext)
    blockLogger.debug('encrypt', {
      blockType: BlockType[newBlockType],
      blockSize: block.blockSize,
      recipientCount: 1,
    });

    try {
      const recipientMember = recipient ?? block.creator;
      const recipientPublicKey = recipientMember?.publicKey;
      if (!recipientPublicKey || !recipientMember) {
        throw new BlockError(BlockErrorType.RecipientKeyRequired);
      }

      // Only encrypt the actual data, not the padding
      // This aligns with canEncrypt() which checks lengthBeforeEncryption + overhead <= capacity
      const dataToEncrypt = block.data.subarray(
        0,
        block.lengthBeforeEncryption,
      );

      const encryptedArray =
        await ServiceLocator.getServiceProvider<TID>().eciesService.encrypt(
          EciesEncryptionTypeEnum.WithLength,
          recipientPublicKey,
          dataToEncrypt,
        );

      // Get the recipient ID bytes for the header
      const idProvider = ServiceLocator.getServiceProvider<TID>().idProvider;
      const recipientIdBytes = recipientMember.idBytes;

      // Create padded buffer filled with random data
      const finalBuffer = this.generateRandomData(block.blockSize);

      // Write the block type to the first byte
      finalBuffer[0] = BlockEncryptionType.SingleRecipient;

      // Write the recipient ID after the encryption type byte
      finalBuffer.set(recipientIdBytes, ECIES.ENCRYPTION_TYPE_SIZE);

      // Copy ECIES data after the recipient ID
      const eciesDataOffset =
        ECIES.ENCRYPTION_TYPE_SIZE + idProvider.byteLength;
      finalBuffer.set(encryptedArray, eciesDataOffset);

      const checksum =
        ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
          finalBuffer,
        );

      const result = await EncryptedBlock.from<TID>(
        newBlockType,
        BlockDataType.EncryptedData,
        block.blockSize,
        finalBuffer,
        checksum,
        recipientMember,
        block.dateCreated,
        block.lengthBeforeEncryption,
      );

      // Log encryption success
      blockLogger.info('encrypt', {
        blockId: checksum.toHex(),
        blockType: BlockType[newBlockType],
        recipientCount: 1,
        success: true,
      });

      return result as EncryptedBlock<TID>;
    } catch (error) {
      // Log encryption failure (never log sensitive data)
      blockLogger.error(
        'encrypt',
        error instanceof Error ? error : new Error(String(error)),
        {
          blockType: BlockType[newBlockType],
          recipientCount: 1,
          success: false,
        },
      );

      // Wrap ECIES errors with context
      if (error instanceof EciesError) {
        throw error;
      }
      // Wrap unknown errors from ECIES library
      if (error instanceof Error && error.message.includes('ECIES')) {
        throw new EciesError(EciesErrorType.InvalidDataLength, undefined, {
          ERROR: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Decrypt a block using ECIES
   *
   * @param creator - The member with private key to decrypt
   * @param block - The encrypted block to decrypt
   * @param newBlockType - The block type for the decrypted block
   * @returns The decrypted ephemeral block
   * @throws {EnhancedValidationError} If block type is invalid
   * @throws {BlockError} If creator private key is missing
   * @throws {EciesError} If ECIES decryption fails
   *
   * @see Requirements 5.1, 5.2, 5.3, 7.2, 7.3
   */
  public async decrypt(
    creator: Member<TID>,
    block: EncryptedBlock<TID>,
    newBlockType: BlockType,
  ): Promise<IEphemeralBlock<TID>> {
    // Validate block type
    Validator.validateBlockType(newBlockType, 'decrypt');

    if (!creator.privateKey) {
      throw new BlockError(BlockErrorType.CreatorPrivateKeyRequired);
    }

    // Log decryption start (never log sensitive data like keys or plaintext)
    blockLogger.debug('decrypt', {
      blockId: block.idChecksum.toHex(),
      blockType: BlockType[block.blockType],
      blockSize: block.blockSize,
    });

    try {
      const decryptedArray =
        await ServiceLocator.getServiceProvider().eciesService.decryptWithLengthAndHeader(
          creator.privateKey.idUint8Array as Uint8Array,
          block.layerPayload,
        );

      const checksum =
        ServiceLocator.getServiceProvider<TID>().checksumService.calculateChecksum(
          decryptedArray,
        );

      const result = await EphemeralBlock.from<TID>(
        newBlockType,
        BlockDataType.EphemeralStructuredData,
        block.blockSize,
        decryptedArray,
        checksum,
        creator,
        block.dateCreated,
        block.layerPayloadSize,
      );

      // Log decryption success
      blockLogger.info('decrypt', {
        blockId: block.idChecksum.toHex(),
        blockType: BlockType[block.blockType],
        success: true,
      });

      return result;
    } catch (error) {
      // Log decryption failure (never log sensitive data)
      blockLogger.error(
        'decrypt',
        error instanceof Error ? error : new Error(String(error)),
        {
          blockId: block.idChecksum.toHex(),
          blockType: BlockType[block.blockType],
          success: false,
        },
      );

      // Wrap ECIES errors with context
      if (error instanceof EciesError) {
        throw error;
      }
      // Wrap unknown errors from ECIES library
      if (error instanceof Error && error.message.includes('ECIES')) {
        throw new EciesError(EciesErrorType.InvalidDataLength, undefined, {
          ERROR: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Decrypt multiple and encrypt multiple methods
   */
  public async decryptMultiple(
    recipient: Member<TID>,
    block: IEncryptedBlock<TID>,
  ): Promise<IEphemeralBlock<TID>> {
    if (!recipient.privateKey) {
      throw new EciesError(EciesErrorType.PrivateKeyNotLoaded);
    }

    // Log multi-decryption start (never log sensitive data like keys or plaintext)
    blockLogger.debug('decryptMultiple', {
      blockId: block.idChecksum.toHex(),
      blockType: BlockType[block.blockType],
      blockSize: block.blockSize,
    });

    try {
      const multiEncryptionHeader =
        ServiceLocator.getServiceProvider<TID>().eciesService.parseMultiEncryptedHeader(
          block.data,
        );
      // Encrypted message overhead is IV + AuthTag
      const encryptedMessageOverhead = ECIES.IV_SIZE + ECIES.AUTH_TAG_SIZE;
      const decryptedData =
        await ServiceLocator.getServiceProvider<TID>().eciesService.decryptMultipleECIEForRecipient(
          {
            ...multiEncryptionHeader,
            encryptedMessage: block.data.subarray(
              multiEncryptionHeader.headerSize,
              multiEncryptionHeader.headerSize +
                multiEncryptionHeader.dataLength +
                encryptedMessageOverhead,
            ),
          },
          recipient as Member<Uint8Array>,
        );
      const checksum =
        ServiceLocator.getServiceProvider<TID>().checksumService.calculateChecksum(
          decryptedData,
        );

      const result = await EphemeralBlock.from<TID>(
        BlockType.EphemeralOwnedDataBlock,
        BlockDataType.EphemeralStructuredData,
        block.blockSize,
        decryptedData,
        checksum,
        recipient,
        block.dateCreated,
        multiEncryptionHeader.dataLength,
      );

      // Log multi-decryption success
      blockLogger.info('decryptMultiple', {
        blockId: block.idChecksum.toHex(),
        blockType: BlockType[block.blockType],
        success: true,
      });

      return result;
    } catch (error) {
      // Log multi-decryption failure (never log sensitive data)
      blockLogger.error(
        'decryptMultiple',
        error instanceof Error ? error : new Error(String(error)),
        {
          blockId: block.idChecksum.toHex(),
          blockType: BlockType[block.blockType],
          success: false,
        },
      );

      throw error;
    }
  }

  /**
   * Encrypt a block for multiple recipients using ECIES
   *
   * @param newBlockType - The block type for the encrypted block
   * @param block - The ephemeral block to encrypt
   * @param recipients - Array of recipient members
   * @returns The encrypted block
   * @throws {EnhancedValidationError} If block type or recipient count is invalid
   * @throws {BlockError} If block cannot be encrypted or creator is missing
   * @throws {EciesError} If ECIES encryption fails
   *
   * @see Requirements 5.1, 5.2, 5.3, 7.2, 7.3
   */
  public async encryptMultiple(
    newBlockType: BlockType,
    block: EphemeralBlock<TID>,
    recipients: Member<TID>[],
  ): Promise<IEncryptedBlock<TID>> {
    // Validate block type
    Validator.validateBlockType(newBlockType, 'encryptMultiple');

    // Validate recipient count
    Validator.validateRecipientCount(
      recipients.length,
      BlockEncryptionType.MultiRecipient,
      'encryptMultiple',
    );

    if (!EncryptedBlockTypes.includes(newBlockType)) {
      throw new BlockError(BlockErrorType.UnexpectedEncryptedBlockType);
    } else if (!block.canMultiEncrypt(recipients.length)) {
      throw new CannotEncryptBlockError();
    } else if (!block.creator) {
      throw new BlockError(BlockErrorType.CreatorRequired);
    }

    // Log multi-encryption start (never log sensitive data like keys or plaintext)
    blockLogger.debug('encryptMultiple', {
      blockType: BlockType[newBlockType],
      blockSize: block.blockSize,
      recipientCount: recipients.length,
    });

    try {
      const encryptedMessageDetails =
        await ServiceLocator.getServiceProvider<TID>().eciesService.encryptMultiple(
          recipients,
          block.data,
        );
      const header =
        ServiceLocator.getServiceProvider<TID>().eciesService.buildECIESMultipleRecipientHeader(
          encryptedMessageDetails,
        );
      const paddingSize =
        block.blockSize -
        header.length -
        encryptedMessageDetails.encryptedMessage.length;
      const padding = this.generateRandomData(paddingSize);
      const data = new Uint8Array([
        ...header,
        ...encryptedMessageDetails.encryptedMessage,
        ...padding,
      ]);
      const checksum =
        ServiceLocator.getServiceProvider<TID>().checksumService.calculateChecksum(
          data,
        );

      const result = await EncryptedBlock.from<TID>(
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
      );

      // Log multi-encryption success
      blockLogger.info('encryptMultiple', {
        blockId: checksum.toHex(),
        blockType: BlockType[newBlockType],
        recipientCount: recipients.length,
        success: true,
      });

      return Promise.resolve(result) as Promise<IEncryptedBlock<TID>>;
    } catch (error) {
      // Log multi-encryption failure (never log sensitive data)
      blockLogger.error(
        'encryptMultiple',
        error instanceof Error ? error : new Error(String(error)),
        {
          blockType: BlockType[newBlockType],
          recipientCount: recipients.length,
          success: false,
        },
      );

      // Wrap ECIES errors with context
      if (error instanceof EciesError) {
        throw error;
      }
      // Wrap unknown errors from ECIES library
      if (error instanceof Error && error.message.includes('ECIES')) {
        throw new EciesError(EciesErrorType.InvalidDataLength, undefined, {
          ERROR: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * XOR a single block with all whiteners using XorService.
   * All arrays must be equal length for proper whitening.
   */
  public xorBlockWithWhiteners(
    block: Uint8Array,
    whiteners: (Uint8Array | RandomBlock | RawDataBlock)[],
  ): Uint8Array {
    if (whiteners.length === 0) {
      throw new BlockServiceError(BlockServiceErrorType.NoWhitenersProvided);
    }

    // Convert all whiteners to Uint8Array
    const whitenerArrays = whiteners.map((whitener) =>
      whitener instanceof Uint8Array ? whitener : whitener.data,
    );

    // Use XorService.xorMultiple for consolidated XOR operation
    return XorService.xorMultiple([block, ...whitenerArrays]);
  }

  /**
   * Generate whiteners for browser use
   */
  public generateWhiteners(
    blockSize: BlockSize,
    count: number,
    dateCreated?: Date,
  ): RandomBlock[] {
    if (dateCreated === undefined) {
      dateCreated = new Date();
    }

    const whiteners: RandomBlock[] = [];
    for (let i = 0; i < count; i++) {
      const whitenerBlock = RandomBlock.new(blockSize, dateCreated);
      whiteners.push(whitenerBlock);
    }

    return whiteners;
  }

  /**
   * Store a block to the store
   */
  public static async storeBlockToDisk(block: RawDataBlock): Promise<void> {
    if (!BlockService.blockStore) {
      throw new BlockServiceError(BlockServiceErrorType.Uninitialized);
    }

    if (await BlockService.blockStore.has(block.idChecksum)) {
      throw new BlockServiceError(
        BlockServiceErrorType.BlockAlreadyExists,
        undefined,
        { ID: block.idChecksum.toHex() },
      );
    }
    await BlockService.blockStore.setData(block);
  }

  /**
   * Process file data for browser ingestion (simplified version)
   */
  public async ingestFile(
    fileData: Uint8Array,
    createECBL: boolean,
    encrypt: boolean,
    creator: Member<TID>,
    recipient?: Member<TID>,
    fileName?: string,
    dateCreated?: Date,
  ): Promise<ConstituentBlockListBlock<TID> | ExtendedCBL<TID>> {
    if (dateCreated === undefined) {
      dateCreated = new Date();
    }

    const blockSize = this.getBlockSizeForData(fileData.length);
    const payloadPerBlock = blockSize as number;
    const blockIDs: Checksum[] = [];

    // Break file into blocks
    const totalBlocks = Math.ceil(fileData.length / payloadPerBlock);

    for (let i = 0; i < totalBlocks; i++) {
      const offset = i * payloadPerBlock;
      const end = Math.min(offset + payloadPerBlock, fileData.length);
      let blockData = fileData.slice(offset, end);

      // Pad if needed
      if (blockData.length < payloadPerBlock) {
        const padded = new Uint8Array(payloadPerBlock);
        padded.set(blockData);
        // Fill remaining with random data
        const padding = this.generateRandomData(
          payloadPerBlock - blockData.length,
        );
        padded.set(padding, blockData.length);
        blockData = padded;
      }

      // Generate whiteners
      const whiteners = this.generateWhiteners(
        blockSize,
        TUPLE.SIZE - 1,
        dateCreated,
      );

      // Store whiteners
      for (const whitener of whiteners) {
        await BlockService.storeBlockToDisk(whitener);
        blockIDs.push(whitener.idChecksum);
      }

      // XOR with whiteners
      const xoredData = this.xorBlockWithWhiteners(blockData, whiteners);

      // Create result block
      const resultBlock = new RawDataBlock(
        blockSize,
        xoredData,
        dateCreated,
        undefined,
        BlockType.RawData,
        BlockDataType.RawData,
      );

      await BlockService.storeBlockToDisk(resultBlock);
      blockIDs.push(resultBlock.idChecksum);
    }

    // Create CBL header
    const blockIdsArray = new Uint8Array(
      blockIDs.reduce((acc, id) => acc + id.toUint8Array().length, 0),
    );
    let offset = 0;
    for (const id of blockIDs) {
      blockIdsArray.set(id.toUint8Array(), offset);
      offset += id.toUint8Array().length;
    }
    const header =
      ServiceLocator.getServiceProvider<TID>().cblService.makeCblHeader(
        creator,
        dateCreated,
        blockIDs.length,
        fileData.length,
        blockIdsArray,
        blockSize,
        BlockEncryptionType.None,
        createECBL && fileName
          ? { fileName, mimeType: 'application/octet-stream' }
          : undefined,
      );

    const data = new Uint8Array(
      header.headerData.length + blockIdsArray.length,
    );
    data.set(header.headerData, 0);
    data.set(blockIdsArray, header.headerData.length);

    if (createECBL) {
      return new ExtendedCBL(data, creator);
    }
    return new ConstituentBlockListBlock<TID>(data, creator);
  }

  /**
   * Create a CBL from blocks
   */
  public async createCBL(
    blocks: any[],
    creator: Member<TID>,
    originalDataLength: number,
  ): Promise<ConstituentBlockListBlock<TID>> {
    if (blocks.length === 0) {
      throw new Error('Blocks array must not be empty');
    }

    // Validate all blocks have same size
    const firstBlockSize = blocks[0].blockSize;
    if (!blocks.every((block) => block.blockSize === firstBlockSize)) {
      throw new Error('All blocks must have the same block size');
    }

    // Create block IDs array
    const blockIDs: Checksum[] = blocks.map((block) => block.idChecksum);

    const blockIdsArray = new Uint8Array(
      blockIDs.reduce((acc, id) => acc + id.toUint8Array().length, 0),
    );
    let offset = 0;
    for (const id of blockIDs) {
      blockIdsArray.set(id.toUint8Array(), offset);
      offset += id.toUint8Array().length;
    }

    // Create CBL header
    const header =
      ServiceLocator.getServiceProvider<TID>().cblService.makeCblHeader(
        creator,
        new Date(),
        blockIDs.length,
        originalDataLength,
        blockIdsArray,
        BlockSize.Message, // CBL uses Message size
        BlockEncryptionType.None,
      );

    // Pad data to block size
    const blockSizeBytes = BlockSize.Message as number;
    const data = new Uint8Array(blockSizeBytes);
    data.set(header.headerData, 0);
    data.set(blockIdsArray, header.headerData.length);
    // Remaining bytes are already zero-filled

    return new ConstituentBlockListBlock<TID>(data, creator);
  }

  /**
   * Process file data in chunks (browser-compatible version)
   */
  public async processFileInChunks(
    fileData: Uint8Array,
    encrypt: boolean,
    chunkCount: number,
    processChunk: (chunkBlocks: Uint8Array[]) => Promise<void>,
    recipient?: Member<TID>,
  ): Promise<number> {
    if (encrypt && !recipient) {
      throw new BlockServiceError(
        BlockServiceErrorType.RecipientRequiredForEncryption,
      );
    }

    const blockSize = this.getBlockSizeForData(fileData.length);
    if (blockSize === BlockSize.Unknown || (blockSize as number) <= 0) {
      throw new BlockServiceError(
        BlockServiceErrorType.CannotDetermineBlockSize,
      );
    }

    const blockSizeNumber = blockSize as number;
    // Use WITH_LENGTH format overhead for single-recipient encryption
    const payloadPerBlock = encrypt
      ? blockSizeNumber - ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE
      : blockSizeNumber;

    let totalLength = 0;
    let chunkDatas: Uint8Array[] = [];

    // Helper to process a full chunk when ready
    const flushChunk = async () => {
      if (chunkDatas.length > 0) {
        await processChunk(chunkDatas);
        chunkDatas = [];
      }
    };

    // Helper to create a block from a given slice
    const createBlock = async (dataSlice: Uint8Array): Promise<void> => {
      // Pad if needed
      if (dataSlice.length < payloadPerBlock) {
        const padded = new Uint8Array(payloadPerBlock);
        padded.set(dataSlice);
        const padding = this.generateRandomData(
          payloadPerBlock - dataSlice.length,
        );
        padded.set(padding, dataSlice.length);
        dataSlice = padded;
      }
      if (encrypt && recipient) {
        const encryptedData =
          await ServiceLocator.getServiceProvider().eciesService.encrypt(
            EciesEncryptionTypeEnum.WithLength,
            recipient as any,
            dataSlice,
          );
        chunkDatas.push(new Uint8Array(encryptedData));
      } else {
        chunkDatas.push(dataSlice);
      }
    };

    // Process the file data
    const totalBlocks = Math.ceil(fileData.length / payloadPerBlock);
    for (let j = 0; j < totalBlocks; j++) {
      const offset = j * payloadPerBlock;
      const end = Math.min(offset + payloadPerBlock, fileData.length);
      const dataSlice = fileData.slice(offset, end);
      await createBlock(dataSlice);
      totalLength += dataSlice.length;
      if (chunkDatas.length === chunkCount) {
        await flushChunk();
      }
    }
    await flushChunk();

    return totalLength;
  }
}
