/**
 * @file NativeRsFecService - Native Reed-Solomon FEC implementation
 * @description Provides hardware-accelerated FEC operations using native Rust bindings.
 * This implementation is optimized for Apple Silicon and other supported platforms.
 *
 * @requirements 1.8, 4.5, 4.6
 */

/* eslint-disable @nx/enforce-module-boundaries */
import {
  FecError,
  FecErrorType,
  FecRecoveryResult,
  IFecService,
  ParityData,
} from '@brightchain/brightchain-lib';
import { Constants } from '../constants';

/**
 * Native Reed-Solomon FEC Service using @digitaldefiance/node-rs-accelerate.
 *
 * This service provides hardware-accelerated FEC operations for platforms
 * that support native Rust bindings, particularly Apple Silicon.
 *
 * If the native library is not available, isAvailable() will return false
 * and the FecServiceFactory should fall back to WasmFecService.
 */
export class NativeRsFecService implements IFecService {
  private nativeModule: NativeRsModule | null = null;
  private availabilityChecked = false;
  private isAvailableResult = false;

  /**
   * Check if the native FEC service is available.
   *
   * This checks for:
   * 1. The @digitaldefiance/node-rs-accelerate package being installed
   * 2. Native bindings being available for the current platform
   * 3. Apple Silicon or other supported hardware
   *
   * @returns Promise resolving to true if native FEC is available
   */
  async isAvailable(): Promise<boolean> {
    if (this.availabilityChecked) {
      return this.isAvailableResult;
    }

    try {
      // Try to dynamically import the native module
      // This will fail if the package is not installed or bindings are not available
      const module = await this.loadNativeModule();
      this.nativeModule = module;
      this.isAvailableResult =
        module !== null && typeof module.encode === 'function';
    } catch {
      this.isAvailableResult = false;
    }

    this.availabilityChecked = true;
    return this.isAvailableResult;
  }

  /**
   * Attempt to load the native Reed-Solomon module.
   * @returns The native module or null if not available
   */
  private async loadNativeModule(): Promise<NativeRsModule | null> {
    try {
      // Dynamic import to avoid build-time errors if package is not installed
      // The package may not exist yet - this is intentional for future hardware acceleration
      const nativeRs = await (Function(
        'return import("@digitaldefiance/node-rs-accelerate")',
      )() as Promise<unknown>);
      return nativeRs as NativeRsModule;
    } catch {
      // Package not installed or native bindings not available
      return null;
    }
  }

  /**
   * Ensure the native module is loaded and available.
   * @throws FecError if native module is not available
   */
  private async ensureAvailable(): Promise<NativeRsModule> {
    const available = await this.isAvailable();
    if (!available || !this.nativeModule) {
      throw new FecError(FecErrorType.FecEncodingFailed, undefined, {
        ERROR: 'Native FEC service is not available on this platform',
      });
    }
    return this.nativeModule;
  }

  /**
   * Create parity data for a block using native Reed-Solomon encoding.
   *
   * @param blockData - The original block data to create parity for
   * @param parityCount - Number of parity shards to generate
   * @returns Promise resolving to array of parity data objects
   * @throws FecError if encoding fails or native module is not available
   */
  async createParityData(
    blockData: Buffer | Uint8Array,
    parityCount: number,
  ): Promise<ParityData[]> {
    const nativeModule = await this.ensureAvailable();

    if (!blockData || blockData.length === 0) {
      throw new FecError(FecErrorType.DataRequired);
    }

    if (parityCount <= 0) {
      throw new FecError(FecErrorType.ParityBlockCountMustBePositive);
    }

    const shardSize = Math.min(blockData.length, Constants.FEC.MAX_SHARD_SIZE);
    const requiredShards = Math.ceil(blockData.length / shardSize);

    try {
      const resultParityData: Buffer[] = Array(parityCount)
        .fill(null)
        .map(() => Buffer.alloc(0));

      // Process each chunk
      for (let i = 0; i < requiredShards; i++) {
        const start = i * shardSize;
        const end = Math.min(start + shardSize, blockData.length);
        const chunk = blockData.subarray(start, end);

        // Pad chunk if necessary
        const paddedChunk =
          chunk.length < shardSize
            ? Buffer.concat([
                Buffer.from(chunk),
                Buffer.alloc(shardSize - chunk.length),
              ])
            : Buffer.from(chunk);

        // Use native encoding
        const chunkParity = await this.nativeEncode(
          nativeModule,
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
   * Recover block data using parity data with native decoding.
   *
   * @param corruptedData - The corrupted block data, or null if completely missing
   * @param parityData - Array of available parity data objects
   * @param originalSize - The original size of the block data in bytes
   * @returns Promise resolving to recovery result with recovered data
   * @throws FecError if recovery fails or native module is not available
   */
  async recoverFileData(
    _corruptedData: Buffer | Uint8Array | null,
    parityData: ParityData[],
    originalSize: number,
  ): Promise<FecRecoveryResult> {
    const nativeModule = await this.ensureAvailable();

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

        // Recover this shard using native decoding
        const recoveredShard = await this.nativeDecode(
          nativeModule,
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
   * Verify block integrity against its parity data using native operations.
   *
   * @param blockData - The block data to verify
   * @param parityData - The stored parity data to verify against
   * @returns Promise resolving to true if the block is intact
   */
  async verifyFileIntegrity(
    blockData: Buffer | Uint8Array,
    parityData: ParityData[],
  ): Promise<boolean> {
    try {
      const regeneratedParity = await this.createParityData(
        blockData,
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

  /**
   * Native Reed-Solomon encoding.
   */
  private async nativeEncode(
    nativeModule: NativeRsModule,
    data: Buffer,
    shardSize: number,
    dataShards: number,
    parityShards: number,
    fecOnly: boolean,
  ): Promise<Buffer> {
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

      // Use native encoding
      nativeModule.encode(shards, dataShards, parityShards);

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
   * Native Reed-Solomon decoding.
   */
  private async nativeDecode(
    nativeModule: NativeRsModule,
    data: Buffer,
    shardSize: number,
    dataShards: number,
    parityShards: number,
    shardsAvailable: boolean[],
  ): Promise<Buffer> {
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
      // Use native reconstruction
      nativeModule.reconstruct(data, dataShards, parityShards, shardsAvailable);
      return data.subarray(0, shardSize * dataShards);
    } catch (error) {
      throw new FecError(FecErrorType.FecDecodingFailed, undefined, {
        ERROR: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Type definition for the native Reed-Solomon module.
 * This matches the expected API from @digitaldefiance/node-rs-accelerate.
 */
interface NativeRsModule {
  encode(shards: Uint8Array, dataShards: number, parityShards: number): void;
  reconstruct(
    shards: Uint8Array | Buffer,
    dataShards: number,
    parityShards: number,
    shardsAvailable: boolean[],
  ): void;
}
