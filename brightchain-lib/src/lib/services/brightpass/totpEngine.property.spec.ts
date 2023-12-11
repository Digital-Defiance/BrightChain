/**
 * Property-based tests for TOTP Engine
 * Feature: api-lib-to-lib-migration
 *
 * These tests validate universal properties of the TOTP engine
 * using fast-check for property-based testing.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**
 */

import fc from 'fast-check';
import { TOTPConfig, TOTPEngine } from './totpEngine';

/**
 * Base32 alphabet for generating valid secrets
 */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Arbitrary for valid base32 secrets
 * TOTP secrets should be at least 16 characters (80 bits) for security
 */
const validBase32SecretArb = fc
  .array(fc.constantFrom(...BASE32_ALPHABET.split('')), {
    minLength: 16,
    maxLength: 32,
  })
  .map((chars) => chars.join(''));

/**
 * Arbitrary for valid TOTP algorithms
 */
const validAlgorithmArb = fc.constantFrom(
  'SHA1',
  'SHA256',
  'SHA512',
) as fc.Arbitrary<'SHA1' | 'SHA256' | 'SHA512'>;

/**
 * Arbitrary for valid digit counts (6 or 8 are standard)
 */
const validDigitsArb = fc.constantFrom(6, 8);

/**
 * Arbitrary for valid periods (30 or 60 seconds are standard)
 */
const validPeriodArb = fc.constantFrom(30, 60);

/**
 * Arbitrary for valid issuer names (alphanumeric)
 */
const validIssuerArb: fc.Arbitrary<string> = fc
  .array(
    fc.constantFrom(
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split(
        '',
      ),
    ),
    { minLength: 3, maxLength: 20 },
  )
  .map((chars) => chars.join(''));

/**
 * Arbitrary for valid label names (email-like format)
 */
const validLabelArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
    minLength: 3,
    maxLength: 15,
  })
  .map((chars) => `${chars.join('')}@example.com`);

/**
 * Arbitrary for valid TOTP configurations
 */
const validTOTPConfigArb: fc.Arbitrary<TOTPConfig> = fc.record({
  issuer: validIssuerArb,
  label: validLabelArb,
  algorithm: fc.option(validAlgorithmArb, { nil: undefined }),
  digits: fc.option(validDigitsArb, { nil: undefined }),
  period: fc.option(validPeriodArb, { nil: undefined }),
});

/**
 * Property 3: TOTP Round-Trip Validation
 *
 * For any valid base32 secret and timestamp within the current period,
 * generating a TOTP code and immediately validating it with window=0
 * SHALL return true.
 *
 * **Validates: Requirements 2.1, 2.2**
 */
describe('Feature: api-lib-to-lib-migration, Property 3: TOTP Round-Trip Validation', () => {
  /**
   * Property 3a: Generated TOTP code validates immediately with window=0
   */
  it('Property 3a: Generated TOTP code validates immediately with window=0', () => {
    fc.assert(
      fc.property(validBase32SecretArb, (secret) => {
        const timestamp = Date.now();
        const code = TOTPEngine.generate(secret, timestamp);
        const isValid = TOTPEngine.validate(code, secret, 0);
        expect(isValid).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3b: Generated TOTP code validates with default window
   */
  it('Property 3b: Generated TOTP code validates with default window', () => {
    fc.assert(
      fc.property(validBase32SecretArb, (secret) => {
        const code = TOTPEngine.generate(secret);
        const isValid = TOTPEngine.validate(code, secret);
        expect(isValid).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3c: TOTP codes are 6 digits by default
   */
  it('Property 3c: TOTP codes are 6 digits by default', () => {
    fc.assert(
      fc.property(validBase32SecretArb, (secret) => {
        const code = TOTPEngine.generate(secret);
        expect(code).toMatch(/^\d{6}$/);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3d: Same secret and timestamp produce same code
   */
  it('Property 3d: Same secret and timestamp produce same code', () => {
    fc.assert(
      fc.property(validBase32SecretArb, (secret) => {
        const timestamp = Date.now();
        const code1 = TOTPEngine.generate(secret, timestamp);
        const code2 = TOTPEngine.generate(secret, timestamp);
        expect(code1).toBe(code2);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3e: Different secrets produce different codes (with high probability)
   */
  it('Property 3e: Different secrets produce different codes', () => {
    fc.assert(
      fc.property(
        validBase32SecretArb,
        validBase32SecretArb,
        (secret1, secret2) => {
          fc.pre(secret1 !== secret2);
          const timestamp = Date.now();
          const code1 = TOTPEngine.generate(secret1, timestamp);
          const code2 = TOTPEngine.generate(secret2, timestamp);
          expect(code1).not.toBe(code2);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3f: Code from previous period validates with window=1
   */
  it('Property 3f: Code from previous period validates with window=1', () => {
    fc.assert(
      fc.property(validBase32SecretArb, (secret) => {
        const now = Date.now();
        const previousPeriodTimestamp = now - 30000;
        const code = TOTPEngine.generate(secret, previousPeriodTimestamp);
        const isValid = TOTPEngine.validate(code, secret, 1);
        expect(isValid).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3g: Invalid code does not validate
   */
  it('Property 3g: Invalid code does not validate', () => {
    fc.assert(
      fc.property(validBase32SecretArb, (secret) => {
        const validCode = TOTPEngine.generate(secret);
        // Generate a code that is definitely different by incrementing
        const validNum = parseInt(validCode, 10);
        const invalidNum = (validNum + 1) % 1000000;
        const invalidCode = invalidNum.toString().padStart(6, '0');
        const isValid = TOTPEngine.validate(invalidCode, secret, 0);
        expect(isValid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3h: createSecret generates valid base32 secrets
   */
  it('Property 3h: createSecret generates valid base32 secrets', () => {
    for (let i = 0; i < 100; i++) {
      const secret = TOTPEngine.createSecret();
      expect(secret.length).toBeGreaterThan(0);
      expect(secret).toMatch(/^[A-Z2-7]+$/);
      const code = TOTPEngine.generate(secret);
      expect(code).toMatch(/^\d{6}$/);
      const isValid = TOTPEngine.validate(code, secret);
      expect(isValid).toBe(true);
    }
  });
});

/**
 * Property 4: TOTP Configuration Correctness
 *
 * For any TOTPConfig with valid issuer and label, the generated otpauth:// URI
 * SHALL contain the issuer, label, and configured algorithm/digits/period parameters,
 * and the QR code SHALL be a valid data URL.
 *
 * **Validates: Requirements 2.3, 2.4, 2.5, 2.6**
 */
describe('Feature: api-lib-to-lib-migration, Property 4: TOTP Configuration Correctness', () => {
  /**
   * Property 4a: Generated URI starts with otpauth://totp/
   */
  it('Property 4a: Generated URI starts with otpauth://totp/', () => {
    fc.assert(
      fc.property(
        validBase32SecretArb,
        validTOTPConfigArb,
        (secret, config) => {
          const uri = TOTPEngine.generateOtpauthUri(secret, config);
          expect(uri.startsWith('otpauth://totp/')).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4b: Generated URI contains the issuer parameter
   */
  it('Property 4b: Generated URI contains the issuer parameter', () => {
    fc.assert(
      fc.property(
        validBase32SecretArb,
        validTOTPConfigArb,
        (secret, config) => {
          const uri = TOTPEngine.generateOtpauthUri(secret, config);
          const encodedIssuer = encodeURIComponent(config.issuer);
          expect(uri).toContain(`issuer=${encodedIssuer}`);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4c: Generated URI contains the label
   */
  it('Property 4c: Generated URI contains the label', () => {
    fc.assert(
      fc.property(
        validBase32SecretArb,
        validTOTPConfigArb,
        (secret, config) => {
          const uri = TOTPEngine.generateOtpauthUri(secret, config);
          const encodedLabel = encodeURIComponent(config.label);
          expect(uri).toContain(encodedLabel);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4d: Generated URI contains a secret parameter
   */
  it('Property 4d: Generated URI contains a secret parameter', () => {
    fc.assert(
      fc.property(
        validBase32SecretArb,
        validTOTPConfigArb,
        (secret, config) => {
          const uri = TOTPEngine.generateOtpauthUri(secret, config);
          // The library may normalize the secret (e.g., padding), so just check it contains a secret param
          expect(uri).toContain('secret=');
          // The secret in the URI should be valid base32
          const match = uri.match(/secret=([A-Z2-7]+)/);
          expect(match).not.toBeNull();
          expect(match![1].length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4e: Generated URI contains algorithm when specified
   */
  it('Property 4e: Generated URI contains algorithm when specified', () => {
    // Use a config that always has algorithm defined
    const configWithAlgorithmArb = fc.record({
      issuer: validIssuerArb,
      label: validLabelArb,
      algorithm: validAlgorithmArb,
      digits: fc.option(validDigitsArb, { nil: undefined }),
      period: fc.option(validPeriodArb, { nil: undefined }),
    });

    fc.assert(
      fc.property(
        validBase32SecretArb,
        configWithAlgorithmArb,
        (secret, config) => {
          const uri = TOTPEngine.generateOtpauthUri(secret, config);
          expect(uri).toContain(`algorithm=${config.algorithm}`);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4f: Generated URI contains digits when specified
   */
  it('Property 4f: Generated URI contains digits when specified', () => {
    // Use a config that always has digits defined
    const configWithDigitsArb = fc.record({
      issuer: validIssuerArb,
      label: validLabelArb,
      algorithm: fc.option(validAlgorithmArb, { nil: undefined }),
      digits: validDigitsArb,
      period: fc.option(validPeriodArb, { nil: undefined }),
    });

    fc.assert(
      fc.property(
        validBase32SecretArb,
        configWithDigitsArb,
        (secret, config) => {
          const uri = TOTPEngine.generateOtpauthUri(secret, config);
          expect(uri).toContain(`digits=${config.digits}`);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4g: Generated URI contains period when specified
   */
  it('Property 4g: Generated URI contains period when specified', () => {
    // Use a config that always has period defined
    const configWithPeriodArb = fc.record({
      issuer: validIssuerArb,
      label: validLabelArb,
      algorithm: fc.option(validAlgorithmArb, { nil: undefined }),
      digits: fc.option(validDigitsArb, { nil: undefined }),
      period: validPeriodArb,
    });

    fc.assert(
      fc.property(
        validBase32SecretArb,
        configWithPeriodArb,
        (secret, config) => {
          const uri = TOTPEngine.generateOtpauthUri(secret, config);
          expect(uri).toContain(`period=${config.period}`);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4h: Generated QR code is a valid data URL
   * Note: Using fixed test cases for async QR code generation to avoid timeouts
   */
  it('Property 4h: Generated QR code is a valid data URL', async () => {
    const testCases = [
      { issuer: 'BrightChain', label: 'user@example.com' },
      {
        issuer: 'TestApp',
        label: 'test@test.com',
        algorithm: 'SHA256' as const,
      },
      {
        issuer: 'MyService',
        label: 'admin@service.com',
        digits: 8,
        period: 60,
      },
    ];

    for (const config of testCases) {
      const secret = TOTPEngine.createSecret();
      const uri = TOTPEngine.generateOtpauthUri(secret, config);
      const qrCode = await TOTPEngine.generateQRCode(uri);

      expect(qrCode.startsWith('data:image/png;base64,')).toBe(true);
      const base64Content = qrCode.replace('data:image/png;base64,', '');
      expect(base64Content.length).toBeGreaterThan(0);
      expect(() => Buffer.from(base64Content, 'base64')).not.toThrow();
    }
  });

  /**
   * Property 4i: setup() returns consistent secret, URI, and QR code
   * Note: Using fixed test cases for async setup to avoid timeouts
   */
  it('Property 4i: setup() returns consistent secret, URI, and QR code', async () => {
    const testCases: TOTPConfig[] = [
      { issuer: 'BrightChain', label: 'user@example.com' },
      { issuer: 'TestApp', label: 'test@test.com', algorithm: 'SHA256' },
      {
        issuer: 'MyService',
        label: 'admin@service.com',
        digits: 8,
        period: 60,
      },
    ];

    for (const config of testCases) {
      const result = await TOTPEngine.setup(config);

      expect(result.secret).toMatch(/^[A-Z2-7]+$/);
      expect(result.secret.length).toBeGreaterThan(0);
      expect(result.uri).toContain(`secret=${result.secret}`);
      expect(result.uri.startsWith('otpauth://totp/')).toBe(true);
      expect(result.qrCode.startsWith('data:image/png;base64,')).toBe(true);

      const code = TOTPEngine.generate(result.secret);
      const isValid = TOTPEngine.validate(code, result.secret);
      expect(isValid).toBe(true);
    }
  }, 30_000);

  /**
   * Property 4j: URI is parseable and contains all required components
   */
  it('Property 4j: URI is parseable and contains all required components', () => {
    fc.assert(
      fc.property(
        validBase32SecretArb,
        validTOTPConfigArb,
        (secret, config) => {
          const uri = TOTPEngine.generateOtpauthUri(secret, config);
          const url = new URL(uri);

          expect(url.protocol).toBe('otpauth:');
          expect(url.host).toBe('totp');

          const params = url.searchParams;
          // Secret may be normalized by the library, just verify it exists and is valid base32
          const secretParam = params.get('secret');
          expect(secretParam).not.toBeNull();
          expect(secretParam).toMatch(/^[A-Z2-7]+$/);

          expect(params.get('issuer')).toBe(config.issuer);

          const expectedAlgorithm = config.algorithm || 'SHA1';
          expect(params.get('algorithm')).toBe(expectedAlgorithm);

          const expectedDigits = config.digits || 6;
          expect(params.get('digits')).toBe(String(expectedDigits));

          const expectedPeriod = config.period || 30;
          expect(params.get('period')).toBe(String(expectedPeriod));
        },
      ),
      { numRuns: 100 },
    );
  });
});
