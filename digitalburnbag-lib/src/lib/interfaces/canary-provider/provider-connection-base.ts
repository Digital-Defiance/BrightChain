import { PlatformID } from '@digitaldefiance/ecies-lib';
import {
  HeartbeatSignalType,
  IAbsenceDetectionConfig,
  IDuressDetectionConfig,
} from './canary-provider-adapter';
import { IFailurePolicyConfig } from './failure-policy';

/**
 * Extended provider connection interface shared between frontend and backend.
 *
 * This extends the concept of a user's connection to a provider with
 * failure tracking, absence/duress configuration, and pause state fields
 * required by the Canary Provider System.
 *
 * NOTE: The original `IProviderConnectionBase` in provider-registration.ts
 * uses the `ProviderConnectionStatus` enum. This interface uses a string
 * union for status to align with the design document's richer model.
 */
export interface IProviderConnectionExtended<TID extends PlatformID = string> {
  /** Connection ID */
  id: TID;
  /** User ID */
  userId: TID;
  /** Provider ID */
  providerId: TID;
  /** Current connection status */
  status: 'connected' | 'expired' | 'error' | 'paused' | 'pending';
  /** User's ID on the provider platform */
  providerUserId?: string;
  /** User's username/handle on the provider platform */
  providerUsername?: string;
  /** When the connection was established */
  connectedAt?: Date | string;
  /** When the last heartbeat check was performed */
  lastCheckedAt?: Date | string;
  /** Signal type from the most recent heartbeat check */
  lastCheckSignalType?: HeartbeatSignalType;
  /** When user activity was last detected */
  lastActivityAt?: Date | string;
  /** Whether this connection is enabled for canary checks */
  isEnabled: boolean;
  /** Custom check interval override (milliseconds) */
  checkIntervalMs?: number;

  /** Number of consecutive CHECK_FAILED results */
  consecutiveFailures: number;
  /** Failure policy configuration for this connection */
  failurePolicyConfig: IFailurePolicyConfig;

  /** Absence detection configuration */
  absenceConfig?: IAbsenceDetectionConfig;
  /** Duress detection configuration */
  duressConfig?: IDuressDetectionConfig;

  /** Whether checks are currently paused */
  isPaused: boolean;
  /** Reason for pausing checks */
  pauseReason?: string;

  /** Created timestamp */
  createdAt: Date | string;
  /** Updated timestamp */
  updatedAt: Date | string;
}
