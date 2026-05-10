/**
 * Unit/integration tests for AnalyticsController API endpoints.
 *
 * Tests the controller's handler logic by calling the private handler methods
 * through mock request/response objects, since the controller extends BaseController
 * which requires a full IApplication setup for router-based testing.
 *
 * Feature: heartbeat-history-analytics
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
import type {
  IProviderConnectionExtended,
  IStatusHistoryEntry,
} from '@brightchain/digitalburnbag-lib';
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import type { IAnalyticsControllerDeps } from '../../controllers/analytics-controller';
import { AnalyticsController } from '../../controllers/analytics-controller';
import type {
  IConnectionRepository,
  IStatusHistoryRepository,
} from '../../services/health-monitor-service';

// ---------------------------------------------------------------------------
// Mock factories
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
    providerUsername: 'testuser',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeEntry(
  overrides?: Partial<IStatusHistoryEntry<string>>,
): IStatusHistoryEntry<string> {
  return {
    id: 'entry-1',
    connectionId: 'conn-1',
    userId: 'user-1',
    timestamp: new Date('2024-01-15T12:00:00Z'),
    signalType: HeartbeatSignalType.PRESENCE,
    eventCount: 1,
    confidence: 0.9,
    timeSinceLastActivityMs: 5000,
    createdAt: new Date('2024-01-15T12:00:00Z'),
    ...overrides,
  };
}

class MockStatusHistoryRepo implements IStatusHistoryRepository<string> {
  private entries: IStatusHistoryEntry<string>[] = [];

  setEntries(entries: IStatusHistoryEntry<string>[]): void {
    this.entries = entries;
  }

  async appendEntry(_entry: IStatusHistoryEntry<string>): Promise<void> {
    // no-op for tests
  }

  async getEntriesByConnection(
    _connectionId: string,
    _options?: {
      since?: Date;
      until?: Date;
      signalTypes?: HeartbeatSignalType[];
    },
  ): Promise<IStatusHistoryEntry<string>[]> {
    return this.entries;
  }
}

class MockConnectionRepo implements IConnectionRepository<string> {
  private connections = new Map<string, IProviderConnectionExtended<string>>();

  addConnection(conn: IProviderConnectionExtended<string>): void {
    this.connections.set(conn.id, conn);
  }

  async getConnection(
    connectionId: string,
  ): Promise<IProviderConnectionExtended<string> | null> {
    return this.connections.get(connectionId) ?? null;
  }

  async updateConnection(
    _connectionId: string,
    _updates: Partial<IProviderConnectionExtended<string>>,
  ): Promise<void> {
    // no-op
  }
}

/**
 * Since AnalyticsController extends BaseController which requires IApplication,
 * we test the handler logic by accessing the private handler methods via
 * the controller instance. We use (controller as any) to call the private methods
 * directly with mock Express Request objects.
 */
function createMockRequest(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    user: { id: 'user-1', username: 'testuser' },
    params: {},
    query: {},
    headers: {},
    body: {},
    ...overrides,
  };
}

function createTestSetup() {
  const statusHistoryRepo = new MockStatusHistoryRepo();
  const connectionRepo = new MockConnectionRepo();

  const deps: IAnalyticsControllerDeps<string> = {
    statusHistoryRepo,
    connectionRepo,
    parseId: (id: string) => id,
    parseSafeId: (id: string) => id || undefined,
  };

  // Create a minimal stub application that satisfies BaseController
  const application = {
    authenticationMiddleware: (
      _req: unknown,
      _res: unknown,
      next: () => void,
    ) => next(),
    cryptoAuthenticationMiddleware: (
      _req: unknown,
      _res: unknown,
      next: () => void,
    ) => next(),
    environment: { enabledFeatures: [] },
    authProvider: {
      verifyToken: async (token: string) => ({ userId: token }),
      findUserById: async (userId: string) => ({
        id: userId,
        accountStatus: 'Active',
        email: 'test@example.com',
        timezone: 'UTC',
      }),
      buildRequestUserDTO: async (userId: string) => ({
        id: userId,
        username: userId,
        email: 'test@example.com',
        roles: [],
        timezone: 'UTC',
        siteLanguage: 'en-US',
      }),
    },
    constants: {},
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controller = new AnalyticsController(application as any, deps as any);

  return { controller, statusHistoryRepo, connectionRepo, deps };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AnalyticsController', () => {
  // Helper to call private handler methods

  function callHandler(
    controller: any,
    methodName: string,
    req: Record<string, unknown>,
  ) {
    return controller[methodName](req);
  }

  // -----------------------------------------------------------------------
  // 403 for non-owner on all analytics endpoints (Req 9.6)
  // -----------------------------------------------------------------------
  describe('403 for non-owner', () => {
    it('should return 403 for timeseries when user does not own connection', async () => {
      const { controller, connectionRepo } = createTestSetup();
      connectionRepo.addConnection(
        makeConnection({ id: 'conn-1', userId: 'other-user' }),
      );

      const req = createMockRequest({
        user: { id: 'user-1' },
        params: { id: 'conn-1' },
        query: { since: '2024-01-01T00:00:00Z', until: '2024-01-02T00:00:00Z' },
      });

      const result = await callHandler(controller, 'handleGetTimeseries', req);
      expect(result.statusCode).toBe(403);
      expect(result.response).toEqual(
        expect.objectContaining({ message: 'Forbidden' }),
      );
    });

    it('should return 403 for stats when user does not own connection', async () => {
      const { controller, connectionRepo } = createTestSetup();
      connectionRepo.addConnection(
        makeConnection({ id: 'conn-1', userId: 'other-user' }),
      );

      const req = createMockRequest({
        user: { id: 'user-1' },
        params: { id: 'conn-1' },
        query: {},
      });

      const result = await callHandler(controller, 'handleGetStats', req);
      expect(result.statusCode).toBe(403);
    });

    it('should return 403 for heatmap when user does not own connection', async () => {
      const { controller, connectionRepo } = createTestSetup();
      connectionRepo.addConnection(
        makeConnection({ id: 'conn-1', userId: 'other-user' }),
      );

      const req = createMockRequest({
        user: { id: 'user-1' },
        params: { id: 'conn-1' },
        query: {},
      });

      const result = await callHandler(controller, 'handleGetHeatmap', req);
      expect(result.statusCode).toBe(403);
    });

    it('should return 403 for streak when user does not own connection', async () => {
      const { controller, connectionRepo } = createTestSetup();
      connectionRepo.addConnection(
        makeConnection({ id: 'conn-1', userId: 'other-user' }),
      );

      const req = createMockRequest({
        user: { id: 'user-1' },
        params: { id: 'conn-1' },
        query: {},
      });

      const result = await callHandler(controller, 'handleGetStreak', req);
      expect(result.statusCode).toBe(403);
    });

    it('should return 403 for compare when user does not own one of the connections', async () => {
      const { controller, connectionRepo } = createTestSetup();
      connectionRepo.addConnection(
        makeConnection({ id: 'conn-1', userId: 'user-1' }),
      );
      connectionRepo.addConnection(
        makeConnection({ id: 'conn-2', userId: 'other-user' }),
      );

      const req = createMockRequest({
        user: { id: 'user-1' },
        params: {},
        query: {
          connectionIds: 'conn-1,conn-2',
          since: '2024-01-01T00:00:00Z',
          until: '2024-01-02T00:00:00Z',
        },
      });

      const result = await callHandler(controller, 'handleGetCompare', req);
      expect(result.statusCode).toBe(403);
    });

    it('should return 403 for export when user does not own connection', async () => {
      const { controller, connectionRepo } = createTestSetup();
      connectionRepo.addConnection(
        makeConnection({ id: 'conn-1', userId: 'other-user' }),
      );

      const req = createMockRequest({
        user: { id: 'user-1' },
        params: { id: 'conn-1' },
        query: { format: 'csv' },
      });

      const result = await callHandler(controller, 'handleGetExport', req);
      expect(result.statusCode).toBe(403);
    });
  });

  // -----------------------------------------------------------------------
  // 400 for invalid params
  // -----------------------------------------------------------------------
  describe('400 for invalid params', () => {
    it('should return 400 for timeseries with since > until', async () => {
      const { controller, connectionRepo } = createTestSetup();
      connectionRepo.addConnection(makeConnection());

      const req = createMockRequest({
        params: { id: 'conn-1' },
        query: {
          since: '2024-01-10T00:00:00Z',
          until: '2024-01-01T00:00:00Z',
        },
      });

      const result = await callHandler(controller, 'handleGetTimeseries', req);
      expect(result.statusCode).toBe(400);
      expect(result.response).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('since must be before until'),
        }),
      );
    });

    it('should return 400 for timeseries when since/until are missing', async () => {
      const { controller, connectionRepo } = createTestSetup();
      connectionRepo.addConnection(makeConnection());

      const req = createMockRequest({
        params: { id: 'conn-1' },
        query: {},
      });

      const result = await callHandler(controller, 'handleGetTimeseries', req);
      expect(result.statusCode).toBe(400);
      expect(result.response).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('since and until'),
        }),
      );
    });

    it('should return 400 for compare with >5 connections', async () => {
      const { controller, connectionRepo } = createTestSetup();
      for (let i = 1; i <= 6; i++) {
        connectionRepo.addConnection(
          makeConnection({ id: `conn-${i}`, userId: 'user-1' }),
        );
      }

      const req = createMockRequest({
        params: {},
        query: {
          connectionIds: 'conn-1,conn-2,conn-3,conn-4,conn-5,conn-6',
          since: '2024-01-01T00:00:00Z',
          until: '2024-01-02T00:00:00Z',
        },
      });

      const result = await callHandler(controller, 'handleGetCompare', req);
      expect(result.statusCode).toBe(400);
      expect(result.response).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('Maximum 5'),
        }),
      );
    });

    it('should return 400 for compare with since > until', async () => {
      const { controller, connectionRepo } = createTestSetup();
      connectionRepo.addConnection(
        makeConnection({ id: 'conn-1', userId: 'user-1' }),
      );

      const req = createMockRequest({
        params: {},
        query: {
          connectionIds: 'conn-1',
          since: '2024-01-10T00:00:00Z',
          until: '2024-01-01T00:00:00Z',
        },
      });

      const result = await callHandler(controller, 'handleGetCompare', req);
      expect(result.statusCode).toBe(400);
      expect(result.response).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('since must be before until'),
        }),
      );
    });

    it('should return 400 for compare without connectionIds', async () => {
      const { controller } = createTestSetup();

      const req = createMockRequest({
        params: {},
        query: {
          since: '2024-01-01T00:00:00Z',
          until: '2024-01-02T00:00:00Z',
        },
      });

      const result = await callHandler(controller, 'handleGetCompare', req);
      expect(result.statusCode).toBe(400);
      expect(result.response).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('connectionIds'),
        }),
      );
    });

    it('should return 400 for export with invalid format', async () => {
      const { controller, connectionRepo } = createTestSetup();
      connectionRepo.addConnection(makeConnection());

      const req = createMockRequest({
        params: { id: 'conn-1' },
        query: { format: 'xml' },
      });

      const result = await callHandler(controller, 'handleGetExport', req);
      expect(result.statusCode).toBe(400);
      expect(result.response).toEqual(
        expect.objectContaining({
          message: expect.stringContaining("'csv' or 'json'"),
        }),
      );
    });

    it('should return 400 for export with missing format', async () => {
      const { controller, connectionRepo } = createTestSetup();
      connectionRepo.addConnection(makeConnection());

      const req = createMockRequest({
        params: { id: 'conn-1' },
        query: {},
      });

      const result = await callHandler(controller, 'handleGetExport', req);
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for invalid connection ID', async () => {
      const { controller, deps } = createTestSetup();
      // Override parseSafeId to return undefined for bad IDs
      deps.parseSafeId = (id: string) => (id === 'bad-id' ? undefined : id);

      const req = createMockRequest({
        params: { id: 'bad-id' },
        query: { since: '2024-01-01T00:00:00Z', until: '2024-01-02T00:00:00Z' },
      });

      const result = await callHandler(controller, 'handleGetTimeseries', req);
      expect(result.statusCode).toBe(400);
      expect(result.response).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('Invalid connection ID'),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // 404 for missing connection
  // -----------------------------------------------------------------------
  describe('404 for missing connection', () => {
    it('should return 404 when connection does not exist', async () => {
      const { controller } = createTestSetup();
      // connectionRepo is empty — no connections added

      const req = createMockRequest({
        params: { id: 'nonexistent' },
        query: { since: '2024-01-01T00:00:00Z', until: '2024-01-02T00:00:00Z' },
      });

      const result = await callHandler(controller, 'handleGetTimeseries', req);
      expect(result.statusCode).toBe(404);
      expect(result.response).toEqual(
        expect.objectContaining({ message: 'Connection not found' }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // 401 for unauthenticated requests
  // -----------------------------------------------------------------------
  describe('401 for unauthenticated', () => {
    it('should return 401 when user is not authenticated', async () => {
      const { controller } = createTestSetup();

      const req = createMockRequest({
        user: { id: undefined },
        params: { id: 'conn-1' },
        query: {},
      });

      const result = await callHandler(controller, 'handleGetTimeseries', req);
      expect(result.statusCode).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // 200 with correct response shape for each endpoint (Req 9.1–9.5)
  // -----------------------------------------------------------------------
  describe('200 with correct response shape', () => {
    const since = '2024-01-15T00:00:00Z';
    const until = '2024-01-15T12:00:00Z';

    function setupWithEntries() {
      const { controller, statusHistoryRepo, connectionRepo } =
        createTestSetup();
      connectionRepo.addConnection(makeConnection());
      statusHistoryRepo.setEntries([
        makeEntry({
          id: 'e1',
          timestamp: new Date('2024-01-15T03:00:00Z'),
          signalType: HeartbeatSignalType.PRESENCE,
          confidence: 0.9,
          timeSinceLastActivityMs: 5000,
        }),
        makeEntry({
          id: 'e2',
          timestamp: new Date('2024-01-15T06:00:00Z'),
          signalType: HeartbeatSignalType.ABSENCE,
          confidence: 0.8,
          timeSinceLastActivityMs: null,
        }),
        makeEntry({
          id: 'e3',
          timestamp: new Date('2024-01-15T09:00:00Z'),
          signalType: HeartbeatSignalType.CHECK_FAILED,
          confidence: 0.5,
          timeSinceLastActivityMs: null,
          httpStatusCode: 500,
          errorMessage: 'Server error',
        }),
      ]);
      return { controller, statusHistoryRepo, connectionRepo };
    }

    it('should return 200 with ITimeBucket[] for timeseries', async () => {
      const { controller } = setupWithEntries();

      const req = createMockRequest({
        params: { id: 'conn-1' },
        query: { since, until },
      });

      const result = await callHandler(controller, 'handleGetTimeseries', req);
      expect(result.statusCode).toBe(200);

      const buckets = result.response as unknown[];
      expect(Array.isArray(buckets)).toBe(true);
      expect(buckets.length).toBeGreaterThan(0);

      // Verify bucket shape
      const bucket = (buckets as Record<string, unknown>[])[0];
      expect(bucket).toHaveProperty('bucketStart');
      expect(bucket).toHaveProperty('bucketEnd');
      expect(bucket).toHaveProperty('signalCounts');
      expect(bucket).toHaveProperty('totalCount');
      expect(bucket).toHaveProperty('averageConfidence');
      expect(bucket).toHaveProperty('dominantSignalType');
    });

    it('should return 200 with IAggregateStats for stats', async () => {
      const { controller } = setupWithEntries();

      const req = createMockRequest({
        params: { id: 'conn-1' },
        query: { since, until },
      });

      const result = await callHandler(controller, 'handleGetStats', req);
      expect(result.statusCode).toBe(200);

      const stats = result.response as Record<string, unknown>;
      expect(stats).toHaveProperty('uptimePercentage');
      expect(stats).toHaveProperty('averageResponseTimeMs');
      expect(stats).toHaveProperty('failureRate');
      expect(stats).toHaveProperty('mtbfMs');
      expect(stats).toHaveProperty('failureRateTrend');
      expect(stats).toHaveProperty('totalCheckCount');
      expect(stats).toHaveProperty('signalDistribution');
      expect(stats.totalCheckCount).toBe(3);
    });

    it('should return 200 with IHeatmapDay[] for heatmap', async () => {
      const { controller } = setupWithEntries();

      const req = createMockRequest({
        params: { id: 'conn-1' },
        query: { since, until },
      });

      const result = await callHandler(controller, 'handleGetHeatmap', req);
      expect(result.statusCode).toBe(200);

      const days = result.response as unknown[];
      expect(Array.isArray(days)).toBe(true);
      expect(days.length).toBeGreaterThan(0);

      const day = (days as Record<string, unknown>[])[0];
      expect(day).toHaveProperty('date');
      expect(day).toHaveProperty('dominantSignalType');
      expect(day).toHaveProperty('totalCount');
      expect(day).toHaveProperty('signalCounts');
    });

    it('should return 200 with IStreakInfo for streak', async () => {
      const { controller } = setupWithEntries();

      const req = createMockRequest({
        params: { id: 'conn-1' },
        query: {},
      });

      const result = await callHandler(controller, 'handleGetStreak', req);
      expect(result.statusCode).toBe(200);

      const streak = result.response as Record<string, unknown>;
      expect(streak).toHaveProperty('currentStreakCount');
      expect(streak).toHaveProperty('currentStreakSignalType');
      expect(streak).toHaveProperty('longestAbsenceDurationMs');
      expect(streak).toHaveProperty('timeSinceLastPresenceMs');
    });

    it('should return 200 with IComparisonDataset[] for compare', async () => {
      const { controller, connectionRepo, statusHistoryRepo } =
        createTestSetup();
      connectionRepo.addConnection(
        makeConnection({ id: 'conn-1', userId: 'user-1' }),
      );
      connectionRepo.addConnection(
        makeConnection({
          id: 'conn-2',
          userId: 'user-1',
          providerUsername: 'user2',
        }),
      );
      statusHistoryRepo.setEntries([
        makeEntry({ timestamp: new Date('2024-01-15T06:00:00Z') }),
      ]);

      const req = createMockRequest({
        params: {},
        query: {
          connectionIds: 'conn-1,conn-2',
          since,
          until,
        },
      });

      const result = await callHandler(controller, 'handleGetCompare', req);
      expect(result.statusCode).toBe(200);

      const datasets = result.response as Record<string, unknown>[];
      expect(Array.isArray(datasets)).toBe(true);
      expect(datasets.length).toBe(2);

      const dataset = datasets[0];
      expect(dataset).toHaveProperty('connectionId');
      expect(dataset).toHaveProperty('connectionName');
      expect(dataset).toHaveProperty('buckets');
      expect(Array.isArray(dataset.buckets)).toBe(true);
    });

    it('should return 200 with empty data when no entries exist', async () => {
      const { controller, connectionRepo } = createTestSetup();
      connectionRepo.addConnection(makeConnection());
      // statusHistoryRepo has no entries by default

      const req = createMockRequest({
        params: { id: 'conn-1' },
        query: { since, until },
      });

      const result = await callHandler(controller, 'handleGetStats', req);
      expect(result.statusCode).toBe(200);

      const stats = result.response as Record<string, unknown>;
      expect(stats.totalCheckCount).toBe(0);
      expect(stats.uptimePercentage).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Export Content-Type and Content-Disposition headers (Req 2.6, 9.5)
  // -----------------------------------------------------------------------
  describe('export headers', () => {
    function setupForExport() {
      const { controller, statusHistoryRepo, connectionRepo } =
        createTestSetup();
      connectionRepo.addConnection(makeConnection());
      statusHistoryRepo.setEntries([
        makeEntry({
          timestamp: new Date('2024-01-15T06:00:00Z'),
          signalType: HeartbeatSignalType.PRESENCE,
        }),
      ]);
      return { controller };
    }

    it('should return CSV export with correct content type and disposition', async () => {
      const { controller } = setupForExport();

      const req = createMockRequest({
        params: { id: 'conn-1' },
        query: { format: 'csv' },
      });

      const result = await callHandler(controller, 'handleGetExport', req);
      expect(result.statusCode).toBe(200);

      const response = result.response as Record<string, unknown>;
      expect(response._contentType).toBe('text/csv');
      expect(response._contentDisposition).toMatch(
        /attachment; filename="history-conn-1\.csv"/,
      );
      expect(typeof response._exportData).toBe('string');

      // Verify CSV has header + data rows
      const csv = response._exportData as string;
      const lines = csv.split('\n');
      expect(lines[0]).toBe(
        'timestamp,signalType,eventCount,confidence,timeSinceLastActivityMs,httpStatusCode,errorMessage',
      );
      expect(lines.length).toBe(2); // header + 1 entry
    });

    it('should return JSON export with correct content type and disposition', async () => {
      const { controller } = setupForExport();

      const req = createMockRequest({
        params: { id: 'conn-1' },
        query: { format: 'json' },
      });

      const result = await callHandler(controller, 'handleGetExport', req);
      expect(result.statusCode).toBe(200);

      const response = result.response as Record<string, unknown>;
      expect(response._contentType).toBe('application/json');
      expect(response._contentDisposition).toMatch(
        /attachment; filename="history-conn-1\.json"/,
      );
      expect(typeof response._exportData).toBe('string');

      // Verify valid JSON
      const parsed = JSON.parse(response._exportData as string);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });
  });
});
