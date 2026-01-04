import { FecError, FecErrorType } from '@brightchain/brightchain-lib';
import { ReedSolomonErasure } from '@subspace/reed-solomon-erasure.wasm';
import { Constants } from '../constants';

/**
 * FecService provides Forward Error Correction (FEC) functionality for filesystem/S3 objects.
 * This service is used to:
 * 1. Create parity data for file recovery
 * 2. Recover corrupted files using parity data
 * 3. Ensure data integrity across distributed storage
 *
 * This implementation uses Reed-Solomon erasure coding to:
 * 1. Split file data into shards
 * 2. Create parity shards
 * 3. Recover lost shards using parity
 */

export interface ParityData {
  data: Buffer;
  index: number;
}

export interface RecoveryResult {
  data: Buffer;
  recovered: boolean;
}
export class FecService {
  /**
   * Given a data buffer, encode it using Reed-Solomon erasure coding.
   * This will produce a buffer of size (shardSize * (dataShards + parityShards)) or (shardSize * parityShards) if fecOnly is true.
   */
  public async encode(
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

    if (shardSize > Constants.FEC.MAX_SHARD_SIZE) {
      throw new FecError(FecErrorType.ShardSizeExceedsMaximum, undefined, {
        SIZE: shardSize.toString(),
        MAXIMUM: Constants.FEC.MAX_SHARD_SIZE.toString(),
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
  public async decode(
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
      return data.subarray(0, shardSize * dataShards);
    } catch (error) {
      throw new FecError(FecErrorType.FecDecodingFailed, undefined, {
        ERROR: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create parity data for a file buffer.
   */
  public async createParityData(
    fileData: Buffer,
    parityCount: number,
  ): Promise<ParityData[]> {
    if (!fileData || fileData.length === 0) {
      throw new FecError(FecErrorType.DataRequired);
    }

    if (parityCount <= 0) {
      throw new FecError(FecErrorType.ParityBlockCountMustBePositive);
    }

    const shardSize = Math.min(fileData.length, Constants.FEC.MAX_SHARD_SIZE);
    const requiredShards = Math.ceil(fileData.length / shardSize);

    try {
      const resultParityData: Buffer[] = Array(parityCount)
        .fill(null)
        .map(() => Buffer.alloc(0));

      // Process each chunk
      for (let i = 0; i < requiredShards; i++) {
        const start = i * shardSize;
        const end = Math.min(start + shardSize, fileData.length);
        const chunk = fileData.subarray(start, end);

        // Pad chunk if necessary
        const paddedChunk =
          chunk.length < shardSize
            ? Buffer.concat([chunk, Buffer.alloc(shardSize - chunk.length)])
            : chunk;

        const chunkParity = await this.encode(
          paddedChunk,
          shardSize,
          1,
          parityCount,
          true,
        );

        // Distribute parity data
        for (let j = 0; j < parityCount; j++) {
          const parityChunk = chunkParity.subarray(
            j * shardSize,
            (j + 1) * shardSize,
          );
          resultParityData[j] = Buffer.concat([
            resultParityData[j],
            parityChunk,
          ]);
        }
      }

      return resultParityData.map((data, index) => ({
        data,
        index,
      }));
    } catch (error) {
      throw new FecError(FecErrorType.FecEncodingFailed, undefined, {
        ERROR: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Recover file data using parity data. Pass null for corrupted data.
   */
  public async recoverFileData(
    corruptedData: Buffer | null,
    parityData: ParityData[],
    originalSize: number,
  ): Promise<RecoveryResult> {
    if (!parityData || parityData.length === 0) {
      throw new FecError(FecErrorType.DataRequired);
    }

    if (originalSize <= 0) {
      throw new FecError(FecErrorType.InvalidDataLength);
    }

    try {
      const shardSize = Math.min(originalSize, Constants.FEC.MAX_SHARD_SIZE);
      const requiredShards = Math.ceil(originalSize / shardSize);

      // Set up shard availability array (data shard unavailable, parity shards available)
      const availableShards = [false, ...Array(parityData.length).fill(true)];

      let recoveredData = Buffer.alloc(0);

      // Recover each shard
      for (let i = 0; i < requiredShards; i++) {
        const start = i * shardSize;
        const end = Math.min(start + shardSize, originalSize);
        const chunkSize = end - start;

        // Create placeholder for corrupted data shard
        const corruptedShard = Buffer.alloc(shardSize);

        // Combine corrupted and parity data for this shard
        const shardData = Buffer.concat([
          corruptedShard,
          ...parityData.map((parity) =>
            parity.data.subarray(i * shardSize, (i + 1) * shardSize),
          ),
        ]);

        // Recover this shard
        const recoveredShard = await this.decode(
          shardData,
          shardSize,
          1,
          parityData.length,
          availableShards,
        );

        // Only take the actual data length for the last shard
        const actualShard =
          i === requiredShards - 1
            ? recoveredShard.subarray(0, chunkSize)
            : recoveredShard;

        recoveredData = Buffer.concat([recoveredData, actualShard]);
      }

      return {
        data: recoveredData,
        recovered: true,
      };
    } catch (error) {
      throw new FecError(FecErrorType.FecDecodingFailed, undefined, {
        ERROR: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Verify file integrity using parity data.
   */
  public async verifyFileIntegrity(
    fileData: Buffer,
    parityData: ParityData[],
  ): Promise<boolean> {
    try {
      const regeneratedParity = await this.createParityData(
        fileData,
        parityData.length,
      );

      return parityData.every((original, index) =>
        original.data.equals(regeneratedParity[index].data),
      );
    } catch {
      return false;
    }
  }
}
