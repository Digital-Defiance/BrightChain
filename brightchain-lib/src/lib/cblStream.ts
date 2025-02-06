import { Readable } from 'stream';
import { BlockService } from './blockService';
import { ConstituentBlockListBlock } from './blocks/cbl';
import { EncryptedOwnedDataBlock } from './blocks/encryptedOwnedData';
import { BlockHandle } from './blocks/handle';
import { InMemoryBlockTuple } from './blocks/memoryTuple';
import { OwnedDataBlock } from './blocks/ownedData';
import { WhitenedBlock } from './blocks/whitened';
import { BrightChainMember } from './brightChainMember';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockType } from './enumerations/blockType';
import { CblErrorType } from './enumerations/cblErrorType';
import { CblError } from './errors/cblError';
import { StaticHelpersChecksum } from './staticHelpers.checksum';
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
  private currentData: OwnedDataBlock | null = null;
  private overallReadOffset = 0n;
  private currentDataOffset = 0;
  private readonly maxTuple: number;
  private readonly creatorForDecryption?: BrightChainMember;

  constructor(
    cbl: ConstituentBlockListBlock,
    getWhitenedBlock: (blockId: ChecksumBuffer) => WhitenedBlock,
    creatorForDecryption?: BrightChainMember,
  ) {
    super();

    if (!cbl) {
      throw new CblError(CblErrorType.CblRequired);
    }

    if (!getWhitenedBlock) {
      throw new CblError(CblErrorType.WhitenedBlockFunctionRequired);
    }

    this.cbl = cbl;
    this.getWhitenedBlock = getWhitenedBlock;
    this.maxTuple = cbl.cblAddressCount / cbl.tupleSize;
    this.overallReadOffset = 0n;
    this.currentDataOffset = -1;
    this.creatorForDecryption = creatorForDecryption;
  }

  override async _read(size: number): Promise<void> {
    const bytesRemaining = this.cbl.originalDataLength - this.overallReadOffset;
    let stillToRead =
      bytesRemaining > BigInt(size) ? size : Number(bytesRemaining);

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

      this.push(
        this.currentData.data.subarray(
          this.currentDataOffset,
          this.currentDataOffset + bytesToRead,
        ),
      );

      this.overallReadOffset += BigInt(bytesToRead);
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
      // Calculate start offset for this tuple's addresses
      const startOffset =
        ConstituentBlockListBlock.CblHeaderSize +
        this.cbl.tupleSize * this.currentTupleIndex;

      // Load all blocks in the tuple
      const blocks: BlockHandle[] = [];
      for (let i = 0; i < this.cbl.tupleSize; i++) {
        const address = this.cbl.data.subarray(
          startOffset + i * StaticHelpersChecksum.Sha3ChecksumBufferLength,
          startOffset +
            (i + 1) * StaticHelpersChecksum.Sha3ChecksumBufferLength,
        ) as ChecksumBuffer;

        const whitenedBlock = this.getWhitenedBlock(address);
        if (!whitenedBlock) {
          throw new CblError(CblErrorType.FailedToLoadBlock);
        }

        // Create a handle from the whitened block
        blocks.push(
          new BlockHandle(
            BlockType.Handle, // type
            BlockDataType.RawData, // dataType
            whitenedBlock.idChecksum,
            whitenedBlock.metadata, // metadata
            true, // canRead
            true, // canPersist
          ),
        );
      }

      // Create tuple and XOR blocks
      const tuple = new InMemoryBlockTuple(blocks);
      const xoredData = tuple.xor();

      // Decrypt if needed
      if (this.creatorForDecryption) {
        if (!(xoredData instanceof EncryptedOwnedDataBlock)) {
          throw new CblError(CblErrorType.ExpectedEncryptedDataBlock);
        }
        this.currentData = await BlockService.decrypt(
          this.creatorForDecryption,
          xoredData,
        );
      } else {
        if (!(xoredData instanceof OwnedDataBlock)) {
          throw new CblError(CblErrorType.ExpectedOwnedDataBlock);
        }
        this.currentData = xoredData;
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
