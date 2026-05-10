/**
 * MultiCanaryBindingService — manages multi-canary redundancy bindings and
 * evaluates redundancy policies before executing protocol actions.
 *
 * Enables attaching 2–20 provider connections to a single vault/file/folder
 * with configurable redundancy policies (all_must_fail, majority_must_fail,
 * any_fails, weighted_consensus) to prevent premature vault destruction from
 * single-provider false positives.
 *
 * Feature: canary-provider-expansion
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7, 9.8
 */
import type {
  IBindingImpactReport,
  IMultiCanaryBindingBase,
  IMultiCanaryBindingService,
  IRedundancyEvaluationResult,
  MultiCanaryAggregateStatus,
  RedundancyPolicy,
} from '@brightchain/digitalburnbag-lib';
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import type { PlatformID } from '@digitaldefiance/ecies-lib';
import type { BrightDBMultiCanaryBindingRepository } from '../collections/multi-canary-binding-collection';
import type {
  ICreateMultiCanaryBindingParams,
  IMultiCanaryBindingUpdate,
} from '@brightchain/digitalburnbag-lib';
import type { IProviderConnectionExtended } from '@brightchain/digitalburnbag-lib';

// ---------------------------------------------------------------------------
// Connection Repository Interface
// ---------------------------------------------------------------------------

/**
 * Minimal interface for reading provider connection state.
 * Used to validate that all providers in a binding are connected.
 */
export interface IMultiCanaryConnectionRepository<
  TID extends PlatformID = string,
> {
  getConnection(
    connectionId: TID,
  ): Promise<IProviderConnectionExtended<TID> | null>;
}

// ---------------------------------------------------------------------------
// Protocol Action Callback Interface
// ---------------------------------------------------------------------------

/**
 * Callback invoked when a multi-canary binding's redundancy threshold is met
 * and the configured protocol action should be executed.
 *
 * This is the internal event bus mechanism — the caller (e.g. AggregationEngine
 * or CanaryService) handles the actual protocol execution.
 */
export type ProtocolActionCallback<TID extends PlatformID = string> = (event: {
  bindingId: TID;
  userId: TID;
  protocolAction: IMultiCanaryBindingBase<TID>['protocolAction'];
  canaryCondition: IMultiCanaryBindingBase<TID>['canaryCondition'];
  evaluationResult: IRedundancyEvaluationResult;
  timestamp: Date;
}) => void | Promise<void>;

// ---------------------------------------------------------------------------
// Validation Helpers (exported for property-based testing)
// ---------------------------------------------------------------------------

/** Minimum number of providers per multi-canary binding. Requirement: 9.8 */
export const MIN_PROVIDERS = 2;
/** Maximum number of providers per multi-canary binding. Requirement: 9.8 */
export const MAX_PROVIDERS = 20;
/** Minimum weight value for weighted_consensus policy. Requirement: 9.5 */
export const MIN_WEIGHT = 0.1;
/** Maximum weight value for weighted_consensus policy. Requirement: 9.5 */
export const MAX_WEIGHT = 10.0;
/** Minimum threshold percentage for weighted_consensus policy. Requirement: 9.5 */
export const MIN_THRESHOLD_PERCENT = 0;
/** Maximum threshold percentage for weighted_consensus policy. Requirement: 9.5 */
export const MAX_THRESHOLD_PERCENT = 100;
/** Default threshold percentage for weighted_consensus policy. */
export const DEFAULT_THRESHOLD_PERCENT = 75;

/**
 * Validate the provider count for a multi-canary binding.
 * Returns an error message if invalid, or null if valid.
 *
 * Requirement: 9.8
 */
export function validateProviderCount(count: number): string | null {
  if (count < MIN_PROVIDERS) {
    return `Multi-canary bindings require at least ${MIN_PROVIDERS} providers`;
  }
  if (count > MAX_PROVIDERS) {
    return `Maximum ${MAX_PROVIDERS} providers per binding`;
  }
  return null;
}

/**
 * Validate weights for weighted_consensus policy.
 * Returns an array of error messages (empty if valid).
 *
 * Requirement: 9.5
 */
export function validateWeights(
  weights: Record<string, number>,
  threshold: number,
): string[] {
  const errors: string[] = [];

  for (const [connectionId, weight] of Object.entries(weights)) {
    if (weight < MIN_WEIGHT || weight > MAX_WEIGHT) {
      errors.push(
        `Weight for provider ${connectionId} must be between ${MIN_WEIGHT} and ${MAX_WEIGHT}, got ${weight}`,
      );
    }
  }

  if (threshold < MIN_THRESHOLD_PERCENT || threshold > MAX_THRESHOLD_PERCENT) {
    errors.push(
      `Weighted threshold must be between ${MIN_THRESHOLD_PERCENT} and ${MAX_THRESHOLD_PERCENT}%, got ${threshold}`,
    );
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Redundancy Policy Evaluation (exported for property-based testing)
// ---------------------------------------------------------------------------

/**
 * Evaluate a redundancy policy given the current provider signals.
 *
 * - Excludes CHECK_FAILED providers from the active count (Req 9.7)
 * - Excludes paused providers from evaluation (Req 16.2)
 * - Only PRESENCE and ABSENCE signals are considered "active"
 *
 * Requirements: 9.3, 9.4, 9.5, 9.7
 */
export function evaluateRedundancyPolicy(
  policy: RedundancyPolicy,
  providerSignals: Record<string, HeartbeatSignalType>,
  pausedConnectionIds: Set<string>,
  providerWeights: Record<string, number>,
  weightedThresholdPercent: number,
): {
  shouldTrigger: boolean;
  absenceCount: number;
  totalActive: number;
  weightedScore?: number;
} {
  // Collect active signals: exclude CHECK_FAILED (Req 9.7) and paused (Req 16.2)
  const activeSignals: Array<{ connectionId: string; signal: HeartbeatSignalType }> = [];

  for (const [connectionId, signal] of Object.entries(providerSignals)) {
    // Exclude paused providers
    if (pausedConnectionIds.has(connectionId)) continue;
    // Exclude CHECK_FAILED providers from consensus (Req 9.7)
    if (signal === HeartbeatSignalType.CHECK_FAILED) continue;
    // Exclude INCONCLUSIVE providers
    if (signal === HeartbeatSignalType.INCONCLUSIVE) continue;

    activeSignals.push({ connectionId, signal });
  }

  const totalActive = activeSignals.length;
  const absenceCount = activeSignals.filter(
    (s) => s.signal === HeartbeatSignalType.ABSENCE,
  ).length;

  if (totalActive === 0) {
    // No active providers — cannot trigger
    return { shouldTrigger: false, absenceCount: 0, totalActive: 0 };
  }

  switch (policy) {
    case 'all_must_fail': {
      // Trigger iff ALL active providers report ABSENCE (Req 9.4)
      const shouldTrigger = absenceCount === totalActive;
      return { shouldTrigger, absenceCount, totalActive };
    }

    case 'majority_must_fail': {
      // Trigger iff more than half of active providers report ABSENCE
      const shouldTrigger = absenceCount > totalActive / 2;
      return { shouldTrigger, absenceCount, totalActive };
    }

    case 'any_fails': {
      // Trigger iff at least one active provider reports ABSENCE
      const shouldTrigger = absenceCount >= 1;
      return { shouldTrigger, absenceCount, totalActive };
    }

    case 'weighted_consensus': {
      // Compute weighted absence score as a percentage of total weight (Req 9.5)
      let absenceWeight = 0;
      let totalWeight = 0;

      for (const { connectionId, signal } of activeSignals) {
        const weight = providerWeights[connectionId] ?? 1.0;
        totalWeight += weight;
        if (signal === HeartbeatSignalType.ABSENCE) {
          absenceWeight += weight;
        }
      }

      const weightedScore =
        totalWeight > 0 ? (absenceWeight / totalWeight) * 100 : 0;
      const shouldTrigger = weightedScore >= weightedThresholdPercent;

      return { shouldTrigger, absenceCount, totalActive, weightedScore };
    }

    default:
      return { shouldTrigger: false, absenceCount, totalActive };
  }
}

/**
 * Compute the aggregate status for a multi-canary binding based on
 * the evaluation result and current provider signals.
 */
export function computeAggregateStatus(
  evaluationResult: ReturnType<typeof evaluateRedundancyPolicy>,
  providerSignals: Record<string, HeartbeatSignalType>,
  pausedConnectionIds: Set<string>,
  alreadyTriggered: boolean,
): MultiCanaryAggregateStatus {
  if (alreadyTriggered) {
    return 'triggered';
  }

  // Check if all non-paused providers are CHECK_FAILED
  const nonPausedSignals = Object.entries(providerSignals).filter(
    ([id]) => !pausedConnectionIds.has(id),
  );

  if (nonPausedSignals.length > 0) {
    const allCheckFailed = nonPausedSignals.every(
      ([, signal]) => signal === HeartbeatSignalType.CHECK_FAILED,
    );
    if (allCheckFailed) {
      return 'check_failed';
    }
  }

  if (evaluationResult.shouldTrigger) {
    return 'threshold_met';
  }

  if (evaluationResult.absenceCount > 0) {
    return 'partial_absence';
  }

  return 'all_present';
}

// ---------------------------------------------------------------------------
// Circular Cascade Detection
// ---------------------------------------------------------------------------

/**
 * Detect circular cascades in multi-canary bindings.
 *
 * A circular cascade occurs when binding A's protocol action would trigger
 * binding B, which in turn would trigger binding A (or any cycle in the
 * dependency graph). For simplicity, we detect if any of the target IDs
 * in the new binding are already referenced as targets in existing bindings
 * that share provider connections with the new binding.
 *
 * This is a conservative check: if the same vault/file/folder appears as
 * a target in multiple bindings that share providers, we flag it as a
 * potential circular cascade.
 */
export function detectCircularCascade(
  newTargetIds: string[],
  newProviderIds: string[],
  existingBindings: IMultiCanaryBindingBase<string>[],
): boolean {
  const newTargetSet = new Set(newTargetIds);
  const newProviderSet = new Set(newProviderIds);

  for (const binding of existingBindings) {
    // Check if this existing binding shares any providers with the new binding
    const sharedProviders = binding.providerConnectionIds.some((id) =>
      newProviderSet.has(String(id)),
    );

    if (!sharedProviders) continue;

    // Check if this existing binding's targets overlap with the new binding's targets
    const existingTargets = [
      ...binding.vaultContainerIds.map(String),
      ...binding.fileIds.map(String),
      ...binding.folderIds.map(String),
    ];

    const hasOverlappingTargets = existingTargets.some((id) =>
      newTargetSet.has(id),
    );

    if (hasOverlappingTargets) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// MultiCanaryBindingService Implementation
// ---------------------------------------------------------------------------

/**
 * Concrete implementation of IMultiCanaryBindingService.
 *
 * - Validates 2–20 providers per binding (Req 9.8)
 * - Validates all providers are in "connected" status on creation (Req 9.1)
 * - Detects circular cascades on creation
 * - Evaluates redundancy policies: all_must_fail, majority_must_fail, any_fails,
 *   weighted_consensus (Req 9.2, 9.3, 9.4, 9.5)
 * - Excludes CHECK_FAILED providers from consensus (Req 9.7)
 * - Excludes paused providers from evaluation (Req 16.2)
 * - Triggers protocol action callback when threshold is met (Req 9.3)
 * - Removes provider from all bindings on disconnect, reports impact (Req 16.4, 16.5)
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7, 9.8
 */
export class MultiCanaryBindingService<TID extends PlatformID = string>
  implements IMultiCanaryBindingService<TID>
{
  constructor(
    private readonly repository: BrightDBMultiCanaryBindingRepository<TID>,
    private readonly connectionRepository: IMultiCanaryConnectionRepository<TID>,
    private readonly onProtocolAction?: ProtocolActionCallback<TID>,
    private readonly generateId?: () => TID,
  ) {}

  // -----------------------------------------------------------------------
  // createBinding — validate and persist a new multi-canary binding
  // Requirements: 9.1, 9.2, 9.5, 9.8
  // -----------------------------------------------------------------------

  async createBinding(
    params: ICreateMultiCanaryBindingParams<TID>,
  ): Promise<IMultiCanaryBindingBase<TID>> {
    // Validate provider count (Req 9.8)
    const countError = validateProviderCount(params.providerConnectionIds.length);
    if (countError) {
      throw new Error(countError);
    }

    // Validate weighted_consensus parameters (Req 9.5)
    if (params.redundancyPolicy === 'weighted_consensus') {
      const weights = params.providerWeights ?? {};
      const threshold = params.weightedThresholdPercent ?? DEFAULT_THRESHOLD_PERCENT;
      const weightErrors = validateWeights(weights, threshold);
      if (weightErrors.length > 0) {
        throw new Error(weightErrors.join('; '));
      }
    }

    // Validate all providers are connected (Req 9.1)
    const disconnectedProviders: string[] = [];
    for (const connectionId of params.providerConnectionIds) {
      const connection = await this.connectionRepository.getConnection(connectionId);
      if (!connection || connection.status !== 'connected') {
        disconnectedProviders.push(String(connectionId));
      }
    }
    if (disconnectedProviders.length > 0) {
      throw new Error(
        `The following providers are not connected: ${disconnectedProviders.join(', ')}. ` +
          `All providers must be in "connected" status to create a multi-canary binding.`,
      );
    }

    // Detect circular cascades
    const existingBindings = await this.repository.getBindingsForUser(params.userId);
    const newTargetIds = [
      ...params.vaultContainerIds.map(String),
      ...params.fileIds.map(String),
      ...params.folderIds.map(String),
    ];
    const newProviderIds = params.providerConnectionIds.map(String);

    if (
      detectCircularCascade(
        newTargetIds,
        newProviderIds,
        existingBindings as IMultiCanaryBindingBase<string>[],
      )
    ) {
      throw new Error(
        'Circular cascade detected: this binding would create a cycle where ' +
          'providers are shared between bindings targeting the same vault/file/folder.',
      );
    }

    // Build the binding
    const now = new Date();
    const id = this.generateId
      ? this.generateId()
      : (`mcb-${String(params.userId)}-${now.getTime()}` as unknown as TID);

    const binding: IMultiCanaryBindingBase<TID> = {
      id,
      userId: params.userId,
      name: params.name,
      vaultContainerIds: params.vaultContainerIds,
      fileIds: params.fileIds,
      folderIds: params.folderIds,
      providerConnectionIds: params.providerConnectionIds,
      redundancyPolicy: params.redundancyPolicy,
      providerWeights: params.providerWeights,
      weightedThresholdPercent:
        params.redundancyPolicy === 'weighted_consensus'
          ? (params.weightedThresholdPercent ?? DEFAULT_THRESHOLD_PERCENT)
          : undefined,
      protocolAction: params.protocolAction,
      canaryCondition: params.canaryCondition,
      absenceThresholdMs: params.absenceThresholdMs,
      aggregateStatus: 'all_present',
      providerSignals: {},
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.createBinding(binding);
    return binding;
  }

  // -----------------------------------------------------------------------
  // updateBinding — apply partial updates to an existing binding
  // -----------------------------------------------------------------------

  async updateBinding(
    bindingId: TID,
    updates: IMultiCanaryBindingUpdate<TID>,
  ): Promise<IMultiCanaryBindingBase<TID>> {
    const existing = await this.repository.getBindingById(bindingId);
    if (!existing) {
      throw new Error(`Multi-canary binding not found: ${String(bindingId)}`);
    }

    // Validate updated provider count if changing providers
    if (updates.providerConnectionIds !== undefined) {
      const countError = validateProviderCount(updates.providerConnectionIds.length);
      if (countError) {
        throw new Error(countError);
      }
    }

    // Validate weighted_consensus parameters if changing policy or weights
    const effectivePolicy = updates.redundancyPolicy ?? existing.redundancyPolicy;
    if (effectivePolicy === 'weighted_consensus') {
      const effectiveWeights = updates.providerWeights ?? existing.providerWeights ?? {};
      const effectiveThreshold =
        updates.weightedThresholdPercent ??
        existing.weightedThresholdPercent ??
        DEFAULT_THRESHOLD_PERCENT;
      const weightErrors = validateWeights(effectiveWeights, effectiveThreshold);
      if (weightErrors.length > 0) {
        throw new Error(weightErrors.join('; '));
      }
    }

    await this.repository.updateBinding(bindingId, updates as Partial<IMultiCanaryBindingBase<TID>>);

    const updated = await this.repository.getBindingById(bindingId);
    if (!updated) {
      throw new Error(
        `Multi-canary binding not found after update: ${String(bindingId)}`,
      );
    }
    return updated;
  }

  // -----------------------------------------------------------------------
  // deleteBinding — remove a binding by ID
  // -----------------------------------------------------------------------

  async deleteBinding(bindingId: TID, userId: TID): Promise<void> {
    const existing = await this.repository.getBindingById(bindingId);
    if (!existing) {
      throw new Error(`Multi-canary binding not found: ${String(bindingId)}`);
    }
    if (String(existing.userId) !== String(userId)) {
      throw new Error(
        `Unauthorized: binding ${String(bindingId)} does not belong to user ${String(userId)}`,
      );
    }
    await this.repository.deleteBinding(bindingId);
  }

  // -----------------------------------------------------------------------
  // getBindingsForUser — retrieve all bindings for a user
  // -----------------------------------------------------------------------

  async getBindingsForUser(userId: TID): Promise<IMultiCanaryBindingBase<TID>[]> {
    return this.repository.getBindingsForUser(userId);
  }

  // -----------------------------------------------------------------------
  // getBindingsForTarget — retrieve bindings for a specific target
  // -----------------------------------------------------------------------

  async getBindingsForTarget(
    targetId: TID,
    _targetType: 'vault' | 'file' | 'folder',
  ): Promise<IMultiCanaryBindingBase<TID>[]> {
    // The repository searches across all target ID arrays
    return this.repository.getBindingsForTarget(targetId);
  }

  // -----------------------------------------------------------------------
  // evaluateRedundancy — evaluate the redundancy policy for a binding
  // Requirements: 9.3, 9.4, 9.5, 9.7
  // -----------------------------------------------------------------------

  async evaluateRedundancy(bindingId: TID): Promise<IRedundancyEvaluationResult> {
    const binding = await this.repository.getBindingById(bindingId);
    if (!binding) {
      throw new Error(`Multi-canary binding not found: ${String(bindingId)}`);
    }

    // Determine which providers are paused (Req 16.2)
    const pausedConnectionIds = new Set<string>();
    for (const connectionId of binding.providerConnectionIds) {
      const connection = await this.connectionRepository.getConnection(connectionId);
      if (connection?.isPaused) {
        pausedConnectionIds.add(String(connectionId));
      }
    }

    const providerSignals = binding.providerSignals as Record<string, HeartbeatSignalType>;
    const providerWeights = binding.providerWeights ?? {};
    const weightedThresholdPercent =
      binding.weightedThresholdPercent ?? DEFAULT_THRESHOLD_PERCENT;

    const result = evaluateRedundancyPolicy(
      binding.redundancyPolicy,
      providerSignals,
      pausedConnectionIds,
      providerWeights,
      weightedThresholdPercent,
    );

    return {
      bindingId: String(bindingId),
      shouldTrigger: result.shouldTrigger,
      policy: binding.redundancyPolicy,
      providerStatuses: providerSignals,
      absenceCount: result.absenceCount,
      totalActive: result.totalActive,
      weightedScore: result.weightedScore,
    };
  }

  // -----------------------------------------------------------------------
  // onProviderSignal — handle a provider signal update
  // Requirements: 9.3
  // -----------------------------------------------------------------------

  async onProviderSignal(
    connectionId: TID,
    signal: HeartbeatSignalType,
  ): Promise<void> {
    // Find all bindings containing this connection
    const bindings = await this.repository.getBindingsForConnection(connectionId);

    for (const binding of bindings) {
      if (!binding.isActive) continue;

      // Update the provider's signal in the binding
      const updatedSignals: Record<string, HeartbeatSignalType> = {
        ...binding.providerSignals,
        [String(connectionId)]: signal,
      };

      // Determine which providers are paused
      const pausedConnectionIds = new Set<string>();
      for (const connId of binding.providerConnectionIds) {
        const connection = await this.connectionRepository.getConnection(connId);
        if (connection?.isPaused) {
          pausedConnectionIds.add(String(connId));
        }
      }

      const providerWeights = binding.providerWeights ?? {};
      const weightedThresholdPercent =
        binding.weightedThresholdPercent ?? DEFAULT_THRESHOLD_PERCENT;

      // Re-evaluate the redundancy policy with updated signals
      const evalResult = evaluateRedundancyPolicy(
        binding.redundancyPolicy,
        updatedSignals,
        pausedConnectionIds,
        providerWeights,
        weightedThresholdPercent,
      );

      // Compute new aggregate status
      const alreadyTriggered = binding.aggregateStatus === 'triggered';
      const newAggregateStatus = computeAggregateStatus(
        evalResult,
        updatedSignals,
        pausedConnectionIds,
        alreadyTriggered,
      );

      // Persist updated signals and aggregate status
      await this.repository.updateBinding(binding.id, {
        providerSignals: updatedSignals,
        aggregateStatus: newAggregateStatus,
      } as Partial<IMultiCanaryBindingBase<TID>>);

      // Trigger protocol action if threshold is met and not already triggered (Req 9.3)
      if (evalResult.shouldTrigger && !alreadyTriggered && this.onProtocolAction) {
        // Mark as triggered before executing to prevent double-trigger
        await this.repository.updateBinding(binding.id, {
          aggregateStatus: 'triggered',
        } as Partial<IMultiCanaryBindingBase<TID>>);

        const evaluationResult: IRedundancyEvaluationResult = {
          bindingId: String(binding.id),
          shouldTrigger: evalResult.shouldTrigger,
          policy: binding.redundancyPolicy,
          providerStatuses: updatedSignals,
          absenceCount: evalResult.absenceCount,
          totalActive: evalResult.totalActive,
          weightedScore: evalResult.weightedScore,
        };

        await this.onProtocolAction({
          bindingId: binding.id,
          userId: binding.userId,
          protocolAction: binding.protocolAction,
          canaryCondition: binding.canaryCondition,
          evaluationResult,
          timestamp: new Date(),
        });
      }
    }
  }

  // -----------------------------------------------------------------------
  // removeProviderFromBindings — remove a provider from all bindings
  // Requirements: 16.4, 16.5, 16.6
  // -----------------------------------------------------------------------

  async removeProviderFromBindings(
    connectionId: TID,
  ): Promise<IBindingImpactReport> {
    const bindings = await this.repository.getBindingsForConnection(connectionId);

    const affectedBindings: string[] = [];
    const bindingsReducedBelowMinimum: string[] = [];
    const bindingsStillValid: string[] = [];

    for (const binding of bindings) {
      const bindingIdStr = String(binding.id);
      affectedBindings.push(bindingIdStr);

      // Remove the provider from the binding's connection list
      const updatedConnectionIds = binding.providerConnectionIds.filter(
        (id) => String(id) !== String(connectionId),
      );

      // Also remove from providerSignals and providerWeights
      const updatedSignals: Record<string, HeartbeatSignalType> = {};
      for (const [id, sig] of Object.entries(binding.providerSignals)) {
        if (id !== String(connectionId)) {
          updatedSignals[id] = sig as HeartbeatSignalType;
        }
      }

      const updatedWeights: Record<string, number> = {};
      if (binding.providerWeights) {
        for (const [id, weight] of Object.entries(binding.providerWeights)) {
          if (id !== String(connectionId)) {
            updatedWeights[id] = weight;
          }
        }
      }

      await this.repository.updateBinding(binding.id, {
        providerConnectionIds: updatedConnectionIds,
        providerSignals: updatedSignals,
        providerWeights:
          Object.keys(updatedWeights).length > 0 ? updatedWeights : undefined,
      } as Partial<IMultiCanaryBindingBase<TID>>);

      // Check if the binding is now below the minimum provider count
      if (updatedConnectionIds.length < MIN_PROVIDERS) {
        bindingsReducedBelowMinimum.push(bindingIdStr);
      } else {
        bindingsStillValid.push(bindingIdStr);
      }
    }

    return {
      affectedBindings,
      bindingsReducedBelowMinimum,
      bindingsStillValid,
    };
  }
}
