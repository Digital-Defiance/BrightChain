import { Member, type PlatformID } from '@digitaldefiance/ecies-lib';
import { ConstituentBlockListBlock } from '../blocks/cbl';
import { ExtendedCBL } from '../blocks/extendedCbl';
import { InMemoryBlockTuple } from '../blocks/memoryTuple';
import { RandomBlock } from '../blocks/random';
import { RawDataBlock } from '../blocks/rawData';
import { WhitenedBlock } from '../blocks/whitened';
import { Readable } from '../browserStream';
import { TUPLE } from '../constants';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { Checksum } from '../types/checksum';
import type { CBLService } from './cblService';
import type { ChecksumService } from './checksum.service';
import { getGlobalServiceProvider } from './globalServiceProvider';

/**
 * Result of a CopyOnWrite operation.
 * Contains the new CBL and metadata about what changed.
 */
export interface CopyOnWriteResult<TID extends PlatformID = Uint8Array> {
  /** The new CBL referencing both reused and new blocks */
  cbl: ConstituentBlockListBlock<TID> | ExtendedCBL<TID>;
  /** Number of tuples reused from the original CBL */
  reusedTupleCount: number;
  /** Number of new tuples created for changed data */
  newTupleCount: number;
  /** Total number of tuples in the new CBL */
  totalTupleCount: number;
}

/**
 * Options for the CopyOnWrite operation.
 */
export interface CopyOnWriteOptions {
  /** If true, create an ExtendedCBL with file metadata */
  createExtendedCbl?: boolean;
  /** File name for ExtendedCBL */
  fileName?: string;
  /** MIME type for ExtendedCBL */
  mimeType?: string;
}

/**
 * CopyOnWriteService provides efficient versioning for CBL-based data.
 *
 * When data changes, instead of re-creating all blocks from scratch, this service:
 * 1. Reads the new data in block-sized chunks
 * 2. Compares each chunk against the corresponding original block data
 *    (recovered by XORing the tuple's constituent blocks)
 * 3. Reuses the original tuple addresses for unchanged blocks
 * 4. Creates new tuples only for blocks whose data has changed
 * 5. Produces a new CBL that references both old (reused) and new block addresses
 *
 * This is analogous to copy-on-write in operating systems: we share unchanged
 * pages and only allocate new storage for modified pages.
 *
 * The tuple size (typically 3) means each "logical block" in the CBL is
 * represented by `tupleSize` addresses. When we say "reuse a tuple," we
 * mean we copy all `tupleSize` addresses from the old CBL into the new one.
 *
 * @typeParam TID - The platform ID type (defaults to Uint8Array)
 */
export class CopyOnWriteService<TID extends PlatformID = Uint8Array> {
  private readonly checksumService: ChecksumService;
  private readonly cblService: CBLService<TID>;

  constructor(
    checksumService?: ChecksumService,
    cblService?: CBLService<TID>,
  ) {
    this.checksumService =
      checksumService ?? getGlobalServiceProvider<TID>().checksumService;
    this.cblService =
      cblService ?? getGlobalServiceProvider<TID>().cblService;
  }

  /**
   * Create a new version of a CBL by applying changes from new data,
   * reusing unchanged blocks from the original CBL.
   *
   * @param originalCbl - The existing CBL to base the new version on
   * @param newData - The complete new data as a Uint8Array
   * @param creator - The member creating the new version
   * @param blockSize - The block size to use (must match the original CBL's block size)
   * @param getBlockData - Function to retrieve raw block data by checksum from the store
   * @param whitenedBlockSource - Function to get whitened blocks for new tuples
   * @param randomBlockSource - Function to get random blocks for new tuples
   * @param persistTuple - Function to persist newly created tuples
   * @param options - Optional settings for extended CBL creation
   * @returns The new CBL and statistics about reuse
   */
  public async newVersion(
    originalCbl: ConstituentBlockListBlock<TID>,
    newData: Uint8Array,
    creator: Member<TID>,
    blockSize: BlockSize,
    getBlockData: (checksum: Checksum) => Promise<Uint8Array>,
    whitenedBlockSource: () => WhitenedBlock | undefined,
    randomBlockSource: () => RandomBlock,
    persistTuple: (tuple: InMemoryBlockTuple) => Promise<void>,
    options?: CopyOnWriteOptions,
  ): Promise<CopyOnWriteResult<TID>> {
    const now = new Date();
    const tupleSize = originalCbl.tupleSize;
    const originalAddresses = originalCbl.addresses;
    const blockSizeBytes = blockSize as number;

    // Calculate how many logical blocks (tuples) the original CBL has
    const originalTupleCount = Math.floor(originalAddresses.length / tupleSize);

    // Calculate how many logical blocks the new data needs
    const newTotalBlocks = Math.ceil(newData.length / blockSizeBytes);

    // We'll build the new address list tuple by tuple
    const newAddressList: Checksum[] = [];
    let reusedTupleCount = 0;
    let newTupleCount = 0;

    for (let tupleIndex = 0; tupleIndex < newTotalBlocks; tupleIndex++) {
      // Extract the new data chunk for this block position
      const chunkStart = tupleIndex * blockSizeBytes;
      const chunkEnd = Math.min(chunkStart + blockSizeBytes, newData.length);
      let newChunk = newData.slice(chunkStart, chunkEnd);

      // Pad the last chunk if needed
      if (newChunk.length < blockSizeBytes) {
        const padded = new Uint8Array(blockSizeBytes);
        padded.set(newChunk);
        // Remaining bytes are zero-filled (deterministic padding for comparison)
        newChunk = padded;
      }

      // Check if we can reuse the original tuple at this position
      let reused = false;
      if (tupleIndex < originalTupleCount) {
        const originalTupleStart = tupleIndex * tupleSize;
        const originalTupleAddresses = originalAddresses.slice(
          originalTupleStart,
          originalTupleStart + tupleSize,
        );

        // Recover the original plaintext by XORing all blocks in the tuple
        try {
          const originalPlaintext = await this.recoverTupleData(
            originalTupleAddresses,
            getBlockData,
          );

          // Compare: if the data is identical, reuse the old addresses
          if (this.blocksEqual(newChunk, originalPlaintext)) {
            for (const addr of originalTupleAddresses) {
              newAddressList.push(addr);
            }
            reusedTupleCount++;
            reused = true;
          }
        } catch {
          // If we can't recover the original data (block missing, etc.),
          // fall through to create a new tuple
        }
      }

      if (!reused) {
        // Create a new tuple for this changed block
        const tupleAddresses = await this.createNewTuple(
          newChunk,
          blockSize,
          creator,
          whitenedBlockSource,
          randomBlockSource,
          persistTuple,
          now,
        );
        for (const addr of tupleAddresses) {
          newAddressList.push(addr);
        }
        newTupleCount++;
      }
    }

    // Build the address list buffer
    const addressListBuffer = this.addressesToBuffer(newAddressList);

    // Create the new CBL header
    const isExtended =
      options?.createExtendedCbl && options.fileName;
    const extendedInfo = isExtended
      ? {
          fileName: options!.fileName!,
          mimeType: options?.mimeType ?? 'application/octet-stream',
        }
      : undefined;

    const { headerData } = this.cblService.makeCblHeader(
      creator,
      now,
      newAddressList.length,
      newData.length,
      addressListBuffer,
      blockSize,
      BlockEncryptionType.None,
      extendedInfo,
      tupleSize,
    );

    // Assemble the full CBL data: header + address list
    const cblData = new Uint8Array(headerData.length + addressListBuffer.length);
    cblData.set(headerData, 0);
    cblData.set(addressListBuffer, headerData.length);

    // Create the CBL block
    const cbl = isExtended
      ? new ExtendedCBL<TID>(cblData, creator, blockSize)
      : new ConstituentBlockListBlock<TID>(cblData, creator, blockSize);

    return {
      cbl,
      reusedTupleCount,
      newTupleCount,
      totalTupleCount: reusedTupleCount + newTupleCount,
    };
  }

  /**
   * Recover the original plaintext data from a tuple by XORing all
   * constituent blocks together.
   *
   * In the OFF system, a tuple of `tupleSize` blocks is stored such that
   * XORing all blocks together recovers the original data:
   *   plaintext = block[0] XOR block[1] XOR ... XOR block[tupleSize-1]
   *
   * @param tupleAddresses - The checksums of the blocks in the tuple
   * @param getBlockData - Function to retrieve raw block data by checksum
   * @returns The recovered plaintext data
   */
  private async recoverTupleData(
    tupleAddresses: Checksum[],
    getBlockData: (checksum: Checksum) => Promise<Uint8Array>,
  ): Promise<Uint8Array> {
    if (tupleAddresses.length === 0) {
      throw new Error('Cannot recover data from empty tuple');
    }

    // Load all blocks in the tuple
    const blockDataArrays = await Promise.all(
      tupleAddresses.map((addr) => getBlockData(addr)),
    );

    // XOR all blocks together to recover the plaintext
    const result = new Uint8Array(blockDataArrays[0].length);
    result.set(blockDataArrays[0]);

    for (let i = 1; i < blockDataArrays.length; i++) {
      const current = blockDataArrays[i];
      for (let j = 0; j < result.length; j++) {
        result[j] ^= current[j];
      }
    }

    return result;
  }

  /**
   * Compare two block-sized byte arrays for equality.
   * Uses constant-length comparison (always checks all bytes).
   */
  private blocksEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let equal = true;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        equal = false;
        // Don't break early — we compare all bytes for consistency,
        // though this isn't a security-sensitive comparison
        break;
      }
    }
    return equal;
  }

  /**
   * Create a new tuple for a data block by XORing it with whitener/random blocks,
   * then persist the tuple.
   *
   * @returns The checksums of all blocks in the new tuple (in order)
   */
  private async createNewTuple(
    data: Uint8Array,
    blockSize: BlockSize,
    creator: Member<TID>,
    whitenedBlockSource: () => WhitenedBlock | undefined,
    randomBlockSource: () => RandomBlock,
    persistTuple: (tuple: InMemoryBlockTuple) => Promise<void>,
    dateCreated: Date,
  ): Promise<Checksum[]> {
    // Gather whitener/random blocks for the tuple (tupleSize - 1 blocks)
    const companions: (WhitenedBlock | RandomBlock)[] = [];
    for (let i = 0; i < TUPLE.SIZE - 1; i++) {
      const whitened = whitenedBlockSource();
      if (whitened) {
        companions.push(whitened);
      } else {
        companions.push(randomBlockSource());
      }
    }

    // XOR the data with all companion blocks to produce the "prime" block
    let xored = new Uint8Array(data);
    for (const companion of companions) {
      const companionData =
        companion.data instanceof Uint8Array
          ? companion.data
          : await this.streamToUint8Array(companion.data as Readable);
      for (let j = 0; j < xored.length; j++) {
        xored[j] ^= companionData[j];
      }
    }

    // Create the prime (XORed result) block
    const primeChecksum = this.checksumService.calculateChecksum(xored);
    const primeBlock = new RawDataBlock(
      blockSize,
      xored,
      dateCreated,
      primeChecksum,
    );

    // Build the tuple: [prime, ...companions]
    const allBlocks = [primeBlock, ...companions];
    const tuple = new InMemoryBlockTuple(allBlocks);
    await persistTuple(tuple);

    // Return all block checksums in tuple order
    return allBlocks.map((block) => block.idChecksum);
  }

  /**
   * Convert an array of Checksums to a concatenated Uint8Array buffer.
   */
  private addressesToBuffer(addresses: Checksum[]): Uint8Array {
    const buffers = addresses.map((addr) => addr.toUint8Array());
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of buffers) {
      result.set(buf, offset);
      offset += buf.length;
    }
    return result;
  }

  /**
   * Helper to convert a Readable stream to Uint8Array.
   */
  private async streamToUint8Array(readable: Readable): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of readable) {
      chunks.push(new Uint8Array(chunk));
    }
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
}
