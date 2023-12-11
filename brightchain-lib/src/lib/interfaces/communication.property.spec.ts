// Feature: communication-api-controllers, Property 27: API response serialization round trip
/**
 * Property-Based Tests for API Envelope Serialization Round Trip
 *
 * Property 27: API response serialization round trip
 * For any valid IApiEnvelope<T> response object, serializing to JSON
 * then deserializing SHALL produce an equivalent object.
 *
 * **Validates: Requirements 10.3**
 *
 * @module interfaces/communication.property.spec
 */

import fc from 'fast-check';
import { IApiEnvelope } from './communication';

jest.setTimeout(30000);

describe('Feature: communication-api-controllers, Property 27: API response serialization round trip', () => {
  // --- Smart Generators ---

  /** Recursively checks whether a value contains -0 anywhere in its structure.
   *  -0 is excluded because JSON.parse(JSON.stringify(-0)) === 0,
   *  so -0 does not survive a JSON round trip. */
  const containsNegativeZero = (v: unknown): boolean => {
    if (Object.is(v, -0)) return true;
    if (Array.isArray(v)) return v.some(containsNegativeZero);
    if (v !== null && typeof v === 'object') {
      return Object.values(v).some(containsNegativeZero);
    }
    return false;
  };

  /** Generates JSON-safe arbitrary values (no Date, Buffer, undefined, -0, etc.)
   *  Note: -0 is excluded because JSON.parse(JSON.stringify(-0)) === 0,
   *  so -0 does not survive a JSON round trip. */
  const jsonSafeValueArb: fc.Arbitrary<unknown> = fc
    .jsonValue()
    .filter((v) => !containsNegativeZero(v));

  /** Generates a non-empty string suitable for error codes */
  const errorCodeArb = fc.constantFrom(
    'VALIDATION_ERROR',
    'NOT_FOUND',
    'FORBIDDEN',
    'CONFLICT',
    'INTERNAL_ERROR',
    'GONE',
  );

  /** Generates a non-empty error message string */
  const errorMessageArb = fc
    .string({ minLength: 1, maxLength: 200 })
    .filter((s) => s.trim().length > 0);

  /** Generates field-level validation error details: Record<string, string[]> */
  const errorDetailsArb: fc.Arbitrary<Record<string, string[]>> = fc.dictionary(
    fc
      .string({ minLength: 1, maxLength: 30 })
      .filter((s) => s.trim().length > 0),
    fc.array(
      fc
        .string({ minLength: 1, maxLength: 100 })
        .filter((s) => s.trim().length > 0),
      { minLength: 1, maxLength: 5 },
    ),
    { minKeys: 1, maxKeys: 5 },
  );

  /** Generates a success IApiEnvelope with arbitrary JSON-safe data */
  const successEnvelopeArb: fc.Arbitrary<IApiEnvelope<unknown>> =
    jsonSafeValueArb.map((data) => ({
      status: 'success' as const,
      data,
    }));

  /** Generates an error IApiEnvelope without details */
  const errorEnvelopeWithoutDetailsArb: fc.Arbitrary<IApiEnvelope<unknown>> = fc
    .tuple(errorCodeArb, errorMessageArb)
    .map(([code, message]) => ({
      status: 'error' as const,
      error: {
        code,
        message,
      },
    }));

  /** Generates an error IApiEnvelope with details */
  const errorEnvelopeWithDetailsArb: fc.Arbitrary<IApiEnvelope<unknown>> = fc
    .tuple(errorCodeArb, errorMessageArb, errorDetailsArb)
    .map(([code, message, details]) => ({
      status: 'error' as const,
      error: {
        code,
        message,
        details,
      },
    }));

  /** Generates any valid IApiEnvelope (success or error variant) */
  const apiEnvelopeArb: fc.Arbitrary<IApiEnvelope<unknown>> = fc.oneof(
    successEnvelopeArb,
    errorEnvelopeWithoutDetailsArb,
    errorEnvelopeWithDetailsArb,
  );

  // --- Property Tests ---

  /**
   * Property 27: For any valid IApiEnvelope<T> response object,
   * serializing to JSON then deserializing SHALL produce an equivalent object.
   *
   * **Validates: Requirements 10.3**
   */
  it('should produce an equivalent object after JSON.stringify then JSON.parse round trip', () => {
    fc.assert(
      fc.property(apiEnvelopeArb, (envelope) => {
        const serialized = JSON.stringify(envelope);
        const deserialized = JSON.parse(serialized);

        expect(deserialized).toEqual(envelope);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 27a: Success envelopes preserve their status and data through round trip.
   *
   * **Validates: Requirements 10.3**
   */
  it('should preserve success envelope status and data through round trip', () => {
    fc.assert(
      fc.property(successEnvelopeArb, (envelope) => {
        const serialized = JSON.stringify(envelope);
        const deserialized = JSON.parse(serialized) as IApiEnvelope<unknown>;

        expect(deserialized.status).toBe('success');
        expect(deserialized.data).toEqual(envelope.data);
        expect(deserialized.error).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 27b: Error envelopes preserve their status, code, message, and details through round trip.
   *
   * **Validates: Requirements 10.3**
   */
  it('should preserve error envelope status, code, message, and details through round trip', () => {
    const errorEnvelopeArb = fc.oneof(
      errorEnvelopeWithoutDetailsArb,
      errorEnvelopeWithDetailsArb,
    );

    fc.assert(
      fc.property(errorEnvelopeArb, (envelope) => {
        const serialized = JSON.stringify(envelope);
        const deserialized = JSON.parse(serialized) as IApiEnvelope<unknown>;

        expect(deserialized.status).toBe('error');
        expect(deserialized.error).toBeDefined();
        expect(deserialized.error!.code).toBe(envelope.error!.code);
        expect(deserialized.error!.message).toBe(envelope.error!.message);

        if (envelope.error!.details) {
          expect(deserialized.error!.details).toEqual(envelope.error!.details);
        } else {
          expect(deserialized.error!.details).toBeUndefined();
        }

        expect(deserialized.data).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 27c: The serialized form is always valid JSON.
   *
   * **Validates: Requirements 10.3**
   */
  it('should always produce valid JSON when serializing any IApiEnvelope', () => {
    fc.assert(
      fc.property(apiEnvelopeArb, (envelope) => {
        const serialized = JSON.stringify(envelope);

        // Must be a non-empty string
        expect(typeof serialized).toBe('string');
        expect(serialized.length).toBeGreaterThan(0);

        // Must parse without throwing
        expect(() => JSON.parse(serialized)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: communication-api-controllers, Property 29: Response envelope format
/**
 * Property-Based Tests for Response Envelope Format
 *
 * Property 29: Response envelope format
 * For any API response from the Communication_API, the JSON body SHALL contain
 * a `status` field (either 'success' or 'error'), and when status is 'success'
 * it SHALL contain a `data` field, and when status is 'error' it SHALL contain
 * an `error` field.
 *
 * **Validates: Requirements 10.1**
 *
 * @module interfaces/communication.property.spec
 */

describe('Feature: communication-api-controllers, Property 29: Response envelope format', () => {
  // --- Smart Generators ---

  /** Generates JSON-safe arbitrary values (no Date, Buffer, undefined, etc.) */
  const jsonSafeValueArb: fc.Arbitrary<unknown> = fc.jsonValue();

  /** Generates a non-empty string suitable for error codes */
  const errorCodeArb = fc.constantFrom(
    'VALIDATION_ERROR',
    'NOT_FOUND',
    'FORBIDDEN',
    'CONFLICT',
    'INTERNAL_ERROR',
    'GONE',
  );

  /** Generates a non-empty error message string */
  const errorMessageArb = fc
    .string({ minLength: 1, maxLength: 200 })
    .filter((s) => s.trim().length > 0);

  /** Generates field-level validation error details: Record<string, string[]> */
  const errorDetailsArb: fc.Arbitrary<Record<string, string[]>> = fc.dictionary(
    fc
      .string({ minLength: 1, maxLength: 30 })
      .filter((s) => s.trim().length > 0),
    fc.array(
      fc
        .string({ minLength: 1, maxLength: 100 })
        .filter((s) => s.trim().length > 0),
      { minLength: 1, maxLength: 5 },
    ),
    { minKeys: 1, maxKeys: 5 },
  );

  /** Generates a success IApiEnvelope with arbitrary JSON-safe data */
  const successEnvelopeArb: fc.Arbitrary<IApiEnvelope<unknown>> =
    jsonSafeValueArb.map((data) => ({
      status: 'success' as const,
      data,
    }));

  /** Generates an error IApiEnvelope without details */
  const errorEnvelopeWithoutDetailsArb: fc.Arbitrary<IApiEnvelope<unknown>> = fc
    .tuple(errorCodeArb, errorMessageArb)
    .map(([code, message]) => ({
      status: 'error' as const,
      error: {
        code,
        message,
      },
    }));

  /** Generates an error IApiEnvelope with details */
  const errorEnvelopeWithDetailsArb: fc.Arbitrary<IApiEnvelope<unknown>> = fc
    .tuple(errorCodeArb, errorMessageArb, errorDetailsArb)
    .map(([code, message, details]) => ({
      status: 'error' as const,
      error: {
        code,
        message,
        details,
      },
    }));

  /** Generates any valid error IApiEnvelope */
  const errorEnvelopeArb: fc.Arbitrary<IApiEnvelope<unknown>> = fc.oneof(
    errorEnvelopeWithoutDetailsArb,
    errorEnvelopeWithDetailsArb,
  );

  /** Generates any valid IApiEnvelope (success or error variant) */
  const apiEnvelopeArb: fc.Arbitrary<IApiEnvelope<unknown>> = fc.oneof(
    successEnvelopeArb,
    errorEnvelopeArb,
  );

  // --- Property Tests ---

  /**
   * Property 29a: Every success envelope has status 'success' and a data field present.
   *
   * **Validates: Requirements 10.1**
   */
  it('should have status "success" and a data field present for every success envelope', () => {
    fc.assert(
      fc.property(successEnvelopeArb, (envelope) => {
        expect(envelope.status).toBe('success');
        expect(envelope).toHaveProperty('data');
        expect(envelope.data).toBeDefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 29b: Every error envelope has status 'error' and an error field present.
   *
   * **Validates: Requirements 10.1**
   */
  it('should have status "error" and an error field present for every error envelope', () => {
    fc.assert(
      fc.property(errorEnvelopeArb, (envelope) => {
        expect(envelope.status).toBe('error');
        expect(envelope).toHaveProperty('error');
        expect(envelope.error).toBeDefined();
        expect(envelope.error!.code).toBeDefined();
        expect(typeof envelope.error!.code).toBe('string');
        expect(envelope.error!.message).toBeDefined();
        expect(typeof envelope.error!.message).toBe('string');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 29c: The status field is always either 'success' or 'error' (no other values).
   *
   * **Validates: Requirements 10.1**
   */
  it('should have status field as either "success" or "error" for any envelope', () => {
    fc.assert(
      fc.property(apiEnvelopeArb, (envelope) => {
        expect(['success', 'error']).toContain(envelope.status);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 29d: Success envelopes do NOT have an error field.
   *
   * **Validates: Requirements 10.1**
   */
  it('should NOT have an error field on success envelopes', () => {
    fc.assert(
      fc.property(successEnvelopeArb, (envelope) => {
        expect(envelope.status).toBe('success');
        expect(envelope.error).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 29e: Error envelopes do NOT have a data field.
   *
   * **Validates: Requirements 10.1**
   */
  it('should NOT have a data field on error envelopes', () => {
    fc.assert(
      fc.property(errorEnvelopeArb, (envelope) => {
        expect(envelope.status).toBe('error');
        expect(envelope.data).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });
});
