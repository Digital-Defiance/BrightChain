/**
 * Integration tests for native canary event flow.
 *
 * Tests the full pipeline from platform event through native canary evaluation
 * to signal emission. Also tests the duress code login flow: immediate DURESS
 * signal emission and protocol execution without waiting for scheduled checks.
 *
 * These tests exercise multiple services working together:
 * - NativeCanaryService (event processing + signal emission)
 * - InMemoryPlatformEventStore (event counting within periods)
 * - IEncryptionService (duress code encryption/decryption)
 * - Signal callback (internal event bus — no HTTP)
 *
 * Feature: canary-provider-expansion
 * Requirements: 8.1, 8.2, 8.3
 */
import type {
  INativeCanaryConfigBase,
  IPlatformEvent,
  NativeCanaryType,
} from '@brightchain/digitalburnbag-lib';
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import {
  InMemoryPlatformEventStore,
  NativeCanaryService,
  NativeCanarySignalCallback,
} from '../../services/native-canary-service';
import type { BrightDBNativeCanaryConfigRepository } from '../../collections/native-canary-config-collection';
import type { IEncryptionService } from '../../services/credential-service';

// ---------------------------------------------------------------------------
// In-memory repository for integration testing
// ---------------------------------------------------------------------------

function createInMemoryRepository(): BrightDBNativeCanaryConfigRepository<string> {
  const configs: INativeCanaryConfigBase<string>[] = [];

  return {
    getConfigById: async (id: string) => configs.find((c) => c.id === id) ?? null,
    getConfigsByUser: async (userId: string) =>
      configs.filter((c) => c.userId === userId),
    createConfig: async (config: INativeCanaryConfigBase<string>) => {
      configs.push({ ...config });
    },
    updateConfig: async (
      id: string,
      updates: Partial<INativeCanaryConfigBase<string>>,
    ) => {
      const idx = configs.findIndex((c) => c.id === id);
      if (idx >= 0) {
        configs[idx] = { ...configs[idx], ...updates, updatedAt: new Date() };
      }
    },
  } as unknown as BrightDBNativeCanaryConfigRepository<string>;
}

// ---------------------------------------------------------------------------
// Mock encryption service (base64 encode/decode for testing)
// ---------------------------------------------------------------------------

function createMockEncryptionService(): IEncryptionService {
  return {
    async encrypt(plaintext: string) {
      const encoded = Buffer.from(plaintext, 'utf-8').toString('base64');
      return { ciphertext: encoded, iv: 'mock-iv', authTag: 'mock-auth-tag' };
    },
    async decrypt(ciphertext: string) {
      return Buffer.from(ciphertext, 'base64').toString('utf-8');
    },
  };
}

// ---------------------------------------------------------------------------
// Signal collector — records all emitted signals for assertions
// ---------------------------------------------------------------------------

interface EmittedSignal {
  userId: string;
  configId: string;
  signalType: HeartbeatSignalType;
  canaryType: NativeCanaryType;
  timestamp: Date;
}

function createSignalCollector(): {
  signals: EmittedSignal[];
  callback: NativeCanarySignalCallback<string>;
} {
  const signals: EmittedSignal[] = [];
  const callback: NativeCanarySignalCallback<string> = (event) => {
    signals.push(event);
  };
  return { signals, callback };
}

// ---------------------------------------------------------------------------
// Protocol execution tracker — simulates protocol action execution
// ---------------------------------------------------------------------------

interface ProtocolExecution {
  userId: string;
  signalType: HeartbeatSignalType;
  canaryType: NativeCanaryType;
  timestamp: Date;
}

/**
 * Creates a signal callback that also tracks protocol executions.
 * When a DURESS signal is received, it records a protocol execution.
 */
function createProtocolExecutionTracker(): {
  signals: EmittedSignal[];
  protocolExecutions: ProtocolExecution[];
  callback: NativeCanarySignalCallback<string>;
} {
  const signals: EmittedSignal[] = [];
  const protocolExecutions: ProtocolExecution[] = [];

  const callback: NativeCanarySignalCallback<string> = (event) => {
    signals.push(event);
    // Simulate protocol execution on DURESS signal
    if (event.signalType === HeartbeatSignalType.DURESS) {
      protocolExecutions.push({
        userId: event.userId,
        signalType: event.signalType,
        canaryType: event.canaryType,
        timestamp: event.timestamp,
      });
    }
  };

  return { signals, protocolExecutions, callback };
}

// ---------------------------------------------------------------------------
// Integration stack factory
// ---------------------------------------------------------------------------

interface IntegrationStack {
  service: NativeCanaryService<string>;
  eventStore: InMemoryPlatformEventStore<string>;
  signals: EmittedSignal[];
  protocolExecutions: ProtocolExecution[];
}

let idCounter = 0;

function createIntegrationStack(): IntegrationStack {
  const repository = createInMemoryRepository();
  const encryptionService = createMockEncryptionService();
  const eventStore = new InMemoryPlatformEventStore<string>();
  const { signals, protocolExecutions, callback } =
    createProtocolExecutionTracker();

  const service = new NativeCanaryService<string>(
    repository,
    encryptionService,
    eventStore,
    callback,
    () => `nc-${++idCounter}`,
  );

  return { service, eventStore, signals, protocolExecutions };
}

beforeEach(() => {
  idCounter = 0;
});

// ---------------------------------------------------------------------------
// E2E Flow: Platform event → native canary evaluation → signal emission
// Requirements: 8.1, 8.2
// ---------------------------------------------------------------------------

describe('Native Canary Event Flow: Platform Event → Evaluation → Signal', () => {
  it('login events are counted within configured period and emit PRESENCE when threshold met', async () => {
    const { service, signals } = createIntegrationStack();

    // Configure login_activity canary: 3 logins per 24h
    await service.configure({
      userId: 'user-1',
      type: 'login_activity',
      isEnabled: true,
      loginThreshold: 3,
      loginPeriodMs: 86400000,
    });

    // Send 3 login events (meets threshold)
    for (let i = 0; i < 3; i++) {
      await service.onPlatformEvent({
        userId: 'user-1',
        type: 'login',
        timestamp: new Date(),
      });
    }

    // The last signal should be PRESENCE since count (3) >= threshold (3)
    const lastSignal = signals[signals.length - 1];
    expect(lastSignal.signalType).toBe(HeartbeatSignalType.PRESENCE);
    expect(lastSignal.canaryType).toBe('login_activity');
    expect(lastSignal.userId).toBe('user-1');
  });

  it('login events below threshold emit ABSENCE signal', async () => {
    const { service, signals } = createIntegrationStack();

    // Configure login_activity canary: 5 logins per 24h
    await service.configure({
      userId: 'user-1',
      type: 'login_activity',
      isEnabled: true,
      loginThreshold: 5,
      loginPeriodMs: 86400000,
    });

    // Send only 2 login events (below threshold)
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'login',
      timestamp: new Date(),
    });
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'login',
      timestamp: new Date(),
    });

    // All signals should be ABSENCE since count (1, 2) < threshold (5)
    expect(signals.length).toBe(2);
    expect(signals[0].signalType).toBe(HeartbeatSignalType.ABSENCE);
    expect(signals[1].signalType).toBe(HeartbeatSignalType.ABSENCE);
  });

  it('file_access events are counted within configured period', async () => {
    const { service, signals } = createIntegrationStack();

    // Configure file_access canary: 4 file accesses per 1h
    await service.configure({
      userId: 'user-1',
      type: 'file_access',
      isEnabled: true,
      fileAccessThreshold: 4,
      fileAccessPeriodMs: 3600000,
    });

    // Send 3 file_access events (below threshold)
    for (let i = 0; i < 3; i++) {
      await service.onPlatformEvent({
        userId: 'user-1',
        type: 'file_access',
        timestamp: new Date(),
      });
    }

    // All should be ABSENCE (count < 4)
    expect(signals.every((s) => s.signalType === HeartbeatSignalType.ABSENCE)).toBe(true);

    // Send 4th event (meets threshold)
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'file_access',
      timestamp: new Date(),
    });

    // Last signal should be PRESENCE
    const lastSignal = signals[signals.length - 1];
    expect(lastSignal.signalType).toBe(HeartbeatSignalType.PRESENCE);
    expect(lastSignal.canaryType).toBe('file_access');
  });

  it('api_call events are counted within configured period', async () => {
    const { service, signals } = createIntegrationStack();

    // Configure api_usage canary: 10 API calls per 1h
    await service.configure({
      userId: 'user-1',
      type: 'api_usage',
      isEnabled: true,
      apiUsageThreshold: 10,
      apiUsagePeriodMs: 3600000,
    });

    // Send 10 api_call events (meets threshold)
    for (let i = 0; i < 10; i++) {
      await service.onPlatformEvent({
        userId: 'user-1',
        type: 'api_call',
        timestamp: new Date(),
      });
    }

    // Last signal should be PRESENCE since count (10) >= threshold (10)
    const lastSignal = signals[signals.length - 1];
    expect(lastSignal.signalType).toBe(HeartbeatSignalType.PRESENCE);
    expect(lastSignal.canaryType).toBe('api_usage');
  });

  it('vault_interaction events are counted within configured period', async () => {
    const { service, signals } = createIntegrationStack();

    // Configure vault_interaction canary: 2 vault ops per 24h
    await service.configure({
      userId: 'user-1',
      type: 'vault_interaction',
      isEnabled: true,
      vaultInteractionThreshold: 2,
      vaultInteractionPeriodMs: 86400000,
    });

    // Send 1 vault_interaction event (below threshold)
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'vault_interaction',
      timestamp: new Date(),
    });

    expect(signals[0].signalType).toBe(HeartbeatSignalType.ABSENCE);

    // Send 2nd vault_interaction event (meets threshold)
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'vault_interaction',
      timestamp: new Date(),
    });

    expect(signals[1].signalType).toBe(HeartbeatSignalType.PRESENCE);
    expect(signals[1].canaryType).toBe('vault_interaction');
  });

  it('events outside the configured period are not counted', async () => {
    const { service, eventStore, signals } = createIntegrationStack();

    // Configure login_activity canary: 2 logins per 1 hour (3600000ms)
    await service.configure({
      userId: 'user-1',
      type: 'login_activity',
      isEnabled: true,
      loginThreshold: 2,
      loginPeriodMs: 3600000,
    });

    // Manually append an old event (2 hours ago) directly to the event store
    const twoHoursAgo = new Date(Date.now() - 7200000);
    eventStore.append({
      userId: 'user-1',
      type: 'login',
      timestamp: twoHoursAgo,
    });

    // Send 1 recent login event — total within period is only 1 (old one excluded)
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'login',
      timestamp: new Date(),
    });

    // Should be ABSENCE since only 1 event within the 1h period (threshold is 2)
    expect(signals[0].signalType).toBe(HeartbeatSignalType.ABSENCE);
  });

  it('signal transitions from ABSENCE to PRESENCE as events accumulate', async () => {
    const { service, signals } = createIntegrationStack();

    // Configure: 3 logins per 24h
    await service.configure({
      userId: 'user-1',
      type: 'login_activity',
      isEnabled: true,
      loginThreshold: 3,
      loginPeriodMs: 86400000,
    });

    // Event 1: count=1, below threshold → ABSENCE
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'login',
      timestamp: new Date(),
    });
    expect(signals[0].signalType).toBe(HeartbeatSignalType.ABSENCE);

    // Event 2: count=2, below threshold → ABSENCE
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'login',
      timestamp: new Date(),
    });
    expect(signals[1].signalType).toBe(HeartbeatSignalType.ABSENCE);

    // Event 3: count=3, meets threshold → PRESENCE
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'login',
      timestamp: new Date(),
    });
    expect(signals[2].signalType).toBe(HeartbeatSignalType.PRESENCE);

    // Event 4: count=4, still above threshold → PRESENCE
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'login',
      timestamp: new Date(),
    });
    expect(signals[3].signalType).toBe(HeartbeatSignalType.PRESENCE);
  });

  it('multiple canary types for same user evaluate independently', async () => {
    const { service, signals } = createIntegrationStack();

    // Configure login_activity: threshold 2
    await service.configure({
      userId: 'user-1',
      type: 'login_activity',
      isEnabled: true,
      loginThreshold: 2,
      loginPeriodMs: 86400000,
    });

    // Configure file_access: threshold 3
    await service.configure({
      userId: 'user-1',
      type: 'file_access',
      isEnabled: true,
      fileAccessThreshold: 3,
      fileAccessPeriodMs: 86400000,
    });

    // Send 2 login events (meets login threshold)
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'login',
      timestamp: new Date(),
    });
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'login',
      timestamp: new Date(),
    });

    // Login canary should emit PRESENCE
    const loginSignals = signals.filter((s) => s.canaryType === 'login_activity');
    expect(loginSignals[loginSignals.length - 1].signalType).toBe(
      HeartbeatSignalType.PRESENCE,
    );

    // Send 1 file_access event (below file_access threshold)
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'file_access',
      timestamp: new Date(),
    });

    // File access canary should emit ABSENCE (only 1 of 3 needed)
    const fileSignals = signals.filter((s) => s.canaryType === 'file_access');
    expect(fileSignals[0].signalType).toBe(HeartbeatSignalType.ABSENCE);
  });

  it('unrelated event types do not affect canary evaluation', async () => {
    const { service, signals } = createIntegrationStack();

    // Configure login_activity canary only
    await service.configure({
      userId: 'user-1',
      type: 'login_activity',
      isEnabled: true,
      loginThreshold: 2,
      loginPeriodMs: 86400000,
    });

    // Send file_access events — should not trigger login_activity canary
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'file_access',
      timestamp: new Date(),
    });
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'file_access',
      timestamp: new Date(),
    });

    // No signals should be emitted (file_access doesn't match login_activity)
    expect(signals).toHaveLength(0);
  });

  it('evaluateStatus returns correct signal based on current event count', async () => {
    const { service } = createIntegrationStack();

    // Configure login_activity canary: 3 logins per 24h
    const config = await service.configure({
      userId: 'user-1',
      type: 'login_activity',
      isEnabled: true,
      loginThreshold: 3,
      loginPeriodMs: 86400000,
    });

    // No events yet → ABSENCE
    const statusBefore = await service.evaluateStatus(config.id);
    expect(statusBefore).toBe(HeartbeatSignalType.ABSENCE);

    // Send 3 events
    for (let i = 0; i < 3; i++) {
      await service.onPlatformEvent({
        userId: 'user-1',
        type: 'login',
        timestamp: new Date(),
      });
    }

    // Now meets threshold → PRESENCE
    const statusAfter = await service.evaluateStatus(config.id);
    expect(statusAfter).toBe(HeartbeatSignalType.PRESENCE);
  });
});

// ---------------------------------------------------------------------------
// E2E Flow: Login with duress code → immediate DURESS signal → protocol execution
// Requirements: 8.2, 8.3
// ---------------------------------------------------------------------------

describe('Native Canary Event Flow: Duress Code → Immediate Signal → Protocol', () => {
  it('duress code login immediately emits DURESS signal without waiting for scheduled check', async () => {
    const { service, signals } = createIntegrationStack();

    // Set up duress codes
    await service.setDuressCodes('user-1', ['panic-code-1', 'emergency-99']);

    // Simulate duress code login
    const beforeTime = Date.now();
    await service.onDuressCodeLogin('user-1', 'panic-code-1');
    const afterTime = Date.now();

    // DURESS signal should be emitted immediately
    expect(signals).toHaveLength(1);
    expect(signals[0].signalType).toBe(HeartbeatSignalType.DURESS);
    expect(signals[0].canaryType).toBe('duress_code');
    expect(signals[0].userId).toBe('user-1');

    // Verify it was immediate (within the same async call)
    expect(signals[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime);
    expect(signals[0].timestamp.getTime()).toBeLessThanOrEqual(afterTime);
  });

  it('duress code login triggers protocol execution via signal callback', async () => {
    const { service, protocolExecutions } = createIntegrationStack();

    // Set up duress codes
    await service.setDuressCodes('user-1', ['duress-alpha']);

    // Simulate duress code login
    await service.onDuressCodeLogin('user-1', 'duress-alpha');

    // Protocol execution should have been triggered
    expect(protocolExecutions).toHaveLength(1);
    expect(protocolExecutions[0].signalType).toBe(HeartbeatSignalType.DURESS);
    expect(protocolExecutions[0].userId).toBe('user-1');
    expect(protocolExecutions[0].canaryType).toBe('duress_code');
  });

  it('non-duress code login does NOT emit signal or trigger protocol', async () => {
    const { service, signals, protocolExecutions } = createIntegrationStack();

    // Set up duress codes
    await service.setDuressCodes('user-1', ['panic-code']);

    // Login with normal credentials (not a duress code)
    await service.onDuressCodeLogin('user-1', 'normal-password');

    // No signal, no protocol execution
    expect(signals).toHaveLength(0);
    expect(protocolExecutions).toHaveLength(0);
  });

  it('multiple duress codes all trigger immediate DURESS signal', async () => {
    const { service, signals, protocolExecutions } = createIntegrationStack();

    // Set up multiple duress codes
    await service.setDuressCodes('user-1', ['code-a', 'code-b', 'code-c']);

    // Each duress code should trigger independently
    await service.onDuressCodeLogin('user-1', 'code-a');
    expect(signals).toHaveLength(1);
    expect(protocolExecutions).toHaveLength(1);

    await service.onDuressCodeLogin('user-1', 'code-c');
    expect(signals).toHaveLength(2);
    expect(protocolExecutions).toHaveLength(2);

    // All signals are DURESS
    expect(signals.every((s) => s.signalType === HeartbeatSignalType.DURESS)).toBe(
      true,
    );
  });

  it('duress code detection is case-sensitive and exact-match', async () => {
    const { service, signals } = createIntegrationStack();

    await service.setDuressCodes('user-1', ['PanicCode123']);

    // Exact match triggers
    await service.onDuressCodeLogin('user-1', 'PanicCode123');
    expect(signals).toHaveLength(1);

    // Case mismatch does NOT trigger
    await service.onDuressCodeLogin('user-1', 'paniccode123');
    expect(signals).toHaveLength(1); // still 1, no new signal

    // Partial match does NOT trigger
    await service.onDuressCodeLogin('user-1', 'Panic');
    expect(signals).toHaveLength(1); // still 1
  });

  it('duress signal is emitted even when no duress_code config exists (codes set via setDuressCodes)', async () => {
    const { service, signals } = createIntegrationStack();

    // setDuressCodes creates the config automatically if it doesn't exist
    await service.setDuressCodes('user-1', ['auto-created-duress']);

    // Should still emit DURESS signal
    await service.onDuressCodeLogin('user-1', 'auto-created-duress');
    expect(signals).toHaveLength(1);
    expect(signals[0].signalType).toBe(HeartbeatSignalType.DURESS);
  });

  it('full lifecycle: configure canaries → platform events → duress login → protocol execution', async () => {
    const { service, signals, protocolExecutions } = createIntegrationStack();

    // Step 1: Configure a login_activity canary (threshold 2 per 24h)
    await service.configure({
      userId: 'user-1',
      type: 'login_activity',
      isEnabled: true,
      loginThreshold: 2,
      loginPeriodMs: 86400000,
    });

    // Step 2: Configure duress codes
    await service.setDuressCodes('user-1', ['emergency-stop']);

    // Step 3: Normal login events — login_activity canary evaluates
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'login',
      timestamp: new Date(),
    });
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'login',
      timestamp: new Date(),
    });

    // Login canary should have emitted signals (ABSENCE then PRESENCE)
    const loginSignals = signals.filter((s) => s.canaryType === 'login_activity');
    expect(loginSignals).toHaveLength(2);
    expect(loginSignals[0].signalType).toBe(HeartbeatSignalType.ABSENCE);
    expect(loginSignals[1].signalType).toBe(HeartbeatSignalType.PRESENCE);

    // No protocol executions yet (PRESENCE doesn't trigger protocol)
    expect(protocolExecutions).toHaveLength(0);

    // Step 4: Duress code login — immediate DURESS signal + protocol execution
    await service.onDuressCodeLogin('user-1', 'emergency-stop');

    const duressSignals = signals.filter(
      (s) => s.signalType === HeartbeatSignalType.DURESS,
    );
    expect(duressSignals).toHaveLength(1);
    expect(duressSignals[0].canaryType).toBe('duress_code');

    // Protocol was executed immediately
    expect(protocolExecutions).toHaveLength(1);
    expect(protocolExecutions[0].signalType).toBe(HeartbeatSignalType.DURESS);
  });

  it('duress code for one user does not affect another user', async () => {
    const { service, signals } = createIntegrationStack();

    // Set duress codes for user-1
    await service.setDuressCodes('user-1', ['user1-duress']);

    // Set different duress codes for user-2
    await service.setDuressCodes('user-2', ['user2-duress']);

    // User-1's duress code should not trigger for user-2
    await service.onDuressCodeLogin('user-2', 'user1-duress');
    expect(signals).toHaveLength(0);

    // User-2's duress code triggers for user-2
    await service.onDuressCodeLogin('user-2', 'user2-duress');
    expect(signals).toHaveLength(1);
    expect(signals[0].userId).toBe('user-2');
  });

  it('native canaries operate without any HTTP calls (internal event bus only)', async () => {
    const { service, signals } = createIntegrationStack();

    // Configure multiple canary types
    await service.configure({
      userId: 'user-1',
      type: 'login_activity',
      isEnabled: true,
      loginThreshold: 1,
      loginPeriodMs: 86400000,
    });
    await service.configure({
      userId: 'user-1',
      type: 'file_access',
      isEnabled: true,
      fileAccessThreshold: 1,
      fileAccessPeriodMs: 86400000,
    });
    await service.setDuressCodes('user-1', ['duress-test']);

    // Process events — all signal propagation uses the callback (no HTTP)
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'login',
      timestamp: new Date(),
    });
    await service.onPlatformEvent({
      userId: 'user-1',
      type: 'file_access',
      timestamp: new Date(),
    });
    await service.onDuressCodeLogin('user-1', 'duress-test');

    // All signals were delivered via the internal callback
    expect(signals.length).toBe(3);
    expect(signals[0].canaryType).toBe('login_activity');
    expect(signals[1].canaryType).toBe('file_access');
    expect(signals[2].canaryType).toBe('duress_code');
    expect(signals[2].signalType).toBe(HeartbeatSignalType.DURESS);
  });
});
