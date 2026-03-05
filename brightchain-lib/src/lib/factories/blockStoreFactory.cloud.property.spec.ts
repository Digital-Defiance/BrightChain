/**
 * Feature: cloud-block-store-drivers, Property 1: Factory registration round-trip
 *
 * For any factory function that returns a valid IBlockStore, registering it via
 * registerAzureStoreFactory (or registerS3StoreFactory) and then calling
 * createAzureStore (or createS3Store) with a valid config should return the
 * IBlockStore instance produced by that factory function.
 *
 * **Validates: Requirements 1.3, 1.4**
 */
import { afterEach, describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';
import { BlockSize, validBlockSizes } from '../enumerations/blockSize';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { StoreError } from '../errors/storeError';
import { IBlockStore } from '../interfaces/storage/blockStore';
import { ICloudBlockStoreConfig } from '../interfaces/storage/cloudBlockStoreConfig';
import { BlockStoreFactory } from './blockStoreFactory';

/**
 * Arbitrary generator for ICloudBlockStoreConfig values.
 * Generates realistic cloud config objects with valid block sizes.
 */
const arbCloudConfig: fc.Arbitrary<ICloudBlockStoreConfig> = fc.record({
  region: fc
    .string({ minLength: 3, maxLength: 20 })
    .map((s) => s.replace(/[^a-z0-9-]/gi, 'a').toLowerCase()),
  containerOrBucketName: fc
    .string({ minLength: 3, maxLength: 63 })
    .map((s) => s.replace(/[^a-z0-9-]/gi, 'b').toLowerCase()),
  blockSize: fc.constantFrom(...validBlockSizes),
  keyPrefix: fc.option(
    fc
      .string({ minLength: 1, maxLength: 30 })
      .map((s) => s.replace(/[^a-z0-9-/]/gi, 'c').toLowerCase()),
    { nil: undefined },
  ),
});

/**
 * Creates a minimal mock IBlockStore stub for testing factory round-trip.
 * The property verifies referential identity, not full interface behavior.
 */
function createMockBlockStore(blockSize: BlockSize): IBlockStore {
  return { blockSize } as unknown as IBlockStore;
}

// Feature: cloud-block-store-drivers, Property 1: Factory registration round-trip
describe('Property 1: Factory registration round-trip', () => {
  afterEach(() => {
    BlockStoreFactory.clearAzureStoreFactory();
    BlockStoreFactory.clearS3StoreFactory();
  });

  it('Azure: register + create returns the factory-produced instance', () => {
    fc.assert(
      fc.property(arbCloudConfig, (config) => {
        const expectedStore = createMockBlockStore(config.blockSize);
        const factory = (_cfg: ICloudBlockStoreConfig) => expectedStore;

        BlockStoreFactory.registerAzureStoreFactory(factory);
        const result = BlockStoreFactory.createAzureStore(config);

        expect(result).toBe(expectedStore);
        BlockStoreFactory.clearAzureStoreFactory();
      }),
      { numRuns: 100 },
    );
  });

  it('S3: register + create returns the factory-produced instance', () => {
    fc.assert(
      fc.property(arbCloudConfig, (config) => {
        const expectedStore = createMockBlockStore(config.blockSize);
        const factory = (_cfg: ICloudBlockStoreConfig) => expectedStore;

        BlockStoreFactory.registerS3StoreFactory(factory);
        const result = BlockStoreFactory.createS3Store(config);

        expect(result).toBe(expectedStore);
        BlockStoreFactory.clearS3StoreFactory();
      }),
      { numRuns: 100 },
    );
  });

  it('Azure: factory receives the exact config passed to createAzureStore', () => {
    fc.assert(
      fc.property(arbCloudConfig, (config) => {
        let receivedConfig: ICloudBlockStoreConfig | undefined;
        const factory = (cfg: ICloudBlockStoreConfig) => {
          receivedConfig = cfg;
          return createMockBlockStore(cfg.blockSize);
        };

        BlockStoreFactory.registerAzureStoreFactory(factory);
        BlockStoreFactory.createAzureStore(config);

        expect(receivedConfig).toBe(config);
        BlockStoreFactory.clearAzureStoreFactory();
      }),
      { numRuns: 100 },
    );
  });

  it('S3: factory receives the exact config passed to createS3Store', () => {
    fc.assert(
      fc.property(arbCloudConfig, (config) => {
        let receivedConfig: ICloudBlockStoreConfig | undefined;
        const factory = (cfg: ICloudBlockStoreConfig) => {
          receivedConfig = cfg;
          return createMockBlockStore(cfg.blockSize);
        };

        BlockStoreFactory.registerS3StoreFactory(factory);
        BlockStoreFactory.createS3Store(config);

        expect(receivedConfig).toBe(config);
        BlockStoreFactory.clearS3StoreFactory();
      }),
      { numRuns: 100 },
    );
  });

  it('Azure: createAzureStore throws FactoryNotRegistered when unregistered', () => {
    fc.assert(
      fc.property(arbCloudConfig, (config) => {
        BlockStoreFactory.clearAzureStoreFactory();

        expect(() => BlockStoreFactory.createAzureStore(config)).toThrow(
          StoreError,
        );

        try {
          BlockStoreFactory.createAzureStore(config);
        } catch (e) {
          expect(e).toBeInstanceOf(StoreError);
          expect((e as StoreError).type).toBe(
            StoreErrorType.FactoryNotRegistered,
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it('S3: createS3Store throws FactoryNotRegistered when unregistered', () => {
    fc.assert(
      fc.property(arbCloudConfig, (config) => {
        BlockStoreFactory.clearS3StoreFactory();

        expect(() => BlockStoreFactory.createS3Store(config)).toThrow(
          StoreError,
        );

        try {
          BlockStoreFactory.createS3Store(config);
        } catch (e) {
          expect(e).toBeInstanceOf(StoreError);
          expect((e as StoreError).type).toBe(
            StoreErrorType.FactoryNotRegistered,
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});
