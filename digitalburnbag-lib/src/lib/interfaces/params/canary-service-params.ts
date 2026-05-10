import { PlatformID } from '@digitaldefiance/ecies-lib';
import { CanaryCondition } from '../../enumerations/canary-condition';
import { CanaryProvider } from '../../enumerations/canary-provider';
import { ProtocolAction } from '../../enumerations/protocol-action';
import type {
  IAbsenceDetectionConfig,
  IDuressDetectionConfig,
} from '../canary-provider/canary-provider-adapter';

/**
 * Parameters for creating a canary binding.
 */
export interface ICreateCanaryBindingParams<TID extends PlatformID> {
  protocolId: TID;
  vaultContainerIds: TID[];
  fileIds: TID[];
  folderIds: TID[];
  protocolAction: ProtocolAction;
  canaryCondition: CanaryCondition;

  /**
   * Provider that evaluates the condition.
   * Can be a well-known CanaryProvider enum value or a custom provider ID string.
   */
  canaryProvider: CanaryProvider | string;

  /**
   * Custom provider configuration ID (for user-defined providers).
   * If set, this overrides canaryProvider and uses the custom config.
   */
  customProviderId?: TID;

  /**
   * Absence detection configuration.
   * Required when canaryCondition is ABSENCE.
   */
  absenceConfig?: IAbsenceDetectionConfig;

  /**
   * Duress detection configuration.
   * Required when canaryCondition is DURESS.
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
   */
  checkIntervalMs?: number;

  recipientListId?: TID;
  /**
   * Pre-positioned key wrapping entry IDs.
   * When provided, the canary trigger distributes files using these
   * pre-wrapped keys instead of decrypting through the custodian.
   */
  prePositionedKeyWrappingEntryIds?: TID[];
  cascadeBindingIds?: TID[];
  cascadeDelayMs?: number[];
}

/**
 * Partial update fields for a canary binding.
 */
export interface ICanaryBindingUpdate<TID extends PlatformID> {
  vaultContainerIds?: TID[];
  fileIds?: TID[];
  folderIds?: TID[];
  protocolAction?: ProtocolAction;

  /** Update the provider */
  canaryProvider?: CanaryProvider | string;
  customProviderId?: TID;

  /** Update absence/duress configuration */
  absenceConfig?: IAbsenceDetectionConfig;
  duressConfig?: IDuressDetectionConfig;

  /** Update credentials reference */
  providerCredentialsId?: TID;

  /** Update check interval */
  checkIntervalMs?: number;

  /** Activate or deactivate the binding */
  isActive?: boolean;

  recipientListId?: TID;
  /** Update pre-positioned key wrapping entry IDs */
  prePositionedKeyWrappingEntryIds?: TID[];
  cascadeBindingIds?: TID[];
  cascadeDelayMs?: number[];
}

/**
 * Context information when a canary trigger fires.
 */
export interface ITriggerContext {
  triggeredAt: Date;
  triggeredBy: string;
  isDuress?: boolean;
}

/**
 * Result of executing a protocol action.
 */
export interface IProtocolExecutionResult<TID extends PlatformID> {
  bindingId: TID;
  action: ProtocolAction;
  filesAffected: number;
  recipientsContacted: number;
  errors: string[];
}

/**
 * Report from a dry-run simulation.
 */
export interface IDryRunReport<TID extends PlatformID> {
  bindingId: TID;
  action: ProtocolAction;
  vaultContainersAffected: TID[];
  filesAffected: TID[];
  foldersAffected: TID[];
  recipientsToContact: string[];
  estimatedDuration?: number;
}

/**
 * Result of a cascading protocol execution.
 */
export interface ICascadeResult<TID extends PlatformID> {
  primaryResult: IProtocolExecutionResult<TID>;
  scheduledSecondaryIds: TID[];
}

/**
 * Result of pre-positioning keys for a canary binding's recipients.
 * Returned by `prepareBindingKeys` so the caller can store the entry IDs
 * on the binding.
 */
export interface IPrepareBindingKeysResult<TID extends PlatformID> {
  /** Key wrapping entry IDs created for each file × recipient combination */
  keyWrappingEntryIds: TID[];
  /**
   * Ephemeral share links created for external recipients (no platform account).
   * Each entry maps a file ID to the share URL + passphrase.
   * The caller should store these securely — the passphrase is only returned once.
   */
  ephemeralShares: Array<{
    fileId: TID;
    recipientEmail: string;
    shareUrl: string;
    passphrase: string;
  }>;
}
