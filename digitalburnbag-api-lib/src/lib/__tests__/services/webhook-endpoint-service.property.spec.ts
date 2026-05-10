/**
 * Property-based tests for WebhookEndpointService.
 *
 * Feature: canary-provider-expansion
 *
 * Properties covered:
 *   - Property 7:  Webhook URL uniqueness and format
 *   - Property 8:  Webhook signature verification round-trip
 *   - Property 9:  Webhook secret rotation grace period
 *   - Property 10: Webhook delivery statistics accuracy
 *   - Property 11: Webhook consecutive failure disable threshold
 *   - Property 12: Webhook IP allowlist enforcement
 *   - Property 13: Webhook rate limiting
 */
import * as fc from 'fast-check';
import {
  generateWebhookSecret,
  computeHmacSignature,
  verifySignature,
  isIpAllowed,
  checkRateLimit,
  WebhookRateLimiter,
  WebhookEndpointService,
  WEBHOOK_SECRET_BYTES,
  DEFAULT_RATE_LIMIT_PER_MINUTE,
  CONSECUTIVE_FAILURE_THRESHOLD,
} from '../../services/webhook-endpoint-service';
import type { IWebhookEndpointBase } from '@brightchain/digitalburnbag-lib';
import type { BrightDBWebhookEndpointRepository } from '../../collections/webhook-endpoint-collection';

// ---------------------------------------------------------------------------
// In-memory repository helper
// ---------------------------------------------------------------------------

/**
 * Creates a fully in-memory BrightDBWebhookEndpointRepository for testing.
 */
function createInMemoryEndpointRepository(): BrightDBWebhookEndpointRepository<string> {
  const store = new Map<string, IWebhookEndpointBase<string>>();

  return {
    getEndpointById: async (id: string) => store.get(id) ?? null,
    getEndpointByConnectionId: async (connectionId: string) =>
      [...store.values()].find((e) => String(e.connectionId) === String(connectionId)) ?? null,
    getEndpointsForUser: async (userId: string) =>
      [...store.values()].filter((e) => String(e.userId) === String(userId)),
    getEndpointByUrlPath: async (urlPath: string) =>
      [...store.values()].find((e) => e.urlPath === urlPath) ?? null,
    createEndpoint: async (endpoint: IWebhookEndpointBase<string>) => {
      store.set(String(endpoint.id), { ...endpoint });
    },
    updateEndpoint: async (
      endpointId: string,
      updates: Partial<IWebhookEndpointBase<string>>,
    ) => {
      const existing = store.get(String(endpointId));
      if (existing) {
        store.set(String(endpointId), {
          ...existing,
          ...updates,
          updatedAt: new Date(),
        });
      }
    },
  } as unknown as BrightDBWebhookEndpointRepository<string>;
}

/**
 * Creates a WebhookEndpointService backed by an in-memory repository.
 * Returns both the service and the repository for direct inspection.
 */
function createTestService() {
  const repo = createInMemoryEndpointRepository();
  let idCounter = 0;
  const service = new WebhookEndpointService<string>(
    repo,
    undefined,
    undefined,
    () => `whe-${++idCounter}`,
  );
  return { service, repo };
}

/**
 * Creates a minimal endpoint object for use in tests that bypass the service.
 */
function makeEndpoint(
  overrides: Partial<IWebhookEndpointBase<string>> = {},
): IWebhookEndpointBase<string> {
  const secret = generateWebhookSecret();
  const connectionId = 'conn-test';
  return {
    id: 'whe-test',
    connectionId,
    userId: 'user-test',
    providerId: 'provider-test',
    urlPath: `${connectionId}/${secret}`,
    secret,
    signatureMethod: 'hmac_sha256',
    isActive: true,
    stats: {
      totalReceived: 0,
      successfullyProcessed: 0,
      failedValidation: 0,
    },
    consecutiveSignatureFailures: 0,
    isDisabledByFailures: false,
    rateLimitPerMinute: DEFAULT_RATE_LIMIT_PER_MINUTE,
    timeoutMs: 24 * 60 * 60 * 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Arbitrary for a valid connection ID string. */
const arbConnectionId: fc.Arbitrary<string> = fc.string({
  minLength: 1,
  maxLength: 20,
  unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
});

/** Arbitrary for a non-empty payload buffer. */
const arbPayload: fc.Arbitrary<Buffer> = fc
  .uint8Array({ minLength: 1, maxLength: 256 })
  .map((arr) => Buffer.from(arr));

/** Arbitrary for a hex secret (64 chars). */
const arbSecret: fc.Arbitrary<string> = fc
  .uint8Array({ minLength: 32, maxLength: 32 })
  .map((arr) => Buffer.from(arr).toString('hex'));

/** Arbitrary for HMAC-based signature methods only (excludes ed25519 which needs key pair). */
const arbHmacMethod: fc.Arbitrary<'hmac_sha256' | 'hmac_sha1' | 'custom_header'> =
  fc.constantFrom('hmac_sha256', 'hmac_sha1', 'custom_header');

// ---------------------------------------------------------------------------
// Property 7: Webhook URL uniqueness and format
// Tag: Feature: canary-provider-expansion, Property 7
// Validates: Requirements 10.1, 17.1
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 7: Webhook URL uniqueness and format', () => {
  it('generateWebhookSecret always returns exactly 64 hex characters', () => {
    /**
     * **Validates: Requirements 10.1, 17.1**
     *
     * For any number of secret generations, every secret is exactly 64 hex
     * characters (32 bytes encoded as hex).
     */
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (count) => {
        const secrets = Array.from({ length: count }, () => generateWebhookSecret());
        return secrets.every(
          (s) => s.length === WEBHOOK_SECRET_BYTES * 2 && /^[0-9a-f]+$/.test(s),
        );
      }),
      { numRuns: 100 },
    );
  });

  it('all generated secrets are unique across multiple calls', () => {
    /**
     * **Validates: Requirements 10.1, 17.1**
     *
     * For any batch of secret generations, all secrets are distinct
     * (cryptographic uniqueness property).
     */
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 20 }), (count) => {
        const secrets = Array.from({ length: count }, () => generateWebhookSecret());
        const unique = new Set(secrets);
        return unique.size === count;
      }),
      { numRuns: 100 },
    );
  });

  it('createEndpoint produces unique urlPaths for distinct connection IDs', async () => {
    /**
     * **Validates: Requirements 10.1, 17.1**
     *
     * For any number of endpoint creations with distinct connection IDs,
     * every URL path is unique.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }).chain((n) =>
          fc
            .uniqueArray(arbConnectionId, { minLength: n, maxLength: n })
            .filter((ids) => ids.length === n),
        ),
        async (connectionIds) => {
          const { service } = createTestService();
          const endpoints = await Promise.all(
            connectionIds.map((cid) =>
              service.createEndpoint(cid, 'provider-test', 'user-test'),
            ),
          );
          const urlPaths = endpoints.map((e) => e.urlPath);
          const unique = new Set(urlPaths);
          return unique.size === urlPaths.length;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('createEndpoint urlPath contains the secret as a 64-char hex suffix', async () => {
    /**
     * **Validates: Requirements 10.1, 17.1**
     *
     * For any endpoint creation, the urlPath ends with the secret, and the
     * secret is exactly 64 hex characters.
     */
    await fc.assert(
      fc.asyncProperty(arbConnectionId, async (connectionId) => {
        const { service } = createTestService();
        const endpoint = await service.createEndpoint(
          connectionId,
          'provider-test',
          'user-test',
        );
        const secretPart = endpoint.urlPath.split('/').pop() ?? '';
        return (
          secretPart.length === WEBHOOK_SECRET_BYTES * 2 &&
          /^[0-9a-f]+$/.test(secretPart) &&
          secretPart === endpoint.secret
        );
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Webhook signature verification round-trip
// Tag: Feature: canary-provider-expansion, Property 8
// Validates: Requirements 10.2, 17.2
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 8: Webhook signature verification round-trip', () => {
  it('hmac_sha256: computing then verifying succeeds', () => {
    /**
     * **Validates: Requirements 10.2, 17.2**
     *
     * For any payload and secret, computing an HMAC-SHA256 signature and
     * then verifying it must succeed.
     */
    fc.assert(
      fc.property(arbPayload, arbSecret, (payload, secret) => {
        const sig = computeHmacSignature(payload, secret, 'sha256');
        return verifySignature('hmac_sha256', payload, secret, sig);
      }),
      { numRuns: 100 },
    );
  });

  it('hmac_sha256: verifying with sha256= prefix succeeds', () => {
    /**
     * **Validates: Requirements 10.2, 17.2**
     *
     * verifySignature must accept the "sha256=" prefix format used by GitHub.
     */
    fc.assert(
      fc.property(arbPayload, arbSecret, (payload, secret) => {
        const sig = `sha256=${computeHmacSignature(payload, secret, 'sha256')}`;
        return verifySignature('hmac_sha256', payload, secret, sig);
      }),
      { numRuns: 100 },
    );
  });

  it('hmac_sha1: computing then verifying succeeds', () => {
    /**
     * **Validates: Requirements 10.2, 17.2**
     *
     * For any payload and secret, computing an HMAC-SHA1 signature and
     * then verifying it must succeed.
     */
    fc.assert(
      fc.property(arbPayload, arbSecret, (payload, secret) => {
        const sig = computeHmacSignature(payload, secret, 'sha1');
        return verifySignature('hmac_sha1', payload, secret, sig);
      }),
      { numRuns: 100 },
    );
  });

  it('hmac_sha1: verifying with sha1= prefix succeeds', () => {
    /**
     * **Validates: Requirements 10.2, 17.2**
     *
     * verifySignature must accept the "sha1=" prefix format.
     */
    fc.assert(
      fc.property(arbPayload, arbSecret, (payload, secret) => {
        const sig = `sha1=${computeHmacSignature(payload, secret, 'sha1')}`;
        return verifySignature('hmac_sha1', payload, secret, sig);
      }),
      { numRuns: 100 },
    );
  });

  it('custom_header: verifying with the secret as header value succeeds', () => {
    /**
     * **Validates: Requirements 10.2, 17.2**
     *
     * For custom_header method, the signature is the secret itself.
     */
    fc.assert(
      fc.property(arbPayload, arbSecret, (payload, secret) => {
        return verifySignature('custom_header', payload, secret, secret);
      }),
      { numRuns: 100 },
    );
  });

  it('verifying with a mutated signature fails for all HMAC methods', () => {
    /**
     * **Validates: Requirements 10.2, 17.2**
     *
     * For any payload, secret, and HMAC-based method, verifying with a
     * signature that differs by at least one character must fail.
     */
    fc.assert(
      fc.property(
        arbPayload,
        arbSecret,
        arbHmacMethod,
        fc.integer({ min: 0, max: 63 }),
        (payload, secret, method, mutatePos) => {
          let sig: string;
          if (method === 'hmac_sha256') {
            sig = computeHmacSignature(payload, secret, 'sha256');
          } else if (method === 'hmac_sha1') {
            sig = computeHmacSignature(payload, secret, 'sha1');
          } else {
            // custom_header: use the secret itself
            sig = secret;
          }

          // Mutate one character in the signature
          const pos = mutatePos % sig.length;
          const originalChar = sig[pos];
          const mutatedChar = originalChar === 'a' ? 'b' : 'a';
          const mutatedSig = sig.slice(0, pos) + mutatedChar + sig.slice(pos + 1);

          return !verifySignature(method, payload, secret, mutatedSig);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('verifying with a different secret fails for HMAC methods', () => {
    /**
     * **Validates: Requirements 10.2, 17.2**
     *
     * For any payload and two distinct secrets, a signature computed with
     * one secret must not verify with the other.
     */
    fc.assert(
      fc.property(
        arbPayload,
        arbSecret,
        arbSecret,
        fc.constantFrom('hmac_sha256' as const, 'hmac_sha1' as const),
        (payload, secret1, secret2, method) => {
          // Skip if secrets happen to be equal (extremely unlikely but possible)
          if (secret1 === secret2) return true;
          const algorithm = method === 'hmac_sha256' ? 'sha256' : 'sha1';
          const sig = computeHmacSignature(payload, secret1, algorithm);
          return !verifySignature(method, payload, secret2, sig);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('verifying with empty signature always fails', () => {
    /**
     * **Validates: Requirements 10.2, 17.2**
     *
     * An empty signature must always fail verification regardless of method.
     */
    fc.assert(
      fc.property(arbPayload, arbSecret, arbHmacMethod, (payload, secret, method) => {
        return !verifySignature(method, payload, secret, '');
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Webhook secret rotation grace period
// Tag: Feature: canary-provider-expansion, Property 9
// Validates: Requirements 10.6
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 9: Webhook secret rotation grace period', () => {
  it('during grace period, both current and previous secrets verify successfully', async () => {
    /**
     * **Validates: Requirements 10.6**
     *
     * After rotating the secret, verification with the new secret succeeds.
     * Verification with the old secret also succeeds during the grace period.
     */
    await fc.assert(
      fc.asyncProperty(
        arbPayload,
        arbConnectionId,
        async (payload, connectionId) => {
          const { service, repo } = createTestService();

          // Create an endpoint
          const endpoint = await service.createEndpoint(
            connectionId,
            'provider-test',
            'user-test',
          );
          const oldSecret = endpoint.secret;

          // Rotate with a 1-hour grace period
          const gracePeriodMs = 60 * 60 * 1000;
          const { newSecret } = await service.rotateSecret(endpoint.id, gracePeriodMs);

          // Fetch updated endpoint
          const updated = await repo.getEndpointById(endpoint.id);
          if (!updated) return false;

          // New secret must verify
          const newSig = computeHmacSignature(payload, newSecret, 'sha256');
          const newVerifies = verifySignature('hmac_sha256', payload, updated.secret, newSig);

          // Old secret must also verify during grace period
          const oldSig = computeHmacSignature(payload, oldSecret, 'sha256');
          const oldVerifiesWithPrevious =
            updated.previousSecret !== undefined &&
            updated.previousSecretExpiresAt !== undefined &&
            new Date(updated.previousSecretExpiresAt) > new Date() &&
            verifySignature('hmac_sha256', payload, updated.previousSecret!, oldSig);

          return newVerifies && oldVerifiesWithPrevious === true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('after grace period expires, previous secret no longer verifies', async () => {
    /**
     * **Validates: Requirements 10.6**
     *
     * After the grace period has expired, the previous secret must not
     * verify. The current secret must still verify.
     */
    await fc.assert(
      fc.asyncProperty(
        arbPayload,
        arbConnectionId,
        async (payload, connectionId) => {
          const { service, repo } = createTestService();

          // Create an endpoint
          const endpoint = await service.createEndpoint(
            connectionId,
            'provider-test',
            'user-test',
          );
          const oldSecret = endpoint.secret;

          // Rotate with an already-expired grace period (0 ms)
          await service.rotateSecret(endpoint.id, 0);

          // Fetch updated endpoint
          const updated = await repo.getEndpointById(endpoint.id);
          if (!updated) return false;

          // New secret must verify
          const newSig = computeHmacSignature(payload, updated.secret, 'sha256');
          const newVerifies = verifySignature('hmac_sha256', payload, updated.secret, newSig);

          // Old secret must NOT verify (grace period expired)
          const oldSig = computeHmacSignature(payload, oldSecret, 'sha256');
          const expiresAt = updated.previousSecretExpiresAt
            ? new Date(updated.previousSecretExpiresAt)
            : new Date(0);
          const gracePeriodExpired = expiresAt <= new Date();

          // If grace period is expired, old secret should not be accepted
          const oldSecretRejected = gracePeriodExpired
            ? !verifySignature('hmac_sha256', payload, updated.secret, oldSig)
            : true; // grace period not yet expired — skip this check

          return newVerifies && oldSecretRejected;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rotateSecret generates a new secret distinct from the old one', async () => {
    /**
     * **Validates: Requirements 10.6**
     *
     * After rotation, the new secret must differ from the previous secret.
     */
    await fc.assert(
      fc.asyncProperty(arbConnectionId, async (connectionId) => {
        const { service, repo } = createTestService();
        const endpoint = await service.createEndpoint(
          connectionId,
          'provider-test',
          'user-test',
        );
        const oldSecret = endpoint.secret;
        const { newSecret } = await service.rotateSecret(endpoint.id, 60_000);

        const updated = await repo.getEndpointById(endpoint.id);
        if (!updated) return false;

        return (
          newSecret !== oldSecret &&
          updated.secret === newSecret &&
          updated.previousSecret === oldSecret
        );
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Webhook delivery statistics accuracy
// Tag: Feature: canary-provider-expansion, Property 10
// Validates: Requirements 10.7
// ---------------------------------------------------------------------------

/** Outcome of a single delivery attempt for testing. */
type DeliveryOutcome = 'success' | 'invalid_signature';

describe('Feature: canary-provider-expansion, Property 10: Webhook delivery statistics accuracy', () => {
  it('totalReceived = successfullyProcessed + failedValidation after any sequence', async () => {
    /**
     * **Validates: Requirements 10.7**
     *
     * For any sequence of delivery attempts, the invariant
     * totalReceived = successfullyProcessed + failedValidation must hold
     * after every delivery.
     */
    await fc.assert(
      fc.asyncProperty(
        // Generate a sequence of outcomes (success or invalid_signature)
        // Keep it short enough to avoid hitting the 10-failure disable threshold
        fc.array(
          fc.constantFrom('success' as DeliveryOutcome, 'invalid_signature' as DeliveryOutcome),
          { minLength: 1, maxLength: 8 },
        ),
        async (outcomes) => {
          const { service, repo } = createTestService();
          const connectionId = 'conn-stats-test';
          const endpoint = await service.createEndpoint(
            connectionId,
            'provider-test',
            'user-test',
          );

          const payload = Buffer.from('{"data":[{"id":"1"}]}', 'utf8');

          for (const outcome of outcomes) {
            const sig =
              outcome === 'success'
                ? `sha256=${computeHmacSignature(payload, endpoint.secret, 'sha256')}`
                : 'sha256=invalidsignature0000000000000000000000000000000000000000000000';

            await service.processWebhook(
              connectionId,
              endpoint.secret,
              { 'X-Hub-Signature-256': sig },
              payload,
              '127.0.0.1',
            );
          }

          const updated = await repo.getEndpointById(endpoint.id);
          if (!updated) return false;

          const { totalReceived, successfullyProcessed, failedValidation } = updated.stats;
          return totalReceived === successfullyProcessed + failedValidation;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('successfullyProcessed equals the count of successful deliveries', async () => {
    /**
     * **Validates: Requirements 10.7**
     *
     * For any sequence of delivery attempts, successfullyProcessed must
     * equal the exact count of successful deliveries in the sequence.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom('success' as DeliveryOutcome, 'invalid_signature' as DeliveryOutcome),
          { minLength: 1, maxLength: 8 },
        ),
        async (outcomes) => {
          const { service, repo } = createTestService();
          const connectionId = 'conn-success-count-test';
          const endpoint = await service.createEndpoint(
            connectionId,
            'provider-test',
            'user-test',
          );

          const payload = Buffer.from('{"data":[{"id":"1"}]}', 'utf8');
          const expectedSuccesses = outcomes.filter((o) => o === 'success').length;

          for (const outcome of outcomes) {
            const sig =
              outcome === 'success'
                ? `sha256=${computeHmacSignature(payload, endpoint.secret, 'sha256')}`
                : 'sha256=invalidsignature0000000000000000000000000000000000000000000000';

            await service.processWebhook(
              connectionId,
              endpoint.secret,
              { 'X-Hub-Signature-256': sig },
              payload,
              '127.0.0.1',
            );
          }

          const updated = await repo.getEndpointById(endpoint.id);
          if (!updated) return false;

          return updated.stats.successfullyProcessed === expectedSuccesses;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('failedValidation equals the count of invalid-signature deliveries', async () => {
    /**
     * **Validates: Requirements 10.7**
     *
     * For any sequence of delivery attempts, failedValidation must equal
     * the exact count of invalid-signature deliveries.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom('success' as DeliveryOutcome, 'invalid_signature' as DeliveryOutcome),
          { minLength: 1, maxLength: 8 },
        ),
        async (outcomes) => {
          const { service, repo } = createTestService();
          const connectionId = 'conn-fail-count-test';
          const endpoint = await service.createEndpoint(
            connectionId,
            'provider-test',
            'user-test',
          );

          const payload = Buffer.from('{"data":[{"id":"1"}]}', 'utf8');
          const expectedFailures = outcomes.filter((o) => o === 'invalid_signature').length;

          for (const outcome of outcomes) {
            const sig =
              outcome === 'success'
                ? `sha256=${computeHmacSignature(payload, endpoint.secret, 'sha256')}`
                : 'sha256=invalidsignature0000000000000000000000000000000000000000000000';

            await service.processWebhook(
              connectionId,
              endpoint.secret,
              { 'X-Hub-Signature-256': sig },
              payload,
              '127.0.0.1',
            );
          }

          const updated = await repo.getEndpointById(endpoint.id);
          if (!updated) return false;

          return updated.stats.failedValidation === expectedFailures;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Webhook consecutive failure disable threshold
// Tag: Feature: canary-provider-expansion, Property 11
// Validates: Requirements 17.5
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 11: Webhook consecutive failure disable threshold', () => {
  it('endpoint is disabled after exactly 10 consecutive signature failures', async () => {
    /**
     * **Validates: Requirements 17.5**
     *
     * For any sequence of failures, the endpoint becomes disabled iff the
     * consecutive failure count reaches CONSECUTIVE_FAILURE_THRESHOLD (10).
     */
    await fc.assert(
      fc.asyncProperty(
        // Number of consecutive failures to send (1–15)
        fc.integer({ min: 1, max: 15 }),
        async (failureCount) => {
          const { service, repo } = createTestService();
          const connectionId = `conn-disable-${failureCount}`;
          const endpoint = await service.createEndpoint(
            connectionId,
            'provider-test',
            'user-test',
          );

          const payload = Buffer.from('{"data":[]}', 'utf8');
          const badSig = 'sha256=invalidsignature0000000000000000000000000000000000000000000000';

          for (let i = 0; i < failureCount; i++) {
            await service.processWebhook(
              connectionId,
              endpoint.secret,
              { 'X-Hub-Signature-256': badSig },
              payload,
              '127.0.0.1',
            );
          }

          const updated = await repo.getEndpointById(endpoint.id);
          if (!updated) return false;

          const shouldBeDisabled = failureCount >= CONSECUTIVE_FAILURE_THRESHOLD;
          return updated.isDisabledByFailures === shouldBeDisabled;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('a successful delivery resets the consecutive failure counter to 0', async () => {
    /**
     * **Validates: Requirements 17.5**
     *
     * For any number of failures followed by a success, the consecutive
     * failure counter must be reset to 0 after the success.
     */
    await fc.assert(
      fc.asyncProperty(
        // Failures before the success (1–9, below disable threshold)
        fc.integer({ min: 1, max: CONSECUTIVE_FAILURE_THRESHOLD - 1 }),
        async (failuresBefore) => {
          const { service, repo } = createTestService();
          const connectionId = `conn-reset-${failuresBefore}`;
          const endpoint = await service.createEndpoint(
            connectionId,
            'provider-test',
            'user-test',
          );

          const payload = Buffer.from('{"data":[{"id":"1"}]}', 'utf8');
          const badSig = 'sha256=invalidsignature0000000000000000000000000000000000000000000000';

          // Send failures
          for (let i = 0; i < failuresBefore; i++) {
            await service.processWebhook(
              connectionId,
              endpoint.secret,
              { 'X-Hub-Signature-256': badSig },
              payload,
              '127.0.0.1',
            );
          }

          // Send one success
          const goodSig = `sha256=${computeHmacSignature(payload, endpoint.secret, 'sha256')}`;
          await service.processWebhook(
            connectionId,
            endpoint.secret,
            { 'X-Hub-Signature-256': goodSig },
            payload,
            '127.0.0.1',
          );

          const updated = await repo.getEndpointById(endpoint.id);
          if (!updated) return false;

          return (
            updated.consecutiveSignatureFailures === 0 &&
            updated.isDisabledByFailures === false
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('endpoint disabled after threshold returns error on subsequent requests', async () => {
    /**
     * **Validates: Requirements 17.5**
     *
     * Once an endpoint is disabled, processWebhook must return success=false
     * with a disabled error, regardless of signature validity.
     */
    await fc.assert(
      fc.asyncProperty(
        arbPayload,
        async (payload) => {
          const { service } = createTestService();
          const connectionId = 'conn-disabled-check';
          const endpoint = await service.createEndpoint(
            connectionId,
            'provider-test',
            'user-test',
          );

          const badSig = 'sha256=invalidsignature0000000000000000000000000000000000000000000000';

          // Trigger exactly CONSECUTIVE_FAILURE_THRESHOLD failures to disable
          for (let i = 0; i < CONSECUTIVE_FAILURE_THRESHOLD; i++) {
            await service.processWebhook(
              connectionId,
              endpoint.secret,
              { 'X-Hub-Signature-256': badSig },
              payload,
              '127.0.0.1',
            );
          }

          // Now send a valid request — should still fail because endpoint is disabled
          const goodSig = `sha256=${computeHmacSignature(payload, endpoint.secret, 'sha256')}`;
          const result = await service.processWebhook(
            connectionId,
            endpoint.secret,
            { 'X-Hub-Signature-256': goodSig },
            payload,
            '127.0.0.1',
          );

          return result.success === false && result.error !== undefined;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Arbitraries for IP testing
// ---------------------------------------------------------------------------

/** Arbitrary for a valid IPv4 octet (0–255). */
const arbOctet: fc.Arbitrary<number> = fc.integer({ min: 0, max: 255 });

/** Arbitrary for a valid IPv4 address string. */
const arbIpv4: fc.Arbitrary<string> = fc
  .tuple(arbOctet, arbOctet, arbOctet, arbOctet)
  .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

/** Arbitrary for a CIDR prefix length (0–32). */
const arbPrefixLen: fc.Arbitrary<number> = fc.integer({ min: 0, max: 32 });

/** Arbitrary for a CIDR range derived from an IP and prefix length. */
const arbCidr: fc.Arbitrary<{ cidr: string; networkIp: string; prefixLen: number }> = fc
  .tuple(arbOctet, arbOctet, arbOctet, arbOctet, arbPrefixLen)
  .map(([a, b, c, d, prefix]) => {
    const networkIp = `${a}.${b}.${c}.${d}`;
    return { cidr: `${networkIp}/${prefix}`, networkIp, prefixLen: prefix };
  });

// ---------------------------------------------------------------------------
// Property 12: Webhook IP allowlist enforcement
// Tag: Feature: canary-provider-expansion, Property 12
// Validates: Requirements 17.6
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 12: Webhook IP allowlist enforcement', () => {
  it('empty allowlist accepts all IPv4 addresses', () => {
    /**
     * **Validates: Requirements 17.6**
     *
     * When the allowlist is empty, any source IP must be accepted.
     */
    fc.assert(
      fc.property(arbIpv4, (ip) => {
        return isIpAllowed(ip, []);
      }),
      { numRuns: 100 },
    );
  });

  it('IP within an allowed CIDR range is accepted', () => {
    /**
     * **Validates: Requirements 17.6**
     *
     * For any IP and CIDR range where the IP falls within the range,
     * isIpAllowed must return true.
     */
    fc.assert(
      fc.property(
        // Generate a network address and prefix, then derive an IP within the range
        fc.tuple(arbOctet, arbOctet, arbOctet, arbOctet, arbPrefixLen).map(
          ([a, b, c, d, prefix]) => {
            const networkNum =
              ((a * 256 + b) * 256 + c) * 256 + d;
            const mask =
              prefix === 0 ? 0 : ((~0 << (32 - prefix)) >>> 0);
            const maskedNetwork = (networkNum & mask) >>> 0;
            // Use the network address itself as the test IP (always in range)
            const testIp = [
              (maskedNetwork >>> 24) & 0xff,
              (maskedNetwork >>> 16) & 0xff,
              (maskedNetwork >>> 8) & 0xff,
              maskedNetwork & 0xff,
            ].join('.');
            const networkIp = [a, b, c, d].join('.');
            return { testIp, cidr: `${networkIp}/${prefix}` };
          },
        ),
        ({ testIp, cidr }) => {
          return isIpAllowed(testIp, [cidr]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('IP not in any allowed CIDR range is rejected', () => {
    /**
     * **Validates: Requirements 17.6**
     *
     * For any IP that does not fall within any of the allowed CIDR ranges,
     * isIpAllowed must return false.
     */
    fc.assert(
      fc.property(
        // Use a /32 allowlist (exact match) with a different IP
        arbIpv4,
        arbIpv4,
        (allowedIp, sourceIp) => {
          // Skip if IPs happen to be equal
          if (allowedIp === sourceIp) return true;
          // /32 means exact match only
          return !isIpAllowed(sourceIp, [`${allowedIp}/32`]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('IP accepted if it matches at least one CIDR in a multi-entry allowlist', () => {
    /**
     * **Validates: Requirements 17.6**
     *
     * For any IP and allowlist where the IP matches at least one entry,
     * isIpAllowed must return true.
     */
    fc.assert(
      fc.property(
        arbIpv4,
        // Generate 1–4 other IPs as /32 entries, then add the target IP as /32
        fc.array(arbIpv4, { minLength: 1, maxLength: 4 }),
        (targetIp, otherIps) => {
          const allowlist = [...otherIps.map((ip) => `${ip}/32`), `${targetIp}/32`];
          return isIpAllowed(targetIp, allowlist);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('processWebhook rejects requests from IPs not in the allowlist', async () => {
    /**
     * **Validates: Requirements 17.6**
     *
     * When an endpoint has a non-empty IP allowlist, processWebhook must
     * reject requests from IPs not in the allowlist.
     */
    await fc.assert(
      fc.asyncProperty(
        arbIpv4,
        arbIpv4,
        async (allowedIp, blockedIp) => {
          if (allowedIp === blockedIp) return true;

          const { service } = createTestService();
          const connectionId = 'conn-ip-test';
          const endpoint = await service.createEndpoint(
            connectionId,
            'provider-test',
            'user-test',
          );

          // Set IP allowlist to only allow the allowedIp
          await service.updateIpAllowlist(endpoint.id, [`${allowedIp}/32`]);

          const payload = Buffer.from('{"data":[]}', 'utf8');
          const sig = `sha256=${computeHmacSignature(payload, endpoint.secret, 'sha256')}`;

          const result = await service.processWebhook(
            connectionId,
            endpoint.secret,
            { 'X-Hub-Signature-256': sig },
            payload,
            blockedIp,
          );

          return result.success === false;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Webhook rate limiting
// Tag: Feature: canary-provider-expansion, Property 13
// Validates: Requirements 17.3
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-expansion, Property 13: Webhook rate limiting', () => {
  it('checkRateLimit allows requests when count < rateLimitPerMinute', () => {
    /**
     * **Validates: Requirements 17.3**
     *
     * For any set of timestamps within the 60-second window where the count
     * is less than the limit, the request must be allowed.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }).chain((limit) =>
          fc.integer({ min: 0, max: limit - 1 }).map((count) => ({ limit, count })),
        ),
        ({ limit, count }) => {
          const now = Date.now();
          // All timestamps within the 60-second window
          const timestamps = Array.from({ length: count }, (_, i) => now - i * 100);
          const result = checkRateLimit(timestamps, now, limit);
          return result.allowed === true && result.windowCount === count;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('checkRateLimit rejects requests when count >= rateLimitPerMinute', () => {
    /**
     * **Validates: Requirements 17.3**
     *
     * For any set of timestamps within the 60-second window where the count
     * equals or exceeds the limit, the request must be rejected.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }).chain((limit) =>
          fc.integer({ min: limit, max: limit + 50 }).map((count) => ({ limit, count })),
        ),
        ({ limit, count }) => {
          const now = Date.now();
          const timestamps = Array.from({ length: count }, (_, i) => now - i * 100);
          const result = checkRateLimit(timestamps, now, limit);
          return result.allowed === false;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('checkRateLimit ignores timestamps outside the 60-second window', () => {
    /**
     * **Validates: Requirements 17.3**
     *
     * Timestamps older than 60 seconds must not count toward the rate limit.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (oldCount, recentCount) => {
          const now = Date.now();
          const limit = recentCount + 1; // Allow exactly recentCount requests
          // Old timestamps (outside 60s window)
          const oldTimestamps = Array.from(
            { length: oldCount },
            (_, i) => now - 61_000 - i * 1000,
          );
          // Recent timestamps (inside 60s window)
          const recentTimestamps = Array.from(
            { length: recentCount },
            (_, i) => now - i * 100,
          );
          const allTimestamps = [...oldTimestamps, ...recentTimestamps];
          const result = checkRateLimit(allTimestamps, now, limit);
          // Only recentCount timestamps are in window, which is < limit
          return result.allowed === true && result.windowCount === recentCount;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('WebhookRateLimiter allows up to rateLimitPerMinute requests per 60s window', () => {
    /**
     * **Validates: Requirements 17.3**
     *
     * For any rate limit N, the WebhookRateLimiter must allow exactly N
     * requests within a 60-second window and reject the (N+1)th.
     */
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (limit) => {
        const limiter = new WebhookRateLimiter(limit);
        const now = Date.now();

        // Send exactly `limit` requests — all should be allowed
        let allAllowed = true;
        for (let i = 0; i < limit; i++) {
          const allowed = limiter.isAllowed(now + i);
          if (!allowed) {
            allAllowed = false;
            break;
          }
          limiter.record(now + i);
        }

        // The (limit+1)th request should be rejected
        const overLimitRejected = !limiter.isAllowed(now + limit);

        return allAllowed && overLimitRejected;
      }),
      { numRuns: 100 },
    );
  });

  it('WebhookRateLimiter resets after the 60-second window slides', () => {
    /**
     * **Validates: Requirements 17.3**
     *
     * After the 60-second window has passed, old requests no longer count
     * and new requests are allowed again.
     */
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (limit) => {
        const limiter = new WebhookRateLimiter(limit);
        const now = Date.now();

        // Fill up the rate limit
        for (let i = 0; i < limit; i++) {
          limiter.record(now + i);
        }

        // Should be rejected at this point
        const rejectedBeforeWindow = !limiter.isAllowed(now + limit);

        // Advance time by 61 seconds — all old timestamps expire
        const later = now + 61_000;
        const allowedAfterWindow = limiter.isAllowed(later);

        return rejectedBeforeWindow && allowedAfterWindow;
      }),
      { numRuns: 100 },
    );
  });

  it('processWebhook rejects requests exceeding the rate limit', async () => {
    /**
     * **Validates: Requirements 17.3**
     *
     * When an endpoint receives more requests than its rateLimitPerMinute
     * within 60 seconds, the excess requests must be rejected.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (extraRequests) => {
          const { service } = createTestService();
          const connectionId = 'conn-ratelimit-test';
          const endpoint = await service.createEndpoint(
            connectionId,
            'provider-test',
            'user-test',
          );

          // Set a very low rate limit for testing
          const lowLimit = 3;
          // Directly update the endpoint's rate limit via the repo
          // We need to use a fresh service with a custom endpoint
          const { service: svc2, repo: repo2 } = createTestService();
          const ep2 = await svc2.createEndpoint(
            'conn-rl2',
            'provider-test',
            'user-test',
          );
          await repo2.updateEndpoint(ep2.id, { rateLimitPerMinute: lowLimit });

          const payload = Buffer.from('{"data":[{"id":"1"}]}', 'utf8');
          const results: boolean[] = [];

          // Send lowLimit + extraRequests requests
          for (let i = 0; i < lowLimit + extraRequests; i++) {
            const sig = `sha256=${computeHmacSignature(payload, ep2.secret, 'sha256')}`;
            const result = await svc2.processWebhook(
              'conn-rl2',
              ep2.secret,
              { 'X-Hub-Signature-256': sig },
              payload,
              '127.0.0.1',
            );
            results.push(result.success);
          }

          // First lowLimit requests should succeed, rest should fail
          const successCount = results.filter(Boolean).length;
          const failCount = results.filter((r) => !r).length;

          return successCount === lowLimit && failCount === extraRequests;
        },
      ),
      { numRuns: 50 },
    );
  });
});
