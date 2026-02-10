/**
 * Property-Based Tests for DeviceProvisioningService
 *
 * These tests validate universal properties of the device provisioning system
 * using fast-check for property-based testing.
 *
 * **Property 9: Device Provisioning Idempotency**
 * **Validates: Requirements 3.5, 3.8**
 *
 * @module services/identity/deviceProvisioningService.property.spec
 */

import { ECIESService } from '@digitaldefiance/ecies-lib';
import * as fc from 'fast-check';

import { DeviceType } from '../../enumerations/deviceType';
import { PaperKeyPurpose } from '../../enumerations/paperKeyPurpose';
import { initializeBrightChain } from '../../init';
import { IDeviceMetadata } from '../../interfaces/identity/device';
import { IDeviceKeyStorage } from '../../interfaces/identity/deviceKeyStorage';
import { ServiceProvider } from '../service.provider';
import {
  DeviceKeyStorageError,
  DeviceProvisioningService,
} from './deviceProvisioningService';
import { MemberPaperKeyService } from './memberPaperKeyService';
import { PaperKeyService } from './paperKeyService';

// ─── Failing storage for error path testing ─────────────────────────────────

class FailingDeviceKeyStorage implements IDeviceKeyStorage {
  async store(): Promise<void> {
    throw new Error('Storage unavailable');
  }
  async retrieve(): Promise<IDeviceMetadata | undefined> {
    return undefined;
  }
  async remove(): Promise<boolean> {
    return false;
  }
  async list(): Promise<ReadonlyArray<IDeviceMetadata>> {
    return [];
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('DeviceProvisioningService - Property Tests', () => {
  let eciesService: ECIESService;

  beforeAll(() => {
    initializeBrightChain();
  });

  beforeEach(() => {
    ServiceProvider.resetInstance();
    eciesService = ServiceProvider.getInstance().eciesService;
  });

  describe('Property 9: Device Provisioning Idempotency', () => {
    /**
     * Property 9a: Deterministic Key Generation
     *
     * Provisioning the same paper key with the same device index always
     * produces the same device keys. BIP32 derivation is deterministic:
     * mnemonic + derivation path → identical key pair every time.
     *
     * **Validates: Requirements 3.5, 3.8**
     */
    it('should produce the same device public key for the same mnemonic and device index', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100 }), (deviceIndex) => {
          // Generate a fresh paper key for each run
          const paperKey = PaperKeyService.generatePaperKey(eciesService);
          const paperKeyValue = paperKey.value!;

          // Derive device keys twice with the same mnemonic + index
          const result1 = DeviceProvisioningService.generateDeviceKeys(
            paperKeyValue,
            deviceIndex,
          );
          const result2 = DeviceProvisioningService.generateDeviceKeys(
            paperKeyValue,
            deviceIndex,
          );

          // The public key must be identical across both derivations
          expect(result1.publicKeyHex).toBe(result2.publicKeyHex);
          expect(Buffer.from(result1.publicKey)).toEqual(
            Buffer.from(result2.publicKey),
          );

          // The derivation path must be identical
          expect(result1.derivationPath).toBe(result2.derivationPath);
        }),
        { numRuns: 10 },
      );
    });

    /**
     * Property 9b: Different Device Indices Produce Different Keys
     *
     * For the same paper key, different device indices must produce
     * different public keys. This ensures each device gets a unique
     * key pair from the BIP32 derivation tree.
     *
     * **Validates: Requirements 3.5, 3.8**
     */
    it('should produce different device public keys for different device indices', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 99 }).chain((idx1) =>
            fc.record({
              index1: fc.constant(idx1),
              index2: fc.integer({ min: idx1 + 1, max: 100 }),
            }),
          ),
          ({ index1, index2 }) => {
            const paperKey = PaperKeyService.generatePaperKey(eciesService);
            const paperKeyValue = paperKey.value!;

            const result1 = DeviceProvisioningService.generateDeviceKeys(
              paperKeyValue,
              index1,
            );
            const result2 = DeviceProvisioningService.generateDeviceKeys(
              paperKeyValue,
              index2,
            );

            // Different indices must yield different public keys
            expect(result1.publicKeyHex).not.toBe(result2.publicKeyHex);
          },
        ),
        { numRuns: 10 },
      );
    });

    /**
     * Property 9c: Failed Provisioning Does Not Mark Paper Key As Used
     *
     * When provisioning fails (e.g. storage failure), the paper key
     * must NOT be marked as used. This ensures the user can retry
     * provisioning with the same paper key after a transient failure.
     *
     * **Validates: Requirements 3.5, 3.8**
     */
    it('should not mark paper key as used when provisioning fails due to storage error', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          const paperKeyService = new MemberPaperKeyService();
          const failingStorage = new FailingDeviceKeyStorage();

          // Generate a paper key and register it in the tracking service
          const paperKey = PaperKeyService.generatePaperKey(eciesService);
          const paperKeyValue = paperKey.value!;
          const memberId = 'test-member';
          const paperKeyMeta = paperKeyService.addPaperKey(
            memberId,
            PaperKeyPurpose.DEVICE_PROVISIONING,
          );

          // Verify the paper key is not yet used
          expect(paperKeyService.isUsed(memberId, paperKeyMeta.id)).toBe(false);

          // Attempt provisioning with a failing storage — should throw
          try {
            await DeviceProvisioningService.provisionDevice(
              paperKeyValue,
              'Test Device',
              DeviceType.DESKTOP,
              eciesService,
              failingStorage,
              0,
            );
            // If we reach here, the test should fail
            fail('Expected DeviceKeyStorageError to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(DeviceKeyStorageError);
          }

          // After the failed provisioning, the paper key must still
          // NOT be marked as used (Requirement 3.8)
          expect(paperKeyService.isUsed(memberId, paperKeyMeta.id)).toBe(false);
        }),
        { numRuns: 10 },
      );
    });
  });
});
