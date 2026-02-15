/**
 * @fileoverview Property-based tests for Let's Encrypt configuration.
 *
 * Property 1: Hostname parsing round-trip (7.4)
 * Property 2: ILetsEncryptConfig JSON round-trip (7.5)
 */
import {
  parseHostnames,
  isValidHostname,
  type ILetsEncryptConfig,
} from '@digitaldefiance/node-express-suite';
import fc from 'fast-check';

// ── Generators ───────────────────────────────────────────────────────────

const alphanumChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
const alphanumHyphenChars = 'abcdefghijklmnopqrstuvwxyz0123456789-';
const alphaChars = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Generates a valid FQDN label: starts and ends with alphanumeric,
 * middle characters can include hyphens, length 1–63.
 */
const labelArb = fc
  .tuple(
    fc.string({
      unit: fc.constantFrom(...alphanumChars.split('')),
      minLength: 1,
      maxLength: 1,
    }),
    fc.string({
      unit: fc.constantFrom(...alphanumHyphenChars.split('')),
      minLength: 0,
      maxLength: 59,
    }),
    fc.string({
      unit: fc.constantFrom(...alphanumChars.split('')),
      minLength: 1,
      maxLength: 1,
    }),
  )
  .map(([first, mid, last]) => `${first}${mid}${last}`);

/**
 * Generates a valid TLD: 2+ alpha characters.
 */
const tldArb = fc.string({
  unit: fc.constantFrom(...alphaChars.split('')),
  minLength: 2,
  maxLength: 6,
});

/**
 * Generates a valid FQDN hostname like "sub.example.com".
 */
const hostnameArb = fc
  .tuple(fc.array(labelArb, { minLength: 1, maxLength: 3 }), tldArb)
  .map(([labels, tld]) => [...labels, tld].join('.'))
  .filter((h) => isValidHostname(h));

/**
 * Generates a valid ILetsEncryptConfig object.
 */
const letsEncryptConfigArb: fc.Arbitrary<ILetsEncryptConfig> = fc.record({
  enabled: fc.boolean(),
  maintainerEmail: fc
    .tuple(
      fc.string({
        unit: fc.constantFrom(...alphanumChars.split('')),
        minLength: 1,
        maxLength: 10,
      }),
      hostnameArb,
    )
    .map(([user, domain]) => `${user}@${domain}`),
  hostnames: fc.array(hostnameArb, { minLength: 1, maxLength: 5 }),
  staging: fc.boolean(),
  configDir: fc
    .string({
      unit: fc.constantFrom(
        ...'abcdefghijklmnopqrstuvwxyz0123456789-_/'.split(''),
      ),
      minLength: 1,
      maxLength: 30,
    })
    .map((s: string) => `./${s}`),
});

// ── Property 1: Hostname parsing round-trip ──────────────────────────────

describe('Feature: letsencrypt-greenlock, Property 1: Hostname parsing round-trip', () => {
  /**
   * **Validates: Requirements 5.4**
   *
   * For any list of valid hostname strings, joining them with commas
   * and parsing via parseHostnames() produces the original array.
   */
  it('round-trips hostname arrays through comma-join and parseHostnames', () => {
    fc.assert(
      fc.property(
        fc.array(hostnameArb, { minLength: 1, maxLength: 10 }),
        (hostnames) => {
          const joined = hostnames.join(',');
          const parsed = parseHostnames(joined);
          expect(parsed).toEqual(hostnames);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 2: ILetsEncryptConfig JSON round-trip ───────────────────────

describe('Feature: letsencrypt-greenlock, Property 2: ILetsEncryptConfig JSON round-trip', () => {
  /**
   * **Validates: Requirements 8.1, 8.2**
   *
   * For any valid ILetsEncryptConfig, JSON.parse(JSON.stringify(config))
   * produces a deeply equal object.
   */
  it('round-trips ILetsEncryptConfig through JSON serialization', () => {
    fc.assert(
      fc.property(letsEncryptConfigArb, (config: ILetsEncryptConfig) => {
        const roundTripped = JSON.parse(JSON.stringify(config));
        expect(roundTripped).toEqual(config);
      }),
      { numRuns: 100 },
    );
  });
});
