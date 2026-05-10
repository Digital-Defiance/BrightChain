import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Types of BrightChain-native canary providers that monitor platform activity
 * without requiring external network access.
 *
 * - 'login_activity': Monitors login frequency and patterns
 * - 'duress_code': Detects authentication using a pre-configured duress code
 * - 'file_access': Monitors file views, downloads, uploads, and sharing
 * - 'api_usage': Monitors API calls made by authenticated sessions
 * - 'vault_interaction': Monitors vault reads, creations, and destruction proof verifications
 */
export type NativeCanaryType =
  | 'login_activity'
  | 'duress_code'
  | 'file_access'
  | 'api_usage'
  | 'vault_interaction';

/**
 * Configuration for a BrightChain-native canary provider.
 *
 * Native canaries operate entirely within the platform's internal event system
 * and do not require external network access. Each type monitors a specific
 * category of platform activity and emits heartbeat signals based on
 * configurable thresholds and periods.
 */
export interface INativeCanaryConfigBase<TID extends PlatformID = string> {
  /** Unique identifier for this native canary configuration */
  id: TID;
  /** User who owns this native canary */
  userId: TID;
  /** Which native canary type this configuration represents */
  type: NativeCanaryType;
  /** Whether this native canary is enabled */
  isEnabled: boolean;
  /** For login_activity: minimum logins per period */
  loginThreshold?: number;
  /** For login_activity: period in milliseconds */
  loginPeriodMs?: number;
  /** For duress_code: the configured duress codes (encrypted at rest) */
  encryptedDuressCodes?: string[];
  /** For file_access: minimum file operations per period */
  fileAccessThreshold?: number;
  /** For file_access: period in milliseconds */
  fileAccessPeriodMs?: number;
  /** For api_usage: minimum API calls per period */
  apiUsageThreshold?: number;
  /** For api_usage: period in milliseconds */
  apiUsagePeriodMs?: number;
  /** For vault_interaction: minimum vault operations per period */
  vaultInteractionThreshold?: number;
  /** For vault_interaction: period in milliseconds */
  vaultInteractionPeriodMs?: number;
  /** Provider connection ID (for integration with health monitor) */
  connectionId?: TID;
  /** When this configuration was created */
  createdAt: Date | string;
  /** When this configuration was last updated */
  updatedAt: Date | string;
}

/**
 * Represents a platform event emitted by BrightChain's internal event system.
 * These events are consumed by native canary providers to evaluate user activity.
 */
export interface IPlatformEvent<TID extends PlatformID = string> {
  /** User who generated this event */
  userId: TID;
  /** Type of platform activity */
  type: 'login' | 'file_access' | 'api_call' | 'vault_interaction';
  /** When the event occurred */
  timestamp: Date;
  /** Optional additional event metadata */
  metadata?: Record<string, unknown>;
}
