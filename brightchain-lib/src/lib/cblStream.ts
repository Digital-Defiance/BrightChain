import { Readable } from 'stream';
import { ConstituentBlockListBlock } from './blocks/cbl';
import { EncryptedBlock } from './blocks/encrypted';
import { EphemeralBlock } from './blocks/ephemeral';
import { InMemoryBlockTuple } from './blocks/memoryTuple';
import { WhitenedBlock } from './blocks/whitened';
import { BrightChainMember } from './brightChainMember';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockType } from './enumerations/blockType';
import { CblErrorType } from './enumerations/cblErrorType';
import { CblError } from './errors/cblError';
import { IEphemeralBlock } from './interfaces/blocks/ephemeral';
import { BlockService } from './services/blockService';
import { ServiceLocator } from './services/serviceLocator';
import { ChecksumBuffer } from './types';

/**
 * CblStream provides streaming access to data stored in a ConstituentBlockListBlock.
 * In the Owner Free Filesystem (OFF), data is stored as:
 * 1. A CBL containing addresses of data blocks
 * 2. Each data block is XORed with random blocks for privacy
 * 3. The CBL itself may be encrypted for privacy
 *
 * This stream:
 * 1. Reads block addresses from the CBL
 * 2. Loads the corresponding whitened blocks
 * 3. XORs them together to recover the original data
 * 4. Decrypts the data if needed
 */
export class CblStream extends Readable {
  private readonly cbl: ConstituentBlockListBlock;
  private readonly getWhitenedBlock: (blockId: ChecksumBuffer) => WhitenedBlock;
  private currentTupleIndex = 0;
  private currentData: IEphemeralBlock | null = null;
  private overallReadOffset = 0;
  private currentDataOffset = 0;
  private readonly maxTuple: number;
  private readonly creatorForDecryption?: BrightChainMember;
  private readonly blockService: BlockService;

  constructor(
    cbl: ConstituentBlockListBlock,
    getWhitenedBlock: (blockId: ChecksumBuffer) => WhitenedBlock,
    creatorForDecryption?: BrightChainMember,
  ) {
    super();
    this.blockService = ServiceLocator.getServiceProvider().blockService;

    if (!cbl) {
      throw new CblError(CblErrorType.CblRequired);
    }

    if (!getWhitenedBlock) {
      throw new CblError(CblErrorType.WhitenedBlockFunctionRequired);
    }

    this.cbl = cbl;
    this.getWhitenedBlock = getWhitenedBlock;
    this.maxTuple = cbl.cblAddressCount / cbl.tupleSize;
    this.overallReadOffset = 0;
    this.currentDataOffset = -1;
    this.creatorForDecryption = creatorForDecryption;
  }

  override async _read(size: number): Promise<void> {
    // If there's no data to read, end the stream immediately
    if (this.cbl.originalDataLength === 0) {
      this.push(null);
      return;
    }

    // Convert originalDataLength to number if it's a BigInt
    const originalDataLength = this.cbl.originalDataLength;
    const bytesRemaining = originalDataLength - this.overallReadOffset;
    let stillToRead = bytesRemaining > size ? size : bytesRemaining;

    while (stillToRead > 0) {
      // If we have no data or have read all current data, read next tuple
      if (
        !this.currentData ||
        this.currentDataOffset >= this.currentData.data.length
      ) {
        await this.readData();
        if (!this.currentData) {
          // No more data available
          break;
        }
      }

      // Read up to size bytes from the current data
      const bytesToRead = Math.min(
        stillToRead,
        this.currentData.data.length - this.currentDataOffset,
      );

      const chunk = this.currentData.data.subarray(
        this.currentDataOffset,
        this.currentDataOffset + bytesToRead,
      );
      this.push(chunk);

      this.overallReadOffset += bytesToRead;
      this.currentDataOffset += bytesToRead;
      stillToRead -= bytesToRead;

      // Check if we have reached or exceeded the originalDataLength
      if (this.overallReadOffset >= this.cbl.originalDataLength) {
        this.push(null); // End the stream
        break;
      }
    }
  }

  private async readData(): Promise<void> {
    if (this.currentTupleIndex >= this.maxTuple) {
      this.push(null);
      this.currentData = null;
      this.currentDataOffset = -1;
      return;
    }

    try {
      // Load all blocks in the tuple
      const blocks: WhitenedBlock[] = [];
      for (const address of this.cbl.addresses) {
        try {
          const whitenedBlock = this.getWhitenedBlock(address);
          if (!whitenedBlock) {
            throw new CblError(CblErrorType.FailedToLoadBlock);
          }
          blocks.push(whitenedBlock);
        } catch (error) {
          throw new CblError(CblErrorType.FailedToLoadBlock);
        }
      }

      // Create tuple and XOR blocks
      const tuple = new InMemoryBlockTuple(blocks);
      const xoredData = await tuple.xor();

      // Convert RawDataBlock to OwnedDataBlock
      // Handle the case where creator might be undefined
      if (!this.cbl.creator) {
        throw new CblError(CblErrorType.CreatorUndefined);
      }

      this.currentData = await EphemeralBlock.from(
        BlockType.EphemeralOwnedDataBlock,
        BlockDataType.RawData,
        xoredData.blockSize,
        xoredData.data,
        xoredData.idChecksum,
        this.cbl.creator,
        xoredData.metadata.dateCreated,
        xoredData.metadata.lengthWithoutPadding,
      );

      // Decrypt if needed
      if (this.creatorForDecryption) {
        if (!(this.currentData instanceof EncryptedBlock)) {
          throw new CblError(CblErrorType.ExpectedEncryptedDataBlock);
        }
        this.currentData = await this.blockService.decrypt(
          this.creatorForDecryption,
          this.currentData,
          BlockType.EphemeralOwnedDataBlock,
        );
      }

      this.currentTupleIndex++;
      this.currentDataOffset = 0;
    } catch (error) {
      this.destroy(
        error instanceof Error
          ? error
          : new Error('Unknown error reading data'),
      );
    }
  }
}
