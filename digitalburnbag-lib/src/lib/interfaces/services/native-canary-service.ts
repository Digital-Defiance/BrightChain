import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { HeartbeatSignalType } from '../canary-provider/canary-provider-adapter';
import type {
  INativeCanaryConfigBase,
  NativeCanaryType,
  IPlatformEvent,
} from '../canary-provider/native-canary-config';

/**
 * Parameters for configuring a new native canary.
 */
export interface IConfigureNativeCanaryParams<
  TID extends PlatformID = string,
> {
  /** User configuring the native canary */
  userId: TID;
  /** Which native canary type to configure */
  type: NativeCanaryType;
  /** Whether this native canary is enabled */
  isEnabled: boolean;
  /** For login_activity: minimum logins per period */
  loginThreshold?: number;
  /** For login_activity: period in milliseconds */
  loginPeriodMs?: number;
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
}

/**
 * Service interface for monitoring BrightChain platform activity
 * and emitting heartbeat signals without external network dependencies.
 *
 * Native canaries operate entirely within the platform's internal event system,
 * monitoring logins, duress codes, file access, API usage, and vault interactions.
 */
export interface INativeCanaryService<TID extends PlatformID = string> {
  /** Configure a native canary for a user */
  configure(
    params: IConfigureNativeCanaryParams<TID>,
  ): Promise<INativeCanaryConfigBase<TID>>;

  /** Update native canary configuration */
  updateConfig(
    configId: TID,
    updates: Partial<INativeCanaryConfigBase<TID>>,
  ): Promise<INativeCanaryConfigBase<TID>>;

  /** Get all native canary configs for a user */
  getConfigs(userId: TID): Promise<INativeCanaryConfigBase<TID>[]>;

  /** Handle a platform event (login, file access, etc.) */
  onPlatformEvent(event: IPlatformEvent<TID>): Promise<void>;

  /** Handle duress code authentication (IMMEDIATE signal) */
  onDuressCodeLogin(userId: TID, duressCode: string): Promise<void>;

  /** Evaluate native canary status (called on schedule) */
  evaluateStatus(configId: TID): Promise<HeartbeatSignalType>;

  /** Set duress codes for a user (encrypted at rest) */
  setDuressCodes(userId: TID, codes: string[]): Promise<void>;

  /** Validate that a code is a duress code (during auth) */
  isDuressCode(userId: TID, code: string): Promise<boolean>;
}
