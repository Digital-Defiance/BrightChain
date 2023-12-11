/**
 * @fileoverview Property-based tests for RecipientLookupService caching behaviour
 *
 * **Feature: email-gateway**
 *
 * This test suite verifies:
 * - Property 6: Cached positive lookups return OK without re-querying registry within TTL
 *
 * **Validates: Requirements 13.6**
 */

import fc from 'fast-check';

import type { IEmailGatewayConfig } from './emailGatewayConfig';
import type { IUserRegistry } from './recipientLookupService';
import { RecipientLookupService } from './recipientLookupService';

// ─── Helpers ────────────────────────────────────────────────────────────────

const CANONICAL_DOMAIN = 'brightchain.org';

/** Build a minimal config stub with a generous TTL for caching tests. */
function makeConfig(
  overrides: Partial<IEmailGatewayConfig> = {},
): IEmailGatewayConfig {
  return {
    canonicalDomain: CANONICAL_DOMAIN,
    postfixHost: 'localhost',
    postfixPort: 25,
    dkimKeyPath: '/etc/dkim/private.key',
    dkimSelector: 'default',
    mailDropDirectory: '/var/spool/brightchain/incoming/',
    errorDirectory: '/var/spool/brightchain/errors/',
    maxMessageSizeBytes: 25 * 1024 * 1024,
    recipientLookupPort: 0,
    recipientLookupCacheTtlSeconds: 300,
    spamEngine: 'spamassassin',
    spamThresholds: { probableSpamScore: 5, definiteSpamScore: 10 },
    queueConcurrency: 10,
    retryMaxCount: 5,
    retryMaxDurationMs: 48 * 60 * 60 * 1000,
    retryBaseIntervalMs: 60_000,
    ...overrides,
  };
}

/**
 * Arbitrary that generates a valid local-part for an email address.
 * Produces lowercase alphanumeric strings of length 1–20.
 */
const ALPHA_NUM = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
const arbLocalPart: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...ALPHA_NUM), { minLength: 1, maxLength: 20 })
  .map((chars) => chars.join(''));

/**
 * Arbitrary that generates a valid email address at the canonical domain.
 */
const arbEmail: fc.Arbitrary<string> = arbLocalPart.map(
  (local) => `${local}@${CANONICAL_DOMAIN}`,
);

/**
 * Create a mock user registry that tracks call counts per email.
 * All emails in `registeredUsers` will return true from hasUser.
 */
function makeTrackingRegistry(registeredUsers: Set<string>): {
  registry: IUserRegistry;
  callCounts: Map<string, number>;
} {
  const callCounts = new Map<string, number>();
  return {
    registry: {
      async hasUser(email: string): Promise<boolean> {
        const normalised = email.toLowerCase();
        callCounts.set(normalised, (callCounts.get(normalised) ?? 0) + 1);
        return registeredUsers.has(normalised);
      },
    },
    callCounts,
  };
}

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('RecipientLookupService Caching Property Tests', () => {
  describe('Property 6: Cached positive lookups return OK without re-querying registry within TTL', () => {
    /**
     * **Feature: email-gateway, Property 6**
     *
     * *For any* registered email address at the canonical domain, after a
     * successful lookup (OK), subsequent lookups within the TTL return OK
     * without calling the user registry again.
     *
     * **Validates: Requirements 13.6**
     */
    it('subsequent lookups for registered users return OK from cache without re-querying registry', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbEmail,
          fc.integer({ min: 1, max: 10 }),
          async (email: string, extraLookups: number) => {
            const normalised = email.toLowerCase();
            const registeredUsers = new Set([normalised]);
            const { registry, callCounts } =
              makeTrackingRegistry(registeredUsers);

            const service = new RecipientLookupService(
              makeConfig({ recipientLookupCacheTtlSeconds: 300 }),
              registry,
            );

            // First lookup — should hit the registry and return OK.
            const firstResult = await service.lookup(email);
            expect(firstResult).toBe('OK');
            expect(callCounts.get(normalised)).toBe(1);

            // Subsequent lookups within TTL — should return OK from cache.
            for (let i = 0; i < extraLookups; i++) {
              const result = await service.lookup(email);
              expect(result).toBe('OK');
            }

            // Registry should still have been called exactly once.
            expect(callCounts.get(normalised)).toBe(1);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * NOTFOUND results are NOT cached — the registry is queried every time.
     *
     * **Validates: Requirements 13.6**
     */
    it('NOTFOUND results are not cached and always re-query the registry', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbEmail,
          fc.integer({ min: 2, max: 5 }),
          async (email: string, totalLookups: number) => {
            const normalised = email.toLowerCase();
            // Empty set — no users registered.
            const { registry, callCounts } = makeTrackingRegistry(new Set());

            const service = new RecipientLookupService(
              makeConfig({ recipientLookupCacheTtlSeconds: 300 }),
              registry,
            );

            for (let i = 0; i < totalLookups; i++) {
              const result = await service.lookup(email);
              expect(result).toBe('NOTFOUND');
            }

            // Registry should have been called every time (no caching).
            expect(callCounts.get(normalised)).toBe(totalLookups);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * TEMP results (registry throws) are NOT cached — subsequent lookups
     * re-query the registry.
     *
     * **Validates: Requirements 13.6**
     */
    it('TEMP results are not cached and always re-query the registry', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbEmail,
          fc.integer({ min: 2, max: 5 }),
          async (email: string, totalLookups: number) => {
            let callCount = 0;
            const failingRegistry: IUserRegistry = {
              async hasUser(): Promise<boolean> {
                callCount++;
                throw new Error('Registry unavailable');
              },
            };

            const service = new RecipientLookupService(
              makeConfig({ recipientLookupCacheTtlSeconds: 300 }),
              failingRegistry,
            );

            for (let i = 0; i < totalLookups; i++) {
              const result = await service.lookup(email);
              expect(result).toBe('TEMP');
            }

            // Registry should have been called every time (no caching).
            expect(callCount).toBe(totalLookups);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
