import fc from 'fast-check';
import { AccessSeal } from '../crypto/access-seal';

describe('AccessSeal', () => {
  // Feature: digital-burn-bag, Property 4: Seal mutation on read
  // Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.2
  it('Property 4: pristine and accessed seals differ and verify correctly', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 32, maxLength: 32 }), (seed) => {
        const pristine = AccessSeal.derive(seed, AccessSeal.PRISTINE_DOMAIN);
        const accessed = AccessSeal.derive(seed, AccessSeal.ACCESSED_DOMAIN);

        // Pristine and accessed seals must differ
        expect(pristine).not.toEqual(accessed);

        // Verify pristine matches pristine
        expect(AccessSeal.verifyPristine(seed, pristine)).toBe(true);
        expect(AccessSeal.verifyAccessed(seed, pristine)).toBe(false);

        // Verify accessed matches accessed
        expect(AccessSeal.verifyAccessed(seed, accessed)).toBe(true);
        expect(AccessSeal.verifyPristine(seed, accessed)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: digital-burn-bag, Property 22: Seal forgery infeasibility
  // Validates: Requirements 18.1, 18.2, 18.3
  it('Property 22: random seed does not produce matching seal', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 32, maxLength: 32 }),
        fc.uint8Array({ minLength: 32, maxLength: 32 }),
        (realSeed, fakeSeed) => {
          fc.pre(!realSeed.every((v, i) => v === fakeSeed[i]));
          const realSeal = AccessSeal.derive(
            realSeed,
            AccessSeal.PRISTINE_DOMAIN,
          );
          expect(AccessSeal.verifyPristine(fakeSeed, realSeal)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('seal output is 64 bytes (SHA3-512)', () => {
    const seed = new Uint8Array(32);
    crypto.getRandomValues(seed);
    const seal = AccessSeal.derive(seed, AccessSeal.PRISTINE_DOMAIN);
    expect(seal.length).toBe(64);
  });
});
