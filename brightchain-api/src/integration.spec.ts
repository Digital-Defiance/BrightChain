/**
 * Integration tests for brightchain-api with refactored constants.
 * Verifies that the API can import and use constants from brightchain-lib
 * and that the cross-package dependency chain works correctly.
 */
import { CONSTANTS } from '@brightchain/brightchain-lib';

describe('BrightChain API Integration with Refactored Constants', () => {
  it('should import CONSTANTS from brightchain-lib with expected structure', () => {
    expect(CONSTANTS).toBeDefined();
    expect(CONSTANTS.SITE).toBeDefined();
    expect(typeof CONSTANTS.SITE.CSP_NONCE_SIZE).toBe('number');
    expect(CONSTANTS.SITE.CSP_NONCE_SIZE).toBeGreaterThan(0);
  });

  it('should have CBL constants accessible through the import chain', () => {
    expect(CONSTANTS.CBL).toBeDefined();
    expect(CONSTANTS.CBL.BASE_OVERHEAD).toBeGreaterThan(0);
    expect(CONSTANTS.CBL.MAX_INPUT_FILE_SIZE).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('should have TUPLE constants accessible through the import chain', () => {
    expect(CONSTANTS.TUPLE).toBeDefined();
    expect(CONSTANTS.TUPLE.SIZE).toBeGreaterThanOrEqual(CONSTANTS.TUPLE.MIN_SIZE);
    expect(CONSTANTS.TUPLE.SIZE).toBeLessThanOrEqual(CONSTANTS.TUPLE.MAX_SIZE);
  });

  it('should have FEC constants accessible through the import chain', () => {
    expect(CONSTANTS.BC_FEC).toBeDefined();
    expect(CONSTANTS.BC_FEC.REDUNDANCY_FACTOR).toBeGreaterThan(1);
    expect(CONSTANTS.BC_FEC.MAX_REDUNDANCY).toBeGreaterThan(
      CONSTANTS.BC_FEC.MIN_REDUNDANCY,
    );
  });

  it('should have SEALING constants accessible through the import chain', () => {
    expect(CONSTANTS.SEALING).toBeDefined();
    expect(CONSTANTS.SEALING.MIN_SHARES).toBeGreaterThanOrEqual(2);
    expect(CONSTANTS.SEALING.DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(
      CONSTANTS.SEALING.MIN_SHARES,
    );
  });
});
