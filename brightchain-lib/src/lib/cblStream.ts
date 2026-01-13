import {
  ChecksumUint8Array,
  Member,
  type PlatformID,
} from '@digitaldefiance/ecies-lib';
import { Readable } from './browserStream';
import { ConstituentBlockListBlock } from './blocks/cbl';
import { EncryptedBlock } from './blocks/encrypted';
import { EphemeralBlock } from './blocks/ephemeral';
import { InMemoryBlockTuple } from './blocks/memoryTuple';
import { WhitenedBlock } from './blocks/whitened';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockType } from './enumerations/blockType';
import { CblErrorType } from './enumerations/cblErrorType';
import { CblError } from './errors/cblError';
import { IEphemeralBlock } from './interfaces/blocks/ephemeral';
import { BlockService } from './services/blockService';
import { ServiceLocator } from './services/serviceLocator';

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
export class CblStream<TID extends PlatformID = Uint8Array> extends Readable {
  private readonly cbl: ConstituentBlockListBlock;
  private readonly getWhitenedBlock: (
    blockId: ChecksumUint8Array,
  ) => WhitenedBlock;
  private currentTupleIndex = 0;
  private currentData: IEphemeralBlock | null = null;
  private overallReadOffset = 0;
  private currentDataOffset = 0;
  private readonly maxTuple: number;
  private readonly creatorForDecryption?: Member<TID>;
  private readonly blockService: BlockService;

  constructor(
    cbl: ConstituentBlockListBlock,
    getWhitenedBlock: (blockId: ChecksumUint8Array) => WhitenedBlock,
    creatorForDecryption?: Member<TID>,
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
    // Ensure we have at least 1 tuple to process if we have addresses
    this.maxTuple = Math.max(1, Math.ceil(cbl.cblAddressCount / cbl.tupleSize));
    this.overallReadOffset = 0;
    this.currentDataOffset = -1;
    this.creatorForDecryption = creatorForDecryption;
  }

  _read(size: number): void {
    // Trigger async reading immediately
    setTimeout(() => {
      this.readData().catch(error => this.emit('error', error));
    }, 0);
  }

  private async readData(): Promise<void> {
    if (this.currentTupleIndex >= this.maxTuple) {
      this.push(null); // Signal end of stream
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
        } catch {
          throw new CblError(CblErrorType.FailedToLoadBlock);
        }
      }

      // Create tuple and XOR blocks
      const tuple = new InMemoryBlockTuple(blocks);
      const xoredData = await tuple.xor();

      // Convert RawDataBlock to OwnedDataBlock
      if (!this.cbl.creator) {
        throw new CblError(CblErrorType.CreatorUndefined);
      }

      this.currentData = await EphemeralBlock.from(
        BlockType.EphemeralOwnedDataBlock,
        BlockDataType.RawData,
        xoredData.blockSize,
        new Uint8Array(xoredData.data),
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
          this.creatorForDecryption as Member<Uint8Array>,
          this.currentData,
          BlockType.EphemeralOwnedDataBlock,
        );
      }

      // Push the data to the stream
      this.push(new Uint8Array(this.currentData.data));
      this.currentTupleIndex++;
      
      // Continue reading if there's more data
      if (this.currentTupleIndex < this.maxTuple) {
        setTimeout(() => this.readData(), 0);
      } else {
        this.push(null); // End stream
      }
    } catch (error) {
      this.emit('error', 
        error instanceof Error
          ? error
          : new Error('Unknown error reading data'),
      );
    }
  }
}
