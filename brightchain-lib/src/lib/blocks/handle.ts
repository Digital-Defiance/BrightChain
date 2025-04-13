import { ChecksumUint8Array } from '@digitaldefiance/ecies-lib';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { ServiceProvider } from '../services/service.provider';
import { BaseBlock } from './base';
import { RawDataBlock } from './rawData';

/**
 * Browser-compatible block handle type
 */
export type BlockHandle<T extends BaseBlock> = T & {
  _cachedData: Uint8Array | null;
  fullData: Uint8Array;
  layerData: Uint8Array;
  layerPayloadSize: number;
  calculateChecksum(): ChecksumUint8Array;
  clearCache(): void;
  block: RawDataBlock;
};

/**
 * Create a browser-compatible block handle from a block
 */
export function createBlockHandle<T extends BaseBlock>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blockConstructor: new (...args: any[]) => T,
  blockSize: BlockSize,
  data: Uint8Array,
  checksum: ChecksumUint8Array,
  canRead = true,
  canPersist = true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...constructorArgs: any[]
): BlockHandle<T> {
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

  instance.calculateChecksum = function (): ChecksumUint8Array {
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
 * Create a browser-compatible block handle from a block store
 */
export async function createBlockHandleFromStore<T extends BaseBlock>(
  blockConstructor: new (...args: any[]) => T,
  blockStore: { getData(key: ChecksumUint8Array): Promise<RawDataBlock> },
  blockSize: BlockSize,
  checksum: ChecksumUint8Array,
  canRead = true,
  canPersist = true,
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
