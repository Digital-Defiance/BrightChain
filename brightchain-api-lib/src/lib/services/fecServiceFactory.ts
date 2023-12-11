/**
 * @file FecServiceFactory - Factory for selecting the best available FEC service
 * @description Provides a factory method to select the optimal FEC service implementation
 * based on the current environment and available hardware acceleration.
 *
 * @requirements 1.8
 */

import { IFecService } from '@brightchain/brightchain-lib';
import { WasmFecService } from './fec';
import { NativeRsFecService } from './nativeRsFecService';

/**
 * Factory for creating FEC service instances.
 *
 * This factory selects the best available FEC implementation based on:
 * 1. Hardware availability (Apple Silicon for native acceleration)
 * 2. Platform support (WASM for cross-platform)
 *
 * Priority order:
 * 1. NativeRsFecService - Hardware-accelerated (Apple Silicon)
 * 2. WasmFecService - Cross-platform WASM implementation
 */
export class FecServiceFactory {
  private static cachedService: IFecService | null = null;
  private static cacheChecked = false;

  /**
   * Get the best available FEC service for the current environment.
   *
   * This method checks available implementations in priority order:
   * 1. NativeRsFecService (Apple Silicon hardware acceleration)
   * 2. WasmFecService (cross-platform WASM)
   *
   * The result is cached for subsequent calls.
   *
   * @returns Promise resolving to the best available IFecService implementation
   * @throws Error if no FEC service is available
   *
   * @example
   * ```typescript
   * const fecService = await FecServiceFactory.getBestAvailable();
   * const parity = await fecService.createParityData(blockData, 2);
   * ```
   */
  static async getBestAvailable(): Promise<IFecService> {
    // Return cached service if available
    if (this.cacheChecked && this.cachedService) {
      return this.cachedService;
    }

    // Try native implementation first (highest priority)
    const nativeService = new NativeRsFecService();
    if (await nativeService.isAvailable()) {
      this.cachedService = nativeService;
      this.cacheChecked = true;
      return nativeService;
    }

    // Fall back to WASM implementation
    const wasmService = new WasmFecService();
    if (await wasmService.isAvailable()) {
      this.cachedService = wasmService;
      this.cacheChecked = true;
      return wasmService;
    }

    // If no service is available, throw an error
    throw new Error(
      'No FEC service available. Ensure either native bindings or WASM module is installed.',
    );
  }

  /**
   * Get a specific FEC service implementation by type.
   *
   * @param type - The type of FEC service to get ('native' or 'wasm')
   * @returns Promise resolving to the requested IFecService implementation
   * @throws Error if the requested service is not available
   *
   * @example
   * ```typescript
   * // Force WASM implementation
   * const wasmService = await FecServiceFactory.getByType('wasm');
   * ```
   */
  static async getByType(type: 'native' | 'wasm'): Promise<IFecService> {
    if (type === 'native') {
      const nativeService = new NativeRsFecService();
      if (await nativeService.isAvailable()) {
        return nativeService;
      }
      throw new Error('Native FEC service is not available on this platform.');
    }

    if (type === 'wasm') {
      const wasmService = new WasmFecService();
      if (await wasmService.isAvailable()) {
        return wasmService;
      }
      throw new Error('WASM FEC service is not available.');
    }

    throw new Error(`Unknown FEC service type: ${type}`);
  }

  /**
   * Check which FEC services are available in the current environment.
   *
   * @returns Promise resolving to an object indicating availability of each service
   *
   * @example
   * ```typescript
   * const availability = await FecServiceFactory.checkAvailability();
   * console.log('Native available:', availability.native);
   * console.log('WASM available:', availability.wasm);
   * ```
   */
  static async checkAvailability(): Promise<{
    native: boolean;
    wasm: boolean;
  }> {
    const nativeService = new NativeRsFecService();
    const wasmService = new WasmFecService();

    const [nativeAvailable, wasmAvailable] = await Promise.all([
      nativeService.isAvailable(),
      wasmService.isAvailable(),
    ]);

    return {
      native: nativeAvailable,
      wasm: wasmAvailable,
    };
  }

  /**
   * Clear the cached FEC service instance.
   *
   * This is useful for testing or when the environment changes.
   */
  static clearCache(): void {
    this.cachedService = null;
    this.cacheChecked = false;
  }

  /**
   * Create a new instance of the best available FEC service without caching.
   *
   * This is useful when you need a fresh instance or want to avoid
   * sharing state between different parts of the application.
   *
   * @returns Promise resolving to a new IFecService instance
   * @throws Error if no FEC service is available
   */
  static async createNew(): Promise<IFecService> {
    // Try native implementation first
    const nativeService = new NativeRsFecService();
    if (await nativeService.isAvailable()) {
      return nativeService;
    }

    // Fall back to WASM implementation
    const wasmService = new WasmFecService();
    if (await wasmService.isAvailable()) {
      return wasmService;
    }

    throw new Error(
      'No FEC service available. Ensure either native bindings or WASM module is installed.',
    );
  }
}
