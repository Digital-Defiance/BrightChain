/**
 * Unit tests for WcapPublicKeyController (createWcapPublicKeyRouter).
 *
 * Uses supertest to mount the router on a minimal Express app and verify
 * HTTP-level behaviour: correct PEM output, Content-Type, Cache-Control,
 * 503 when the key is unavailable, and unauthenticated access.
 *
 * Feature: digitalburnbag-wcap-signing
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { EciesCryptoCore } from '@digitaldefiance/ecies-lib';
import express from 'express';
import request from 'supertest';
import { createWcapPublicKeyRouter } from '../../controllers/wcap-public-key-controller';
import { pemToCompressedKey } from '../../middleware/compressed-key-to-pem';

// ── Helpers ─────────────────────────────────────────────────────────

const cryptoCore = new EciesCryptoCore();

/** Generate a real compressed secp256k1 public key for testing. */
function generateTestPublicKey(): Uint8Array {
  const privateKey = cryptoCore.generatePrivateKey();
  return cryptoCore.getPublicKey(privateKey);
}

/**
 * Build a minimal Express app with the WCAP public key router mounted
 * at `/.well-known`, matching the production mount point.
 */
function createTestApp(getPublicKey: () => Uint8Array | undefined) {
  const app = express();
  const router = createWcapPublicKeyRouter(getPublicKey);
  app.use('/.well-known', router);
  return app;
}

const ENDPOINT = '/.well-known/wcap-public-key-secp256k1.pem';

// ── Tests ───────────────────────────────────────────────────────────

describe('WcapPublicKeyController', () => {
  const testPublicKey = generateTestPublicKey();

  describe('returns valid PEM with correct Content-Type (Req 3.1, 3.2)', () => {
    it('serves a PEM-encoded secp256k1 public key with application/x-pem-file', async () => {
      const app = createTestApp(() => testPublicKey);

      const res = await request(app).get(ENDPOINT);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/x-pem-file/);

      const pem = res.text;
      expect(pem).toContain('-----BEGIN PUBLIC KEY-----');
      expect(pem).toContain('-----END PUBLIC KEY-----');

      // Round-trip: PEM → compressed key should match the original
      const roundTripped = pemToCompressedKey(pem);
      expect(roundTripped).toBeDefined();
      expect(
        Buffer.from(roundTripped!).equals(Buffer.from(testPublicKey)),
      ).toBe(true);
    });
  });

  describe('returns 503 when public key is not available (Req 3.4)', () => {
    it('responds with 503 and a descriptive error when getPublicKey returns undefined', async () => {
      const app = createTestApp(() => undefined);

      const res = await request(app).get(ENDPOINT);

      expect(res.status).toBe(503);
      expect(res.body).toBeDefined();
      expect(res.body.error).toBe('Service Unavailable');
      expect(res.body.message).toBeDefined();
      expect(typeof res.body.message).toBe('string');
      expect(res.body.message.length).toBeGreaterThan(0);
    });
  });

  describe('sets Cache-Control: public, max-age=86400 (Req 3.5)', () => {
    it('includes the correct Cache-Control header on successful responses', async () => {
      const app = createTestApp(() => testPublicKey);

      const res = await request(app).get(ENDPOINT);

      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('public, max-age=86400');
    });
  });

  describe('accessible without authentication (Req 3.3)', () => {
    it('returns 200 without any Authorization header', async () => {
      const app = createTestApp(() => testPublicKey);

      // Explicitly send no auth headers
      const res = await request(app).get(ENDPOINT).unset('Authorization');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/x-pem-file/);
    });

    it('returns 200 even when a bogus Authorization header is present', async () => {
      const app = createTestApp(() => testPublicKey);

      // The endpoint should not care about auth at all
      const res = await request(app)
        .get(ENDPOINT)
        .set('Authorization', 'Bearer invalid-token-xyz');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/x-pem-file/);
    });
  });
});
