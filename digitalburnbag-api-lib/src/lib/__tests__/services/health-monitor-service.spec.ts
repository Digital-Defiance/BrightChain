/**
 * Unit tests for HealthMonitorService.
 *
 * Feature: canary-provider-system
 * Requirements: 3.4, 3.6, 6.6
 */
import type {
  FailurePolicyAction,
  ICanaryProviderAdapter,
  ICanaryProviderConfig,
  ICanaryProviderRegistry,
  ICredentialFreshnessResult,
  ICredentialService,
  IFailureEvaluationResult,
  IFailurePolicyManager,
  IHeartbeatCheckResult,
  IProviderConnectionExtended,
  IProviderCredentials,
  IStatusHistoryEntry,
  IStatusHistoryQueryOptions,
} from '@brightchain/digitalburnbag-lib';
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import {
  classifySignal,
  HealthMonitorService,
  IConnectionRepository,
  IStatusHistoryRepository,
  NotificationCallback,
  StatusChangeCallback,
} from '../../services/health-monitor-service';

// ---------------------------------------------------------------------------
// Helpers / Mocks
// ---------------------------------------------------------------------------

function makeConnection(
  overrides?: Partial<IProviderConnectionExtended<string>>,
): IProviderConnectionExtended<string> {
  return {
    id: 'conn-1',
    userId: 'user-1',
    providerId: 'provider-1',
    status: 'connected',
    isEnabled: true,
    consecutiveFailures: 0,
    failurePolicyConfig: {
      failureThreshold: 5,
      failurePolicy: 'pause_and_notify',
    },
    isPaused: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeCredentials(
  overrides?: Partial<IProviderCredentials<string>>,
): IProviderCredentials<string> {
  return {
    userId: 'user-1',
    providerId: 'provider-1',
    accessToken: 'test-token',
    isValid: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeCheckResult(
  overrides?: Partial<IHeartbeatCheckResult<string>>,
): IHeartbeatCheckResult<string> {
  return {
    success: true,
    checkedAt: new Date(),
    events: [],
    eventCount: 1,
    signalType: HeartbeatSignalType.PRESENCE,
    confidence: 0.9,
    timeSinceLastActivityMs: 1000,
    duressDetected: false,
    ...overrides,
  };
}

class MockConnectionRepo implements IConnectionRepository<string> {
  private connections = new Map<string, IProviderConnectionExtended<string>>();
  public updates: Array<{
    id: string;
    updates: Partial<IProviderConnectionExtended<string>>;
  }> = [];

  addConnection(conn: IProviderConnectionExtended<string>): void {
    this.connections.set(conn.id, conn);
  }

  async getConnection(
    connectionId: string,
  ): Promise<IProviderConnectionExtended<string> | null> {
    return this.connections.get(connectionId) ?? null;
  }

  async updateConnection(
    connectionId: string,
    updates: Partial<IProviderConnectionExtended<string>>,
  ): Promise<void> {
    this.updates.push({ id: connectionId, updates });
    const conn = this.connections.get(connectionId);
    if (conn) {
      Object.assign(conn, updates);
    }
  }
}

class MockStatusHistoryRepo implements IStatusHistoryRepository<string> {
  public entries: IStatusHistoryEntry<string>[] = [];

  async appendEntry(entry: IStatusHistoryEntry<string>): Promise<void> {
    this.entries.push(entry);
  }

  async getEntriesByConnection(
    connectionId: string,
    _options?: IStatusHistoryQueryOptions,
  ): Promise<IStatusHistoryEntry<string>[]> {
    return this.entries.filter((e) => e.connectionId === connectionId);
  }
}

class MockCredentialService implements ICredentialService<string> {
  private credentials = new Map<string, IProviderCredentials<string>>();
  public freshness: ICredentialFreshnessResult = {
    valid: true,
    expiresInMs: 3_600_000,
  };
  public shouldThrowOnRefresh = false;

  setCredentials(
    connectionId: string,
    creds: IProviderCredentials<string>,
  ): void {
    this.credentials.set(connectionId, creds);
  }

  async storeCredentials(
    credentials: IProviderCredentials<string>,
  ): Promise<void> {
    const key =
      String(credentials.userId) + ':' + String(credentials.providerId);
    this.credentials.set(key, credentials);
  }

  async getDecryptedCredentials(
    connectionId: string,
  ): Promise<IProviderCredentials<string>> {
    const creds = this.credentials.get(connectionId);
    if (!creds) throw new Error('No credentials');
    return creds;
  }

  async deleteCredentials(_connectionId: string): Promise<void> {
    this.credentials.delete(_connectionId);
  }

  async validateCredentialFreshness(
    _connectionId: string,
  ): Promise<ICredentialFreshnessResult> {
    return this.freshness;
  }
}

class MockFailurePolicyManager implements IFailurePolicyManager<string> {
  public evaluations: Array<{ consecutiveFailures: number }> = [];
  public executedPolicies: FailurePolicyAction[] = [];

  async evaluateFailure(
    _connection: IProviderConnectionExtended<string>,
    consecutiveFailures: number,
  ): Promise<IFailureEvaluationResult> {
    this.evaluations.push({ consecutiveFailures });
    return { shouldEscalate: false };
  }

  async executePolicy(
    _connection: IProviderConnectionExtended<string>,
    action: FailurePolicyAction,
  ): Promise<void> {
    this.executedPolicies.push(action);
  }
}

function makeMockAdapter(
  result: IHeartbeatCheckResult<string>,
  overrides?: { refreshThrows?: boolean },
): ICanaryProviderAdapter<string> {
  return {
    getConfig: () =>
      ({
        id: 'provider-1',
        name: 'Test Provider',
        baseUrl: 'https://api.test.com',
        defaultLookbackMs: 86_400_000,
        minCheckIntervalMs: 60_000,
        rateLimit: { maxRequests: 100, windowMs: 60_000, minDelayMs: 100 },
      }) as ICanaryProviderConfig<string>,
    checkHeartbeat: jest.fn().mockResolvedValue(result),
    validateCredentials: jest.fn().mockResolvedValue({ valid: true }),
    refreshTokens: overrides?.refreshThrows
      ? jest.fn().mockRejectedValue(new Error('Refresh failed'))
      : jest.fn().mockResolvedValue({ accessToken: 'new-token' }),
    supportsDuressDetection: () => false,
    getSupportedDuressTypes: () => [],
    getRecommendedCheckIntervalMs: () => 60_000,
  };
}

function makeMockRegistry(
  adapter?: ICanaryProviderAdapter<string>,
): ICanaryProviderRegistry<string> {
  return {
    getProvider: (_id: string) => adapter,
    registerProvider: jest.fn(),
    unregisterProvider: jest.fn(),
    getAllProviders: () => (adapter ? [adapter] : []),
    getProvidersByCategory: () => [],
    getProviderConfigs: () => [],
    checkHeartbeat: jest.fn(),
    checkAllHeartbeats: jest.fn(),
    scheduleChecks: jest.fn(),
    cancelScheduledChecks: jest.fn(),
    getScheduledCheck: () => undefined,
    getScheduledChecksForUser: () => [],
    onStatusChange: () => () => undefined,
    handleWebhook: jest.fn(),
    registerCustomProvider: jest.fn(),
    exportProviderConfig: () => undefined,
    importProviderConfig: jest.fn(),
  } as unknown as ICanaryProviderRegistry<string>;
}

function buildService(opts: {
  connection: IProviderConnectionExtended<string>;
  adapter?: ICanaryProviderAdapter<string>;
  credentials?: IProviderCredentials<string>;
  freshness?: ICredentialFreshnessResult;
  onStatusChange?: StatusChangeCallback<string>;
  onNotify?: NotificationCallback;
}) {
  const connRepo = new MockConnectionRepo();
  connRepo.addConnection(opts.connection);

  const historyRepo = new MockStatusHistoryRepo();

  const credService = new MockCredentialService();
  if (opts.credentials) {
    credService.setCredentials(opts.connection.id, opts.credentials);
  }
  if (opts.freshness) {
    credService.freshness = opts.freshness;
  }

  const failureManager = new MockFailurePolicyManager();
  const registry = makeMockRegistry(opts.adapter);

  const service = new HealthMonitorService<string>(
    registry,
    credService,
    failureManager,
    historyRepo,
    connRepo,
    opts.onStatusChange,
    opts.onNotify,
  );

  return {
    service,
    connRepo,
    historyRepo,
    credService,
    failureManager,
    registry,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HealthMonitorService', () => {
  // Req 3.4: CHECK_FAILED vs ABSENCE visual distinction
  // Verify that different signal types are produced for failed vs absent checks
  describe('CHECK_FAILED vs ABSENCE distinction (Req 3.4)', () => {
    it('produces CHECK_FAILED for a failed API call', () => {
      const result = makeCheckResult({
        success: false,
        error: 'Network timeout',
        eventCount: 0,
      });
      expect(classifySignal(result)).toBe(HeartbeatSignalType.CHECK_FAILED);
    });

    it('produces ABSENCE for a successful call with no activity', () => {
      const result = makeCheckResult({
        success: true,
        eventCount: 0,
      });
      expect(classifySignal(result)).toBe(HeartbeatSignalType.ABSENCE);
    });

    it('CHECK_FAILED and ABSENCE are distinct signal types', () => {
      expect(HeartbeatSignalType.CHECK_FAILED).not.toBe(
        HeartbeatSignalType.ABSENCE,
      );
    });
  });

  // Req 6.6: Token refresh failure marks status "expired" and notifies user
  describe('token refresh failure (Req 6.6)', () => {
    it('marks connection as "expired" and notifies user when refresh fails', async () => {
      const notifications: Array<{ id: string; msg: string }> = [];
      const onNotify: NotificationCallback = (id, msg) => {
        notifications.push({ id, msg });
      };

      const connection = makeConnection({
        id: 'conn-refresh-fail',
      });
      const adapter = makeMockAdapter(
        makeCheckResult({ success: true, eventCount: 1 }),
        { refreshThrows: true },
      );
      const credentials = makeCredentials();

      const { service, connRepo } = buildService({
        connection,
        adapter,
        credentials,
        // Token expires in 5 minutes — within the 10-minute refresh window
        freshness: { valid: true, expiresInMs: 300_000 },
        onNotify,
      });

      const refreshed =
        await service.refreshTokensIfNeeded('conn-refresh-fail');

      expect(refreshed).toBe(false);
      // Connection should be marked as "expired"
      const updatedConn = await connRepo.getConnection('conn-refresh-fail');
      expect(updatedConn?.status).toBe('expired');
      // User should be notified
      expect(notifications).toHaveLength(1);
      expect(notifications[0].msg).toContain('re-authenticate');
    });
  });

  // Req 3.6: Retry during feed failure state
  describe('retry during feed failure (Req 3.6)', () => {
    it('continues executing checks even after CHECK_FAILED results', async () => {
      const connection = makeConnection({
        id: 'conn-retry',
        consecutiveFailures: 3,
        lastCheckSignalType: HeartbeatSignalType.CHECK_FAILED,
      });

      // First call fails, second succeeds
      let callCount = 0;
      const adapter = makeMockAdapter(makeCheckResult());
      (adapter.checkHeartbeat as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            makeCheckResult({
              success: false,
              error: 'Temporary failure',
              eventCount: 0,
              signalType: HeartbeatSignalType.CHECK_FAILED,
            }),
          );
        }
        return Promise.resolve(
          makeCheckResult({
            success: true,
            eventCount: 5,
            signalType: HeartbeatSignalType.PRESENCE,
          }),
        );
      });

      const credentials = makeCredentials();
      const { service, connRepo } = buildService({
        connection,
        adapter,
        credentials,
        freshness: { valid: true, expiresInMs: 3_600_000 },
      });

      // First check — fails
      const result1 = await service.executeCheck('conn-retry');
      expect(classifySignal(result1)).toBe(HeartbeatSignalType.CHECK_FAILED);

      // Connection should have incremented failures
      const afterFail = await connRepo.getConnection('conn-retry');
      expect(afterFail!.consecutiveFailures).toBe(4);

      // Second check — succeeds (retry works)
      const result2 = await service.executeCheck('conn-retry');
      expect(classifySignal(result2)).toBe(HeartbeatSignalType.PRESENCE);

      // Failures should be reset
      const afterSuccess = await connRepo.getConnection('conn-retry');
      expect(afterSuccess!.consecutiveFailures).toBe(0);
      expect(afterSuccess!.status).toBe('connected');
    });
  });

  // Status change events
  describe('status change events', () => {
    it('emits event when signal type transitions', async () => {
      const events: Array<{
        previousSignalType: HeartbeatSignalType | undefined;
        currentSignalType: HeartbeatSignalType;
      }> = [];

      const onStatusChange: StatusChangeCallback<string> = (event) => {
        events.push({
          previousSignalType: event.previousSignalType,
          currentSignalType: event.currentSignalType,
        });
      };

      const connection = makeConnection({
        id: 'conn-events',
        lastCheckSignalType: HeartbeatSignalType.PRESENCE,
      });

      // Return ABSENCE (transition from PRESENCE)
      const adapter = makeMockAdapter(
        makeCheckResult({
          success: true,
          eventCount: 0,
          signalType: HeartbeatSignalType.ABSENCE,
        }),
      );

      const credentials = makeCredentials();
      const { service } = buildService({
        connection,
        adapter,
        credentials,
        freshness: { valid: true, expiresInMs: 3_600_000 },
        onStatusChange,
      });

      await service.executeCheck('conn-events');

      expect(events).toHaveLength(1);
      expect(events[0].previousSignalType).toBe(HeartbeatSignalType.PRESENCE);
      expect(events[0].currentSignalType).toBe(HeartbeatSignalType.ABSENCE);
    });
  });

  // Start/stop monitoring
  describe('startMonitoring / stopMonitoring', () => {
    it('starts and stops without error', async () => {
      const connection = makeConnection({ id: 'conn-monitor' });
      const adapter = makeMockAdapter(makeCheckResult());
      const credentials = makeCredentials();

      const { service } = buildService({
        connection,
        adapter,
        credentials,
      });

      await service.startMonitoring('conn-monitor');
      // Should not throw on duplicate start
      await service.startMonitoring('conn-monitor');
      await service.stopMonitoring('conn-monitor');
      // Should not throw on stop when not monitoring
      await service.stopMonitoring('conn-monitor');
    });
  });
});
