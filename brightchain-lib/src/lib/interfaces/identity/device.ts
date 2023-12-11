/**
 * Device metadata interfaces for the BrightChain identity system.
 *
 * Each provisioned device is tracked with metadata that includes
 * the device name, type, public key, and lifecycle timestamps.
 * This enables audit logging of device provisioning events and
 * supports device revocation and management.
 *
 * All data interfaces are generic over TId so the same interface
 * can serve as a DTO for React clients (string) and as the concrete
 * type used inside Node services (GuidV4Buffer / Uint8Array).
 *
 * Requirements: 3.7
 */

import { DeviceType } from '../../enumerations/deviceType';

/**
 * Metadata tracked for each provisioned device throughout its lifecycle.
 *
 * @remarks
 * Every device provisioned via a paper key or existing device has an
 * associated metadata record that tracks its identity, type, public key,
 * and lifecycle events. This enables audit logging per Requirement 3.7
 * and supports device management (listing, renaming, revocation).
 *
 * @example
 * ```typescript
 * const device: IDeviceMetadata = {
 *   id: 'dev-abc-123',
 *   memberId: 'member-xyz',
 *   deviceName: 'Work Laptop',
 *   deviceType: DeviceType.DESKTOP,
 *   publicKey: '04abcdef...',
 *   provisionedAt: new Date(),
 *   lastSeenAt: new Date(),
 * };
 * ```
 */
export interface IDeviceMetadata<TId = string> {
  /** Unique identifier for this device record */
  id: TId;

  /** Identifier of the member who owns this device */
  memberId: TId;

  /** Human-readable name assigned to the device (e.g. "Work Laptop") */
  deviceName: string;

  /** Category of the device */
  deviceType: DeviceType;

  /** SECP256k1 public key generated for this device (hex-encoded) */
  publicKey: string;

  /** Timestamp when the device was provisioned */
  provisionedAt: Date;

  /** Timestamp when the device last communicated with the network */
  lastSeenAt: Date;

  /**
   * Timestamp when the device was revoked
   * @remarks Once revoked, the device's keys are no longer trusted
   */
  revokedAt?: Date;
}
