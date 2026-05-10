import {
  IContentSignatureParams,
  parseContentSignature,
  serializeContentSignature,
} from '../interfaces/wcap-header';

/**
 * Unit tests for Content-Signature header serialization and parsing.
 *
 * Validates: Requirements 7.1, 7.5, 11.1
 */
describe('Content-Signature header utilities', () => {
  // Known test fixtures
  const baseParams: IContentSignatureParams = {
    alg: 'dd-ecies-secp256k1-sha256',
    key_uri: '/.well-known/wcap-public-key-secp256k1.pem',
    sig: 'dGVzdC1zaWduYXR1cmUtYmFzZTY0LWVuY29kZWQtNjQtYnl0ZXMtcGFkZGVkLXRvLWZpbGw=',
  };

  const paramsWithKid: IContentSignatureParams = {
    ...baseParams,
    kid: 'key-2024-primary',
  };

  const paramsWithPolicy: IContentSignatureParams = {
    ...baseParams,
    policy: 'decryption-verified',
  };

  const paramsWithKidAndPolicy: IContentSignatureParams = {
    ...baseParams,
    kid: 'key-2024-primary',
    policy: 'decryption-verified',
  };

  describe('serializeContentSignature', () => {
    it('produces the exact WCAP Section 6.3 format without kid', () => {
      const result = serializeContentSignature(baseParams);
      expect(result).toBe(
        `alg=dd-ecies-secp256k1-sha256; key_uri=/.well-known/wcap-public-key-secp256k1.pem; sig=${baseParams.sig}`,
      );
    });

    it('appends kid after sig when kid is present', () => {
      const result = serializeContentSignature(paramsWithKid);
      expect(result).toBe(
        `alg=dd-ecies-secp256k1-sha256; key_uri=/.well-known/wcap-public-key-secp256k1.pem; sig=${baseParams.sig}; kid=key-2024-primary`,
      );
    });

    it('does not include kid when kid is undefined', () => {
      const result = serializeContentSignature(baseParams);
      expect(result).not.toContain('kid=');
    });

    it('preserves parameter order: alg, key_uri, sig, kid', () => {
      const result = serializeContentSignature(paramsWithKid);
      const parts = result.split('; ');
      expect(parts[0]).toMatch(/^alg=/);
      expect(parts[1]).toMatch(/^key_uri=/);
      expect(parts[2]).toMatch(/^sig=/);
      expect(parts[3]).toMatch(/^kid=/);
    });

    it('uses "; " (semicolon-space) as the separator', () => {
      const result = serializeContentSignature(baseParams);
      // Should contain "; " separators, not just ";" or " ; "
      const segments = result.split('; ');
      expect(segments).toHaveLength(3);
    });

    it('handles sig values containing base64 padding characters', () => {
      const params: IContentSignatureParams = {
        alg: 'dd-ecies-secp256k1-sha256',
        key_uri: '/key',
        sig: 'AAAA==',
      };
      const result = serializeContentSignature(params);
      expect(result).toBe(
        'alg=dd-ecies-secp256k1-sha256; key_uri=/key; sig=AAAA==',
      );
    });

    it('appends policy after sig when policy is present and kid is absent', () => {
      const result = serializeContentSignature(paramsWithPolicy);
      expect(result).toBe(
        `alg=dd-ecies-secp256k1-sha256; key_uri=/.well-known/wcap-public-key-secp256k1.pem; sig=${baseParams.sig}; policy=decryption-verified`,
      );
    });

    it('does not include policy when policy is undefined', () => {
      const result = serializeContentSignature(baseParams);
      expect(result).not.toContain('policy=');
    });

    it('appends policy after kid when both are present', () => {
      const result = serializeContentSignature(paramsWithKidAndPolicy);
      const parts = result.split('; ');
      expect(parts[0]).toMatch(/^alg=/);
      expect(parts[1]).toMatch(/^key_uri=/);
      expect(parts[2]).toMatch(/^sig=/);
      expect(parts[3]).toMatch(/^kid=/);
      expect(parts[4]).toMatch(/^policy=/);
    });
  });

  describe('parseContentSignature', () => {
    it('parses a valid header string back to params (without kid)', () => {
      const header = `alg=dd-ecies-secp256k1-sha256; key_uri=/.well-known/wcap-public-key-secp256k1.pem; sig=${baseParams.sig}`;
      const result = parseContentSignature(header);
      expect(result).toEqual(baseParams);
    });

    it('parses a valid header string with kid', () => {
      const header = `alg=dd-ecies-secp256k1-sha256; key_uri=/.well-known/wcap-public-key-secp256k1.pem; sig=${baseParams.sig}; kid=key-2024-primary`;
      const result = parseContentSignature(header);
      expect(result).toEqual(paramsWithKid);
    });

    it('parses a valid header string with policy', () => {
      const header = `alg=dd-ecies-secp256k1-sha256; key_uri=/.well-known/wcap-public-key-secp256k1.pem; sig=${baseParams.sig}; policy=decryption-verified`;
      const result = parseContentSignature(header);
      expect(result).toEqual(paramsWithPolicy);
    });

    it('parses a valid header string with kid and policy', () => {
      const header = `alg=dd-ecies-secp256k1-sha256; key_uri=/.well-known/wcap-public-key-secp256k1.pem; sig=${baseParams.sig}; kid=key-2024-primary; policy=decryption-verified`;
      const result = parseContentSignature(header);
      expect(result).toEqual(paramsWithKidAndPolicy);
    });

    it('round-trips: parse(serialize(params)) === params (without kid)', () => {
      const serialized = serializeContentSignature(baseParams);
      const parsed = parseContentSignature(serialized);
      expect(parsed).toEqual(baseParams);
    });

    it('round-trips: parse(serialize(params)) === params (with kid)', () => {
      const serialized = serializeContentSignature(paramsWithKid);
      const parsed = parseContentSignature(serialized);
      expect(parsed).toEqual(paramsWithKid);
    });

    it('round-trips: parse(serialize(params)) === params (with policy)', () => {
      const serialized = serializeContentSignature(paramsWithPolicy);
      const parsed = parseContentSignature(serialized);
      expect(parsed).toEqual(paramsWithPolicy);
    });

    it('round-trips: parse(serialize(params)) === params (with kid and policy)', () => {
      const serialized = serializeContentSignature(paramsWithKidAndPolicy);
      const parsed = parseContentSignature(serialized);
      expect(parsed).toEqual(paramsWithKidAndPolicy);
    });

    it('handles sig values containing "=" (base64 padding)', () => {
      const header = 'alg=test; key_uri=/key; sig=AAAA==';
      const result = parseContentSignature(header);
      expect(result).toBeDefined();
      expect(result!.sig).toBe('AAAA==');
    });
  });

  describe('parseContentSignature — malformed inputs', () => {
    it('returns undefined for empty string', () => {
      expect(parseContentSignature('')).toBeUndefined();
    });

    it('returns undefined for whitespace-only string', () => {
      expect(parseContentSignature('   ')).toBeUndefined();
    });

    it('returns undefined when alg is missing', () => {
      const header = `key_uri=/key; sig=${baseParams.sig}`;
      expect(parseContentSignature(header)).toBeUndefined();
    });

    it('returns undefined when key_uri is missing', () => {
      const header = `alg=dd-ecies-secp256k1-sha256; sig=${baseParams.sig}`;
      expect(parseContentSignature(header)).toBeUndefined();
    });

    it('returns undefined when sig is missing', () => {
      const header = 'alg=dd-ecies-secp256k1-sha256; key_uri=/key';
      expect(parseContentSignature(header)).toBeUndefined();
    });

    it('returns undefined for a segment without "="', () => {
      const header = 'alg=test; key_uri=/key; sig=abc; badfield';
      expect(parseContentSignature(header)).toBeUndefined();
    });

    it('returns undefined for a segment with empty key', () => {
      const header = '=value; alg=test; key_uri=/key; sig=abc';
      expect(parseContentSignature(header)).toBeUndefined();
    });

    it('returns undefined for a segment with empty value', () => {
      const header = 'alg=; key_uri=/key; sig=abc';
      expect(parseContentSignature(header)).toBeUndefined();
    });

    it('returns undefined for completely malformed input', () => {
      expect(parseContentSignature('not-a-header-at-all')).toBeUndefined();
    });
  });
});
