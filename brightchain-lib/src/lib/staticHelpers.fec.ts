import { ReedSolomonErasure } from '@subspace/reed-solomon-erasure.wasm';
import { BaseBlock } from './blocks/base';
import { ParityBlock } from './blocks/parity';
import { RawDataBlock } from './blocks/rawData';
import BlockDataType from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSizes';
import BlockType from './enumerations/blockType';
import { FecErrorType } from './enumerations/fecErrorType';
import { FecError } from './errors/fecError';

/**
 * StaticHelpersFec provides Forward Error Correction (FEC) functionality.
 * In the Owner Free Filesystem (OFF), FEC is used to:
 * 1. Create parity blocks for data recovery
 * 2. Recover damaged blocks using parity blocks
 * 3. Ensure data integrity across the network
 *
 * This implementation uses Reed-Solomon erasure coding to:
 * 1. Split data into shards
 * 2. Create parity shards
 * 3. Recover lost shards using parity
 */
export class StaticHelpersFec {
  /**
   * Maximum size of a single shard
   */
  public static readonly MaximumShardSize = BlockSize.Medium as number;

  /**
   * Given a data buffer, encode it using Reed-Solomon erasure coding.
   * This will produce a buffer of size (shardSize * (dataShards + parityShards)) or (shardSize * parityShards) if fecOnly is true.
   */
  public static async fecEncode(
    data: Buffer,
    shardSize: number,
    dataShards: number,
    parityShards: number,
    fecOnly: boolean,
  ): Promise<Buffer> {
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

    if (shardSize > StaticHelpersFec.MaximumShardSize) {
      throw new FecError(FecErrorType.ShardSizeExceedsMaximum, undefined, {
        SIZE: shardSize.toString(),
        MAXIMUM: StaticHelpersFec.MaximumShardSize.toString(),
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

      return fecOnly
        ? Buffer.from(shards.subarray(shardSize * dataShards))
        : Buffer.from(shards);
    } catch (error) {
      throw new FecError(FecErrorType.FecEncodingFailed, undefined, {
        ERROR: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Given a data buffer, reconstruct/repair it using Reed-Solomon erasure coding.
   * This will produce a buffer of size (shardSize * dataShards).
   */
  public static async fecDecode(
    data: Buffer,
    shardSize: number,
    dataShards: number,
    parityShards: number,
    shardsAvailable: boolean[],
  ): Promise<Buffer> {
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
      return Buffer.from(data).subarray(0, shardSize * dataShards);
    } catch (error) {
      throw new FecError(FecErrorType.FecDecodingFailed, undefined, {
        ERROR: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Given an input block, produce a set of parity blocks for error recovery.
   */
  public static async createParityBlocks(
    input: BaseBlock,
    parityBlocks: number,
  ): Promise<ParityBlock[]> {
    // Validate parameters
    if (!input) {
      throw new FecError(FecErrorType.InputBlockRequired);
    }

    if (parityBlocks <= 0) {
      throw new FecError(FecErrorType.ParityBlockCountMustBePositive);
    }

    const shardSize =
      input.blockSize > StaticHelpersFec.MaximumShardSize
        ? StaticHelpersFec.MaximumShardSize
        : input.blockSize;
    const requiredShards = Math.ceil(input.blockSize / shardSize);

    try {
      // Create parity blocks by processing input in chunks
      const resultParityBlocks: Buffer[] = Array(parityBlocks)
        .fill(null)
        .map(() => Buffer.alloc(0));

      // Ensure input data is a Buffer
      if (!(input.data instanceof Buffer)) {
        throw new FecError(FecErrorType.InputDataMustBeBuffer);
      }

      // Process each chunk
      for (let i = 0; i < requiredShards; i++) {
        const chunk = input.data.subarray(i * shardSize, (i + 1) * shardSize);
        const chunkParity = await StaticHelpersFec.fecEncode(
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
          resultParityBlocks[j] = Buffer.concat([
            resultParityBlocks[j],
            parityChunk,
          ]);
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
      throw new FecError(FecErrorType.FecEncodingFailed, undefined, {
        ERROR: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Recover a damaged block using its parity blocks.
   */
  public static async recoverDataBlocks(
    damagedBlock: BaseBlock,
    parityBlocks: ParityBlock[],
  ): Promise<RawDataBlock> {
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
        damagedBlock.blockSize > StaticHelpersFec.MaximumShardSize
          ? StaticHelpersFec.MaximumShardSize
          : damagedBlock.blockSize;
      const requiredShards = Math.ceil(damagedBlock.blockSize / shardSize);

      // Set up shard availability array
      const availableShards = [false, ...Array(parityBlocks.length).fill(true)];

      // Ensure damaged block data is a Buffer
      if (!(damagedBlock.data instanceof Buffer)) {
        throw new FecError(FecErrorType.DamagedBlockDataMustBeBuffer);
      }

      // Recover each shard
      let recoveredBlock = Buffer.alloc(0);
      for (let i = 0; i < requiredShards; i++) {
        // Combine damaged and parity data for this shard
        const shardData = Buffer.concat([
          damagedBlock.data.subarray(i * shardSize, (i + 1) * shardSize),
          ...parityBlocks.map((block) => {
            if (!(block.data instanceof Buffer)) {
              throw new FecError(FecErrorType.ParityBlockDataMustBeBuffer);
            }
            return block.data.subarray(i * shardSize, (i + 1) * shardSize);
          }),
        ]);

        // Recover this shard
        const recoveredShard = await StaticHelpersFec.fecDecode(
          shardData,
          shardSize,
          1,
          parityBlocks.length,
          availableShards,
        );

        recoveredBlock = Buffer.concat([recoveredBlock, recoveredShard]);
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
      throw new FecError(FecErrorType.FecDecodingFailed, undefined, {
        ERROR: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
