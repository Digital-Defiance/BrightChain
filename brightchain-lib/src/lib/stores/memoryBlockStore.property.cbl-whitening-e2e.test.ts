import { afterAll, describe, expect, it } from '@jest/globals';
import { BlockSize } from '../enumerations/blockSize';
import { DurabilityLevel } from '../enumerations/durabilityLevel';
import { initializeBrightChain } from '../init';
import { CBLWhiteningOptions } from '../interfaces/storage/cblWhitening';
import { ServiceProvider } from '../services/service.provider';
import { ServiceLocator } from '../services/serviceLocator';
import { MemoryBlockStore } from './memoryBlockStore';

describe('MemoryBlockStore CBL Whitening - End-to-End Property Tests', () => {
  let initialized = false;

  const ensureInitialized = () => {
    if (!initialized) {
      initializeBrightChain();
      ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
      initialized = true;
    }
  };

  afterAll(() => {
    if (initialized) {
      ServiceProvider.resetInstance();
      initialized = false;
    }
  });

  describe('Property 9: Redundancy Block Inclusion', () => {
    it('should not include parity block IDs when FEC is disabled', async () => {
      ensureInitialized();
      const store = new MemoryBlockStore(BlockSize.Small);
      const cblData = new Uint8Array([1, 2, 3, 4, 5]);
      const options: CBLWhiteningOptions = {
        durabilityLevel: DurabilityLevel.Ephemeral,
      };

      const result = await store.storeCBLWithWhitening(cblData, options);
      const parsed = store.parseCBLMagnetUrl(result.magnetUrl);

      expect(parsed.block1ParityIds).toBeUndefined();
      expect(parsed.block2ParityIds).toBeUndefined();
      expect(result.block1ParityIds).toBeUndefined();
      expect(result.block2ParityIds).toBeUndefined();
    });
  });

  describe('Property 10: Encryption Flag Preservation', () => {
    it('should preserve encryption flag in magnet URL when encryption is enabled', async () => {
      ensureInitialized();
      const store = new MemoryBlockStore(BlockSize.Small);
      const cblData = new Uint8Array([1, 2, 3, 4, 5]);
      const options: CBLWhiteningOptions = {
        isEncrypted: true,
      };

      const result = await store.storeCBLWithWhitening(cblData, options);
      const parsed = store.parseCBLMagnetUrl(result.magnetUrl);

      expect(parsed.isEncrypted).toBe(true);
      expect(result.isEncrypted).toBe(true);
    });

    it('should not include encryption flag when encryption is disabled', async () => {
      ensureInitialized();
      const store = new MemoryBlockStore(BlockSize.Small);
      const cblData = new Uint8Array([1, 2, 3, 4, 5]);
      const options: CBLWhiteningOptions = {
        isEncrypted: false,
      };

      const result = await store.storeCBLWithWhitening(cblData, options);
      const parsed = store.parseCBLMagnetUrl(result.magnetUrl);

      expect(parsed.isEncrypted).toBe(false);
      expect(result.isEncrypted).toBe(false);
    });

    it('should maintain encryption flag consistency through round-trip operations', async () => {
      ensureInitialized();
      const store = new MemoryBlockStore(BlockSize.Small);
      const cblData = new Uint8Array([1, 2, 3, 4, 5]);

      // Test both true and false
      for (const encryptionEnabled of [true, false]) {
        const options: CBLWhiteningOptions = {
          isEncrypted: encryptionEnabled,
        };

        const storeResult = await store.storeCBLWithWhitening(cblData, options);
        const parsed = store.parseCBLMagnetUrl(storeResult.magnetUrl);
        const retrievedData = await store.retrieveCBL(
          parsed.blockId1,
          parsed.blockId2,
          parsed.block1ParityIds,
          parsed.block2ParityIds,
        );

        expect(storeResult.isEncrypted).toBe(encryptionEnabled);
        expect(parsed.isEncrypted).toBe(encryptionEnabled);
        expect(retrievedData).toEqual(cblData);
      }
    });
  });

  describe('Combined Property: Basic Integration', () => {
    it('should handle encryption flags correctly without FEC', async () => {
      ensureInitialized();
      const store = new MemoryBlockStore(BlockSize.Small);
      const cblData = new Uint8Array([1, 2, 3, 4, 5]);

      const options: CBLWhiteningOptions = {
        durabilityLevel: DurabilityLevel.Ephemeral,
        isEncrypted: true,
      };

      const result = await store.storeCBLWithWhitening(cblData, options);
      const parsed = store.parseCBLMagnetUrl(result.magnetUrl);

      // Verify no FEC flags
      expect(parsed.block1ParityIds).toBeUndefined();
      expect(parsed.block2ParityIds).toBeUndefined();
      expect(result.block1ParityIds).toBeUndefined();
      expect(result.block2ParityIds).toBeUndefined();

      // Verify encryption flags
      expect(parsed.isEncrypted).toBe(true);
      expect(result.isEncrypted).toBe(true);

      // Verify data can still be retrieved correctly
      const retrievedData = await store.retrieveCBL(
        parsed.blockId1,
        parsed.blockId2,
        parsed.block1ParityIds,
        parsed.block2ParityIds,
      );
      expect(retrievedData).toEqual(cblData);
    });
  });
});
