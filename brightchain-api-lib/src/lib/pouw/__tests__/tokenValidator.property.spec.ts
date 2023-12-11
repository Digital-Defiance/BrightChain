/**
 * Property-Based Tests for TokenValidator
 *
 * Feature: proof-of-useful-work-ratelimit, Properties 2–5: Challenge Token Validation
 *
 * Property 2: Challenge Token Expiration Rejection
 * For any challenge token whose expiration timestamp is in the past,
 * the token validator SHALL reject the token regardless of all other fields being valid.
 *
 * Property 3: Challenge Token HMAC Integrity
 * For any challenge token whose HMAC signature has been modified (even by a single bit),
 * the token validator SHALL reject the token.
 *
 * Property 4: Challenge Token Client Binding
 * For any challenge token issued to client A, submitting that token from client B
 * (where A ≠ B) SHALL result in rejection.
 *
 * Property 5: Challenge Token Replay Prevention
 * For any challenge token that has been successfully consumed, resubmitting the same
 * token SHALL result in rejection.
 *
 * **Validates: Requirements 3.2, 3.3, 3.4, 3.6**
 */

import * as fc from 'fast-check';
import { TokenValidator } from '../tokenValidator';

/**
 * Generator for non-empty alphanumeric strings suitable for IDs and secrets.
 */
const arbId = fc.stringMatching(/^[a-zA-Z0-9]{1,32}$/);

/**
 * Generator for HMAC secrets (non-empty strings).
 */
const arbSecret = fc.stringMatching(/^[a-zA-Z0-9]{8,64}$/);

describe('TokenValidator Property Tests', () => {
  /**
   * Property 2: Challenge Token Expiration Rejection
   *
   * For any token with past expiration, validator rejects regardless of other fields.
   *
   * **Validates: Requirements 3.2**
   */
  describe('Feature: proof-of-useful-work-ratelimit, Property 2: Challenge Token Expiration Rejection', () => {
    it('rejects any token whose expiration is in the past', () => {
      fc.assert(
        fc.property(
          arbSecret,
          arbId, // workUnitId
          arbId, // clientId
          fc.integer({ min: 10, max: 300 }), // tokenTtlSeconds
          fc.integer({ min: 1000, max: 600_000 }), // timeAdvanceMs — how far past expiration
          (
            hmacSecret,
            workUnitId,
            clientId,
            tokenTtlSeconds,
            timeAdvanceMs,
          ) => {
            const validator = new TokenValidator(hmacSecret, tokenTtlSeconds);

            // Create a valid token at the current time
            const token = validator.createToken(workUnitId, clientId);
            const encoded = validator.encodeToken(token);

            // Advance Date.now() past the token's expiration
            const pastExpiration = token.expiresAt + timeAdvanceMs;
            const originalDateNow = Date.now;
            Date.now = () => pastExpiration;

            try {
              const result = validator.validateToken(encoded, clientId);
              expect(result.valid).toBe(false);
              expect(result.reason).toBe('Token expired');
            } finally {
              Date.now = originalDateNow;
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 3: Challenge Token HMAC Integrity
   *
   * For any token with modified HMAC (even single bit), validator rejects.
   *
   * **Validates: Requirements 3.3**
   */
  describe('Feature: proof-of-useful-work-ratelimit, Property 3: Challenge Token HMAC Integrity', () => {
    it('rejects any token whose HMAC signature has been modified', () => {
      fc.assert(
        fc.property(
          arbSecret,
          arbId, // workUnitId
          arbId, // clientId
          fc.integer({ min: 30, max: 300 }), // tokenTtlSeconds
          fc.integer({ min: 0, max: 127 }), // position in signature hex string to flip
          (hmacSecret, workUnitId, clientId, tokenTtlSeconds, flipPos) => {
            const validator = new TokenValidator(hmacSecret, tokenTtlSeconds);

            // Create a valid token
            const token = validator.createToken(workUnitId, clientId);

            // Flip a character in the hex signature string
            const sigChars = token.signature.split('');
            // SHA-512 HMAC produces 128 hex chars; clamp flipPos
            const idx = flipPos % sigChars.length;
            const original = sigChars[idx];

            // Flip to a different hex character
            const hexChars = '0123456789abcdef';
            const originalIdx = hexChars.indexOf(original.toLowerCase());
            const flippedIdx = (originalIdx + 1) % hexChars.length;
            sigChars[idx] = hexChars[flippedIdx];

            const tamperedToken = {
              ...token,
              signature: sigChars.join(''),
            };

            // Encode the tampered token
            const encoded = Buffer.from(JSON.stringify(tamperedToken)).toString(
              'base64',
            );

            const result = validator.validateToken(encoded, clientId);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('Invalid signature');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 4: Challenge Token Client Binding
   *
   * For any token issued to client A, submitting from client B results in rejection.
   *
   * **Validates: Requirements 3.4**
   */
  describe('Feature: proof-of-useful-work-ratelimit, Property 4: Challenge Token Client Binding', () => {
    it('rejects any token submitted by a different client than it was issued to', () => {
      fc.assert(
        fc.property(
          arbSecret,
          arbId, // workUnitId
          arbId, // clientA
          arbId, // clientB
          fc.integer({ min: 30, max: 300 }), // tokenTtlSeconds
          (hmacSecret, workUnitId, clientA, clientB, tokenTtlSeconds) => {
            // Ensure clientA and clientB are distinct
            fc.pre(clientA !== clientB);

            const validator = new TokenValidator(hmacSecret, tokenTtlSeconds);

            // Create token for clientA
            const token = validator.createToken(workUnitId, clientA);
            const encoded = validator.encodeToken(token);

            // Validate with clientB — should reject
            const result = validator.validateToken(encoded, clientB);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('Client mismatch');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 5: Challenge Token Replay Prevention
   *
   * For any consumed token, resubmission results in rejection.
   *
   * **Validates: Requirements 3.6**
   */
  describe('Feature: proof-of-useful-work-ratelimit, Property 5: Challenge Token Replay Prevention', () => {
    it('rejects any token that has already been consumed', () => {
      fc.assert(
        fc.property(
          arbSecret,
          arbId, // workUnitId
          arbId, // clientId
          fc.integer({ min: 30, max: 300 }), // tokenTtlSeconds
          (hmacSecret, workUnitId, clientId, tokenTtlSeconds) => {
            const validator = new TokenValidator(hmacSecret, tokenTtlSeconds);

            // Create and encode a valid token
            const token = validator.createToken(workUnitId, clientId);
            const encoded = validator.encodeToken(token);

            // First validation should succeed
            const firstResult = validator.validateToken(encoded, clientId);
            expect(firstResult.valid).toBe(true);

            // Consume the token
            validator.consumeToken(workUnitId, token.expiresAt);

            // Second validation should be rejected as replay
            const secondResult = validator.validateToken(encoded, clientId);
            expect(secondResult.valid).toBe(false);
            expect(secondResult.reason).toBe('Token already consumed');
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
