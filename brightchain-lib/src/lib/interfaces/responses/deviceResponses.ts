/**
 * Device provisioning API response interfaces.
 *
 * These are the data-shape types that live in brightchain-lib so both
 * frontend and backend can consume them. The Express-specific wrappers
 * (extending Response) live in brightchain-api-lib.
 *
 * Generic parameters:
 *   TId – identifier type (string on frontend, GuidV4Buffer on backend)
 *
 * Requirements: 3.1-3.8
 */

import { IApiEnvelope } from '../communication';
import { IDeviceMetadata } from '../identity/device';

// ─── Device provisioning responses ──────────────────────────────────────────

export type IProvisionDeviceResponse<TId = string> = IApiEnvelope<{
  device: IDeviceMetadata<TId>;
  publicKeyHex: string;
  derivationPath: string;
}>;

export type IListDevicesResponse<TId = string> = IApiEnvelope<
  ReadonlyArray<IDeviceMetadata<TId>>
>;

export type IRevokeDeviceResponse = IApiEnvelope<{
  revoked: boolean;
  revokedAt: string;
}>;

export type IRenameDeviceResponse<TId = string> = IApiEnvelope<
  IDeviceMetadata<TId>
>;
