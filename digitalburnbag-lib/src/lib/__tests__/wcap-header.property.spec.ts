/**
 * Property test: Content-Signature header serialization round-trip.
 *
 * **Property 2: Content-Signature header serialization round-trip**
 * **Validates: Requirements 1.3, 1.4, 7.1, 7.2, 7.5, 11.1, 11.2, 11.3, 12.5**
 *
 * For any valid IContentSignatureParams object (with alg as a non-empty ASCII
 * string containing no '=', ';', or space characters; key_uri as a non-empty
 * ASCII string containing no '=', ';', or space characters; sig as a base64
 * encoding of a random 64-byte buffer; optionally kid as a non-empty ASCII
 * string containing no '=', ';', or space characters; and optionally policy
 * as a non-empty ASCII string containing no '=', ';', or space characters),
 * calling serializeContentSignature(params) and then
 * parseContentSignature(result) SHALL produce an object with identical alg,
 * key_uri, sig, kid, and policy values.
 */

import * as fc from 'fast-check';
import {
  IContentSignatureParams,
  parseContentSignature,
  serializeContentSignature,
} from '../interfaces/wcap-header';

// ── Generators ──────────────────────────────────────────────────────

/**
 * Generates a non-empty ASCII string that excludes '=', ';', and space.
 * These characters are delimiters in the Content-Signature header format
 * and would break parsing if present in parameter values.
 *
 * Uses printable ASCII range (0x21–0x7E) minus the three forbidden chars.
 */
const headerSafeCharArb = fc
  .integer({ min: 0x21, max: 0x7e })
  .filter(
    (cp) =>
      cp !== 0x3b /* ; */ && cp !== 0x3d /* = */ && cp !== 0x20 /* space */,
  )
  .map((cp) => String.fromCharCode(cp));

const headerSafeStringArb = fc
  .array(headerSafeCharArb, { minLength: 1, maxLength: 50 })
  .map((chars) => chars.join(''));

/**
 * Generates a base64-encoded string from a random 64-byte buffer,
 * matching the compact signature format (r(32) || s(32)).
 */
const sigArb = fc
  .uint8Array({ minLength: 64, maxLength: 64 })
  .map((bytes) => Buffer.from(bytes).toString('base64'));

/**
 * Generates a valid IContentSignatureParams with optional kid and optional policy.
 */
const contentSignatureParamsArb: fc.Arbitrary<IContentSignatureParams> = fc
  .record({
    alg: headerSafeStringArb,
    key_uri: headerSafeStringArb,
    sig: sigArb,
    kid: fc.option(headerSafeStringArb, { nil: undefined }),
    policy: fc.option(headerSafeStringArb, { nil: undefined }),
  })
  .map((rec) => {
    const params: IContentSignatureParams = {
      alg: rec.alg,
      key_uri: rec.key_uri,
      sig: rec.sig,
    };
    if (rec.kid !== undefined) {
      params.kid = rec.kid;
    }
    if (rec.policy !== undefined) {
      params.policy = rec.policy;
    }
    return params;
  });

// ── Property Test ───────────────────────────────────────────────────

describe('Feature: digitalburnbag-wcap-signing, Property 2: Content-Signature header serialization round-trip', () => {
  it('parseContentSignature(serializeContentSignature(params)) produces identical field values', () => {
    fc.assert(
      fc.property(contentSignatureParamsArb, (params) => {
        const serialized = serializeContentSignature(params);
        const parsed = parseContentSignature(serialized);

        // Parsing must succeed
        expect(parsed).toBeDefined();

        // All fields must round-trip identically
        expect(parsed!.alg).toBe(params.alg);
        expect(parsed!.key_uri).toBe(params.key_uri);
        expect(parsed!.sig).toBe(params.sig);

        // kid: both undefined or both equal
        if (params.kid !== undefined) {
          expect(parsed!.kid).toBe(params.kid);
        } else {
          expect(parsed!.kid).toBeUndefined();
        }

        // policy: both undefined or both equal
        if (params.policy !== undefined) {
          expect(parsed!.policy).toBe(params.policy);
        } else {
          expect(parsed!.policy).toBeUndefined();
        }
      }),
      { numRuns: 100 },
    );
  });
});
