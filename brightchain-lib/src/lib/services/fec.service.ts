import { ReedSolomonErasure } from '@subspace/reed-solomon-erasure.wasm';
import { BaseBlock } from '../blocks/base';
import { ParityBlock } from '../blocks/parity';
import { RawDataBlock } from '../blocks/rawData';
import { Readable } from '../browserStream';
import { BC_FEC } from '../constants';
import { BrightChainStrings } from '../enumerations/brightChainStrings';
import BlockDataType from '../enumerations/blockDataType';
import BlockType from '../enumerations/blockType';
import { FecErrorType } from '../enumerations/fecErrorType';
import { FecError } from '../errors/fecError';
import { translate } from '../i18n';
import { Validator } from '../utils/validator';

/**
 * FecService provides Forward Error Correction (FEC) functionality.
 * In the Owner Free Filesystem (OFF), FEC is used to:
 * 1. Create parity blocks for data recovery
 * 2. Recover damaged blocks using parity blocks
 * 3. Ensure data integrity across the network
 *
 * This implementation uses Reed-Solomon erasure coding to:
 * 1. Split data into shards
 * 2. Create parity shards
 * 3. Recover lost shards using parity
 *
 * @remarks
 * - All methods validate inputs before processing
 * - Errors are wrapped in FecError with appropriate context
 * - The service uses the Reed-Solomon erasure coding library
 *
 * @see Requirements 5.1, 5.2, 5.3, 12.1, 12.2
 */
export class FecService {
  /**
   * Given a data buffer, encode it using Reed-Solomon erasure coding.
   * This will produce a buffer of size (shardSize * (dataShards + parityShards))
   * or (shardSize * parityShards) if fecOnly is true.
   *
   * @param data - The data to encode
   * @param shardSize - The size of each shard
   * @param dataShards - The number of data shards
   * @param parityShards - The number of parity shards
   * @param fecOnly - If true, only return parity data
   * @returns The encoded data
   * @throws {FecError} If validation fails or encoding fails
   *
   * @see Requirements 5.1, 5.2, 5.3
   */
  public async encode(
    data: Uint8Array,
    shardSize: number,
    dataShards: number,
    parityShards: number,
    fecOnly: boolean,
  ): Promise<Uint8Array> {
    // Validate required parameters
    Validator.validateRequired(data, 'data', 'encode');

    // Validate parameters
    if (!data || data.length === 0) {
      throw new FecError(FecErrorType.DataRequired);
    }

    if (data.length !== shardSize * dataShards) {
      throw new FecError(FecErrorType.InvalidDataLength, undefined, {
        LENGTH: data.length.toString(),
        EXPECTED: (shardSize * dataShards).toString(),
      });
    }

    if (shardSize > BC_FEC.MAX_SHARD_SIZE) {
      throw new FecError(FecErrorType.ShardSizeExceedsMaximum, undefined, {
        SIZE: shardSize.toString(),
        MAXIMUM: BC_FEC.MAX_SHARD_SIZE.toString(),
      });
    }

    if (dataShards <= 0 || parityShards <= 0) {
      throw new FecError(FecErrorType.InvalidShardCounts);
    }

    try {
      const shards = new Uint8Array(shardSize * (dataShards + parityShards));
      shards.set(data);

      // Encoding
      const reedSolomonErasure =
        await ReedSolomonErasure.fromCurrentDirectory();
      reedSolomonErasure.encode(shards, dataShards, parityShards);

      return fecOnly ? shards.subarray(shardSize * dataShards) : shards;
    } catch (error) {
      // Wrap errors with context
      if (error instanceof FecError) {
        throw error;
      }
      throw new FecError(FecErrorType.FecEncodingFailed, undefined, {
        ERROR:
          error instanceof Error
            ? error.message
            : translate(BrightChainStrings.Error_Unexpected_Error),
      });
    }
  }

  /**
   * Given a data buffer, reconstruct/repair it using Reed-Solomon erasure coding.
   * This will produce a buffer of size (shardSize * dataShards).
   *
   * @param data - The data to decode (including parity)
   * @param shardSize - The size of each shard
   * @param dataShards - The number of data shards
   * @param parityShards - The number of parity shards
   * @param shardsAvailable - Boolean array indicating which shards are available
   * @returns The decoded data
   * @throws {FecError} If validation fails or decoding fails
   *
   * @see Requirements 5.1, 5.2, 5.3
   */
  public async decode(
    data: Uint8Array,
    shardSize: number,
    dataShards: number,
    parityShards: number,
    shardsAvailable: boolean[],
  ): Promise<Uint8Array> {
    // Validate required parameters
    Validator.validateRequired(data, 'data', 'decode');
    Validator.validateRequired(shardsAvailable, 'shardsAvailable', 'decode');

    // Validate parameters
    if (!data || data.length === 0) {
      throw new FecError(FecErrorType.DataRequired);
    }

    if (data.length !== shardSize * (dataShards + parityShards)) {
      throw new FecError(FecErrorType.InvalidDataLength, undefined, {
        LENGTH: data.length.toString(),
        EXPECTED: (shardSize * (dataShards + parityShards)).toString(),
      });
    }

    if (
      !shardsAvailable ||
      shardsAvailable.length !== dataShards + parityShards
    ) {
      throw new FecError(FecErrorType.InvalidShardsAvailableArray);
    }

    const availableCount = shardsAvailable.filter((x) => x).length;
    if (availableCount < dataShards) {
      throw new FecError(FecErrorType.NotEnoughShardsAvailable, undefined, {
        AVAILABLE: availableCount.toString(),
        REQUIRED: dataShards.toString(),
      });
    }

    try {
      const reedSolomonErasure =
        await ReedSolomonErasure.fromCurrentDirectory();
      reedSolomonErasure.reconstruct(
        data,
        dataShards,
        parityShards,
        shardsAvailable,
      );
      return data.subarray(0, shardSize * dataShards);
    } catch (error) {
      // Wrap errors with context
      if (error instanceof FecError) {
        throw error;
      }
      throw new FecError(FecErrorType.FecDecodingFailed, undefined, {
        ERROR:
          error instanceof Error
            ? error.message
            : translate(BrightChainStrings.Error_Unexpected_Error),
      });
    }
  }

  /**
   * Given an input block, produce a set of parity blocks for error recovery.
   *
   * @param input - The input block to create parity for
   * @param parityBlocks - The number of parity blocks to create
   * @returns Array of parity blocks
   * @throws {FecError} If validation fails or parity creation fails
   *
   * @see Requirements 5.1, 5.2, 5.3
   */
  public async createParityBlocks(
    input: BaseBlock,
    parityBlocks: number,
  ): Promise<ParityBlock[]> {
    // Validate required parameters
    Validator.validateRequired(input, 'input', 'createParityBlocks');

    // Validate parameters
    if (!input) {
      throw new FecError(FecErrorType.InputBlockRequired);
    }

    if (parityBlocks <= 0) {
      throw new FecError(FecErrorType.ParityBlockCountMustBePositive);
    }

    const shardSize =
      input.blockSize > BC_FEC.MAX_SHARD_SIZE
        ? BC_FEC.MAX_SHARD_SIZE
        : input.blockSize;
    const requiredShards = Math.ceil(input.blockSize / shardSize);

    try {
      // Create parity blocks by processing input in chunks
      const resultParityBlocks: Uint8Array[] = Array(parityBlocks)
        .fill(null)
        .map(() => new Uint8Array(0));

      // Handle both Buffer and Readable cases
      const inputData = input.data;
      if (inputData instanceof Readable) {
        throw new FecError(FecErrorType.InputDataMustBeBuffer);
      }

      // Process each chunk
      for (let i = 0; i < requiredShards; i++) {
        const chunk = inputData.subarray(i * shardSize, (i + 1) * shardSize);
        const chunkParity = await this.encode(
          chunk,
          shardSize,
          1,
          parityBlocks,
          true,
        );

        // Distribute parity data to blocks
        for (let j = 0; j < parityBlocks; j++) {
          const parityChunk = chunkParity.subarray(
            j * shardSize,
            (j + 1) * shardSize,
          );
          const existing = resultParityBlocks[j];
          const newBlock = new Uint8Array(existing.length + parityChunk.length);
          newBlock.set(existing);
          newBlock.set(parityChunk, existing.length);
          resultParityBlocks[j] = newBlock;
        }
      }

      // Validate and create parity blocks
      return resultParityBlocks.map((parityData) => {
        if (parityData.length !== input.blockSize) {
          throw new FecError(FecErrorType.InvalidParityBlockSize, undefined, {
            SIZE: parityData.length.toString(),
            EXPECTED: input.blockSize.toString(),
          });
        }
        return new ParityBlock(input.blockSize, parityData);
      });
    } catch (error) {
      // Wrap errors with context
      if (error instanceof FecError) {
        throw error;
      }
      throw new FecError(FecErrorType.FecEncodingFailed, undefined, {
        ERROR:
          error instanceof Error
            ? error.message
            : translate(BrightChainStrings.Error_Unexpected_Error),
      });
    }
  }

  /**
   * Recover a damaged block using its parity blocks.
   *
   * @param damagedBlock - The damaged block to recover
   * @param parityBlocks - Array of parity blocks for recovery
   * @returns The recovered raw data block
   * @throws {FecError} If validation fails or recovery fails
   *
   * @see Requirements 5.1, 5.2, 5.3
   */
  public async recoverDataBlocks(
    damagedBlock: BaseBlock,
    parityBlocks: ParityBlock[],
  ): Promise<RawDataBlock> {
    // Validate required parameters
    Validator.validateRequired(
      damagedBlock,
      'damagedBlock',
      'recoverDataBlocks',
    );
    Validator.validateRequired(
      parityBlocks,
      'parityBlocks',
      'recoverDataBlocks',
    );

    // Validate parameters
    if (!damagedBlock) {
      throw new FecError(FecErrorType.DamagedBlockRequired);
    }

    if (!parityBlocks || parityBlocks.length === 0) {
      throw new FecError(FecErrorType.ParityBlocksRequired);
    }

    if (
      !parityBlocks.every((block) => block.blockSize === damagedBlock.blockSize)
    ) {
      throw new FecError(FecErrorType.BlockSizeMismatch);
    }

    try {
      const shardSize =
        damagedBlock.blockSize > BC_FEC.MAX_SHARD_SIZE
          ? BC_FEC.MAX_SHARD_SIZE
          : damagedBlock.blockSize;
      const requiredShards = Math.ceil(damagedBlock.blockSize / shardSize);

      // Set up shard availability array
      const availableShards = [false, ...Array(parityBlocks.length).fill(true)];

      // Handle both Buffer and Readable cases
      const damagedData = damagedBlock.data;
      if (damagedData instanceof Readable) {
        throw new FecError(FecErrorType.DamagedBlockDataMustBeBuffer);
      }

      // Recover each shard
      let recoveredBlock = new Uint8Array(0);
      for (let i = 0; i < requiredShards; i++) {
        // Combine damaged and parity data for this shard
        const damagedChunk = damagedData.subarray(
          i * shardSize,
          (i + 1) * shardSize,
        );
        const shardData = new Uint8Array(
          damagedChunk.length + parityBlocks.length * shardSize,
        );
        shardData.set(damagedChunk);
        let offset = damagedChunk.length;
        for (const block of parityBlocks) {
          const parityData = block.data;
          if (parityData instanceof Readable) {
            throw new FecError(FecErrorType.ParityBlockDataMustBeBuffer);
          }
          const parityChunk = parityData.subarray(
            i * shardSize,
            (i + 1) * shardSize,
          );
          shardData.set(parityChunk, offset);
          offset += parityChunk.length;
        }

        // Recover this shard
        const recoveredShard = await this.decode(
          shardData,
          shardSize,
          1,
          parityBlocks.length,
          availableShards,
        );
        const newRecoveredBlock = new Uint8Array(
          recoveredBlock.length + recoveredShard.length,
        );
        newRecoveredBlock.set(recoveredBlock);
        newRecoveredBlock.set(recoveredShard, recoveredBlock.length);
        recoveredBlock = newRecoveredBlock;
      }

      // Validate and create recovered block
      if (recoveredBlock.length !== damagedBlock.blockSize) {
        throw new FecError(FecErrorType.InvalidRecoveredBlockSize, undefined, {
          SIZE: recoveredBlock.length.toString(),
          EXPECTED: damagedBlock.blockSize.toString(),
        });
      }

      return new RawDataBlock(
        damagedBlock.blockSize,
        recoveredBlock,
        new Date(),
        undefined, // Let constructor calculate checksum
        BlockType.RawData,
        BlockDataType.RawData,
        true, // canRead
        true, // canPersist
      );
    } catch (error) {
      // Wrap errors with context
      if (error instanceof FecError) {
        throw error;
      }
      throw new FecError(FecErrorType.FecDecodingFailed, undefined, {
        ERROR:
          error instanceof Error
            ? error.message
            : translate(BrightChainStrings.Error_Unexpected_Error),
      });
    }
  }
}
