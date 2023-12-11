/**
 * Tests for the IConstants interface structure.
 * Validates Requirements 1.1, 4.3, 4.4
 *
 * Note: These tests validate the interface structure at compile-time.
 * Per the block-encryption-scheme design, ecies-lib constants should be
 * imported directly from @digitaldefiance/ecies-lib, not re-exported.
 */

import type { IConstants as IBaseConstants } from '@digitaldefiance/ecies-lib';
import type {
  IBCFECConsts,
  ICBLConsts,
  IConstants,
  ISealingConsts,
  ISiteConsts,
  ITupleConsts,
} from './constants';

describe('IConstants Interface Structure', () => {
  describe('Interface Extension (Requirement 1.1)', () => {
    it('should extend IConstants from @digitaldefiance/ecies-lib', () => {
      // This test validates that IConstants extends the upstream interface
      // by checking type compatibility at compile-time

      // Create a type-level test
      type ExtendsBase = IConstants extends IBaseConstants ? true : false;
      const extendsBase: ExtendsBase = true as ExtendsBase;

      expect(extendsBase).toBe(true);
    });
  });

  describe('BrightChain-Specific Interfaces Preserved (Requirement 4.3)', () => {
    it('should include all BrightChain-specific properties', () => {
      // Type-level checks that all BrightChain-specific properties exist
      type HasCBL = 'CBL' extends keyof IConstants ? true : false;
      type HasFEC = 'BC_FEC' extends keyof IConstants ? true : false;
      type HasTUPLE = 'TUPLE' extends keyof IConstants ? true : false;
      type HasSEALING = 'SEALING' extends keyof IConstants ? true : false;
      type HasSITE = 'SITE' extends keyof IConstants ? true : false;
      type HasOFFSCache = 'OFFS_CACHE_PERCENTAGE' extends keyof IConstants
        ? true
        : false;

      const hasCBL: HasCBL = true;
      const hasFEC: HasFEC = true;
      const hasTUPLE: HasTUPLE = true;
      const hasSEALING: HasSEALING = true;
      const hasSITE: HasSITE = true;
      const hasOFFSCache: HasOFFSCache = true;

      expect(hasCBL).toBe(true);
      expect(hasFEC).toBe(true);
      expect(hasTUPLE).toBe(true);
      expect(hasSEALING).toBe(true);
      expect(hasSITE).toBe(true);
      expect(hasOFFSCache).toBe(true);
    });

    it('should have correct types for BrightChain-specific properties', () => {
      // Type-level checks for property types
      type CBLType = IConstants['CBL'] extends ICBLConsts ? true : false;
      type FECType = IConstants['BC_FEC'] extends IBCFECConsts ? true : false;
      type TUPLEType = IConstants['TUPLE'] extends ITupleConsts ? true : false;
      type SEALINGType = IConstants['SEALING'] extends ISealingConsts
        ? true
        : false;
      type SITEType = IConstants['SITE'] extends ISiteConsts ? true : false;
      type OFFSCacheType = IConstants['OFFS_CACHE_PERCENTAGE'] extends number
        ? true
        : false;

      const cblType: CBLType = true;
      const fecType: FECType = true;
      const tupleType: TUPLEType = true;
      const sealingType: SEALINGType = true;
      const siteType: SITEType = true;
      const offsCacheType: OFFSCacheType = true;

      expect(cblType).toBe(true);
      expect(fecType).toBe(true);
      expect(tupleType).toBe(true);
      expect(sealingType).toBe(true);
      expect(siteType).toBe(true);
      expect(offsCacheType).toBe(true);
    });
  });

  describe('Base constants from ecies-lib (Requirement 4.4)', () => {
    it('should have ECIES property (from extended interface)', () => {
      // Type-level check that ECIES exists on IConstants (inherited from IBaseConstants)
      type HasECIES = 'ECIES' extends keyof IConstants ? 'present' : never;
      const hasECIES: HasECIES = 'present';

      expect(hasECIES).toBe('present');
    });

    it('should have CHECKSUM property (from extended interface)', () => {
      // Type-level check that CHECKSUM exists on IConstants
      type HasChecksum = 'CHECKSUM' extends keyof IConstants
        ? 'present'
        : never;
      const hasChecksum: HasChecksum = 'present';

      expect(hasChecksum).toBe('present');
    });

    it('should have PBKDF2 property (from extended interface)', () => {
      // Type-level check that PBKDF2 exists on IConstants
      type HasPBKDF2 = 'PBKDF2' extends keyof IConstants ? 'present' : never;
      const hasPBKDF2: HasPBKDF2 = 'present';

      expect(hasPBKDF2).toBe('present');
    });

    it('should have VOTING property (from extended interface)', () => {
      // Type-level check that VOTING exists on IConstants
      type HasVoting = 'VOTING' extends keyof IConstants ? 'present' : never;
      const hasVoting: HasVoting = 'present';

      expect(hasVoting).toBe('present');
    });

    it('should have idProvider property (from extended interface)', () => {
      // Type-level check that idProvider exists on IConstants
      type HasIdProvider = 'idProvider' extends keyof IConstants
        ? 'present'
        : never;
      const hasIdProvider: HasIdProvider = 'present';

      expect(hasIdProvider).toBe('present');
    });
  });
});
