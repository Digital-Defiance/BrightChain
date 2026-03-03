/**
 * Property-based tests for autofill hooks — Properties 19, 20
 *
 * Property 19: Autofill site URL matching
 * Property 20: PostMessage origin validation
 *
 * **Validates: Requirements 13.1, 13.5**
 */

import fc from 'fast-check';

// Mock brightchain-lib to avoid the heavy ECIES/GUID init chain
jest.mock('@brightchain/brightchain-lib', () => ({
  __esModule: true,
  BrightPassStrings: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));

jest.mock('../hooks/useBrightPassApi', () => ({
  __esModule: true,
  useBrightPassApi: () => ({
    getAutofill: jest.fn(),
    listVaults: jest.fn(),
    searchEntries: jest.fn(),
    generatePassword: jest.fn(),
    checkBreach: jest.fn(),
  }),
}));

// Import AFTER mocks
import { matchSiteUrl } from './useBrightPassAutofill';
import { isAllowedOrigin } from './useBrightPassExtensionBridge';

describe('Property 19: Autofill site URL matching', () => {
  const alphaChar = fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz'.split(''),
  );
  const domainLabel = fc
    .array(alphaChar, { minLength: 2, maxLength: 8 })
    .map((arr) => arr.join(''));
  const tldArb = fc.constantFrom('com', 'org', 'net', 'io', 'dev');
  const domainArb = fc
    .tuple(domainLabel, tldArb)
    .map(([sub, tld]) => `${sub}.${tld}`);

  it('matches when hostnames are the same regardless of protocol', () => {
    fc.assert(
      fc.property(
        domainArb,
        fc.constantFrom('http://', 'https://'),
        fc.constantFrom('http://', 'https://'),
        (domain, proto1, proto2) => {
          expect(matchSiteUrl(`${proto1}${domain}`, `${proto2}${domain}`)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('matches when hostnames are the same regardless of path', () => {
    fc.assert(
      fc.property(
        domainArb,
        domainLabel,
        domainLabel,
        (domain, path1, path2) => {
          expect(
            matchSiteUrl(`https://${domain}/${path1}`, `https://${domain}/${path2}`),
          ).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('does not match when hostnames differ', () => {
    fc.assert(
      fc.property(
        domainArb,
        domainArb,
        (domain1, domain2) => {
          fc.pre(domain1 !== domain2);
          expect(matchSiteUrl(`https://${domain1}`, `https://${domain2}`)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false for empty strings', () => {
    expect(matchSiteUrl('', 'https://example.com')).toBe(false);
    expect(matchSiteUrl('https://example.com', '')).toBe(false);
    expect(matchSiteUrl('', '')).toBe(false);
  });
});

describe('Property 20: PostMessage origin validation', () => {
  it('allows exact match origins (case-insensitive)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'https://app.example.com',
          'https://dashboard.test.org',
          'http://localhost:3000',
        ),
        (origin) => {
          expect(isAllowedOrigin(origin, [origin])).toBe(true);
          expect(isAllowedOrigin(origin.toUpperCase(), [origin])).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects origins not in the allowlist', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'https://evil.com',
          'https://attacker.org',
          'http://malicious.net',
        ),
        (origin) => {
          expect(
            isAllowedOrigin(origin, [
              'https://app.example.com',
              'https://dashboard.test.org',
            ]),
          ).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('supports wildcard patterns', () => {
    const allowlist = ['https://*.example.com'];
    expect(isAllowedOrigin('https://app.example.com', allowlist)).toBe(true);
    expect(isAllowedOrigin('https://sub.app.example.com', allowlist)).toBe(true);
    expect(isAllowedOrigin('https://evil.com', allowlist)).toBe(false);
  });

  it('rejects all origins when allowlist is empty', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (origin) => {
          expect(isAllowedOrigin(origin, [])).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('is deterministic', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('https://app.example.com', 'https://evil.com'),
        fc.constantFrom(
          ['https://app.example.com'],
          ['https://*.example.com'],
          [],
        ),
        (origin, allowlist) => {
          const a = isAllowedOrigin(origin, allowlist);
          const b = isAllowedOrigin(origin, allowlist);
          expect(a).toBe(b);
        },
      ),
      { numRuns: 100 },
    );
  });
});
