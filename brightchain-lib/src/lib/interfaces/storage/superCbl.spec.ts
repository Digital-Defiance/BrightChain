/**
 * @fileoverview Unit tests for Super CBL type definitions
 *
 * **Feature: super-cbl**
 *
 * This test suite verifies:
 * - Type guards for CBL type detection
 * - Interface compliance for all CBL formats
 *
 * **Validates: Requirements 6.5**
 */

import { describe, expect, it } from '@jest/globals';
import type {
  CBLData,
  CBLv1,
  RegularCBLv2,
  SubCBL,
  SuperCBL,
} from './superCbl';

/**
 * Type guard to check if CBL is version 1
 */
function isCBLv1(cbl: CBLData): cbl is CBLv1 {
  return cbl.version === 1;
}

/**
 * Type guard to check if CBL is version 2 regular
 */
function isRegularCBLv2(cbl: CBLData): cbl is RegularCBLv2 {
  return cbl.version === 2 && cbl.type === 'regular';
}

/**
 * Type guard to check if CBL is a sub-CBL
 */
function isSubCBL(cbl: CBLData): cbl is SubCBL {
  return cbl.version === 2 && cbl.type === 'sub-cbl';
}

/**
 * Type guard to check if CBL is a Super CBL
 */
function isSuperCBL(cbl: CBLData): cbl is SuperCBL {
  return cbl.version === 2 && cbl.type === 'super-cbl';
}

describe('Super CBL Type Definitions', () => {
  describe('CBLv1 Type Guard', () => {
    it('should identify valid CBLv1', () => {
      const cbl: CBLv1 = {
        version: 1,
        fileName: 'test.txt',
        originalSize: 1024,
        blockSize: 4096,
        blockCount: 1,
        blocks: ['abc123'],
      };

      expect(isCBLv1(cbl)).toBe(true);
      expect(isRegularCBLv2(cbl)).toBe(false);
      expect(isSubCBL(cbl)).toBe(false);
      expect(isSuperCBL(cbl)).toBe(false);
    });
  });

  describe('RegularCBLv2 Type Guard', () => {
    it('should identify valid RegularCBLv2', () => {
      const cbl: RegularCBLv2 = {
        version: 2,
        type: 'regular',
        fileName: 'test.txt',
        originalSize: 1024,
        blockSize: 4096,
        blockCount: 1,
        blocks: ['abc123'],
      };

      expect(isCBLv1(cbl)).toBe(false);
      expect(isRegularCBLv2(cbl)).toBe(true);
      expect(isSubCBL(cbl)).toBe(false);
      expect(isSuperCBL(cbl)).toBe(false);
    });
  });

  describe('SubCBL Type Guard', () => {
    it('should identify valid SubCBL', () => {
      const cbl: SubCBL = {
        version: 2,
        type: 'sub-cbl',
        fileName: 'test.txt',
        originalSize: 1024,
        blockSize: 4096,
        blockCount: 10,
        blocks: ['abc123', 'def456'],
        subCblIndex: 0,
        totalSubCbls: 2,
      };

      expect(isCBLv1(cbl)).toBe(false);
      expect(isRegularCBLv2(cbl)).toBe(false);
      expect(isSubCBL(cbl)).toBe(true);
      expect(isSuperCBL(cbl)).toBe(false);
    });

    it('should validate SubCBL has required fields', () => {
      const cbl: SubCBL = {
        version: 2,
        type: 'sub-cbl',
        fileName: 'test.txt',
        originalSize: 1024,
        blockSize: 4096,
        blockCount: 10,
        blocks: ['abc123'],
        subCblIndex: 1,
        totalSubCbls: 3,
      };

      expect(cbl.subCblIndex).toBe(1);
      expect(cbl.totalSubCbls).toBe(3);
    });
  });

  describe('SuperCBL Type Guard', () => {
    it('should identify valid SuperCBL', () => {
      const cbl: SuperCBL = {
        version: 2,
        type: 'super-cbl',
        fileName: 'test.txt',
        originalSize: 10240,
        blockSize: 4096,
        totalBlockCount: 100,
        depth: 2,
        subCblCount: 5,
        subCblMagnetUrls: [
          'magnet:?xt=urn:brightchain:cbl&bs=4096&b1=abc&b2=def',
        ],
      };

      expect(isCBLv1(cbl)).toBe(false);
      expect(isRegularCBLv2(cbl)).toBe(false);
      expect(isSubCBL(cbl)).toBe(false);
      expect(isSuperCBL(cbl)).toBe(true);
    });

    it('should validate SuperCBL has required fields', () => {
      const cbl: SuperCBL = {
        version: 2,
        type: 'super-cbl',
        fileName: 'test.txt',
        originalSize: 10240,
        blockSize: 4096,
        totalBlockCount: 100,
        depth: 2,
        subCblCount: 5,
        subCblMagnetUrls: ['url1', 'url2', 'url3', 'url4', 'url5'],
      };

      expect(cbl.depth).toBe(2);
      expect(cbl.subCblCount).toBe(5);
      expect(cbl.totalBlockCount).toBe(100);
      expect(cbl.subCblMagnetUrls.length).toBe(5);
    });
  });

  describe('CBLData Union Type', () => {
    it('should accept all CBL types', () => {
      const cblv1: CBLData = {
        version: 1,
        fileName: 'test.txt',
        originalSize: 1024,
        blockSize: 4096,
        blockCount: 1,
        blocks: ['abc123'],
      };

      const regularv2: CBLData = {
        version: 2,
        type: 'regular',
        fileName: 'test.txt',
        originalSize: 1024,
        blockSize: 4096,
        blockCount: 1,
        blocks: ['abc123'],
      };

      const subCbl: CBLData = {
        version: 2,
        type: 'sub-cbl',
        fileName: 'test.txt',
        originalSize: 1024,
        blockSize: 4096,
        blockCount: 10,
        blocks: ['abc123'],
        subCblIndex: 0,
        totalSubCbls: 2,
      };

      const superCbl: CBLData = {
        version: 2,
        type: 'super-cbl',
        fileName: 'test.txt',
        originalSize: 10240,
        blockSize: 4096,
        totalBlockCount: 100,
        depth: 2,
        subCblCount: 5,
        subCblMagnetUrls: ['url1'],
      };

      expect(isCBLv1(cblv1)).toBe(true);
      expect(isRegularCBLv2(regularv2)).toBe(true);
      expect(isSubCBL(subCbl)).toBe(true);
      expect(isSuperCBL(superCbl)).toBe(true);
    });
  });

  describe('Type Discrimination', () => {
    it('should correctly discriminate between all types', () => {
      const cbls: CBLData[] = [
        {
          version: 1,
          fileName: 'v1.txt',
          originalSize: 100,
          blockSize: 4096,
          blockCount: 1,
          blocks: ['a'],
        },
        {
          version: 2,
          type: 'regular',
          fileName: 'regular.txt',
          originalSize: 100,
          blockSize: 4096,
          blockCount: 1,
          blocks: ['b'],
        },
        {
          version: 2,
          type: 'sub-cbl',
          fileName: 'sub.txt',
          originalSize: 100,
          blockSize: 4096,
          blockCount: 10,
          blocks: ['c'],
          subCblIndex: 0,
          totalSubCbls: 2,
        },
        {
          version: 2,
          type: 'super-cbl',
          fileName: 'super.txt',
          originalSize: 1000,
          blockSize: 4096,
          totalBlockCount: 100,
          depth: 2,
          subCblCount: 2,
          subCblMagnetUrls: ['url'],
        },
      ];

      expect(isCBLv1(cbls[0])).toBe(true);
      expect(isRegularCBLv2(cbls[1])).toBe(true);
      expect(isSubCBL(cbls[2])).toBe(true);
      expect(isSuperCBL(cbls[3])).toBe(true);

      // Ensure mutual exclusivity
      cbls.forEach((cbl) => {
        const guards = [
          isCBLv1(cbl),
          isRegularCBLv2(cbl),
          isSubCBL(cbl),
          isSuperCBL(cbl),
        ];
        const trueCount = guards.filter((g) => g).length;
        expect(trueCount).toBe(1);
      });
    });
  });
});
