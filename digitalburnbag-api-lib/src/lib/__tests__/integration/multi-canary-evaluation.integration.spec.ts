/**
 * Integration tests for multi-canary evaluation flow.
 *
 * Tests the full pipeline from provider signal change through binding
 * evaluation to protocol trigger (or not). Also tests provider disconnect
 * flow: credential deletion → binding removal → status update.
 *
 * Feature: canary-provider-expansion
 * Requirements: 9.3, 16.4, 16.5
 */
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import type {
  IMultiCanaryBindingBase,
  IRedundancyEvaluationResult,
} from '@brightchain/digitalburnbag-lib';
import { CanaryCondition } from '@brightchain/digitalburnbag-lib';
import { ProtocolAction } from '@brightchain/digitalburnbag-lib';
import {
  MultiCanaryBindingService,
  MIN_PROVIDERS,
} from '../../services/multi-canary-binding-service';
import type {
  IMultiCanaryConnectionRepository,
  ProtocolActionCallback,
} from '../../services/multi-canary-binding-service';
import type { BrightDBMultiCanaryBindingRepository } from '../../collections/multi-canary-binding-collection';
import type { IProviderConnectionExtended } from '@brightchain/digitalburnbag-lib';

// ---------------------------------------------------------------------------
// In-memory repositories for integration testing
// ---------------------------------------------------------------------------

function createInMemoryBindingRepository(): BrightDBMultiCanaryBindingRepository<string> {
  const store = new Map<string, IMultiCanaryBindingBase<string>>();

  return {
    getBindingById: async (id: string) => store.get(id) ?? null,
    getBindingsForUser: async (userId: string) =>
      [...store.values()].filter((b) => b.userId === userId),
    getBindingsForTarget: async (targetId: string) =>
      [...store.values()].filter(
        (b) =>
          b.vaultContainerIds.includes(targetId) ||
          b.fileIds.includes(targetId) ||
          b.folderIds.includes(targetId),
      ),
    getBindingsForConnection: async (connectionId: string) =>
      [...store.values()].filter((b) =>
        b.providerConnectionIds.includes(connectionId),
      ),
    createBinding: async (binding: IMultiCanaryBindingBase<string>) => {
      store.set(binding.id, { ...binding });
    },
    updateBinding: async (
      bindingId: string,
      updates: Partial<IMultiCanaryBindingBase<string>>,
    ) => {
      const existing = store.get(bindingId);
      if (existing) {
        store.set(bindingId, { ...existing, ...updates, updatedAt: new Date() });
      }
    },
    deleteBinding: async (bindingId: string) => {
      store.delete(bindingId);
    },
  } as unknown as BrightDBMultiCanaryBindingRepository<string>;
}


/**
 * In-memory connection repository that simulates provider connections.
 * Allows tests to control connection status and pause state.
 */
function createInMemoryConnectionRepository(): IMultiCanaryConnectionRepository<string> & {
  addConnection: (conn: IProviderConnectionExtended<string>) => void;
  removeConnection: (connectionId: string) => void;
  updateConnection: (
    connectionId: string,
    updates: Partial<IProviderConnectionExtended<string>>,
  ) => void;
} {
  const connections = new Map<string, IProviderConnectionExtended<string>>();

  return {
    getConnection: async (connectionId: string) =>
      connections.get(connectionId) ?? null,
    addConnection: (conn: IProviderConnectionExtended<string>) => {
      connections.set(conn.id, conn);
    },
    removeConnection: (connectionId: string) => {
      connections.delete(connectionId);
    },
    updateConnection: (
      connectionId: string,
      updates: Partial<IProviderConnectionExtended<string>>,
    ) => {
      const existing = connections.get(connectionId);
      if (existing) {
        connections.set(connectionId, { ...existing, ...updates });
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let idCounter = 0;

function makeConnection(
  id: string,
  overrides?: Partial<IProviderConnectionExtended<string>>,
): IProviderConnectionExtended<string> {
  return {
    id,
    userId: 'user-1',
    providerId: `provider-${id}`,
    status: 'connected',
    isEnabled: true,
    consecutiveFailures: 0,
    failurePolicyConfig: {
      maxConsecutiveFailures: 5,
      escalationAction: 'notify',
    },
    isPaused: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as IProviderConnectionExtended<string>;
}

interface IntegrationStack {
  service: MultiCanaryBindingService<string>;
  bindingRepo: BrightDBMultiCanaryBindingRepository<string>;
  connectionRepo: ReturnType<typeof createInMemoryConnectionRepository>;
  onProtocolAction: jest.Mock;
}

function createIntegrationStack(): IntegrationStack {
  const bindingRepo = createInMemoryBindingRepository();
  const connectionRepo = createInMemoryConnectionRepository();
  const onProtocolAction = jest.fn();

  const service = new MultiCanaryBindingService<string>(
    bindingRepo,
    connectionRepo,
    onProtocolAction as ProtocolActionCallback<string>,
    () => `mcb-${++idCounter}`,
  );

  return { service, bindingRepo, connectionRepo, onProtocolAction };
}

beforeEach(() => {
  idCounter = 0;
});

// ---------------------------------------------------------------------------
// E2E Flow: Provider signal change → binding evaluation → protocol trigger (or not)
// Requirements: 9.3
// ---------------------------------------------------------------------------

describe('Multi-Canary Evaluation: Signal → Evaluate → Trigger', () => {
  it('all_must_fail: triggers protocol only when ALL providers report ABSENCE', async () => {
    const { service, connectionRepo, onProtocolAction } = createIntegrationStack();

    // Set up 3 connected providers
    connectionRepo.addConnection(makeConnection('conn-1'));
    connectionRepo.addConnection(makeConnection('conn-2'));
    connectionRepo.addConnection(makeConnection('conn-3'));

    // Create a binding with all_must_fail policy
    const binding = await service.createBinding({
      userId: 'user-1',
      name: 'Test All Must Fail',
      vaultContainerIds: ['vault-1'],
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2', 'conn-3'],
      redundancyPolicy: 'all_must_fail',
      protocolAction: ProtocolAction.DeleteFiles,
      canaryCondition: CanaryCondition.ABSENCE,
    });

    // Establish all providers with PRESENCE first so all are in the signal map
    await service.onProviderSignal('conn-1', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-2', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-3', HeartbeatSignalType.PRESENCE);
    expect(onProtocolAction).not.toHaveBeenCalled();

    // Provider 1 reports ABSENCE — should NOT trigger (only 1 of 3)
    await service.onProviderSignal('conn-1', HeartbeatSignalType.ABSENCE);
    expect(onProtocolAction).not.toHaveBeenCalled();

    // Provider 2 reports ABSENCE — should NOT trigger (2 of 3)
    await service.onProviderSignal('conn-2', HeartbeatSignalType.ABSENCE);
    expect(onProtocolAction).not.toHaveBeenCalled();

    // Provider 3 reports ABSENCE — NOW all 3 are absent, should trigger
    await service.onProviderSignal('conn-3', HeartbeatSignalType.ABSENCE);
    expect(onProtocolAction).toHaveBeenCalledTimes(1);

    const call = onProtocolAction.mock.calls[0][0];
    expect(call.bindingId).toBe(binding.id);
    expect(call.protocolAction).toBe(ProtocolAction.DeleteFiles);
    expect(call.canaryCondition).toBe(CanaryCondition.ABSENCE);
    expect(call.evaluationResult.shouldTrigger).toBe(true);
    expect(call.evaluationResult.absenceCount).toBe(3);
    expect(call.evaluationResult.totalActive).toBe(3);
  });

  it('majority_must_fail: triggers when more than half report ABSENCE', async () => {
    const { service, connectionRepo, onProtocolAction } = createIntegrationStack();

    connectionRepo.addConnection(makeConnection('conn-1'));
    connectionRepo.addConnection(makeConnection('conn-2'));
    connectionRepo.addConnection(makeConnection('conn-3'));
    connectionRepo.addConnection(makeConnection('conn-4'));

    await service.createBinding({
      userId: 'user-1',
      name: 'Test Majority',
      vaultContainerIds: ['vault-1'],
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2', 'conn-3', 'conn-4'],
      redundancyPolicy: 'majority_must_fail',
      protocolAction: ProtocolAction.DeleteFiles,
      canaryCondition: CanaryCondition.ABSENCE,
    });

    // Establish all providers with PRESENCE first
    await service.onProviderSignal('conn-1', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-2', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-3', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-4', HeartbeatSignalType.PRESENCE);
    expect(onProtocolAction).not.toHaveBeenCalled();

    // 1 of 4 absent — not majority
    await service.onProviderSignal('conn-1', HeartbeatSignalType.ABSENCE);
    expect(onProtocolAction).not.toHaveBeenCalled();

    // 2 of 4 absent — exactly half, not majority (need >50%)
    await service.onProviderSignal('conn-2', HeartbeatSignalType.ABSENCE);
    expect(onProtocolAction).not.toHaveBeenCalled();

    // 3 of 4 absent — majority, should trigger
    await service.onProviderSignal('conn-3', HeartbeatSignalType.ABSENCE);
    expect(onProtocolAction).toHaveBeenCalledTimes(1);
  });

  it('any_fails: triggers when any single provider reports ABSENCE', async () => {
    const { service, connectionRepo, onProtocolAction } = createIntegrationStack();

    connectionRepo.addConnection(makeConnection('conn-1'));
    connectionRepo.addConnection(makeConnection('conn-2'));
    connectionRepo.addConnection(makeConnection('conn-3'));

    await service.createBinding({
      userId: 'user-1',
      name: 'Test Any Fails',
      vaultContainerIds: ['vault-1'],
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2', 'conn-3'],
      redundancyPolicy: 'any_fails',
      protocolAction: ProtocolAction.DeleteFiles,
      canaryCondition: CanaryCondition.ABSENCE,
    });

    // First PRESENCE signals — no trigger
    await service.onProviderSignal('conn-1', HeartbeatSignalType.PRESENCE);
    expect(onProtocolAction).not.toHaveBeenCalled();

    // First ABSENCE — should trigger immediately
    await service.onProviderSignal('conn-2', HeartbeatSignalType.ABSENCE);
    expect(onProtocolAction).toHaveBeenCalledTimes(1);
  });

  it('weighted_consensus: triggers when weighted absence score exceeds threshold', async () => {
    const { service, connectionRepo, onProtocolAction } = createIntegrationStack();

    connectionRepo.addConnection(makeConnection('conn-1'));
    connectionRepo.addConnection(makeConnection('conn-2'));
    connectionRepo.addConnection(makeConnection('conn-3'));

    // conn-1 has weight 8, conn-2 has weight 1, conn-3 has weight 1
    // Total weight = 10. Threshold = 75%.
    // conn-1 alone absent = 8/10 = 80% → should trigger
    await service.createBinding({
      userId: 'user-1',
      name: 'Test Weighted',
      vaultContainerIds: ['vault-1'],
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2', 'conn-3'],
      redundancyPolicy: 'weighted_consensus',
      providerWeights: { 'conn-1': 8, 'conn-2': 1, 'conn-3': 1 },
      weightedThresholdPercent: 75,
      protocolAction: ProtocolAction.DeleteFiles,
      canaryCondition: CanaryCondition.ABSENCE,
    });

    // Establish all providers with PRESENCE first
    await service.onProviderSignal('conn-1', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-2', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-3', HeartbeatSignalType.PRESENCE);
    expect(onProtocolAction).not.toHaveBeenCalled();

    // conn-2 absent: weight 1/10 = 10% — below threshold
    await service.onProviderSignal('conn-2', HeartbeatSignalType.ABSENCE);
    expect(onProtocolAction).not.toHaveBeenCalled();

    // conn-1 absent: weight (8+1)/10 = 90% — above threshold, should trigger
    await service.onProviderSignal('conn-1', HeartbeatSignalType.ABSENCE);
    expect(onProtocolAction).toHaveBeenCalledTimes(1);

    const call = onProtocolAction.mock.calls[0][0];
    expect(call.evaluationResult.weightedScore).toBeGreaterThanOrEqual(75);
  });

  it('CHECK_FAILED providers are excluded from consensus, not treated as ABSENCE', async () => {
    const { service, connectionRepo, onProtocolAction } = createIntegrationStack();

    connectionRepo.addConnection(makeConnection('conn-1'));
    connectionRepo.addConnection(makeConnection('conn-2'));
    connectionRepo.addConnection(makeConnection('conn-3'));

    await service.createBinding({
      userId: 'user-1',
      name: 'Test CHECK_FAILED exclusion',
      vaultContainerIds: ['vault-1'],
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2', 'conn-3'],
      redundancyPolicy: 'all_must_fail',
      protocolAction: ProtocolAction.DeleteFiles,
      canaryCondition: CanaryCondition.ABSENCE,
    });

    // First establish all providers with PRESENCE signals
    await service.onProviderSignal('conn-1', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-2', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-3', HeartbeatSignalType.PRESENCE);
    expect(onProtocolAction).not.toHaveBeenCalled();

    // conn-1 reports CHECK_FAILED — excluded from consensus
    await service.onProviderSignal('conn-1', HeartbeatSignalType.CHECK_FAILED);
    expect(onProtocolAction).not.toHaveBeenCalled();

    // conn-2 reports ABSENCE — 1 of 2 active absent (conn-1 excluded)
    await service.onProviderSignal('conn-2', HeartbeatSignalType.ABSENCE);
    expect(onProtocolAction).not.toHaveBeenCalled();

    // conn-3 reports ABSENCE — 2 of 2 active absent → all active absent → trigger
    await service.onProviderSignal('conn-3', HeartbeatSignalType.ABSENCE);
    expect(onProtocolAction).toHaveBeenCalledTimes(1);

    const call = onProtocolAction.mock.calls[0][0];
    // totalActive should be 2 (conn-1 excluded)
    expect(call.evaluationResult.totalActive).toBe(2);
    expect(call.evaluationResult.absenceCount).toBe(2);
  });

  it('paused providers are excluded from binding evaluation', async () => {
    const { service, connectionRepo, onProtocolAction } = createIntegrationStack();

    connectionRepo.addConnection(makeConnection('conn-1'));
    connectionRepo.addConnection(makeConnection('conn-2'));
    connectionRepo.addConnection(makeConnection('conn-3', { isPaused: true }));

    await service.createBinding({
      userId: 'user-1',
      name: 'Test Paused Exclusion',
      vaultContainerIds: ['vault-1'],
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2', 'conn-3'],
      redundancyPolicy: 'all_must_fail',
      protocolAction: ProtocolAction.DeleteFiles,
      canaryCondition: CanaryCondition.ABSENCE,
    });

    // First establish PRESENCE for active providers so both are in the signal map
    await service.onProviderSignal('conn-1', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-2', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-3', HeartbeatSignalType.PRESENCE);
    expect(onProtocolAction).not.toHaveBeenCalled();

    // conn-3 is paused, so only conn-1 and conn-2 are active
    await service.onProviderSignal('conn-1', HeartbeatSignalType.ABSENCE);
    expect(onProtocolAction).not.toHaveBeenCalled();

    // conn-2 absent → all active (2/2) absent → trigger
    await service.onProviderSignal('conn-2', HeartbeatSignalType.ABSENCE);
    expect(onProtocolAction).toHaveBeenCalledTimes(1);

    const call = onProtocolAction.mock.calls[0][0];
    expect(call.evaluationResult.totalActive).toBe(2);
  });

  it('does NOT double-trigger: once triggered, subsequent signals do not re-trigger', async () => {
    const { service, connectionRepo, onProtocolAction } = createIntegrationStack();

    connectionRepo.addConnection(makeConnection('conn-1'));
    connectionRepo.addConnection(makeConnection('conn-2'));

    await service.createBinding({
      userId: 'user-1',
      name: 'Test No Double Trigger',
      vaultContainerIds: ['vault-1'],
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2'],
      redundancyPolicy: 'all_must_fail',
      protocolAction: ProtocolAction.DeleteFiles,
      canaryCondition: CanaryCondition.ABSENCE,
    });

    // Establish all providers with PRESENCE first
    await service.onProviderSignal('conn-1', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-2', HeartbeatSignalType.PRESENCE);

    // Both absent → trigger
    await service.onProviderSignal('conn-1', HeartbeatSignalType.ABSENCE);
    await service.onProviderSignal('conn-2', HeartbeatSignalType.ABSENCE);
    expect(onProtocolAction).toHaveBeenCalledTimes(1);

    // Additional signals should NOT re-trigger
    await service.onProviderSignal('conn-1', HeartbeatSignalType.ABSENCE);
    await service.onProviderSignal('conn-2', HeartbeatSignalType.ABSENCE);
    expect(onProtocolAction).toHaveBeenCalledTimes(1);
  });

  it('PRESENCE signal does not trigger protocol action', async () => {
    const { service, connectionRepo, onProtocolAction } = createIntegrationStack();

    connectionRepo.addConnection(makeConnection('conn-1'));
    connectionRepo.addConnection(makeConnection('conn-2'));

    await service.createBinding({
      userId: 'user-1',
      name: 'Test Presence No Trigger',
      vaultContainerIds: ['vault-1'],
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2'],
      redundancyPolicy: 'any_fails',
      protocolAction: ProtocolAction.DeleteFiles,
      canaryCondition: CanaryCondition.ABSENCE,
    });

    // All PRESENCE — no trigger
    await service.onProviderSignal('conn-1', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-2', HeartbeatSignalType.PRESENCE);
    expect(onProtocolAction).not.toHaveBeenCalled();
  });

  it('signal change updates binding aggregate status correctly', async () => {
    const { service, bindingRepo, connectionRepo } = createIntegrationStack();

    connectionRepo.addConnection(makeConnection('conn-1'));
    connectionRepo.addConnection(makeConnection('conn-2'));
    connectionRepo.addConnection(makeConnection('conn-3'));

    const binding = await service.createBinding({
      userId: 'user-1',
      name: 'Test Status Updates',
      vaultContainerIds: ['vault-1'],
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2', 'conn-3'],
      redundancyPolicy: 'all_must_fail',
      protocolAction: ProtocolAction.DeleteFiles,
      canaryCondition: CanaryCondition.ABSENCE,
    });

    // Initial: all_present
    expect(binding.aggregateStatus).toBe('all_present');

    // Establish all providers with PRESENCE first
    await service.onProviderSignal('conn-1', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-2', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-3', HeartbeatSignalType.PRESENCE);

    const afterPresence = await bindingRepo.getBindingById(binding.id);
    expect(afterPresence?.aggregateStatus).toBe('all_present');

    // One absent → partial_absence
    await service.onProviderSignal('conn-1', HeartbeatSignalType.ABSENCE);
    const afterPartial = await bindingRepo.getBindingById(binding.id);
    expect(afterPartial?.aggregateStatus).toBe('partial_absence');

    // All absent → triggered (for all_must_fail)
    await service.onProviderSignal('conn-2', HeartbeatSignalType.ABSENCE);
    await service.onProviderSignal('conn-3', HeartbeatSignalType.ABSENCE);
    const afterTrigger = await bindingRepo.getBindingById(binding.id);
    expect(afterTrigger?.aggregateStatus).toBe('triggered');
  });
});


// ---------------------------------------------------------------------------
// E2E Flow: Provider disconnect → credential deletion → binding removal → status update
// Requirements: 16.4, 16.5
// ---------------------------------------------------------------------------

describe('Multi-Canary Evaluation: Provider Disconnect → Binding Removal', () => {
  it('disconnecting a provider removes it from all bindings it belongs to', async () => {
    const { service, bindingRepo, connectionRepo } = createIntegrationStack();

    connectionRepo.addConnection(makeConnection('conn-1'));
    connectionRepo.addConnection(makeConnection('conn-2'));
    connectionRepo.addConnection(makeConnection('conn-3'));

    // Create two bindings that both include conn-2
    await service.createBinding({
      userId: 'user-1',
      name: 'Binding A',
      vaultContainerIds: ['vault-1'],
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2', 'conn-3'],
      redundancyPolicy: 'all_must_fail',
      protocolAction: ProtocolAction.DeleteFiles,
      canaryCondition: CanaryCondition.ABSENCE,
    });

    await service.createBinding({
      userId: 'user-1',
      name: 'Binding B',
      vaultContainerIds: [],
      fileIds: ['file-1'],
      folderIds: [],
      providerConnectionIds: ['conn-2', 'conn-3'],
      redundancyPolicy: 'majority_must_fail',
      protocolAction: ProtocolAction.DeleteFiles,
      canaryCondition: CanaryCondition.ABSENCE,
    });

    // Disconnect conn-2 — simulates credential deletion + binding removal
    const impact = await service.removeProviderFromBindings('conn-2');

    // Both bindings should be affected
    expect(impact.affectedBindings).toHaveLength(2);

    // Binding A: 3 → 2 providers, still valid
    const bindingA = await bindingRepo.getBindingById('mcb-1');
    expect(bindingA?.providerConnectionIds).not.toContain('conn-2');
    expect(bindingA?.providerConnectionIds).toHaveLength(2);

    // Binding B: 2 → 1 provider, below minimum
    const bindingB = await bindingRepo.getBindingById('mcb-2');
    expect(bindingB?.providerConnectionIds).not.toContain('conn-2');
    expect(bindingB?.providerConnectionIds).toHaveLength(1);

    // Impact report correctly categorizes bindings
    expect(impact.bindingsStillValid).toContain('mcb-1');
    expect(impact.bindingsReducedBelowMinimum).toContain('mcb-2');
  });

  it('disconnect removes provider signals and weights from binding', async () => {
    const { service, bindingRepo, connectionRepo } = createIntegrationStack();

    connectionRepo.addConnection(makeConnection('conn-1'));
    connectionRepo.addConnection(makeConnection('conn-2'));
    connectionRepo.addConnection(makeConnection('conn-3'));

    await service.createBinding({
      userId: 'user-1',
      name: 'Weighted Binding',
      vaultContainerIds: ['vault-1'],
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2', 'conn-3'],
      redundancyPolicy: 'weighted_consensus',
      providerWeights: { 'conn-1': 5, 'conn-2': 3, 'conn-3': 2 },
      weightedThresholdPercent: 75,
      protocolAction: ProtocolAction.DeleteFiles,
      canaryCondition: CanaryCondition.ABSENCE,
    });

    // Send signals so providerSignals is populated
    await service.onProviderSignal('conn-1', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-2', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-3', HeartbeatSignalType.PRESENCE);

    // Verify signals are stored
    const beforeDisconnect = await bindingRepo.getBindingById('mcb-1');
    expect(beforeDisconnect?.providerSignals['conn-2']).toBe(
      HeartbeatSignalType.PRESENCE,
    );

    // Disconnect conn-2
    await service.removeProviderFromBindings('conn-2');

    // Verify conn-2 is removed from signals and weights
    const afterDisconnect = await bindingRepo.getBindingById('mcb-1');
    expect(afterDisconnect?.providerSignals['conn-2']).toBeUndefined();
    expect(afterDisconnect?.providerWeights?.['conn-2']).toBeUndefined();

    // Other providers remain
    expect(afterDisconnect?.providerConnectionIds).toContain('conn-1');
    expect(afterDisconnect?.providerConnectionIds).toContain('conn-3');
  });

  it('disconnect from binding with exactly 2 providers flags it as below minimum', async () => {
    const { service, connectionRepo } = createIntegrationStack();

    connectionRepo.addConnection(makeConnection('conn-1'));
    connectionRepo.addConnection(makeConnection('conn-2'));

    await service.createBinding({
      userId: 'user-1',
      name: 'Minimal Binding',
      vaultContainerIds: ['vault-1'],
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2'],
      redundancyPolicy: 'all_must_fail',
      protocolAction: ProtocolAction.DeleteFiles,
      canaryCondition: CanaryCondition.ABSENCE,
    });

    // Disconnect conn-1 — binding goes from 2 to 1 provider (below minimum)
    const impact = await service.removeProviderFromBindings('conn-1');

    expect(impact.affectedBindings).toHaveLength(1);
    expect(impact.bindingsReducedBelowMinimum).toContain('mcb-1');
    expect(impact.bindingsStillValid).toHaveLength(0);
  });

  it('disconnect from provider not in any binding returns empty impact report', async () => {
    const { service, connectionRepo } = createIntegrationStack();

    connectionRepo.addConnection(makeConnection('conn-1'));
    connectionRepo.addConnection(makeConnection('conn-2'));
    connectionRepo.addConnection(makeConnection('conn-unbound'));

    await service.createBinding({
      userId: 'user-1',
      name: 'Some Binding',
      vaultContainerIds: ['vault-1'],
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2'],
      redundancyPolicy: 'all_must_fail',
      protocolAction: ProtocolAction.DeleteFiles,
      canaryCondition: CanaryCondition.ABSENCE,
    });

    // Disconnect a provider that isn't in any binding
    const impact = await service.removeProviderFromBindings('conn-unbound');

    expect(impact.affectedBindings).toHaveLength(0);
    expect(impact.bindingsReducedBelowMinimum).toHaveLength(0);
    expect(impact.bindingsStillValid).toHaveLength(0);
  });

  it('full lifecycle: create binding → signal → disconnect → re-evaluate', async () => {
    const { service, bindingRepo, connectionRepo, onProtocolAction } =
      createIntegrationStack();

    connectionRepo.addConnection(makeConnection('conn-1'));
    connectionRepo.addConnection(makeConnection('conn-2'));
    connectionRepo.addConnection(makeConnection('conn-3'));

    // Step 1: Create binding
    const binding = await service.createBinding({
      userId: 'user-1',
      name: 'Full Lifecycle',
      vaultContainerIds: ['vault-1'],
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2', 'conn-3'],
      redundancyPolicy: 'majority_must_fail',
      protocolAction: ProtocolAction.DeleteFiles,
      canaryCondition: CanaryCondition.ABSENCE,
    });

    // Step 2: Establish all providers with signals — 1 absent, 2 present, not majority
    await service.onProviderSignal('conn-2', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-3', HeartbeatSignalType.PRESENCE);
    await service.onProviderSignal('conn-1', HeartbeatSignalType.ABSENCE);
    expect(onProtocolAction).not.toHaveBeenCalled();

    // Step 3: Disconnect conn-2 (simulate credential deletion)
    connectionRepo.removeConnection('conn-2');
    const impact = await service.removeProviderFromBindings('conn-2');
    expect(impact.bindingsStillValid).toContain(binding.id);

    // Step 4: Now binding has conn-1 (ABSENCE) and conn-3 (PRESENCE)
    // With majority_must_fail and 2 active providers, need >50% = need 2 absent
    // Only 1 absent, so still no trigger
    const afterDisconnect = await bindingRepo.getBindingById(binding.id);
    expect(afterDisconnect?.providerConnectionIds).toHaveLength(2);
    expect(afterDisconnect?.aggregateStatus).not.toBe('triggered');

    // Step 5: conn-3 also reports ABSENCE → 2 of 2 active absent → majority → trigger
    await service.onProviderSignal('conn-3', HeartbeatSignalType.ABSENCE);
    expect(onProtocolAction).toHaveBeenCalledTimes(1);
  });

  it('disconnect updates binding status when all remaining providers are CHECK_FAILED', async () => {
    const { service, bindingRepo, connectionRepo } = createIntegrationStack();

    connectionRepo.addConnection(makeConnection('conn-1'));
    connectionRepo.addConnection(makeConnection('conn-2'));
    connectionRepo.addConnection(makeConnection('conn-3'));

    await service.createBinding({
      userId: 'user-1',
      name: 'Check Failed After Disconnect',
      vaultContainerIds: ['vault-1'],
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2', 'conn-3'],
      redundancyPolicy: 'all_must_fail',
      protocolAction: ProtocolAction.DeleteFiles,
      canaryCondition: CanaryCondition.ABSENCE,
    });

    // Set remaining providers to CHECK_FAILED
    await service.onProviderSignal('conn-1', HeartbeatSignalType.CHECK_FAILED);
    await service.onProviderSignal('conn-2', HeartbeatSignalType.CHECK_FAILED);
    await service.onProviderSignal('conn-3', HeartbeatSignalType.PRESENCE);

    // Disconnect conn-3 (the only non-CHECK_FAILED provider)
    await service.removeProviderFromBindings('conn-3');

    // After disconnect, re-evaluate: only CHECK_FAILED providers remain
    // Send a signal to trigger re-evaluation
    await service.onProviderSignal('conn-1', HeartbeatSignalType.CHECK_FAILED);

    const binding = await bindingRepo.getBindingById('mcb-1');
    expect(binding?.aggregateStatus).toBe('check_failed');
  });
});
