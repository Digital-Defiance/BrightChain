import {
  FecError,
  FecErrorType,
  FecRecoveryResult,
  IFecService,
  ParityData as IParityData,
} from '@brightchain/brightchain-lib';
import { ReedSolomonErasure } from '@digitaldefiance/reed-solomon-erasure.wasm';
import { Constants } from '../constants';

/**
 * WasmFecService provides Forward Error Correction (FEC) functionality using WASM.
 * This service is used to:
 * 1. Create parity data for file recovery
 * 2. Recover corrupted files using parity data
 * 3. Ensure data integrity across distributed storage
 *
 * This implementation uses Reed-Solomon erasure coding via @subspace/reed-solomon-erasure.wasm to:
 * 1. Split file data into shards
 * 2. Create parity shards
 * 3. Recover lost shards using parity
 *
 * @requirements 1.8, 4.5, 4.6
 */

/**
 * @deprecated Use ParityData from @brightchain/brightchain-lib instead
 */
export interface ParityData {
  data: Buffer;
  index: number;
}

/**
 * @deprecated Use FecRecoveryResult from @brightchain/brightchain-lib instead
 */
export interface RecoveryResult {
  data: Buffer;
  recovered: boolean;
}

/**
 * WASM-based FEC Service implementing IFecService.
 *
 * This service provides cross-platform FEC operations using WebAssembly.
 * It is the default fallback when native implementations are not available.
 */
export class WasmFecService implements IFecService {
  private wasmAvailable: boolean | null = null;

  /**
   * Check if the WASM FEC service is available.
   *
   * This checks if the @subspace/reed-solomon-erasure.wasm module can be loaded.
   *
   * @returns Promise resolving to true if WASM FEC is available
   */
  async isAvailable(): Promise<boolean> {
    if (this.wasmAvailable !== null) {
      return this.wasmAvailable;
    }

    try {
      // Try to load the WASM module
      await ReedSolomonErasure.fromCurrentDirectory();
      this.wasmAvailable = true;
    } catch {
      this.wasmAvailable = false;
    }

    return this.wasmAvailable;
  }

  /**
   * Given a data buffer, encode it using Reed-Solomon erasure coding.
   * This will produce a buffer of size (shardSize * (dataShards + parityShards))
   * or (shardSize * parityShards) if fecOnly is true.
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
   * Create parity data for a block using Reed-Solomon encoding.
   *
   * @param blockData - The original block data to create parity for
   * @param parityCount - Number of parity shards to generate
   * @returns Promise resolving to array of parity data objects
   */
  public async createParityData(
    blockData: Buffer | Uint8Array,
    parityCount: number,
  ): Promise<IParityData[]> {
    const fileData = Buffer.isBuffer(blockData)
      ? blockData
      : Buffer.from(blockData);

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
      if (error instanceof FecError) {
        throw error;
      }
      throw new FecError(FecErrorType.FecEncodingFailed, undefined, {
        ERROR: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Recover block data using parity data.
   *
   * @param corruptedData - The corrupted block data, or null if completely missing
   * @param parityData - Array of available parity data objects
   * @param originalSize - The original size of the block data in bytes
   * @returns Promise resolving to recovery result with recovered data
   */
  public async recoverFileData(
    _corruptedData: Buffer | Uint8Array | null,
    parityData: IParityData[],
    originalSize: number,
  ): Promise<FecRecoveryResult> {
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
            Buffer.from(
              parity.data.subarray(i * shardSize, (i + 1) * shardSize),
            ),
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
      if (error instanceof FecError) {
        throw error;
      }
      throw new FecError(FecErrorType.FecDecodingFailed, undefined, {
        ERROR: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Verify block integrity against its parity data.
   *
   * @param blockData - The block data to verify
   * @param parityData - The stored parity data to verify against
   * @returns Promise resolving to true if the block is intact
   */
  public async verifyFileIntegrity(
    blockData: Buffer | Uint8Array,
    parityData: IParityData[],
  ): Promise<boolean> {
    try {
      const fileData = Buffer.isBuffer(blockData)
        ? blockData
        : Buffer.from(blockData);

      const regeneratedParity = await this.createParityData(
        fileData,
        parityData.length,
      );

      return parityData.every((original, index) => {
        const originalBuf = Buffer.from(original.data);
        const regeneratedBuf = Buffer.from(regeneratedParity[index].data);
        return originalBuf.equals(regeneratedBuf);
      });
    } catch {
      return false;
    }
  }
}

/**
 * @deprecated Use WasmFecService instead. FecService is kept for backward compatibility.
 */
export const FecService = WasmFecService;
