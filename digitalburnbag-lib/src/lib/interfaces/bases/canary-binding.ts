import { PlatformID } from '@digitaldefiance/ecies-lib';
import { CanaryCondition } from '../../enumerations/canary-condition';
import { CanaryProvider } from '../../enumerations/canary-provider';
import { ProtocolAction } from '../../enumerations/protocol-action';
import type {
  IAbsenceDetectionConfig,
  IDuressDetectionConfig,
} from '../canary-provider/canary-provider-adapter';

/**
 * Association between a canary protocol and files/folders.
 * Specifies the condition, provider, and action to execute when triggered.
 */
export interface ICanaryBindingBase<TID extends PlatformID> {
  id: TID;
  /** Reference to the parent canary protocol */
  protocolId: TID;
  /** Vault containers bound to this canary action */
  vaultContainerIds: TID[];
  /** Files bound to this canary action */
  fileIds: TID[];
  /** Folders bound to this canary action */
  folderIds: TID[];
  /** The action to execute when triggered */
  protocolAction: ProtocolAction;
  /** Condition that triggers this binding */
  canaryCondition: CanaryCondition;

  /**
   * Provider that evaluates the condition.
   * Can be a well-known CanaryProvider enum value or a custom provider ID.
   */
  canaryProvider: CanaryProvider | string;

  /**
   * Custom provider configuration ID (for user-defined providers).
   * If set, this overrides canaryProvider and uses the custom config.
   */
  customProviderId?: TID;

  /**
   * Absence detection configuration for this binding.
   * Defines the threshold for dead man's switch behavior.
   */
  absenceConfig?: IAbsenceDetectionConfig;

  /**
   * Duress detection configuration for this binding.
   * Defines keywords, patterns, and activity types that indicate duress.
   */
  duressConfig?: IDuressDetectionConfig;

  /**
   * Provider credentials ID for this binding.
   * References the user's stored credentials for the provider.
   */
  providerCredentialsId?: TID;

  /**
   * Check interval in milliseconds.
   * How often to poll the provider for activity.
   * If not set, uses the provider's recommended interval.
   */
  checkIntervalMs?: number;

  /**
   * Whether this binding is currently active.
   * Inactive bindings are not checked.
   */
  isActive: boolean;

  /**
   * Last time this binding was checked.
   */
  lastCheckedAt?: Date | string;

  /**
   * Last time activity was detected for this binding.
   */
  lastActivityAt?: Date | string;

  /**
   * Number of consecutive absence checks (no activity found).
   * Used for absence threshold evaluation.
   */
  consecutiveAbsenceCount: number;

  /**
   * Whether warnings have been sent for impending absence trigger.
   */
  warningsSent: boolean;

  /** Recipient list for distribution actions */
  recipientListId?: TID;
  /**
   * Pre-positioned key wrapping entry IDs for this binding's files.
   * When set, the canary trigger uses these wrapped keys instead of
   * going through the custodial decrypt path. Each entry maps a file's
   * symmetric key wrapped under a recipient's public key.
   */
  prePositionedKeyWrappingEntryIds?: TID[];
  /** Cascading: secondary bindings triggered after delay */
  cascadeBindingIds?: TID[];
  /** Delay in milliseconds for each cascading binding */
  cascadeDelayMs?: number[];
  createdBy: TID;
  createdAt: Date | string;
  updatedAt: Date | string;
}
