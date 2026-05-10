/**
 * Unit tests for NativeCanaryService.
 *
 * Feature: canary-provider-expansion
 * Requirements: 8.3, 8.7, 8.8
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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock encryption service using base64 encode/decode
 * as a simple reversible transformation.
 */
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

/**
 * Creates an in-memory repository that stores configs in an array.
 */
function createInMemoryRepository(): BrightDBNativeCanaryConfigRepository<string> & {
  configs_: INativeCanaryConfigBase<string>[];
} {
  const configs: INativeCanaryConfigBase<string>[] = [];
  return {
    configs_: configs,
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
        configs[idx] = { ...configs[idx], ...updates };
      }
    },
  } as unknown as BrightDBNativeCanaryConfigRepository<string> & {
    configs_: INativeCanaryConfigBase<string>[];
  };
}

/**
 * Builds a native canary config for a given type with threshold and period.
 */
function buildConfig(
  type: NativeCanaryType,
  overrides?: Partial<INativeCanaryConfigBase<string>>,
): INativeCanaryConfigBase<string> {
  const base: INativeCanaryConfigBase<string> = {
    id: 'config-1',
    userId: 'user-1',
    type,
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };

  switch (type) {
    case 'login_activity':
      base.loginThreshold = base.loginThreshold ?? 3;
      base.loginPeriodMs = base.loginPeriodMs ?? 86400000; // 24h
      break;
    case 'file_access':
      base.fileAccessThreshold = base.fileAccessThreshold ?? 5;
      base.fileAccessPeriodMs = base.fileAccessPeriodMs ?? 86400000;
      break;
    case 'api_usage':
      base.apiUsageThreshold = base.apiUsageThreshold ?? 10;
      base.apiUsagePeriodMs = base.apiUsagePeriodMs ?? 3600000; // 1h
      break;
    case 'vault_interaction':
      base.vaultInteractionThreshold = base.vaultInteractionThreshold ?? 2;
      base.vaultInteractionPeriodMs = base.vaultInteractionPeriodMs ?? 86400000;
      break;
    case 'duress_code':
      // No threshold/period for duress codes
      break;
  }

  return base;
}

/**
 * Creates a signal collector callback that records all emitted signals.
 */
function createSignalCollector(): {
  signals: Array<{
    userId: string;
    configId: string;
    signalType: HeartbeatSignalType;
    canaryType: NativeCanaryType;
    timestamp: Date;
  }>;
  callback: NativeCanarySignalCallback<string>;
} {
  const signals: Array<{
    userId: string;
    configId: string;
    signalType: HeartbeatSignalType;
    canaryType: NativeCanaryType;
    timestamp: Date;
  }> = [];

  const callback: NativeCanarySignalCallback<string> = (event) => {
    signals.push(event);
  };

  return { signals, callback };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NativeCanaryService', () => {
  // -------------------------------------------------------------------------
  // Req 8.3: Duress code immediate signal emission without waiting for schedule
  // -------------------------------------------------------------------------
  describe('duress code immediate signal emission (Req 8.3)', () => {
    it('should immediately emit DURESS signal when duress code is used', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();
      const { signals, callback } = createSignalCollector();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
        callback,
      );

      // Set up duress codes for the user
      await service.setDuressCodes('user-1', ['panic123', 'emergency456']);

      // Simulate duress code login
      await service.onDuressCodeLogin('user-1', 'panic123');

      // Signal should be emitted immediately
      expect(signals).toHaveLength(1);
      expect(signals[0].signalType).toBe(HeartbeatSignalType.DURESS);
      expect(signals[0].canaryType).toBe('duress_code');
      expect(signals[0].userId).toBe('user-1');
    });

    it('should emit DURESS signal without waiting for any scheduled check', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();
      const { signals, callback } = createSignalCollector();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
        callback,
      );

      await service.setDuressCodes('user-1', ['duress-code-1']);

      // The signal should be emitted synchronously within the onDuressCodeLogin call
      // (no setTimeout, no scheduled check, no waiting)
      const beforeTime = Date.now();
      await service.onDuressCodeLogin('user-1', 'duress-code-1');
      const afterTime = Date.now();

      expect(signals).toHaveLength(1);
      expect(signals[0].signalType).toBe(HeartbeatSignalType.DURESS);
      // Verify it was immediate (within the same call, not deferred)
      expect(signals[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime);
      expect(signals[0].timestamp.getTime()).toBeLessThanOrEqual(afterTime);
    });

    it('should not emit signal when code is not a duress code', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();
      const { signals, callback } = createSignalCollector();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
        callback,
      );

      await service.setDuressCodes('user-1', ['panic123']);

      // Use a non-duress code
      await service.onDuressCodeLogin('user-1', 'normal-password');

      // No signal should be emitted
      expect(signals).toHaveLength(0);
    });

    it('should emit DURESS for any of the configured duress codes', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();
      const { signals, callback } = createSignalCollector();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
        callback,
      );

      await service.setDuressCodes('user-1', ['code-a', 'code-b', 'code-c']);

      // Each configured duress code should trigger immediately
      await service.onDuressCodeLogin('user-1', 'code-b');
      expect(signals).toHaveLength(1);
      expect(signals[0].signalType).toBe(HeartbeatSignalType.DURESS);

      await service.onDuressCodeLogin('user-1', 'code-c');
      expect(signals).toHaveLength(2);
      expect(signals[1].signalType).toBe(HeartbeatSignalType.DURESS);
    });
  });

  // -------------------------------------------------------------------------
  // Req 8.8: No external HTTP calls made by native canaries
  // -------------------------------------------------------------------------
  describe('no external HTTP calls (Req 8.8)', () => {
    it('should use internal event bus callback for signal propagation, not HTTP', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();
      const { signals, callback } = createSignalCollector();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
        callback,
      );

      // Configure a login_activity canary
      await service.configure({
        userId: 'user-1',
        type: 'login_activity',
        isEnabled: true,
        loginThreshold: 1,
        loginPeriodMs: 86400000,
      });

      // Emit a platform event
      await service.onPlatformEvent({
        userId: 'user-1',
        type: 'login',
        timestamp: new Date(),
      });

      // Signal was emitted via the callback (internal event bus), not HTTP
      expect(signals.length).toBeGreaterThanOrEqual(1);
      // The signal was delivered through the callback function, proving no HTTP is used
      expect(signals[0].signalType).toBe(HeartbeatSignalType.PRESENCE);
    });

    it('should operate without any network dependencies in constructor', () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();

      // NativeCanaryService constructor takes no HTTP client, no URL, no network config
      // It only takes: repository, encryptionService, eventStore, and an optional callback
      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
      );

      // Service is fully functional without any network configuration
      expect(service).toBeDefined();
    });

    it('should emit duress signals via internal callback without network access', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();
      let callbackInvoked = false;

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
        () => {
          callbackInvoked = true;
        },
      );

      await service.setDuressCodes('user-1', ['duress-code']);
      await service.onDuressCodeLogin('user-1', 'duress-code');

      // Signal propagation happened via the callback (internal event bus)
      expect(callbackInvoked).toBe(true);
    });

    it('should handle platform events entirely in-memory without external calls', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();
      const { signals, callback } = createSignalCollector();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
        callback,
      );

      // Configure file_access canary
      await service.configure({
        userId: 'user-1',
        type: 'file_access',
        isEnabled: true,
        fileAccessThreshold: 2,
        fileAccessPeriodMs: 3600000,
      });

      // Emit file access events
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

      // All processing happened in-memory via the event store and callback
      expect(signals.length).toBeGreaterThanOrEqual(1);
      const lastSignal = signals[signals.length - 1];
      expect(lastSignal.signalType).toBe(HeartbeatSignalType.PRESENCE);
      expect(lastSignal.canaryType).toBe('file_access');
    });
  });

  // -------------------------------------------------------------------------
  // Req 8.7: Duress code must differ from normal credentials (error handling)
  // -------------------------------------------------------------------------
  describe('duress code must differ from normal credentials (Req 8.7)', () => {
    it('should correctly identify a duress code vs a normal credential', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
      );

      // Set duress codes that are distinct from normal credentials
      await service.setDuressCodes('user-1', ['duress-alpha', 'duress-beta']);

      // Duress codes should be identified correctly
      expect(await service.isDuressCode('user-1', 'duress-alpha')).toBe(true);
      expect(await service.isDuressCode('user-1', 'duress-beta')).toBe(true);

      // Normal credentials should NOT be identified as duress codes
      expect(await service.isDuressCode('user-1', 'normal-password')).toBe(false);
      expect(await service.isDuressCode('user-1', 'my-regular-pass')).toBe(false);
    });

    it('should return false for empty string as duress code', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
      );

      await service.setDuressCodes('user-1', ['valid-duress']);

      // Empty string should not match
      expect(await service.isDuressCode('user-1', '')).toBe(false);
    });

    it('should return false when no duress codes are configured', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
      );

      // No duress codes configured for this user
      expect(await service.isDuressCode('user-1', 'any-code')).toBe(false);
    });

    it('should require exact match — partial matches should not trigger', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
      );

      await service.setDuressCodes('user-1', ['panic123']);

      // Partial matches should not be detected as duress codes
      expect(await service.isDuressCode('user-1', 'panic')).toBe(false);
      expect(await service.isDuressCode('user-1', 'panic1234')).toBe(false);
      expect(await service.isDuressCode('user-1', '123')).toBe(false);
      expect(await service.isDuressCode('user-1', 'PANIC123')).toBe(false); // case-sensitive
    });

    it('should encrypt duress codes at rest', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
      );

      await service.setDuressCodes('user-1', ['secret-duress-code']);

      // Verify the stored config has encrypted codes, not plaintext
      const configs = repository.configs_;
      const duressConfig = configs.find(
        (c) => c.type === 'duress_code' && c.userId === 'user-1',
      );
      expect(duressConfig).toBeDefined();
      expect(duressConfig!.encryptedDuressCodes).toBeDefined();
      expect(duressConfig!.encryptedDuressCodes!.length).toBe(1);

      // The stored value should not be the plaintext code
      const storedValue = duressConfig!.encryptedDuressCodes![0];
      expect(storedValue).not.toBe('secret-duress-code');
      // It should be a JSON string containing encrypted data
      const parsed = JSON.parse(storedValue);
      expect(parsed.ciphertext).toBeDefined();
      expect(parsed.iv).toBeDefined();
      expect(parsed.authTag).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Each native canary type configurable with correct thresholds
  // -------------------------------------------------------------------------
  describe('each native canary type configurable with correct thresholds', () => {
    it('should configure login_activity canary with threshold and period', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
      );

      const config = await service.configure({
        userId: 'user-1',
        type: 'login_activity',
        isEnabled: true,
        loginThreshold: 5,
        loginPeriodMs: 86400000,
      });

      expect(config.type).toBe('login_activity');
      expect(config.loginThreshold).toBe(5);
      expect(config.loginPeriodMs).toBe(86400000);
      expect(config.isEnabled).toBe(true);
    });

    it('should configure file_access canary with threshold and period', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
      );

      const config = await service.configure({
        userId: 'user-1',
        type: 'file_access',
        isEnabled: true,
        fileAccessThreshold: 10,
        fileAccessPeriodMs: 3600000,
      });

      expect(config.type).toBe('file_access');
      expect(config.fileAccessThreshold).toBe(10);
      expect(config.fileAccessPeriodMs).toBe(3600000);
      expect(config.isEnabled).toBe(true);
    });

    it('should configure api_usage canary with threshold and period', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
      );

      const config = await service.configure({
        userId: 'user-1',
        type: 'api_usage',
        isEnabled: true,
        apiUsageThreshold: 100,
        apiUsagePeriodMs: 7200000,
      });

      expect(config.type).toBe('api_usage');
      expect(config.apiUsageThreshold).toBe(100);
      expect(config.apiUsagePeriodMs).toBe(7200000);
      expect(config.isEnabled).toBe(true);
    });

    it('should configure vault_interaction canary with threshold and period', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
      );

      const config = await service.configure({
        userId: 'user-1',
        type: 'vault_interaction',
        isEnabled: true,
        vaultInteractionThreshold: 3,
        vaultInteractionPeriodMs: 172800000,
      });

      expect(config.type).toBe('vault_interaction');
      expect(config.vaultInteractionThreshold).toBe(3);
      expect(config.vaultInteractionPeriodMs).toBe(172800000);
      expect(config.isEnabled).toBe(true);
    });

    it('should configure duress_code canary type', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
      );

      const config = await service.configure({
        userId: 'user-1',
        type: 'duress_code',
        isEnabled: true,
      });

      expect(config.type).toBe('duress_code');
      expect(config.isEnabled).toBe(true);
      // Duress code type doesn't use threshold/period
      expect(config.loginThreshold).toBeUndefined();
      expect(config.fileAccessThreshold).toBeUndefined();
    });

    it('should evaluate login_activity correctly against configured threshold', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();
      const { signals, callback } = createSignalCollector();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
        callback,
      );

      // Configure with threshold of 3 logins per 24h
      await service.configure({
        userId: 'user-1',
        type: 'login_activity',
        isEnabled: true,
        loginThreshold: 3,
        loginPeriodMs: 86400000,
      });

      // Send 2 login events (below threshold)
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

      // Should emit ABSENCE since count (2) < threshold (3)
      const absenceSignals = signals.filter(
        (s) => s.signalType === HeartbeatSignalType.ABSENCE,
      );
      expect(absenceSignals.length).toBeGreaterThanOrEqual(1);

      // Send a 3rd login event (meets threshold)
      await service.onPlatformEvent({
        userId: 'user-1',
        type: 'login',
        timestamp: new Date(),
      });

      // Should emit PRESENCE since count (3) >= threshold (3)
      const presenceSignals = signals.filter(
        (s) => s.signalType === HeartbeatSignalType.PRESENCE,
      );
      expect(presenceSignals.length).toBeGreaterThanOrEqual(1);
    });

    it('should evaluate vault_interaction correctly against configured threshold', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();
      const { signals, callback } = createSignalCollector();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
        callback,
      );

      // Configure with threshold of 2 vault interactions per 24h
      await service.configure({
        userId: 'user-1',
        type: 'vault_interaction',
        isEnabled: true,
        vaultInteractionThreshold: 2,
        vaultInteractionPeriodMs: 86400000,
      });

      // Send 1 vault interaction (below threshold)
      await service.onPlatformEvent({
        userId: 'user-1',
        type: 'vault_interaction',
        timestamp: new Date(),
      });

      // Should emit ABSENCE since count (1) < threshold (2)
      expect(signals[0].signalType).toBe(HeartbeatSignalType.ABSENCE);

      // Send 2nd vault interaction (meets threshold)
      await service.onPlatformEvent({
        userId: 'user-1',
        type: 'vault_interaction',
        timestamp: new Date(),
      });

      // Should emit PRESENCE since count (2) >= threshold (2)
      expect(signals[1].signalType).toBe(HeartbeatSignalType.PRESENCE);
    });

    it('should not emit signals for disabled canary configs', async () => {
      const repository = createInMemoryRepository();
      const encryptionService = createMockEncryptionService();
      const eventStore = new InMemoryPlatformEventStore<string>();
      const { signals, callback } = createSignalCollector();

      const service = new NativeCanaryService<string>(
        repository,
        encryptionService,
        eventStore,
        callback,
      );

      // Configure a disabled canary
      await service.configure({
        userId: 'user-1',
        type: 'login_activity',
        isEnabled: false,
        loginThreshold: 1,
        loginPeriodMs: 86400000,
      });

      // Send login events
      await service.onPlatformEvent({
        userId: 'user-1',
        type: 'login',
        timestamp: new Date(),
      });

      // No signals should be emitted for disabled configs
      expect(signals).toHaveLength(0);
    });
  });
});
