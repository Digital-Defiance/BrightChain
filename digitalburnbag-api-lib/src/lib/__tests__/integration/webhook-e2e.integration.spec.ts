/**
 * Integration tests for webhook end-to-end flow.
 *
 * Tests the full pipeline from HTTP request through signature verification,
 * signal emission, and stats update. Also tests secret rotation with grace
 * period behavior.
 *
 * Feature: canary-provider-expansion
 * Requirements: 10.1, 10.2, 10.3, 10.6, 10.7
 */
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import type { IWebhookEndpointBase } from '@brightchain/digitalburnbag-lib';
import {
  WebhookEndpointService,
  computeHmacSignature,
  generateWebhookSecret,
  CONSECUTIVE_FAILURE_THRESHOLD,
} from '../../services/webhook-endpoint-service';
import { WebhookController } from '../../controllers/webhook-controller';
import type { BrightDBWebhookEndpointRepository } from '../../collections/webhook-endpoint-collection';
import express from 'express';
import request from 'supertest';

// ---------------------------------------------------------------------------
// In-memory repository for integration testing
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

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let idCounter = 0;

function createIntegrationStack(options?: { onSignal?: jest.Mock; onNotify?: jest.Mock }) {
  const repo = createInMemoryEndpointRepository();
  const onSignal = options?.onSignal ?? jest.fn();
  const onNotify = options?.onNotify ?? jest.fn();

  const service = new WebhookEndpointService<string>(
    repo,
    onSignal,
    onNotify,
    () => `whe-int-${++idCounter}`,
  );

  const controller = new WebhookController<string>({
    webhookEndpointService: service,
    parseId: (id: string) => id,
  });

  const app = express();
  // Mount the webhook controller at the expected path
  app.use('/api/webhooks/canary', controller.router);

  return { app, service, repo, onSignal, onNotify };
}

/** Build a valid HMAC-SHA256 signature header value for a payload. */
function validSig(payload: Buffer, secret: string): string {
  return `sha256=${computeHmacSignature(payload, secret, 'sha256')}`;
}

const SAMPLE_PAYLOAD = Buffer.from(
  JSON.stringify({ data: [{ id: 'evt-1', type: 'activity', created_at: new Date().toISOString() }] }),
  'utf8',
);

beforeEach(() => {
  idCounter = 0;
});

// ---------------------------------------------------------------------------
// E2E Flow: POST to webhook URL → signature verification → signal emission → stats update
// Requirements: 10.1, 10.2, 10.3, 10.7
// ---------------------------------------------------------------------------

describe('Webhook E2E: POST → verify → signal → stats', () => {
  it('full flow: valid POST emits PRESENCE signal and updates stats', async () => {
    const { app, service, repo, onSignal } = createIntegrationStack();

    // Step 1: Create an endpoint (simulates user setup)
    const endpoint = await service.createEndpoint('conn-e2e-1', 'github', 'user-1');
    const secret = endpoint.secret;

    // Step 2: POST a valid webhook payload to the endpoint URL
    const payload = SAMPLE_PAYLOAD;
    const signature = validSig(payload, secret);

    const res = await request(app)
      .post(`/api/webhooks/canary/${endpoint.connectionId}/${secret}`)
      .set('X-Hub-Signature-256', signature)
      .set('Content-Type', 'application/json')
      .send(payload.toString('utf8'));

    // Step 3: Verify HTTP 200 response (Req 10.4)
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Step 4: Verify signal was emitted (Req 10.3)
    expect(onSignal).toHaveBeenCalledTimes(1);
    const signalCall = onSignal.mock.calls[0][0];
    expect(signalCall.connectionId).toBe('conn-e2e-1');
    expect(signalCall.signalType).toBe(HeartbeatSignalType.PRESENCE);
    expect(signalCall.timestamp).toBeInstanceOf(Date);

    // Step 5: Verify stats were updated (Req 10.7)
    const updated = await repo.getEndpointById(endpoint.id);
    expect(updated?.stats.totalReceived).toBe(1);
    expect(updated?.stats.successfullyProcessed).toBe(1);
    expect(updated?.stats.failedValidation).toBe(0);
    expect(updated?.stats.lastSuccessAt).toBeDefined();
  });

  it('invalid signature returns 401 and does NOT emit signal', async () => {
    const { app, service, repo, onSignal } = createIntegrationStack();

    const endpoint = await service.createEndpoint('conn-e2e-2', 'github', 'user-1');

    const payload = SAMPLE_PAYLOAD;
    const badSignature = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

    const res = await request(app)
      .post(`/api/webhooks/canary/${endpoint.connectionId}/${endpoint.secret}`)
      .set('X-Hub-Signature-256', badSignature)
      .set('Content-Type', 'application/json')
      .send(payload.toString('utf8'));

    // Req 10.5: HTTP 401 for invalid signature
    expect(res.status).toBe(401);

    // Signal should NOT be emitted
    expect(onSignal).not.toHaveBeenCalled();

    // Stats should reflect the failure (Req 10.7)
    const updated = await repo.getEndpointById(endpoint.id);
    expect(updated?.stats.totalReceived).toBe(1);
    expect(updated?.stats.failedValidation).toBe(1);
    expect(updated?.stats.successfullyProcessed).toBe(0);
  });

  it('unknown connectionId returns 404 without revealing endpoint existence', async () => {
    const { app, onSignal } = createIntegrationStack();

    const res = await request(app)
      .post('/api/webhooks/canary/nonexistent-conn/fake-secret')
      .set('X-Hub-Signature-256', 'sha256=abc123')
      .set('Content-Type', 'application/json')
      .send('{"data":[]}');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
    expect(onSignal).not.toHaveBeenCalled();
  });

  it('multiple valid deliveries accumulate stats correctly', async () => {
    const { app, service, repo, onSignal } = createIntegrationStack();

    const endpoint = await service.createEndpoint('conn-e2e-multi', 'stripe', 'user-1');
    const secret = endpoint.secret;
    const payload = SAMPLE_PAYLOAD;
    const signature = validSig(payload, secret);

    // Send 3 valid webhooks
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post(`/api/webhooks/canary/${endpoint.connectionId}/${secret}`)
        .set('X-Hub-Signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(payload.toString('utf8'));
    }

    // Verify cumulative stats (Req 10.7)
    const updated = await repo.getEndpointById(endpoint.id);
    expect(updated?.stats.totalReceived).toBe(3);
    expect(updated?.stats.successfullyProcessed).toBe(3);
    expect(updated?.stats.failedValidation).toBe(0);

    // All 3 signals emitted
    expect(onSignal).toHaveBeenCalledTimes(3);
  });

  it('mixed valid and invalid deliveries track stats accurately', async () => {
    const { app, service, repo, onSignal } = createIntegrationStack();

    const endpoint = await service.createEndpoint('conn-e2e-mixed', 'github', 'user-1');
    const secret = endpoint.secret;
    const payload = SAMPLE_PAYLOAD;
    const goodSig = validSig(payload, secret);
    const badSig = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

    // Valid
    await request(app)
      .post(`/api/webhooks/canary/${endpoint.connectionId}/${secret}`)
      .set('X-Hub-Signature-256', goodSig)
      .set('Content-Type', 'application/json')
      .send(payload.toString('utf8'));

    // Invalid
    await request(app)
      .post(`/api/webhooks/canary/${endpoint.connectionId}/${secret}`)
      .set('X-Hub-Signature-256', badSig)
      .set('Content-Type', 'application/json')
      .send(payload.toString('utf8'));

    // Valid
    await request(app)
      .post(`/api/webhooks/canary/${endpoint.connectionId}/${secret}`)
      .set('X-Hub-Signature-256', goodSig)
      .set('Content-Type', 'application/json')
      .send(payload.toString('utf8'));

    // Req 10.7: totalReceived = successfullyProcessed + failedValidation
    const updated = await repo.getEndpointById(endpoint.id);
    expect(updated?.stats.totalReceived).toBe(3);
    expect(updated?.stats.successfullyProcessed).toBe(2);
    expect(updated?.stats.failedValidation).toBe(1);

    // Only valid deliveries emit signals
    expect(onSignal).toHaveBeenCalledTimes(2);
  });

  it('consecutive signature failures disable endpoint and return 503', async () => {
    const { app, service, repo, onSignal, onNotify } = createIntegrationStack();

    const endpoint = await service.createEndpoint('conn-e2e-disable', 'github', 'user-1');
    const secret = endpoint.secret;
    const payload = SAMPLE_PAYLOAD;
    const badSig = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

    // Send CONSECUTIVE_FAILURE_THRESHOLD (10) bad requests
    for (let i = 0; i < CONSECUTIVE_FAILURE_THRESHOLD; i++) {
      await request(app)
        .post(`/api/webhooks/canary/${endpoint.connectionId}/${secret}`)
        .set('X-Hub-Signature-256', badSig)
        .set('Content-Type', 'application/json')
        .send(payload.toString('utf8'));
    }

    // Endpoint should now be disabled
    const updated = await repo.getEndpointById(endpoint.id);
    expect(updated?.isDisabledByFailures).toBe(true);

    // Notification should have been sent
    expect(onNotify).toHaveBeenCalledTimes(1);

    // Next request should get 503
    const res = await request(app)
      .post(`/api/webhooks/canary/${endpoint.connectionId}/${secret}`)
      .set('X-Hub-Signature-256', validSig(payload, secret))
      .set('Content-Type', 'application/json')
      .send(payload.toString('utf8'));

    expect(res.status).toBe(503);

    // No signals should have been emitted during the entire sequence
    expect(onSignal).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// E2E Flow: Secret rotation → both secrets accepted → grace period expires → old rejected
// Requirements: 10.6, 10.7
// ---------------------------------------------------------------------------

describe('Webhook E2E: Secret rotation with grace period', () => {
  it('after rotation, both old and new secrets are accepted during grace period', async () => {
    const { app, service, repo, onSignal } = createIntegrationStack();

    const endpoint = await service.createEndpoint('conn-rotate-1', 'github', 'user-1');
    const oldSecret = endpoint.secret;

    // Rotate the secret with a long grace period (1 hour)
    const { newSecret } = await service.rotateSecret(endpoint.id, 60 * 60 * 1000);
    expect(newSecret).not.toBe(oldSecret);
    expect(newSecret).toHaveLength(64); // 32 bytes hex-encoded

    const payload = SAMPLE_PAYLOAD;

    // Request signed with NEW secret should succeed
    const newSig = validSig(payload, newSecret);
    const res1 = await request(app)
      .post(`/api/webhooks/canary/${endpoint.connectionId}/${oldSecret}`)
      .set('X-Hub-Signature-256', newSig)
      .set('Content-Type', 'application/json')
      .send(payload.toString('utf8'));

    expect(res1.status).toBe(200);
    expect(onSignal).toHaveBeenCalledTimes(1);

    // Request signed with OLD secret should also succeed during grace period
    const oldSig = validSig(payload, oldSecret);
    const res2 = await request(app)
      .post(`/api/webhooks/canary/${endpoint.connectionId}/${oldSecret}`)
      .set('X-Hub-Signature-256', oldSig)
      .set('Content-Type', 'application/json')
      .send(payload.toString('utf8'));

    expect(res2.status).toBe(200);
    expect(onSignal).toHaveBeenCalledTimes(2);

    // Both deliveries should be tracked in stats
    const updated = await repo.getEndpointById(endpoint.id);
    expect(updated?.stats.successfullyProcessed).toBe(2);
    expect(updated?.stats.totalReceived).toBe(2);
  });

  it('after grace period expires, old secret is rejected', async () => {
    const { app, service, repo, onSignal } = createIntegrationStack();

    const endpoint = await service.createEndpoint('conn-rotate-2', 'github', 'user-1');
    const oldSecret = endpoint.secret;

    // Rotate with a very short grace period (1ms — effectively expired immediately)
    const { newSecret } = await service.rotateSecret(endpoint.id, 1);

    // Wait a tiny bit to ensure grace period has expired
    await new Promise((resolve) => setTimeout(resolve, 10));

    const payload = SAMPLE_PAYLOAD;

    // Request signed with OLD secret should now FAIL (grace period expired)
    const oldSig = validSig(payload, oldSecret);
    const res = await request(app)
      .post(`/api/webhooks/canary/${endpoint.connectionId}/${oldSecret}`)
      .set('X-Hub-Signature-256', oldSig)
      .set('Content-Type', 'application/json')
      .send(payload.toString('utf8'));

    expect(res.status).toBe(401);
    expect(onSignal).not.toHaveBeenCalled();

    // Stats should reflect the failure
    const updated = await repo.getEndpointById(endpoint.id);
    expect(updated?.stats.failedValidation).toBe(1);

    // Request signed with NEW secret should still succeed
    const newSig = validSig(payload, newSecret);
    const res2 = await request(app)
      .post(`/api/webhooks/canary/${endpoint.connectionId}/${oldSecret}`)
      .set('X-Hub-Signature-256', newSig)
      .set('Content-Type', 'application/json')
      .send(payload.toString('utf8'));

    expect(res2.status).toBe(200);
    expect(onSignal).toHaveBeenCalledTimes(1);
  });

  it('rotation preserves endpoint stats and does not reset counters', async () => {
    const { app, service, repo, onSignal } = createIntegrationStack();

    const endpoint = await service.createEndpoint('conn-rotate-3', 'github', 'user-1');
    const originalSecret = endpoint.secret;
    const payload = SAMPLE_PAYLOAD;

    // Send a valid webhook before rotation
    const sig = validSig(payload, originalSecret);
    await request(app)
      .post(`/api/webhooks/canary/${endpoint.connectionId}/${originalSecret}`)
      .set('X-Hub-Signature-256', sig)
      .set('Content-Type', 'application/json')
      .send(payload.toString('utf8'));

    // Verify initial stats
    let updated = await repo.getEndpointById(endpoint.id);
    expect(updated?.stats.successfullyProcessed).toBe(1);

    // Rotate the secret
    const { newSecret } = await service.rotateSecret(endpoint.id, 60 * 60 * 1000);

    // Send another valid webhook with new secret
    const newSig = validSig(payload, newSecret);
    await request(app)
      .post(`/api/webhooks/canary/${endpoint.connectionId}/${originalSecret}`)
      .set('X-Hub-Signature-256', newSig)
      .set('Content-Type', 'application/json')
      .send(payload.toString('utf8'));

    // Stats should accumulate, not reset
    updated = await repo.getEndpointById(endpoint.id);
    expect(updated?.stats.successfullyProcessed).toBe(2);
    expect(updated?.stats.totalReceived).toBe(2);
    expect(onSignal).toHaveBeenCalledTimes(2);
  });

  it('a successful delivery after failures resets consecutive failure counter', async () => {
    const { app, service, repo } = createIntegrationStack();

    const endpoint = await service.createEndpoint('conn-rotate-reset', 'github', 'user-1');
    const secret = endpoint.secret;
    const payload = SAMPLE_PAYLOAD;
    const badSig = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

    // Send 5 bad requests (below threshold)
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post(`/api/webhooks/canary/${endpoint.connectionId}/${secret}`)
        .set('X-Hub-Signature-256', badSig)
        .set('Content-Type', 'application/json')
        .send(payload.toString('utf8'));
    }

    let updated = await repo.getEndpointById(endpoint.id);
    expect(updated?.consecutiveSignatureFailures).toBe(5);

    // Send a valid request — should reset counter
    const goodSig = validSig(payload, secret);
    await request(app)
      .post(`/api/webhooks/canary/${endpoint.connectionId}/${secret}`)
      .set('X-Hub-Signature-256', goodSig)
      .set('Content-Type', 'application/json')
      .send(payload.toString('utf8'));

    updated = await repo.getEndpointById(endpoint.id);
    expect(updated?.consecutiveSignatureFailures).toBe(0);
    expect(updated?.isDisabledByFailures).toBe(false);
  });

  it('multiple rotations: only current and immediately previous secret work', async () => {
    const { app, service, onSignal } = createIntegrationStack();

    const endpoint = await service.createEndpoint('conn-rotate-multi', 'github', 'user-1');
    const secret1 = endpoint.secret;

    // First rotation
    const { newSecret: secret2 } = await service.rotateSecret(endpoint.id, 60 * 60 * 1000);

    // Second rotation — secret1 is now two rotations old
    const { newSecret: secret3 } = await service.rotateSecret(endpoint.id, 60 * 60 * 1000);

    const payload = SAMPLE_PAYLOAD;

    // secret3 (current) should work
    const sig3 = validSig(payload, secret3);
    const res3 = await request(app)
      .post(`/api/webhooks/canary/${endpoint.connectionId}/${secret1}`)
      .set('X-Hub-Signature-256', sig3)
      .set('Content-Type', 'application/json')
      .send(payload.toString('utf8'));
    expect(res3.status).toBe(200);

    // secret2 (previous, within grace) should work
    const sig2 = validSig(payload, secret2);
    const res2 = await request(app)
      .post(`/api/webhooks/canary/${endpoint.connectionId}/${secret1}`)
      .set('X-Hub-Signature-256', sig2)
      .set('Content-Type', 'application/json')
      .send(payload.toString('utf8'));
    expect(res2.status).toBe(200);

    // secret1 (two rotations old) should be REJECTED
    const sig1 = validSig(payload, secret1);
    const res1 = await request(app)
      .post(`/api/webhooks/canary/${endpoint.connectionId}/${secret1}`)
      .set('X-Hub-Signature-256', sig1)
      .set('Content-Type', 'application/json')
      .send(payload.toString('utf8'));
    expect(res1.status).toBe(401);

    // Only 2 signals emitted (for the two successful requests)
    expect(onSignal).toHaveBeenCalledTimes(2);
  });
});
