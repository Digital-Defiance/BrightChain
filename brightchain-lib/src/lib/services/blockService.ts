/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChecksumUint8Array,
  EciesEncryptionTypeEnum,
  Member,
  PlatformID,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { ConstituentBlockListBlock } from '../blocks/cbl';
import { EncryptedBlock } from '../blocks/encrypted';
import { EncryptedBlockCreator } from '../blocks/encryptedBlockCreator';
import { EphemeralBlock } from '../blocks/ephemeral';
import { ExtendedCBL } from '../blocks/extendedCbl';
import { RandomBlock } from '../blocks/random';
import { RawDataBlock } from '../blocks/rawData';
import { ECIES, ENCRYPTION, TUPLE } from '../constants';
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

import { IUniversalBlockStore } from '../interfaces/storage/universalBlockStore';
import { ServiceLocator } from '../services/serviceLocator';

/**
 * Browser-compatible BlockService with core functionality
 */
export class BlockService<TID extends PlatformID = Uint8Array> {
  private static blockStore: IUniversalBlockStore | undefined = undefined;

  public static initialize(blockStore: IUniversalBlockStore) {
    BlockService.blockStore = blockStore;
  }

  /**
   * Determine the block type from the first byte of the block data
   */
  public determineBlockEncryptionType(data: Uint8Array): BlockEncryptionType {
    if (data.length < ENCRYPTION.ENCRYPTION_TYPE_SIZE) {
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
   */
  public async encrypt(
    newBlockType: BlockType,
    block: IEphemeralBlock<TID>,
    recipient?: Member<TID>,
  ): Promise<EncryptedBlock<TID>> {
    if (!EncryptedBlockTypes.includes(newBlockType)) {
      throw new BlockError(BlockErrorType.UnexpectedEncryptedBlockType);
    } else if (!block.canEncrypt()) {
      throw new Error('Block cannot be encrypted');
    } else if (!block.creator) {
      throw new BlockError(BlockErrorType.CreatorRequired);
    }

    const encryptedArray =
      await ServiceLocator.getServiceProvider<TID>().eciesService.encrypt(
        EciesEncryptionTypeEnum.Single,
        (recipient ?? block.creator) as any,
        block.data,
      );

    // Create padded buffer filled with random data
    const finalBuffer = this.generateRandomData(block.blockSize);

    // Write the block type to the first byte
    finalBuffer[0] = BlockEncryptionType.SingleRecipient;

    // Copy ECIES data after the block type byte
    finalBuffer.set(encryptedArray, ENCRYPTION.ENCRYPTION_TYPE_SIZE);

    const checksum =
      ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
        finalBuffer,
      );

    const result = await EncryptedBlockCreator.create(
      newBlockType,
      BlockDataType.EncryptedData,
      block.blockSize,
      finalBuffer,
      checksum,
      recipient ?? block.creator,
      block.dateCreated,
      block.data.length,
    );
    return result as EncryptedBlock<TID>;
  }

  /**
   * Decrypt a block using ECIES
   */
  public async decrypt(
    creator: Member<TID>,
    block: EncryptedBlock<TID>,
    newBlockType: BlockType,
  ): Promise<IEphemeralBlock<TID>> {
    if (!creator.privateKey) {
      throw new BlockError(BlockErrorType.CreatorPrivateKeyRequired);
    }

    const decryptedArray =
      await ServiceLocator.getServiceProvider().eciesService.decryptSimpleOrSingleWithHeader(
        false,
        creator.privateKey.idUint8Array as Uint8Array,
        block.layerPayload,
      );

    const checksum =
      ServiceLocator.getServiceProvider<TID>().checksumService.calculateChecksum(
        decryptedArray,
      );

    const result = await EncryptedBlockCreator.create<TID>(
      newBlockType,
      BlockDataType.EphemeralStructuredData,
      block.blockSize,
      decryptedArray,
      checksum,
      creator,
      block.dateCreated,
      block.layerPayloadSize,
    );
    return result;
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
    const multiEncryptionHeader =
      ServiceLocator.getServiceProvider<TID>().eciesService.parseMultiEncryptedHeader(
        block.data,
      );
    const decryptedData =
      await ServiceLocator.getServiceProvider<TID>().eciesService.decryptMultipleECIEForRecipient(
        {
          ...multiEncryptionHeader,
          encryptedMessage: block.data.subarray(
            multiEncryptionHeader.headerSize,
            multiEncryptionHeader.headerSize +
              multiEncryptionHeader.dataLength +
              ECIES.MULTIPLE.ENCRYPTED_MESSAGE_OVERHEAD_SIZE,
          ),
        },
        recipient as Member<Uint8Array>,
      );
    const checksum =
      ServiceLocator.getServiceProvider<TID>().checksumService.calculateChecksum(
        decryptedData,
      );
    return EphemeralBlock.from<TID>(
      BlockType.EphemeralOwnedDataBlock,
      BlockDataType.EphemeralStructuredData,
      block.blockSize,
      decryptedData,
      checksum,
      recipient,
      block.dateCreated,
      multiEncryptionHeader.dataLength,
    );
  }

  public async encryptMultiple(
    newBlockType: BlockType,
    block: EphemeralBlock<TID>,
    recipients: Member<TID>[],
  ): Promise<IEncryptedBlock<TID>> {
    if (!EncryptedBlockTypes.includes(newBlockType)) {
      throw new BlockError(BlockErrorType.UnexpectedEncryptedBlockType);
    } else if (!block.canMultiEncrypt(recipients.length)) {
      throw new CannotEncryptBlockError();
    } else if (!block.creator) {
      throw new BlockError(BlockErrorType.CreatorRequired);
    }
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
    return Promise.resolve(
      await EncryptedBlock.from<TID>(
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
    ) as Promise<IEncryptedBlock<TID>>;
  }

  /**
   * XOR a single block with all whiteners
   */
  public xorBlockWithWhiteners(
    block: Uint8Array,
    whiteners: (Uint8Array | RandomBlock | RawDataBlock)[],
  ): Uint8Array {
    if (whiteners.length === 0) {
      throw new BlockServiceError(BlockServiceErrorType.NoWhitenersProvided);
    }

    const xorBlock = new Uint8Array(block);
    // XOR with all whiteners
    for (const whitener of whiteners) {
      const data: Uint8Array =
        whitener instanceof Uint8Array ? whitener : whitener.data;
      for (let j = 0; j < data.length; j++) {
        xorBlock[j] = xorBlock[j] ^ data[j];
      }
    }
    return xorBlock;
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
        { ID: uint8ArrayToHex(block.idChecksum) },
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
    const blockIDs: ChecksumUint8Array[] = [];

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
      blockIDs.reduce((acc, id) => acc + id.length, 0),
    );
    let offset = 0;
    for (const id of blockIDs) {
      blockIdsArray.set(id, offset);
      offset += id.length;
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
    if (!blocks.every(block => block.blockSize === firstBlockSize)) {
      throw new Error('All blocks must have the same block size');
    }

    // Create block IDs array
    const blockIDs: ChecksumUint8Array[] = blocks.map(block => block.idChecksum);
    
    const blockIdsArray = new Uint8Array(
      blockIDs.reduce((acc, id) => acc + id.length, 0),
    );
    let offset = 0;
    for (const id of blockIDs) {
      blockIdsArray.set(id, offset);
      offset += id.length;
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

    const data = new Uint8Array(
      header.headerData.length + blockIdsArray.length,
    );
    data.set(header.headerData, 0);
    data.set(blockIdsArray, header.headerData.length);

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
    const payloadPerBlock = encrypt
      ? blockSizeNumber - ECIES.OVERHEAD_SIZE
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
            EciesEncryptionTypeEnum.Single,
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
