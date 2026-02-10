/**
 * Device Provisioning Service for the BrightChain identity system.
 *
 * Handles the complete device provisioning workflow: validating a paper key,
 * recovering the member identity, generating device-specific keys via BIP32
 * hierarchical deterministic derivation, and persisting device metadata
 * through a platform-independent storage interface.
 *
 * Device keys are derived using the BIP32 path `m/44'/60'/0'/1/<deviceIndex>`
 * where `deviceIndex` is a monotonically increasing counter per member. This
 * keeps device keys deterministic (reproducible from the same mnemonic) while
 * ensuring each device gets a unique key pair.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import {
  ECIESService,
  Member,
  PlatformID,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';
import { v4 as uuidv4 } from 'uuid';

import { DeviceType } from '../../enumerations/deviceType';
import { IDeviceMetadata } from '../../interfaces/identity/device';
import { IDeviceKeyStorage } from '../../interfaces/identity/deviceKeyStorage';
import { PaperKeyService } from './paperKeyService';

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * BIP32 derivation path prefix for device keys.
 *
 * Uses BIP44 structure: `m / purpose' / coin_type' / account' / change / index`
 * - purpose = 44 (BIP44)
 * - coin_type = 60 (Ethereum, reused for BrightChain compatibility)
 * - account = 0 (default account)
 * - change = 1 (internal chain — used for device keys to avoid collision
 *               with external wallet addresses on change=0)
 *
 * The final `/<index>` segment is appended per device.
 */
const DEVICE_KEY_DERIVATION_PREFIX = "m/44'/60'/0'/1";

// ─── Error classes ──────────────────────────────────────────────────────────

/**
 * Error thrown when a paper key fails validation during device provisioning.
 */
export class InvalidPaperKeyError extends Error {
  constructor(
    message = 'Invalid paper key: not a valid 24-word BIP39 mnemonic',
  ) {
    super(message);
    this.name = 'InvalidPaperKeyError';
  }
}

/**
 * Error thrown when device key generation fails.
 */
export class DeviceKeyGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeviceKeyGenerationError';
  }
}

/**
 * Error thrown when device key storage fails.
 */
export class DeviceKeyStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeviceKeyStorageError';
  }
}

// ─── Result types ───────────────────────────────────────────────────────────

/**
 * Result of device key generation containing the derived key pair
 * and the public key in hex format for storage in device metadata.
 */
export interface IDeviceKeyResult {
  /** Compressed SECP256k1 public key (33 bytes) */
  publicKey: Uint8Array;

  /** Compressed SECP256k1 public key as hex string */
  publicKeyHex: string;

  /** BIP32 derivation path used to derive this key */
  derivationPath: string;

  /** The device index used in the derivation path */
  deviceIndex: number;
}

/**
 * Full result of a successful device provisioning operation.
 */
export interface IProvisioningResult<TID extends PlatformID = Uint8Array> {
  /** The provisioned device metadata */
  deviceMetadata: IDeviceMetadata;

  /** The recovered member identity */
  member: Member<TID>;

  /** The derived device key information */
  deviceKeys: IDeviceKeyResult;
}

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Service for provisioning new devices on a BrightChain member account.
 *
 * The provisioning flow:
 * 1. Validate the paper key (Requirement 3.1)
 * 2. Recover the member identity from the paper key (Requirement 3.2)
 * 3. Generate device-specific keys via BIP32 derivation (Requirement 3.3)
 * 4. Store device metadata in platform-independent storage (Requirement 3.4)
 *
 * All methods are static — the service is stateless and safe to call
 * from any context (browser or Node.js).
 *
 * @example
 * ```typescript
 * const eciesService = ServiceProvider.getInstance().eciesService;
 * const storage = new InMemoryDeviceKeyStorage();
 *
 * const result = await DeviceProvisioningService.provisionDevice(
 *   'abandon abandon abandon ... about',
 *   'Work Laptop',
 *   DeviceType.DESKTOP,
 *   eciesService,
 *   storage,
 *   0,
 * );
 *
 * console.log(result.deviceMetadata.publicKey); // hex-encoded public key
 * console.log(result.member.name);              // 'Recovered User'
 * ```
 */
export class DeviceProvisioningService {
  /**
   * Provision a new device using a paper key.
   *
   * Performs the complete provisioning workflow: validates the paper key,
   * recovers the member identity, generates device-specific keys, and
   * stores the device metadata.
   *
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
   *
   * @param paperKey     - The 24-word BIP39 mnemonic paper key
   * @param deviceName   - Human-readable name for the device (e.g. "Work Laptop")
   * @param deviceType   - Category of the device (desktop, mobile, web)
   * @param eciesService - The ECIES service instance for key operations
   * @param storage      - Platform-independent device key storage
   * @param deviceIndex  - The BIP32 child index for this device (0-based)
   * @returns A promise resolving to the full provisioning result
   * @throws {InvalidPaperKeyError} If the paper key is invalid
   * @throws {DeviceKeyGenerationError} If key derivation fails
   * @throws {DeviceKeyStorageError} If storage fails
   */
  static async provisionDevice<TID extends PlatformID = Uint8Array>(
    paperKey: string,
    deviceName: string,
    deviceType: DeviceType,
    eciesService: ECIESService<TID>,
    storage: IDeviceKeyStorage,
    deviceIndex: number,
  ): Promise<IProvisioningResult<TID>> {
    // Requirement 3.1: Validate paper key before provisioning
    if (!PaperKeyService.validatePaperKey(paperKey, eciesService)) {
      throw new InvalidPaperKeyError();
    }

    // Requirement 3.2: Recover member identity from paper key
    const member = PaperKeyService.recoverFromPaperKey(paperKey, eciesService);

    // Requirement 3.3: Generate device-specific keys
    const deviceKeys = DeviceProvisioningService.generateDeviceKeys(
      paperKey,
      deviceIndex,
    );

    // Build device metadata
    const now = new Date();
    const deviceMetadata: IDeviceMetadata = {
      id: uuidv4(),
      memberId: uint8ArrayToHex(member.idBytes),
      deviceName,
      deviceType,
      publicKey: deviceKeys.publicKeyHex,
      provisionedAt: now,
      lastSeenAt: now,
    };

    // Requirement 3.4: Store device keys in local secure storage
    await DeviceProvisioningService.storeDeviceKeys(deviceMetadata, storage);

    return {
      deviceMetadata,
      member,
      deviceKeys,
    };
  }

  /**
   * Generate device-specific keys from a paper key mnemonic using BIP32
   * hierarchical deterministic derivation.
   *
   * The derivation path is `m/44'/60'/0'/1/<deviceIndex>` where the
   * `change=1` branch is reserved for device keys (as opposed to
   * `change=0` which is used for external wallet addresses).
   *
   * **Validates: Requirement 3.3** — Generate device-specific keys derived
   * from member identity
   *
   * @param paperKey    - The 24-word BIP39 mnemonic
   * @param deviceIndex - The child index for this device (0-based, non-hardened)
   * @returns The derived device key result
   * @throws {DeviceKeyGenerationError} If BIP32 derivation fails
   */
  static generateDeviceKeys(
    paperKey: string,
    deviceIndex: number,
  ): IDeviceKeyResult {
    if (!Number.isInteger(deviceIndex) || deviceIndex < 0) {
      throw new DeviceKeyGenerationError(
        `Device index must be a non-negative integer, got ${deviceIndex}`,
      );
    }

    const derivationPath = `${DEVICE_KEY_DERIVATION_PREFIX}/${deviceIndex}`;

    try {
      // Convert mnemonic → 64-byte seed
      const seed = mnemonicToSeedSync(paperKey);

      // Create HD master key from seed
      const masterKey = HDKey.fromMasterSeed(seed);

      // Derive the device-specific child key
      const deviceKey = masterKey.derive(derivationPath);

      const publicKey = deviceKey.publicKey;
      if (!publicKey) {
        throw new DeviceKeyGenerationError(
          'BIP32 derivation produced no public key',
        );
      }

      return {
        publicKey: new Uint8Array(publicKey),
        publicKeyHex: uint8ArrayToHex(new Uint8Array(publicKey)),
        derivationPath,
        deviceIndex,
      };
    } catch (error) {
      if (error instanceof DeviceKeyGenerationError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new DeviceKeyGenerationError(
        `Failed to derive device keys at path ${derivationPath}: ${message}`,
      );
    }
  }

  /**
   * Store device metadata in the provided platform-independent storage.
   *
   * This method wraps the storage call with error handling to produce
   * a consistent {@link DeviceKeyStorageError} on failure.
   *
   * **Validates: Requirement 3.4** — Store device keys in local secure storage
   *
   * @param deviceMetadata - The device metadata to persist
   * @param storage        - The platform-independent storage implementation
   * @throws {DeviceKeyStorageError} If the storage operation fails
   */
  static async storeDeviceKeys(
    deviceMetadata: IDeviceMetadata,
    storage: IDeviceKeyStorage,
  ): Promise<void> {
    try {
      await storage.store(deviceMetadata);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new DeviceKeyStorageError(
        `Failed to store device keys for device "${deviceMetadata.deviceName}": ${message}`,
      );
    }
  }
}
