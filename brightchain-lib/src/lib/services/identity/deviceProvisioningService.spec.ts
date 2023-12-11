/**
 * Unit tests for DeviceProvisioningService.
 *
 * Validates Requirements 3.1, 3.2, 3.3, 3.4
 */

import { ECIESService } from '@digitaldefiance/ecies-lib';

import { DeviceType } from '../../enumerations/deviceType';
import { initializeBrightChain } from '../../init';
import { IDeviceMetadata } from '../../interfaces/identity/device';
import { IDeviceKeyStorage } from '../../interfaces/identity/deviceKeyStorage';
import { ServiceProvider } from '../service.provider';
import {
  DeviceKeyGenerationError,
  DeviceKeyStorageError,
  DeviceProvisioningService,
  InvalidPaperKeyError,
} from './deviceProvisioningService';
import { PaperKeyService } from './paperKeyService';

// ─── In-memory storage for testing ──────────────────────────────────────────

class InMemoryDeviceKeyStorage implements IDeviceKeyStorage {
  private readonly devices = new Map<string, IDeviceMetadata>();

  async store(deviceMetadata: IDeviceMetadata): Promise<void> {
    this.devices.set(deviceMetadata.id, { ...deviceMetadata });
  }

  async retrieve(deviceId: string): Promise<IDeviceMetadata | undefined> {
    const device = this.devices.get(deviceId);
    return device ? { ...device } : undefined;
  }

  async remove(deviceId: string): Promise<boolean> {
    return this.devices.delete(deviceId);
  }

  async list(memberId: string): Promise<ReadonlyArray<IDeviceMetadata>> {
    return [...this.devices.values()].filter((d) => d.memberId === memberId);
  }

  get size(): number {
    return this.devices.size;
  }
}

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

describe('DeviceProvisioningService', () => {
  let eciesService: ECIESService;
  let storage: InMemoryDeviceKeyStorage;
  let validPaperKey: string;

  beforeAll(() => {
    initializeBrightChain();
  });

  beforeEach(() => {
    ServiceProvider.resetInstance();
    eciesService = ServiceProvider.getInstance().eciesService;
    storage = new InMemoryDeviceKeyStorage();
    const secureKey = PaperKeyService.generatePaperKey(eciesService);
    validPaperKey = secureKey.value!;
  });

  describe('provisionDevice', () => {
    it('should provision a device with valid paper key', async () => {
      const result = await DeviceProvisioningService.provisionDevice(
        validPaperKey,
        'Test Laptop',
        DeviceType.DESKTOP,
        eciesService,
        storage,
        0,
      );

      expect(result.deviceMetadata).toBeDefined();
      expect(result.deviceMetadata.deviceName).toBe('Test Laptop');
      expect(result.deviceMetadata.deviceType).toBe(DeviceType.DESKTOP);
      expect(result.deviceMetadata.publicKey).toBeDefined();
      expect(result.deviceMetadata.publicKey.length).toBeGreaterThan(0);
      expect(result.member).toBeDefined();
      expect(result.member.publicKey).toBeDefined();
      expect(result.deviceKeys).toBeDefined();
    });

    it('should store device metadata in storage', async () => {
      const result = await DeviceProvisioningService.provisionDevice(
        validPaperKey,
        'My Phone',
        DeviceType.MOBILE,
        eciesService,
        storage,
        0,
      );

      const stored = await storage.retrieve(result.deviceMetadata.id);
      expect(stored).toBeDefined();
      expect(stored!.deviceName).toBe('My Phone');
      expect(stored!.deviceType).toBe(DeviceType.MOBILE);
    });

    it('should set provisionedAt and lastSeenAt timestamps', async () => {
      const before = new Date();
      const result = await DeviceProvisioningService.provisionDevice(
        validPaperKey,
        'Browser',
        DeviceType.WEB,
        eciesService,
        storage,
        0,
      );
      const after = new Date();

      const meta = result.deviceMetadata;
      expect(meta.provisionedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(meta.provisionedAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(meta.lastSeenAt.getTime()).toEqual(meta.provisionedAt.getTime());
    });

    it('should generate a unique device ID', async () => {
      const result1 = await DeviceProvisioningService.provisionDevice(
        validPaperKey,
        'Device 1',
        DeviceType.DESKTOP,
        eciesService,
        storage,
        0,
      );
      const result2 = await DeviceProvisioningService.provisionDevice(
        validPaperKey,
        'Device 2',
        DeviceType.MOBILE,
        eciesService,
        storage,
        1,
      );

      expect(result1.deviceMetadata.id).not.toBe(result2.deviceMetadata.id);
    });

    it('should recover the correct member from paper key', async () => {
      const directMember = PaperKeyService.recoverFromPaperKey(
        validPaperKey,
        eciesService,
      );

      const result = await DeviceProvisioningService.provisionDevice(
        validPaperKey,
        'Laptop',
        DeviceType.DESKTOP,
        eciesService,
        storage,
        0,
      );

      expect(Buffer.from(result.member.publicKey)).toEqual(
        Buffer.from(directMember.publicKey),
      );
    });

    it('should throw InvalidPaperKeyError for invalid paper key', async () => {
      await expect(
        DeviceProvisioningService.provisionDevice(
          'invalid mnemonic words here',
          'Device',
          DeviceType.DESKTOP,
          eciesService,
          storage,
          0,
        ),
      ).rejects.toThrow(InvalidPaperKeyError);
    });

    it('should throw InvalidPaperKeyError for empty paper key', async () => {
      await expect(
        DeviceProvisioningService.provisionDevice(
          '',
          'Device',
          DeviceType.DESKTOP,
          eciesService,
          storage,
          0,
        ),
      ).rejects.toThrow(InvalidPaperKeyError);
    });

    it('should throw DeviceKeyStorageError when storage fails', async () => {
      const failingStorage = new FailingDeviceKeyStorage();

      await expect(
        DeviceProvisioningService.provisionDevice(
          validPaperKey,
          'Device',
          DeviceType.DESKTOP,
          eciesService,
          failingStorage,
          0,
        ),
      ).rejects.toThrow(DeviceKeyStorageError);
    });

    it('should not store device metadata when storage fails', async () => {
      const failingStorage = new FailingDeviceKeyStorage();

      try {
        await DeviceProvisioningService.provisionDevice(
          validPaperKey,
          'Device',
          DeviceType.DESKTOP,
          eciesService,
          failingStorage,
          0,
        );
      } catch {
        // Expected to throw
      }

      // The in-memory storage should have nothing
      expect(storage.size).toBe(0);
    });

    it('should support all device types', async () => {
      for (const deviceType of [
        DeviceType.DESKTOP,
        DeviceType.MOBILE,
        DeviceType.WEB,
      ]) {
        const result = await DeviceProvisioningService.provisionDevice(
          validPaperKey,
          `Device-${deviceType}`,
          deviceType,
          eciesService,
          storage,
          Object.values(DeviceType).indexOf(deviceType),
        );
        expect(result.deviceMetadata.deviceType).toBe(deviceType);
      }
    });
  });

  describe('generateDeviceKeys', () => {
    it('should generate a valid public key', () => {
      const result = DeviceProvisioningService.generateDeviceKeys(
        validPaperKey,
        0,
      );

      expect(result.publicKey).toBeDefined();
      // Compressed SECP256k1 public key is 33 bytes
      expect(result.publicKey.length).toBe(33);
      // Compressed keys start with 0x02 or 0x03
      expect([0x02, 0x03]).toContain(result.publicKey[0]);
    });

    it('should generate a hex-encoded public key', () => {
      const result = DeviceProvisioningService.generateDeviceKeys(
        validPaperKey,
        0,
      );

      expect(result.publicKeyHex).toBeDefined();
      // 33 bytes = 66 hex characters
      expect(result.publicKeyHex.length).toBe(66);
      expect(result.publicKeyHex).toMatch(/^[0-9a-f]+$/);
    });

    it('should include the derivation path', () => {
      const result = DeviceProvisioningService.generateDeviceKeys(
        validPaperKey,
        0,
      );

      expect(result.derivationPath).toBe("m/44'/60'/0'/1/0");
    });

    it('should include the device index', () => {
      const result = DeviceProvisioningService.generateDeviceKeys(
        validPaperKey,
        5,
      );

      expect(result.deviceIndex).toBe(5);
      expect(result.derivationPath).toBe("m/44'/60'/0'/1/5");
    });

    it('should produce deterministic keys from the same mnemonic and index', () => {
      const result1 = DeviceProvisioningService.generateDeviceKeys(
        validPaperKey,
        0,
      );
      const result2 = DeviceProvisioningService.generateDeviceKeys(
        validPaperKey,
        0,
      );

      expect(result1.publicKeyHex).toBe(result2.publicKeyHex);
      expect(Buffer.from(result1.publicKey)).toEqual(
        Buffer.from(result2.publicKey),
      );
    });

    it('should produce different keys for different device indices', () => {
      const result0 = DeviceProvisioningService.generateDeviceKeys(
        validPaperKey,
        0,
      );
      const result1 = DeviceProvisioningService.generateDeviceKeys(
        validPaperKey,
        1,
      );

      expect(result0.publicKeyHex).not.toBe(result1.publicKeyHex);
    });

    it('should produce different keys for different mnemonics', () => {
      const otherKey = PaperKeyService.generatePaperKey(eciesService);
      const result1 = DeviceProvisioningService.generateDeviceKeys(
        validPaperKey,
        0,
      );
      const result2 = DeviceProvisioningService.generateDeviceKeys(
        otherKey.value!,
        0,
      );

      expect(result1.publicKeyHex).not.toBe(result2.publicKeyHex);
    });

    it('should throw DeviceKeyGenerationError for negative index', () => {
      expect(() =>
        DeviceProvisioningService.generateDeviceKeys(validPaperKey, -1),
      ).toThrow(DeviceKeyGenerationError);
    });

    it('should throw DeviceKeyGenerationError for non-integer index', () => {
      expect(() =>
        DeviceProvisioningService.generateDeviceKeys(validPaperKey, 1.5),
      ).toThrow(DeviceKeyGenerationError);
    });

    it('should throw DeviceKeyGenerationError for invalid mnemonic', () => {
      expect(() =>
        DeviceProvisioningService.generateDeviceKeys('not a valid mnemonic', 0),
      ).toThrow(DeviceKeyGenerationError);
    });
  });

  describe('storeDeviceKeys', () => {
    it('should store device metadata successfully', async () => {
      const metadata: IDeviceMetadata = {
        id: 'test-device-id',
        memberId: 'test-member-id',
        deviceName: 'Test Device',
        deviceType: DeviceType.DESKTOP,
        publicKey: 'abcdef1234567890',
        provisionedAt: new Date(),
        lastSeenAt: new Date(),
      };

      await DeviceProvisioningService.storeDeviceKeys(metadata, storage);

      const stored = await storage.retrieve('test-device-id');
      expect(stored).toBeDefined();
      expect(stored!.deviceName).toBe('Test Device');
    });

    it('should throw DeviceKeyStorageError when storage fails', async () => {
      const failingStorage = new FailingDeviceKeyStorage();
      const metadata: IDeviceMetadata = {
        id: 'test-device-id',
        memberId: 'test-member-id',
        deviceName: 'Test Device',
        deviceType: DeviceType.DESKTOP,
        publicKey: 'abcdef1234567890',
        provisionedAt: new Date(),
        lastSeenAt: new Date(),
      };

      await expect(
        DeviceProvisioningService.storeDeviceKeys(metadata, failingStorage),
      ).rejects.toThrow(DeviceKeyStorageError);
    });

    it('should include device name in error message on failure', async () => {
      const failingStorage = new FailingDeviceKeyStorage();
      const metadata: IDeviceMetadata = {
        id: 'test-id',
        memberId: 'test-member',
        deviceName: 'My Special Device',
        deviceType: DeviceType.MOBILE,
        publicKey: 'abc',
        provisionedAt: new Date(),
        lastSeenAt: new Date(),
      };

      await expect(
        DeviceProvisioningService.storeDeviceKeys(metadata, failingStorage),
      ).rejects.toThrow(/My Special Device/);
    });
  });

  describe('InMemoryDeviceKeyStorage (test helper)', () => {
    it('should list devices by member ID', async () => {
      const meta1: IDeviceMetadata = {
        id: 'dev-1',
        memberId: 'member-A',
        deviceName: 'Device 1',
        deviceType: DeviceType.DESKTOP,
        publicKey: 'key1',
        provisionedAt: new Date(),
        lastSeenAt: new Date(),
      };
      const meta2: IDeviceMetadata = {
        id: 'dev-2',
        memberId: 'member-A',
        deviceName: 'Device 2',
        deviceType: DeviceType.MOBILE,
        publicKey: 'key2',
        provisionedAt: new Date(),
        lastSeenAt: new Date(),
      };
      const meta3: IDeviceMetadata = {
        id: 'dev-3',
        memberId: 'member-B',
        deviceName: 'Device 3',
        deviceType: DeviceType.WEB,
        publicKey: 'key3',
        provisionedAt: new Date(),
        lastSeenAt: new Date(),
      };

      await storage.store(meta1);
      await storage.store(meta2);
      await storage.store(meta3);

      const memberADevices = await storage.list('member-A');
      expect(memberADevices).toHaveLength(2);

      const memberBDevices = await storage.list('member-B');
      expect(memberBDevices).toHaveLength(1);
    });

    it('should remove a device', async () => {
      const meta: IDeviceMetadata = {
        id: 'dev-to-remove',
        memberId: 'member-X',
        deviceName: 'Removable',
        deviceType: DeviceType.DESKTOP,
        publicKey: 'key',
        provisionedAt: new Date(),
        lastSeenAt: new Date(),
      };

      await storage.store(meta);
      expect(await storage.retrieve('dev-to-remove')).toBeDefined();

      const removed = await storage.remove('dev-to-remove');
      expect(removed).toBe(true);
      expect(await storage.retrieve('dev-to-remove')).toBeUndefined();
    });

    it('should return false when removing non-existent device', async () => {
      const removed = await storage.remove('nonexistent');
      expect(removed).toBe(false);
    });
  });
});
