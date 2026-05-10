/**
 * Integration tests for WCAP signing middleware on file-serving routes.
 *
 * Creates a minimal Express app with the real WCAP signing middleware mounted
 * on file-serving routes (downloadFile, previewFile, downloadVersion) and
 * verifies that:
 * - File-serving routes include the `Content-Signature` header
 * - Non-file routes (search, metadata) do NOT include the header
 *
 * Feature: digitalburnbag-wcap-signing
 * Requirements: 1.5, 6.1, 6.3
 */

import {
  parseContentSignature,
  WCAP_DEFAULTS,
} from '@brightchain/digitalburnbag-lib';
import { EciesCryptoCore } from '@digitaldefiance/ecies-lib';
import express from 'express';
import request from 'supertest';
import { createWcapSigningMiddleware } from '../../middleware/wcap-signing-middleware';

// ── Helpers ─────────────────────────────────────────────────────────

const cryptoCore = new EciesCryptoCore();

/** Generate a real secp256k1 key pair for testing. */
function generateTestKeyPair() {
  const privateKey = cryptoCore.generatePrivateKey();
  const publicKey = cryptoCore.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

/**
 * Build a minimal Express app that simulates the FileController route layout:
 *
 * File-serving routes (WITH WCAP middleware):
 *   GET /files/:id              → downloadFile
 *   GET /files/:id/preview      → previewFile
 *   GET /files/:id/versions/:versionId/download → downloadVersion
 *
 * Non-file routes (WITHOUT WCAP middleware):
 *   GET /files/search           → searchFiles
 *   GET /files/:id/metadata     → getFileMetadata
 */
function createTestApp(privateKey: Uint8Array) {
  const app = express();

  const wcapMiddleware = createWcapSigningMiddleware({
    getPrivateKey: () => privateKey,
    config: {
      ...WCAP_DEFAULTS,
      policy: 'decryption-verified',
    },
  });

  // ── Non-file routes (no WCAP middleware) ──────────────────────────
  app.get('/files/search', (_req, res) => {
    res.status(200).json({ results: [], total: 0 });
  });

  app.get('/files/:id/metadata', (_req, res) => {
    res.status(200).json({ id: _req.params.id, fileName: 'test.txt' });
  });

  // ── File-serving routes (WITH WCAP middleware) ────────────────────
  app.get(
    '/files/:id/versions/:versionId/download',
    wcapMiddleware,
    (_req, res) => {
      const body = Buffer.from('versioned file content');
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', body.length.toString());
      res.status(200).end(body);
    },
  );

  app.get('/files/:id/preview', wcapMiddleware, (_req, res) => {
    const body = Buffer.from('preview file content');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Length', body.length.toString());
    res.status(200).end(body);
  });

  app.get('/files/:id', wcapMiddleware, (_req, res) => {
    const body = Buffer.from('downloaded file content');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', body.length.toString());
    res.status(200).end(body);
  });

  return app;
}

// ── Tests ───────────────────────────────────────────────────────────

describe('WCAP file-serving integration', () => {
  const { privateKey } = generateTestKeyPair();
  let app: express.Express;

  beforeAll(() => {
    app = createTestApp(privateKey);
  });

  describe('file-serving routes include Content-Signature (Req 1.5, 6.1)', () => {
    it('GET /files/:id (downloadFile) includes Content-Signature header', async () => {
      const res = await request(app).get('/files/abc123');

      expect(res.status).toBe(200);
      expect(res.headers['content-signature']).toBeDefined();

      const parsed = parseContentSignature(res.headers['content-signature']);
      expect(parsed).toBeDefined();
      expect(parsed!.alg).toBe(WCAP_DEFAULTS.algorithmSuite);
      expect(parsed!.key_uri).toBe(WCAP_DEFAULTS.keyUriPath);
      expect(parsed!.sig).toBeDefined();
      expect(parsed!.sig.length).toBeGreaterThan(0);
      expect(parsed!.policy).toBe('decryption-verified');
    });

    it('GET /files/:id/preview (previewFile) includes Content-Signature header', async () => {
      const res = await request(app).get('/files/abc123/preview');

      expect(res.status).toBe(200);
      expect(res.headers['content-signature']).toBeDefined();

      const parsed = parseContentSignature(res.headers['content-signature']);
      expect(parsed).toBeDefined();
      expect(parsed!.alg).toBe(WCAP_DEFAULTS.algorithmSuite);
      expect(parsed!.key_uri).toBe(WCAP_DEFAULTS.keyUriPath);
      expect(parsed!.sig).toBeDefined();
      expect(parsed!.sig.length).toBeGreaterThan(0);
      expect(parsed!.policy).toBe('decryption-verified');
    });

    it('GET /files/:id/versions/:versionId/download (downloadVersion) includes Content-Signature header', async () => {
      const res = await request(app).get('/files/abc123/versions/v1/download');

      expect(res.status).toBe(200);
      expect(res.headers['content-signature']).toBeDefined();

      const parsed = parseContentSignature(res.headers['content-signature']);
      expect(parsed).toBeDefined();
      expect(parsed!.alg).toBe(WCAP_DEFAULTS.algorithmSuite);
      expect(parsed!.key_uri).toBe(WCAP_DEFAULTS.keyUriPath);
      expect(parsed!.sig).toBeDefined();
      expect(parsed!.sig.length).toBeGreaterThan(0);
      expect(parsed!.policy).toBe('decryption-verified');
    });
  });

  describe('non-file routes do NOT include Content-Signature (Req 6.3)', () => {
    it('GET /files/search does NOT include Content-Signature header', async () => {
      const res = await request(app).get('/files/search');

      expect(res.status).toBe(200);
      expect(res.headers['content-signature']).toBeUndefined();
    });

    it('GET /files/:id/metadata does NOT include Content-Signature header', async () => {
      const res = await request(app).get('/files/abc123/metadata');

      expect(res.status).toBe(200);
      expect(res.headers['content-signature']).toBeUndefined();
    });
  });
});
