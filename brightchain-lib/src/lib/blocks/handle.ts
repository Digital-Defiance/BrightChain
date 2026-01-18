import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { EnhancedValidationError } from '../errors/enhancedValidationError';
import { ServiceProvider } from '../services/service.provider';
import { Checksum } from '../types/checksum';
import { BaseBlock } from './base';
import { RawDataBlock } from './rawData';

/**
 * Symbol used to identify BlockHandle instances at runtime.
 * This enables the isBlockHandle type guard to work correctly.
 */
export const BLOCK_HANDLE_SYMBOL = Symbol.for('brightchain.BlockHandle');

/**
 * Browser-compatible block handle type.
 *
 * A BlockHandle wraps a block of type T (which must extend BaseBlock) and provides
 * additional functionality for lazy data loading, caching, and checksum calculation.
 *
 * @typeParam T - The block type this handle wraps. Must extend BaseBlock.
 *   Common types include RawDataBlock, EncryptedBlock, EphemeralBlock, etc.
 *
 * @remarks
 * - BlockHandle is a type alias, not a class - use createBlockHandle() to create instances
 * - The type parameter T is required and must extend BaseBlock
 * - BlockHandle instances are identified at runtime via the _isBlockHandle symbol property
 * - Use isBlockHandle() type guard for runtime type checking
 *
 * @example
 * ```typescript
 * // Creating a typed block handle
 * const handle: BlockHandle<RawDataBlock> = createBlockHandle(
 *   RawDataBlock,
 *   BlockSize.Small,
 *   data,
 *   checksum
 * );
 *
 * // Accessing handle properties
 * const fullData = handle.fullData;
 * const calculatedChecksum = handle.calculateChecksum();
 *
 * // Converting to underlying block
 * const rawBlock = handle.block;
 *
 * // Type guard usage
 * if (isBlockHandle(someValue)) {
 *   console.log(someValue.fullData);
 * }
 * ```
 *
 * @see {@link createBlockHandle} - Factory function to create BlockHandle instances
 * @see {@link isBlockHandle} - Type guard for runtime type checking
 * @see {@link BaseBlock} - Base class for all block types
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */
export type BlockHandle<T extends BaseBlock> = T & {
  /**
   * Symbol property to identify BlockHandle instances at runtime.
   * @internal
   */
  readonly [BLOCK_HANDLE_SYMBOL]: true;

  /**
   * Cached block data. May be null if cache has been cleared.
   * @internal
   */
  _cachedData: Uint8Array | null;

  /**
   * The complete block data including all headers and payload.
   * Data is loaded lazily and cached for subsequent access.
   */
  readonly fullData: Uint8Array;

  /**
   * The layer-specific data for this block.
   * For handles, this is equivalent to fullData.
   */
  readonly layerData: Uint8Array;

  /**
   * The size of the layer payload in bytes.
   */
  readonly layerPayloadSize: number;

  /**
   * Calculate the checksum of the block's full data.
   * @returns The calculated checksum as a Checksum instance
   */
  calculateChecksum(): Checksum;

  /**
   * Clear the cached data to free memory.
   * Subsequent data access will reload from the source.
   */
  clearCache(): void;

  /**
   * Get the underlying RawDataBlock representation.
   * Creates a new RawDataBlock instance from the handle's data.
   */
  readonly block: RawDataBlock;
};

/**
 * Create a browser-compatible block handle from block data.
 *
 * This factory function creates a BlockHandle instance that wraps a block of type T.
 * The handle provides lazy data loading, caching, and checksum calculation capabilities.
 *
 * @typeParam T - The block type to create a handle for. Must extend BaseBlock.
 *
 * @param blockConstructor - The constructor function for the block type T.
 *   Must accept (blockSize, data, dateCreated, checksum, blockType, blockDataType, canRead, canPersist, ...args)
 * @param blockSize - The size category of the block (e.g., BlockSize.Small, BlockSize.Medium)
 * @param data - The raw block data as a Uint8Array
 * @param checksum - The checksum/identifier of the block
 * @param canRead - Whether the block can be read (default: true)
 * @param canPersist - Whether the block can be persisted (default: true)
 * @param constructorArgs - Additional arguments to pass to the block constructor
 *
 * @returns A BlockHandle<T> instance wrapping the block
 *
 * @throws {EnhancedValidationError} If blockConstructor is not a valid constructor function
 * @throws {EnhancedValidationError} If data is not a valid Uint8Array
 * @throws {EnhancedValidationError} If checksum is not a valid Uint8Array
 *
 * @example
 * ```typescript
 * // Create a handle for a RawDataBlock
 * const handle = createBlockHandle<RawDataBlock>(
 *   RawDataBlock,
 *   BlockSize.Small,
 *   new Uint8Array(1024),
 *   checksumService.calculateChecksum(data)
 * );
 *
 * // Access the data
 * console.log(handle.fullData.length);
 *
 * // Calculate checksum
 * const checksum = handle.calculateChecksum();
 *
 * // Get underlying block
 * const block = handle.block;
 * ```
 *
 * @see {@link BlockHandle} - The type returned by this function
 * @see {@link isBlockHandle} - Type guard for runtime type checking
 * @see {@link createBlockHandleFromStore} - Create handle from a block store
 *
 * @see Requirements 3.1, 3.3, 3.4, 5.1
 */
export function createBlockHandle<T extends BaseBlock>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blockConstructor: new (...args: any[]) => T,
  blockSize: BlockSize,
  data: Uint8Array,
  checksum: Checksum,
  canRead = true,
  canPersist = true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...constructorArgs: any[]
): BlockHandle<T> {
  // Runtime validation
  if (typeof blockConstructor !== 'function') {
    throw new EnhancedValidationError(
      'blockConstructor',
      'blockConstructor must be a valid constructor function',
      { context: 'createBlockHandle' },
    );
  }

  if (blockSize === undefined || blockSize === null) {
    throw new EnhancedValidationError('blockSize', 'blockSize is required', {
      context: 'createBlockHandle',
    });
  }

  if (!(data instanceof Uint8Array)) {
    throw new EnhancedValidationError('data', 'data must be a Uint8Array', {
      context: 'createBlockHandle',
      receivedType: typeof data,
    });
  }

  if (!(checksum instanceof Checksum)) {
    throw new EnhancedValidationError(
      'checksum',
      'checksum must be a Checksum',
      { context: 'createBlockHandle', receivedType: typeof checksum },
    );
  }

  const instance = new blockConstructor(
    blockSize,
    data,
    new Date(),
    checksum,
    BlockType.Handle,
    BlockDataType.RawData,
    canRead,
    canPersist,
    ...constructorArgs,
  ) as BlockHandle<T>;

  // Add the symbol property to identify this as a BlockHandle
  Object.defineProperty(instance, BLOCK_HANDLE_SYMBOL, {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  instance._cachedData = data;

  Object.defineProperty(instance, 'fullData', {
    get: function () {
      return this._cachedData || this.data;
    },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(instance, 'layerData', {
    get: function () {
      return this.fullData;
    },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(instance, 'layerPayloadSize', {
    get: function () {
      return this.fullData.length;
    },
    enumerable: true,
    configurable: true,
  });

  instance.calculateChecksum = function (): Checksum {
    return ServiceProvider.getInstance().checksumService.calculateChecksum(
      this.fullData,
    );
  };

  instance.clearCache = function (): void {
    this._cachedData = null;
  };

  Object.defineProperty(instance, 'block', {
    get: function () {
      return new RawDataBlock(
        this.blockSize,
        this.fullData,
        this.dateCreated,
        this.idChecksum,
        this.blockType,
        this.blockDataType,
        this.canRead,
        this.canPersist,
      );
    },
    enumerable: true,
    configurable: true,
  });

  return instance;
}

/**
 * Create a browser-compatible block handle from a block store.
 *
 * This factory function retrieves block data from a store and creates a BlockHandle instance.
 * Useful when you have a checksum and need to load the block data asynchronously.
 *
 * @typeParam T - The block type to create a handle for. Must extend BaseBlock.
 *
 * @param blockConstructor - The constructor function for the block type T
 * @param blockStore - The block store to retrieve data from. Must have a getData method.
 * @param blockSize - The size category of the block
 * @param checksum - The checksum/identifier of the block to retrieve
 * @param canRead - Whether the block can be read (default: true)
 * @param canPersist - Whether the block can be persisted (default: true)
 * @param constructorArgs - Additional arguments to pass to the block constructor
 *
 * @returns A Promise resolving to a BlockHandle<T> instance
 *
 * @throws {EnhancedValidationError} If any validation fails (see createBlockHandle)
 * @throws {Error} If the block cannot be retrieved from the store
 *
 * @example
 * ```typescript
 * // Create a handle from a block store
 * const handle = await createBlockHandleFromStore<RawDataBlock>(
 *   RawDataBlock,
 *   myBlockStore,
 *   BlockSize.Small,
 *   blockChecksum
 * );
 *
 * // Now you can use the handle
 * console.log(handle.fullData.length);
 * ```
 *
 * @see {@link createBlockHandle} - Create handle directly from data
 * @see {@link BlockHandle} - The type returned by this function
 *
 * @see Requirements 3.1, 3.3, 3.4
 */
export async function createBlockHandleFromStore<T extends BaseBlock>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blockConstructor: new (...args: any[]) => T,
  blockStore: { getData(key: Checksum): Promise<RawDataBlock> },
  blockSize: BlockSize,
  checksum: Checksum,
  canRead = true,
  canPersist = true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...constructorArgs: any[]
): Promise<BlockHandle<T>> {
  const block = await blockStore.getData(checksum);
  return createBlockHandle(
    blockConstructor,
    blockSize,
    block.data,
    checksum,
    canRead,
    canPersist,
    ...constructorArgs,
  );
}

/**
 * Type guard to check if a value is a BlockHandle instance.
 *
 * This function performs runtime validation to determine if a value is a BlockHandle.
 * It checks for the presence of the BLOCK_HANDLE_SYMBOL property and validates
 * that the value has the expected BlockHandle interface.
 *
 * @param value - The value to check
 * @returns true if the value is a BlockHandle instance, false otherwise
 *
 * @remarks
 * - This type guard enables TypeScript type narrowing in conditional blocks
 * - It checks for the symbol property added by createBlockHandle
 * - It also validates the presence of key BlockHandle methods and properties
 *
 * @example
 * ```typescript
 * function processBlock(block: BaseBlock | BlockHandle<BaseBlock>): void {
 *   if (isBlockHandle(block)) {
 *     // TypeScript knows block is BlockHandle<BaseBlock> here
 *     console.log(block.fullData.length);
 *     block.clearCache();
 *   } else {
 *     // TypeScript knows block is BaseBlock here
 *     console.log(block.blockSize);
 *   }
 * }
 * ```
 *
 * @see {@link BlockHandle} - The type this guard checks for
 * @see {@link BLOCK_HANDLE_SYMBOL} - The symbol used for identification
 *
 * @see Requirements 14.2, 14.5, 14.6
 */
export function isBlockHandle<T extends BaseBlock = BaseBlock>(
  value: unknown,
): value is BlockHandle<T> {
  if (value === null || value === undefined) {
    return false;
  }

  // Check for the symbol property
  if (
    typeof value === 'object' &&
    BLOCK_HANDLE_SYMBOL in value &&
    (value as Record<symbol, unknown>)[BLOCK_HANDLE_SYMBOL] === true
  ) {
    // Additional validation: check for expected properties and methods
    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate['fullData'] !== 'undefined' &&
      typeof candidate['calculateChecksum'] === 'function' &&
      typeof candidate['clearCache'] === 'function' &&
      typeof candidate['block'] !== 'undefined'
    );
  }

  return false;
}
