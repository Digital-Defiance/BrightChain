/**
 * Unit tests for WCAP signing middleware.
 *
 * Feature: digitalburnbag-wcap-signing
 * Requirements: 1.1, 1.4, 1.6, 1.7, 2.3, 4.2, 6.2, 9.2
 */

import type { IWcapConfig } from '@brightchain/digitalburnbag-lib';
import {
  parseContentSignature,
  WCAP_DEFAULTS,
} from '@brightchain/digitalburnbag-lib';
import { EciesCryptoCore, EciesSignature } from '@digitaldefiance/ecies-lib';
import { createHash } from 'crypto';
import type { Request, Response } from 'express';
import {
  createWcapSigningMiddleware,
  IWcapSigningContext,
} from '../../../lib/middleware/wcap-signing-middleware';

// ── Helpers ─────────────────────────────────────────────────────────

const cryptoCore = new EciesCryptoCore();
const eciesSignature = new EciesSignature(cryptoCore);

/** Generate a real secp256k1 key pair for testing. */
function generateTestKeyPair(): {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
} {
  const privateKey = cryptoCore.generatePrivateKey();
  const publicKey = cryptoCore.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

/** Create a minimal mock Express Request. */
function createMockRequest(overrides?: Partial<Request>): Request {
  return {
    method: 'GET',
    path: '/files/123',
    ...overrides,
  } as unknown as Request;
}

/** Create a mock Express Response with header tracking and end() capture. */
function createMockResponse(overrides?: {
  statusCode?: number;
  preExistingHeaders?: Record<string, string>;
}): Response & {
  _headers: Record<string, string | string[]>;
  _endCalled: boolean;
  _endBody: Buffer | undefined;
  _endEncoding: BufferEncoding | undefined;
} {
  const headers: Record<string, string | string[]> = {
    ...(overrides?.preExistingHeaders ?? {}),
  };

  const res = {
    statusCode: overrides?.statusCode ?? 200,
    _headers: headers,
    _endCalled: false,
    _endBody: undefined as Buffer | undefined,
    _endEncoding: undefined as BufferEncoding | undefined,

    setHeader(name: string, value: string | string[]) {
      headers[name.toLowerCase()] = value;
      return res;
    },

    getHeader(name: string) {
      return headers[name.toLowerCase()];
    },

    end(
      chunk?: unknown,
      encodingOrCallback?: BufferEncoding | (() => void),
      callback?: () => void,
    ) {
      res._endCalled = true;
      if (chunk != null) {
        if (Buffer.isBuffer(chunk)) {
          res._endBody = chunk;
        } else if (typeof chunk === 'string') {
          const enc =
            typeof encodingOrCallback === 'string'
              ? encodingOrCallback
              : 'utf8';
          res._endBody = Buffer.from(chunk, enc);
          res._endEncoding = enc;
        }
      }
      const cb =
        typeof encodingOrCallback === 'function'
          ? encodingOrCallback
          : callback;
      if (cb) cb();
      return res;
    },
  } as unknown as Response & {
    _headers: Record<string, string | string[]>;
    _endCalled: boolean;
    _endBody: Buffer | undefined;
    _endEncoding: BufferEncoding | undefined;
  };

  return res;
}

function createDefaultConfig(overrides?: Partial<IWcapConfig>): IWcapConfig {
  return { ...WCAP_DEFAULTS, ...overrides };
}

function nextFn(): void {
  // no-op
}

// ── Tests ───────────────────────────────────────────────────────────

describe('createWcapSigningMiddleware', () => {
  const { privateKey, publicKey } = generateTestKeyPair();

  describe('happy path — HTTP 200 with known key pair and body', () => {
    it('adds a valid Content-Signature header (Req 1.1)', () => {
      const body = Buffer.from('Hello, WCAP!');
      const config = createDefaultConfig();
      const context: IWcapSigningContext = {
        getPrivateKey: () => privateKey,
        config,
      };

      const middleware = createWcapSigningMiddleware(context);
      const req = createMockRequest();
      const res = createMockResponse();

      middleware(req, res, nextFn);
      // Simulate handler calling res.end(body)
      res.end(body);

      // Header must be present
      const headerValue = res._headers['content-signature'] as string;
      expect(headerValue).toBeDefined();

      // Parse and validate the header
      const parsed = parseContentSignature(headerValue);
      expect(parsed).toBeDefined();
      expect(parsed!.alg).toBe('dd-ecies-secp256k1-sha256');
      expect(parsed!.key_uri).toBe(
        '/.well-known/wcap-public-key-secp256k1.pem',
      );

      // Verify the signature is valid
      const hash = createHash('sha256').update(body).digest();
      const sigBytes = Buffer.from(parsed!.sig, 'base64');
      expect(sigBytes.length).toBe(64);

      const valid = eciesSignature.verifyMessage(
        publicKey,
        new Uint8Array(hash),
        new Uint8Array(sigBytes),
      );
      expect(valid).toBe(true);
    });
  });

  describe('config.enabled === false (Req 4.2)', () => {
    it('skips signing — no Content-Signature header', () => {
      const config = createDefaultConfig({ enabled: false });
      const context: IWcapSigningContext = {
        getPrivateKey: () => privateKey,
        config,
      };

      const middleware = createWcapSigningMiddleware(context);
      const req = createMockRequest();
      const res = createMockResponse();

      middleware(req, res, nextFn);
      res.end(Buffer.from('body'));

      expect(res._headers['content-signature']).toBeUndefined();
    });
  });

  describe('getPrivateKey returns undefined (Req 1.6)', () => {
    it('skips signing and logs a warning', () => {
      const warnMessages: string[] = [];
      const config = createDefaultConfig();
      const context: IWcapSigningContext = {
        getPrivateKey: () => undefined,
        config,
        logger: {
          warn: (msg: string) => warnMessages.push(msg),
          error: () => {
            /* no-op */
          },
        },
      };

      const middleware = createWcapSigningMiddleware(context);
      const req = createMockRequest();
      const res = createMockResponse();

      middleware(req, res, nextFn);
      res.end(Buffer.from('body'));

      expect(res._headers['content-signature']).toBeUndefined();
      expect(warnMessages.length).toBeGreaterThanOrEqual(1);
      expect(warnMessages[0]).toContain('[WCAP]');
      expect(warnMessages[0]).toContain('private key not available');
    });
  });

  describe('signMessage throws (Req 1.7)', () => {
    it('skips signing and logs an error', () => {
      const errorMessages: string[] = [];
      const config = createDefaultConfig();

      // Provide an invalid private key that will cause signMessage to throw
      const badPrivateKey = new Uint8Array(32); // all zeros — invalid secp256k1 key

      const context: IWcapSigningContext = {
        getPrivateKey: () => badPrivateKey,
        config,
        logger: {
          warn: () => {
            /* no-op */
          },
          error: (msg: string) => errorMessages.push(msg),
        },
      };

      const middleware = createWcapSigningMiddleware(context);
      const req = createMockRequest();
      const res = createMockResponse();

      middleware(req, res, nextFn);
      res.end(Buffer.from('body'));

      // Should still serve the response without the header
      expect(res._endCalled).toBe(true);
      expect(res._headers['content-signature']).toBeUndefined();
      expect(errorMessages.length).toBeGreaterThanOrEqual(1);
      expect(errorMessages[0]).toContain('[WCAP]');
      expect(errorMessages[0]).toContain('Signing failed');
    });
  });

  describe('non-200 status codes (Req 6.2)', () => {
    it.each([404, 500])('skips signing for HTTP %d', (statusCode) => {
      const config = createDefaultConfig();
      const context: IWcapSigningContext = {
        getPrivateKey: () => privateKey,
        config,
      };

      const middleware = createWcapSigningMiddleware(context);
      const req = createMockRequest();
      const res = createMockResponse({ statusCode });

      middleware(req, res, nextFn);
      res.end(Buffer.from('error body'));

      expect(res._headers['content-signature']).toBeUndefined();
    });
  });

  describe('kid parameter (Req 1.4)', () => {
    it('includes kid in header when configured', () => {
      const config = createDefaultConfig({ kid: 'my-key-id-42' });
      const context: IWcapSigningContext = {
        getPrivateKey: () => privateKey,
        config,
      };

      const middleware = createWcapSigningMiddleware(context);
      const req = createMockRequest();
      const res = createMockResponse();

      middleware(req, res, nextFn);
      res.end(Buffer.from('body'));

      const headerValue = res._headers['content-signature'] as string;
      const parsed = parseContentSignature(headerValue);
      expect(parsed).toBeDefined();
      expect(parsed!.kid).toBe('my-key-id-42');
    });

    it('excludes kid from header when not configured', () => {
      const config = createDefaultConfig(); // no kid
      const context: IWcapSigningContext = {
        getPrivateKey: () => privateKey,
        config,
      };

      const middleware = createWcapSigningMiddleware(context);
      const req = createMockRequest();
      const res = createMockResponse();

      middleware(req, res, nextFn);
      res.end(Buffer.from('body'));

      const headerValue = res._headers['content-signature'] as string;
      const parsed = parseContentSignature(headerValue);
      expect(parsed).toBeDefined();
      expect(parsed!.kid).toBeUndefined();
    });
  });

  describe('policy parameter (Req 12.2, 12.3)', () => {
    it('includes policy in header when config.policy is set', () => {
      const config = createDefaultConfig({ policy: 'decryption-verified' });
      const context: IWcapSigningContext = {
        getPrivateKey: () => privateKey,
        config,
      };

      const middleware = createWcapSigningMiddleware(context);
      const req = createMockRequest();
      const res = createMockResponse();

      middleware(req, res, nextFn);
      res.end(Buffer.from('body'));

      const headerValue = res._headers['content-signature'] as string;
      const parsed = parseContentSignature(headerValue);
      expect(parsed).toBeDefined();
      expect(parsed!.policy).toBe('decryption-verified');
    });

    it('excludes policy from header when config.policy is not set', () => {
      const config = createDefaultConfig(); // no policy
      const context: IWcapSigningContext = {
        getPrivateKey: () => privateKey,
        config,
      };

      const middleware = createWcapSigningMiddleware(context);
      const req = createMockRequest();
      const res = createMockResponse();

      middleware(req, res, nextFn);
      res.end(Buffer.from('body'));

      const headerValue = res._headers['content-signature'] as string;
      const parsed = parseContentSignature(headerValue);
      expect(parsed).toBeDefined();
      expect(parsed!.policy).toBeUndefined();
    });
  });

  describe('preserves pre-existing response headers and body (Req 2.3)', () => {
    it('all pre-existing headers and exact body bytes are preserved', () => {
      const config = createDefaultConfig();
      const context: IWcapSigningContext = {
        getPrivateKey: () => privateKey,
        config,
      };

      const preExistingHeaders: Record<string, string> = {
        'content-type': 'application/octet-stream',
        'x-custom-header': 'custom-value',
        'cache-control': 'no-cache',
      };

      const middleware = createWcapSigningMiddleware(context);
      const req = createMockRequest();
      const res = createMockResponse({ preExistingHeaders });

      middleware(req, res, nextFn);

      const bodyBytes = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);
      res.end(bodyBytes);

      // Pre-existing headers must still be present
      expect(res._headers['content-type']).toBe('application/octet-stream');
      expect(res._headers['x-custom-header']).toBe('custom-value');
      expect(res._headers['cache-control']).toBe('no-cache');

      // Body bytes must be preserved exactly
      expect(res._endBody).toBeDefined();
      expect(Buffer.compare(res._endBody!, bodyBytes)).toBe(0);

      // Content-Signature header must also be present
      expect(res._headers['content-signature']).toBeDefined();
    });
  });

  describe('large body >10MB (Req 9.2)', () => {
    it('still signs the response', () => {
      const config = createDefaultConfig();
      const context: IWcapSigningContext = {
        getPrivateKey: () => privateKey,
        config,
      };

      const middleware = createWcapSigningMiddleware(context);
      const req = createMockRequest();
      const res = createMockResponse();

      // Create a body slightly over 10MB
      const largeBody = Buffer.alloc(10 * 1024 * 1024 + 1, 0xab);

      middleware(req, res, nextFn);
      res.end(largeBody);

      const headerValue = res._headers['content-signature'] as string;
      expect(headerValue).toBeDefined();

      // Verify the signature is valid
      const parsed = parseContentSignature(headerValue);
      expect(parsed).toBeDefined();

      const hash = createHash('sha256').update(largeBody).digest();
      const sigBytes = Buffer.from(parsed!.sig, 'base64');
      const valid = eciesSignature.verifyMessage(
        publicKey,
        new Uint8Array(hash),
        new Uint8Array(sigBytes),
      );
      expect(valid).toBe(true);
    });
  });
});
