/**
 * Property tests for WCAP signing middleware.
 *
 * **Property 1: Sign-then-verify round-trip**
 * **Validates: Requirements 1.1, 1.2, 5.3**
 *
 * For any random body buffer (1 byte to 10 KB) and any valid secp256k1 key
 * pair, computing SHA-256 of the body, signing the hash with
 * `EciesSignature.signMessage(privateKey, hash)`, and then verifying the
 * signature with `EciesSignature.verifyMessage(publicKey, hash, signature)`
 * SHALL return `true`.
 */

import { EciesCryptoCore, EciesSignature } from '@digitaldefiance/ecies-lib';
import { createHash } from 'crypto';
import * as fc from 'fast-check';

// ── Shared instances ────────────────────────────────────────────────

const cryptoCore = new EciesCryptoCore();
const eciesSignature = new EciesSignature(cryptoCore);

// ── Generators ──────────────────────────────────────────────────────

/**
 * Generates a valid secp256k1 key pair using EciesCryptoCore.
 *
 * Each iteration gets a fresh key pair so the property holds across
 * many different keys, not just one fixed pair.
 */
const keyPairArb: fc.Arbitrary<{
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}> = fc.noShrink(
  fc.constant(null).map(() => {
    const privateKey = cryptoCore.generatePrivateKey();
    const publicKey = cryptoCore.getPublicKey(privateKey);
    return { privateKey, publicKey };
  }),
);

/**
 * Generates a random body buffer between 1 byte and 10 KB.
 *
 * Kept small for test speed — the property is about cryptographic
 * correctness, not body size, and SHA-256 + ECDSA operate on the
 * 32-byte hash regardless of input length.
 */
const bodyArb: fc.Arbitrary<Uint8Array> = fc.uint8Array({
  minLength: 1,
  maxLength: 10 * 1024,
});

// ── Property Test ───────────────────────────────────────────────────

describe('Feature: digitalburnbag-wcap-signing, Property 1: Sign-then-verify round-trip', () => {
  it('signing a SHA-256 hash and verifying with the corresponding public key returns true', () => {
    fc.assert(
      fc.property(bodyArb, keyPairArb, (body, { privateKey, publicKey }) => {
        // Step 1: Compute SHA-256 hash of the body (Requirement 1.1)
        const hash = createHash('sha256').update(body).digest();

        // Step 2: Sign the hash with the private key (Requirement 1.2, 5.3)
        const signature = eciesSignature.signMessage(
          privateKey,
          new Uint8Array(hash),
        );

        // The signature must be exactly 64 bytes (compact format: r(32) || s(32))
        expect(signature.length).toBe(64);

        // Step 3: Verify the signature with the public key
        const valid = eciesSignature.verifyMessage(
          publicKey,
          new Uint8Array(hash),
          signature,
        );

        // Verification must succeed
        expect(valid).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 3 Imports ──────────────────────────────────────────────

import type { IWcapConfig } from '@brightchain/digitalburnbag-lib';
import { WCAP_DEFAULTS } from '@brightchain/digitalburnbag-lib';
import type { NextFunction, Request, Response } from 'express';
import {
  createWcapSigningMiddleware,
  IWcapSigningContext,
} from '../../../lib/middleware/wcap-signing-middleware';

// ── Property 3 Helpers ──────────────────────────────────────────────

/** Create a minimal mock Express Request. */
function createMockRequest(overrides?: Partial<Request>): Request {
  return {
    method: 'GET',
    path: '/files/123',
    ...overrides,
  } as unknown as Request;
}

/**
 * Create a mock Express Response with header tracking and end() capture.
 *
 * Accepts optional pre-existing headers that are set before the middleware
 * wraps `res.end()`, simulating headers set by upstream middleware or the
 * framework itself.
 */
function createMockResponse(overrides?: {
  statusCode?: number;
  preExistingHeaders?: Record<string, string>;
}): Response & {
  _headers: Record<string, string | string[]>;
  _endCalled: boolean;
  _endBody: Buffer | undefined;
} {
  const headers: Record<string, string | string[]> = {
    ...(overrides?.preExistingHeaders ?? {}),
  };

  const res = {
    statusCode: overrides?.statusCode ?? 200,
    _headers: headers,
    _endCalled: false,
    _endBody: undefined as Buffer | undefined,

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
        } else if (chunk instanceof Uint8Array) {
          res._endBody = Buffer.from(chunk);
        } else if (typeof chunk === 'string') {
          const enc =
            typeof encodingOrCallback === 'string'
              ? encodingOrCallback
              : 'utf8';
          res._endBody = Buffer.from(chunk, enc);
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
  };

  return res;
}

// ── Property 3 Generators ───────────────────────────────────────────

/**
 * Generates a lowercase alpha header key (a-z, 2–20 chars) that will
 * never collide with 'content-signature' (the header the middleware adds).
 *
 * We filter out 'content-signature' explicitly and keep keys short and
 * simple to avoid HTTP header naming edge cases.
 */
const headerKeyArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
    minLength: 2,
    maxLength: 20,
  })
  .map((chars) => chars.join(''))
  .filter((k) => k !== 'content-signature');

/**
 * Generates a non-empty printable ASCII header value (no control chars).
 */
const headerValueArb: fc.Arbitrary<string> = fc
  .array(
    fc.integer({ min: 0x20, max: 0x7e }).map((c) => String.fromCharCode(c)),
    { minLength: 1, maxLength: 50 },
  )
  .map((chars) => chars.join(''));

/**
 * Generates a dictionary of 0–5 random pre-existing response headers.
 */
const preExistingHeadersArb: fc.Arbitrary<Record<string, string>> = fc
  .array(fc.tuple(headerKeyArb, headerValueArb), { minLength: 0, maxLength: 5 })
  .map((pairs) => {
    const obj: Record<string, string> = {};
    for (const [k, v] of pairs) {
      obj[k] = v;
    }
    return obj;
  });

// ── Property 3 Test ─────────────────────────────────────────────────

/**
 * **Property 3: Middleware preserves response integrity**
 * **Validates: Requirements 2.3**
 *
 * For any set of pre-existing response headers (random key-value pairs),
 * any HTTP 200 status code, and any body buffer, the WCAP signing middleware
 * SHALL preserve all pre-existing headers, the status code, and the exact
 * body bytes in the response sent to the client. The only addition SHALL be
 * the `Content-Signature` header.
 */
describe('Feature: digitalburnbag-wcap-signing, Property 3: Middleware preserves response integrity', () => {
  // Use a single key pair for all iterations — this property is about
  // response integrity, not cryptographic correctness.
  const privateKey = cryptoCore.generatePrivateKey();

  const config: IWcapConfig = { ...WCAP_DEFAULTS };
  const context: IWcapSigningContext = {
    getPrivateKey: () => privateKey,
    config,
  };
  const middleware = createWcapSigningMiddleware(context);

  it('all pre-existing headers, status code, and exact body bytes are preserved; only Content-Signature is added', () => {
    fc.assert(
      fc.property(
        preExistingHeadersArb,
        bodyArb,
        (preExistingHeaders, body) => {
          const req = createMockRequest();
          const res = createMockResponse({
            statusCode: 200,
            preExistingHeaders,
          });

          // Snapshot the header keys before middleware runs
          const headerKeysBefore = new Set(
            Object.keys(preExistingHeaders).map((k) => k.toLowerCase()),
          );

          middleware(req, res, (() => {
            /* no-op next */
          }) as NextFunction);

          // Simulate the handler calling res.end(body)
          const bodyBuffer = Buffer.from(body);
          res.end(bodyBuffer);

          // ── Assert status code is preserved ───────────────────
          expect(res.statusCode).toBe(200);

          // ── Assert body bytes are preserved exactly ───────────
          expect(res._endCalled).toBe(true);
          expect(res._endBody).toBeDefined();
          expect(Buffer.compare(res._endBody!, bodyBuffer)).toBe(0);

          // ── Assert all pre-existing headers are preserved ─────
          for (const [key, value] of Object.entries(preExistingHeaders)) {
            expect(res._headers[key.toLowerCase()]).toBe(value);
          }

          // ── Assert the only new header is Content-Signature ───
          const headerKeysAfter = new Set(
            Object.keys(res._headers).map((k) => k.toLowerCase()),
          );

          // Every key that was there before must still be there
          for (const k of headerKeysBefore) {
            expect(headerKeysAfter.has(k)).toBe(true);
          }

          // The only new key should be 'content-signature'
          const addedKeys = [...headerKeysAfter].filter(
            (k) => !headerKeysBefore.has(k),
          );
          expect(addedKeys).toEqual(['content-signature']);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 5 Generators ───────────────────────────────────────────

/**
 * Generates a random HTTP status code from 100–599, excluding 200.
 *
 * This covers informational (1xx), redirects (3xx), client errors (4xx),
 * and server errors (5xx), plus the 201–299 success range that is not
 * the exact 200 OK status.
 */
const nonOkStatusArb: fc.Arbitrary<number> = fc
  .integer({ min: 100, max: 599 })
  .filter((s) => s !== 200);

// ── Property 5 Test ─────────────────────────────────────────────────

/**
 * **Property 5: Non-200 responses are not signed**
 * **Validates: Requirements 6.2**
 *
 * For any HTTP status code that is not 200 (randomly chosen from 100–199,
 * 201–599), the WCAP signing middleware SHALL NOT add a `Content-Signature`
 * header to the response.
 */
describe('Feature: digitalburnbag-wcap-signing, Property 5: Non-200 responses are not signed', () => {
  // Use a single key pair — this property is about status-code gating,
  // not cryptographic correctness.
  const privateKey = cryptoCore.generatePrivateKey();

  const config: IWcapConfig = { ...WCAP_DEFAULTS };
  const context: IWcapSigningContext = {
    getPrivateKey: () => privateKey,
    config,
  };
  const middleware = createWcapSigningMiddleware(context);

  it('middleware does NOT add Content-Signature header for any non-200 status code', () => {
    fc.assert(
      fc.property(nonOkStatusArb, bodyArb, (statusCode, body) => {
        const req = createMockRequest();
        const res = createMockResponse({ statusCode });

        middleware(req, res, (() => {
          /* no-op next */
        }) as NextFunction);

        // Simulate the handler calling res.end(body)
        const bodyBuffer = Buffer.from(body);
        res.end(bodyBuffer);

        // ── Assert res.end() was called ───────────────────────
        expect(res._endCalled).toBe(true);

        // ── Assert body bytes are preserved exactly ───────────
        expect(res._endBody).toBeDefined();
        expect(Buffer.compare(res._endBody!, bodyBuffer)).toBe(0);

        // ── Assert Content-Signature header is NOT present ────
        const headerKeys = Object.keys(res._headers).map((k) =>
          k.toLowerCase(),
        );
        expect(headerKeys).not.toContain('content-signature');
      }),
      { numRuns: 100 },
    );
  });
});
