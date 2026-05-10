/**
 * Unit tests for MultiCanaryBindingService.
 *
 * Feature: canary-provider-expansion
 * Requirements: 9.1, 9.5, 9.7, 9.8
 */
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import type { IMultiCanaryBindingBase } from '@brightchain/digitalburnbag-lib';
import {
  MultiCanaryBindingService,
  computeAggregateStatus,
  detectCircularCascade,
  validateProviderCount,
  validateWeights,
  MIN_PROVIDERS,
  MAX_PROVIDERS,
  MIN_WEIGHT,
  MAX_WEIGHT,
} from '../../services/multi-canary-binding-service';
import type { IMultiCanaryConnectionRepository } from '../../services/multi-canary-binding-service';
import type { BrightDBMultiCanaryBindingRepository } from '../../collections/multi-canary-binding-collection';

// ---------------------------------------------------------------------------
// In-memory repository helpers (same pattern as property test file)
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
          (b.vaultContainerIds as string[]).includes(targetId) ||
          (b.fileIds as string[]).includes(targetId) ||
          (b.folderIds as string[]).includes(targetId),
      ),
    getBindingsForConnection: async (connectionId: string) =>
      [...store.values()].filter((b) =>
        (b.providerConnectionIds as string[]).includes(connectionId),
      ),
    createBinding: async (binding: IMultiCanaryBindingBase<string>) => {
      store.set(String(binding.id), binding);
    },
    updateBinding: async (
      bindingId: string,
      updates: Partial<IMultiCanaryBindingBase<string>>,
    ) => {
      const existing = store.get(String(bindingId));
      if (existing) {
        store.set(String(bindingId), {
          ...existing,
          ...updates,
          updatedAt: new Date(),
        });
      }
    },
    deleteBinding: async (bindingId: string) => {
      store.delete(String(bindingId));
    },
  } as unknown as BrightDBMultiCanaryBindingRepository<string>;
}

/**
 * Creates a connection repository where all connections are "connected"
 * and none are paused.
 */
function createAllConnectedRepository(): IMultiCanaryConnectionRepository<string> {
  return {
    getConnection: async (connectionId: string) => ({
      id: connectionId,
      status: 'connected' as const,
      isPaused: false,
    }),
  } as unknown as IMultiCanaryConnectionRepository<string>;
}

/**
 * Creates a connection repository where all connections are "disconnected".
 */
function createAllDisconnectedRepository(): IMultiCanaryConnectionRepository<string> {
  return {
    getConnection: async (connectionId: string) => ({
      id: connectionId,
      status: 'disconnected' as const,
      isPaused: false,
    }),
  } as unknown as IMultiCanaryConnectionRepository<string>;
}

/**
 * Builds a minimal valid ICreateMultiCanaryBindingParams object.
 */
function buildCreateParams(
  providerConnectionIds: string[],
  overrides?: Record<string, unknown>,
) {
  return {
    userId: 'user-test',
    name: 'Test Binding',
    vaultContainerIds: ['vault-1'],
    fileIds: [] as string[],
    folderIds: [] as string[],
    providerConnectionIds,
    redundancyPolicy: 'all_must_fail' as const,
    protocolAction: 'destroy' as const,
    canaryCondition: 'absence' as const,
    absenceThresholdMs: 3600000,
    ...overrides,
  };
}

let idCounter = 0;
function makeService(
  repo?: BrightDBMultiCanaryBindingRepository<string>,
  connRepo?: IMultiCanaryConnectionRepository<string>,
) {
  return new MultiCanaryBindingService<string>(
    repo ?? createInMemoryBindingRepository(),
    connRepo ?? createAllConnectedRepository(),
    undefined,
    () => `binding-${++idCounter}`,
  );
}

// ---------------------------------------------------------------------------
// Tests: binding creation rejects <2 or >20 providers (Req 9.8)
// ---------------------------------------------------------------------------

describe('MultiCanaryBindingService — provider count validation (Req 9.8)', () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it('rejects binding creation with 0 providers', async () => {
    const service = makeService();
    await expect(
      service.createBinding(buildCreateParams([])),
    ).rejects.toThrow(/at least 2 providers/i);
  });

  it('rejects binding creation with 1 provider', async () => {
    const service = makeService();
    await expect(
      service.createBinding(buildCreateParams(['conn-1'])),
    ).rejects.toThrow(/at least 2 providers/i);
  });

  it(`rejects binding creation with ${MAX_PROVIDERS + 1} providers`, async () => {
    const service = makeService();
    const ids = Array.from({ length: MAX_PROVIDERS + 1 }, (_, i) => `conn-${i}`);
    await expect(
      service.createBinding(buildCreateParams(ids)),
    ).rejects.toThrow(/maximum 20 providers/i);
  });

  it(`rejects binding creation with ${MAX_PROVIDERS + 10} providers`, async () => {
    const service = makeService();
    const ids = Array.from({ length: MAX_PROVIDERS + 10 }, (_, i) => `conn-${i}`);
    await expect(
      service.createBinding(buildCreateParams(ids)),
    ).rejects.toThrow(/maximum 20 providers/i);
  });

  it(`accepts binding creation with exactly ${MIN_PROVIDERS} providers`, async () => {
    const service = makeService();
    const ids = ['conn-a', 'conn-b'];
    const binding = await service.createBinding(buildCreateParams(ids));
    expect(binding.providerConnectionIds).toHaveLength(2);
  });

  it(`accepts binding creation with exactly ${MAX_PROVIDERS} providers`, async () => {
    const service = makeService();
    const ids = Array.from({ length: MAX_PROVIDERS }, (_, i) => `conn-${i}`);
    const binding = await service.createBinding(buildCreateParams(ids));
    expect(binding.providerConnectionIds).toHaveLength(MAX_PROVIDERS);
  });

  it('validateProviderCount returns null for valid counts', () => {
    for (let n = MIN_PROVIDERS; n <= MAX_PROVIDERS; n++) {
      expect(validateProviderCount(n)).toBeNull();
    }
  });

  it('validateProviderCount returns error string for count < 2', () => {
    expect(validateProviderCount(0)).toMatch(/at least 2/i);
    expect(validateProviderCount(1)).toMatch(/at least 2/i);
  });

  it('validateProviderCount returns error string for count > 20', () => {
    expect(validateProviderCount(21)).toMatch(/maximum 20/i);
    expect(validateProviderCount(100)).toMatch(/maximum 20/i);
  });
});

// ---------------------------------------------------------------------------
// Tests: weighted_consensus rejects weights outside 0.1–10.0 (Req 9.5)
// ---------------------------------------------------------------------------

describe('MultiCanaryBindingService — weighted_consensus weight validation (Req 9.5)', () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it('rejects weight below 0.1', async () => {
    const service = makeService();
    const params = buildCreateParams(['conn-1', 'conn-2'], {
      redundancyPolicy: 'weighted_consensus',
      providerWeights: { 'conn-1': 0.05, 'conn-2': 1.0 },
      weightedThresholdPercent: 75,
    });
    await expect(service.createBinding(params)).rejects.toThrow(
      /weight for provider conn-1 must be between/i,
    );
  });

  it('rejects weight of exactly 0 (below minimum)', async () => {
    const service = makeService();
    const params = buildCreateParams(['conn-1', 'conn-2'], {
      redundancyPolicy: 'weighted_consensus',
      providerWeights: { 'conn-1': 0, 'conn-2': 1.0 },
      weightedThresholdPercent: 75,
    });
    await expect(service.createBinding(params)).rejects.toThrow(
      /weight for provider conn-1 must be between/i,
    );
  });

  it('rejects weight above 10.0', async () => {
    const service = makeService();
    const params = buildCreateParams(['conn-1', 'conn-2'], {
      redundancyPolicy: 'weighted_consensus',
      providerWeights: { 'conn-1': 10.1, 'conn-2': 1.0 },
      weightedThresholdPercent: 75,
    });
    await expect(service.createBinding(params)).rejects.toThrow(
      /weight for provider conn-1 must be between/i,
    );
  });

  it('rejects multiple invalid weights and reports all errors', async () => {
    const service = makeService();
    const params = buildCreateParams(['conn-1', 'conn-2'], {
      redundancyPolicy: 'weighted_consensus',
      providerWeights: { 'conn-1': 0.0, 'conn-2': 11.0 },
      weightedThresholdPercent: 75,
    });
    await expect(service.createBinding(params)).rejects.toThrow();
  });

  it('accepts weight at exactly the minimum boundary (0.1)', async () => {
    const service = makeService();
    const params = buildCreateParams(['conn-1', 'conn-2'], {
      redundancyPolicy: 'weighted_consensus',
      providerWeights: { 'conn-1': MIN_WEIGHT, 'conn-2': 1.0 },
      weightedThresholdPercent: 75,
    });
    const binding = await service.createBinding(params);
    expect(binding.providerWeights?.['conn-1']).toBe(MIN_WEIGHT);
  });

  it('accepts weight at exactly the maximum boundary (10.0)', async () => {
    const service = makeService();
    const params = buildCreateParams(['conn-1', 'conn-2'], {
      redundancyPolicy: 'weighted_consensus',
      providerWeights: { 'conn-1': MAX_WEIGHT, 'conn-2': 1.0 },
      weightedThresholdPercent: 75,
    });
    const binding = await service.createBinding(params);
    expect(binding.providerWeights?.['conn-1']).toBe(MAX_WEIGHT);
  });

  it('validateWeights returns errors for out-of-range weights', () => {
    const errors = validateWeights({ 'conn-1': 0.05, 'conn-2': 15.0 }, 75);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/conn-1/);
    expect(errors[1]).toMatch(/conn-2/);
  });

  it('validateWeights returns empty array for valid weights', () => {
    const errors = validateWeights({ 'conn-1': 1.0, 'conn-2': 5.0 }, 75);
    expect(errors).toHaveLength(0);
  });

  it('does NOT validate weights for non-weighted_consensus policies', async () => {
    const service = makeService();
    // Providing out-of-range weights with all_must_fail should not throw
    const params = buildCreateParams(['conn-1', 'conn-2'], {
      redundancyPolicy: 'all_must_fail',
      providerWeights: { 'conn-1': 0.0, 'conn-2': 99.0 },
    });
    // Should succeed — weight validation only applies to weighted_consensus
    const binding = await service.createBinding(params);
    expect(binding.redundancyPolicy).toBe('all_must_fail');
  });
});

// ---------------------------------------------------------------------------
// Tests: weighted_consensus rejects threshold outside 0–100% (Req 9.5)
// ---------------------------------------------------------------------------

describe('MultiCanaryBindingService — weighted_consensus threshold validation (Req 9.5)', () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it('rejects threshold below 0', async () => {
    const service = makeService();
    const params = buildCreateParams(['conn-1', 'conn-2'], {
      redundancyPolicy: 'weighted_consensus',
      providerWeights: { 'conn-1': 1.0, 'conn-2': 1.0 },
      weightedThresholdPercent: -1,
    });
    await expect(service.createBinding(params)).rejects.toThrow(
      /weighted threshold must be between/i,
    );
  });

  it('rejects threshold above 100', async () => {
    const service = makeService();
    const params = buildCreateParams(['conn-1', 'conn-2'], {
      redundancyPolicy: 'weighted_consensus',
      providerWeights: { 'conn-1': 1.0, 'conn-2': 1.0 },
      weightedThresholdPercent: 101,
    });
    await expect(service.createBinding(params)).rejects.toThrow(
      /weighted threshold must be between/i,
    );
  });

  it('accepts threshold at exactly 0 (minimum boundary)', async () => {
    const service = makeService();
    const params = buildCreateParams(['conn-1', 'conn-2'], {
      redundancyPolicy: 'weighted_consensus',
      providerWeights: { 'conn-1': 1.0, 'conn-2': 1.0 },
      weightedThresholdPercent: 0,
    });
    const binding = await service.createBinding(params);
    expect(binding.weightedThresholdPercent).toBe(0);
  });

  it('accepts threshold at exactly 100 (maximum boundary)', async () => {
    const service = makeService();
    const params = buildCreateParams(['conn-1', 'conn-2'], {
      redundancyPolicy: 'weighted_consensus',
      providerWeights: { 'conn-1': 1.0, 'conn-2': 1.0 },
      weightedThresholdPercent: 100,
    });
    const binding = await service.createBinding(params);
    expect(binding.weightedThresholdPercent).toBe(100);
  });

  it('accepts threshold at 75 (default)', async () => {
    const service = makeService();
    const params = buildCreateParams(['conn-1', 'conn-2'], {
      redundancyPolicy: 'weighted_consensus',
      providerWeights: { 'conn-1': 1.0, 'conn-2': 1.0 },
      weightedThresholdPercent: 75,
    });
    const binding = await service.createBinding(params);
    expect(binding.weightedThresholdPercent).toBe(75);
  });

  it('validateWeights returns error for threshold below 0', () => {
    const errors = validateWeights({ 'conn-1': 1.0 }, -5);
    expect(errors.some((e) => /threshold/i.test(e))).toBe(true);
  });

  it('validateWeights returns error for threshold above 100', () => {
    const errors = validateWeights({ 'conn-1': 1.0 }, 150);
    expect(errors.some((e) => /threshold/i.test(e))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: all providers CHECK_FAILED sets aggregate to CHECK_FAILED (Req 9.7)
// ---------------------------------------------------------------------------

describe('MultiCanaryBindingService — CHECK_FAILED aggregate status (Req 9.7)', () => {
  it('sets aggregate to check_failed when all non-paused providers report CHECK_FAILED', () => {
    const signals: Record<string, HeartbeatSignalType> = {
      'conn-1': HeartbeatSignalType.CHECK_FAILED,
      'conn-2': HeartbeatSignalType.CHECK_FAILED,
      'conn-3': HeartbeatSignalType.CHECK_FAILED,
    };

    // evaluateRedundancyPolicy excludes CHECK_FAILED from active count,
    // so totalActive = 0 and shouldTrigger = false
    const evalResult = {
      shouldTrigger: false,
      absenceCount: 0,
      totalActive: 0,
    };

    const status = computeAggregateStatus(
      evalResult,
      signals,
      new Set<string>(),
      false,
    );

    expect(status).toBe('check_failed');
  });

  it('does NOT set aggregate to absence when all providers report CHECK_FAILED', () => {
    const signals: Record<string, HeartbeatSignalType> = {
      'conn-1': HeartbeatSignalType.CHECK_FAILED,
      'conn-2': HeartbeatSignalType.CHECK_FAILED,
    };

    const evalResult = {
      shouldTrigger: false,
      absenceCount: 0,
      totalActive: 0,
    };

    const status = computeAggregateStatus(
      evalResult,
      signals,
      new Set<string>(),
      false,
    );

    expect(status).not.toBe('partial_absence');
    expect(status).not.toBe('threshold_met');
    expect(status).toBe('check_failed');
  });

  it('sets aggregate to all_present when all providers report PRESENCE', () => {
    const signals: Record<string, HeartbeatSignalType> = {
      'conn-1': HeartbeatSignalType.PRESENCE,
      'conn-2': HeartbeatSignalType.PRESENCE,
    };

    const evalResult = {
      shouldTrigger: false,
      absenceCount: 0,
      totalActive: 2,
    };

    const status = computeAggregateStatus(
      evalResult,
      signals,
      new Set<string>(),
      false,
    );

    expect(status).toBe('all_present');
  });

  it('sets aggregate to partial_absence when some providers report ABSENCE', () => {
    const signals: Record<string, HeartbeatSignalType> = {
      'conn-1': HeartbeatSignalType.PRESENCE,
      'conn-2': HeartbeatSignalType.ABSENCE,
    };

    const evalResult = {
      shouldTrigger: false,
      absenceCount: 1,
      totalActive: 2,
    };

    const status = computeAggregateStatus(
      evalResult,
      signals,
      new Set<string>(),
      false,
    );

    expect(status).toBe('partial_absence');
  });

  it('sets aggregate to threshold_met when shouldTrigger is true', () => {
    const signals: Record<string, HeartbeatSignalType> = {
      'conn-1': HeartbeatSignalType.ABSENCE,
      'conn-2': HeartbeatSignalType.ABSENCE,
    };

    const evalResult = {
      shouldTrigger: true,
      absenceCount: 2,
      totalActive: 2,
    };

    const status = computeAggregateStatus(
      evalResult,
      signals,
      new Set<string>(),
      false,
    );

    expect(status).toBe('threshold_met');
  });

  it('sets aggregate to triggered when alreadyTriggered is true', () => {
    const signals: Record<string, HeartbeatSignalType> = {
      'conn-1': HeartbeatSignalType.PRESENCE,
      'conn-2': HeartbeatSignalType.PRESENCE,
    };

    const evalResult = {
      shouldTrigger: false,
      absenceCount: 0,
      totalActive: 2,
    };

    const status = computeAggregateStatus(
      evalResult,
      signals,
      new Set<string>(),
      true, // alreadyTriggered
    );

    expect(status).toBe('triggered');
  });

  it('check_failed takes precedence over all_present when all non-paused are CHECK_FAILED', () => {
    // One paused provider (PRESENCE), two non-paused CHECK_FAILED
    const signals: Record<string, HeartbeatSignalType> = {
      'conn-paused': HeartbeatSignalType.PRESENCE,
      'conn-1': HeartbeatSignalType.CHECK_FAILED,
      'conn-2': HeartbeatSignalType.CHECK_FAILED,
    };

    const evalResult = {
      shouldTrigger: false,
      absenceCount: 0,
      totalActive: 0,
    };

    const status = computeAggregateStatus(
      evalResult,
      signals,
      new Set(['conn-paused']),
      false,
    );

    expect(status).toBe('check_failed');
  });

  it('does NOT set check_failed when only some providers are CHECK_FAILED', () => {
    const signals: Record<string, HeartbeatSignalType> = {
      'conn-1': HeartbeatSignalType.CHECK_FAILED,
      'conn-2': HeartbeatSignalType.PRESENCE,
    };

    const evalResult = {
      shouldTrigger: false,
      absenceCount: 0,
      totalActive: 1,
    };

    const status = computeAggregateStatus(
      evalResult,
      signals,
      new Set<string>(),
      false,
    );

    expect(status).not.toBe('check_failed');
    expect(status).toBe('all_present');
  });

  it('onProviderSignal sets aggregate to check_failed when all providers report CHECK_FAILED', async () => {
    const repo = createInMemoryBindingRepository();
    const connRepo = createAllConnectedRepository();
    const service = makeService(repo, connRepo);

    // Create a binding with 2 providers
    const binding = await service.createBinding(
      buildCreateParams(['conn-1', 'conn-2']),
    );

    // Both providers report CHECK_FAILED
    await service.onProviderSignal('conn-1', HeartbeatSignalType.CHECK_FAILED);
    await service.onProviderSignal('conn-2', HeartbeatSignalType.CHECK_FAILED);

    // Retrieve the updated binding
    const bindings = await service.getBindingsForUser('user-test');
    const updated = bindings.find((b) => b.id === binding.id);

    expect(updated?.aggregateStatus).toBe('check_failed');
  });
});

// ---------------------------------------------------------------------------
// Tests: circular cascade detection on creation
// ---------------------------------------------------------------------------

describe('MultiCanaryBindingService — circular cascade detection', () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it('detectCircularCascade returns false when no existing bindings', () => {
    const result = detectCircularCascade(
      ['vault-1'],
      ['conn-1', 'conn-2'],
      [],
    );
    expect(result).toBe(false);
  });

  it('detectCircularCascade returns false when no shared providers', () => {
    const existingBinding: IMultiCanaryBindingBase<string> = {
      id: 'existing-1',
      userId: 'user-test',
      name: 'Existing',
      vaultContainerIds: ['vault-1'],
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-x', 'conn-y'], // different providers
      redundancyPolicy: 'all_must_fail',
      protocolAction: 'destroy',
      canaryCondition: 'absence',
      absenceThresholdMs: 3600000,
      aggregateStatus: 'all_present',
      providerSignals: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = detectCircularCascade(
      ['vault-1'],
      ['conn-1', 'conn-2'], // different providers from existing
      [existingBinding],
    );
    expect(result).toBe(false);
  });

  it('detectCircularCascade returns false when shared providers but different targets', () => {
    const existingBinding: IMultiCanaryBindingBase<string> = {
      id: 'existing-1',
      userId: 'user-test',
      name: 'Existing',
      vaultContainerIds: ['vault-other'], // different target
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2'],
      redundancyPolicy: 'all_must_fail',
      protocolAction: 'destroy',
      canaryCondition: 'absence',
      absenceThresholdMs: 3600000,
      aggregateStatus: 'all_present',
      providerSignals: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = detectCircularCascade(
      ['vault-1'], // different target
      ['conn-1', 'conn-2'],
      [existingBinding],
    );
    expect(result).toBe(false);
  });

  it('detectCircularCascade returns true when shared providers AND overlapping targets', () => {
    const existingBinding: IMultiCanaryBindingBase<string> = {
      id: 'existing-1',
      userId: 'user-test',
      name: 'Existing',
      vaultContainerIds: ['vault-1'], // same target
      fileIds: [],
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2'], // shared providers
      redundancyPolicy: 'all_must_fail',
      protocolAction: 'destroy',
      canaryCondition: 'absence',
      absenceThresholdMs: 3600000,
      aggregateStatus: 'all_present',
      providerSignals: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = detectCircularCascade(
      ['vault-1'], // same target
      ['conn-1', 'conn-2'], // same providers
      [existingBinding],
    );
    expect(result).toBe(true);
  });

  it('detectCircularCascade detects overlap via fileIds', () => {
    const existingBinding: IMultiCanaryBindingBase<string> = {
      id: 'existing-1',
      userId: 'user-test',
      name: 'Existing',
      vaultContainerIds: [],
      fileIds: ['file-1'], // file target
      folderIds: [],
      providerConnectionIds: ['conn-1', 'conn-2'],
      redundancyPolicy: 'all_must_fail',
      protocolAction: 'destroy',
      canaryCondition: 'absence',
      absenceThresholdMs: 3600000,
      aggregateStatus: 'all_present',
      providerSignals: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = detectCircularCascade(
      ['file-1'], // same file target
      ['conn-1', 'conn-2'],
      [existingBinding],
    );
    expect(result).toBe(true);
  });

  it('detectCircularCascade detects overlap via folderIds', () => {
    const existingBinding: IMultiCanaryBindingBase<string> = {
      id: 'existing-1',
      userId: 'user-test',
      name: 'Existing',
      vaultContainerIds: [],
      fileIds: [],
      folderIds: ['folder-1'], // folder target
      providerConnectionIds: ['conn-1', 'conn-2'],
      redundancyPolicy: 'all_must_fail',
      protocolAction: 'destroy',
      canaryCondition: 'absence',
      absenceThresholdMs: 3600000,
      aggregateStatus: 'all_present',
      providerSignals: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = detectCircularCascade(
      ['folder-1'], // same folder target
      ['conn-1', 'conn-2'],
      [existingBinding],
    );
    expect(result).toBe(true);
  });

  it('createBinding throws on circular cascade detection', async () => {
    const repo = createInMemoryBindingRepository();
    const connRepo = createAllConnectedRepository();
    const service = makeService(repo, connRepo);

    // Create first binding
    await service.createBinding(
      buildCreateParams(['conn-1', 'conn-2'], {
        vaultContainerIds: ['vault-1'],
      }),
    );

    // Attempt to create a second binding with same providers and same target
    await expect(
      service.createBinding(
        buildCreateParams(['conn-1', 'conn-2'], {
          vaultContainerIds: ['vault-1'],
        }),
      ),
    ).rejects.toThrow(/circular cascade/i);
  });

  it('createBinding succeeds when providers are shared but targets differ', async () => {
    const repo = createInMemoryBindingRepository();
    const connRepo = createAllConnectedRepository();
    const service = makeService(repo, connRepo);

    // Create first binding targeting vault-1
    await service.createBinding(
      buildCreateParams(['conn-1', 'conn-2'], {
        vaultContainerIds: ['vault-1'],
      }),
    );

    // Create second binding with same providers but different target — should succeed
    const binding2 = await service.createBinding(
      buildCreateParams(['conn-1', 'conn-2'], {
        vaultContainerIds: ['vault-2'],
      }),
    );

    expect(binding2).toBeDefined();
    expect(binding2.vaultContainerIds).toContain('vault-2');
  });

  it('createBinding throws when providers are not connected (Req 9.1)', async () => {
    const service = makeService(
      createInMemoryBindingRepository(),
      createAllDisconnectedRepository(),
    );

    await expect(
      service.createBinding(buildCreateParams(['conn-1', 'conn-2'])),
    ).rejects.toThrow(/not connected/i);
  });
});
