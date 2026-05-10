import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { HeartbeatSignalType } from '../canary-provider/canary-provider-adapter';
import type {
  IMultiCanaryBindingBase,
  RedundancyPolicy,
} from '../canary-provider/multi-canary-binding';
import type {
  IBindingImpactReport,
  IRedundancyEvaluationResult,
} from '../canary-provider/expansion-types';
import type { CanaryCondition } from '../../enumerations/canary-condition';
import type { ProtocolAction } from '../../enumerations/protocol-action';

/**
 * Parameters for creating a new multi-canary binding.
 */
export interface ICreateMultiCanaryBindingParams<
  TID extends PlatformID = string,
> {
  /** User creating the binding */
  userId: TID;
  /** Display name for this binding group */
  name: string;
  /** Target vault container IDs */
  vaultContainerIds: TID[];
  /** Target file IDs */
  fileIds: TID[];
  /** Target folder IDs */
  folderIds: TID[];
  /** Provider connection IDs (2–20) */
  providerConnectionIds: TID[];
  /** Redundancy policy */
  redundancyPolicy: RedundancyPolicy;
  /** Per-provider weights for weighted_consensus (connectionId → weight, 0.1–10.0) */
  providerWeights?: Record<string, number>;
  /** Trigger threshold percentage for weighted_consensus (0–100, default: 75) */
  weightedThresholdPercent?: number;
  /** Protocol action to execute when triggered */
  protocolAction: ProtocolAction;
  /** Canary condition type */
  canaryCondition: CanaryCondition;
  /** Absence threshold duration in ms */
  absenceThresholdMs?: number;
}

/**
 * Parameters for updating an existing multi-canary binding.
 */
export interface IMultiCanaryBindingUpdate<TID extends PlatformID = string> {
  /** Updated display name */
  name?: string;
  /** Updated target vault container IDs */
  vaultContainerIds?: TID[];
  /** Updated target file IDs */
  fileIds?: TID[];
  /** Updated target folder IDs */
  folderIds?: TID[];
  /** Updated provider connection IDs (2–20) */
  providerConnectionIds?: TID[];
  /** Updated redundancy policy */
  redundancyPolicy?: RedundancyPolicy;
  /** Updated per-provider weights */
  providerWeights?: Record<string, number>;
  /** Updated threshold percentage */
  weightedThresholdPercent?: number;
  /** Updated protocol action */
  protocolAction?: ProtocolAction;
  /** Updated canary condition */
  canaryCondition?: CanaryCondition;
  /** Updated absence threshold */
  absenceThresholdMs?: number;
  /** Whether the binding is active */
  isActive?: boolean;
}

/**
 * Service interface for managing multi-canary redundancy bindings.
 * Enables attaching 2–20 providers to a single vault/file/folder with
 * configurable redundancy policies to prevent false-positive triggers.
 */
export interface IMultiCanaryBindingService<TID extends PlatformID = string> {
  /** Create a multi-canary binding (validates 2–20 providers, all connected) */
  createBinding(
    params: ICreateMultiCanaryBindingParams<TID>,
  ): Promise<IMultiCanaryBindingBase<TID>>;

  /** Update a binding (add/remove providers, change policy) */
  updateBinding(
    bindingId: TID,
    updates: IMultiCanaryBindingUpdate<TID>,
  ): Promise<IMultiCanaryBindingBase<TID>>;

  /** Delete a binding */
  deleteBinding(bindingId: TID, userId: TID): Promise<void>;

  /** Get all bindings for a user */
  getBindingsForUser(userId: TID): Promise<IMultiCanaryBindingBase<TID>[]>;

  /** Get bindings for a specific target (vault/file/folder) */
  getBindingsForTarget(
    targetId: TID,
    targetType: 'vault' | 'file' | 'folder',
  ): Promise<IMultiCanaryBindingBase<TID>[]>;

  /** Evaluate redundancy policy for a binding given current signals */
  evaluateRedundancy(bindingId: TID): Promise<IRedundancyEvaluationResult>;

  /** Handle provider signal update (called by HealthMonitor) */
  onProviderSignal(
    connectionId: TID,
    signal: HeartbeatSignalType,
  ): Promise<void>;

  /** Remove a provider from all bindings (on disconnect) */
  removeProviderFromBindings(connectionId: TID): Promise<IBindingImpactReport>;
}
