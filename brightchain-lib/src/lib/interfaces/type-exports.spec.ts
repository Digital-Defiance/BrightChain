/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ISimpleKeyPair } from '@digitaldefiance/ecies-lib';
import { describe, expect, it } from '@jest/globals';
import CONSTANTS from '../constants';
import type {
  IBCFECConsts,
  ICBLConsts,
  ISealingConsts,
  ISiteConsts,
  ITupleConsts,
} from '../interfaces/constants';

/**
 * Interface Export Tests
 *
 * Verifies that key interfaces are importable and that the runtime CONSTANTS
 * object satisfies the expected interface shapes. Type-only imports are
 * validated at compile time; runtime assertions verify the CONSTANTS object
 * actually carries the expected fields and value ranges.
 */
describe('Interface Export Tests', () => {
  describe('Interface Re-exports from ecies-lib', () => {
    it('should re-export ISimpleKeyPair interface from ecies-lib (compile-time check)', () => {
      // If this file compiles, the type re-export works.
      // Verify the upstream library provides the expected shape at runtime.
      const eciesLib = require('@digitaldefiance/ecies-lib');
      expect(eciesLib).toBeDefined();
    });
  });

  describe('BrightChain-Specific Constants satisfy interface contracts', () => {
    it('CONSTANTS.CBL satisfies ICBLConsts with valid values', () => {
      const cbl: ICBLConsts = CONSTANTS.CBL;
      expect(cbl.BASE_OVERHEAD).toBeGreaterThan(0);
      expect(cbl.MIME_TYPE_PATTERN).toBeInstanceOf(RegExp);
      expect(cbl.FILE_NAME_PATTERN).toBeInstanceOf(RegExp);
      expect(cbl.FILE_NAME_TRAVERSAL_PATTERN).toBeInstanceOf(RegExp);
      expect(cbl.MAX_FILE_NAME_LENGTH).toBeGreaterThanOrEqual(255);
      expect(cbl.MAX_MIME_TYPE_LENGTH).toBeGreaterThan(0);
      expect(cbl.MAX_INPUT_FILE_SIZE).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('CONSTANTS.BC_FEC satisfies IBCFECConsts with valid ranges', () => {
      const fec: IBCFECConsts = CONSTANTS.BC_FEC;
      expect(fec.REDUNDANCY_FACTOR).toBeGreaterThan(1);
      expect(fec.MIN_REDUNDANCY).toBeGreaterThan(1);
      expect(fec.MAX_REDUNDANCY).toBeGreaterThan(fec.MIN_REDUNDANCY);
      expect(fec.MAX_SHARD_SIZE).toBeGreaterThan(0);
    });

    it('CONSTANTS.TUPLE satisfies ITupleConsts with valid ranges', () => {
      const tuple: ITupleConsts = CONSTANTS.TUPLE;
      expect(tuple.MIN_RANDOM_BLOCKS).toBeGreaterThanOrEqual(1);
      expect(tuple.MAX_RANDOM_BLOCKS).toBeGreaterThanOrEqual(
        tuple.MIN_RANDOM_BLOCKS,
      );
      expect(tuple.RANDOM_BLOCKS_PER_TUPLE).toBeGreaterThanOrEqual(
        tuple.MIN_RANDOM_BLOCKS,
      );
      expect(tuple.RANDOM_BLOCKS_PER_TUPLE).toBeLessThanOrEqual(
        tuple.MAX_RANDOM_BLOCKS,
      );
      expect(tuple.SIZE).toBeGreaterThanOrEqual(tuple.MIN_SIZE);
      expect(tuple.SIZE).toBeLessThanOrEqual(tuple.MAX_SIZE);
    });

    it('CONSTANTS.SEALING satisfies ISealingConsts with valid ranges', () => {
      const sealing: ISealingConsts = CONSTANTS.SEALING;
      expect(sealing.MIN_SHARES).toBeGreaterThanOrEqual(2);
      expect(sealing.MAX_SHARES).toBeGreaterThan(sealing.MIN_SHARES);
      expect(sealing.DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(
        sealing.MIN_SHARES,
      );
      expect(sealing.DEFAULT_THRESHOLD).toBeLessThanOrEqual(
        sealing.MAX_SHARES,
      );
    });

    it('CONSTANTS.SITE satisfies ISiteConsts with non-empty values', () => {
      const site: ISiteConsts = CONSTANTS.SITE;
      expect(site.NAME.length).toBeGreaterThan(0);
      expect(site.VERSION.length).toBeGreaterThan(0);
      expect(site.DESCRIPTION.length).toBeGreaterThan(0);
      expect(site.EMAIL_FROM).toContain('@');
      expect(site.DOMAIN.length).toBeGreaterThan(0);
      expect(site.CSP_NONCE_SIZE).toBeGreaterThan(0);
    });
  });

  describe('CBL validation patterns work correctly', () => {
    it('MIME_TYPE_PATTERN accepts valid MIME types', () => {
      expect(CONSTANTS.CBL.MIME_TYPE_PATTERN.test('text/plain')).toBe(true);
      expect(CONSTANTS.CBL.MIME_TYPE_PATTERN.test('application/json')).toBe(
        true,
      );
    });

    it('FILE_NAME_TRAVERSAL_PATTERN detects path traversal', () => {
      expect(
        CONSTANTS.CBL.FILE_NAME_TRAVERSAL_PATTERN.test('../etc/passwd'),
      ).toBe(true);
      expect(
        CONSTANTS.CBL.FILE_NAME_TRAVERSAL_PATTERN.test('safe-file.txt'),
      ).toBe(false);
    });
  });
});
