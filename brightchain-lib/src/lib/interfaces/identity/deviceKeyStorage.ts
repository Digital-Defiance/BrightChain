/**
 * Device key storage interface for the BrightChain identity system.
 *
 * Provides a platform-independent abstraction for storing and retrieving
 * device keys. Implementations can target Node.js file system, browser
 * IndexedDB, React Native secure storage, or any other platform-specific
 * secure storage mechanism.
 *
 * This interface is generic over TId to support both string-based DTOs
 * (frontend) and GuidV4Buffer (backend) usage patterns.
 *
 * Requirements: 3.4
 */

import { IDeviceMetadata } from './device';

/**
 * Platform-independent interface for secure device key storage.
 *
 * Implementations must ensure that private key material is stored
 * securely (encrypted at rest) and that retrieval requires appropriate
 * authentication or authorization.
 *
 * @example
 * ```typescript
 * // Node.js implementation
 * class NodeDeviceKeyStorage implements IDeviceKeyStorage {
 *   async store(deviceMetadata: IDeviceMetadata): Promise<void> {
 *     // Write encrypted key data to disk
 *   }
 *   async retrieve(deviceId: string): Promise<IDeviceMetadata | undefined> {
 *     // Read and decrypt key data from disk
 *   }
 *   async remove(deviceId: string): Promise<boolean> {
 *     // Delete key data from disk
 *   }
 *   async list(memberId: string): Promise<ReadonlyArray<IDeviceMetadata>> {
 *     // List all device metadata for a member
 *   }
 * }
 * ```
 */
export interface IDeviceKeyStorage<TId = string> {
  /**
   * Store device metadata (including public key reference) in secure storage.
   *
   * @param deviceMetadata - The device metadata to persist
   * @throws If storage fails (e.g. disk full, permission denied)
   */
  store(deviceMetadata: IDeviceMetadata<TId>): Promise<void>;

  /**
   * Retrieve device metadata by device ID.
   *
   * @param deviceId - The unique device identifier
   * @returns The device metadata, or `undefined` if not found
   */
  retrieve(deviceId: TId): Promise<IDeviceMetadata<TId> | undefined>;

  /**
   * Remove device metadata from storage.
   *
   * @param deviceId - The unique device identifier to remove
   * @returns `true` if the device was found and removed, `false` otherwise
   */
  remove(deviceId: TId): Promise<boolean>;

  /**
   * List all stored device metadata for a given member.
   *
   * @param memberId - The member whose devices to list
   * @returns Array of device metadata records
   */
  list(memberId: TId): Promise<ReadonlyArray<IDeviceMetadata<TId>>>;
}
