import { PlatformID } from '@digitaldefiance/ecies-lib';
import { CanaryCondition } from '../../enumerations/canary-condition';
import { ProtocolAction } from '../../enumerations/protocol-action';
import { HeartbeatSignalType } from './canary-provider-adapter';

/**
 * Redundancy policy for multi-canary bindings.
 * Determines how multiple provider signals are aggregated before triggering protocol actions.
 *
 * - 'all_must_fail': Trigger only when ALL providers report absence
 * - 'majority_must_fail': Trigger when more than half report absence
 * - 'any_fails': Trigger when any single provider reports absence
 * - 'weighted_consensus': Trigger based on weighted provider scores exceeding a threshold
 */
export type RedundancyPolicy =
  | 'all_must_fail'
  | 'majority_must_fail'
  | 'any_fails'
  | 'weighted_consensus';

/**
 * Aggregate status of a multi-canary binding based on combined provider signals.
 *
 * - 'all_present': All providers report PRESENCE
 * - 'partial_absence': Some providers report ABSENCE but threshold not met
 * - 'threshold_met': Redundancy policy threshold has been met (pending trigger)
 * - 'triggered': Protocol action has been executed
 * - 'check_failed': Unable to determine aggregate status (all providers CHECK_FAILED)
 */
export type MultiCanaryAggregateStatus =
  | 'all_present'
  | 'partial_absence'
  | 'threshold_met'
  | 'triggered'
  | 'check_failed';

/**
 * Multi-canary binding interface that associates 2–20 provider connections
 * with a single vault, file, or folder using a configurable redundancy policy.
 *
 * This is a higher-level orchestration layer that references multiple provider
 * connections and evaluates them collectively before executing protocol actions,
 * preventing premature vault destruction from single-provider false positives.
 */
export interface IMultiCanaryBindingBase<TID extends PlatformID = string> {
  /** Unique identifier for this binding */
  id: TID;
  /** User who created this binding */
  userId: TID;
  /** Display name for this binding group */
  name: string;
  /** Target vault container IDs */
  vaultContainerIds: TID[];
  /** Target file IDs */
  fileIds: TID[];
  /** Target folder IDs */
  folderIds: TID[];
  /** Provider connection IDs in this binding (2–20) */
  providerConnectionIds: TID[];
  /** Redundancy policy determining how signals are aggregated */
  redundancyPolicy: RedundancyPolicy;
  /** Per-provider weights for weighted_consensus policy (connectionId → weight, 0.1–10.0) */
  providerWeights?: Record<string, number>;
  /** Trigger threshold percentage for weighted_consensus (0–100, default: 75) */
  weightedThresholdPercent?: number;
  /** Protocol action to execute when redundancy threshold is met */
  protocolAction: ProtocolAction;
  /** Canary condition type that triggers evaluation */
  canaryCondition: CanaryCondition;
  /** Absence threshold duration in milliseconds */
  absenceThresholdMs?: number;
  /** Current aggregate status across all providers */
  aggregateStatus: MultiCanaryAggregateStatus;
  /** Per-provider latest signal (connectionId → signal type) */
  providerSignals: Record<string, HeartbeatSignalType>;
  /** Whether this binding is currently active */
  isActive: boolean;
  /** When this binding was created */
  createdAt: Date | string;
  /** When this binding was last updated */
  updatedAt: Date | string;
}
