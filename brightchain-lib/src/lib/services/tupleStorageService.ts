/**
 * @fileoverview Unified TUPLE Storage Service
 *
 * This service ensures ALL data stored in BrightChain goes through TUPLE storage
 * for complete Owner-Free Filesystem compliance. Every piece of data is stored
 * as a TUPLE (3 blocks: data + 2 randomizers) to ensure plausible deniability.
 *
 * Storage hierarchy:
 * - Raw data blocks: TUPLE (3 blocks)
 * - CBL metadata: TUPLE (3 blocks)
 * - Message content: TUPLE (3 blocks)
 * - Participant data: TUPLE per participant (3 blocks each)
 *
 * This replaces the previous "cheating" approach where CBLs were stored with
 * a single whitener instead of a full TUPLE.
 */

import { RawDataBlock } from '../blocks/rawData';
import {
  DurabilityLevel,
  getParityCountForDurability,
} from '../enumerations/durabilityLevel';
import { BlockStoreOptions } from '../interfaces/storage/blockMetadata';
import { IBlockStore } from '../interfaces/storage/blockStore';
import { Checksum } from '../types/checksum';

/**
 * Result of storing data as a TUPLE
 */
export interface TupleStorageResult {
  /** The data block ID */
  dataBlockId: string;
  /** The two randomizer block IDs */
  randomizerBlockIds: [string, string];
  /** Magnet URL for reconstruction */
  magnetUrl: string;
  /** Optional parity block IDs for each block */
  parityBlockIds?: [string[], string[], string[]];
}

/**
 * Unified service for TUPLE-based storage operations
 */
export class TupleStorageService {
  constructor(private readonly blockStore: IBlockStore) {}

  /**
   * Store any data as a TUPLE (data + 2 randomizers)
   *
   * @param data - The data to store
   * @param options - Storage options (durability, expiration, etc.)
   * @returns TUPLE storage result with all block IDs and magnet URL
   */
  async storeTuple(
    data: Uint8Array,
    options?: BlockStoreOptions,
  ): Promise<TupleStorageResult> {
    const blockSize = this.blockStore.blockSize;

    // Ensure data fits in a block
    if (data.length > blockSize) {
      throw new Error(
        `Data size ${data.length} exceeds block size ${blockSize}`,
      );
    }

    // Pad data to block size if needed
    const paddedData = new Uint8Array(blockSize);
    paddedData.set(data);

    // Generate two random blocks
    const randomizer1 = new Uint8Array(blockSize);
    const randomizer2 = new Uint8Array(blockSize);
    crypto.getRandomValues(randomizer1);
    crypto.getRandomValues(randomizer2);

    // XOR: data ⊕ R1 ⊕ R2 = stored_data
    // To reconstruct: stored_data ⊕ R1 ⊕ R2 = data
    const storedData = new Uint8Array(blockSize);
    for (let i = 0; i < blockSize; i++) {
      storedData[i] = paddedData[i] ^ randomizer1[i] ^ randomizer2[i];
    }

    // Store all three blocks
    const dataBlock = new RawDataBlock(blockSize, storedData, new Date());
    const rand1Block = new RawDataBlock(blockSize, randomizer1, new Date());
    const rand2Block = new RawDataBlock(blockSize, randomizer2, new Date());

    await this.blockStore.setData(dataBlock, options);
    await this.blockStore.setData(rand1Block, options);
    await this.blockStore.setData(rand2Block, options);

    const dataBlockId = dataBlock.idChecksum.toHex();
    const rand1BlockId = rand1Block.idChecksum.toHex();
    const rand2BlockId = rand2Block.idChecksum.toHex();

    // Generate parity blocks if durability requires it
    let parityBlockIds: [string[], string[], string[]] | undefined;
    if (
      options?.durabilityLevel &&
      options.durabilityLevel !== DurabilityLevel.Ephemeral
    ) {
      const parityCount = getParityCountForDurability(options.durabilityLevel);
      if (parityCount > 0) {
        // If user requested durability, we must deliver it - don't silently downgrade
        const dataParity = await this.blockStore.generateParityBlocks(
          dataBlockId,
          parityCount,
        );
        const rand1Parity = await this.blockStore.generateParityBlocks(
          rand1BlockId,
          parityCount,
        );
        const rand2Parity = await this.blockStore.generateParityBlocks(
          rand2BlockId,
          parityCount,
        );

        parityBlockIds = [
          dataParity.map((c) => c.toHex()),
          rand1Parity.map((c) => c.toHex()),
          rand2Parity.map((c) => c.toHex()),
        ];
      }
    }

    // Generate magnet URL
    const magnetUrl = this.generateTupleMagnetUrl(
      dataBlockId,
      rand1BlockId,
      rand2BlockId,
      blockSize,
      parityBlockIds,
    );

    return {
      dataBlockId,
      randomizerBlockIds: [rand1BlockId, rand2BlockId],
      magnetUrl,
      parityBlockIds,
    };
  }

  /**
   * Retrieve data from a TUPLE
   *
   * @param dataBlockId - The data block ID
   * @param randomizerBlockIds - The two randomizer block IDs
   * @param parityBlockIds - Optional parity block IDs for recovery
   * @returns The original data
   */
  async retrieveTuple(
    dataBlockId: string,
    randomizerBlockIds: [string, string],
    parityBlockIds?: [string[], string[], string[]],
  ): Promise<Uint8Array> {
    // Retrieve all three blocks (with recovery if needed)
    const dataBlock = await this.retrieveBlockWithRecovery(
      dataBlockId,
      parityBlockIds?.[0],
    );
    const rand1Block = await this.retrieveBlockWithRecovery(
      randomizerBlockIds[0],
      parityBlockIds?.[1],
    );
    const rand2Block = await this.retrieveBlockWithRecovery(
      randomizerBlockIds[1],
      parityBlockIds?.[2],
    );

    // XOR to reconstruct: stored_data ⊕ R1 ⊕ R2 = original_data
    const blockSize = this.blockStore.blockSize;
    const reconstructed = new Uint8Array(blockSize);

    for (let i = 0; i < blockSize; i++) {
      reconstructed[i] =
        dataBlock.data[i] ^ rand1Block.data[i] ^ rand2Block.data[i];
    }

    return reconstructed;
  }

  /**
   * Parse a TUPLE magnet URL
   *
   * Format: magnet:?xt=urn:brightchain:tuple&bs=<size>&d=<data>&r1=<rand1>&r2=<rand2>[&pd=<parity>][&pr1=<parity>][&pr2=<parity>]
   */
  parseTupleMagnetUrl(magnetUrl: string): {
    dataBlockId: string;
    randomizerBlockIds: [string, string];
    blockSize: number;
    parityBlockIds?: [string[], string[], string[]];
  } {
    const url = new URL(magnetUrl);

    if (url.protocol !== 'magnet:') {
      throw new Error('Invalid magnet URL protocol');
    }

    const params = new URLSearchParams(url.search);
    const xt = params.get('xt');

    if (xt !== 'urn:brightchain:tuple') {
      throw new Error('Invalid magnet URL type, expected tuple');
    }

    const blockSize = parseInt(params.get('bs') || '0', 10);
    const dataBlockId = params.get('d');
    const rand1BlockId = params.get('r1');
    const rand2BlockId = params.get('r2');

    if (!dataBlockId || !rand1BlockId || !rand2BlockId || !blockSize) {
      throw new Error('Missing required TUPLE magnet URL parameters');
    }

    // Parse optional parity IDs
    let parityBlockIds: [string[], string[], string[]] | undefined;
    const pdParam = params.get('pd');
    const pr1Param = params.get('pr1');
    const pr2Param = params.get('pr2');

    if (pdParam || pr1Param || pr2Param) {
      parityBlockIds = [
        pdParam ? pdParam.split(',') : [],
        pr1Param ? pr1Param.split(',') : [],
        pr2Param ? pr2Param.split(',') : [],
      ];
    }

    return {
      dataBlockId,
      randomizerBlockIds: [rand1BlockId, rand2BlockId],
      blockSize,
      parityBlockIds,
    };
  }

  /**
   * Generate a TUPLE magnet URL
   */
  private generateTupleMagnetUrl(
    dataBlockId: string,
    rand1BlockId: string,
    rand2BlockId: string,
    blockSize: number,
    parityBlockIds?: [string[], string[], string[]],
  ): string {
    let url = `magnet:?xt=urn:brightchain:tuple&bs=${blockSize}&d=${dataBlockId}&r1=${rand1BlockId}&r2=${rand2BlockId}`;

    if (parityBlockIds) {
      if (parityBlockIds[0].length > 0) {
        url += `&pd=${parityBlockIds[0].join(',')}`;
      }
      if (parityBlockIds[1].length > 0) {
        url += `&pr1=${parityBlockIds[1].join(',')}`;
      }
      if (parityBlockIds[2].length > 0) {
        url += `&pr2=${parityBlockIds[2].join(',')}`;
      }
    }

    return url;
  }

  /**
   * Retrieve a block with automatic recovery if needed
   */
  private async retrieveBlockWithRecovery(
    blockId: string,
    parityIds?: string[],
  ): Promise<RawDataBlock> {
    try {
      return await this.blockStore.getData(Checksum.fromHex(blockId));
    } catch (error) {
      // Try recovery if parity blocks are available
      if (parityIds && parityIds.length > 0) {
        const recoveryResult = await this.blockStore.recoverBlock(blockId);
        if (recoveryResult.success && recoveryResult.recoveredBlock) {
          return recoveryResult.recoveredBlock;
        }
      }
      throw error;
    }
  }
}
