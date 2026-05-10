/**
 * Unit tests for WebhookEndpointService.
 *
 * Feature: canary-provider-expansion
 * Requirements: 10.4, 10.5, 10.8, 17.3, 17.4, 17.5, 17.6, 17.7
 */
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import type { IWebhookEndpointBase } from '@brightchain/digitalburnbag-lib';
import {
  WebhookEndpointService,
  computeHmacSignature,
  generateWebhookSecret,
  CONSECUTIVE_FAILURE_THRESHOLD,
  DEFAULT_RATE_LIMIT_PER_MINUTE,
} from '../../services/webhook-endpoint-service';
import type { BrightDBWebhookEndpointRepository } from '../../collections/webhook-endpoint-collection';

// ---------------------------------------------------------------------------
// In-memory repository (same pattern as property test file)
// ---------------------------------------------------------------------------

function createInMemoryEndpointRepository(): BrightDBWebhookEndpointRepository<string> {
  const store = new Map<string, IWebhookEndpointBase<string>>();

  return {
    getEndpointById: async (id: string) => store.get(id) ?? null,
    getEndpointByConnectionId: async (connectionId: string) =>
      [...store.values()].find(
        (e) => String(e.connectionId) === String(connectionId),
      ) ?? null,
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

let idCounter = 0;

function makeService(
  repo?: BrightDBWebhookEndpointRepository<string>,
  onSignal?: jest.Mock,
  onNotify?: jest.Mock,
) {
  const r = repo ?? createInMemoryEndpointRepository();
  const service = new WebhookEndpointService<string>(
    r,
    onSignal,
    onNotify,
    () => `whe-${++idCounter}`,
  );
  return { service, repo: r };
}

/** Build a valid HMAC-SHA256 signature header value for a payload. */
function validSig(payload: Buffer, secret: string): string {
  return `sha256=${computeHmacSignature(payload, secret, 'sha256')}`;
}

const SAMPLE_PAYLOAD = Buffer.from('{"data":[{"id":"evt-1"}]}', 'utf8');
const BAD_SIG = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

beforeEach(() => {
  idCounter = 0;
});

// ---------------------------------------------------------------------------
// Req 10.5 — HTTP 401 equivalent: invalid signature returns success=false
// ---------------------------------------------------------------------------

describe('WebhookEndpointService — invalid signature (Req 10.5)', () => {
  it('returns success=false with "Invalid signature" error on bad HMAC', async () => {
    const { service } = makeService();
    const endpoint = await service.createEndpoint('conn-1', 'provider-test', 'user-1');

    const result = await service.processWebhook(
      'conn-1',
      endpoint.secret,
      { 'X-Hub-Signature-256': BAD_SIG },
      SAMPLE_PAYLOAD,
      '127.0.0.1',
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid signature/i);
  });

  it('returns success=false when signature header is missing entirely', async () => {
    const { service } = makeService();
    await service.createEndpoint('conn-2', 'provider-test', 'user-1');

    const result = await service.processWebhook(
      'conn-2',
      generateWebhookSecret(),
      {}, // no signature header
      SAMPLE_PAYLOAD,
      '127.0.0.1',
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid signature/i);
  });

  it('returns success=true when signature is correct', async () => {
    const { service } = makeService();
    const endpoint = await service.createEndpoint('conn-3', 'provider-test', 'user-1');

    const result = await service.processWebhook(
      'conn-3',
      endpoint.secret,
      { 'X-Hub-Signature-256': validSig(SAMPLE_PAYLOAD, endpoint.secret) },
      SAMPLE_PAYLOAD,
      '127.0.0.1',
    );

    expect(result.success).toBe(true);
  });

  it('increments failedValidation stat on invalid signature', async () => {
    const repo = createInMemoryEndpointRepository();
    const { service } = makeService(repo);
    const endpoint = await service.createEndpoint('conn-4', 'provider-test', 'user-1');

    await service.processWebhook(
      'conn-4',
      endpoint.secret,
      { 'X-Hub-Signature-256': BAD_SIG },
      SAMPLE_PAYLOAD,
      '127.0.0.1',
    );

    const updated = await repo.getEndpointById(endpoint.id);
    expect(updated?.stats.failedValidation).toBe(1);
    expect(updated?.stats.successfullyProcessed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Req 17.3 — HTTP 429 equivalent: rate limit exceeded returns success=false
// ---------------------------------------------------------------------------

describe('WebhookEndpointService — rate limit exceeded (Req 17.3)', () => {
  it('returns success=false with "Rate limit exceeded" after limit is hit', async () => {
    const repo = createInMemoryEndpointRepository();
    const { service } = makeService(repo);

    // Create endpoint with a very low rate limit (2 per minute)
    const endpoint = await service.createEndpoint('conn-rl', 'provider-test', 'user-1');
    // Manually set a low rate limit in the repo
    await repo.updateEndpoint(endpoint.id, { rateLimitPerMinute: 2 });

    const payload = SAMPLE_PAYLOAD;
    const sig = validSig(payload, endpoint.secret);
    const headers = { 'X-Hub-Signature-256': sig };

    // First two requests should succeed
    const r1 = await service.processWebhook('conn-rl', endpoint.secret, headers, payload, '127.0.0.1');
    const r2 = await service.processWebhook('conn-rl', endpoint.secret, headers, payload, '127.0.0.1');

    // Third request should be rate-limited
    const r3 = await service.processWebhook('conn-rl', endpoint.secret, headers, payload, '127.0.0.1');

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(false);
    expect(r3.error).toMatch(/rate limit exceeded/i);
  });

  it('default rate limit is 100 per minute', async () => {
    const { service } = makeService();
    const endpoint = await service.createEndpoint('conn-rl-default', 'provider-test', 'user-1');
    expect(endpoint.rateLimitPerMinute).toBe(DEFAULT_RATE_LIMIT_PER_MINUTE);
    expect(DEFAULT_RATE_LIMIT_PER_MINUTE).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Req 17.6 — HTTP 403 equivalent: IP not in allowlist returns success=false
// ---------------------------------------------------------------------------

describe('WebhookEndpointService — IP allowlist enforcement (Req 17.6)', () => {
  it('returns success=false with "Source IP not in allowlist" for blocked IP', async () => {
    const repo = createInMemoryEndpointRepository();
    const { service } = makeService(repo);
    const endpoint = await service.createEndpoint('conn-ip', 'provider-test', 'user-1');

    // Set a restrictive allowlist that excludes 10.0.0.1
    await repo.updateEndpoint(endpoint.id, { ipAllowlist: ['192.168.1.0/24'] });

    const result = await service.processWebhook(
      'conn-ip',
      endpoint.secret,
      { 'X-Hub-Signature-256': validSig(SAMPLE_PAYLOAD, endpoint.secret) },
      SAMPLE_PAYLOAD,
      '10.0.0.1', // not in allowlist
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/source ip not in allowlist/i);
  });

  it('returns success=true when source IP is within the allowed CIDR', async () => {
    const repo = createInMemoryEndpointRepository();
    const { service } = makeService(repo);
    const endpoint = await service.createEndpoint('conn-ip2', 'provider-test', 'user-1');

    await repo.updateEndpoint(endpoint.id, { ipAllowlist: ['192.168.1.0/24'] });

    const result = await service.processWebhook(
      'conn-ip2',
      endpoint.secret,
      { 'X-Hub-Signature-256': validSig(SAMPLE_PAYLOAD, endpoint.secret) },
      SAMPLE_PAYLOAD,
      '192.168.1.50', // within allowlist
    );

    expect(result.success).toBe(true);
  });

  it('accepts all IPs when allowlist is empty', async () => {
    const { service } = makeService();
    const endpoint = await service.createEndpoint('conn-ip3', 'provider-test', 'user-1');
    // No ipAllowlist set — defaults to empty (accept all)

    const result = await service.processWebhook(
      'conn-ip3',
      endpoint.secret,
      { 'X-Hub-Signature-256': validSig(SAMPLE_PAYLOAD, endpoint.secret) },
      SAMPLE_PAYLOAD,
      '203.0.113.42',
    );

    expect(result.success).toBe(true);
  });

  it('logs ip_blocked outcome in delivery log', async () => {
    const repo = createInMemoryEndpointRepository();
    const { service } = makeService(repo);
    const endpoint = await service.createEndpoint('conn-ip4', 'provider-test', 'user-1');
    await repo.updateEndpoint(endpoint.id, { ipAllowlist: ['10.0.0.0/8'] });

    await service.processWebhook(
      'conn-ip4',
      endpoint.secret,
      { 'X-Hub-Signature-256': validSig(SAMPLE_PAYLOAD, endpoint.secret) },
      SAMPLE_PAYLOAD,
      '172.16.0.1', // blocked
    );

    const log = service.getDeliveryLog(endpoint.id);
    expect(log).toHaveLength(1);
    expect(log[0].outcome).toBe('ip_blocked');
    expect(log[0].signatureValid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Req 17.5 — HTTP 503 equivalent: disabled endpoint returns success=false
// ---------------------------------------------------------------------------

describe('WebhookEndpointService — disabled endpoint (Req 17.5)', () => {
  it('returns success=false with disabled error when endpoint is disabled', async () => {
    const repo = createInMemoryEndpointRepository();
    const { service } = makeService(repo);
    const endpoint = await service.createEndpoint('conn-dis', 'provider-test', 'user-1');

    // Manually disable the endpoint
    await repo.updateEndpoint(endpoint.id, { isDisabledByFailures: true });

    const result = await service.processWebhook(
      'conn-dis',
      endpoint.secret,
      { 'X-Hub-Signature-256': validSig(SAMPLE_PAYLOAD, endpoint.secret) },
      SAMPLE_PAYLOAD,
      '127.0.0.1',
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/disabled/i);
  });

  it('auto-disables endpoint after 10 consecutive signature failures', async () => {
    const repo = createInMemoryEndpointRepository();
    const { service } = makeService(repo);
    const endpoint = await service.createEndpoint('conn-auto-dis', 'provider-test', 'user-1');

    for (let i = 0; i < CONSECUTIVE_FAILURE_THRESHOLD; i++) {
      await service.processWebhook(
        'conn-auto-dis',
        endpoint.secret,
        { 'X-Hub-Signature-256': BAD_SIG },
        SAMPLE_PAYLOAD,
        '127.0.0.1',
      );
    }

    const updated = await repo.getEndpointById(endpoint.id);
    expect(updated?.isDisabledByFailures).toBe(true);
  });

  it('calls onNotify callback when endpoint is auto-disabled', async () => {
    const onNotify = jest.fn();
    const { service } = makeService(undefined, undefined, onNotify);
    const endpoint = await service.createEndpoint('conn-notify', 'provider-test', 'user-1');

    for (let i = 0; i < CONSECUTIVE_FAILURE_THRESHOLD; i++) {
      await service.processWebhook(
        'conn-notify',
        endpoint.secret,
        { 'X-Hub-Signature-256': BAD_SIG },
        SAMPLE_PAYLOAD,
        '127.0.0.1',
      );
    }

    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(onNotify.mock.calls[0][0]).toBe('conn-notify');
  });

  it('disabled endpoint logs "disabled" outcome in delivery log', async () => {
    const repo = createInMemoryEndpointRepository();
    const { service } = makeService(repo);
    const endpoint = await service.createEndpoint('conn-dis-log', 'provider-test', 'user-1');
    await repo.updateEndpoint(endpoint.id, { isDisabledByFailures: true });

    await service.processWebhook(
      'conn-dis-log',
      endpoint.secret,
      { 'X-Hub-Signature-256': validSig(SAMPLE_PAYLOAD, endpoint.secret) },
      SAMPLE_PAYLOAD,
      '127.0.0.1',
    );

    const log = service.getDeliveryLog(endpoint.id);
    expect(log).toHaveLength(1);
    expect(log[0].outcome).toBe('disabled');
  });

  it('enableEndpoint re-enables a disabled endpoint and resets failure counter', async () => {
    const repo = createInMemoryEndpointRepository();
    const { service } = makeService(repo);
    const endpoint = await service.createEndpoint('conn-reenable', 'provider-test', 'user-1');

    // Disable it
    await repo.updateEndpoint(endpoint.id, {
      isDisabledByFailures: true,
      consecutiveSignatureFailures: CONSECUTIVE_FAILURE_THRESHOLD,
    });

    await service.enableEndpoint(endpoint.id);

    const updated = await repo.getEndpointById(endpoint.id);
    expect(updated?.isDisabledByFailures).toBe(false);
    expect(updated?.consecutiveSignatureFailures).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Req 10.8 — Webhook timeout emits CHECK_FAILED
// ---------------------------------------------------------------------------

describe('WebhookEndpointService — timeout emits CHECK_FAILED (Req 10.8)', () => {
  it('checkEndpointTimeout emits CHECK_FAILED when lastReceivedAt + timeoutMs < now', async () => {
    const repo = createInMemoryEndpointRepository();
    const onSignal = jest.fn();
    const { service } = makeService(repo, onSignal);
    const endpoint = await service.createEndpoint('conn-timeout', 'provider-test', 'user-1');

    const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    await repo.updateEndpoint(endpoint.id, {
      lastReceivedAt: pastTime,
      timeoutMs: 60 * 60 * 1000, // 1 hour timeout
    });

    await service.checkEndpointTimeout(endpoint.id);

    expect(onSignal).toHaveBeenCalledTimes(1);
    expect(onSignal.mock.calls[0][0].signalType).toBe(HeartbeatSignalType.CHECK_FAILED);
    expect(onSignal.mock.calls[0][0].connectionId).toBe('conn-timeout');
  });

  it('checkEndpointTimeout does NOT emit CHECK_FAILED when within timeout window', async () => {
    const repo = createInMemoryEndpointRepository();
    const onSignal = jest.fn();
    const { service } = makeService(repo, onSignal);
    const endpoint = await service.createEndpoint('conn-no-timeout', 'provider-test', 'user-1');

    const recentTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    await repo.updateEndpoint(endpoint.id, {
      lastReceivedAt: recentTime,
      timeoutMs: 60 * 60 * 1000, // 1 hour timeout — not yet expired
    });

    await service.checkEndpointTimeout(endpoint.id);

    expect(onSignal).not.toHaveBeenCalled();
  });

  it('checkEndpointTimeout does NOT emit when endpoint has never received a webhook', async () => {
    const repo = createInMemoryEndpointRepository();
    const onSignal = jest.fn();
    const { service } = makeService(repo, onSignal);
    const endpoint = await service.createEndpoint('conn-never', 'provider-test', 'user-1');
    // lastReceivedAt is undefined — never received

    await service.checkEndpointTimeout(endpoint.id);

    expect(onSignal).not.toHaveBeenCalled();
  });

  it('checkEndpointTimeout does NOT emit for a disabled endpoint', async () => {
    const repo = createInMemoryEndpointRepository();
    const onSignal = jest.fn();
    const { service } = makeService(repo, onSignal);
    const endpoint = await service.createEndpoint('conn-dis-timeout', 'provider-test', 'user-1');

    const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await repo.updateEndpoint(endpoint.id, {
      lastReceivedAt: pastTime,
      timeoutMs: 60 * 60 * 1000,
      isDisabledByFailures: true,
    });

    await service.checkEndpointTimeout(endpoint.id);

    expect(onSignal).not.toHaveBeenCalled();
  });

  it('CHECK_FAILED signal includes correct connectionId and sourceIp=internal', async () => {
    const repo = createInMemoryEndpointRepository();
    const onSignal = jest.fn();
    const { service } = makeService(repo, onSignal);
    const endpoint = await service.createEndpoint('conn-chk-fields', 'provider-test', 'user-1');

    const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await repo.updateEndpoint(endpoint.id, {
      lastReceivedAt: pastTime,
      timeoutMs: 60 * 60 * 1000,
    });

    await service.checkEndpointTimeout(endpoint.id);

    const call = onSignal.mock.calls[0][0];
    expect(call.connectionId).toBe('conn-chk-fields');
    expect(call.signalType).toBe(HeartbeatSignalType.CHECK_FAILED);
    expect(call.sourceIp).toBe('internal');
  });
});

// ---------------------------------------------------------------------------
// Req 17.4 — Delivery logging with all required fields
// ---------------------------------------------------------------------------

describe('WebhookEndpointService — delivery logging (Req 17.4)', () => {
  it('logs a successful delivery with all required fields', async () => {
    const { service } = makeService();
    const endpoint = await service.createEndpoint('conn-log-ok', 'provider-test', 'user-1');

    await service.processWebhook(
      'conn-log-ok',
      endpoint.secret,
      { 'X-Hub-Signature-256': validSig(SAMPLE_PAYLOAD, endpoint.secret) },
      SAMPLE_PAYLOAD,
      '10.10.10.10',
    );

    const log = service.getDeliveryLog(endpoint.id);
    expect(log).toHaveLength(1);

    const entry = log[0];
    expect(entry.timestamp).toBeInstanceOf(Date);
    expect(entry.sourceIp).toBe('10.10.10.10');
    expect(entry.signatureValid).toBe(true);
    expect(entry.outcome).toBe('success');
    expect(typeof entry.processingTimeMs).toBe('number');
    expect(entry.processingTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('logs an invalid-signature delivery with signatureValid=false', async () => {
    const { service } = makeService();
    const endpoint = await service.createEndpoint('conn-log-fail', 'provider-test', 'user-1');

    await service.processWebhook(
      'conn-log-fail',
      endpoint.secret,
      { 'X-Hub-Signature-256': BAD_SIG },
      SAMPLE_PAYLOAD,
      '1.2.3.4',
    );

    const log = service.getDeliveryLog(endpoint.id);
    expect(log).toHaveLength(1);

    const entry = log[0];
    expect(entry.signatureValid).toBe(false);
    expect(entry.outcome).toBe('invalid_signature');
    expect(entry.sourceIp).toBe('1.2.3.4');
    expect(entry.timestamp).toBeInstanceOf(Date);
    expect(typeof entry.processingTimeMs).toBe('number');
  });

  it('logs a rate-limited delivery with outcome=rate_limited', async () => {
    const repo = createInMemoryEndpointRepository();
    const { service } = makeService(repo);
    const endpoint = await service.createEndpoint('conn-log-rl', 'provider-test', 'user-1');
    await repo.updateEndpoint(endpoint.id, { rateLimitPerMinute: 1 });

    const headers = { 'X-Hub-Signature-256': validSig(SAMPLE_PAYLOAD, endpoint.secret) };

    // First request succeeds
    await service.processWebhook('conn-log-rl', endpoint.secret, headers, SAMPLE_PAYLOAD, '127.0.0.1');
    // Second request is rate-limited
    await service.processWebhook('conn-log-rl', endpoint.secret, headers, SAMPLE_PAYLOAD, '127.0.0.1');

    const log = service.getDeliveryLog(endpoint.id);
    const rateLimitedEntry = log.find((e) => e.outcome === 'rate_limited');
    expect(rateLimitedEntry).toBeDefined();
    expect(rateLimitedEntry?.signatureValid).toBe(false);
    expect(rateLimitedEntry?.sourceIp).toBe('127.0.0.1');
    expect(rateLimitedEntry?.timestamp).toBeInstanceOf(Date);
  });

  it('accumulates multiple log entries across deliveries', async () => {
    const { service } = makeService();
    const endpoint = await service.createEndpoint('conn-log-multi', 'provider-test', 'user-1');

    const goodHeaders = { 'X-Hub-Signature-256': validSig(SAMPLE_PAYLOAD, endpoint.secret) };
    const badHeaders = { 'X-Hub-Signature-256': BAD_SIG };

    await service.processWebhook('conn-log-multi', endpoint.secret, goodHeaders, SAMPLE_PAYLOAD, '127.0.0.1');
    await service.processWebhook('conn-log-multi', endpoint.secret, badHeaders, SAMPLE_PAYLOAD, '127.0.0.1');
    await service.processWebhook('conn-log-multi', endpoint.secret, goodHeaders, SAMPLE_PAYLOAD, '127.0.0.1');

    const log = service.getDeliveryLog(endpoint.id);
    expect(log).toHaveLength(3);
    expect(log[0].outcome).toBe('success');
    expect(log[1].outcome).toBe('invalid_signature');
    expect(log[2].outcome).toBe('success');
  });

  it('getDeliveryLog returns empty array for endpoint with no deliveries', async () => {
    const { service } = makeService();
    const endpoint = await service.createEndpoint('conn-log-empty', 'provider-test', 'user-1');

    const log = service.getDeliveryLog(endpoint.id);
    expect(log).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Req 17.7 — Test webhook button sends sample and returns result
// ---------------------------------------------------------------------------

describe('WebhookEndpointService — sendTestWebhook (Req 17.7)', () => {
  it('sendTestWebhook returns success=true for a valid active endpoint', async () => {
    const { service } = makeService();
    const endpoint = await service.createEndpoint('conn-test-wh', 'provider-test', 'user-1');

    const result = await service.sendTestWebhook(endpoint.id);

    expect(result.success).toBe(true);
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('sendTestWebhook returns success=false with error for unknown endpoint', async () => {
    const { service } = makeService();

    const result = await service.sendTestWebhook('nonexistent-id');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it('sendTestWebhook emits a heartbeat signal via onSignal callback', async () => {
    const onSignal = jest.fn();
    const { service } = makeService(undefined, onSignal);
    const endpoint = await service.createEndpoint('conn-test-signal', 'provider-test', 'user-1');

    await service.sendTestWebhook(endpoint.id);

    expect(onSignal).toHaveBeenCalledTimes(1);
    const call = onSignal.mock.calls[0][0];
    expect(call.connectionId).toBe('conn-test-signal');
    expect([HeartbeatSignalType.PRESENCE, HeartbeatSignalType.ABSENCE]).toContain(call.signalType);
  });

  it('sendTestWebhook logs the delivery attempt', async () => {
    const { service } = makeService();
    const endpoint = await service.createEndpoint('conn-test-log', 'provider-test', 'user-1');

    await service.sendTestWebhook(endpoint.id);

    const log = service.getDeliveryLog(endpoint.id);
    expect(log.length).toBeGreaterThan(0);
    expect(log[log.length - 1].outcome).toBe('success');
  });

  it('sendTestWebhook returns a result with processingTimeMs field', async () => {
    const { service } = makeService();
    const endpoint = await service.createEndpoint('conn-test-time', 'provider-test', 'user-1');

    const result = await service.sendTestWebhook(endpoint.id);

    expect(typeof result.processingTimeMs).toBe('number');
  });

  it('sendTestWebhook increments successfullyProcessed stat', async () => {
    const repo = createInMemoryEndpointRepository();
    const { service } = makeService(repo);
    const endpoint = await service.createEndpoint('conn-test-stats', 'provider-test', 'user-1');

    await service.sendTestWebhook(endpoint.id);

    const updated = await repo.getEndpointById(endpoint.id);
    expect(updated?.stats.successfullyProcessed).toBe(1);
    expect(updated?.stats.totalReceived).toBe(1);
  });
});
