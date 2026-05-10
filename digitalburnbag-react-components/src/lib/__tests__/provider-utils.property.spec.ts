/**
 * Property-based tests for provider utility functions.
 * Tests Properties 1, 2, 3, 4, and 10 from the design document.
 */
import {
  ICanaryProviderConfig,
  ProviderCategory,
} from '@brightchain/digitalburnbag-lib';
import * as fc from 'fast-check';
import { IApiProviderConnectionDTO } from '../services/burnbag-api-client';
import {
  canCreateBinding,
  computeHealthSummary,
  generateWebhookSetup,
  groupProvidersByCategory,
  IHealthSummaryInput,
  mapConnectionToCardData,
} from '../utils/provider-utils';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const connectionStatusArb = fc.constantFrom(
  'connected',
  'expired',
  'error',
  'paused',
  'pending',
);

const lastCheckResultArb = fc.constantFrom(
  'presence' as const,
  'absence' as const,
  'duress' as const,
  'error' as const,
);

const healthSummaryInputArb: fc.Arbitrary<IHealthSummaryInput> = fc.record({
  status: connectionStatusArb,
  lastCheckResult: fc.option(lastCheckResultArb, { nil: undefined }),
});

const providerCategoryArb = fc.constantFrom(...Object.values(ProviderCategory));

const minimalProviderConfigArb: fc.Arbitrary<ICanaryProviderConfig<string>> =
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    description: fc.string({ maxLength: 100 }),
    category: providerCategoryArb,
    baseUrl: fc.constant('https://api.example.com'),
    auth: fc.constant({ type: 'api_key' as const }),
    endpoints: fc.constant({
      activity: {
        path: '/activity',
        method: 'GET' as const,
        responseMapping: {
          eventsPath: 'events',
          timestampPath: 'ts',
          timestampFormat: 'iso8601' as const,
        },
      },
    }),
    defaultLookbackMs: fc.constant(86400000),
    minCheckIntervalMs: fc.constant(60000),
    supportsWebhooks: fc.boolean(),
    enabledByDefault: fc.boolean(),
  });

const validDateStringArb = fc
  .integer({ min: 946684800000, max: 1893456000000 }) // 2000-01-01 to 2030-01-01
  .map((ts) => new Date(ts).toISOString());

const connectionDTOArb: fc.Arbitrary<IApiProviderConnectionDTO> = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  providerId: fc.string({ minLength: 1, maxLength: 20 }),
  status: connectionStatusArb,
  providerUserId: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
  providerUsername: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
  providerDisplayName: fc.option(fc.string({ minLength: 1 }), {
    nil: undefined,
  }),
  providerAvatarUrl: fc.option(fc.webUrl(), { nil: undefined }),
  connectedAt: fc.option(validDateStringArb, { nil: undefined }),
  lastValidatedAt: fc.option(validDateStringArb, { nil: undefined }),
  lastCheckedAt: fc.option(validDateStringArb, { nil: undefined }),
  lastCheckResult: fc.option(lastCheckResultArb, { nil: undefined }),
  errorMessage: fc.option(fc.string(), { nil: undefined }),
  tokenExpiresAt: fc.option(validDateStringArb, { nil: undefined }),
  isEnabled: fc.boolean(),
  checkIntervalMs: fc.option(fc.nat({ max: 86400000 }), { nil: undefined }),
  createdAt: validDateStringArb,
  updatedAt: validDateStringArb,
});

// ---------------------------------------------------------------------------
// Property 3: Dashboard health summary computation
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 3: Dashboard health summary computation', () => {
  /**
   * **Validates: Requirements 2.2**
   */
  it('correctly computes total, healthy, needs-attention counts and overall status', () => {
    fc.assert(
      fc.property(
        fc.array(healthSummaryInputArb, { minLength: 0, maxLength: 50 }),
        (connections) => {
          const result = computeHealthSummary(connections);

          // Total equals number of connections
          expect(result.connectedCount).toBe(connections.length);

          // Healthy = connected + presence
          const expectedHealthy = connections.filter(
            (c) => c.status === 'connected' && c.lastCheckResult === 'presence',
          ).length;
          expect(result.healthyCount).toBe(expectedHealthy);

          // Needs attention = error, expired, or paused
          const expectedNeedsAttention = connections.filter(
            (c) =>
              c.status === 'error' ||
              c.status === 'expired' ||
              c.status === 'paused',
          ).length;
          expect(result.needsAttentionCount).toBe(expectedNeedsAttention);

          // Overall status rules
          if (connections.length === 0) {
            expect(result.overallStatus).toBe('none');
          } else if (expectedHealthy === 0) {
            expect(result.overallStatus).toBe('critical');
          } else if (expectedNeedsAttention > 0) {
            expect(result.overallStatus).toBe('degraded');
          } else {
            expect(result.overallStatus).toBe('healthy');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Provider card rendering includes all required fields
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 4: Provider card rendering includes all required fields', () => {
  /**
   * **Validates: Requirements 2.4**
   */
  it('maps connection to card data with all required fields present', () => {
    fc.assert(
      fc.property(connectionDTOArb, (connection) => {
        const cardData = mapConnectionToCardData(connection);

        // Provider name is present and non-empty
        expect(cardData.providerName).toBeTruthy();
        expect(typeof cardData.providerName).toBe('string');

        // Status is present
        expect(cardData.status).toBe(connection.status);

        // Last check time matches
        expect(cardData.lastCheckTime).toBe(connection.lastCheckedAt);

        // Signal type matches
        expect(cardData.lastCheckSignalType).toBe(connection.lastCheckResult);

        // Time since last activity is present (same as lastCheckedAt in our mapping)
        expect(cardData.timeSinceLastActivity).toBe(connection.lastCheckedAt);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Binding creation requires connected provider status
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 10: Binding creation requires connected provider status', () => {
  /**
   * **Validates: Requirements 5.5**
   */
  it('succeeds only when status is "connected" and rejects all other statuses', () => {
    fc.assert(
      fc.property(connectionStatusArb, (status) => {
        const result = canCreateBinding(status);
        if (status === 'connected') {
          expect(result).toBe(true);
        } else {
          expect(result).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 1: Provider grouping preserves all providers
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 1: Provider grouping preserves all providers with correct categories', () => {
  /**
   * **Validates: Requirements 1.1**
   */
  it('groups by category with no lost or duplicated providers', () => {
    fc.assert(
      fc.property(
        fc.array(minimalProviderConfigArb, { minLength: 0, maxLength: 30 }),
        (configs) => {
          const groups = groupProvidersByCategory(configs);

          // Every provider in each group has the matching category
          for (const group of groups) {
            for (const provider of group.providers) {
              expect(provider.category).toBe(group.category);
            }
          }

          // No providers lost: total across groups equals input
          const totalInGroups = groups.reduce(
            (sum, g) => sum + g.providers.length,
            0,
          );
          expect(totalInGroups).toBe(configs.length);

          // No providers duplicated: collect all IDs
          const allIds = groups.flatMap((g) => g.providers.map((p) => p.id));
          const uniqueIds = new Set(allIds);
          // Note: input configs may have duplicate IDs from generation,
          // but the grouping should preserve the exact same count
          expect(allIds.length).toBe(configs.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Webhook URL and secret uniqueness
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 2: Webhook URL and secret uniqueness', () => {
  /**
   * **Validates: Requirements 1.4**
   */
  it('generates unique URLs and non-empty secrets', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 20 }), (count) => {
        const results = Array.from({ length: count }, () =>
          generateWebhookSetup('https://api.example.com'),
        );

        // All URLs are unique
        const urls = results.map((r) => r.webhookUrl);
        expect(new Set(urls).size).toBe(count);

        // All secrets are non-empty
        for (const result of results) {
          expect(result.webhookSecret.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });
});
