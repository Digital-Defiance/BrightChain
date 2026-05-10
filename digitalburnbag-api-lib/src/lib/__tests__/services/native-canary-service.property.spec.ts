/**
 * Property-based tests for NativeCanaryService.
 *
 * Feature: canary-provider-expansion
 */
import type {
  INativeCanaryConfigBase,
  IPlatformEvent,
  NativeCanaryType,
} from '@brightchain/digitalburnbag-lib';
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import * as fc from 'fast-check';
import {
  InMemoryPlatformEventStore,
  NativeCanaryService,
} from '../../services/native-canary-service';
import type { BrightDBNativeCanaryConfigRepository } from '../../collections/native-canary-config-collection';
import type { IEncryptionService } from '../../services/credential-service';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Native canary types that use threshold-based evaluation (excludes 'duress_code').
 */
const THRESHOLD_CANARY_TYPES: NativeCanaryType[] = [
  'login_activity',
  'file_access',
  'api_usage',
  'vault_interaction',
];

/** Maps NativeCanaryType to the corresponding IPlatformEvent type. */
const CANARY_TYPE_TO_EVENT_TYPE: Record<
  NativeCanaryType,
  IPlatformEvent['type'] | null
> = {
  login_activity: 'login',
  file_access: 'file_access',
  api_usage: 'api_call',
  vault_interaction: 'vault_interaction',
  duress_code: null,
};

/** Arbitrary for a threshold-based native canary type. */
const arbThresholdCanaryType: fc.Arbitrary<NativeCanaryType> =
  fc.constantFrom(...THRESHOLD_CANARY_TYPES);

/** Arbitrary for a positive threshold (1–50). */
const arbThreshold: fc.Arbitrary<number> = fc.integer({ min: 1, max: 50 });

/** Arbitrary for a period in milliseconds (1 second to 1 hour). */
const arbPeriodMs: fc.Arbitrary<number> = fc.integer({
  min: 1000,
  max: 3_600_000,
});

/** Arbitrary for event count (0–100). */
const arbEventCount: fc.Arbitrary<number> = fc.integer({ min: 0, max: 100 });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds an INativeCanaryConfigBase with the given type, threshold, and period.
 */
function buildConfig(
  canaryType: NativeCanaryType,
  threshold: number,
  periodMs: number,
): INativeCanaryConfigBase<string> {
  const base: INativeCanaryConfigBase<string> = {
    id: 'test-config-id',
    userId: 'test-user-id',
    type: canaryType,
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  switch (canaryType) {
    case 'login_activity':
      base.loginThreshold = threshold;
      base.loginPeriodMs = periodMs;
      break;
    case 'file_access':
      base.fileAccessThreshold = threshold;
      base.fileAccessPeriodMs = periodMs;
      break;
    case 'api_usage':
      base.apiUsageThreshold = threshold;
      base.apiUsagePeriodMs = periodMs;
      break;
    case 'vault_interaction':
      base.vaultInteractionThreshold = threshold;
      base.vaultInteractionPeriodMs = periodMs;
      break;
  }

  return base;
}

/**
 * Creates a mock BrightDBNativeCanaryConfigRepository that returns the given config.
 */
function createMockRepository(
  config: INativeCanaryConfigBase<string>,
): BrightDBNativeCanaryConfigRepository<string> {
  return {
    getConfigById: async (id: string) => (id === config.id ? config : null),
    getConfigsByUser: async () => [config],
    createConfig: async () => undefined,
    updateConfig: async () => undefined,
  } as unknown as BrightDBNativeCanaryConfigRepository<string>;
}

/**
 * Creates a mock IEncryptionService (not used in threshold tests).
 */
function createMockEncryptionService(): IEncryptionService {
  return {
    encrypt: async (plaintext: string) => ({
      ciphertext: plaintext,
      iv: 'mock-iv',
      authTag: 'mock-auth-tag',
    }),
    decrypt: async (ciphertext: string) => ciphertext,
  };
}

/**
 * Populates the event store with a given number of events for a user,
 * all within the specified period window.
 */
function populateEvents(
  eventStore: InMemoryPlatformEventStore<string>,
  userId: string,
  eventType: IPlatformEvent['type'],
  count: number,
  periodMs: number,
): void {
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    // Spread events evenly within the period window
    const timestamp = new Date(
      now - Math.floor((periodMs * (count - i)) / (count + 1)),
    );
    eventStore.append({
      userId,
      type: eventType,
      timestamp,
    });
  }
}

// ---------------------------------------------------------------------------
// Property 1: Native canary threshold evaluation correctness
// Tag: Feature: canary-provider-expansion, Property 1
// Validates: Requirements 8.1, 8.4, 8.5, 8.6
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Property 2: Duress code detection correctness
// Tag: Feature: canary-provider-expansion, Property 2
// Validates: Requirements 8.2, 8.7
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 2: Duress code detection correctness', () => {
  /** Arbitrary for a non-empty set of duress codes (1–10 codes, each 4–20 alphanumeric chars). */
  const arbDuressCode: fc.Arbitrary<string> = fc.string({
    minLength: 4,
    maxLength: 20,
    unit: fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(
        '',
      ),
    ),
  });

  const arbDuressCodeSet: fc.Arbitrary<string[]> = fc
    .uniqueArray(arbDuressCode, { minLength: 1, maxLength: 10 })
    .filter((codes) => codes.length >= 1);

  /** Arbitrary for an authentication code that may or may not be in the set. */
  const arbAuthCode: fc.Arbitrary<string> = fc.string({
    minLength: 1,
    maxLength: 20,
    unit: fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(
        '',
      ),
    ),
  });

  /**
   * Creates a mock encryption service that uses base64 encode/decode
   * as a simple reversible transformation for round-trip testing.
   */
  function createBase64EncryptionService(): IEncryptionService {
    return {
      encrypt: async (plaintext: string) => {
        const encoded = Buffer.from(plaintext, 'utf-8').toString('base64');
        return {
          ciphertext: encoded,
          iv: 'test-iv',
          authTag: 'test-auth-tag',
        };
      },
      decrypt: async (ciphertext: string) => {
        return Buffer.from(ciphertext, 'base64').toString('utf-8');
      },
    };
  }

  /**
   * Creates a mock repository that stores configs in memory.
   */
  function createInMemoryRepository(): BrightDBNativeCanaryConfigRepository<string> {
    const configs: INativeCanaryConfigBase<string>[] = [];
    return {
      getConfigById: async (id: string) =>
        configs.find((c) => c.id === id) ?? null,
      getConfigsByUser: async (userId: string) =>
        configs.filter((c) => c.userId === userId),
      createConfig: async (config: INativeCanaryConfigBase<string>) => {
        configs.push(config);
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
    } as unknown as BrightDBNativeCanaryConfigRepository<string>;
  }

  it('isDuressCode returns true iff the code exactly matches one of the configured duress codes', async () => {
    /**
     * **Validates: Requirements 8.2, 8.7**
     *
     * For any set of configured duress codes and any authentication code,
     * isDuressCode returns true if and only if the code exactly matches
     * one of the configured codes.
     */
    await fc.assert(
      fc.asyncProperty(
        arbDuressCodeSet,
        arbAuthCode,
        async (duressCodes, authCode) => {
          const mockRepo = createInMemoryRepository();
          const mockEncryption = createBase64EncryptionService();
          const eventStore = new InMemoryPlatformEventStore<string>();

          const service = new NativeCanaryService<string>(
            mockRepo,
            mockEncryption,
            eventStore,
          );

          const userId = 'test-user-duress';

          // Set the duress codes (encrypts them at rest)
          await service.setDuressCodes(userId, duressCodes);

          // Check if the auth code is detected as a duress code
          const result = await service.isDuressCode(userId, authCode);

          // The expected result: true iff authCode exactly matches one of the configured codes
          const expected = duressCodes.includes(authCode);

          return result === expected;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 1: Native canary threshold evaluation correctness
// Tag: Feature: canary-provider-expansion, Property 1
// Validates: Requirements 8.1, 8.4, 8.5, 8.6
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 1: Native canary threshold evaluation correctness', () => {
  it('evaluateStatus returns PRESENCE when event count >= threshold, ABSENCE when < threshold', async () => {
    /**
     * **Validates: Requirements 8.1, 8.4, 8.5, 8.6**
     *
     * For any native canary type (login_activity, file_access, api_usage,
     * vault_interaction), threshold N, period P, and event count C:
     * - signal is PRESENCE if C >= N
     * - signal is ABSENCE if C < N
     */
    await fc.assert(
      fc.asyncProperty(
        arbThresholdCanaryType,
        arbThreshold,
        arbPeriodMs,
        arbEventCount,
        async (canaryType, threshold, periodMs, eventCount) => {
          // Build config with the generated threshold and period
          const config = buildConfig(canaryType, threshold, periodMs);
          const mockRepo = createMockRepository(config);
          const mockEncryption = createMockEncryptionService();
          const eventStore = new InMemoryPlatformEventStore<string>();

          // Populate events within the period window
          const eventType = CANARY_TYPE_TO_EVENT_TYPE[canaryType];
          if (eventType) {
            populateEvents(
              eventStore,
              'test-user-id',
              eventType,
              eventCount,
              periodMs,
            );
          }

          // Create service and evaluate
          const service = new NativeCanaryService<string>(
            mockRepo,
            mockEncryption,
            eventStore,
          );

          const result = await service.evaluateStatus('test-config-id');

          // Assert: PRESENCE if count >= threshold, ABSENCE if < threshold
          if (eventCount >= threshold) {
            return result === HeartbeatSignalType.PRESENCE;
          } else {
            return result === HeartbeatSignalType.ABSENCE;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
